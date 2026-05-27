/**
 * Đồng bộ backend topicMap (coursesController) + form mentor (MentorCourseEdit).
 * topics[0] lưu DB: Technical | Behavioral | Other
 */
export const COURSE_TOPICS = [
  { value: "Technical", label: "Phỏng vấn kỹ thuật" },
  { value: "Behavioral", label: "Phỏng vấn hành vi" },
  { value: "Other", label: "Phát triển sự nghiệp" },
];

const TOPIC_LABEL_BY_VALUE = Object.fromEntries(
  COURSE_TOPICS.map(({ value, label }) => [value, label]),
);

/** Nhãn hiển thị cho topics cũ / seed (Resume, …) */
const LEGACY_TOPIC_LABELS = {
  Resume: "Viết CV / Hồ sơ",
  "Kỹ năng khác": "Kỹ năng khác",
};

export function getCourseTopicLabel(topicValue) {
  if (!topicValue) return "Khác";
  return TOPIC_LABEL_BY_VALUE[topicValue] || LEGACY_TOPIC_LABELS[topicValue] || topicValue;
}

/** Danh sách lọc: luôn 3 danh mục chuẩn + topic phát sinh từ dữ liệu thật */
export function buildCourseFilterCategories(coursesFromApi = []) {
  const known = new Set(COURSE_TOPICS.map((t) => t.value));
  const extras = new Set();

  for (const c of coursesFromApi) {
    const topic = c.topics?.[0];
    if (topic && !known.has(topic)) extras.add(topic);
  }

  const extraSorted = Array.from(extras).sort((a, b) =>
    getCourseTopicLabel(a).localeCompare(getCourseTopicLabel(b), "vi"),
  );

  return [
    ...COURSE_TOPICS,
    ...extraSorted.map((value) => ({ value, label: getCourseTopicLabel(value) })),
  ];
}

export function courseMatchesTopic(courseTopic, selectedCategory) {
  if (!selectedCategory) return true;
  return (courseTopic || "Kỹ năng khác") === selectedCategory;
}
