import mongoose from "mongoose";
import { Report } from "../models/Report.js";
import { Mentor } from "../models/Mentor.js";
import { Booking } from "../models/Booking.js";
import { Review } from "../models/Review.js";
import { Course } from "../models/Course.js";
import { Notification } from "../models/Notification.js";

const MONGO_ERR = "MongoDB chưa kết nối. Kiểm tra MONGO_URI trong .env.";
function isMongoReady() {
  return mongoose.connection.readyState === 1;
}

export async function createReport(userId, body) {
  if (!isMongoReady()) return { ok: false, status: 503, error: MONGO_ERR };
  const uid = String(userId ?? "").trim();
  if (!mongoose.isValidObjectId(uid)) return { ok: false, status: 401, error: "Phiên đăng nhập không hợp lệ." };

  const targetType = String(body?.targetType ?? "mentor").trim();
  if (!["mentor", "booking", "review", "course"].includes(targetType)) {
    return { ok: false, status: 400, error: "targetType không hợp lệ." };
  }

  let targetIdRaw = String(body?.targetId ?? body?.mentorId ?? "").trim();
  if (!targetIdRaw) return { ok: false, status: 400, error: "Thiếu targetId." };

  // Resolve mentor publicId → _id
  if (targetType === "mentor" && !mongoose.isValidObjectId(targetIdRaw)) {
    const m = await Mentor.findOne({ publicId: targetIdRaw }).select("_id").lean();
    if (!m) return { ok: false, status: 404, error: "Không tìm thấy mentor." };
    targetIdRaw = String(m._id);
  }
  if (!mongoose.isValidObjectId(targetIdRaw)) return { ok: false, status: 400, error: "targetId không hợp lệ." };

  const ENDED_STATUSES = ["completed", "no_show"];

  if (targetType === "mentor") {
    const m = await Mentor.findById(targetIdRaw).select("_id").lean();
    if (!m) return { ok: false, status: 404, error: "Không tìm thấy mentor." };
    const hadSession = await Booking.exists({
      userId: uid,
      mentorId: targetIdRaw,
      status: { $in: ENDED_STATUSES },
    });
    if (!hadSession) {
      return {
        ok: false,
        status: 403,
        error: "Bạn cần đã học ít nhất 1 buổi với mentor này (đã hoàn thành hoặc no-show) mới báo cáo được.",
      };
    }
  } else if (targetType === "booking") {
    const b = await Booking.findById(targetIdRaw).select("userId mentorId status").lean();
    if (!b) return { ok: false, status: 404, error: "Không tìm thấy booking." };
    const isCustomer = String(b.userId) === uid;
    let isTheirMentor = false;
    if (!isCustomer) {
      const mentorDoc = await Mentor.findOne({ userId: uid }).select("_id").lean();
      isTheirMentor = Boolean(mentorDoc && String(b.mentorId) === String(mentorDoc._id));
    }
    if (!isCustomer && !isTheirMentor) {
      return { ok: false, status: 403, error: "Chỉ báo cáo booking mà bạn tham gia (với tư cách khách hoặc mentor)." };
    }
    if (!ENDED_STATUSES.includes(b.status)) {
      return { ok: false, status: 400, error: "Chỉ báo cáo buổi hẹn đã diễn ra (hoàn thành hoặc no-show)." };
    }
  } else if (targetType === "review") {
    const rev = await Review.findById(targetIdRaw).select("userId").lean();
    if (!rev) return { ok: false, status: 404, error: "Không tìm thấy review." };
    if (String(rev.userId) === uid) {
      return { ok: false, status: 400, error: "Không báo cáo review do chính bạn viết." };
    }
  } else if (targetType === "course") {
    const c = await Course.findById(targetIdRaw).select("_id").lean();
    if (!c) return { ok: false, status: 404, error: "Không tìm thấy khóa học." };
  }

  const reason = String(body?.reason ?? body?.category ?? "").trim();
  const allow = new Set(["late", "unprofessional", "inappropriate", "no_show", "fraud", "other"]);
  if (!allow.has(reason)) {
    return { ok: false, status: 400, error: "reason không hợp lệ." };
  }

  const title = typeof body?.title === "string" ? body.title.trim().slice(0, 120) : "";
  const descRaw = typeof body?.description === "string" ? body.description.trim() : "";
  if (!descRaw || descRaw.length < 10) {
    return { ok: false, status: 400, error: "description quá ngắn." };
  }
  const description = title ? `Tiêu đề: ${title}\n\n${descRaw}` : descRaw;
  const evidenceUrls = Array.isArray(body?.evidenceUrls)
    ? body.evidenceUrls.map((u) => String(u).trim()).filter(Boolean).slice(0, 10)
    : [];

  const doc = await Report.create({
    reportedBy: uid,
    targetType,
    targetId: targetIdRaw,
    reason,
    description: description.slice(0, 8000),
    evidenceUrls,
  });

  if (targetType === "mentor") {
    await maybeAutoPauseMentor(targetIdRaw);
  }

  return { ok: true, reportId: String(doc._id) };
}

