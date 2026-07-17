import { authFetch } from '../utils/mobileAuth';

const jsonHeaders = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
};

export async function fetchMyMentorProfile() {
  try {
    const res = await authFetch('/api/mentors/me', { method: 'GET', headers: jsonHeaders });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, mentor: null, error: body.error };
    return { success: true, mentor: body.mentor || null };
  } catch {
    return { success: false, mentor: null, error: 'Lỗi kết nối.' };
  }
}

export async function applyAsMentor(payload) {
  try {
    const res = await authFetch('/api/mentors/apply', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify(payload || {}),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, error: body.error || 'Gửi yêu cầu thất bại.' };
    return { success: true, mentor: body.mentor || null, message: body.message };
  } catch {
    return { success: false, error: 'Lỗi kết nối.' };
  }
}

export async function updateMyMentorProfile(payload) {
  try {
    const res = await authFetch('/api/mentors/me', {
      method: 'PATCH',
      headers: jsonHeaders,
      body: JSON.stringify(payload || {}),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, error: body.error || 'Không cập nhật được hồ sơ mentor.' };
    return { success: true, mentor: body.mentor || null };
  } catch {
    return { success: false, error: 'Lỗi kết nối.' };
  }
}

export function buildMentorUpdatePayload(form) {
  const splitCsv = (s) =>
    String(s ?? '')
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
  const rate = Number(String(form.targetRate || '').replace(/\D/g, ''));
  const years = Number(form.experience);
  return {
    title: String(form.position || '').trim(),
    company: String(form.currentCompany || '').trim(),
    bio: String(form.bio || '').trim(),
    experienceYears: Number.isFinite(years) && years >= 0 ? years : 0,
    specialties: splitCsv(form.skillsCerts),
    profileWorkExperience: String(form.profileWorkExperience || '').trim(),
    profileEducation: String(form.profileEducation || form.school || '').trim(),
    profileExtracurricular: String(form.profileExtracurricular || '').trim(),
    profileAwards: String(form.profileAwards || '').trim(),
    pricePerHour: Number.isFinite(rate) && rate > 0 ? rate : undefined,
    responseTime: '< 24 giờ',
    timezone: 'Asia/Ho_Chi_Minh',
  };
}

export function buildMentorApplyPayload(form) {
  const splitCsv = (s) =>
    String(s ?? '')
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);

  const rate = Number(String(form.targetRate || '').replace(/\D/g, ''));
  const years = Number(form.experience) || 0;

  return {
    title: String(form.position || '').trim(),
    company: String(form.currentCompany || '').trim(),
    bio: String(form.bio || '').trim(),
    yearsOfExperience: years,
    targetRate: Number.isFinite(rate) && rate > 0 ? rate : undefined,
    tags: splitCsv(form.skillsCerts),
    workExperience: String(form.profileWorkExperience || '').trim(),
    companies: splitCsv(form.currentCompany),
    profileEducation: String(form.profileEducation || form.school || '').trim(),
    profileExtracurricular: String(form.profileExtracurricular || '').trim(),
    profileAwards: String(form.profileAwards || '').trim(),
    responseTime: '< 24 giờ',
    timezone: 'Asia/Ho_Chi_Minh',
  };
}

export function buildUserProfilePayload(form) {
  const splitCsv = (s) =>
    String(s ?? '')
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);

  const years = Number(form.experience) || 0;

  return {
    name: String(form.name || '').trim(),
    email: String(form.email || '').trim(),
    phone: String(form.phone || '').trim(),
    bio: String(form.bio || '').trim(),
    position: String(form.position || '').trim(),
    currentCompany: String(form.currentCompany || '').trim(),
    experience: Number.isFinite(years) && years >= 0 ? years : 0,
    school: String(form.profileEducation || form.school || '').trim(),
    profileWorkExperience: String(form.profileWorkExperience || '').trim(),
    profileEducation: String(form.profileEducation || '').trim(),
    profileExtracurricular: String(form.profileExtracurricular || '').trim(),
    profileAwards: String(form.profileAwards || '').trim(),
    expertise: splitCsv(form.skillsCerts),
  };
}
