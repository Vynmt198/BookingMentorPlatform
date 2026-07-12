import mongoose from "mongoose";
import { User } from "../models/User.js";

/** Coi là đang online nếu có hoạt động trong cửa sổ này (ms). */
export const PRESENCE_ONLINE_MS = 3 * 60 * 1000;

const lastTouchAt = new Map();

export function isUserOnline(lastSeenAt) {
  if (!lastSeenAt) return false;
  const t = new Date(lastSeenAt).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t <= PRESENCE_ONLINE_MS;
}

export function presenceMetaForUser(user) {
  const lastSeenAt = user?.lastSeenAt ?? null;
  return {
    lastSeenAt,
    isOnline: isUserOnline(lastSeenAt),
  };
}

/**
 * Ghi nhận user đang dùng nền tảng. Throttle theo userId để tránh ghi DB quá dày.
 * @param {string} userId
 * @param {{ minIntervalMs?: number, force?: boolean }} [options]
 */
export async function touchUserPresence(userId, options = {}) {
  const uid = String(userId || "").trim();
  if (!uid || !mongoose.isValidObjectId(uid)) return null;

  const minIntervalMs = options.minIntervalMs ?? 45_000;
  const now = Date.now();
  const prev = lastTouchAt.get(uid) ?? 0;
  if (!options.force && now - prev < minIntervalMs) {
    return null;
  }
  lastTouchAt.set(uid, now);

  const at = new Date();
  await User.updateOne({ _id: uid }, { $set: { lastSeenAt: at } }).catch((err) => {
    console.error("[touchUserPresence]", err?.message || err);
  });
  return at;
}
