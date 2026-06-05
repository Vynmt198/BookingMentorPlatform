import mongoose from "mongoose";
import { Notification } from "../models/Notification.js";
import { User } from "../models/User.js";
import { mergeNotificationPrefs } from "../constants/notificationPrefs.js";

function isMongoReady() {
  return mongoose.connection.readyState === 1;
}

/**
 * Tạo thông báo in-app nếu user bật loại tương ứng trong Cài đặt.
 * @param {string|import('mongoose').Types.ObjectId} userId
 * @param {{ mentorPrefKey?: string, customerPrefKey?: string, type: string, title: string, body: string, metadata?: object }} payload
 */
export async function deliverNotification(userId, payload) {
  if (!isMongoReady()) return { delivered: false, reason: "mongo_unavailable" };
  const uid = String(userId ?? "").trim();
  if (!uid || !mongoose.isValidObjectId(uid)) return { delivered: false, reason: "invalid_user" };

  const user = await User.findById(uid).select("role settings.notificationPrefs").lean();
  if (!user) return { delivered: false, reason: "user_not_found" };

  const prefs = mergeNotificationPrefs(user.role, user.settings?.notificationPrefs);
  const prefKey =
    user.role === "mentor" ? payload.mentorPrefKey : payload.customerPrefKey;
  if (prefKey && prefs[prefKey] === false) {
    return { delivered: false, skipped: true, prefKey };
  }

  try {
    await Notification.create({
      userId: uid,
      type: payload.type || "system",
      title: payload.title || "Thông báo",
      body: payload.body || "",
      metadata: payload.metadata || {},
    });
    return { delivered: true };
  } catch (e) {
    console.error("[deliverNotification]", e?.message || e);
    return { delivered: false, reason: "create_failed" };
  }
}
