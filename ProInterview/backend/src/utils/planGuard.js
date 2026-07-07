import { User } from "../models/User.js";

const FREE_QUOTA = {
  plan: "free",
  planExpiresAt: null,
  "quota.cvAnalysisLimit": 2,
  "quota.mentorSessionLimit": 0,
  "quota.resetAt": null,
};

const PLAN_QUOTA_MAP = {
  student: {
    cvAnalysisLimit: 999,
    mentorSessionLimit: 1,
  },
  professional: {
    cvAnalysisLimit: 999,
    mentorSessionLimit: 4,
  },
  premium: {
    cvAnalysisLimit: 999,
    mentorSessionLimit: 999,
  },
};

function nextMonthlyReset(fromDate) {
  const base = fromDate ? new Date(fromDate) : new Date();
  const next = new Date(base);
  const now = new Date();
  while (next <= now) next.setMonth(next.getMonth() + 1);
  return next;
}

export async function enforceExpiry(user) {
  const now = new Date();
  const plan = user?.plan || "free";
  const isFree = plan === "free";
  const isExpired = !isFree && user?.planExpiresAt && new Date(user.planExpiresAt) < now;

  if (isFree) {
    const freeLimitMismatch =
      (user?.quota?.cvAnalysisLimit ?? 2) !== 2 ||
      (user?.quota?.mentorSessionLimit ?? 0) !== 0;

    if (!freeLimitMismatch) return user;

    const updated = await User.findOneAndUpdate(
      { _id: user._id },
      { $set: FREE_QUOTA },
      { new: true },
    ).lean();
    return updated ?? user;
  }

  if (isExpired) {
    const updated = await User.findOneAndUpdate(
      { _id: user._id, plan: { $ne: "free" }, planExpiresAt: { $lt: now } },
      { $set: FREE_QUOTA },
      { new: true },
    ).lean();
    return updated ?? user;
  }

  const expected = PLAN_QUOTA_MAP[plan];
  if (!expected) return user;

  const limitMismatch =
    (user?.quota?.cvAnalysisLimit ?? 0) !== expected.cvAnalysisLimit ||
    (user?.quota?.mentorSessionLimit ?? 0) !== expected.mentorSessionLimit;
  const resetDue = Boolean(user?.quota?.resetAt) && new Date(user.quota.resetAt) < now;

  if (!limitMismatch && !resetDue) return user;

  const setFields = {};
  if (limitMismatch) {
    setFields["quota.cvAnalysisLimit"] = expected.cvAnalysisLimit;
    setFields["quota.mentorSessionLimit"] = expected.mentorSessionLimit;
  }
  if (resetDue) {
    setFields["quota.cvAnalysisUsed"] = 0;
    setFields["quota.mentorSessionUsed"] = 0;
    setFields["quota.resetAt"] = nextMonthlyReset(user.quota?.resetAt);
  }

  const updated = await User.findOneAndUpdate(
    { _id: user._id },
    { $set: setFields },
    { new: true },
  ).lean();
  return updated ?? user;
}

export async function requireCvAnalysisQuota(req, res, next) {
  try {
    const user = await User.findById(req.userId).select("quota plan planExpiresAt");
    if (!user) return res.status(404).json({ success: false, error: "Người dùng không tồn tại" });

    const effective = await enforceExpiry(user);
    const used = effective?.quota?.cvAnalysisUsed ?? 0;
    const limit = effective?.quota?.cvAnalysisLimit ?? 2;

    if (used >= limit) {
      const message =
        effective?.plan === "premium"
          ? `Bạn đã dùng hết lượt phân tích CV hiện có.${
              effective?.quota?.resetAt
                ? ` Quota sẽ làm mới vào ${new Date(effective.quota.resetAt).toLocaleDateString("vi-VN")}.`
                : ""
            }`
          : "Bạn đã hết lượt phân tích CV. Vui lòng nâng cấp gói.";
      return res.status(403).json({ success: false, error: "quota_exceeded", message });
    }

    next();
  } catch (err) {
    next(err);
  }
}
