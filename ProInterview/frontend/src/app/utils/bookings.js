/* ─────────────────────────────────────────────────────────
   bookings.js  —  helpers dùng chung với booking API (sort/filter theo ngày)
───────────────────────────────────────────────────────── */

/** Parse chuỗi ngày/giờ lịch hẹn (DD/MM, DD/MM/YYYY, hoặc YYYY-MM-DD cũ từ seed data khác + HH:MM) → timestamp ms. */
export function parseDateMs(date, time) {
  try {
    const cleaned = date.includes(",") ? date.split(",")[1].trim() : date;
    const [h] = time.split(":").map(Number);

    // Một số booking cũ (seed:ui-mock) lưu date dạng ISO "YYYY-MM-DD" thay vì "DD/MM/YYYY" —
    // không bắt riêng sẽ rơi vào nhánh fallback Date.now() bên dưới, khiến các buổi cũ bị
    // sắp xếp như thể "vừa mới xảy ra", đẩy các buổi thật sự gần đây xuống dưới danh sách.
    const isoMatch = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      const [, y, m, d] = isoMatch.map(Number);
      return new Date(y, m - 1, d, h).getTime();
    }

    const parts = cleaned.split("/");

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
