/**
 * API client mobile — gọi backend ProInterview (Express), cùng contract với web frontend.
 */
import { apiUrl, ensureApiBase } from '../utils/api';
import { authFetch } from '../utils/mobileAuth';
import { mapApiCourseToCard } from './courseApi';
import { resolveMediaUrl, mentorAvatarFallback } from '../utils/mediaUrl';

const jsonHeaders = {
  Accept: 'application/json',
  'Content-Type': 'application/json',

};

function mapMentorCard(m) {
  const roleStr = m.role || m.title || m.headline || m.desiredPosition || '';
  const companyStr = String(m.company || m.currentCompany || '').trim();
  const fields = Array.isArray(m.fields) ? m.fields : [];
  const specialties = Array.isArray(m.specialties)
    ? m.specialties
    : Array.isArray(m.tags)
      ? m.tags
      : [];
  const categorySource = `${roleStr} ${fields.join(' ')} ${specialties.join(' ')}`.toLowerCase();
  const ratingRaw = m.rating ?? m.averageRating ?? m.stats?.averageRating;
  const rating = ratingRaw != null && Number(ratingRaw) > 0 ? Number(ratingRaw) : null;
  let category = '';
  if (categorySource.includes('frontend')) category = 'Frontend';
  else if (categorySource.includes('backend') || categorySource.includes('system design')) category = 'Backend';
  else if (categorySource.includes('qa') || categorySource.includes('test')) category = 'QA/QC';
  else if (categorySource.includes('product') || categorySource.includes('talent')) category = 'Product';
  else if (fields[0] || specialties[0]) category = String(fields[0] || specialties[0]);

  const name = m.name || m.fullName || 'Mentor';
  const rawAvatar = m.avatar || m.avatarUrl || m.userId?.avatar || '';
  const avatar = resolveMediaUrl(rawAvatar) || mentorAvatarFallback(name);

  return {
    id: m.publicId || m._id || m.id,
    name,
    role: roleStr || 'Mentor',
    title: roleStr || 'Mentor',
    company: companyStr && companyStr !== '-' && companyStr !== '—' ? companyStr : '',
    rating,
    avatar,
    category,
    reviews: m.reviewsCount || m.reviews || m.stats?.reviewCount || 0,
    price: Number(m.price || m.sessionTypes?.[0]?.price) || 0,
    experience: Number(m.experience ?? m.experienceYears) || 0,
    specialties,
    fields,
    tags: specialties,
    sessionsDone: Number(m.sessionsDone || m.stats?.sessionCount) || 0,
    responseTime: m.responseTime || '',
    available: m.available !== false,
    isVerified: m.isVerified === true,
    bio: m.bio || '',
    field: m.field || fields[0] || '',
    timezone: m.timezone || 'Asia/Ho_Chi_Minh',
    sessionTypes: Array.isArray(m.sessionTypes) ? m.sessionTypes : [],
    companies: Array.isArray(m.companies) ? m.companies : [],
    profileWorkExperience: m.profileWorkExperience || '',
    profileEducation: m.profileEducation || '',
    profileAwards: m.profileAwards || '',
    recurringSchedule: Array.isArray(m.recurringSchedule) ? m.recurringSchedule : [],
  };
}

function mapCourseCard(c) {
  return mapApiCourseToCard(c);
}

export async function fetchPublicCatalog() {
  const base = await ensureApiBase();
  if (!base) {
    return { success: false, mentors: [], courses: [], error: 'Không kết nối backend.' };
  }

  try {
    const mentorsRes = await fetch(apiUrl('/api/mentors'), { headers: jsonHeaders });
    if (!mentorsRes.ok) {
      return { success: false, mentors: [], courses: [], error: `Mentors HTTP ${mentorsRes.status}` };
    }

    const rawMentors = await mentorsRes.json();
    const mentorsList = Array.isArray(rawMentors) ? rawMentors : rawMentors?.mentors || [];
    const mentors = mentorsList.map(mapMentorCard);

    let courses = [];
    try {
      const coursesRes = await fetch(apiUrl('/api/courses'), { headers: jsonHeaders });
      if (coursesRes.ok) {
        const rawCourses = await coursesRes.json();
        const coursesList = Array.isArray(rawCourses) ? rawCourses : rawCourses?.courses || [];
        courses = coursesList.map(mapCourseCard);
      }
    } catch {
      courses = [];
    }

    return { success: true, mentors, courses };
  } catch {
    return { success: false, mentors: [], courses: [], error: 'Không tải được catalog.' };
  }
}

