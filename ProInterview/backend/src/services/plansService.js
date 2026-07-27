import mongoose from "mongoose";
import { User } from "../models/User.js";
import { normalizePlanKey } from "../utils/planKeys.js";

const MONGO_ERR = "MongoDB chưa kết nối. Kiểm tra MONGO_URI trong .env.";

function isMongoReady() {
  return mongoose.connection.readyState === 1;
}

export async function getCurrentPlan(userId) {
  if (!isMongoReady()) return { ok: false, status: 503, error: MONGO_ERR };
  if (!mongoose.isValidObjectId(userId)) return { ok: false, status: 401, error: "Phiên không hợp lệ." };

  const u = await User.findById(userId).select("plan planExpiresAt quota name email").lean();
  if (!u) return { ok: false, status: 404, error: "Không tìm thấy user." };

  return {
    ok: true,
    plan: u.plan,
    planExpiresAt: u.planExpiresAt,
    quota: u.quota ?? {},
  };
}

export async function activatePlan(userId, body) {
  if (!isMongoReady()) return { ok: false, status: 503, error: MONGO_ERR };
  const plan = normalizePlanKey(body?.plan ?? body?.planKey);
  if (!plan || plan === "free") {
    return { ok: false, status: 400, error: "plan phải là student hoặc professional." };
  }

  const months = Math.min(36, Math.max(1, Number(body?.months) || 1));

  // Còn hạn gói cũ (kể cả khác tier) thì cộng dồn từ đó, không mất thời gian đã trả tiền.
  const current = await User.findById(userId).select("planExpiresAt").lean();
  const now = new Date();
  const currentExpiresAt = current?.planExpiresAt ? new Date(current.planExpiresAt) : null;
  const base = currentExpiresAt && currentExpiresAt.getTime() > now.getTime() ? currentExpiresAt : now;
  const expires = new Date(base);
  expires.setMonth(expires.getMonth() + months);

  const updates = { plan, planExpiresAt: expires };
  if (plan === "student") {
    updates["quota.cvAnalysisLimit"]    = 50;
    updates["quota.mentorSessionLimit"] = 0;
  } else if (plan === "professional") {
    updates["quota.cvAnalysisLimit"]    = 999; // không giới hạn
    updates["quota.mentorSessionLimit"] = 0;
  }

  const u = await User.findByIdAndUpdate(userId, { $set: updates }, { new: true }).select("plan planExpiresAt quota").lean();
  if (!u) return { ok: false, status: 404, error: "Không tìm thấy user." };
  return { ok: true, plan: u.plan, planExpiresAt: u.planExpiresAt, quota: u.quota };
}

export async function cancelPlan(userId) {
  if (!isMongoReady()) return { ok: false, status: 503, error: MONGO_ERR };

  const u = await User.findByIdAndUpdate(
    userId,
    {
      $set: {
        plan: "free",
        planExpiresAt: null,
        "quota.cvAnalysisLimit": 3,
        "quota.mentorSessionLimit": 0,
      },
    },
    { new: true }
  )
    .select("plan planExpiresAt quota")
    .lean();
  if (!u) return { ok: false, status: 404, error: "Không tìm thấy user." };
  return { ok: true, plan: u.plan, planExpiresAt: u.planExpiresAt, quota: u.quota };
}
