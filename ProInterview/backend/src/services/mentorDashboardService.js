import mongoose from "mongoose";
import { Mentor } from "../models/Mentor.js";
import { Booking } from "../models/Booking.js";
import { PayoutRequest } from "../models/PayoutRequest.js";
import { Review } from "../models/Review.js";
import { Course } from "../models/Course.js";
import { MentorPeerReview } from "../models/MentorPeerReview.js";
import { User } from "../models/User.js";

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

function hasValidPayoutAccount(account) {
  const accountNumberOk = /^\d{8,19}$/.test(account.accountNumber || "");
  const accountNameOk = (account.accountName || "").length >= 2;
  const bankOk = SUPPORTED_BANKS.has(account.bankName || "");
  return Boolean(bankOk && accountNumberOk && accountNameOk);
}

async function getMentorByUserId(userId) {
  const uid = String(userId ?? "").trim();
  if (!mongoose.isValidObjectId(uid)) return null;
  return Mentor.findOne({ userId: uid }).lean();
}

export async function getMentorDashboard(userId) {
  if (!isMongoReady()) return { ok: false, status: 503, error: MONGO_ERR };
  const mentor = await getMentorByUserId(userId);
  if (!mentor?._id) return { ok: false, status: 404, error: "Không tìm thấy hồ sơ mentor." };

  const total = await Booking.countDocuments({ mentorId: mentor._id });
  const completed = await Booking.countDocuments({ mentorId: mentor._id, status: "completed" });
  const upcoming = await Booking.find({
    mentorId: mentor._id,
    status: { $in: ["pending", "confirmed", "in_progress"] },
  })
    .populate({ path: "userId", select: "name email avatar" })
    .sort({ date: 1, timeSlot: 1 })
    .limit(10)
    .lean();

  const { toPublicBooking } = await import("./bookingsService.js");

  const reviews = await Review.find({ targetType: "mentor", targetId: mentor._id, isVisible: { $ne: false } })
    .select("rating")
    .lean();
  const reviewCount = reviews.length;
  const avgRating = reviewCount ? reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviewCount : 0;

  return {
    ok: true,
    dashboard: {
      totalSessions: total,
      completedSessions: completed,
      reviewCount,
      avgRating: Math.round(avgRating * 10) / 10,
      upcomingBookings: upcoming.map(b => toPublicBooking(b)),
    },
  };
}

export async function getMentorFinance(userId) {
  if (!isMongoReady()) return { ok: false, status: 503, error: MONGO_ERR };
  const mentor = await getMentorByUserId(userId);
  if (!mentor?._id) return { ok: false, status: 404, error: "Không tìm thấy hồ sơ mentor." };

  // Minimal finance: use mentor.finance snapshot + derive totals from bookings
  const completed = await Booking.find({ mentorId: mentor._id, status: "completed" }).select("price platformFee vat totalAmount createdAt").lean();
  const totalEarned = completed.reduce((s, b) => s + Number(b.price || 0), 0);
  const totalSessions = completed.length;

  const payouts = await PayoutRequest.find({ mentorId: mentor._id })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  const incomeRows = completed.slice(0, 50).map((b) => ({
    id: String(b._id),
    type: "income",
    amount: Number(b.price || 0),
    status: "completed",
    date: b.createdAt,
    description: "Thu từ booking",
  }));
  const payoutRows = payouts.map(toPayoutHistoryRow);
  const history = [...incomeRows, ...payoutRows]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 100);

  return {
    ok: true,
    finance: {
      availableBalance: mentor.finance?.availableBalance ?? 0,
      pendingBalance: mentor.finance?.pendingBalance ?? 0,
      totalEarned: mentor.finance?.totalEarned ?? totalEarned,
      payoutAccount: normalizePayoutAccount(mentor.finance?.bankAccount || {}),
      payoutAccountMasked: maskAccountNumber(mentor.finance?.bankAccount?.accountNumber || ""),
      payoutAccountOwnerName: sanitizeText(mentor.name || ""),
      totalSessions,
      history,
    },
  };
}