export async function loadAuthenticatedUserData(existingUser = null) {
  const result = {
    sessionValid: true,
    user: existingUser || null,
    bookings: [],
    notifications: [],
    cvAnalyses: [],
    enrollments: [],
    payments: [],
  };

  try {
    if (!result.user) {
      const profileRes = await authFetch('/api/auth/me', { method: 'GET' });
      if (profileRes.status === 401 || profileRes.status === 403) {
        return { ...result, sessionValid: false };
      }
      if (profileRes.ok) {
        const resData = await profileRes.json();
        if (resData.success && resData.user) {
          result.user = resData.user;
        }
      }
    }
  } catch {
    /* ignore */
  }

  if (!result.sessionValid) {
    return result;
  }

  // Luôn tải thông báo theo tài khoản (customer + mentor).
  try {
    const notifRes = await authFetch('/api/notifications?limit=100', { method: 'GET' });
    if (notifRes?.ok) {
      const notifData = await notifRes.json().catch(() => ({}));
      if (Array.isArray(notifData.notifications)) {
        result.notifications = notifData.notifications;
      }
    }
  } catch {
    /* ignore */
  }

  // Chỉ tải dữ liệu customer khi role phù hợp
  const role = result.user?.role;
  if (role === 'mentor') {
    return result;
  }

  // Các khối hồ sơ độc lập: tải song song để giảm đáng kể thời gian mở trang Cá nhân.
  const endpoints = [
    '/api/bookings',
    '/api/cv/analyses',
    '/api/enrollments/my',
    '/api/payments/history?limit=30',
  ];
  const responses = await Promise.all(
    endpoints.map((path) =>
      authFetch(path, { method: 'GET' }).catch(() => null),
    ),
  );
  const payloads = await Promise.all(
    responses.map((response) =>
      response?.ok ? response.json().catch(() => ({})) : Promise.resolve({}),
    ),
  );

  const [bookingsData, cvData, enrollmentsData, paymentsData] = payloads;
  if (Array.isArray(bookingsData.bookings)) result.bookings = bookingsData.bookings;
  if (Array.isArray(cvData.list)) result.cvAnalyses = cvData.list;
  if (Array.isArray(enrollmentsData.enrollments)) result.enrollments = enrollmentsData.enrollments;
  if (Array.isArray(paymentsData.payments)) result.payments = paymentsData.payments;

  return result;
}

export async function createBooking(payload) {
  const res = await authFetch('/api/bookings', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok && body.success, body };
}

export async function fetchMentorAvailability(mentorId) {
  const base = await ensureApiBase();
  if (!base || !mentorId) {
    return { success: false, availability: null };
  }

  try {
    const res = await fetch(apiUrl(`/api/mentors/${encodeURIComponent(mentorId)}/availability`), {
      headers: jsonHeaders,
    });
    const body = await res.json().catch(() => ({}));
    return {
      success: res.ok && body.success,
      availability: body.availability || null,
      error: body.error || '',
    };
  } catch {
    return { success: false, availability: null, error: 'Không thể tải lịch trống.' };
  }
}

export async function fetchMentor(mentorId) {
  const base = await ensureApiBase();
  if (!base || !mentorId) {
    return { success: false, mentor: null, error: 'Thiếu mã mentor.' };
  }

  try {
    const res = await fetch(apiUrl(`/api/mentors/${encodeURIComponent(mentorId)}`), {
      headers: jsonHeaders,
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.success || !body.mentor) {
      return {
        success: false,
        mentor: null,
        error: body.error || 'Không tải được hồ sơ mentor.',
      };
    }
    return { success: true, mentor: mapMentorCard(body.mentor) };
  } catch {
    return { success: false, mentor: null, error: 'Không thể tải hồ sơ mentor.' };
  }
}

export async function saveCvAnalysis(payload) {
  const res = await authFetch('/api/cv/analyses', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      success: false,
      error: body.message || body.details?.[0]?.message || body.error || `Lỗi lưu CV ${res.status}`,
    };
  }
  return { success: true, ...body };
}