/** Số người khác nhau đã report 1 mentor mà report còn đang mở (chưa xử lý). */
const AUTO_PAUSE_REPORTER_THRESHOLD = 3;

/**
 * Nhiều người report cùng 1 mentor (còn mở, chưa admin xử lý) → tự đặt cờ
 * `autoSuspended` chờ admin xem xét. CHỈ chặn *lịch mới* + ẩn khỏi danh sách
 * tìm mentor (`isBookableMentorDoc`, `createBooking`) — KHÔNG đụng `isActive`,
 * nên buổi học đã đặt lịch từ trước (học viên đã trả tiền) vẫn vào họp/hoàn
 * thành bình thường, và mentor vẫn rút được tiền đã kiếm hợp lệ trước đó.
 * Admin xem chi tiết & quyết định mở lại hoặc khoá hẳn (`isActive`) ở trang gộp báo cáo.
 */
async function maybeAutoPauseMentor(mentorId) {
  if (!mongoose.isValidObjectId(mentorId)) return;
  const mentor = await Mentor.findById(mentorId).select("autoSuspended userId").lean();
  if (!mentor || mentor.autoSuspended === true) return; // đã bị auto-suspend rồi, khỏi đếm lại

  const distinctReporters = await Report.distinct("reportedBy", {
    targetType: "mentor",
    targetId: mentorId,
    status: { $in: ["pending", "reviewing"] },
  });
  if (distinctReporters.length < AUTO_PAUSE_REPORTER_THRESHOLD) return;

  await Mentor.updateOne(
    { _id: mentorId },
    { $set: { autoSuspended: true, autoSuspendedAt: new Date() } },
  );
  if (mentor.userId) {
    await Notification.create({
      userId: mentor.userId,
      type: "system",
      title: "Hồ sơ tạm ngưng nhận lịch mới",
      body: `Hồ sơ của bạn nhận được ${distinctReporters.length} báo cáo từ những người khác nhau và đang được admin xem xét. Bạn tạm thời không nhận lịch mới, nhưng vẫn vào họp/rút tiền các buổi đã đặt trước đó bình thường.`,
      metadata: { mentorId, reason: "auto_pause_reports" },
    });
  }
}

/**
 * Sau khi admin xử lý xong 1 report mentor: nếu không còn report mở nào dưới
 * ngưỡng auto-pause nữa VÀ việc tạm khoá trước đó là do hệ thống tự làm →
 * tự bỏ cờ `autoSuspended`. Admin khoá tay (`isActive=false`) thì tự xử lý riêng.
 */
async function maybeAutoResumeMentor(mentorId) {
  if (!mongoose.isValidObjectId(mentorId)) return;
  const mentor = await Mentor.findById(mentorId).select("autoSuspended userId").lean();
  if (!mentor || !mentor.autoSuspended) return;

  const distinctReporters = await Report.distinct("reportedBy", {
    targetType: "mentor",
    targetId: mentorId,
    status: { $in: ["pending", "reviewing"] },
  });
  if (distinctReporters.length >= AUTO_PAUSE_REPORTER_THRESHOLD) return;

  await Mentor.updateOne(
    { _id: mentorId },
    { $set: { autoSuspended: false }, $unset: { autoSuspendedAt: "" } },
  );
  if (mentor.userId) {
    await Notification.create({
      userId: mentor.userId,
      type: "system",
      title: "Hồ sơ đã được mở lại",
      body: "Các báo cáo trước đó đã được admin xử lý xong — bạn có thể nhận lịch bình thường trở lại.",
      metadata: { mentorId, reason: "auto_resume_reports" },
    });
  }
}

