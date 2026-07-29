import mongoose from "mongoose";
import { Mentor } from "../models/Mentor.js";
import { Booking } from "../models/Booking.js";
import { Enrollment } from "../models/Enrollment.js";
import { PayoutRequest } from "../models/PayoutRequest.js";
import { Review } from "../models/Review.js";
import { Course } from "../models/Course.js";
import { MentorPeerReview } from "../models/MentorPeerReview.js";
import { User } from "../models/User.js";
import { MentorKnowledge } from "../models/MentorKnowledge.js";
import { deliverNotification } from "./notificationDeliveryService.js";
import {
  mentorCommissionConfig,
  resolveBookingPlatformFeeRate,
  resolveCoursePlatformFeeRate,
  isEarlyMentorRateActive,
} from "./mentorCommissionService.js";
import { EARNINGS_HOLD_DAYS } from "./mentorEarningsService.js";

const MONGO_ERR = "MongoDB chưa kết nối. Kiểm tra MONGO_URI trong .env.";
function isMongoReady() {
  return mongoose.connection.readyState === 1;
}

function sanitizeText(value) {
  return String(value ?? "").trim();
}

const SUPPORTED_BANKS = new Set([
  "Vietcombank",
  "BIDV",
  "VietinBank",
  "Agribank",
  "Techcombank",
  "MB Bank",
  "ACB",
  "VPBank",
  "TPBank",
  "Sacombank",
  "HDBank",
  "VIB",
  "SHB",
  "OCB",
  "Eximbank",
  "SeABank",
  "PVcomBank",
  "Nam A Bank",
]);

function normalizePayoutAccount(input) {
  const bankName = sanitizeText(input?.bankName);
  const accountNumber = sanitizeText(input?.accountNumber).replace(/\s+/g, "");
  const accountName = sanitizeText(input?.accountName);
  return { bankName, accountNumber, accountName };
}

function maskAccountNumber(value) {
  const digits = sanitizeText(value).replace(/\D/g, "");
  if (!digits) return "";
  const tail = digits.slice(-4);
  return `****${tail}`;
}

const MAX_BANK_ACCOUNTS = 5;

function toPublicBankAccount(acc) {
  return {
    id: String(acc._id),
    bankName: acc.bankName || "",
    accountNumberMasked: maskAccountNumber(acc.accountNumber || ""),
    accountName: acc.accountName || "",
    isDefault: Boolean(acc.isDefault),
    createdAt: acc.createdAt || null,
  };
}

function toPayoutHistoryRow(row) {
  const raw = String(row.status || "pending");
  let status = "pending";
  let description = "Yêu cầu rút tiền đang chờ duyệt";
  if (raw === "rejected") {
    status = "failed";
    description = "Yêu cầu rút tiền bị từ chối";
  } else if (raw === "paid") {
    status = "paid";
    description = "Đã chuyển khoản rút tiền";
  } else if (raw === "approved") {
    status = "approved";
    description = "Đã duyệt — chờ chuyển khoản";
  } else if (raw === "pending") {
    status = "pending";
    description = "Yêu cầu rút tiền đang chờ duyệt";
  }
  return {
    id: String(row._id),
    type: "withdraw",
    amount: Number(row.amount || 0),
    status,
    date: row.requestedAt || row.createdAt,
    description,
    rejectReason: String(row.rejectReason || ""),
    reviewedAt: row.reviewedAt || null,
    paidAt: row.paidAt || null,
    transferRef: String(row.transferRef || ""),
    note: String(row.note || ""),
    providerRef: String(row.providerRef || ""),
  };
}

const BANK_NAME_MIN = 2;
const BANK_NAME_MAX = 80;

function isValidBankName(bankName) {
  const name = sanitizeText(bankName);
  if (!name || name.length < BANK_NAME_MIN || name.length > BANK_NAME_MAX) return false;
  if (SUPPORTED_BANKS.has(name)) return true;
  return /^[\p{L}\p{N}\s.&()-]+$/u.test(name);
}

function hasValidPayoutAccount(account) {
  const accountNumberOk = /^\d{8,19}$/.test(account.accountNumber || "");
  const accountNameOk = (account.accountName || "").length >= 2;
  const bankOk = isValidBankName(account.bankName || "");
  return Boolean(bankOk && accountNumberOk && accountNameOk);
}

async function getMentorByUserId(userId) {
  const uid = String(userId ?? "").trim();
  if (!mongoose.isValidObjectId(uid)) return null;
  return Mentor.findOne({ userId: uid }).lean();
}

function parseBookingDateTime(dateStr, timeStr = "00:00") {
  const raw = String(dateStr || "").trim();
  if (!raw) return null;
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const [, y, m, d] = iso;
    const [hour, minute] = String(timeStr || "00:00").split(":").map((p) => Number(p));
    const dt = new Date(Number(y), Number(m) - 1, Number(d), hour || 0, minute || 0, 0, 0);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }
  const parts = raw.split("/").map((p) => Number(p));
  if (parts.length < 2 || !Number.isFinite(parts[0]) || !Number.isFinite(parts[1])) return null;
  const day = parts[0];
  const month = parts[1];
  const year = parts.length >= 3 && Number.isFinite(parts[2]) ? parts[2] : new Date().getFullYear();
  const [hour, minute] = String(timeStr || "00:00").split(":").map((p) => Number(p));
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  const dt = new Date(year, month - 1, day, hour, minute, 0, 0);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