function clampText(value, max) {
  const s = String(value ?? '');
  return s.length > max ? s.slice(0, max) : s;
}

/**
 * DocumentPicker trên React Native (native) trả về { uri: "file://..." } — fetch/FormData của RN
 * hiểu shape { uri, name, type } và tự đọc file từ URI đó.
 * Trên web, DocumentPicker trả về { uri: "blob:...", file: <File thật> } — FormData của trình
 * duyệt KHÔNG hiểu shape { uri, name, type } (chỉ stringify thành "[object Object]"), phải append
 * thẳng object File/Blob thật thì mới gửi đúng nội dung file lên server.
 */
function appendFilePart(form, fieldName, pickedFile) {
  const realFile = pickedFile?.file;
  if (typeof Blob !== 'undefined' && realFile instanceof Blob) {
    form.append(fieldName, realFile, pickedFile.name || realFile.name || fieldName);
    return;
  }
  form.append(fieldName, {
    uri: pickedFile.uri,
    name: pickedFile.name || fieldName,
    type: pickedFile.mimeType || 'application/pdf',
  });
}

/**
 * Backend/DB chỉ chấp nhận điểm AI thang 0-5 (Joi + Mongoose), nhưng LLM (cv_jd_matching)
 * luôn chấm theo thang 0-10 — quy đổi giống hệt web (`normalizeDimensionScore` trong
 * frontend/src/app/utils/cvMappers.js) để không bị lệch giữa 2 nền tảng.
 */
function normalizeDimensionScore(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  if (n > 5) return Math.min(5, Math.round((n / 10) * 5 * 10) / 10);
  return Math.min(5, Math.max(0, n));
}

/** raw.scores.<dim> trả về từ Python là { score, reason } — không phải số thô. */
function extractScores(rawScores) {
  const dim = (key) => normalizeDimensionScore(rawScores?.[key]?.score ?? rawScores?.[key]);
  return {
    clarity: dim('clarity'),
    structure: dim('structure'),
    relevance: dim('relevance'),
    credibility: dim('credibility'),
  };
}

/**
 * Python trả suggestions dạng snake_case (rewritten_bullets, missing_skill_suggestions,
 * executive_summary) — backend Joi (cvAnalysis.dto.js) yêu cầu đúng camelCase + field cụ thể
 * và từ chối thẳng request nếu có key lạ (stripUnknown: false). Map lại cho khớp.
 */
function mapPythonSuggestions(raw) {
  const rewrittenBullets = (raw?.rewritten_bullets || [])
    .slice(0, 50)
    .map((b) => ({
      original: clampText(b.original, 2000),
      rewritten: clampText(b.rewritten, 2000),
      reasoning: clampText((b.changes_made || []).join('; '), 1000),
      starElements: {
        situation: !!b.star_check?.situation,
        task: !!b.star_check?.task,
        action: !!b.star_check?.action,
        result: !!b.star_check?.result,
      },
    }))
    .filter((b) => b.original && b.rewritten);

  const missingSkillSuggestions = (raw?.missing_skill_suggestions || [])
    .slice(0, 20)
    .map((s) => ({
      skill: clampText(s.skill, 100),
      priority: ['high', 'medium', 'low'].includes(s.priority) ? s.priority : 'medium',
      reason: clampText(s.reframe_tip || '', 500),
      resources: s.acquisition_path ? [clampText(s.acquisition_path, 500)] : [],
    }))
    .filter((s) => s.skill);

  return {
    rewrittenBullets,
    missingSkillSuggestions,
    executiveSummary: clampText(raw?.executive_summary || '', 5000),
  };
}

