/**
 * Reset `platformFee`/`platformFeeRate` về `null` cho các Enrollment đã thanh toán nhưng
 * CHƯA được credit vào ví mentor, mà đang mang giá trị `platformFee: 0` bị ghi cứng từ default
 * schema cũ (trước khi Enrollment.js đổi default 0 → null). Nếu không reset, lần credit tới
 * `tryCreditMentorForPaidEnrollment` sẽ coi `0` đã lưu sẵn là "phí tường minh" và vẫn cộng 100%
 * học phí cho mentor — bug vẫn tái diễn dù code đã fix, vì default mới chỉ áp dụng cho document
 * tạo MỚI, không hồi tố document cũ.
 *
 * CHỈ động vào enrollment `mentorEarningsCreditedAt: null` — hoàn toàn không đụng ví mentor
 * (không có $inc nào trong script này). Enrollment đã credit phải xử lý riêng (không nằm trong
 * phạm vi script này).
 *
 * Mặc định DRY RUN — chỉ in ra sẽ đổi gì, KHÔNG ghi DB.
 * Thêm --apply để thực sự ghi:
 *   node src/scripts/resetUncreditedCourseFeeDefaults.js            (dry run)
 *   node src/scripts/resetUncreditedCourseFeeDefaults.js --apply    (ghi thật)
 */
import dotenv from "dotenv";
import mongoose from "mongoose";
import { Enrollment } from "../models/Enrollment.js";
import { Course } from "../models/Course.js";
import { Mentor } from "../models/Mentor.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/prointerview";
const APPLY = process.argv.includes("--apply");

function vnd(n) {
  return Math.round(Number(n) || 0).toLocaleString("vi-VN") + "đ";
}

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log(`Database: ${MONGO_URI.replace(/\/\/[^@]+@/, "//***@")}`);
  console.log(`Chế độ: ${APPLY ? "GHI THẬT (--apply)" : "DRY RUN (thêm --apply để ghi thật)"}\n`);

  const rows = await Enrollment.find({
    paymentStatus: "paid",
    pricePaid: { $gt: 0 },
    platformFee: 0,
    mentorEarningsCreditedAt: { $in: [null, undefined] },
  })
    .select("courseId pricePaid platformFee platformFeeRate")
    .lean();

  console.log(`Enrollment CHƯA credit, platformFee=0, cần reset: ${rows.length}\n`);
  if (rows.length === 0) {
    console.log("Không có gì để reset.");
    await mongoose.disconnect();
    return;
  }

  const courseIds = [...new Set(rows.map((r) => String(r.courseId)))];
  const courses = await Course.find({ _id: { $in: courseIds } }).select("title mentorId").lean();
  const courseById = new Map(courses.map((c) => [String(c._id), c]));
  const mentorIds = [...new Set(courses.map((c) => String(c.mentorId)))];
  const mentors = await Mentor.find({ _id: { $in: mentorIds } }).select("name").lean();
  const mentorById = new Map(mentors.map((m) => [String(m._id), m]));

  let totalGross = 0;
  for (const row of rows) {
    const course = courseById.get(String(row.courseId));
    const mentor = course?.mentorId ? mentorById.get(String(course.mentorId)) : null;
    totalGross += Math.round(Number(row.pricePaid || 0));
    console.log(
      `  - enrollment ${row._id} | ${course?.title || "(không rõ khóa)"} | mentor: ${mentor?.name || "?"} | ` +
        `gross ${vnd(row.pricePaid)} | platformFee: ${row.platformFee} -> null | platformFeeRate: ${row.platformFeeRate ?? "null"} -> null`,
    );
  }
  console.log(`\nTổng gross các enrollment sẽ reset: ${vnd(totalGross)}`);

  if (!APPLY) {
    console.log("\nDRY RUN — chưa ghi gì vào DB. Chạy lại kèm --apply để thực sự reset.");
    await mongoose.disconnect();
    return;
  }

  const ids = rows.map((r) => r._id);
  const result = await Enrollment.updateMany(
    { _id: { $in: ids }, mentorEarningsCreditedAt: { $in: [null, undefined] } },
    { $set: { platformFee: null, platformFeeRate: null } },
  );
  console.log(`\nĐã reset ${result.modifiedCount}/${rows.length} enrollment (matched: ${result.matchedCount}).`);
  console.log("Không có enrollment nào bị credit trong lúc script chạy (điều kiện mentorEarningsCreditedAt vẫn được áp dụng trong lệnh update).");

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
