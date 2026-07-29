/**
 * API Mentor — contract thật với backend ProInterview.
 */
import { authFetch } from '../utils/mobileAuth';

const jsonHeaders = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
};

async function authedJson(path, init = {}) {
  try {
    const res = await authFetch(path, {
      ...init,
      headers: { ...jsonHeaders, ...(init.headers || {}) },
    });
    const body = await res.json().catch(() => ({}));
    if (res.status === 401 || res.status === 403) {
      return { success: false, unauthorized: true, error: body.error || 'Phiên đăng nhập hết hạn.' };
    }
    if (!res.ok) {
      return { success: false, error: body.error || body.message || `Lỗi ${res.status}` };
    }
    return { success: true, ...body };
  } catch {
    return { success: false, error: 'Không kết nối được backend.' };
  }
}

// ——— Mentor ———
export const mentorApi = {
  getDashboard: () => authedJson('/api/mentor/dashboard'),
  getBookings: () => authedJson('/api/bookings/mentor/list'),
  getBookingDetail: (id) => authedJson(`/api/bookings/mentor/${encodeURIComponent(id)}`),
  getFinance: () => authedJson('/api/mentor/finance'),
  getAnalytics: () => authedJson('/api/mentor/analytics'),
  getReviews: () => authedJson('/api/mentor/reviews'),
  getPayouts: () => authedJson('/api/mentor/payouts'),
  getMyProfile: () => authedJson('/api/mentors/me'),
  getAvailability: (mentorId) =>
    authedJson(`/api/mentors/${encodeURIComponent(mentorId)}/availability`),
  updateAvailability: (payload) =>
    authedJson('/api/mentors/me/availability', {
      method: 'PATCH',
      body: JSON.stringify(payload ?? {}),
    }),
  blockDates: (dates) =>
    authedJson('/api/mentors/me/availability/block', {
      method: 'PATCH',
      body: JSON.stringify({ dates }),
    }),
  requestPayout: (amount) =>
    authedJson('/api/mentor/payout', {
      method: 'POST',
      body: JSON.stringify({ amount: Math.round(Number(amount) || 0) }),
    }),
  updatePayoutAccount: (payload) =>
    authedJson('/api/mentor/payout-account', {
      method: 'PATCH',
      body: JSON.stringify(payload ?? {}),
    }),
  getMyCourses: () => authedJson('/api/courses/me'),
  createCourse: (payload) =>
    authedJson('/api/courses', {
      method: 'POST',
      body: JSON.stringify(payload ?? {}),
    }),
  updateCourse: (id, payload) =>
    authedJson(`/api/courses/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload ?? {}),
    }),
  publishCourse: (id) =>
    authedJson(`/api/courses/${encodeURIComponent(id)}/publish`, { method: 'PATCH' }),
  archiveCourse: (id) =>
    authedJson(`/api/courses/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  confirmBooking: (id) =>
    authedJson(`/api/bookings/${encodeURIComponent(id)}/confirm`, { method: 'PATCH' }),
  completeBooking: (id) =>
    authedJson(`/api/bookings/${encodeURIComponent(id)}/complete`, { method: 'PATCH' }),
  startBooking: (id) =>
    authedJson(`/api/bookings/mentor/${encodeURIComponent(id)}/start`, { method: 'PATCH' }),
  submitCheckIn: (id, imageUrl) =>
    authedJson(`/api/bookings/mentor/${encodeURIComponent(id)}/check-in`, {
      method: 'PATCH',
      body: JSON.stringify({ imageUrl }),
    }),
  submitSummary: (id, payload) =>
    authedJson(`/api/bookings/${encodeURIComponent(id)}/summary`, {
      method: 'PATCH',
      body: JSON.stringify(payload ?? {}),
    }),
  reportCustomerNoShow: (id, reason = '') =>
    authedJson(`/api/bookings/${encodeURIComponent(id)}/report-customer-no-show`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  getPeerReviews: () => authedJson('/api/mentor/peer-reviews'),
  submitPeerReview: (courseId, payload) =>
    authedJson(`/api/mentor/peer-reviews/${encodeURIComponent(courseId)}`, {
      method: 'POST',
      body: JSON.stringify(payload ?? {}),
    }),
  cancelBooking: (id, reason = '') =>
    authedJson(`/api/bookings/mentor/${encodeURIComponent(id)}/cancel`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    }),
  rescheduleBooking: (id, payload) =>
    authedJson(`/api/bookings/mentor/${encodeURIComponent(id)}/reschedule`, {
      method: 'PATCH',
      body: JSON.stringify(payload ?? {}),
    }),
  updateNotes: (id, notes) =>
    authedJson(`/api/bookings/${encodeURIComponent(id)}/notes`, {
      method: 'PATCH',
      body: JSON.stringify({ notes: String(notes || '') }),
    }),
  replyToReview: (id, reply) =>
    authedJson(`/api/reviews/${encodeURIComponent(id)}/reply`, {
      method: 'PATCH',
      body: JSON.stringify({ reply: String(reply || '') }),
    }),
};

export async function loadMentorPortalData() {
  const [dashboardRes, bookings, financeRes, analytics, reviews, payouts, profile, courses] =
    await Promise.all([
      mentorApi.getDashboard(),
      mentorApi.getBookings(),
      mentorApi.getFinance(),
      mentorApi.getAnalytics(),
      mentorApi.getReviews(),
      mentorApi.getPayouts(),
      mentorApi.getMyProfile(),
      mentorApi.getMyCourses(),
    ]);

  if (dashboardRes.unauthorized || bookings.unauthorized) {
    return { sessionValid: false };
  }

  const dashboard = dashboardRes.dashboard || {};
  const finance = financeRes.finance || dashboard.finance || null;
  const bookingList = bookings.bookings || [];
  // Backend: reviews + payouts trả `items`
  const reviewList = reviews.items || reviews.reviews || [];
  const payoutList = payouts.items || payouts.payouts || [];

  return {
    sessionValid: true,
    dashboard: {
      totalSessions: dashboard.totalSessions ?? bookingList.length,
      completedSessions: dashboard.completedSessions ?? 0,
      sessionsThisMonth: dashboard.sessionsThisMonth ?? 0,
      upcomingWithin7Days: dashboard.upcomingWithin7Days ?? 0,
      reviewCount: dashboard.reviewCount ?? reviewList.length,
      avgRating: dashboard.avgRating ?? reviews.summary?.avgRating ?? 0,
      upcomingBookings: dashboard.upcomingBookings || [],
      finance: dashboard.finance || finance,
    },
    bookings: bookingList,
    finance,
    analytics: analytics.analytics || null,
    reviews: reviewList,
    payouts: payoutList,
    profile: profile.mentor || null,
    courses: courses.courses || [],
  };
}
