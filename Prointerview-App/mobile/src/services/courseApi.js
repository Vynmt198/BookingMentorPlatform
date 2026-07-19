import { apiUrl, ensureApiBase } from '../utils/api';
import { getCourseDisplayTitle } from '../utils/courseDisplay';
import { resolveMediaUrl, mentorAvatarFallback, DEFAULT_COURSE_THUMB } from '../utils/mediaUrl';

const jsonHeaders = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
};

const LEVEL_LABELS = {
  Beginner: 'Người mới',
  Intermediate: 'Trung cấp',
  Advanced: 'Nâng cao',
};

function normalizeLevel(raw) {
  const value = String(raw || '').toLowerCase();
  if (value === 'intermediate') return 'Intermediate';
  if (value === 'advanced') return 'Advanced';
  if (value === 'beginner') return 'Beginner';
  return raw ? String(raw) : '';
}

function normalizeStats(stats) {
  const rating = stats?.averageRating ?? stats?.rating ?? null;
  const n = rating != null ? Number(rating) : null;
  return {
    rating: n != null && !Number.isNaN(n) && n > 0 ? n : null,
    reviewsCount: Number(stats?.reviewsCount) || 0,
  };
}

function resolveCoursePrice(c) {
  const price = Number(c.price) || 0;
  const discount = Number(c.discountPrice) || 0;
  if (discount > 0 && discount < price) return discount;
  if (c.isFree === true || price <= 0) return 0;
  return price;
}

function mapCategory(c) {
  const topic = c.topics?.[0];
  if (topic) return topic;
  if (Array.isArray(c.tags) && c.tags[0]) return String(c.tags[0]);
  return '';
}

/** Map document khóa học → shape card UI (giống web mapApiCourseToCard). */
export function mapApiCourseToCard(c) {
  const stats = normalizeStats(c?.stats);
  const priceNum = resolveCoursePrice(c);
  const lessons = c.totalLessons || c.lessonsCount;
  const durationMinutes = Number(c.totalDurationMinutes) || 0;
  const id = String(c._id || c.id || '').trim();
  const thumb = resolveMediaUrl(c.thumbnail) || DEFAULT_COURSE_THUMB;
  const level = normalizeLevel(c.level);

  return {
    id,
    title: getCourseDisplayTitle(c.title || ''),
    description: c.description || '',
    thumbnail: thumb,
    image: thumb,
    category: mapCategory(c),
    level,
    levelLabel: LEVEL_LABELS[level] || level || '',
    mentorName: c.mentorId?.userId?.name || '',
    mentorAvatar: resolveMediaUrl(c.mentorId?.userId?.avatar) || '',
    mentorTitle: c.mentorId?.userId?.desiredPosition || '',
    rating: stats.rating,
    reviewsCount: stats.reviewsCount,
    studentsCount: Math.max(0, Number(c.stats?.enrollmentCount) || 0),
    durationMinutes,
    duration:
      durationMinutes > 0
        ? `${Math.floor(durationMinutes / 60)}h${durationMinutes % 60 ? ` ${durationMinutes % 60}m` : ''}`
        : lessons
          ? `${lessons} bài học`
          : '',
    priceNum,
    isFree: priceNum <= 0,
    price: priceNum > 0 ? `${priceNum.toLocaleString('vi-VN')}đ` : 'Miễn phí',
    tags: c.tags || [],
  };
}

/** Map document khóa học → shape chi tiết (giống web CourseDetail mapApiCourse). */
export function mapApiCourseDetail(c) {
  const stats = normalizeStats(c?.stats);
  const modules = (c.modules || []).map((mod, idx) => ({
    id: mod._id || `mod-${idx}`,
    title: mod.title || `Phần ${idx + 1}`,
    lessons: (mod.lessons || []).map((lesson) => ({
      id: lesson._id,
      title: lesson.title,
      type: lesson.type || 'video',
      duration: lesson.durationMinutes || 0,
      isPreview: !!lesson.isFree,
      videoUrl: lesson.videoUrl || '',
    })),
  }));

  let previewVideoUrl = '';
  for (const mod of c.modules || []) {
    for (const lesson of mod.lessons || []) {
      if (lesson.isFree && lesson.videoUrl) {
        previewVideoUrl = lesson.videoUrl;
        break;
      }
    }
    if (previewVideoUrl) break;
  }

  const price = Number(c.price) || 0;
  const discountPrice = Number(c.discountPrice) || 0;

  return {
    id: c._id,
    title: getCourseDisplayTitle(c.title || ''),
    description: c.description || '',
    thumbnail: resolveMediaUrl(c.thumbnail) || DEFAULT_COURSE_THUMB,
    category: c.topics?.[0] || mapCategory(c),
    mentorId: c.mentorId?._id,
    mentorUserId: c.mentorId?.userId?._id || '',
    mentorName: c.mentorId?.userId?.name || '',
    mentorAvatar:
      resolveMediaUrl(c.mentorId?.userId?.avatar) ||
      mentorAvatarFallback(c.mentorId?.userId?.name || 'Mentor'),
    mentorTitle: c.mentorId?.userId?.desiredPosition || '',
    mentorCompany: c.mentorId?.userId?.currentCompany || '',
    rating: stats.rating,
    reviewsCount: stats.reviewsCount,
    studentsCount: c.stats?.enrollmentCount || 0,
    duration: Number(c.totalDurationMinutes) || 0,
    lessonsCount: c.totalLessons || 0,
    modulesCount: modules.length,
    price,
    discountPrice,
    priceNum: resolveCoursePrice(c),
    isFree: resolveCoursePrice(c) <= 0,
    learningOutcomes: c.whatYoullLearn?.length ? c.whatYoullLearn : [],
    requirements: c.requirements || [],
    modules,
    previewVideoUrl,
    certificateEnabled: c.settings?.certificateEnabled !== false,
  };
}

export function formatCoursePrice(price) {
  const num = Number(price) || 0;
  if (num <= 0) return 'Miễn phí';
  return `${num.toLocaleString('vi-VN')}đ`;
}

export function formatCourseDuration(minutes) {
  const total = Number(minutes) || 0;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ''}` : `${m}m`;
}

export async function fetchCourseById(id) {
  await ensureApiBase();
  try {
    const res = await fetch(apiUrl(`/api/courses/${encodeURIComponent(id)}`), {
      method: 'GET',
      headers: jsonHeaders,
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, error: body.error || `Lỗi ${res.status}` };
    return { success: true, course: mapApiCourseDetail(body.course) };
  } catch {
    return { success: false, error: 'Không kết nối được backend.' };
  }
}

export async function fetchReviewsForCourse(courseId) {
  await ensureApiBase();
  try {
    const q = new URLSearchParams({ targetType: 'course', targetId: String(courseId) });
    const res = await fetch(apiUrl(`/api/reviews?${q}`), {
      method: 'GET',
      headers: jsonHeaders,
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, reviews: [], error: body.error };
    return { success: true, reviews: body.reviews || [] };
  } catch {
    return { success: false, reviews: [] };
  }
}
