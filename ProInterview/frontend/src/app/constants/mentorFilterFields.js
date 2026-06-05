/** Lọc lĩnh vực trên trang danh sách mentor (`Mentors.jsx`). */
export const MENTOR_FILTER_FIELDS = [
  "IT",
  "Marketing",
  "Tài chính",
  "Nhân sự",
  "Quản lý sản phẩm",
  "Thiết kế",
  "Kinh doanh",
  "Vận hành",
];

/**
 * Từ khóa khớp lĩnh vực — mentor có thể lưu skill (React, DevOps) thay vì nhãn "IT".
 */
const MENTOR_FIELD_FILTER_MAP = {
  IT: [
    "it",
    "frontend",
    "backend",
    "fullstack",
    "devops",
    "data engineer",
    "data pipeline",
    "node.js",
    "nodejs",
    "react",
    "typescript",
    "mongodb",
    "system design",
    "kubernetes",
    "aws",
    "ci/cd",
    "sql",
    "spark",
    "postgresql",
    "python",
    "software",
    "engineer",
    "developer",
  ],
  Marketing: ["marketing", "digital marketing", "brand", "growth"],
  "Tài chính": ["tài chính", "finance", "financial", "kế toán", "accounting"],
  "Nhân sự": [
    "nhân sự",
    "hr",
    "human resources",
    "talent",
    "recruitment",
    "interviewing",
    "behavioral",
    "cv review",
  ],
  "Quản lý sản phẩm": [
    "product",
    "product manager",
    "product strategy",
    "quản lý sản phẩm",
    "pm",
    "roadmap",
    "metrics",
  ],
  "Thiết kế": ["thiết kế", "design", "ui", "ux", "figma"],
  "Kinh doanh": ["kinh doanh", "sales", "business development", "b2b", "b2c"],
  "Vận hành": ["vận hành", "operations", "ops", "supply chain"],
};

/** Gom chuỗi lĩnh vực / kỹ năng của mentor để so khớp bộ lọc. */
function mentorFieldBlob(mentor) {
  return [
    mentor.field,
    ...(Array.isArray(mentor.fields) ? mentor.fields : []),
    ...(Array.isArray(mentor.tags) ? mentor.tags : []),
    ...(Array.isArray(mentor.specialties) ? mentor.specialties : []),
    mentor.title,
    mentor.bio,
  ]
    .filter(Boolean)
    .map((s) => String(s).toLowerCase())
    .join(" | ");
}

/** Mentor có thuộc lĩnh vực đã chọn không (không chỉ so sánh chuỗi "IT"). */
export function mentorMatchesFilterField(mentor, selectedField) {
  if (!selectedField) return true;

  const blob = mentorFieldBlob(mentor);
  const aliases = MENTOR_FIELD_FILTER_MAP[selectedField];
  if (!aliases?.length) {
    return blob.includes(String(selectedField).toLowerCase());
  }

  return aliases.some((alias) => blob.includes(alias));
}
