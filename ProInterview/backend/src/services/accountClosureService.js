/**
 * Cổng đóng tài khoản — nguyên tắc bất biến: KHÔNG BAO GIỜ xóa cứng document có lịch sử tài chính.
 *
 * `closed` là soft-delete: giữ nguyên document Mentor + toàn bộ lịch sử payout/booking/enrollment,
 * chỉ ẩn danh PII trên User và giải phóng email. Chỉ đạt được khi qua `canCloseMentor` /
 * `canCloseUser` — code chặn, không dựa vào quy trình tay.
 */
import mongoose from "mongoose";
import { Booking } from "../models/Booking.js";
import { Enrollment } from "../models/Enrollment.js";
import { Mentor } from "../models/Mentor.js";
import { Payment } from "../models/Payment.js";
import { PayoutRequest } from "../models/PayoutRequest.js";
import { User } from "../models/User.js";

/** `Booking.date` là chuỗi "YYYY-MM-DD" (không phải Date) — so sánh theo chuỗi là đúng thứ tự. */
function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Mentor đã sạch nợ chưa? Trả `{ ok, checks }` — mỗi check là boolean, `false` = còn vướng.
 *
 * Hai check dễ quên:
 *  - `noUnclearedRows`: số dư có thể đang là 0 nhưng còn buổi/khóa chưa đủ hạn giữ → sắp có tiền vào.
 *  - `noFailedRows`: dòng gắn cờ `earningsClearFailedAt` = tiền chưa rõ ràng, phải đối soát trước.
 */
export async function canCloseMentor(mentorId) {
  if (!mongoose.isValidObjectId(mentorId)) {
    return { ok: false, checks: {}, error: "mentorId không hợp lệ." };
  }
  const mentor = await Mentor.findById(mentorId).select("finance status").lean();
  if (!mentor) return { ok: false, checks: {}, error: "Không tìm thấy hồ sơ mentor." };

  const f = mentor.finance || {};
  const courseIds = await mongoose.model("Course").find({ mentorId }).distinct("_id");

  const [unclearedBookings, unclearedEnrollments, failedBookings, failedEnrollments, openPayouts, upcoming] =
    await Promise.all([
      Booking.countDocuments({ mentorId, earningsClearAt: { $ne: null }, earningsClearedAt: { $in: [null, undefined] } }),
      courseIds.length
        ? Enrollment.countDocuments({
            courseId: { $in: courseIds },
            earningsClearAt: { $ne: null },
            earningsClearedAt: { $in: [null, undefined] },
          })
        : 0,
      Booking.countDocuments({ mentorId, earningsClearFailedAt: { $ne: null } }),
      courseIds.length ? Enrollment.countDocuments({ courseId: { $in: courseIds }, earningsClearFailedAt: { $ne: null } }) : 0,
      PayoutRequest.countDocuments({ mentorId, status: { $in: ["pending", "approved"] } }),
      Booking.countDocuments({ mentorId, status: { $in: ["confirmed", "in_progress"] }, date: { $gte: todayIsoDate() } }),
    ]);

  const checks = {
    clearingBalance: Math.round(Number(f.clearingBalance) || 0) === 0,
    availableBalance: Math.round(Number(f.availableBalance) || 0) === 0,
    pendingBalance: Math.round(Number(f.pendingBalance) || 0) === 0,
    noUnclearedRows: unclearedBookings + unclearedEnrollments === 0,
    noFailedRows: failedBookings + failedEnrollments === 0,
    noOpenPayouts: openPayouts === 0,
    noUpcomingBookings: upcoming === 0,
  };

  return { ok: Object.values(checks).every(Boolean), checks };
}

/** Mã lỗi máy đọc được để frontend hiện đúng câu ("Bạn còn 700.000đ chưa rút"). */
const BLOCKER_MESSAGES = {
  clearingBalance: "Còn tiền đang trong thời gian giữ.",
  availableBalance: "Còn số dư khả dụng chưa rút.",
  pendingBalance: "Còn tiền trong yêu cầu rút đang xử lý.",
  noUnclearedRows: "Còn buổi/khóa chưa tới hạn giải phóng tiền.",
  noFailedRows: "Có khoản giải phóng lỗi cần đối soát.",
  noOpenPayouts: "Còn yêu cầu rút tiền chưa hoàn tất.",
  noUpcomingBookings: "Còn buổi hẹn đã xác nhận chưa diễn ra.",
  studentUnusedBookings: "Còn buổi hẹn đã thanh toán chưa diễn ra.",
  studentActivePlan: "Gói cước còn hạn sử dụng.",
  studentHeldPayments: "Còn giao dịch đang giữ chờ xử lý.",
};

