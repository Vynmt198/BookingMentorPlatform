import mongoose from "mongoose";
import { User } from "../models/User.js";
import { Notification } from "../models/Notification.js";
import { deliverNotification } from "../services/notificationDeliveryService.js";
import { collectLearningActiveDays } from "../services/dashboardStatsService.js";
import { computeLearningStreak, toVnDayKey } from "../utils/learningStreak.js";

const DEDUP_HOURS = 20;
const TICK_MS = 6 * 60 * 60 * 1000;

let intervalHandle = null;

async function alreadyReminded(userId) {
  const since = new Date(Date.now() - DEDUP_HOURS * 60 * 60 * 1000);
  const hit = await Notification.findOne({
    userId,
    type: "streak_reminder",
    createdAt: { $gte: since },
  })
    .select("_id")
    .lean();
  return Boolean(hit);
}

/** Nhắc học viên đang giữ chuỗi luyện tập nhưng chưa hoạt động gì trong ngày hôm nay (VN giờ). */
async function runStreakReminders() {
  if (mongoose.connection.readyState !== 1) return;

  const users = await User.find({ role: "customer" }).select("_id").lean();
  const today = toVnDayKey(new Date());

  for (const u of users) {
    const uid = String(u._id);
    const activeDayKeys = await collectLearningActiveDays(uid);
    if (activeDayKeys.has(today)) continue;

    const streak = computeLearningStreak(activeDayKeys);
    if (streak.days <= 0) continue;

    if (await alreadyReminded(uid)) continue;

    await deliverNotification(uid, {
      customerPrefKey: "streak_reminder",
      type: "streak_reminder",
      title: "Đừng để mất chuỗi luyện tập!",
      body: `Bạn đang giữ chuỗi ${streak.days} ngày luyện tập liên tiếp. Luyện phỏng vấn AI hoặc phân tích CV hôm nay để không bị đứt chuỗi.`,
      metadata: { actionUrl: "/cv-analysis" },
    });
  }
}

/** Chạy mỗi 6 tiếng khi server đã kết nối MongoDB */
export function startStreakReminderJob() {
  if (intervalHandle) return;
  const tick = () => {
    runStreakReminders().catch((e) => console.error("[streakReminderJob]", e?.message || e));
  };
  tick();
  intervalHandle = setInterval(tick, TICK_MS);
}
