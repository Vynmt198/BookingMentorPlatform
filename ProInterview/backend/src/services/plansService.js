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
    return { ok: false, status: 400, error: "plan phải là starter_pro hoặc elite_pro (hoặc starterPro / elitePro)." };
  }

  const months = Math.min(36, Math.max(1, Number(body?.months) || 1));
  const expires = new Date();
  expires.setMonth(expires.getMonth() + months);

  const updates = { plan, planExpiresAt: expires };
  if (plan === "starter_pro") {
    updates["quota.cvAnalysisLimit"]          = 20;
    updates["quota.interviewLimit"]           = 10;
    updates["quota.interviewQuestionsAllowed"] = 5;
  } else if (plan === "elite_pro") {
    updates["quota.cvAnalysisLimit"]          = 999;
    updates["quota.interviewLimit"]           = 999;
    updates["quota.interviewQuestionsAllowed"] = 5;
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
        "quota.interviewLimit": 1,
      },
    },
    { new: true }
  )
    .select("plan planExpiresAt quota")
    .lean();
  if (!u) return { ok: false, status: 404, error: "Không tìm thấy user." };
  return { ok: true, plan: u.plan, planExpiresAt: u.planExpiresAt, quota: u.quota };
}