/** Chuẩn hoá response chung của /api/cv/analyze, /analyze/field, /analyze/suggestions. */
function parseAnalyzerResponse(raw) {
  const match = raw?.match || {};
  const matched = match.matching || raw?.matchedKeywords || [];
  const missing = match.missing || raw?.missingKeywords || [];

  let matchScore = Number(match.match_score ?? match.score ?? raw?.matchScore);
  if (!Number.isFinite(matchScore)) {
    const total = matched.length + missing.length;
    matchScore = total > 0 ? Math.round((matched.length / total) * 100) : 0;
  }

  const scores = extractScores(raw?.scores);
  const summary =
    raw?.suggestions?.executive_summary || raw?.scores?.summary || raw?.summary || raw?.feedback || '';

  return { matched, missing, matchScore, scores, summary };
}

/**
 * Phân tích CV thật qua /api/cv/analyze/field (không JD) rồi lưu MongoDB.
 * @param {{ uri: string, name?: string, mimeType?: string }} file
 * @param {{ field?: string, onProgress?: (n:number)=>void }} [opts]
 */
export async function analyzeAndSaveCv(file, opts = {}) {
  const field = opts.field || 'IT / Công nghệ';
  const onProgress = typeof opts.onProgress === 'function' ? opts.onProgress : () => {};
  if (!file?.uri) return { success: false, error: 'Thiếu file CV.' };

  onProgress(15);
  const form = new FormData();
  appendFilePart(form, 'resume', file);
  form.append('field', field);

  onProgress(35);
  let analyzeRes;
  try {
    analyzeRes = await authFetch('/api/cv/analyze/field', {
      method: 'POST',
      body: form,
    });
  } catch {
    return { success: false, error: 'Không gọi được máy phân tích CV.' };
  }

  onProgress(70);
  const raw = await analyzeRes.json().catch(() => ({}));
  if (!analyzeRes.ok) {
    return {
      success: false,
      error: raw.message || raw.error || `Phân tích CV thất bại (${analyzeRes.status})`,
    };
  }

  const { matched, missing, matchScore, scores, summary } = parseAnalyzerResponse(raw);
  const suggestions = mapPythonSuggestions(raw.suggestions);

  const payload = {
    cvFileName: file.name || 'cv.pdf',
    mode: 'field',
    field,
    tier: 'full', // /analyze/field luôn trả về scores + suggestions (kể cả khi fallback heuristic)
    result: {
      matchScore,
      matchedKeywords: matched,
      missingKeywords: missing,
      skills: {
        matched,
        missing,
        cv: matched,
        jd: [...matched, ...missing],
      },
      scores,
      suggestions,
    },
  };

  onProgress?.(88);
  const saved = await saveCvAnalysis(payload);
  onProgress?.(100);
  if (!saved.success) {
    return { success: false, error: saved.error || 'Không lưu được kết quả.', analysis: payload.result };
  }
  return { success: true, analysis: payload.result, saved, summary };
}

/**
 * Phân tích CV so với JD thật (upload cả 2 file PDF) qua /api/cv/analyze/suggestions rồi lưu MongoDB.
 * Gọi LLM — có thể mất 30–120 giây. Nếu máy chấm điểm AI không khả dụng (LLM_API_KEY chưa cấu hình,
 * Ollama down…) tự động fallback về /api/cv/analyze (so khớp kỹ năng thuần, không cần LLM) để người
 * dùng vẫn có kết quả JD-matching thay vì báo lỗi trắng.
 * @param {{ uri: string, name?: string, mimeType?: string }} cvFile
 * @param {{ uri: string, name?: string, mimeType?: string }} jdFile
 * @param {{ onProgress?: (n:number)=>void }} [opts]
 */