async function notifyReporterOnReportClosed(report, status, resolution) {
  try {
    const reporterId = report.reportedBy?._id ?? report.reportedBy;
    if (!reporterId) return;
    const isResolved = status === "resolved";
    await Notification.create({
      userId: reporterId,
      type: "system",
      title: isResolved ? "Báo cáo đã được xử lý" : "Cập nhật báo cáo",
      body: isResolved
        ? resolution || "Đội ngũ ProInterview đã xem xét và xử lý báo cáo của bạn."
        : resolution || "Báo cáo của bạn đã được đóng sau khi xem xét.",
      metadata: { actionUrl: "/settings" },
    });
  } catch {
    /* không chặn luồng admin */
  }
}

export async function listReportsForAdmin(query = {}) {
  if (!isMongoReady()) return { ok: false, status: 503, error: MONGO_ERR };

  const page = Math.max(Number(query?.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query?.limit) || 50, 1), 100);
  const skip = (page - 1) * limit;
  const filter = {};

  const status = String(query?.status ?? "").trim();
  const openOnly = ["true", "1", "yes"].includes(String(query?.open ?? "").trim().toLowerCase());
  const closedOnly = ["true", "1", "yes"].includes(String(query?.closed ?? "").trim().toLowerCase());
  if (openOnly) {
    filter.status = { $in: ["pending", "reviewing"] };
  } else if (closedOnly) {
    filter.status = { $in: ["resolved", "dismissed"] };
  } else if (status && ["pending", "reviewing", "resolved", "dismissed"].includes(status)) {
    filter.status = status;
  }
  const targetType = String(query?.targetType ?? "").trim();
  if (targetType && ["mentor", "booking", "review", "course"].includes(targetType)) {
    filter.targetType = targetType;
  }
  const targetId = String(query?.targetId ?? "").trim();
  if (targetId && mongoose.isValidObjectId(targetId)) {
    filter.targetId = targetId;
  }

  const [rows, total, openCount, pendingCount] = await Promise.all([
    Report.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("reportedBy", "name email role")
      .lean(),
    Report.countDocuments(filter),
    Report.countDocuments({ ...filter, status: { $in: ["pending", "reviewing"] } }),
    Report.countDocuments({ ...filter, status: "pending" }),
  ]);

  const mentorIds = [
    ...new Set(rows.filter((r) => r.targetType === "mentor").map((r) => String(r.targetId))),
  ];
  const courseIds = [
    ...new Set(rows.filter((r) => r.targetType === "course").map((r) => String(r.targetId))),
  ];
  const bookingIds = [
    ...new Set(rows.filter((r) => r.targetType === "booking").map((r) => String(r.targetId))),
  ];

  const [mentors, courses, bookings] = await Promise.all([
    mentorIds.length
      ? Mentor.find({ _id: { $in: mentorIds } })
          .populate({ path: "userId", select: "name" })
          .select("userId title")
          .lean()
      : [],
    courseIds.length ? Course.find({ _id: { $in: courseIds } }).select("title").lean() : [],
    bookingIds.length
      ? Booking.find({ _id: { $in: bookingIds } }).select("scheduledAt status").lean()
      : [],
  ]);

  const mentorMap = new Map(
    mentors.map((m) => [String(m._id), m.userId?.name || m.title || "Cố vấn"]),
  );
  const courseMap = new Map(courses.map((c) => [String(c._id), c.title || "Khóa học"]));
  const bookingMap = new Map(
    bookings.map((b) => [
      String(b._id),
      b.scheduledAt
        ? `Buổi ${new Date(b.scheduledAt).toLocaleDateString("vi-VN")} (${b.status || "—"})`
        : `Booking ${String(b._id).slice(-6)}`,
    ]),
  );

  const reports = rows.map((r) => ({
    ...r,
    targetLabel:
      r.targetType === "mentor"
        ? mentorMap.get(String(r.targetId)) || "—"
        : r.targetType === "course"
          ? courseMap.get(String(r.targetId)) || "—"
          : r.targetType === "booking"
            ? bookingMap.get(String(r.targetId)) || "—"
            : `Review ${String(r.targetId).slice(-6)}`,
  }));

  const totalPages = total > 0 ? Math.ceil(total / limit) : 1;

  return {
    ok: true,
    reports,
    counts: { total, open: openCount, pending: pendingCount },
    pagination: { page, limit, total, totalPages, hasMore: skip + rows.length < total },
  };
}

/**
 * Gộp report theo từng đối tượng bị báo cáo (mặc định mentor) — để admin thấy
 * "Mentor X — 5 báo cáo, 4 người khác nhau" thay vì phải mở từng report rời rạc.
 */
