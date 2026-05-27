import mongoose from "mongoose";
import { Booking } from "../models/Booking.js";
import { Course } from "../models/Course.js";
import { Enrollment } from "../models/Enrollment.js";
import { Mentor } from "../models/Mentor.js";

function parseFeeRate(envVal, fallback) {
  const n = Number(String(envVal ?? "").trim());
  if (!Number.isFinite(n) || n < 0 || n > 1) return fallback;
  return n;
}

/** Tiền mentor nhận sau phí nền tảng (VAT là phần thu của KH, không trừ thêm ở đây). */
export function mentorNetFromBooking(booking) {
  const price = Math.round(Number(booking?.price || 0));
  const platformFee = Math.round(Number(booking?.platformFee || 0));
  return Math.max(0, price - platformFee);
}

export function mentorNetFromCourseSale(pricePaid) {
  const gross = Math.round(Number(pricePaid || 0));
  if (gross <= 0) return 0;
  const platformRate = parseFeeRate(
    process.env.COURSE_PLATFORM_FEE_RATE ?? process.env.BOOKING_PLATFORM_FEE_RATE,
    0.15,
  );
  const pf = Math.round(gross * platformRate);
  return Math.max(0, gross - pf);
}

/**
 * Ghi có ví mentor khi buổi đã hoàn thành và đã thanh toán.
 * Idempotent: `mentorEarningsCreditedAt` trên Booking.
 */
export async function tryCreditMentorForCompletedBooking(bookingId) {
  if (!mongoose.isValidObjectId(bookingId)) return { ok: false, error: "bookingId không hợp lệ." };
  const booking = await Booking.findById(bookingId)
    .select("mentorId status paymentStatus price platformFee mentorEarningsCreditedAt")
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

  const mark = await Booking.updateOne(
    {
      _id: bookingId,
      mentorEarningsCreditedAt: { $exists: false },
      status: "completed",
      paymentStatus: "paid",
    },
    { $set: { mentorEarningsCreditedAt: new Date() } },
  );
  if (mark.modifiedCount !== 1) return { ok: true, skipped: true, race: true };

  await Mentor.updateOne(
    { _id: booking.mentorId },
    { $inc: { "finance.availableBalance": net, "finance.totalEarned": net } },
  );
  return { ok: true, credited: net };
}

/**
 * Ghi có ví mentor khi học phí khóa (CK) đã được admin xác nhận.
 * Idempotent: `mentorEarningsCreditedAt` trên Enrollment.
 */
export async function tryCreditMentorForPaidEnrollment(enrollmentId) {
  if (!mongoose.isValidObjectId(enrollmentId)) return { ok: false, error: "enrollmentId không hợp lệ." };
  const row = await Enrollment.findById(enrollmentId)
    .select("courseId pricePaid paymentStatus mentorEarningsCreditedAt")
    .lean();
  if (!row || row.paymentStatus !== "paid") return { ok: true, skipped: true };
  if (row.mentorEarningsCreditedAt) return { ok: true, skipped: true, already: true };

  const gross = Math.round(Number(row.pricePaid || 0));
  const net = mentorNetFromCourseSale(gross);

  const mark = await Enrollment.updateOne(
    { _id: enrollmentId, mentorEarningsCreditedAt: { $exists: false }, paymentStatus: "paid" },
    { $set: { mentorEarningsCreditedAt: new Date() } },
  );
  if (mark.modifiedCount !== 1) return { ok: true, skipped: true, race: true };

  const course = await Course.findById(row.courseId).select("mentorId").lean();
  if (!course?.mentorId) {
    console.error("[tryCreditMentorForPaidEnrollment] course missing mentorId", enrollmentId);
    return { ok: false, error: "Không tìm thấy mentor của khóa học." };
  }

  if (net > 0) {
    await Mentor.updateOne(
      { _id: course.mentorId },
      { $inc: { "finance.availableBalance": net, "finance.totalEarned": net } },
    );
  }
  if (gross > 0) {
    await Course.updateOne({ _id: row.courseId }, { $inc: { "stats.totalRevenue": gross } });
  }
  return { ok: true, credited: net, gross };
}
