/**
 * Audit (chỉ đọc, KHÔNG ghi) — tìm các Enrollment đã thanh toán (paymentStatus=paid) bị dính
 * bug cũ: `platformFee` mặc định là 0 (thay vì null) khiến `tryCreditMentorForPaidEnrollment`
 * và `getMentorFinance` hiểu nhầm "chưa tính phí" thành "phí = 0đ tường minh", dẫn tới mentor
 * được cộng/hiển thị 100% học phí, platform không thu được hoa hồng. Quét cả enrollment ĐÃ
 * credit (đã cộng sai vào ví, cần trừ lại) lẫn CHƯA credit (chỉ cần reset field).
 *
 * Dấu hiệu nhận diện: `platformFee === 0` trên 1 enrollment đã credit (`pricePaid` > 0). Trước
 * bản fix, KHÔNG có nơi nào trong code từng set `platformFee` tường minh lúc tạo enrollment —
 * nên bất kỳ enrollment nào từng đi qua `tryCreditMentorForPaidEnrollment` mà chưa có ai chỉnh
 * tay `platformFee` đều nhận giá trị mặc định cũ (0), rồi bị bug hiểu nhầm thành "phí=0 tường
 * minh". Không lọc thêm theo `platformFeeRate` vì field này có thể null/không tồn tại tùy thời
 * điểm enrollment được tạo. Mentor được cấu hình 0% hoa hồng hợp lệ (nếu có thật) sẽ vẫn xuất
 * hiện trong danh sách — bạn tự đối chiếu cột "Rate hiện tại đang cấu hình" để phân biệt.
 *
 * Không update bất kỳ document nào — chỉ in báo cáo ra console.
 *
 * Chạy: node src/scripts/auditCourseCommissionGap.js
 */
import dotenv from "dotenv";
import mongoose from "mongoose";
import { Enrollment } from "../models/Enrollment.js";
import { Course } from "../models/Course.js";
import { Mentor } from "../models/Mentor.js";
import { resolveCoursePlatformFeeRate } from "../services/mentorCommissionService.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/prointerview";

