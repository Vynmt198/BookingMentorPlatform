/**
 * Được học đầy đủ (không còn khóa chờ admin xác nhận CK).
 * Đồng bộ với backend `helpers/enrollmentAccess.js`.
 */
export function enrollmentAccessGranted(doc) {
  if (!doc) return false;
  const s = doc.paymentStatus == null ? "" : String(doc.paymentStatus).trim().toLowerCase();
  if (s === "pending") return false;
  if (s === "paid") return true;
  const method = String(doc.paymentMethod ?? "").trim().toLowerCase();
  if (method === "transfer") return false;
  return true;
}
