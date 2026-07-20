/**
 * Migration: gỡ bỏ gói Premium — hạ toàn bộ user đang plan="premium" xuống "professional".
 * Giữ nguyên planExpiresAt; quota tự điều chỉnh đúng ở lần enforceExpiry() kế tiếp (planGuard.js).
 *
 * Chạy: node src/scripts/migrate-remove-premium-plan.js [--dry-run]
 */
import "../config/loadEnv.js";
import { connectDatabase } from "../db/connect.js";
import { User } from "../models/User.js";
import { Subscription } from "../models/Subscription.js";
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

  const premiumUsers = await User.find({ plan: "premium" }).select("_id email plan").lean();
  console.log(`Tìm thấy ${premiumUsers.length} user plan="premium".`);
  for (const u of premiumUsers) console.log(`  - ${u.email} (${u._id})`);

  if (!DRY_RUN && premiumUsers.length > 0) {
    const res = await User.updateMany({ plan: "premium" }, { $set: { plan: "professional" } });
    console.log(`Đã cập nhật ${res.modifiedCount} user → plan="professional".`);
  }

  const premiumSubs = await Subscription.find({ plan: "premium" }).select("_id userId plan").lean();
  console.log(`Tìm thấy ${premiumSubs.length} Subscription plan="premium".`);
  if (!DRY_RUN && premiumSubs.length > 0) {
    const res = await Subscription.updateMany({ plan: "premium" }, { $set: { plan: "professional" } });
    console.log(`Đã cập nhật ${res.modifiedCount} subscription → plan="professional".`);
  }

  await mongoose.disconnect();
  console.log("Done.");
}

migrate().catch((e) => {
  console.error(e);
  process.exit(1);
});