export async function listReportsGroupedForAdmin(query = {}) {
  if (!isMongoReady()) return { ok: false, status: 503, error: MONGO_ERR };

  const targetType = String(query?.targetType ?? "mentor").trim();
  if (!["mentor", "booking", "review", "course"].includes(targetType)) {
    return { ok: false, status: 400, error: "targetType không hợp lệ." };
  }
  const openOnly = ["true", "1", "yes"].includes(String(query?.open ?? "").trim().toLowerCase());

  const groups = await Report.aggregate([
    { $match: { targetType } },
    {
      $group: {
        _id: "$targetId",
        totalCount: { $sum: 1 },
        openCount: {
          $sum: { $cond: [{ $in: ["$status", ["pending", "reviewing"]] }, 1, 0] },
        },
        reporters: { $addToSet: "$reportedBy" },
        latestAt: { $max: "$createdAt" },
      },
    },
    ...(openOnly ? [{ $match: { openCount: { $gt: 0 } } }] : []),
    { $addFields: { reporterCount: { $size: "$reporters" } } },
    { $sort: { openCount: -1, totalCount: -1, latestAt: -1 } },
    { $limit: 200 },
  ]);

  const targetIds = groups.map((g) => String(g._id));
  const labelMap = new Map();
  if (targetType === "mentor") {
    const mentors = targetIds.length
      ? await Mentor.find({ _id: { $in: targetIds } })
          .populate({ path: "userId", select: "name email isActive" })
          .select("userId title isActive isVerified")
          .lean()
      : [];
    mentors.forEach((m) =>
      labelMap.set(String(m._id), {
        label: m.userId?.name || m.title || "Cố vấn",
        isActive: m.isActive !== false && m.userId?.isActive !== false,
      }),
    );
  } else if (targetType === "course") {
    const courses = targetIds.length
      ? await Course.find({ _id: { $in: targetIds } }).select("title").lean()
      : [];
    courses.forEach((c) => labelMap.set(String(c._id), { label: c.title || "Khóa học" }));
  } else if (targetType === "booking") {
    const bookings = targetIds.length
      ? await Booking.find({ _id: { $in: targetIds } }).select("scheduledAt status").lean()
      : [];
    bookings.forEach((b) =>
      labelMap.set(String(b._id), {
        label: b.scheduledAt
          ? `Buổi ${new Date(b.scheduledAt).toLocaleDateString("vi-VN")} (${b.status || "—"})`
          : `Booking ${String(b._id).slice(-6)}`,
      }),
    );
  }

  const groupsOut = groups.map((g) => {
    const meta = labelMap.get(String(g._id)) || {};
    return {
      targetType,
      targetId: String(g._id),
      targetLabel: meta.label || (targetType === "review" ? `Review ${String(g._id).slice(-6)}` : "—"),
      isActive: meta.isActive,
      totalCount: g.totalCount,
      openCount: g.openCount,
      reporterCount: g.reporterCount,
      latestAt: g.latestAt,
    };
  });

  return { ok: true, groups: groupsOut };
}

export async function updateReportStatusForAdmin(adminUserId, reportId, body = {}) {
  if (!isMongoReady()) return { ok: false, status: 503, error: MONGO_ERR };
  if (!mongoose.isValidObjectId(reportId)) {
    return { ok: false, status: 400, error: "reportId không hợp lệ." };
  }

  const status = String(body?.status || "").trim();
  const allowed = new Set(["reviewing", "resolved", "dismissed"]);
  if (!allowed.has(status)) {
    return { ok: false, status: 400, error: "status phải là reviewing, resolved hoặc dismissed." };
  }

  const resolution = String(body?.resolution || "").trim().slice(0, 2000);
  const doc = await Report.findById(reportId);
  if (!doc) return { ok: false, status: 404, error: "Không tìm thấy báo cáo." };

  doc.status = status;
  if (status === "resolved" || status === "dismissed") {
    doc.resolvedBy = adminUserId;
    doc.resolvedAt = new Date();
    doc.resolution =
      resolution ||
      (status === "dismissed" ? "Admin đã bác bỏ báo cáo." : "Admin đã xử lý báo cáo.");
  } else {
    doc.resolution = resolution || doc.resolution || "";
  }

  await doc.save();

  const report = await Report.findById(doc._id)
    .populate("reportedBy", "name email role")
    .lean();

  if (status === "resolved" || status === "dismissed") {
    await notifyReporterOnReportClosed(report, status, doc.resolution);
    if (doc.targetType === "mentor") {
      await maybeAutoResumeMentor(doc.targetId);
    }
  }

  return { ok: true, report };
}

