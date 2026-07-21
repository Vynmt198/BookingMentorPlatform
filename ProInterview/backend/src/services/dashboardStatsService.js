import mongoose from "mongoose";
import { User } from "../models/User.js";
import { Booking } from "../models/Booking.js";
import { CVAnalysis } from "../models/CVAnalysis.js";
import { Enrollment } from "../models/Enrollment.js";
import { Activity } from "../models/Activity.js";
import { computeLearningStreak, toVnDayKey } from "../utils/learningStreak.js";

const MONGO_ERR = "MongoDB chưa kết nối. Kiểm tra MONGO_URI trong .env.";

function isMongoReady() {
  return mongoose.connection.readyState === 1;
}

export async function getDashboardStats(userId) {
  if (!isMongoReady()) return { ok: false, status: 503, error: MONGO_ERR };
  if (!mongoose.isValidObjectId(userId)) return { ok: false, status: 401, error: "Phiên không hợp lệ." };

  const uid = new mongoose.Types.ObjectId(userId);

  const [user, cvCount, bookingsTotal, bookingsUpcoming] = await Promise.all([
    User.findById(uid).select("plan planExpiresAt quota name").lean(),
    CVAnalysis.countDocuments({ userId: uid }),
    Booking.countDocuments({ userId: uid }),
    Booking.countDocuments({
      userId: uid,
      status: { $in: ["pending", "confirmed", "in_progress", "rescheduled"] },
    }),
  ]);

  if (!user) return { ok: false, status: 404, error: "Không tìm thấy user." };

  const bestCv = await CVAnalysis.findOne({ userId: uid, "result.matchScore": { $exists: true } })
    .sort({ "result.matchScore": -1 })
    .select("result.matchScore")
    .lean();
  const bestMatchScore = bestCv?.result?.matchScore != null ? Number(bestCv.result.matchScore) : 0;

  const activeDayKeys = await collectLearningActiveDays(uid);
  const streak = computeLearningStreak(activeDayKeys);

  return {
    ok: true,
    stats: {
      plan: user.plan,
      planExpiresAt: user.planExpiresAt,
      quota: user.quota ?? {},
      cvAnalysesCount: cvCount,
      cvBestMatchScore: bestMatchScore,
      mentorBookingsTotal: bookingsTotal,
      mentorBookingsActive: bookingsUpcoming,
      learningStreakDays: streak.days,
      learningStreakNextMilestone: streak.nextMilestone,
      learningStreakDaysUntilNext: streak.daysUntilNextMilestone,
      learningStreakProgressPercent: streak.progressPercent,
    },
  };
}

export async function collectLearningActiveDays(userId) {
  const keys = new Set();
  const add = (d) => {
    if (!d) return;
    const t = new Date(d);
    if (Number.isFinite(t.getTime())) keys.add(toVnDayKey(t));
  };

  const [analyses, enrollments, activities] = await Promise.all([
    CVAnalysis.find({ userId }).select("createdAt").lean().limit(400),
    Enrollment.find({ userId, lastAccessedAt: { $ne: null } })
      .select("lastAccessedAt")
      .lean()
      .limit(200),
    Activity.find({ userId }).select("createdAt").lean().limit(400),
  ]);

  for (const c of analyses) add(c.createdAt);
  for (const e of enrollments) add(e.lastAccessedAt);
  for (const a of activities) add(a.createdAt);

  return keys;
}
