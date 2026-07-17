const TZ_LOCATION = {
  'Asia/Ho_Chi_Minh': 'TP. Hồ Chí Minh',
  'Asia/Hanoi': 'Hà Nội',
};

export function mentorLocationLabel(timezone) {
  const tz = String(timezone || '').trim();
  return TZ_LOCATION[tz] || 'Việt Nam';
}

export function mentorDisplayTitle(mentor) {
  const title = String(mentor?.role || mentor?.title || '').trim();
  if (title && title.toLowerCase() !== 'mentor') return title;
  if (mentor?.field) return mentor.field;
  return 'Mentor ProInterview';
}

export function mentorFieldTags(mentor) {
  const raw = [
    ...(Array.isArray(mentor?.fields) ? mentor.fields : []),
    mentor?.field,
    mentor?.category,
    ...(Array.isArray(mentor?.tags) ? mentor.tags : []),
    ...(Array.isArray(mentor?.specialties) ? mentor.specialties : []),
  ]
    .map((s) => String(s || '').trim())
    .filter(Boolean);
  return [...new Set(raw)].slice(0, 6);
}

export function mentorIsVerified(mentor) {
  return mentor?.isVerified === true;
}

export function resolveMentorSessionOffer(mentor) {
  const hourly = Number(mentor?.price) || 0;
  const fromApi = Array.isArray(mentor?.sessionTypes) ? mentor.sessionTypes : [];
  const mock = fromApi.find((session) => session?.type === 'mock_interview');
  return {
    price: mock?.price ?? hourly,
    minutes: mock?.durationMinutes ?? 60,
  };
}

export function mergeMentorProfile(listMentor, detailMentor) {
  if (!detailMentor) return listMentor || null;
  if (!listMentor) return detailMentor;
  return {
    ...listMentor,
    ...detailMentor,
    id: detailMentor.id || listMentor.id,
    name: detailMentor.name || listMentor.name,
    avatar: detailMentor.avatar || listMentor.avatar,
    rating: detailMentor.rating ?? listMentor.rating,
    reviews: detailMentor.reviews ?? listMentor.reviews,
    price: detailMentor.price ?? listMentor.price,
  };
}