export async function getMentorDashboard(userId) {
  if (!isMongoReady()) return { ok: false, status: 503, error: MONGO_ERR };
  const mentor = await getMentorByUserId(userId);
  if (!mentor?._id) return { ok: false, status: 404, error: "Không tìm thấy hồ sơ mentor." };

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const total = await Booking.countDocuments({ mentorId: mentor._id });
  const completed = await Booking.countDocuments({ mentorId: mentor._id, status: "completed" });
  const sessionsThisMonth = await Booking.countDocuments({
    mentorId: mentor._id,
    createdAt: { $gte: monthStart },
    status: { $in: ["confirmed", "in_progress", "completed"] },
  });

  // "pending" (học viên chưa thanh toán) không tính là buổi hẹn thật — không đưa vào lịch mentor.
  const upcomingRaw = await Booking.find({
    mentorId: mentor._id,
    status: { $in: ["confirmed", "in_progress"] },
  })
    .populate({ path: "userId", select: "name email avatar" })
    .sort({ date: 1, timeSlot: 1 })
    .limit(50)
    .lean();

  const { toPublicBooking } = await import("./bookingsService.js");

  const upcomingWithin7 = upcomingRaw
    .map((b) => ({ booking: b, at: parseBookingDateTime(b.date, b.timeSlot) }))
    .filter(({ at }) => at && at.getTime() > now.getTime() && at.getTime() <= sevenDaysLater.getTime())
    .sort((a, b) => a.at.getTime() - b.at.getTime())
    .slice(0, 10);

  const reviews = await Review.find({ targetType: "mentor", targetId: mentor._id, isVisible: { $ne: false } })
    .select("rating bookingId")
    .lean();
  const reviewCount = reviews.length;
  const avgRating = reviewCount ? reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviewCount : 0;

  const ratingByBookingId = {};
  for (const r of reviews) {
    if (r.bookingId) ratingByBookingId[String(r.bookingId)] = Number(r.rating || 0);
  }

  const finance = mentor.finance || {};

  return {
    ok: true,
    dashboard: {
      totalSessions: total,
      completedSessions: completed,
      sessionsThisMonth,
      upcomingWithin7Days: upcomingWithin7.length,
      reviewCount,
      avgRating: Math.round(avgRating * 10) / 10,
      finance: {
        availableBalance: Number(finance.availableBalance || 0),
        totalEarned: Number(finance.totalEarned || 0),
        pendingBalance: Number(finance.pendingBalance || 0),
      },
      ratingByBookingId,
      upcomingBookings: upcomingWithin7.map(({ booking }) => toPublicBooking(booking)),
    },
  };
}

