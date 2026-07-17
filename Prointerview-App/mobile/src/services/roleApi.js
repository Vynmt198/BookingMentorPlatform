/**
 * API Admin & Mentor — contract thật với backend ProInterview.
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

// ——— Admin ———
export const adminApi = {
  getStats: () => authedJson('/api/admin/stats'),
  getPlatformFinance: (month) => {
    const q = month ? `?month=${encodeURIComponent(month)}` : '';
    return authedJson(`/api/admin/finance/platform-summary${q}`);
  },
  getUsers: () => authedJson('/api/admin/users'),
  getMentors: () => authedJson('/api/admin/mentors'),
  updateUserStatus: (id, isActive) =>
    authedJson(`/api/admin/users/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    }),
  updateMentorStatus: (id, isActive) =>
    authedJson(`/api/admin/mentors/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    }),
  rejectMentor: (id, reason = '') =>
    authedJson(`/api/admin/mentors/${encodeURIComponent(id)}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    }),
  getBookings: () => authedJson('/api/admin/bookings'),
  updateBookingStatus: (id, status, reason = '') =>
    authedJson(`/api/admin/bookings/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, reason }),
    }),
  confirmBookingTransfer: (id, body = {}) =>
    authedJson(`/api/admin/bookings/${encodeURIComponent(id)}/confirm-transfer-payment`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  confirmBookingRefund: (id) =>
    authedJson(`/api/admin/bookings/${encodeURIComponent(id)}/confirm-refund`, {
      method: 'PATCH',
      body: JSON.stringify({}),
    }),
  getCoursePayments: () => authedJson('/api/admin/enrollments/course-payments'),
  confirmEnrollmentTransfer: (id, body = {}) =>
    authedJson(`/api/admin/enrollments/${encodeURIComponent(id)}/confirm-transfer-payment`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  getSubscriptionPayments: () => authedJson('/api/admin/payments/subscription-pending'),
  confirmSubscriptionTransfer: (paymentId, body = {}) =>
    authedJson(`/api/admin/payments/${encodeURIComponent(paymentId)}/confirm-subscription-transfer`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  getPayouts: () => authedJson('/api/admin/payouts'),
  approvePayout: (id, note = '') =>
    authedJson(`/api/admin/payouts/${encodeURIComponent(id)}/approve`, {
      method: 'PATCH',
      body: JSON.stringify({ note }),
    }),
  rejectPayout: (id, reason = '') =>
    authedJson(`/api/admin/payouts/${encodeURIComponent(id)}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    }),
  markPayoutPaid: (id, body = {}) =>
    authedJson(`/api/admin/payouts/${encodeURIComponent(id)}/mark-paid`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  getPendingCourses: () => authedJson('/api/admin/courses/pending'),
  approveCourse: (id) =>
    authedJson(`/api/admin/courses/${encodeURIComponent(id)}/approve`, { method: 'PATCH' }),
  rejectCourse: (id, reason = '') =>
    authedJson(`/api/admin/courses/${encodeURIComponent(id)}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    }),
  getReviews: () => authedJson('/api/admin/reviews?limit=40'),
  setReviewVisibility: (id, isVisible) =>
    authedJson(`/api/admin/reviews/${encodeURIComponent(id)}/visibility`, {
      method: 'PATCH',
      body: JSON.stringify({ isVisible }),
    }),
  getReports: () => authedJson('/api/admin/reports?open=true&limit=40'),
  updateReportStatus: (id, body) =>
    authedJson(`/api/admin/reports/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
};

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
  cancelBooking: (id, reason = '') =>
    authedJson(`/api/bookings/mentor/${encodeURIComponent(id)}/cancel`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    }),
  updateNotes: (id, notes) =>
    authedJson(`/api/bookings/${encodeURIComponent(id)}/notes`, {
      method: 'PATCH',
      body: JSON.stringify({ notes: String(notes || '') }),
    }),
};

export async function loadAdminPortalData() {
  const [
    statsRes,
    users,
    mentors,
    bookings,
    coursePayments,
    subscriptionPayments,
    payouts,
    pendingCourses,
    reviews,
    reports,
    financeRes,
  ] = await Promise.all([
    adminApi.getStats(),
    adminApi.getUsers(),
    adminApi.getMentors(),
    adminApi.getBookings(),
    adminApi.getCoursePayments(),
    adminApi.getSubscriptionPayments(),
    adminApi.getPayouts(),
    adminApi.getPendingCourses(),
    adminApi.getReviews(),
    adminApi.getReports(),
    adminApi.getPlatformFinance(),
  ]);

  if (statsRes.unauthorized || users.unauthorized) {
    return { sessionValid: false };
  }

  const stats = statsRes.stats || {};
  const mentorList = mentors.mentors || [];
  const pendingMentors = mentorList.filter(
    (m) =>
      m.isActive !== true ||
      m.adminReview?.status === 'pending' ||
      m.isVerified !== true,
  );
  const payoutList = payouts.payouts || [];
  const coursePayList = coursePayments.enrollments || coursePayments.payments || [];
  const subPayList = subscriptionPayments.payments || [];
  const pendingCourseList = pendingCourses.courses || [];
  const reportList = reports.reports || [];

  return {
    sessionValid: true,
    stats: {
      users: stats.users ?? 0,
      mentors: stats.mentors ?? 0,
      bookings: stats.bookings ?? 0,
      enrollmentsPaid: stats.enrollmentsPaid ?? 0,
      coursesPublished: stats.courses?.published ?? 0,
      coursesPending: stats.courses?.pendingReview ?? 0,
      reportsOpen: stats.reportsOpen ?? reportList.length,
      plans: stats.plans || {},
      bookingsByStatus: stats.bookingsByStatus || {},
      recentBookings: stats.recentBookings || [],
    },
    finance: financeRes.platformFinance || null,
    users: users.users || [],
    mentors: mentorList,
    pendingMentors,
    bookings: bookings.bookings || [],
    coursePayments: coursePayList,
    subscriptionPayments: subPayList,
    payouts: payoutList,
    pendingCourses: pendingCourseList,
    reviews: reviews.reviews || [],
    reports: reportList,
    queues: {
      pendingMentors: pendingMentors.length,
      coursePayments: coursePayList.length,
      subscriptionPayments: subPayList.length,
      payoutsPending: payoutList.filter((p) => p.status === 'pending' || p.status === 'approved').length,
      coursesPending: pendingCourseList.length,
      reportsOpen: reportList.length,
    },
  };
}

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
