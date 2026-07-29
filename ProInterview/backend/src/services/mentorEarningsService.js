import mongoose from "mongoose";
import { Booking } from "../models/Booking.js";
import { Course } from "../models/Course.js";
import { Enrollment } from "../models/Enrollment.js";
import { Mentor } from "../models/Mentor.js";
import { resolveCoursePlatformFeeRate } from "./mentorCommissionService.js";

function parseFeeRate(envVal, fallback) {
  const n = Number(String(envVal ?? "").trim());
  if (!Number.isFinite(n) || n < 0 || n > 1) return fallback;
  return n;
}

/** Số ngày giữ tiền trước khi mentor rút được (bảo vệ trước report/tranh chấp). */
export const EARNINGS_HOLD_DAYS = 3;

function addHoldDays(from) {
  const base = from instanceof Date && !Number.isNaN(from.getTime()) ? from : new Date();
  return new Date(base.getTime() + EARNINGS_HOLD_DAYS * 24 * 60 * 60 * 1000);
}

/** Tiền mentor nhận sau phí nền tảng (VAT là phần thu của KH, không trừ thêm ở đây). */
export function mentorNetFromBooking(booking) {
  const gross = Math.round(Number(booking?.totalAmount ?? booking?.price ?? 0));
  const platformFee = Math.round(Number(booking?.platformFee || 0));
  return Math.max(0, gross - platformFee);
}

export function mentorNetFromCourseSale(input, mentorForFallback = null) {
  const gross = Math.round(Number(input?.pricePaid ?? input ?? 0));
  if (gross <= 0) return 0;
  const explicitFee = Number(input?.platformFee);
  if (Number.isFinite(explicitFee) && explicitFee >= 0) {
    return Math.max(0, gross - Math.round(explicitFee));
  }
  const explicitRate = parseFeeRate(input?.platformFeeRate, NaN);
  if (Number.isFinite(explicitRate)) {
    return Math.max(0, gross - Math.round(gross * explicitRate));
  }
  const fallbackRate = mentorForFallback
    ? resolveCoursePlatformFeeRate(mentorForFallback).rate
    : parseFeeRate(process.env.COURSE_PLATFORM_FEE_RATE, 0.35);
  const pf = Math.round(gross * fallbackRate);
  return Math.max(0, gross - pf);
}

/**
 * Ghi có ví mentor khi buổi đã hoàn thành và đã thanh toán.
 * Idempotent: `mentorEarningsCreditedAt` trên Booking.
 */
export async function tryCreditMentorForCompletedBooking(bookingId) {
  if (!mongoose.isValidObjectId(bookingId)) return { ok: false, error: "bookingId không hợp lệ." };
  const booking = await Booking.findById(bookingId)
    .select("mentorId status paymentStatus price totalAmount platformFee mentorEarningsCreditedAt completedAt")
    .lean();
  if (!booking || booking.status !== "completed" || booking.paymentStatus !== "paid") {
    return { ok: true, skipped: true };
  }
  if (booking.mentorEarningsCreditedAt) return { ok: true, skipped: true, already: true };

  const net = mentorNetFromBooking(booking);
  if (net <= 0) {
    await Booking.updateOne({ _id: bookingId }, { $set: { mentorEarningsCreditedAt: new Date() } });
    return { ok: true, skipped: true, reason: "zero_net" };
  }

  const clearAt = addHoldDays(booking.completedAt);
  const mark = await Booking.updateOne(
    {
      _id: bookingId,
      mentorEarningsCreditedAt: { $in: [null, undefined] },
      status: "completed",
      paymentStatus: "paid",
    },
    { $set: { mentorEarningsCreditedAt: new Date(), earningsClearAt: clearAt } },
  );
  if (mark.modifiedCount !== 1) return { ok: true, skipped: true, race: true };

  // Tiền vào "đang giữ" trước — chờ đủ EARNINGS_HOLD_DAYS mới chuyển sang khả dụng (xem releaseMentorEarningsJob).
  await Mentor.updateOne(
    { _id: booking.mentorId },
    { $inc: { "finance.clearingBalance": net, "finance.totalEarned": net } },
  );
  return { ok: true, credited: net, clearAt };
}

/**
 * Ghi có ví mentor khi học phí khóa (CK) đã được admin xác nhận.
 * Idempotent: `mentorEarningsCreditedAt` trên Enrollment.
 */