export async function getMentorFinance(userId) {
  if (!isMongoReady()) return { ok: false, status: 503, error: MONGO_ERR };
  const mentor = await getMentorByUserId(userId);
  if (!mentor?._id) return { ok: false, status: 404, error: "Không tìm thấy hồ sơ mentor." };

  const completed = await Booking.find({
    mentorId: mentor._id,
    status: "completed",
    paymentStatus: "paid",
  })
    .select("price totalAmount platformFee createdAt")
    .lean();
  let bookingGrossTotal = 0;
  let bookingFeeTotal = 0;
  const bookingIncomeTotal = completed.reduce((sum, b) => {
    const gross = Math.round(Number(b.totalAmount ?? b.price ?? 0));
    const platformFee = Math.round(Number(b.platformFee || 0));
    bookingGrossTotal += gross;
    bookingFeeTotal += platformFee;
    return sum + Math.max(0, gross - platformFee);
  }, 0);
  const totalSessions = completed.length;

  const mentorCourses = await Course.find({ mentorId: mentor._id }).select("_id").lean();
  const mentorCourseIds = mentorCourses.map((c) => c._id);
  const paidEnrollments =
    mentorCourseIds.length > 0
      ? await Enrollment.find({
          courseId: { $in: mentorCourseIds },
          paymentStatus: "paid",
          pricePaid: { $gt: 0 },
        })
          .select("pricePaid platformFee platformFeeRate paidAt createdAt")
          .lean()
      : [];
  let courseGrossTotal = 0;
  let courseFeeTotal = 0;
  const courseIncomeTotal = paidEnrollments.reduce((sum, row) => {
    const gross = Math.round(Number(row.pricePaid || 0));
    if (gross <= 0) return sum;
    const explicitFee = Number(row.platformFee);
    let fee;
    if (Number.isFinite(explicitFee) && explicitFee >= 0) {
      fee = Math.round(explicitFee);
    } else {
      const rateRaw = Number(row.platformFeeRate);
      const rate = Number.isFinite(rateRaw) && rateRaw >= 0 && rateRaw <= 1 ? rateRaw : Number(process.env.COURSE_PLATFORM_FEE_RATE) || 0.35;
      fee = Math.round(gross * rate);
    }
    courseGrossTotal += gross;
    courseFeeTotal += fee;
    return sum + Math.max(0, gross - fee);
  }, 0);
  const computedTotalEarned = bookingIncomeTotal + courseIncomeTotal;
  const grossEarned = bookingGrossTotal + courseGrossTotal;
  const platformFeeTotal = bookingFeeTotal + courseFeeTotal;

  const payouts = await PayoutRequest.find({ mentorId: mentor._id })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  const pendingPayoutCount = payouts.filter((p) => p.status === "pending" || p.status === "approved").length;

  // Các khoản đã ghi có nhưng còn trong 3 ngày giữ — để FE hiển thị "khả dụng vào ngày ..." cho từng khoản.
  const clearingBookings = await Booking.find({
    mentorId: mentor._id,
    mentorEarningsCreditedAt: { $ne: null },
    earningsClearAt: { $ne: null },
    earningsClearedAt: { $in: [null, undefined] },
  })
    .select("totalAmount price platformFee earningsClearAt date timeSlot")
    .lean();
  const clearingBookingItems = clearingBookings.map((b) => ({
    id: String(b._id),
    type: "booking",
    amount: Math.max(0, Math.round(Number(b.totalAmount ?? b.price ?? 0)) - Math.round(Number(b.platformFee || 0))),
    clearAt: b.earningsClearAt,
    description: `Buổi ${b.date || ""} ${b.timeSlot || ""}`.trim(),
  }));
  const clearingEnrollments = mentorCourseIds.length
    ? await Enrollment.find({
        courseId: { $in: mentorCourseIds },
        mentorEarningsCreditedAt: { $ne: null },
        earningsClearAt: { $ne: null },
        earningsClearedAt: { $in: [null, undefined] },
      })
        .select("pricePaid platformFee platformFeeRate earningsClearAt courseId")
        .populate({ path: "courseId", select: "title" })
        .lean()
    : [];
  const clearingEnrollmentItems = clearingEnrollments.map((e) => {
    const gross = Math.round(Number(e.pricePaid || 0));
    const explicitFee = Number(e.platformFee);
    const net = Number.isFinite(explicitFee) && explicitFee >= 0
      ? Math.max(0, gross - Math.round(explicitFee))
      : Math.max(0, gross - Math.round(gross * (Number.isFinite(Number(e.platformFeeRate)) ? Number(e.platformFeeRate) : 0.35)));
    return {
      id: String(e._id),
      type: "course",
      amount: net,
      clearAt: e.earningsClearAt,
      description: e.courseId?.title || "Khóa học",
    };
  });
  const clearingItems = [...clearingBookingItems, ...clearingEnrollmentItems].sort(
    (a, b) => new Date(a.clearAt).getTime() - new Date(b.clearAt).getTime(),
  );
  const incomeRows = completed.slice(0, 50).map((b) => ({
    id: String(b._id),
    type: "income",
    amount: Math.max(0, Math.round(Number(b.totalAmount ?? b.price ?? 0)) - Math.round(Number(b.platformFee || 0))),
    status: "completed",
    date: b.createdAt,
    description: "Thu từ booking",
  }));
  const courseIncomeRows = paidEnrollments.slice(0, 50).map((row) => {
    const gross = Math.round(Number(row.pricePaid || 0));
    const explicitFee = Number(row.platformFee);
    const net = Number.isFinite(explicitFee) && explicitFee >= 0
      ? Math.max(0, gross - Math.round(explicitFee))
      : Math.max(
          0,
          gross -
            Math.round(
              gross *
                (Number.isFinite(Number(row.platformFeeRate)) ? Number(row.platformFeeRate) : Number(process.env.COURSE_PLATFORM_FEE_RATE) || 0.35),
            ),
        );
    return {
      id: `enrollment-${String(row._id)}`,
      type: "income",
      amount: net,
      status: "completed",
      date: row.paidAt || row.createdAt,
      description: "Thu từ khóa học",
    };
  });
  const payoutRows = payouts.map(toPayoutHistoryRow);
  const history = [...incomeRows, ...courseIncomeRows, ...payoutRows]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 100);
  const commissionCfg = mentorCommissionConfig();
  const bookingRateInfo = resolveBookingPlatformFeeRate(mentor);
  const courseRateInfo = resolveCoursePlatformFeeRate(mentor);
  const bookingRate = bookingRateInfo.rate;
  const courseRate = courseRateInfo.rate;
  const earlyActive = isEarlyMentorRateActive(mentor);
  const earlyExpiresAt = mentor?.pricing?.earlyMentorExpiresAt || null;
  const earlyRank = Number(mentor?.pricing?.earlyMentorRank || 0) || null;

  return {
    ok: true,
    finance: {
      availableBalance: mentor.finance?.availableBalance ?? 0,
      clearingBalance: mentor.finance?.clearingBalance ?? 0,
      clearingItems,
      holdDays: EARNINGS_HOLD_DAYS,
      pendingBalance: mentor.finance?.pendingBalance ?? 0,
      pendingPayoutCount,
      totalEarned: (mentor.finance?.totalEarned > 0 ? mentor.finance.totalEarned : null) ?? computedTotalEarned,
      grossEarned,
      platformFeeTotal,
      incomeBreakdown: {
        booking: bookingIncomeTotal,
        course: courseIncomeTotal,
      },
      payoutAccounts: (mentor.finance?.bankAccounts || []).map(toPublicBankAccount),
      payoutAccountOwnerName: sanitizeText(mentor.name || ""),
      totalSessions,
      history,
      commissionPolicy: {
        bookingRate,
        courseRate,
        bookingRateSource: bookingRateInfo.source,
        courseRateSource: courseRateInfo.source,
        standardBookingRate: commissionCfg.bookingStandardRate,
        standardCourseRate: commissionCfg.courseStandardRate,
        earlyBookingRate: commissionCfg.bookingEarlyRate,
        earlyCourseRate: commissionCfg.courseEarlyRate,
        isEarlyMentor: Boolean(mentor?.pricing?.isEarlyMentor),
        isEarlyMentorActive: earlyActive,
        earlyMentorRank: earlyRank,
        earlyMentorExpiresAt: earlyExpiresAt,
      },
      pricePerHour: mentor.pricePerHour,
      pendingPricePerHour: mentor.pendingPricePerHour || null,
    },
  };
}

function dayRange(daysAgoStart, daysAgoEnd) {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgoEnd, 23, 59, 59, 999);
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgoStart, 0, 0, 0, 0);
  return { start, end };
}

function filterBookingsInRange(bookings, start, end) {
  const s = start.getTime();
  const e = end.getTime();
  return bookings.filter((b) => {
    const t = new Date(b.createdAt || 0).getTime();
    return t >= s && t <= e;
  });
}

function uniqueMenteeCount(bookings) {
  const ids = new Set();
  for (const b of bookings) {
    const uid = String(b.userId || "");
    if (mongoose.isValidObjectId(uid)) ids.add(uid);
  }
  return ids.size;
}

function countImprovingMentees(bookings, mentorReviews) {
  const menteeIds = Array.from(
    new Set(
      bookings
        .map((b) => String(b.userId || ""))
        .filter((id) => mongoose.isValidObjectId(id)),
    ),
  );
  if (!menteeIds.length) return 0;

  const reviewsByUser = new Map();
  for (const r of mentorReviews) {
    const key = String(r.userId || "");
    if (!reviewsByUser.has(key)) reviewsByUser.set(key, []);
    reviewsByUser.get(key).push(r);
  }

  let improving = 0;
  for (const uid of menteeIds) {
    const rows = bookings.filter((b) => String(b.userId) === uid);
    const done = rows.filter((r) => r.status === "completed").length;
    const cancelledCount = rows.filter((r) => r.status === "cancelled").length;
    const reviews = reviewsByUser.get(uid) || [];
    if (!reviews.length && done === 0) continue;
    if (done >= Math.max(1, cancelledCount)) improving += 1;
  }
  return improving;
}