function toBlockers(checks) {
  return Object.entries(checks)
    .filter(([, pass]) => !pass)
    .map(([code]) => ({ code, message: BLOCKER_MESSAGES[code] || code }));
}

/**
 * Cổng phía học viên — áp cho MỌI user, kể cả mentor (một mentor cũng có thể là người mua).
 * Booking đã trả tiền chưa diễn ra, gói còn hạn, giao dịch đang bị giữ → chưa cho đóng.
 */
export async function canCloseUser(userId) {
  if (!mongoose.isValidObjectId(userId)) {
    return { ok: false, checks: {}, error: "userId không hợp lệ." };
  }
  const user = await User.findById(userId).select("plan planExpiresAt").lean();
  if (!user) return { ok: false, checks: {}, error: "Không tìm thấy người dùng." };

  const [unusedPaid, heldPayments] = await Promise.all([
    Booking.countDocuments({
      userId,
      paymentStatus: "paid",
      status: { $in: ["pending", "confirmed", "in_progress"] },
      date: { $gte: todayIsoDate() },
    }),
    Payment.countDocuments({ userId, status: { $in: ["held_inactive_account", "refund_pending"] } }),
  ]);

  const planActive =
    Boolean(user.plan) && user.plan !== "free" && user.planExpiresAt && new Date(user.planExpiresAt) > new Date();

  const checks = {
    studentUnusedBookings: unusedPaid === 0,
    studentActivePlan: !planActive,
    studentHeldPayments: heldPayments === 0,
  };
  return { ok: Object.values(checks).every(Boolean), checks };
}

/**
 * Cổng đầy đủ cho 1 tài khoản: phần học viên luôn kiểm; nếu có hồ sơ mentor thì kiểm thêm.
 * @returns {{ ok: boolean, checks: object, blockers: Array<{code,message}>, mentorId: string|null }}
 */
export async function canCloseAccount(userId) {
  const student = await canCloseUser(userId);
  if (student.error) return { ok: false, checks: {}, blockers: [], error: student.error, mentorId: null };

  const mentor = await Mentor.findOne({ userId }).select("_id").lean();
  let checks = { ...student.checks };
  if (mentor) {
    const m = await canCloseMentor(mentor._id);
    if (m.error) return { ok: false, checks, blockers: toBlockers(checks), error: m.error, mentorId: String(mentor._id) };
    checks = { ...checks, ...m.checks };
  }

  return {
    ok: Object.values(checks).every(Boolean),
    checks,
    blockers: toBlockers(checks),
    mentorId: mentor ? String(mentor._id) : null,
  };
}

/**
 * Chuyển tài khoản sang `closed`: ẩn danh PII, giải phóng email, vô hiệu đăng nhập.
 * KHÔNG xóa document nào — Mentor và toàn bộ lịch sử tài chính giữ nguyên.
 *
 * Caller PHẢI gọi `canCloseAccount` trước; hàm này tự kiểm lại lần nữa để không có đường vòng.
 */
export async function closeAccount(userId, { closedBy = null } = {}) {
  const gate = await canCloseAccount(userId);
  if (gate.error) return { ok: false, status: 400, error: gate.error };
  if (!gate.ok) {
    return {
      ok: false,
      status: 409,
      error: "Tài khoản còn ràng buộc chưa xử lý xong — chưa thể đóng.",
      blockers: gate.blockers,
      checks: gate.checks,
    };
  }

  const now = new Date();
  const user = await User.findByIdAndUpdate(
    userId,
    {
      $set: {
        email: `deleted_${userId}@removed.local`,
        name: "Tài khoản đã đóng",
        phone: "",
        avatar: "",
        isActive: false,
        authSessions: [],
        accountClosedAt: now,
      },
      $inc: { tokenVersion: 1 },
    },
    { new: true },
  );
  if (!user) return { ok: false, status: 404, error: "Không tìm thấy người dùng." };

  if (gate.mentorId) {
    await Mentor.updateOne(
      { _id: gate.mentorId },
      { $set: { status: "closed", isActive: false, available: false, closedAt: now, closedBy } },
    );
  }

  return { ok: true, mentorId: gate.mentorId, closedAt: now };
}
