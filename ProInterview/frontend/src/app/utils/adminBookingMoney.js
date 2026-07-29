/* ─────────────────────────────────────────────────────────
   adminBookingMoney.js — tổng hợp dòng tiền lịch hẹn cho admin (thu / chờ hoàn / đã hoàn),
   dùng chung giữa AdminBookings và AdminFinance để 2 màn không tính lệch nhau.
───────────────────────────────────────────────────────── */

function paymentStatusOf(b) {
  return String(b?.paymentStatus || "").toLowerCase();
}

function bookingAmount(b) {
  return Number(b?.totalAmount ?? b?.price ?? 0);
}

function refundedAmountOf(b) {
  const explicit = Number(b?.cancelRefundAmountVnd);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;
  return bookingAmount(b);
}

/**
 * Booking `refunded`/`partial_refund` từng được tính vào "đã thu" nhưng sau đó đã trả lại
 * (một phần hoặc toàn bộ) cho học viên. Nếu không tách riêng, số tiền này biến mất khỏi mọi
 * card tổng hợp — nhìn vào không biết tiền đã thu bao nhiêu, đã hoàn bao nhiêu.
 */
export function summarizeBookingMoney(bookings = []) {
  const ck = bookings.filter((b) => b.paymentMethod === "transfer");
  const pending = ck.filter((b) => paymentStatusOf(b) === "pending");
  const paid = ck.filter((b) => paymentStatusOf(b) === "paid");
  const refundPending = bookings.filter((b) => paymentStatusOf(b) === "refund_pending");
  const refunded = bookings.filter((b) => ["refunded", "partial_refund"].includes(paymentStatusOf(b)));

  return {
    pendingTransferCount: pending.length,
    pendingTransferAmount: pending.reduce((s, b) => s + bookingAmount(b), 0),
    paidCollectedCount: paid.length,
    paidCollectedAmount: paid.reduce((s, b) => s + bookingAmount(b), 0),
    refundPendingCount: refundPending.length,
    refundPendingAmount: refundPending.reduce((s, b) => s + Number(b.cancelRefundAmountVnd || 0), 0),
    refundedCount: refunded.length,
    refundedAmount: refunded.reduce((s, b) => s + refundedAmountOf(b), 0),
  };
}
