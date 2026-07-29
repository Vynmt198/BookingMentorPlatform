/**
 * Mentor bị tạm ngưng/cấm → các buổi hẹn học viên ĐÃ TRẢ TIỀN nhưng chưa diễn ra sẽ bị hủy và
 * chuyển sang chờ hoàn tiền.
 *
 * Lý do: mentor bị chặn nhận lịch mới, nhưng những buổi đã bán mà không xử lý thì thành nợ treo —
 * học viên mất tiền lẫn buổi học. Lỗi thuộc về nền tảng/mentor nên hoàn 100%, không trừ phí hủy.
 *
 * Đi qua đúng luồng hoàn tiền sẵn có: `paymentStatus: "refund_pending"` → admin chuyển khoản tay
 * → `PATCH /api/admin/bookings/:id/confirm-refund`. Hệ thống KHÔNG có ví, nên học viên cần cung
 * cấp tài khoản nhận tiền (`refundReceive*` trên Booking) — thông báo nói rõ điều đó.
 */
import mongoose from "mongoose";
import { Booking } from "../models/Booking.js";
import { Mentor } from "../models/Mentor.js";
import { Payment } from "../models/Payment.js";
import { deliverNotification } from "./notificationDeliveryService.js";

/** `Booking.date` là chuỗi "YYYY-MM-DD" — so sánh chuỗi đúng thứ tự, `$gte` giữ cả buổi hôm nay. */
function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

const ACTIVE_STATUSES = ["pending", "confirmed", "in_progress"];

/**
 * Đếm số buổi sẽ bị hủy + tổng tiền phải hoàn, KHÔNG thay đổi gì.
 * Dùng cho endpoint xem trước tác động và hộp thoại xác nhận.
 */
export async function previewSuspensionRefunds(mentorId) {
  if (!mongoose.isValidObjectId(mentorId)) return { count: 0, totalVnd: 0 };
  const rows = await Booking.find({
    mentorId,
    paymentStatus: "paid",
    status: { $in: ACTIVE_STATUSES },
    date: { $gte: todayIsoDate() },
  })
    .select("totalAmount price")
    .lean();

  return {
    count: rows.length,
    totalVnd: rows.reduce((sum, b) => sum + Math.round(Number(b.totalAmount ?? b.price ?? 0)), 0),
  };
}

/**
 * Hủy + chuyển sang chờ hoàn tiền cho mọi buổi đã trả tiền chưa diễn ra của mentor này.
 *
 * An toàn khi gọi lại nhiều lần: mỗi buổi được "claim" bằng update có điều kiện, buổi đã xử lý
 * ở lượt trước không khớp filter nữa nên không bị hủy/thông báo hai lần.
 */
export async function refundActiveBookingsForSuspendedMentor(mentorId, options = {}) {
  if (!mongoose.isValidObjectId(mentorId)) {
    return { ok: false, error: "mentorId không hợp lệ." };
  }

  const mentor = await Mentor.findById(mentorId).select("name userId").lean();
  const mentorName = mentor?.name || "Cố vấn";
  const reason =
    String(options.reason || "").trim() ||
    `Cố vấn ${mentorName} đã bị tạm ngưng — buổi hẹn được hủy và hoàn tiền.`;
  const now = new Date();

  const candidates = await Booking.find({
    mentorId,
    paymentStatus: "paid",
    status: { $in: ACTIVE_STATUSES },
    date: { $gte: todayIsoDate() },
  })
    .select("userId totalAmount price date timeSlot")
    .lean();

  let refundedCount = 0;
  let refundedVnd = 0;
  const failures = [];

  for (const b of candidates) {
    const amount = Math.round(Number(b.totalAmount ?? b.price ?? 0));

    // Claim: chỉ lượt nào đổi được trạng thái mới đi tiếp — chạy lại không hủy trùng.
    const claimed = await Booking.updateOne(
      { _id: b._id, paymentStatus: "paid", status: { $in: ACTIVE_STATUSES } },
      {
        $set: {
          status: "cancelled",
          cancelledAt: now,
          cancelledBy: "system",
          cancelReason: reason,
          paymentStatus: "refund_pending",
          // Lỗi không thuộc về học viên → hoàn đủ 100%, không áp phí hủy.
          cancelRefundAmountVnd: amount,
          cancelRetainedAmountVnd: 0,
          cancelRefundPercent: 100,
        },
      },
    );
    if (claimed.modifiedCount !== 1) continue;

    // Ledger: đánh dấu khoản thu này đang chờ hoàn để admin thấy trong hàng đợi hoàn tiền.
    await Payment.updateOne(
      { referenceModel: "Booking", referenceId: b._id, status: "success" },
      {
        $set: {
          status: "refund_pending",
          refundAmount: amount,
          refundedAt: null,
          "providerResponse.reason": reason,
          "providerResponse.expectedBankRefundVnd": amount,
          "providerResponse.settlementTarget": "refunded",
          "providerResponse.requestedAt": now.toISOString(),
        },
      },
    ).catch((err) => {
      failures.push({ bookingId: String(b._id), stage: "payment", error: err?.message || String(err) });
    });

    // Thông báo tiền — KHÔNG gắn prefKey để tùy chọn nhận thông báo không nuốt mất tin này.
    await deliverNotification(b.userId, {
      type: "booking_cancelled",
      title: "Buổi hẹn đã hủy — bạn sẽ được hoàn tiền",
      body:
        `Cố vấn ${mentorName} đã bị khóa nên buổi ${b.date || ""} ${b.timeSlot || ""}`.trim() +
        ` không thể diễn ra. Số tiền ${amount.toLocaleString("vi-VN")}đ sẽ được hoàn lại đầy đủ. ` +
        "Vui lòng cung cấp tài khoản ngân hàng nhận hoàn tiền để quản trị viên chuyển khoản.",
      metadata: {
        bookingId: b._id,
        mentorId,
        refundAmountVnd: amount,
        needsRefundAccount: true,
        // `?refund=1` để trang chi tiết mở thẳng modal nhập tài khoản nhận hoàn tiền.
        actionUrl: `/session/${b._id}?refund=1`,
      },
    }).catch((err) => {
      failures.push({ bookingId: String(b._id), stage: "notify", error: err?.message || String(err) });
    });

    refundedCount += 1;
    refundedVnd += amount;
  }

  if (refundedCount > 0) {
    console.log(
      `[mentorSuspensionRefund] mentor=${mentorId} đã hủy ${refundedCount} buổi, ` +
        `chờ hoàn ${refundedVnd.toLocaleString("vi-VN")}đ`,
    );
  }
  if (failures.length > 0) {
    console.error("[mentorSuspensionRefund] lỗi phụ:", JSON.stringify(failures.slice(0, 10)));
  }

  return { ok: true, refundedCount, refundedVnd, failures };
}