export async function tryCreditMentorForPaidEnrollment(enrollmentId) {
  if (!mongoose.isValidObjectId(enrollmentId)) return { ok: false, error: "enrollmentId không hợp lệ." };
  const row = await Enrollment.findById(enrollmentId)
    .select("courseId pricePaid platformFeeRate platformFee paymentStatus mentorEarningsCreditedAt paidAt")
    .lean();
  if (!row || row.paymentStatus !== "paid") return { ok: true, skipped: true };
  if (row.mentorEarningsCreditedAt) return { ok: true, skipped: true, already: true };

  const gross = Math.round(Number(row.pricePaid || 0));
  const course = await Course.findById(row.courseId).select("mentorId").lean();
  if (!course?.mentorId) {
    console.error("[tryCreditMentorForPaidEnrollment] course missing mentorId", enrollmentId);
    return { ok: false, error: "Không tìm thấy mentor của khóa học." };
  }
  const mentor = await Mentor.findById(course.mentorId).select("pricing").lean();
  const resolvedRate =
    Number.isFinite(Number(row.platformFeeRate))
      ? Number(row.platformFeeRate)
      : resolveCoursePlatformFeeRate(mentor).rate;
  const resolvedFee = Number.isFinite(Number(row.platformFee))
    ? Math.round(Number(row.platformFee))
    : Math.round(gross * resolvedRate);
  const net = mentorNetFromCourseSale(
    { pricePaid: gross, platformFeeRate: resolvedRate, platformFee: resolvedFee },
    mentor,
  );

  // Tính mốc giữ tiền từ ngày THANH TOÁN, không phải ngày học xong — khóa học có thể học kéo dài
  // nhiều tuần hoặc không bao giờ hoàn thành, nên không thể chờ "học xong" mới bắt đầu đếm 3 ngày.
  const clearAt = addHoldDays(row.paidAt);
  const mark = await Enrollment.updateOne(
    { _id: enrollmentId, mentorEarningsCreditedAt: { $in: [null, undefined] }, paymentStatus: "paid" },
    {
      $set: {
        mentorEarningsCreditedAt: new Date(),
        platformFeeRate: resolvedRate,
        platformFee: resolvedFee,
        earningsClearAt: clearAt,
      },
    },
  );
  if (mark.modifiedCount !== 1) return { ok: true, skipped: true, race: true };

  if (net > 0) {
    await Mentor.updateOne(
      { _id: course.mentorId },
      { $inc: { "finance.clearingBalance": net, "finance.totalEarned": net } },
    );
  }
  if (gross > 0) {
    await Course.updateOne({ _id: row.courseId }, { $inc: { "stats.totalRevenue": gross } });
  }
  return { ok: true, credited: net, gross };
}

/** Mentor đang có report mở (pending/reviewing) — nhắm thẳng vào mentor hoặc vào chính buổi/khóa này. */
async function hasOpenReportBlocking({ mentorId, targetType, targetId }) {
  const { Report } = await import("../models/Report.js");
  const count = await Report.countDocuments({
    status: { $in: ["pending", "reviewing"] },
    $or: [
      { targetType: "mentor", targetId: mentorId },
      { targetType, targetId },
    ],
  });
  return count > 0;
}

/**
 * Quét các buổi/khóa đã đủ `EARNINGS_HOLD_DAYS` kể từ lúc ghi có (`earningsClearAt` đã tới),
 * chưa release (`earningsClearedAt` rỗng) — không có report mở thì chuyển tiền từ
 * `clearingBalance` sang `availableBalance`; có report mở thì bỏ qua, job lần sau quét lại.
 * Gọi định kỳ từ `jobs/earningsClearanceJob.js`.
 */
export async function releaseEligibleEarnings() {
  const now = new Date();
  let releasedCount = 0;
  let heldCount = 0;

  const bookings = await Booking.find({
    earningsClearAt: { $lte: now },
    earningsClearedAt: { $in: [null, undefined] },
    mentorEarningsCreditedAt: { $ne: null },
  }).select("mentorId totalAmount price platformFee");

  for (const b of bookings) {
    const blocked = await hasOpenReportBlocking({ mentorId: b.mentorId, targetType: "booking", targetId: b._id });
    if (blocked) { heldCount++; continue; }
    const net = mentorNetFromBooking(b);
    if (net > 0) {
      await Mentor.updateOne(
        { _id: b.mentorId },
        { $inc: { "finance.clearingBalance": -net, "finance.availableBalance": net } },
      );
    }
    await Booking.updateOne({ _id: b._id }, { $set: { earningsClearedAt: now } });
    releasedCount++;
  }

  const enrollments = await Enrollment.find({
    earningsClearAt: { $lte: now },
    earningsClearedAt: { $in: [null, undefined] },
    mentorEarningsCreditedAt: { $ne: null },
  }).select("courseId pricePaid platformFeeRate platformFee");

  for (const e of enrollments) {
    const course = await Course.findById(e.courseId).select("mentorId").lean();
    if (!course?.mentorId) continue;
    const blocked = await hasOpenReportBlocking({ mentorId: course.mentorId, targetType: "course", targetId: e.courseId });
    if (blocked) { heldCount++; continue; }
    const net = mentorNetFromCourseSale({ pricePaid: e.pricePaid, platformFeeRate: e.platformFeeRate, platformFee: e.platformFee });
    if (net > 0) {
      await Mentor.updateOne(
        { _id: course.mentorId },
        { $inc: { "finance.clearingBalance": -net, "finance.availableBalance": net } },
      );
    }
    await Enrollment.updateOne({ _id: e._id }, { $set: { earningsClearedAt: now } });
    releasedCount++;
  }

  return { ok: true, releasedCount, heldCount };
}