export async function analyzeCvAgainstJd(cvFile, jdFile, opts = {}) {
  const onProgress = typeof opts.onProgress === 'function' ? opts.onProgress : () => {};
  if (!cvFile?.uri) return { success: false, error: 'Thiếu file CV.' };
  if (!jdFile?.uri) return { success: false, error: 'Thiếu file JD (mô tả công việc).' };

  const buildForm = () => {
    const form = new FormData();
    appendFilePart(form, 'resume', cvFile);
    appendFilePart(form, 'jd', jdFile);
    return form;
  };

  const callAnalyze = async (path) => {
    const res = await authFetch(path, { method: 'POST', body: buildForm() });
    const body = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, body };
  };

  onProgress(10);
  let full;
  try {
    full = await callAnalyze('/api/cv/analyze/suggestions');
  } catch {
    full = { ok: false, status: 0, body: {} };
  }

  let raw = full.body;
  let tier = 'suggestions';
  let note = '';

  if (!full.ok) {
    onProgress(45);
    let basic;
    try {
      basic = await callAnalyze('/api/cv/analyze');
    } catch {
      return { success: false, error: 'Không gọi được máy phân tích CV theo JD.' };
    }
    if (!basic.ok) {
      return {
        success: false,
        error:
          full.body?.message ||
          full.body?.error ||
          basic.body?.message ||
          basic.body?.error ||
          `Phân tích CV theo JD thất bại (${basic.status})`,
      };
    }
    raw = basic.body;
    tier = 'basic';
    note = 'Đã dùng phân tích cơ bản (so khớp kỹ năng) vì máy chấm điểm AI hiện không khả dụng.';
  }

  onProgress(80);
  const { matched, missing, matchScore, scores, summary } = parseAnalyzerResponse(raw);
  const suggestions = tier !== 'basic' ? mapPythonSuggestions(raw.suggestions) : null;

  const payload = {
    cvFileName: cvFile.name || 'cv.pdf',
    jdFileName: jdFile.name || 'jd.pdf',
    mode: 'jd',
    tier,
    result: {
      matchScore,
      matchedKeywords: matched,
      missingKeywords: missing,
      skills: {
        matched,
        missing,
        cv: matched,
        jd: [...matched, ...missing],
      },
      ...(tier !== 'basic' ? { scores, suggestions } : {}),
    },
  };

  onProgress(92);
  const saved = await saveCvAnalysis(payload);
  onProgress(100);
  if (!saved.success) {
    return { success: false, error: saved.error || 'Không lưu được kết quả.', analysis: payload.result };
  }
  return { success: true, analysis: payload.result, saved, summary, note };
}

export async function markAllNotificationsRead() {
  const res = await authFetch('/api/notifications/read-all', {
    method: 'POST',
    headers: jsonHeaders,
  });
  return res.ok;
}

export async function markNotificationRead(id) {
  if (!id) return { success: false };
  const res = await authFetch(`/api/notifications/${encodeURIComponent(id)}/read`, {
    method: 'PATCH',
    headers: jsonHeaders,
  });
  return { success: res.ok };
}

export async function deleteNotification(id) {
  if (!id) return { success: false };
  const res = await authFetch(`/api/notifications/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: jsonHeaders,
  });
  return { success: res.ok };
}

/** Customer hủy booking của mình */
export async function cancelCustomerBooking(id, reason = '') {
  if (!id) return { success: false, error: 'Thiếu booking id.' };
  const res = await authFetch(`/api/bookings/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: jsonHeaders,
    body: JSON.stringify({ reason: reason || 'Khách hủy lịch trên app.' }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) return { success: false, error: body.error || body.message || 'Không hủy được lịch.' };
  return { success: true, booking: body.booking, ...body };
}

/** Đánh giá sau buổi mentoring */
export async function createBookingReview(bookingId, { rating = 5, comment = '' } = {}) {
  if (!bookingId) return { success: false, error: 'Thiếu booking id.' };
  const res = await authFetch(`/api/bookings/${encodeURIComponent(bookingId)}/review`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ rating: Math.min(5, Math.max(1, Number(rating) || 5)), comment }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) return { success: false, error: body.error || body.message || 'Không gửi được đánh giá.' };
  return { success: true, ...body };
}

export async function deleteCvAnalysis(id) {
  if (!id) return { success: false, error: 'Thiếu id.' };
  const res = await authFetch(`/api/cv/analyses/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: jsonHeaders,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) return { success: false, error: body.error || 'Không xóa được.' };
  return { success: true, ...body };
}

export async function createReport({ targetType, targetId, reason, description }) {
  const res = await authFetch('/api/reports', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ targetType, targetId, reason, description }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) return { success: false, error: body.error || body.message || 'Không gửi báo cáo.' };
  return { success: true, ...body };
}
export { ensureApiBase, getApiBaseUrl, resetApiBaseCache } from '../utils/api';
export { getConfiguredApiBase, resolveConfiguredApiBase } from '../config/apiConfig';