export async function getMentorAnalytics(userId) {
  if (!isMongoReady()) return { ok: false, status: 503, error: MONGO_ERR };
  const mentor = await getMentorByUserId(userId);
  if (!mentor?._id) return { ok: false, status: 404, error: "Không tìm thấy hồ sơ mentor." };

  const bookings = await Booking.find({ mentorId: mentor._id })
    .select("userId status createdAt completedAt")
    .lean();
  const mentorReviews = await Review.find({ targetType: "mentor", targetId: mentor._id, isVisible: { $ne: false } })
    .select("userId rating createdAt")
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

  const menteeAnalytics = menteeIds.map((uid) => {
    const rows = bookings.filter((b) => String(b.userId) === uid);
    const done = rows.filter((r) => r.status === "completed").length;
    const cancelledCount = rows.filter((r) => r.status === "cancelled").length;
    const reviews = reviewsByUser.get(uid) || [];
    const avgStar = reviews.length
      ? reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / reviews.length
      : done
        ? 4
        : 3.5;
    const u = menteeMap.get(uid) || {};
    const base = Math.max(2.5, Math.min(5, avgStar));
    const history = [0, 1, 2, 3].map((idx) => ({
      date: `W${idx + 1}`,
      situation: Math.max(1, Math.min(5, Number((base - 0.4 + idx * 0.15).toFixed(1)))),
      task: Math.max(1, Math.min(5, Number((base - 0.3 + idx * 0.12).toFixed(1)))),
      action: Math.max(1, Math.min(5, Number((base - 0.5 + idx * 0.18).toFixed(1)))),
      result: Math.max(1, Math.min(5, Number((base - 0.2 + idx * 0.14).toFixed(1)))),
    }));
    return {
      menteeId: uid,
      menteeName: u.name || "Mentee",
      menteeAvatar: u.avatar || "",
      totalSessions: rows.length,
      avgStarScore: Number(avgStar.toFixed(1)),
      progressTrend: done >= Math.max(1, cancelledCount) ? "improving" : "stable",
      lastSessionDate: rows
        .map((r) => r.completedAt || r.createdAt)
        .filter(Boolean)
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] || new Date(),
      strengths: ["Giao tiếp tự tin", "Cấu trúc câu trả lời rõ ràng"],
      weaknesses: ["Cần thêm ví dụ định lượng", "Tối ưu cách trình bày phần Action"],
      starHistory: history,
    };
  });

  const now = new Date();
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

  const topAvg = menteeAnalytics.length
    ? Math.max(...menteeAnalytics.map((m) => Number(m.avgStarScore || 0)))
    : 0;

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
  const availableBalance = Number(mentor.finance?.availableBalance || 0);
  if (roundedAmount > availableBalance) {
    return { ok: false, status: 400, error: "Số dư khả dụng không đủ để rút." };
  }

  const payoutAccount = normalizePayoutAccount(mentor.finance?.bankAccount || {});
  if (!hasValidPayoutAccount(payoutAccount)) {
    return { ok: false, status: 400, error: "Vui lòng cập nhật tài khoản nhận tiền trước khi rút." };
  }

  const payout = await PayoutRequest.create({
    mentorId: mentor._id,
    amount: roundedAmount,
    status: "pending",
    payoutAccount,
    requestedAt: new Date(),
  });

  await Mentor.updateOne(
    { _id: mentor._id },
    {
      $inc: {
        "finance.availableBalance": -roundedAmount,
        "finance.pendingBalance": roundedAmount,
      },
    },
  );

  return { ok: true, payout: { id: String(payout._id), amount: roundedAmount, status: payout.status, payoutAccount } };
}

export async function updatePayoutAccount(userId, body) {
  if (!isMongoReady()) return { ok: false, status: 503, error: MONGO_ERR };
  const mentor = await getMentorByUserId(userId);
  if (!mentor?._id) return { ok: false, status: 404, error: "Không tìm thấy hồ sơ mentor." };

  const payoutAccount = normalizePayoutAccount({
    ...(body || {}),
    accountName: sanitizeText(mentor.name || ""),
  });
  if (!hasValidPayoutAccount(payoutAccount)) {
    return {
      ok: false,
      status: 400,
      error: "Thông tin tài khoản chưa hợp lệ. Chỉ hỗ trợ ngân hàng nội địa trong danh sách và số tài khoản 8-19 chữ số.",
    };
  }

  await Mentor.updateOne(
    { _id: mentor._id },
    {
      $set: {
        "finance.bankAccount.bankName": payoutAccount.bankName,
        "finance.bankAccount.accountNumber": payoutAccount.accountNumber,
        "finance.bankAccount.accountName": payoutAccount.accountName,
      },
    },
  );

  return { ok: true, payoutAccount };
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