function avgReviewScoreInRange(reviews, start, end) {
  const s = start.getTime();
  const e = end.getTime();
  const rows = reviews.filter((r) => {
    const t = new Date(r.createdAt || 0).getTime();
    return t >= s && t <= e;
  });
  if (!rows.length) return null;
  return rows.reduce((sum, r) => sum + Number(r.rating || 0), 0) / rows.length;
}

function formatSignedIntDelta(delta) {
  const n = Number(delta) || 0;
  if (n === 0) return "Không đổi";
  return n > 0 ? `+${n}` : `${n}`;
}

function formatSignedScoreDelta(delta) {
  const n = Number(Number(delta).toFixed(1));
  if (!Number.isFinite(n) || n === 0) return "Không đổi";
  return n > 0 ? `+${n.toFixed(1)}` : `${n.toFixed(1)}`;
}

function parseMentorNotesSections(notes) {
  const text = String(notes || "");
  const strengths = [];
  const weaknesses = [];
  const mStrong = text.match(/Điểm mạnh:\s*([^\n]+)/i);
  const mWeak = text.match(/Cần cải thiện:\s*([^\n]+)/i);
  if (mStrong?.[1]?.trim()) strengths.push(mStrong[1].trim());
  if (mWeak?.[1]?.trim()) weaknesses.push(mWeak[1].trim());
  return { strengths, weaknesses };
}

function computeMenteeProgressTrend(uid, reviews, starHistory) {
  const MS_DAY = 86400000;
  const now = Date.now();

  const reviewAvgBetween = (startMs, endMs) => {
    const inRange = reviews.filter((r) => {
      const t = new Date(r.createdAt || 0).getTime();
      return t >= startMs && t <= endMs;
    });
    if (!inRange.length) return null;
    return inRange.reduce((sum, r) => sum + Number(r.rating || 0), 0) / inRange.length;
  };

  const recentReviewAvg = reviewAvgBetween(now - 30 * MS_DAY, now);
  const priorReviewAvg = reviewAvgBetween(now - 60 * MS_DAY, now - 30 * MS_DAY);
  if (recentReviewAvg != null && priorReviewAvg != null) {
    const delta = recentReviewAvg - priorReviewAvg;
    if (delta >= 0.25) return "improving";
    if (delta <= -0.25) return "declining";
    return "stable";
  }

  if (reviews.length >= 2) {
    const sorted = [...reviews].sort(
      (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime(),
    );
    const mid = Math.floor(sorted.length / 2);
    const first = sorted.slice(0, mid);
    const second = sorted.slice(mid);
    if (first.length && second.length) {
      const firstAvg = first.reduce((sum, r) => sum + Number(r.rating || 0), 0) / first.length;
      const secondAvg = second.reduce((sum, r) => sum + Number(r.rating || 0), 0) / second.length;
      const delta = secondAvg - firstAvg;
      if (delta >= 0.25) return "improving";
      if (delta <= -0.25) return "declining";
      return "stable";
    }
  }

  const weekAvgs = (starHistory || [])
    .map((row) => {
      const vals = [row.situation, row.task, row.action, row.result].filter(
        (v) => v != null && Number.isFinite(Number(v)),
      );
      return vals.length ? vals.reduce((a, b) => a + Number(b), 0) / vals.length : null;
    })
    .filter((v) => v != null);
  if (weekAvgs.length >= 2) {
    const split = Math.ceil(weekAvgs.length / 2);
    const early = weekAvgs.slice(0, split);
    const late = weekAvgs.slice(split);
    const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
    const delta = avg(late) - avg(early);
    if (delta >= 0.2) return "improving";
    if (delta <= -0.2) return "declining";
    return "stable";
  }

  return "unknown";
}

function uniqInsightLines(items, limit = 6) {
  const seen = new Set();
  const out = [];
  for (const raw of items) {
    const t = sanitizeText(raw);
    if (!t || seen.has(t.toLowerCase())) continue;
    seen.add(t.toLowerCase());
    out.push(t);
    if (out.length >= limit) break;
  }
  return out;
}

function buildMenteeBehaviorProfile(uid, bookings, mentorReviews, knowledgeByBooking, now) {
  const rows = bookings.filter((b) => String(b.userId) === uid);
  const done = rows.filter((r) => r.status === "completed").length;
  const reviews = mentorReviews.filter((r) => String(r.userId) === uid);

  const strengthPool = [];
  const weaknessPool = [];
  let knowledgeCount = 0;

  for (const b of rows.filter((r) => r.status === "completed")) {
    const parsed = parseMentorNotesSections(b.mentorNotes);
    strengthPool.push(...parsed.strengths);
    weaknessPool.push(...parsed.weaknesses);
    const kn = knowledgeByBooking.get(String(b._id));
    if (kn) {
      knowledgeCount += 1;
      strengthPool.push(...(Array.isArray(kn.keyInsights) ? kn.keyInsights : []));
      weaknessPool.push(...(Array.isArray(kn.commonMistakes) ? kn.commonMistakes : []));
    }
  }

  for (const r of reviews) {
    for (const tag of Array.isArray(r.tags) ? r.tags : []) {
      strengthPool.push(tag);
    }
    if (Number(r.rating || 0) <= 3 && r.comment) weaknessPool.push(r.comment);
  }

  const starHistory = buildWeeklyStarHistoryForMentee(uid, mentorReviews, now);

  const strengths = uniqInsightLines(strengthPool);
  const weaknesses = uniqInsightLines(weaknessPool);
  const hasReviewHistory = reviews.length > 0;
  const hasBehaviorData = strengths.length > 0 || weaknesses.length > 0 || knowledgeCount > 0;

  return {
    strengths,
    weaknesses,
    starHistory,
    hasBehaviorData,
    hasReviewHistory,
    completedSessions: done,
  };
}

function buildWeeklyStarHistoryForMentee(userId, mentorReviews, now = new Date()) {
  return Array.from({ length: 4 }, (_, i) => {
    const weekIndex = 3 - i;
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - weekIndex * 7, 23, 59, 59, 999);
    const start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 6, 0, 0, 0, 0);
    const weekReviews = mentorReviews.filter((r) => {
      if (String(r.userId || "") !== userId) return false;
      const t = new Date(r.createdAt || 0).getTime();
      return t >= start.getTime() && t <= end.getTime();
    });
    const avg =
      weekReviews.length > 0
        ? weekReviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / weekReviews.length
        : null;
    const v = avg != null ? Number(avg.toFixed(1)) : null;
    return {
      date: `W${i + 1}`,
      situation: v,
      task: v,
      action: v,
      result: v,
    };
  });
}

