import { User } from "../models/User.js";

const FREE_QUOTA = {
  plan: "free",
  planExpiresAt: null,
  "quota.cvAnalysisLimit": 3,
  "quota.mentorSessionLimit": 0,
  "quota.resetAt": null,
};

const PLAN_QUOTA_MAP = {
  student: {
    cvAnalysisLimit: 10,
    mentorSessionLimit: 0,
  },
  professional: {
    cvAnalysisLimit: 30,
    mentorSessionLimit: 0,
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
      (user?.quota?.cvAnalysisLimit ?? 3) !== 3 ||
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

/**
 * Buổi mentor bao gồm trong gói (student=1, professional=4/tháng) — claim atomically.
 * Trả về `claimed=true` nếu buổi này được gói trả (không cần thanh toán); `plan` là gói đã refresh
 * (hết hạn/reset tháng) — dùng để tính thêm ưu đãi khác (vd. giảm giá buổi phát sinh ngoài quota).
 */
export async function claimMentorSessionQuota(userId) {
  const user = await User.findById(userId).select("plan planExpiresAt quota");
  if (!user) return { claimed: false, plan: "free" };
  const effective = await enforceExpiry(user);
  const plan = effective?.plan || "free";
  const limit = effective?.quota?.mentorSessionLimit ?? 0;
  const used = effective?.quota?.mentorSessionUsed ?? 0;
  if (limit <= 0 || used >= limit) return { claimed: false, plan };

  const claimed = await User.findOneAndUpdate(
    { _id: userId, $expr: { $lt: ["$quota.mentorSessionUsed", "$quota.mentorSessionLimit"] } },
    { $inc: { "quota.mentorSessionUsed": 1 } },
  ).select("_id");
  return { claimed: Boolean(claimed), plan };
}

/** Hoàn lại 1 buổi mentor vào quota gói (hủy sớm, đủ điều kiện hoàn 100% theo chính sách hủy). */
export async function releaseMentorSessionQuota(userId) {
  await User.findOneAndUpdate(
    { _id: userId, "quota.mentorSessionUsed": { $gt: 0 } },
    { $inc: { "quota.mentorSessionUsed": -1 } },
  );
}

/** Ưu đãi % theo gói — dùng chung cho đặt lịch mentor và mua khóa học (tự trả tiền, không còn "bao gồm miễn phí"). */
const MENTOR_PLAN_DISCOUNT_PERCENT = { free: 0, student: 5, professional: 10 };

/**
 * % giảm giá khi đặt buổi mentor theo gói hiện tại của user (tự trả tiền qua chuyển khoản như bình thường).
 * free: 0%, student: 5%, professional: 10%. Hết hạn gói → coi như free (0%).
 */
export async function resolveMentorBookingDiscountForUser(userId) {
  if (!userId) return { discountPercent: 0 };
  const user = await User.findById(userId).select("plan planExpiresAt quota").lean();
  if (!user) return { discountPercent: 0 };
  const effective = await enforceExpiry(user);
  const plan = effective?.plan || "free";
  return { discountPercent: MENTOR_PLAN_DISCOUNT_PERCENT[plan] ?? 0 };
}

/**
 * Giá khóa học thực tế theo gói của user — cùng mức ưu đãi với đặt lịch mentor.
 * - student (còn hạn): giảm 5%.
 * - professional (còn hạn): giảm 10%.
 * - free / hết hạn: giữ nguyên giá gốc.
 * `price` gốc vẫn được giữ để ghi nhận thu nhập mentor / thống kê doanh thu khóa học.
 */
export async function resolveCourseAccessForUser(userId, coursePrice) {
  const price = Math.round(Number(coursePrice) || 0);
  const fallback = { price, included: false, discountPercent: 0, effectivePrice: price };
  if (!userId) return fallback;

  const user = await User.findById(userId).select("plan planExpiresAt quota").lean();
  if (!user) return fallback;
  const effective = await enforceExpiry(user);
  const plan = effective?.plan || "free";
  const discountPercent = MENTOR_PLAN_DISCOUNT_PERCENT[plan] ?? 0;

  if (discountPercent > 0 && price > 0) {
    const effectivePrice = Math.round(price * (1 - discountPercent / 100));
    return { price, included: false, discountPercent, effectivePrice };
  }
  return fallback;
}
/** Coi in-flight cũ hơn ngưỡng này là "treo" (server restart/crash giữa chừng) — tự giải phóng. */
const CV_ANALYSIS_IN_FLIGHT_STALE_MS = 3 * 60 * 1000;

export async function requireCvAnalysisQuota(req, res, next) {
  try {
    const user = await User.findById(req.userId).select("quota plan planExpiresAt");
    if (!user) return res.status(404).json({ success: false, error: "Người dùng không tồn tại" });

    const effective = await enforceExpiry(user);
    const used = effective?.quota?.cvAnalysisUsed ?? 0;
    const limit = effective?.quota?.cvAnalysisLimit ?? 3;

    if (used >= limit) {
      const message =
        effective?.plan === "professional"
          ? `Bạn đã dùng hết lượt phân tích CV hiện có.${
              effective?.quota?.resetAt
                ? ` Quota sẽ làm mới vào ${new Date(effective.quota.resetAt).toLocaleDateString("vi-VN")}.`
                : ""
            }`
          : "Bạn đã hết lượt phân tích CV. Vui lòng nâng cấp gói.";
      return res.status(403).json({ success: false, error: "quota_exceeded", message });
    }

    // Atomic claim: chặn user này bắn nhiều request /analyze/* (15-40s/lần, gọi LLM thật) đồng
    // thời — trước đây middleware chỉ đọc quota nên nhiều request song song đều pass rồi đều
    // tốn LLM call dù cuối cùng chỉ 1 request được lưu/tính quota.
    const now = new Date();
    const staleBefore = new Date(now.getTime() - CV_ANALYSIS_IN_FLIGHT_STALE_MS);
    const claimed = await User.findOneAndUpdate(
      {
        _id: effective._id,
        $or: [
          { "quota.cvAnalysisInFlight": { $ne: true } },
          { "quota.cvAnalysisInFlightAt": { $lt: staleBefore } },
        ],
      },
      { $set: { "quota.cvAnalysisInFlight": true, "quota.cvAnalysisInFlightAt": now } },
    );
    if (!claimed) {
      return res.status(409).json({
        success: false,
        error: "analysis_in_progress",
        message: "Bạn có 1 yêu cầu phân tích CV khác đang xử lý. Vui lòng đợi kết quả rồi thử lại.",
      });
    }

    res.on("finish", () => {
      User.updateOne(
        { _id: effective._id },
        { $set: { "quota.cvAnalysisInFlight": false } },
      ).catch(() => {});
    });

    next();
  } catch (err) {
    next(err);
  }
}
