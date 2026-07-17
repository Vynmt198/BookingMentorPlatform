import { authFetch } from '../utils/mobileAuth';
import { ensureApiBase } from '../utils/api';
import { BACKEND_DEV_HINT } from '../utils/backendErrors';
import { NativeModules, Platform } from 'react-native';

const jsonHeaders = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
};

function getMobileReturnUrl() {
  if (Platform.OS === 'web') return undefined;
  const scriptURL = NativeModules.SourceCode?.scriptURL || '';
  const host = scriptURL.match(/^https?:\/\/([^/]+)/)?.[1];
  return host ? `exp://${host}` : undefined;
}

async function buildVnpayClientHints() {
  const apiBaseUrl = (await ensureApiBase()) || '';
  const mobileReturnUrl = getMobileReturnUrl();
  const vnpReturnUrl = apiBaseUrl
    ? `${apiBaseUrl.replace(/\/$/, '')}/api/payments/vnpay/vnpay-return`
    : undefined;
  return {
    apiBaseUrl: apiBaseUrl || undefined,
    vnpReturnUrl,
    mobileReturnUrl,
  };
}

export async function enrollCourse(courseId, body = null) {
  const base = await ensureApiBase();
  if (!base) {
    return { success: false, error: `Không kết nối backend. ${BACKEND_DEV_HINT}` };
  }
  const id = String(courseId || '').trim();
  if (!id) return { success: false, error: 'Thiếu mã khóa học.' };
  try {
    const res = await authFetch(`/api/courses/${encodeURIComponent(id)}/enroll`, {
      method: 'POST',
      headers: jsonHeaders,
      body: body != null ? JSON.stringify(body) : undefined,
    });
    const out = await res.json().catch(() => ({}));
    return { success: res.ok && out.success !== false, ...out, error: out.error || (!res.ok ? `Lỗi ${res.status}` : undefined) };
  } catch {
    return { success: false, error: 'Không kết nối được backend.' };
  }
}

export async function submitEnrollmentTransfer(enrollmentId, reference = '') {
  const id = String(enrollmentId || '').trim();
  if (!id) return { success: false, error: 'Thiếu mã ghi danh.' };
  try {
    const res = await authFetch(`/api/enrollments/${encodeURIComponent(id)}/submit-transfer`, {
      method: 'PATCH',
      headers: jsonHeaders,
      body: JSON.stringify({ reference: String(reference || '').trim() }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: body.error || `Lỗi ${res.status}` };
    }
    return { success: true, ...body };
  } catch {
    return { success: false, error: 'Không kết nối được backend.' };
  }
}

export async function submitBookingTransfer(bookingId, reference = '') {
  const id = String(bookingId || '').trim();
  if (!id) return { success: false, error: 'Thiếu mã booking.' };
  try {
    const res = await authFetch(`/api/bookings/${encodeURIComponent(id)}/submit-transfer`, {
      method: 'PATCH',
      headers: jsonHeaders,
      body: JSON.stringify({ reference: String(reference || '').trim() }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: body.error || `Lỗi ${res.status}` };
    }
    return { success: true, ...body };
  } catch {
    return { success: false, error: 'Không kết nối được backend.' };
  }
}

export async function fetchTransferStatus(orderRef) {
  const ref = String(orderRef || '').trim();
  if (!ref) return { success: false, error: 'Thiếu mã đơn.' };
  try {
    const res = await authFetch(`/api/payments/transfer-status?orderRef=${encodeURIComponent(ref)}`, {
      method: 'GET',
      headers: jsonHeaders,
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.success) {
      return { success: false, error: body.error || `Lỗi ${res.status}` };
    }
    return { success: true, ...body };
  } catch {
    return { success: false, error: 'Không kết nối được backend.' };
  }
}

export async function getMyEnrollments() {
  try {
    const res = await authFetch('/api/enrollments/my', { method: 'GET', headers: jsonHeaders });
    const body = await res.json().catch(() => ({}));
    return { success: res.ok, enrollments: body.enrollments || [], error: body.error };
  } catch {
    return { success: false, enrollments: [], error: 'Không kết nối được backend.' };
  }
}

export async function initiatePayment(payload) {
  try {
    const res = await authFetch('/api/payments/initiate', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, error: body.error || `Lỗi ${res.status}` };
    return { success: Boolean(body.success), ...body };
  } catch {
    return { success: false, error: 'Không kết nối được backend.' };
  }
}

export async function fetchPaymentStatus(paymentId) {
  const id = String(paymentId || '').trim();
  if (!id) return { success: false, error: 'Thiếu mã giao dịch.' };
  try {
    const res = await authFetch(`/api/payments/${encodeURIComponent(id)}`, {
      method: 'GET',
      headers: jsonHeaders,
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, error: body.error || `Lỗi ${res.status}` };
    return { success: true, payment: body.payment || null };
  } catch {
    return { success: false, error: 'Không kết nối được backend.' };
  }
}

export async function initiateCourseVnpay(courseId, amount) {
  const hints = await buildVnpayClientHints();
  return initiatePayment({
    type: 'course',
    courseId: String(courseId || '').trim(),
    provider: 'vnpay',
    amount: Math.round(Number(amount) || 0),
    ...hints,
  });
}

export async function initiateBookingVnpay(bookingId, amount) {
  const hints = await buildVnpayClientHints();
  return initiatePayment({
    type: 'booking',
    bookingId: String(bookingId || '').trim(),
    provider: 'vnpay',
    amount: Math.round(Number(amount) || 0),
    ...hints,
  });
}

/** Xác thực redirect VNPay (query ?vnp_... trên URL return). */
export async function verifyVnpayReturn(queryString) {
  const q = String(queryString || '').replace(/^\?/, '').trim();
  if (!q) return { success: false, error: 'Thiếu tham số VNPay.' };
  try {
    const res = await authFetch(`/api/payments/vnpay/vnpay-return?${q}`, {
      method: 'GET',
      headers: jsonHeaders,
    });
    const body = await res.json().catch(() => ({}));
    return {
      success: res.ok && body.success !== false,
      ...body,
      error: body.error || (!res.ok ? `Lỗi ${res.status}` : undefined),
    };
  } catch {
    return { success: false, error: 'Không xác thực được giao dịch VNPay.' };
  }
}