function deriveMenteeInsights(userId, mentorReviews, completedSessions = 0) {
  const userReviews = mentorReviews.filter((r) => String(r.userId || "") === userId);
  if (!userReviews.length) {
    if (completedSessions > 0) {
      return {
        strengths: [`Đã hoàn thành ${completedSessions} buổi mentor`],
        weaknesses: [
          "Học viên chưa gửi đánh giá sao — biểu đồ tiến trình sẽ hiện sau khi có review",
        ],
      };
    }
    return { strengths: [], weaknesses: [] };
  }
  const tagSet = new Set();
  for (const r of userReviews) {
    for (const tag of Array.isArray(r.tags) ? r.tags : []) {
      const t = sanitizeText(tag);
      if (t) tagSet.add(t);
    }
  }
  const strengths = [...tagSet].slice(0, 4);
  const weaknesses = userReviews
    .filter((r) => Number(r.rating || 0) <= 3)
    .flatMap((r) => (Array.isArray(r.tags) ? r.tags : []))
    .map((t) => sanitizeText(t))
    .filter(Boolean)
    .filter((t, idx, arr) => arr.indexOf(t) === idx)
    .slice(0, 4);

  if (!strengths.length && userReviews.some((r) => Number(r.rating || 0) >= 4)) {
    strengths.push("Được học viên đánh giá tích cực");
  }
  if (!weaknesses.length && userReviews.some((r) => Number(r.rating || 0) <= 3)) {
    weaknesses.push("Cần cải thiện theo phản hồi gần đây");
  }

  return { strengths, weaknesses };
}

const RADAR_SUBJECTS = ["Tình huống", "Nhiệm vụ", "Hành động", "Kết quả", "Phản hồi"];

function buildMentorRadarAnalytics(mentorReviews) {
  const reviewAvg =
    mentorReviews.length > 0
      ? Number(
          (
            mentorReviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / mentorReviews.length
          ).toFixed(1),
        )
      : null;

  if (reviewAvg != null) {
    const radarSkills = RADAR_SUBJECTS.map((subject) => ({
      subject,
      value: reviewAvg,
      fullMark: 5,
    }));
    return { radarSkills, overallAvgRating: reviewAvg, radarScoreSource: "review" };
  }

  return { radarSkills: [], overallAvgRating: null, radarScoreSource: null };
}

