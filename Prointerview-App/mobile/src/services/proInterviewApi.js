/**
 * API client mobile — gọi backend ProInterview (Express), cùng contract với web frontend.
 */
import { apiUrl, ensureApiBase } from '../utils/api';
import { authFetch } from '../utils/mobileAuth';
import { mapApiCourseToCard } from './courseApi';

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
  return {
    id: m.publicId || m._id || m.id,
    name: m.name || m.fullName || 'Mentor',
    role: roleStr || 'Mentor',
    title: roleStr || 'Mentor',
    company: companyStr && companyStr !== '-' && companyStr !== '—' ? companyStr : '',
    rating,
    avatar: m.avatar || m.avatarUrl || '',
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

  // Chỉ tải dữ liệu customer khi role phù hợp
  const role = result.user?.role;
  if (role === 'admin' || role === 'mentor') {
    return result;
  }

  // Các khối hồ sơ độc lập: tải song song để giảm đáng kể thời gian mở trang Cá nhân.
  const endpoints = [
    '/api/bookings',
    '/api/notifications',
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

  const [bookingsData, notificationsData, cvData, enrollmentsData, paymentsData] = payloads;
  if (Array.isArray(bookingsData.bookings)) result.bookings = bookingsData.bookings;
  if (Array.isArray(notificationsData.notifications)) result.notifications = notificationsData.notifications;
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
    return { success: false, error: body.error || `Lỗi lưu CV ${res.status}` };
  }
  return { success: true, ...body };
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
  form.append('resume', {
    uri: file.uri,
    name: file.name || 'cv.pdf',
    type: file.mimeType || 'application/pdf',
  });
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
      error: raw.error || raw.message || `Phân tích CV thất bại (${analyzeRes.status})`,
    };
  }

  const match = raw.match || {};
  const matched = match.matching || match.matched || raw.matchedKeywords || [];
  const missing = match.missing || raw.missingKeywords || [];
  const scores = raw.scores || {};
  const scoreRaw = match.score ?? raw.matchScore ?? raw.overall_score;
  let matchScore = scoreRaw != null && scoreRaw !== '' ? Number(scoreRaw) : NaN;
  if (!Number.isFinite(matchScore) && (matched.length || missing.length)) {
    const total = matched.length + missing.length;
    matchScore = total > 0 ? Math.round((matched.length / total) * 100) : 0;
  }
  if (!Number.isFinite(matchScore)) matchScore = 0;

  const payload = {
    cvFileName: file.name || 'cv.pdf',
    mode: 'field',
    field,
    tier: scores && Object.keys(scores).length ? 'full' : 'basic',
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
      scores: {
        clarity: Number(scores.clarity) || 0,
        structure: Number(scores.structure) || 0,
        relevance: Number(scores.relevance) || 0,
        credibility: Number(scores.credibility) || 0,
      },
      summary: raw.summary || raw.feedback || '',
      suggestions: raw.suggestions || [],
    },
  };

  onProgress(88);
  const saved = await saveCvAnalysis(payload);
  onProgress(100);
  if (!saved.success) {
    return { success: false, error: saved.error || 'Không lưu được kết quả.', analysis: payload.result };
  }
  return { success: true, analysis: payload.result, saved };
}

export async function markAllNotificationsRead() {
  const res = await authFetch('/api/notifications/read-all', {
    method: 'POST',
    headers: jsonHeaders,
  });
  return res.ok;
}

export { ensureApiBase, getApiBaseUrl } from '../utils/api';
