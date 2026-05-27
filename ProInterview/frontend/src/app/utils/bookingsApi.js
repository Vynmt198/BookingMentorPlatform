import { authFetch, hasAuthCredentials } from "./auth.js";
import { apiUrl } from "./api.js";

const jsonHeaders = {
  Accept: "application/json",
  "Content-Type": "application/json",
};

/**
 * Tạo booking (POST /api/bookings) — cần Bearer JWT.
 * Payload khớp Booking.jsx / Checkout: mentorId, date, time hoặc timeSlot, sessionType, notes/position/note, price, …
 */
export async function createBooking(payload) {
  if (!hasAuthCredentials()) {
    return { success: false, error: "Chưa đăng nhập." };
  }
  try {
    const res = await authFetch("/api/bookings", {
      method: "POST",
      headers: { ...jsonHeaders },
      body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        success: false,
        error: body.error || `Đặt lịch thất bại (${res.status})`,
      };
    }
    if (body.success && body.booking) {
      return { success: true, booking: body.booking };
    }
    return { success: false, error: body.error || "Đặt lịch thất bại." };
  } catch {
    return {
      success: false,
      error: "Không kết nối được backend. Kiểm tra VITE_API_URL và backend đang chạy.",
    };
  }
}

function authedGet(path) {
  if (!hasAuthCredentials()) return Promise.resolve({ success: false, error: "Chưa đăng nhập." });
  return authFetch(path, {
    method: "GET",
    headers: { ...jsonHeaders },
  })
    .then(async (res) => {
      const body = await res.json().catch(() => ({}));
      if (!res.ok) return { success: false, error: body.error || `Lỗi ${res.status}` };
      return { success: true, ...body };
    })
    .catch(() => ({ success: false, error: "Không kết nối được backend." }));
}

function authedSend(method, path, payload) {
  if (!hasAuthCredentials()) return Promise.resolve({ success: false, error: "Chưa đăng nhập." });
  return authFetch(path, {
    method,
    headers: { ...jsonHeaders },
    body: payload != null ? JSON.stringify(payload) : undefined,
  })
    .then(async (res) => {
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { success: false, ...body, error: body.error || `Lỗi ${res.status}` };
      }
      return { success: true, ...body };
    })
    .catch(() => ({ success: false, error: "Không kết nối được backend." }));
}

export async function listBookings() {
  const r = await authedGet("/api/bookings");
  if (!r.success) return r;
  return { success: true, bookings: r.bookings ?? [] };
}

export async function listMentorBookings() {
  const r = await authedGet("/api/bookings/mentor/list");
  if (!r.success) return r;
  return { success: true, bookings: r.bookings ?? [] };
}

export async function fetchBookingById(id) {
  if (!id) return { success: false, error: "Thiếu id." };
  return authedGet(`/api/bookings/${encodeURIComponent(id)}`);
}

export async function fetchMentorBookingById(id) {
  if (!id) return { success: false, error: "Thiếu id." };
  return authedGet(`/api/bookings/mentor/${encodeURIComponent(id)}`);
}

export async function cancelBooking(id, body = {}) {
  if (!id) return { success: false, error: "Thiếu id." };
  return authedSend("DELETE", `/api/bookings/${encodeURIComponent(id)}`, body);
}

/** Bổ sung STK nhận hoàn khi `refund_pending` (vd. mentor hủy trước khi user khai báo STK). */
export async function updateBookingRefundDestination(bookingId, body) {
  if (!bookingId) return { success: false, error: "Thiếu id booking." };
  return authedSend("PATCH", `/api/bookings/${encodeURIComponent(bookingId)}/refund-destination`, body);
}

/** HV chọn đổi lịch / đổi mentor / hoàn tiền sau khi mentor hủy (đã thanh toán). */
export async function resolveMentorCancelBooking(bookingId, body) {
  if (!bookingId) return { success: false, error: "Thiếu id booking." };
  return authedSend("PATCH", `/api/bookings/${encodeURIComponent(bookingId)}/mentor-cancel-resolution`, body);
}

/** HV báo mentor no-show (sau giờ họp + 15 phút). */
export async function reportBookingNoShow(bookingId, body = {}) {
  if (!bookingId) return { success: false, error: "Thiếu id booking." };
  return authedSend("POST", `/api/bookings/${encodeURIComponent(bookingId)}/report-no-show`, body);
}

export async function fetchRebookCredit(sourceBookingId) {
  if (!sourceBookingId) return { success: false, error: "Thiếu id booking nguồn." };
  return authedGet(`/api/bookings/${encodeURIComponent(sourceBookingId)}/rebook-credit`);
}

/** Khách báo đã CK; `reference` tuỳ chọn (FT…). Có thể gửi mã đơn hoặc để trống — VietQR đã gắn nội dung. */
export async function submitBookingTransferReference(bookingId, reference) {
  if (!bookingId) return { success: false, error: "Thiếu id booking." };
  return authedSend("PATCH", `/api/bookings/${encodeURIComponent(bookingId)}/submit-transfer`, {
    reference: String(reference ?? "").trim(),
  });
}

export async function rescheduleBooking(id, body) {
  if (!id) return { success: false, error: "Thiếu id." };
  return authedSend("PATCH", `/api/bookings/${encodeURIComponent(id)}/reschedule`, body ?? {});
}

export async function mentorRescheduleBooking(id, body) {
  if (!id) return { success: false, error: "Thiếu id." };
  return authedSend("PATCH", `/api/bookings/mentor/${encodeURIComponent(id)}/reschedule`, body ?? {});
}

export async function mentorCancelBooking(id, body = {}) {
  if (!id) return { success: false, error: "Thiếu id." };
  return authedSend("PATCH", `/api/bookings/mentor/${encodeURIComponent(id)}/cancel`, body);
}

export async function fetchBookedSlots(mentorId) {
  if (!mentorId) return { success: false, error: "Thiếu mentorId." };
  try {
    const res = await fetch(apiUrl(`/api/bookings/mentor/${encodeURIComponent(mentorId)}/booked-slots`));
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, error: body.error || "Lỗi tải lịch bận." };
    return { success: true, booked: body.booked ?? {} };
  } catch {
    return { success: false, error: "Không kết nối được backend." };
  }
}
export async function completeMentorBooking(id) {
  if (!id) return { success: false, error: "Thiếu id." };
  return authedSend("PATCH", `/api/bookings/${encodeURIComponent(id)}/complete`, {});
}

/** Đánh dấu buổi học `in_progress` khi vào phòng (học viên hoặc mentor). */
export async function startBookingMeeting(id, { asMentor = false } = {}) {
  if (!id) return { success: false, error: "Thiếu id." };
  const path = asMentor
    ? `/api/bookings/mentor/${encodeURIComponent(id)}/start`
    : `/api/bookings/${encodeURIComponent(id)}/start`;
  return authedSend("PATCH", path, {});
}

export async function updateMentorNotes(id, body) {
  if (!id) return { success: false, error: "Thiếu id." };
  return authedSend("PATCH", `/api/bookings/${encodeURIComponent(id)}/notes`, body);
}