export async function getMentorAnalytics(userId) {
  if (!isMongoReady()) return { ok: false, status: 503, error: MONGO_ERR };
  const mentor = await getMentorByUserId(userId);
  if (!mentor?._id) return { ok: false, status: 404, error: "Không tìm thấy hồ sơ mentor." };

  const bookings = await Booking.find({ mentorId: mentor._id })
    .select("userId status createdAt completedAt mentorNotes")
    .lean();
  const mentorReviews = await Review.find({ targetType: "mentor", targetId: mentor._id, isVisible: { $ne: false } })
    .select("userId rating createdAt tags bookingId")
    .lean();

  const total = bookings.length;
  const completed = bookings.filter((r) => r.status === "completed").length;
  const cancelled = bookings.filter((r) => r.status === "cancelled").length;

  const menteeIds = Array.from(
    new Set(bookings.map((b) => String(b.userId || "")).filter((id) => mongoose.isValidObjectId(id))),
  );
  const mentees = await User.find({ _id: { $in: menteeIds } })
    .select("name avatar desiredPosition currentCompany")
    .lean();
  const menteeMap = new Map(mentees.map((m) => [String(m._id), m]));

  const reviewsByUser = new Map();
  for (const r of mentorReviews) {
    const key = String(r.userId || "");
    if (!reviewsByUser.has(key)) reviewsByUser.set(key, []);
    reviewsByUser.get(key).push(r);
  }

  const now = new Date();

  const mentorBookingIds = bookings.map((b) => b._id);
  const knowledgeRows =
    mentorBookingIds.length > 0
      ? await MentorKnowledge.find({ bookingId: { $in: mentorBookingIds } }).lean()
      : [];
  const knowledgeByBooking = new Map(knowledgeRows.map((k) => [String(k.bookingId), k]));

  const menteeAnalytics = menteeIds.map((uid) => {
    const rows = bookings.filter((b) => String(b.userId) === uid);
    const reviews = reviewsByUser.get(uid) || [];
    const avgStar = reviews.length
      ? reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / reviews.length
      : null;
    const u = menteeMap.get(uid) || {};
    const behavior = buildMenteeBehaviorProfile(
      uid,
      bookings,
      mentorReviews,
      knowledgeByBooking,
      now,
    );
    return {
      menteeId: uid,
      menteeName: u.name || "Mentee",
      menteeAvatar: u.avatar || "",
      totalSessions: rows.length,
      completedSessions: behavior.completedSessions,
      hasReviewHistory: behavior.hasReviewHistory,
      hasBehaviorData: behavior.hasBehaviorData,
      avgStarScore: avgStar != null ? Number(avgStar.toFixed(1)) : null,
      scoreSource: avgStar != null ? "review" : null,
      progressTrend: computeMenteeProgressTrend(
        uid,
        reviews,
        behavior.starHistory,
      ),
      lastSessionDate: rows
        .map((r) => r.completedAt || r.createdAt)
        .filter(Boolean)
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] || new Date(),
      strengths: behavior.strengths,
      weaknesses: behavior.weaknesses,
      starHistory: behavior.starHistory,
    };
  });

  const weeklyStats = Array.from({ length: 6 }, (_, i) => {
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i * 7);
    const start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 6);
    const weekRows = bookings.filter((b) => {
      const t = new Date(b.createdAt).getTime();
      return t >= start.getTime() && t <= end.getTime();
    });
    const weekReviews = mentorReviews.filter((r) => {
      const t = new Date(r.createdAt).getTime();
      return t >= start.getTime() && t <= end.getTime();
    });
    const avg =
      weekReviews.length > 0
        ? weekReviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / weekReviews.length
        : 0;
    return {
      week: `${start.getDate()}/${start.getMonth() + 1}`,
      totalMeetings: weekRows.length,
      avgStarScore: Number(avg.toFixed(2)),
    };
  }).reverse();

  const menteeScores = menteeAnalytics
    .map((m) => m.avgStarScore)
    .filter((v) => v != null && Number.isFinite(v));
  const topAvg = menteeScores.length ? Math.max(...menteeScores) : 0;

  const { radarSkills, overallAvgRating, radarScoreSource } = buildMentorRadarAnalytics(mentorReviews);

  const weekCurrent = dayRange(6, 0);
  const weekPrevious = dayRange(13, 7);
  const monthCurrent = dayRange(29, 0);
  const monthPrevious = dayRange(59, 30);

  const sessionsCurrent7 = filterBookingsInRange(bookings, weekCurrent.start, weekCurrent.end).length;
  const sessionsPrevious7 = filterBookingsInRange(bookings, weekPrevious.start, weekPrevious.end).length;
  const sessionsDelta7d = sessionsCurrent7 - sessionsPrevious7;

  const menteesCurrent30 = uniqueMenteeCount(
    filterBookingsInRange(bookings, monthCurrent.start, monthCurrent.end),
  );
  const menteesPrevious30 = uniqueMenteeCount(
    filterBookingsInRange(bookings, monthPrevious.start, monthPrevious.end),
  );
  const menteesDelta30d = menteesCurrent30 - menteesPrevious30;

  const improvingCurrent30 = countImprovingMentees(
    filterBookingsInRange(bookings, monthCurrent.start, monthCurrent.end),
    mentorReviews,
  );
  const improvingPrevious30 = countImprovingMentees(
    filterBookingsInRange(bookings, monthPrevious.start, monthPrevious.end),
    mentorReviews,
  );
  const improvingDelta30d = improvingCurrent30 - improvingPrevious30;

  const avgCurrent30 = avgReviewScoreInRange(mentorReviews, monthCurrent.start, monthCurrent.end);
  const avgPrevious30 = avgReviewScoreInRange(mentorReviews, monthPrevious.start, monthPrevious.end);
  const scoreDelta30d =
    avgCurrent30 != null && avgPrevious30 != null ? Number((avgCurrent30 - avgPrevious30).toFixed(1)) : 0;

  return {
    ok: true,
    analytics: {
      total,
      completed,
      cancelled,
      stats: {
        totalSessions: total,
        totalMentees: menteeAnalytics.length,
        improvingCount: menteeAnalytics.filter((m) => m.progressTrend === "improving").length,
        topAvgScore: Number(topAvg.toFixed(1)),
        overallAvgRating,
        radarSkills,
        radarScoreSource,
        trends: {
          sessionsDelta7d,
          sessionsTrendLabel: formatSignedIntDelta(sessionsDelta7d),
          menteesDelta30d,
          menteesTrendLabel: formatSignedIntDelta(menteesDelta30d),
          improvingDelta30d,
          improvingTrendLabel: formatSignedIntDelta(improvingDelta30d),
          scoreDelta30d,
          scoreTrendLabel:
            mentorReviews.length > 0 ? formatSignedScoreDelta(scoreDelta30d) : null,
          scoreScaleLabel: "/ 5.0",
        },
      },
      weeklyStats,
      mentees: menteeAnalytics.sort((a, b) => Number(b.avgStarScore) - Number(a.avgStarScore)),
    },
  };
}

export async function requestPayout(userId, body) {
  if (!isMongoReady()) return { ok: false, status: 503, error: MONGO_ERR };
  const mentor = await getMentorByUserId(userId);
  if (!mentor?._id) return { ok: false, status: 404, error: "Không tìm thấy hồ sơ mentor." };
  const amount = Number(body?.amount);
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, status: 400, error: "amount không hợp lệ." };
  if (amount < 100000) return { ok: false, status: 400, error: "Số tiền rút tối thiểu là 100.000đ." };
  const roundedAmount = Math.round(amount);

  const accountId = sanitizeText(body?.accountId);
  if (!accountId) {
    return { ok: false, status: 400, error: "Vui lòng chọn tài khoản nhận tiền." };
  }
  const savedAccount = (mentor.finance?.bankAccounts || []).find((acc) => String(acc._id) === accountId);
  if (!savedAccount) {
    return { ok: false, status: 400, error: "Không tìm thấy tài khoản nhận tiền đã chọn." };
  }
  const payoutAccount = normalizePayoutAccount(savedAccount);

  // Trừ số dư atomic (check-and-decrement trong 1 lệnh) TRƯỚC khi tạo PayoutRequest —
  // tránh 2 request rút tiền gần như đồng thời cùng pass check rồi cùng rút vượt số dư thật.
  const reserved = await Mentor.findOneAndUpdate(
    { _id: mentor._id, "finance.availableBalance": { $gte: roundedAmount } },
    {
      $inc: {
        "finance.availableBalance": -roundedAmount,
        "finance.pendingBalance": roundedAmount,
      },
    },
  );
  if (!reserved) {
    return { ok: false, status: 400, error: "Số dư khả dụng không đủ để rút." };
  }

  let payout;
  try {
    payout = await PayoutRequest.create({
      mentorId: mentor._id,
      amount: roundedAmount,
      status: "pending",
      payoutAccount,
      requestedAt: new Date(),
    });
  } catch (err) {
    // Rollback số dư đã trừ atomic ở trên nếu không tạo được PayoutRequest.
    await Mentor.updateOne(
      { _id: mentor._id },
      {
        $inc: {
          "finance.availableBalance": roundedAmount,
          "finance.pendingBalance": -roundedAmount,
        },
      },
    );
    throw err;
  }

  await deliverNotification(userId, {
    mentorPrefKey: "payout_update",
    type: "system",
    title: "Đã gửi yêu cầu rút tiền",
    body: `Yêu cầu ${roundedAmount.toLocaleString("vi-VN")}₫ đang chờ admin duyệt.`,
    metadata: { actionUrl: "/mentor/finance" },
  });

  return {
    ok: true,
    payout: {
      id: String(payout._id),
      amount: roundedAmount,
      status: payout.status,
      payoutAccountMasked: maskAccountNumber(payoutAccount.accountNumber),
      bankName: payoutAccount.bankName,
      accountName: payoutAccount.accountName,
    },
  };
}

