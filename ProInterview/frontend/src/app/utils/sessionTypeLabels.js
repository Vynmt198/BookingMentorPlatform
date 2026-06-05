/** Nhãn loại buổi mentor — đồng bộ toàn app mentor/booking. */
const SESSION_TYPE_LABELS = {
  mock_interview: "Phỏng vấn giả lập",
  "mock-interview": "Phỏng vấn giả lập",
  cv_review: "Xem xét CV",
  "cv-review": "Xem xét CV",
  career_consulting: "Tư vấn nghề nghiệp",
  "career-consulting": "Tư vấn nghề nghiệp",
  custom: "Buổi mentor",
};

export function sessionTypeLabel(sessionType, fallback = "Buổi mentor") {
  const raw = String(sessionType || "").trim();
  if (!raw) return fallback;
  if (SESSION_TYPE_LABELS[raw]) return SESSION_TYPE_LABELS[raw];
  const norm = raw.toLowerCase().replace(/-/g, "_");
  return SESSION_TYPE_LABELS[norm] ?? fallback;
}

export function parseMentorNotesSections(notes) {
  const text = String(notes || "");
  const strengths = [];
  const weaknesses = [];
  const mStrong = text.match(/Điểm mạnh:\s*([^\n]+)/i);
  const mWeak = text.match(/Cần cải thiện:\s*([^\n]+)/i);
  if (mStrong?.[1]?.trim()) strengths.push(mStrong[1].trim());
  if (mWeak?.[1]?.trim()) weaknesses.push(mWeak[1].trim());
  const feedback = text
    .replace(/Điểm mạnh:\s*[^\n]+/gi, "")
    .replace(/Cần cải thiện:\s*[^\n]+/gi, "")
    .trim();
  return { strengths, weaknesses, feedback };
}
