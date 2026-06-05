import {
  parseWorkHistory,
  hasWorkHistoryContent,
  formatWorkEntryPeriod,
  inferStartMonthFromExperienceYears,
} from "./profileWorkHistory";

const TZ_LOCATION = {
  "Asia/Ho_Chi_Minh": "TP. Hồ Chí Minh",
  "Asia/Hanoi": "Hà Nội",
};

const DAY_LABELS = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];

export function mentorLocationLabel(timezone) {
  const tz = String(timezone || "").trim();
  return TZ_LOCATION[tz] || "Việt Nam";
}

export function mentorDisplayTitle(mentor) {
  const title = (mentor?.title || "").trim();
  if (title && title.toLowerCase() !== "mentor") return title;
  if (mentor?.field) return mentor.field;
  return "Mentor ProInterview";
}

export function mentorFieldTags(mentor) {
  const raw = [
    ...(Array.isArray(mentor?.fields) ? mentor.fields : []),
    mentor?.field,
    ...(Array.isArray(mentor?.tags) ? mentor.tags : []),
    ...(Array.isArray(mentor?.specialties) ? mentor.specialties : []),
  ]
    .map((s) => String(s || "").trim())
    .filter(Boolean);
  return [...new Set(raw)].slice(0, 6);
}

export function buildWorkEntriesForDisplay(mentor) {
  const parsed = parseWorkHistory(mentor?.profileWorkExperience);
  if (hasWorkHistoryContent(parsed)) {
    return parsed.filter((e) => e.role || e.company || e.note);
  }

  const companies = Array.isArray(mentor?.companies) ? mentor.companies : [];
  const company = String(mentor?.company || "").trim();
  const list = companies.length ? companies : company && company !== "—" ? [company] : [];

  if (list.length) {
    return list.map((c, i) => ({
      role: i === 0 ? mentorDisplayTitle(mentor) : mentorDisplayTitle(mentor),
      company: c,
      isCurrent: i === 0,
      note: i === 0 ? String(mentor?.bio || "").trim() : "",
      startMonth: i === 0 ? inferStartMonthFromExperienceYears(mentor?.experience) : "",
      endMonth: "",
    }));
  }

  const years = Number(mentor?.experience) || 0;
  if (years > 0 || company) {
    return [
      {
        role: mentorDisplayTitle(mentor),
        company: company || "—",
        isCurrent: true,
        note: String(mentor?.bio || "").trim(),
        startMonth: inferStartMonthFromExperienceYears(years),
        endMonth: "",
      },
    ];
  }

  return [];
}

export function formatRecurringScheduleRows(schedule) {
  if (!Array.isArray(schedule) || !schedule.length) return [];
  return schedule
    .filter((row) => Array.isArray(row?.slots) && row.slots.length > 0)
    .sort((a, b) => Number(a.dayOfWeek) - Number(b.dayOfWeek))
    .map((row) => ({
      day: DAY_LABELS[row.dayOfWeek] ?? `Ngày ${row.dayOfWeek}`,
      slots: row.slots.join(", "),
    }));
}

export function buildReviewRatingSummary(reviews) {
  const list = Array.isArray(reviews) ? reviews : [];
  const buckets = [
    { stars: 5, label: "Tuyệt vời", count: 0 },
    { stars: 4, label: "Hài lòng", count: 0 },
    { stars: 3, label: "Bình thường", count: 0 },
    { stars: 2, label: "Không hài lòng", count: 0 },
    { stars: 1, label: "Tệ", count: 0 },
  ];
  for (const r of list) {
    const star = Math.min(5, Math.max(1, Math.round(Number(r.rating) || 0)));
    const b = buckets.find((x) => x.stars === star);
    if (b) b.count += 1;
  }
  const total = list.length;
  const avg =
    total > 0
      ? list.reduce((s, r) => s + (Number(r.rating) || 0), 0) / total
      : 0;
  return { buckets, total, average: avg };
}

export function workEntryPeriodLabel(entry) {
  const period = formatWorkEntryPeriod(entry);
  if (period) return period;
  if (entry?.isCurrent) return "Hiện tại";
  return "";
}

export { formatWorkEntryPeriod };