export async function getMentorPayoutAccounts(userId) {
  if (!isMongoReady()) return { ok: false, status: 503, error: MONGO_ERR };
  const mentor = await getMentorByUserId(userId);
  if (!mentor?._id) return { ok: false, status: 404, error: "Không tìm thấy hồ sơ mentor." };
  return {
    ok: true,
    accounts: (mentor.finance?.bankAccounts || []).map(toPublicBankAccount),
  };
}

export async function addMentorPayoutAccount(userId, body) {
  if (!isMongoReady()) return { ok: false, status: 503, error: MONGO_ERR };
  const mentor = await Mentor.findOne({ userId: String(userId ?? "").trim() });
  if (!mentor?._id) return { ok: false, status: 404, error: "Không tìm thấy hồ sơ mentor." };

  const payoutAccount = normalizePayoutAccount({
    ...(body || {}),
    accountName: sanitizeText(mentor.name || ""),
  });
  if (!hasValidPayoutAccount(payoutAccount)) {
    return {
      ok: false,
      status: 400,
      error: "Thông tin tài khoản chưa hợp lệ. Tên ngân hàng 2–80 ký tự và số tài khoản 8–19 chữ số.",
    };
  }

  const confirmDigits = sanitizeText(body?.confirmAccountNumber).replace(/\s+/g, "");
  if (confirmDigits !== payoutAccount.accountNumber) {
    return {
      ok: false,
      status: 400,
      error: "Số tài khoản xác nhận không khớp. Vui lòng nhập lại để chắc chắn đúng.",
    };
  }

  const existing = mentor.finance?.bankAccounts || [];
  if (existing.length >= MAX_BANK_ACCOUNTS) {
    return { ok: false, status: 400, error: `Chỉ được lưu tối đa ${MAX_BANK_ACCOUNTS} tài khoản nhận tiền.` };
  }
  const isDuplicate = existing.some(
    (acc) => acc.bankName === payoutAccount.bankName && acc.accountNumber === payoutAccount.accountNumber,
  );
  if (isDuplicate) {
    return { ok: false, status: 400, error: "Tài khoản này đã được lưu trước đó." };
  }

  mentor.finance.bankAccounts.push({
    bankName: payoutAccount.bankName,
    accountNumber: payoutAccount.accountNumber,
    accountName: payoutAccount.accountName,
    isDefault: existing.length === 0,
    createdAt: new Date(),
  });
  await mentor.save();

  const created = mentor.finance.bankAccounts[mentor.finance.bankAccounts.length - 1];
  return { ok: true, account: toPublicBankAccount(created) };
}

export async function deleteMentorPayoutAccount(userId, accountId) {
  if (!isMongoReady()) return { ok: false, status: 503, error: MONGO_ERR };
  const mentor = await Mentor.findOne({ userId: String(userId ?? "").trim() });
  if (!mentor?._id) return { ok: false, status: 404, error: "Không tìm thấy hồ sơ mentor." };

  const target = mentor.finance.bankAccounts.id(accountId);
  if (!target) return { ok: false, status: 404, error: "Không tìm thấy tài khoản nhận tiền." };
  const wasDefault = Boolean(target.isDefault);
  target.deleteOne();

  if (wasDefault && mentor.finance.bankAccounts.length > 0) {
    mentor.finance.bankAccounts[0].isDefault = true;
  }
  await mentor.save();

  return { ok: true, accounts: mentor.finance.bankAccounts.map(toPublicBankAccount) };
}

export async function getMentorPayoutHistory(userId) {
  if (!isMongoReady()) return { ok: false, status: 503, error: MONGO_ERR };
  const mentor = await getMentorByUserId(userId);
  if (!mentor?._id) return { ok: false, status: 404, error: "Không tìm thấy hồ sơ mentor." };

  const rows = await PayoutRequest.find({ mentorId: mentor._id }).sort({ createdAt: -1 }).limit(100).lean();
  return {
    ok: true,
    items: rows.map((row) => ({
      id: String(row._id),
      amount: Number(row.amount || 0),
      status: row.status,
      requestedAt: row.requestedAt || row.createdAt,
      reviewedAt: row.reviewedAt || null,
      paidAt: row.paidAt || null,
      transferRef: String(row.transferRef || ""),
      rejectReason: row.rejectReason || "",
      note: String(row.note || ""),
      payoutAccountMasked: maskAccountNumber(row.payoutAccount?.accountNumber || ""),
      bankName: row.payoutAccount?.bankName || "",
      accountName: row.payoutAccount?.accountName || "",
      provider: row.provider || "manual",
      providerRef: row.providerRef || "",
    })),
  };
}

