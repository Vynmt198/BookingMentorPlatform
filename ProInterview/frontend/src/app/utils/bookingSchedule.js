/**
 * Parse date (DD/MM/YYYY hoặc DD/MM) + timeSlot (HH:mm) → timestamp ms (local).
 */
export function parseBookingSlotMs(dateStr, timeSlot) {
  const date = String(dateStr || "").trim();
  const time = String(timeSlot || "09:00").trim();
  const tail = date.includes(",") ? date.split(",").pop().trim() : date;
  const parts = tail.split("/").map((p) => parseInt(p, 10));
  const [h, min = 0] = time.split(":").map((p) => parseInt(p, 10));
  if (parts.length >= 3 && Number.isFinite(parts[0]) && Number.isFinite(parts[1]) && Number.isFinite(parts[2])) {
    const [d, m, y] = parts;
    return new Date(y, m - 1, d, h, min, 0, 0).getTime();
  }
  if (parts.length >= 2 && Number.isFinite(parts[0]) && Number.isFinite(parts[1])) {
    const [d, m] = parts;
    return new Date(new Date().getFullYear(), m - 1, d, h, min, 0, 0).getTime();
  }
  return NaN;
}

/** Khung giờ phải sau thời điểm hiện tại (không cho phép quá khứ). */
export function isBookingSlotInFuture(dateStr, timeSlot, nowMs = Date.now()) {
  const ms = parseBookingSlotMs(dateStr, timeSlot);
  if (!Number.isFinite(ms)) return false;
  return ms > nowMs;
}
