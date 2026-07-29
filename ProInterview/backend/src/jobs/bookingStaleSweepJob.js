/**
 * Quét định kỳ các booking "kẹt" — quá giờ hẹn mà không bên nào tự báo cáo kết quả:
 *  1) `pending` chưa thanh toán, quá giờ hẹn → tự hủy (an toàn, không có tiền phải xử lý).
 *  2) `confirmed`/`in_progress` (đã có lịch thật + đã thanh toán) quá giờ KẾT THÚC + buffer
 *     mà vẫn chưa `completed`/`cancelled`/`no_show` → gắn cờ `staleFlaggedAt` (1 lần duy nhất)
 *     và nhắc học viên + mentor tự báo cáo (no-show) qua các endpoint đã có sẵn, đồng thời báo
 *     admin để rà soát thủ công. KHÔNG tự động phạt/hoàn tiền — hệ thống không biết chính xác
 *     lỗi thuộc về ai, tự động xử lý tài chính ở đây rủi ro xử oan.
 */
import mongoose from "mongoose";
import { Booking } from "../models/Booking.js";
import { User } from "../models/User.js";
import { deliverNotification } from "../services/notificationDeliveryService.js";
import { parseBookingStartMs } from "../utils/bookingSchedule.js";

/** Chờ thêm sau giờ kết thúc trước khi coi buổi là "kẹt", tránh cờ nhầm buổi đang sắp kết thúc. */
const STALE_GRACE_MS = 60 * 60 * 1000;

let intervalHandle = null;

async function autoCancelExpiredPending() {
  const candidates = await Booking.find({
    status: "pending",
    paymentStatus: { $ne: "paid" },
  }).select("_id date timeSlot");

  const now = Date.now();
  for (const booking of candidates) {
    const startMs = parseBookingStartMs(booking.date, booking.timeSlot);
    if (!Number.isFinite(startMs) || startMs > now) continue;

    booking.status = "cancelled";
    booking.cancelledBy = "system";
    booking.cancelReason = "Tự động hủy — quá giờ hẹn mà chưa được xác nhận/thanh toán.";
    booking.cancelledAt = new Date();
    await booking.save();
  }
}

async function flagStaleActiveBookings() {
  const candidates = await Booking.find({
    staleFlaggedAt: { $exists: false },
    $or: [
      { status: { $in: ["confirmed", "in_progress"] } },
      // Học viên đã trả tiền nhưng mentor chưa từng xác nhận/vào phòng — không có gì để tự hủy an
      // toàn (đã có tiền), cũng không thuộc diện confirmed/in_progress — vẫn cần rà soát như nhau.
      { status: "pending", paymentStatus: "paid" },
    ],
  })
    .populate({ path: "mentorId", select: "userId name" })
    .populate({ path: "userId", select: "name" });

  const now = Date.now();
  const admins = await User.find({ role: "admin" }).select("_id").lean();

  for (const booking of candidates) {
    const startMs = parseBookingStartMs(booking.date, booking.timeSlot);
    if (!Number.isFinite(startMs)) continue;
    const endMs = startMs + (Number(booking.durationMinutes) || 60) * 60 * 1000;
    if (now < endMs + STALE_GRACE_MS) continue;

    booking.staleFlaggedAt = new Date();
    await booking.save();

    const mentorUserId = booking.mentorId?.userId;
    const mentorName = booking.mentorId?.name || "Mentor";
    const studentName = booking.userId?.name || "Học viên";
    const slotLabel = `${booking.date} ${booking.timeSlot}`;

    if (mentorUserId) {
      await deliverNotification(mentorUserId, {
        mentorPrefKey: "session_reminder",
        type: "system",
        title: "Buổi hẹn đã quá giờ, chưa được đánh dấu hoàn thành",
        body: `Buổi ${slotLabel} với ${studentName} đã quá giờ kết thúc mà chưa ghi nhận kết quả. Nếu buổi đã diễn ra, hãy vào phòng để kết thúc buổi; nếu học viên không tham gia, hãy báo no-show.`,
        metadata: { bookingId: booking._id, actionUrl: `/mentor/meeting-detail/${booking._id}` },
      });
    }
    if (booking.userId?._id) {
      await deliverNotification(booking.userId._id, {
        customerPrefKey: "booking_change",
        type: "system",
        title: "Buổi hẹn đã quá giờ, chưa có kết quả",
        body: `Buổi ${slotLabel} với ${mentorName} đã quá giờ kết thúc mà hệ thống chưa ghi nhận hoàn thành. Nếu mentor không tham gia, hãy báo no-show trên trang buổi hẹn.`,
        metadata: { bookingId: booking._id, actionUrl: `/session/${booking._id}` },
      });
    }
    for (const admin of admins) {
      await deliverNotification(admin._id, {
        type: "system",
        title: "Buổi hẹn quá giờ chưa rõ kết quả — cần rà soát",
        body: `Buổi ${slotLabel} giữa ${mentorName} và ${studentName} đã quá giờ kết thúc hơn ${STALE_GRACE_MS / 60000} phút mà không bên nào báo cáo. Vào admin để kiểm tra.`,
        metadata: { bookingId: booking._id, actionUrl: `/admin/bookings/${booking._id}` },
      });
    }
  }
}

/** Export riêng để test/gọi thủ công (vd. script debug) mà không cần chờ interval. */
export async function runStaleSweep() {
  if (mongoose.connection.readyState !== 1) return;
  await autoCancelExpiredPending();
  await flagStaleActiveBookings();
}

/** Chạy mỗi 20 phút khi server đã kết nối MongoDB. */
export function startBookingStaleSweepJob() {
  if (intervalHandle) return;
  const tick = () => {
    runStaleSweep().catch((e) => console.error("[bookingStaleSweepJob]", e?.message || e));
  };
  tick();
  intervalHandle = setInterval(tick, 20 * 60 * 1000);
}
