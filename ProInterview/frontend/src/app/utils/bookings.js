/* ─────────────────────────────────────────────────────────
   bookings.js  —  helpers dùng chung với booking API (sort/filter theo ngày)
───────────────────────────────────────────────────────── */

/** Parse chuỗi ngày/giờ lịch hẹn (DD/MM hoặc DD/MM/YYYY + HH:MM) → timestamp ms. */
export function parseDateMs(date, time) {
  try {
    const cleaned = date.includes(",") ? date.split(",")[1].trim() : date;
    const parts = cleaned.split("/");
    const [h] = time.split(":").map(Number);

    if (parts.length === 3) {
      const [d, m, y] = parts.map(Number);
      return new Date(y, m - 1, d, h).getTime();
    }
    if (parts.length === 2) {
      const [d, m] = parts.map(Number);
      const y = new Date().getFullYear();
      return new Date(y, m - 1, d, h).getTime();
    }

    return Date.now();
  } catch {
    return Date.now();
  }
}
