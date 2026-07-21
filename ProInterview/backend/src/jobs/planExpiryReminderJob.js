import mongoose from "mongoose";
import { User } from "../models/User.js";
import { Notification } from "../models/Notification.js";
import { deliverNotification } from "../services/notificationDeliveryService.js";

const WINDOW_DAYS = 7;
const TICK_MS = 6 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

let intervalHandle = null;

/** Dedupe theo đúng chu kỳ hết hạn — gia hạn đổi planExpiresAt sẽ cho nhắc lại ở chu kỳ mới. */
async function alreadyRemindedForCycle(userId, planExpiresAt) {
  const hit = await Notification.findOne({
    userId,
    type: "plan_expiring",
    "metadata.planExpiresAt": planExpiresAt,
  })
    .select("_id")
    .lean();
  return Boolean(hit);
}

/** Nhắc user còn 7 ngày (hoặc ít hơn) trước khi gói Sinh viên/Chuyên nghiệp hết hạn. */
async function runPlanExpiryReminders() {
  if (mongoose.connection.readyState !== 1) return;

  const now = new Date();
  const windowEnd = new Date(now.getTime() + WINDOW_DAYS * DAY_MS);

  const users = await User.find({
    plan: { $in: ["student", "professional"] },
    planExpiresAt: { $gt: now, $lte: windowEnd },
  })
    .select("_id plan planExpiresAt")
    .lean();

  for (const u of users) {
    if (await alreadyRemindedForCycle(u._id, u.planExpiresAt)) continue;

    const daysLeft = Math.max(
      1,
      Math.ceil((new Date(u.planExpiresAt).getTime() - now.getTime()) / DAY_MS),
    );
    const planLabel = u.plan === "professional" ? "Chuyên nghiệp" : "Sinh viên";

    await deliverNotification(u._id, {
      customerPrefKey: "plan_expiring",
      type: "plan_expiring",
      title: "Gói của bạn sắp hết hạn",
      body: `Gói ${planLabel} sẽ hết hạn trong ${daysLeft} ngày nữa. Gia hạn để tiếp tục nhận ưu đãi.`,
      metadata: { actionUrl: "/pricing", planExpiresAt: u.planExpiresAt },
    });
  }
}

/** Chạy mỗi 6 tiếng khi server đã kết nối MongoDB */
export function startPlanExpiryReminderJob() {
  if (intervalHandle) return;
  const tick = () => {
    runPlanExpiryReminders().catch((e) => console.error("[planExpiryReminderJob]", e?.message || e));
  };
  tick();
  intervalHandle = setInterval(tick, TICK_MS);
}
