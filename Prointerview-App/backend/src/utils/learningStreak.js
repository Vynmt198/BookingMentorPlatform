const TZ = "Asia/Ho_Chi_Minh";
export const LEARNING_STREAK_MILESTONES = [7, 15, 30, 60, 100];

export function toVnDayKey(date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(date);
}

function parseDayKey(key) {
  const [y, m, d] = String(key).split("-").map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1));
}

export function addDaysToKey(key, delta) {
  const dt = parseDayKey(key);
  dt.setUTCDate(dt.getUTCDate() + delta);
  return toVnDayKey(dt);
}

/** Chuỗi ngày học liên tiếp (VN), tính từ hôm nay hoặc hôm qua nếu chưa hoạt động hôm nay. */
export function computeLearningStreak(activeDayKeys) {
  const empty = {
    days: 0,
    nextMilestone: LEARNING_STREAK_MILESTONES[0],
    daysUntilNextMilestone: LEARNING_STREAK_MILESTONES[0],
    progressPercent: 0,
  };
  if (!activeDayKeys?.size) return empty;

  const today = toVnDayKey(new Date());
  const yesterday = addDaysToKey(today, -1);
  let cursor = null;
  if (activeDayKeys.has(today)) cursor = today;
  else if (activeDayKeys.has(yesterday)) cursor = yesterday;
  else return empty;

  let days = 0;
  let walk = cursor;
  while (activeDayKeys.has(walk)) {
    days += 1;
    walk = addDaysToKey(walk, -1);
  }

  const nextMilestone =
    LEARNING_STREAK_MILESTONES.find((m) => m > days) ??
    LEARNING_STREAK_MILESTONES[LEARNING_STREAK_MILESTONES.length - 1];
  const daysUntilNextMilestone = Math.max(0, nextMilestone - days);
  const progressPercent =
    nextMilestone > 0 ? Math.min(100, Math.round((days / nextMilestone) * 100)) : 0;

  return { days, nextMilestone, daysUntilNextMilestone, progressPercent };
}
