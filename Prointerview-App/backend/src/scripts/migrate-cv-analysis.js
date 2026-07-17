/**
 * Migration: CV Analysis schema redesign
 *
 * Bước 1 — Mark legacy/mock records: status = 'legacy_mock'
 * Bước 2 — Migrate field names: geminiModel → meta.llmModel,
 *           processingMs → meta.processingTimeMs, analysisType → mode
 * Bước 3 — Verify: in thống kê status distribution
 *
 * Chạy staging trước:
 *   NODE_ENV=staging node src/scripts/migrate-cv-analysis.js
 * Sau khi verify, production:
 *   NODE_ENV=production node src/scripts/migrate-cv-analysis.js
 */

import "../config/loadEnv.js";
import { connectDatabase } from "../db/connect.js";
import { CVAnalysis } from "../models/CVAnalysis.js";
import mongoose from "mongoose";

const DRY_RUN = process.argv.includes("--dry-run");

async function migrate() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("ERROR: MONGO_URI is not set");
    process.exit(1);
  }

  await connectDatabase(uri);
  console.log(`Connected to MongoDB (${DRY_RUN ? "DRY RUN" : "LIVE"})`);
  console.log("Collection:", CVAnalysis.collection.collectionName);

  // ──────────────────────────────────────────────────────────────────────────
  // BƯỚC 1: Mark legacy mock records
  // ──────────────────────────────────────────────────────────────────────────
  //
  // Legacy records là bất kỳ record nào:
  //   - Không có result field (hoặc null)
  //   - Hoặc result không có match sub-document
  //   - Hoặc result.match.score là round number (75, 80, 85) VÀ processingMs < 1000
  //     (xử lý quá nhanh → không gọi Python thật)
  //
  const legacyQuery = {
    $or: [
      { result: { $exists: false } },
      { result: null },
      { "result.match": { $exists: false } },
      {
        $and: [
          { "result.match.score": { $in: [75, 80, 85] } },
          { processingMs: { $lt: 1000 } },
        ],
      },
    ],
    status: { $ne: "legacy_mock" }, // bỏ qua records đã migrate
  };

  const legacyCount = await CVAnalysis.countDocuments(legacyQuery);
  console.log(`\n[Step 1] Found ${legacyCount} legacy/mock records`);

  if (legacyCount > 0) {
    if (DRY_RUN) {
      console.log(`  [DRY RUN] Would mark ${legacyCount} records as legacy_mock`);
    } else {
      const r1 = await CVAnalysis.updateMany(legacyQuery, {
        $set: {
          status: "legacy_mock",
          error: "pre_gap_fix_mock_data",
        },
      });
      console.log(`  Marked ${r1.modifiedCount} records as legacy_mock`);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // BƯỚC 2: Migrate field names
  //   geminiModel  → meta.llmModel  (+ set meta.llmProvider = 'gemini')
  //   processingMs → meta.processingTimeMs
  //   analysisType → mode           (chỉ khi mode chưa có)
  //   tier missing → default 'basic'
  // ──────────────────────────────────────────────────────────────────────────

  const oldFieldQuery = {
    $or: [
      { geminiModel: { $exists: true } },
      { processingMs: { $exists: true } },
      { analysisType: { $exists: true } },
      { tier: { $exists: false } },
    ],
  };

  // Dùng native collection driver để bypass Mongoose strict mode —
  // CVAnalysis.find().lean() trả về fields bị strip nếu không có trong schema
  const oldFieldRecords = await CVAnalysis.collection.find(oldFieldQuery).toArray();
  console.log(`\n[Step 2] Found ${oldFieldRecords.length} records with old field names`);

  let migratedCount = 0;
  const batchOps = [];

  for (const record of oldFieldRecords) {
    const setFields = {};
    const unsetFields = {};

    if (record.geminiModel) {
      setFields["meta.llmModel"] = record.geminiModel;
      setFields["meta.llmProvider"] = "gemini";
      unsetFields.geminiModel = "";
    }

    if (record.processingMs !== undefined) {
      setFields["meta.processingTimeMs"] = record.processingMs;
      unsetFields.processingMs = "";
    }

    if (record.analysisType) {
      // Set mode chỉ khi chưa có (tránh overwrite giá trị đã migrate)
      if (!record.mode) {
        // analysisType values: 'basic','match','improve','questions','star'
        // → default 'jd' nếu có jdText, ngược lại 'field'
        setFields.mode = record.jdText ? "jd" : "field";
      }
      // Luôn unset analysisType kể cả khi mode đã được set từ lần chạy trước
      unsetFields.analysisType = "";
    }

    if (!record.tier) {
      setFields.tier = "basic";
    }

    if (Object.keys(setFields).length === 0 && Object.keys(unsetFields).length === 0) {
      continue;
    }

    const op = {
      updateOne: {
        filter: { _id: record._id },
        update: {
          ...(Object.keys(setFields).length > 0 && { $set: setFields }),
          ...(Object.keys(unsetFields).length > 0 && { $unset: unsetFields }),
        },
      },
    };

    batchOps.push(op);
    migratedCount++;
  }

  if (DRY_RUN) {
    console.log(`  [DRY RUN] Would migrate field names for ${migratedCount} records`);
  } else if (batchOps.length > 0) {
    // $unset cho old fields (geminiModel, processingMs, analysisType) không có trong
    // schema mới — dùng native driver để tránh Mongoose strict mode strip $unset
    const r2 = await CVAnalysis.collection.bulkWrite(batchOps, { ordered: false });
    console.log(`  Migrated field names: ${r2.modifiedCount} records updated`);
  } else {
    console.log("  No field name changes needed");
  }

  // ──────────────────────────────────────────────────────────────────────────
  // BƯỚC 3: Verify — in status distribution
  // ──────────────────────────────────────────────────────────────────────────

  const stats = await CVAnalysis.aggregate([
    { $group: { _id: "$status", count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

  console.log("\n[Step 3] Status distribution after migration:");
  if (stats.length === 0) {
    console.log("  (no records in collection)");
  } else {
    for (const s of stats) {
      console.log(`  ${String(s._id ?? "null").padEnd(16)} : ${s.count}`);
    }
  }

  const totalRecords = await CVAnalysis.countDocuments();
  const legacyFinal = await CVAnalysis.countDocuments({ status: "legacy_mock" });
  const completedFinal = await CVAnalysis.countDocuments({ status: "completed" });
  console.log(`\n  Total records  : ${totalRecords}`);
  console.log(`  legacy_mock    : ${legacyFinal} (${totalRecords ? ((legacyFinal / totalRecords) * 100).toFixed(1) : 0}%)`);
  console.log(`  completed      : ${completedFinal}`);

  await mongoose.disconnect();
  console.log("\nMigration complete.");
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