export async function getMentorPeerReviewQueue(userId) {
  if (!isMongoReady()) return { ok: false, status: 503, error: MONGO_ERR };
  const mentor = await getMentorByUserId(userId);
  if (!mentor?._id) return { ok: false, status: 404, error: "Không tìm thấy hồ sơ mentor." };

  const courses = await Course.find({
    mentorId: { $ne: mentor._id },
    status: { $in: ["published", "pending_update"] },
  })
    .populate({ path: "mentorId", select: "name" })
    .sort({ updatedAt: -1 })
    .lean();

  const courseIds = courses.map((c) => c._id);
  const peerReviews = await MentorPeerReview.find({
    reviewerId: mentor._id,
    courseId: { $in: courseIds },
  })
    .select("courseId contentRating qualityRating priceValueRating")
    .lean();
  const reviewMap = new Map(peerReviews.map((r) => [String(r.courseId), r]));

  const rows = courses.map((course) => {
    const review = reviewMap.get(String(course._id));
    const avg =
      review
        ? ((Number(review.contentRating || 0) + Number(review.qualityRating || 0) + Number(review.priceValueRating || 0)) / 3)
        : 0;
    return {
      id: String(course._id),
      title: course.title || "Khóa học",
      mentor: course.mentorId?.name || "Mentor",
      category: course.topics?.[0] || "Other",
      description: course.description || "",
      level: course.level || "",
      price: Number(course.price || 0),
      isFree: Boolean(course.isFree),
      lessonCount: Array.isArray(course.modules)
        ? course.modules.reduce((sum, mod) => sum + (Array.isArray(mod?.lessons) ? mod.lessons.length : 0), 0)
        : 0,
      status: review ? "reviewed" : "pending",
      rating: review ? Math.round(avg * 10) / 10 : 0,
      participants: Number(course.stats?.enrollmentCount || 0),
      cover: course.thumbnail || "",
    };
  });

  return { ok: true, items: rows };
}

export async function submitMentorPeerReview(userId, courseId, body) {
  if (!isMongoReady()) return { ok: false, status: 503, error: MONGO_ERR };
  const mentor = await getMentorByUserId(userId);
  if (!mentor?._id) return { ok: false, status: 404, error: "Không tìm thấy hồ sơ mentor." };
  if (!mongoose.isValidObjectId(courseId)) return { ok: false, status: 400, error: "courseId không hợp lệ." };

  const course = await Course.findById(courseId).select("_id mentorId status").lean();
  if (!course?._id) return { ok: false, status: 404, error: "Không tìm thấy khóa học." };
  if (String(course.mentorId) === String(mentor._id)) {
    return { ok: false, status: 400, error: "Bạn không thể tự đánh giá khóa học của chính mình." };
  }
  if (!["published", "pending_update"].includes(String(course.status || ""))) {
    return { ok: false, status: 400, error: "Khóa học hiện không ở trạng thái có thể đánh giá." };
  }

  const contentRating = Number(body?.contentRating);
  const qualityRating = Number(body?.qualityRating);
  const priceValueRating = Number(body?.priceValueRating);
  const feedback = String(body?.feedback || "").trim();
  const validRating = (n) => Number.isFinite(n) && n >= 1 && n <= 5;
  if (!validRating(contentRating) || !validRating(qualityRating) || !validRating(priceValueRating)) {
    return { ok: false, status: 400, error: "Điểm đánh giá phải trong khoảng 1-5." };
  }

  const review = await MentorPeerReview.findOneAndUpdate(
    { reviewerId: mentor._id, courseId: course._id },
    {
      $set: {
        contentRating,
        qualityRating,
        priceValueRating,
        feedback,
        isCompleted: true,
        isVisibleToOwner: true,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean();

  // Đánh giá chéo mentor KHÔNG ảnh hưởng course.stats.rating công khai (xem
  // recalcCourseReviewStats trong reviewsService.js) — chỉ hiển thị riêng qua
  // GET /api/courses/:id/peer-reviews, nên không cần recalc ở đây.

  const avg = (contentRating + qualityRating + priceValueRating) / 3;
  return {
    ok: true,
    review: {
      id: String(review._id),
      courseId: String(course._id),
      rating: Math.round(avg * 10) / 10,
      contentRating,
      qualityRating,
      priceValueRating,
      feedback,
    },
  };
}

export async function getMentorReviews(userId) {
  if (!isMongoReady()) return { ok: false, status: 503, error: MONGO_ERR };
  const mentor = await getMentorByUserId(userId);
  if (!mentor?._id) return { ok: false, status: 404, error: "Không tìm thấy hồ sơ mentor." };

  const reviews = await Review.find({
    targetType: "mentor",
    targetId: mentor._id,
    isVisible: { $ne: false },
  })
    .sort({ createdAt: -1 })
    .lean();

  const reviewerIds = Array.from(
    new Set(reviews.map((r) => String(r.userId || "")).filter((id) => mongoose.isValidObjectId(id))),
  );
  const users = await User.find({ _id: { $in: reviewerIds } })
    .select("name avatar desiredPosition currentCompany")
    .lean();
  const userMap = new Map(users.map((u) => [String(u._id), u]));

  const items = reviews.map((r) => {
    const u = userMap.get(String(r.userId)) || {};
    return {
      id: String(r._id),
      mentee: {
        name: u.name || u.email || "Thành viên",
        avatar: u.avatar || "",
      },
      position: u.desiredPosition || "",
      company: u.currentCompany || "",
      rating: Number(r.rating || 0),
      comment: r.comment || "",
      wouldRecommend: Number(r.rating || 0) >= 4,
      reviewDate: r.createdAt,
      reply: r.reply?.content ? { content: r.reply.content, repliedAt: r.reply.repliedAt } : null,
    };
  });

  const stats = mentor.stats || {};
  return {
    ok: true,
    items,
    summary: {
      avgRating: Number(stats.rating ?? 0),
      reviewCount: Number(stats.reviewCount ?? items.length),
    },
  };
}

