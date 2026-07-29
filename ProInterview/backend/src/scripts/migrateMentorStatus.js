/**
 * Migration: gán `Mentor.status` cho các hồ sơ có trước khi field này tồn tại.
 *
 * Suy từ `isActive` đang có: isActive !== false → "active", ngược lại → "suspended".
 * KHÔNG bao giờ suy ra "closed" — trạng thái đó chỉ đạt được qua cổng `canCloseMentor`.
 *
 * Chạy:  node src/scripts/migrateMentorStatus.js         (thực thi)
 *        node src/scripts/migrateMentorStatus.js --dry    (chỉ đếm, không ghi)
 */
import "dotenv/config";
import mongoose from "mongoose";
import { Mentor } from "../models/Mentor.js";

const dryRun = process.argv.includes("--dry");

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("Thiếu MONGO_URI trong .env");
    process.exit(1);
  }
  await mongoose.connect(uri);

  const missing = await Mentor.countDocuments({ status: { $in: [null, undefined] } });
  const toActive = await Mentor.countDocuments({
    status: { $in: [null, undefined] },
    isActive: { $ne: false },
  });
  const toSuspended = missing - toActive;

  console.log(`Hồ sơ mentor chưa có status: ${missing}`);
  console.log(`  → active:    ${toActive}`);
  console.log(`  → suspended: ${toSuspended}`);

  if (dryRun) {
    console.log("\n--dry: không ghi gì.");
  } else if (missing > 0) {
    const a = await Mentor.updateMany(
      { status: { $in: [null, undefined] }, isActive: { $ne: false } },
      { $set: { status: "active" } },
    );
    const s = await Mentor.updateMany(
      { status: { $in: [null, undefined] }, isActive: false },
      { $set: { status: "suspended" } },
    );
    console.log(`\nĐã cập nhật: active=${a.modifiedCount} suspended=${s.modifiedCount}`);
  } else {
    console.log("\nKhông có gì để migrate.");
  }

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
