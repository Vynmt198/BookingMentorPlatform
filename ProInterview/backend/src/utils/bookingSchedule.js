/** Parse booking.date (DD/MM/YYYY) + timeSlot (HH:mm). */
export function parseBookingStartMs(dateStr, timeSlot) {
  const date = String(dateStr || "").trim();
  const time = String(timeSlot || "09:00").trim();
  const parts = date.split("/").map((p) => parseInt(p, 10));
  const [h, min = 0] = time.split(":").map((p) => parseInt(p, 10));
  if (parts.length >= 3) {
    const [d, m, y] = parts;
    return new Date(y, m - 1, d, h, min, 0).getTime();
  }
  if (parts.length === 2) {
    const [d, m] = parts;
    return new Date(new Date().getFullYear(), m - 1, d, h, min, 0).getTime();
  }
  return NaN;
}

export function isBookingInLiveWindow(booking, { earlyMinutes = 15, lateMinutesAfterEnd = 60 } = {}) {
  const start = parseBookingStartMs(booking.date, booking.timeSlot);
  if (!Number.isFinite(start)) return true;
  const dur = (Number(booking.durationMinutes) || 60) * 60 * 1000;
  const end = start + dur;
  const now = Date.now();
  return now >= start - earlyMinutes * 60 * 1000 && now <= end + lateMinutesAfterEnd * 60 * 1000;
}

/** Đã tới hoặc qua giờ bắt đầu — dùng để chặn mentor hoàn thành buổi trước giờ hẹn. */
export function isBookingAtOrPastStart(booking) {
  const start = parseBookingStartMs(booking.date, booking.timeSlot);
  if (!Number.isFinite(start)) return false;
  return Date.now() >= start;
}

/** Chặn kết thúc buổi "ăn gian" — phải qua tối thiểu 2/3 thời lượng đặt mới được hoàn thành. */
const MENTOR_COMPLETE_MIN_FRACTION = 2 / 3;

export function isBookingCompletable(booking) {
  const start = parseBookingStartMs(booking.date, booking.timeSlot);
  if (!Number.isFinite(start)) return false;
  const dur = (Number(booking.durationMinutes) || 60) * 60 * 1000;
  return Date.now() >= start + dur * MENTOR_COMPLETE_MIN_FRACTION;
}

/** Khung giờ phải sau thời điểm hiện tại. */
export function isBookingSlotInFuture(dateStr, timeSlot, nowMs = Date.now()) {
  const ms = parseBookingStartMs(dateStr, timeSlot);
  if (!Number.isFinite(ms)) return false;
  return ms > nowMs;
}
