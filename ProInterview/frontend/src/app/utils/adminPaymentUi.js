/**
 * Nhãn thanh toán chuyển khoản — SePay tự đối soát; admin xác nhận thủ công khi cổng lỗi.
 */

export const SEPAY_INCOMING_COPY =
  "Thanh toán chuyển khoản được SePay tự đối soát. Admin chỉ xác nhận thủ công khi cổng thanh toán lỗi.";

/** Nhãn trạng thái thanh toán (tiếng Việt, không viết tắt). */
export function labelPaymentStatus(status) {
  const s = String(status || "").toLowerCase();
  const map = {
    pending: "Chờ đối soát",
    paid: "Đã thanh toán",
    refund_pending: "Chờ hoàn tiền",
    refunded: "Đã hoàn tiền",
    partial_refund: "Hoàn một phần",
    failed: "Thất bại",
    cancelled: "Đã hủy",
  };
  return map[s] || (status ? String(status) : "—");
}

/** Nhãn thời điểm đã ghi nhận thanh toán chuyển khoản. */
export function formatTransferConfirmedAt(row) {
  const at = row?.transferConfirmedAt || row?.paidAt;
  if (!at) return null;
  const when = new Date(at).toLocaleString("vi-VN");
  if (row?.transferForceConfirm) {
    return { text: `Admin xác nhận thủ công · ${when}`, tone: "override" };
  }
  return { text: `SePay đã đối soát · ${when}`, tone: "sepay" };
}