function vnd(n) {
  return Math.round(Number(n) || 0).toLocaleString("vi-VN") + "đ";
}

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log(`Database: ${MONGO_URI.replace(/\/\/[^@]+@/, "//***@")}`);

  // KHÔNG lọc mentorEarningsCreditedAt — getMentorFinance() tính "Từ khóa học" từ MỌI enrollment
  // paymentStatus=paid, kể cả enrollment chưa từng được credit vào ví. Đổi default schema chỉ áp
  // dụng cho document tạo mới, không hồi tố document cũ đã bị ghi cứng platformFee=0 lúc tạo.
  const rows = await Enrollment.find({
    paymentStatus: "paid",
    pricePaid: { $gt: 0 },
    platformFee: 0,
  })
    .select("courseId pricePaid platformFee platformFeeRate mentorEarningsCreditedAt paidAt earningsClearedAt")
    .lean();

  const creditedCount = rows.filter((r) => r.mentorEarningsCreditedAt).length;
  console.log(`\nEnrollment paid với platformFee=0 (pricePaid > 0): ${rows.length}`);
  console.log(`  - Đã credit vào ví mentor (cần đối soát số dư): ${creditedCount}`);
  console.log(`  - Chưa credit (chỉ cần reset field, chưa động vào ví): ${rows.length - creditedCount}\n`);

  if (rows.length === 0) {
    console.log("Không có bản ghi nào khớp dấu hiệu bug — không cần xử lý gì thêm.");
    await mongoose.disconnect();
    return;
  }

  const courseIds = [...new Set(rows.map((r) => String(r.courseId)))];
  const courses = await Course.find({ _id: { $in: courseIds } }).select("title mentorId").lean();
  const courseById = new Map(courses.map((c) => [String(c._id), c]));

  const mentorIds = [...new Set(courses.map((c) => String(c.mentorId)))];
  const mentors = await Mentor.find({ _id: { $in: mentorIds } }).select("name pricing").lean();
  const mentorById = new Map(mentors.map((m) => [String(m._id), m]));

  const byMentor = new Map();
  let grandGross = 0;
  let grandGapCredited = 0;
  let grandGapUncredited = 0;
  let unresolvedCourse = 0;

  for (const row of rows) {
    const course = courseById.get(String(row.courseId));
    if (!course?.mentorId) {
      unresolvedCourse++;
      continue;
    }
    const mentor = mentorById.get(String(course.mentorId));
    const gross = Math.round(Number(row.pricePaid || 0));
    const { rate, source } = resolveCoursePlatformFeeRate(mentor, row.paidAt || row.mentorEarningsCreditedAt);
    const correctFee = Math.round(gross * rate);
    const correctNet = Math.max(0, gross - correctFee);
    const wrongNet = gross; // đã/sẽ bị cộng 100% do bug nếu không sửa
    const gap = wrongNet - correctNet;
    const credited = Boolean(row.mentorEarningsCreditedAt);

    const key = String(course.mentorId);
    if (!byMentor.has(key)) {
      byMentor.set(key, {
        mentorName: mentor?.name || "(không tìm thấy tên)",
        rateSource: source,
        rate,
        count: 0,
        creditedCount: 0,
        gross: 0,
        gapCredited: 0,
        gapUncredited: 0,
        items: [],
      });
    }
    const m = byMentor.get(key);
    m.count++;
    if (credited) m.creditedCount++;
    m.gross += gross;
    if (credited) m.gapCredited += gap;
    else m.gapUncredited += gap;
    m.items.push({
      id: String(row._id),
      course: course.title || "(không rõ tên khóa)",
      gross,
      gap,
      credited,
      storedRate: row.platformFeeRate === null || row.platformFeeRate === undefined ? "null" : row.platformFeeRate,
    });

    grandGross += gross;
    if (credited) grandGapCredited += gap;
    else grandGapUncredited += gap;
  }

  console.log("=".repeat(70));
  console.log("BÁO CÁO THEO MENTOR (chỉ đọc — chưa chỉnh sửa gì)");
  console.log("=".repeat(70));

  const sorted = [...byMentor.entries()].sort((a, b) => (b[1].gapCredited + b[1].gapUncredited) - (a[1].gapCredited + a[1].gapUncredited));
  for (const [mentorId, m] of sorted) {
    console.log(`\nMentor: ${m.mentorName}  (_id: ${mentorId})`);
    console.log(`  Rate hiện tại đang cấu hình cho mentor này: ${(m.rate * 100).toFixed(0)}% (nguồn: ${m.rateSource})`);
    console.log(`  Số đơn nghi bị bug: ${m.count} (đã credit: ${m.creditedCount}, chưa credit: ${m.count - m.creditedCount})`);
    console.log(`  Tổng doanh thu gốc: ${vnd(m.gross)}`);
    console.log(`  Cần TRỪ LẠI trong ví (đã credit sai): ${vnd(m.gapCredited)}`);
    console.log(`  Sẽ tự đúng khi credit sau này (chưa credit, không cần đụng ví): ${vnd(m.gapUncredited)}`);
    for (const it of m.items.slice(0, 10)) {
      console.log(
        `     - enrollment ${it.id} | ${it.course} | gross ${vnd(it.gross)} | lệch ${vnd(it.gap)} | ${it.credited ? "ĐÃ credit" : "chưa credit"} | platformFeeRate lưu trong DB: ${it.storedRate}`,
      );
    }
    if (m.items.length > 10) console.log(`     ... và ${m.items.length - 10} đơn khác`);
  }

  console.log("\n" + "=".repeat(70));
  console.log("TỔNG CỘNG TOÀN HỆ THỐNG");
  console.log("=".repeat(70));
  console.log(`Số mentor bị ảnh hưởng: ${byMentor.size}`);
  console.log(`Số enrollment nghi bị bug: ${rows.length}`);
  if (unresolvedCourse > 0) console.log(`Không tìm thấy course/mentor cho: ${unresolvedCourse} enrollment (bỏ qua)`);
  console.log(`Tổng doanh thu gốc: ${vnd(grandGross)}`);
  console.log(`Tổng cần TRỪ LẠI trong ví mentor (enrollment đã credit sai): ${vnd(grandGapCredited)}`);
  console.log(`Tổng sẽ tự đúng khi credit sau (enrollment chưa credit): ${vnd(grandGapUncredited)}`);
  console.log(
    "\nLưu ý: script này KHÔNG tự trừ tiền hay sửa DB. Một số mentor có thể được cấu hình 0%\n" +
    "hoa hồng hợp lệ (không phải bug) — hãy tự đối chiếu 'Rate hiện tại đang cấu hình' ở trên\n" +
    "trước khi quyết định đối soát mentor nào.\n" +
    "Với enrollment CHƯA credit: chỉ cần reset platformFee/platformFeeRate về null là code hiện tại\n" +
    "sẽ tự tính đúng khi job credit chạy tới — KHÔNG cần đụng vào ví mentor.\n" +
    "Với enrollment ĐÃ credit: phải trừ lại đúng phần 'lệch' khỏi ví (availableBalance/clearingBalance/\n" +
    "totalEarned) — cẩn thận trường hợp mentor đã rút một phần, có thể làm availableBalance âm.",
  );

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
