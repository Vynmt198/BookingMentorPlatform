import mongoose from "mongoose";
import { sendMentorFeedbackEmail } from "./emailService.js";
import fs from "fs";
import { Booking } from "../models/Booking.js";
import { Mentor } from "../models/Mentor.js";
import { Review } from "../models/Review.js";
import { User } from "../models/User.js";
import { Notification } from "../models/Notification.js";
import { Payment } from "../models/Payment.js";
import { ensureMentorProfilesForAllMentorUsers } from "./mentorProfileService.js";
import { recordAdminTransferSuccess, recordTransferPending, recordTransferSubmitted } from "./paymentsService.js";
import { tryCreditMentorForCompletedBooking } from "./mentorEarningsService.js";
import { deliverNotification } from "./notificationDeliveryService.js";
import { mergeNotificationPrefs } from "../constants/notificationPrefs.js";
import { resolveStoredUploadUrl } from "../utils/resolveStoredUploadUrl.js";
import { isBookingInLiveWindow, isBookingSlotInFuture, isBookingCompletable } from "../utils/bookingSchedule.js";
import { newPaymentExpiresAt, TRANSFER_PAYMENT_TIMEOUT_MS } from "../utils/transferPaymentExpiry.js";
import { expireBookingTransferIfNeeded } from "./transferPaymentExpiryService.js";
import { resolveBookingPlatformFeeRate } from "./mentorCommissionService.js";
import { releaseMentorSessionQuota, resolveMentorBookingDiscountForUser } from "../utils/planGuard.js";
import { buildJaasMeetingLaunch } from "./jaasService.js";

/**
 * Chính sách hủy (User) — đồng bộ `frontend/src/app/constants/bookingPolicy.js`:
 * ≥24h → hoàn 100%; 12–<24h → hoàn 50%; <12h / không tham gia → không hoàn.
 */
function userCancellationFeePercent(hoursUntilStart) {
  if (!Number.isFinite(hoursUntilStart)) return 100;
  if (hoursUntilStart < 0) return 100;
  if (hoursUntilStart < 12) return 100;
  if (hoursUntilStart < 24) return 50;
  return 0;
}

/**
 * Hủy các booking CK "pending" đã quá hạn 15' trước khi trả danh sách — tránh đơn chưa
 * thanh toán (chỉ giữ chỗ tạm) hiển thị như buổi hẹn thật mãi mãi ở "Sắp tới" (customer)
 * hay lịch mentor, dù không ai chuyển khoản đúng hạn (trước đây chỉ được dọn lúc đặt trùng
 * slot hoặc qua webhook SePay — không tự dọn khi chỉ load danh sách).
 */
async function sweepExpiredTransferBookings(filter) {
  const now = new Date();
  const stale = await Booking.find({
    ...filter,
    status: "pending",
    paymentStatus: "pending",
    paymentMethod: "transfer",
    // Đơn cũ tạo trước khi có field `paymentExpiresAt` sẽ không khớp `paymentExpiresAt: {$lt}`
    // (Mongo không so khớp field thiếu) — fallback theo createdAt + timeout, khớp đúng logic
    // resolvePaymentExpiresAt() dùng khi expire từng booking lẻ.
    $or: [
      { paymentExpiresAt: { $lt: now } },
      { paymentExpiresAt: { $exists: false }, createdAt: { $lt: new Date(now.getTime() - TRANSFER_PAYMENT_TIMEOUT_MS) } },
    ],
  });
  for (const booking of stale) {
    await expireBookingTransferIfNeeded(booking);
  }
}

const FEEDBACK_REMINDER_DAYS = 3;

/**
 * Nhắc mentor (1 lần/booking) khi buổi đã completed quá `FEEDBACK_REMINDER_DAYS` ngày
 * mà chưa gửi mentorSummary — chỉ nhắc nhở, không khóa hay giữ thu nhập của mentor.
 */
async function sweepOverdueMentorFeedback(filter) {
  const threshold = new Date(Date.now() - FEEDBACK_REMINDER_DAYS * 24 * 60 * 60 * 1000);
  const overdue = await Booking.find({
    ...filter,
    status: "completed",
    completedAt: { $lt: threshold },
    "mentorSummary.submittedAt": { $exists: false },
    feedbackReminderSentAt: { $exists: false },
  })
    .populate({ path: "mentorId", select: "userId" })
    .populate({ path: "userId", select: "name" });

  for (const booking of overdue) {
    const mentorUserId = booking.mentorId?.userId;
    booking.feedbackReminderSentAt = new Date();
    await booking.save();

    if (mentorUserId) {
      await notifyMentorBooking(mentorUserId, "session_reminder", {
        type: "feedback_reminder",
        title: "Quá hạn gửi tổng kết buổi học",
        body: `Buổi học với ${booking.userId?.name || "học viên"} đã hoàn thành hơn ${FEEDBACK_REMINDER_DAYS} ngày nhưng bạn chưa gửi tổng kết. Hãy gửi sớm để học viên nhận được phản hồi.`,
        metadata: {
          bookingId: booking._id,
          actionUrl: `/mentor/session-feedback/${booking._id}`,
        },
      });
    }

    // Học viên đang chờ mà không biết gì — báo trung tính, không nói mentor "trễ hạn" để tránh mất niềm tin oan.
    if (booking.userId?._id) {
      await notifyBookingOwner(booking.userId._id, {
        type: "feedback",
        title: "Buổi học của bạn đang được hoàn thiện đánh giá",
        body: "Buổi học đã hoàn thành và mentor đang chuẩn bị tổng kết cho bạn. Chúng tôi đã nhắc mentor gửi sớm — bạn sẽ nhận được thông báo ngay khi có.",
        metadata: {
          bookingId: booking._id,
          actionUrl: `/session/${booking._id}`,
        },
      });
    }
  }
}

const MONGO_ERR = "MongoDB chưa kết nối. Kiểm tra MONGO_URI trong .env.";
/**
 * Ngưỡng mentor hủy (phân nhánh ≥24h vs <24h) — đồng bộ bookingPolicy MENTOR_CANCEL_POLICY_ROWS.
 * Mentor vẫn có thể hủy &lt;24h; HV được hoàn 100% ưu tiên (không chọn đổi lịch/đổi mentor).
 */
const MENTOR_CANCEL_MIN_HOURS = 24;
/** HV / mentor dời lịch: phải còn ≥ 24h trước giờ họp hiện tại của buổi. */
const RESCHEDULE_MIN_HOURS = 24;

function hoursUntilBookingStart(booking) {
  const sessionAt = parseBookingDateTime(booking?.date, booking?.timeSlot);
  if (!sessionAt || Number.isNaN(sessionAt.getTime())) return null;
  return (sessionAt.getTime() - Date.now()) / 3_600_000;
}

function assertRescheduleWindow(booking) {
  const hours = hoursUntilBookingStart(booking);
  if (hours != null && hours < RESCHEDULE_MIN_HOURS) {
    return {
      ok: false,
      status: 400,
      error: `Chỉ được đổi lịch khi còn ít nhất ${RESCHEDULE_MIN_HOURS} giờ trước giờ họp.`,
    };
  }
  return { ok: true };
}
function isMongoReady() {
  return mongoose.connection.readyState === 1;
}

const BOOKING_ACTIVE_STATUSES = new Set(["confirmed", "in_progress", "completed"]);

/** Buổi chỉ được duyệt / diễn ra sau khi thanh toán thành công (trừ đơn 0đ). */
export function assertBookingPaidBeforeActiveStatus(booking, nextStatus) {
  const next = String(nextStatus || "").toLowerCase();
  if (!BOOKING_ACTIVE_STATUSES.has(next)) return { ok: true };
  const pst = String(booking?.paymentStatus || "").toLowerCase();
  if (pst === "paid") return { ok: true };
  const amt = Math.round(Number(booking?.totalAmount ?? booking?.price ?? 0));
  if (amt <= 0) return { ok: true };
  return {
    ok: false,
    status: 400,
    error:
      "Chỉ duyệt buổi hẹn sau khi thanh toán thành công (SePay tự đối soát hoặc admin xác nhận chuyển khoản).",
  };
}

function parseRefundDestination(body) {
  const bank =
    typeof body?.refundReceiveBankName === "string" ? body.refundReceiveBankName.trim().slice(0, 80) : "";
  const raw = typeof body?.refundReceiveAccountNumber === "string" ? body.refundReceiveAccountNumber : "";
  const acct = String(raw).replace(/\D/g, "").slice(0, 24);
  const holder =
    typeof body?.refundReceiveAccountHolder === "string" ? body.refundReceiveAccountHolder.trim().slice(0, 120) : "";
  return { bank, acct, holder };
}

function isValidRefundDestination({ bank, acct, holder }) {
  return bank.length >= 2 && acct.length >= 6 && holder.length >= 2;
}

function parseFeeRate(envVal, fallback) {
  const n = Number(String(envVal ?? "").trim());
  if (!Number.isFinite(n) || n < 0 || n > 1) return fallback;
  return n;
}

/** Chuẩn hóa chuỗi ngày từ Booking.jsx (vd. "Thứ 4, 01/03" hoặc "01/03/2026"). */
export function normalizeBookingDate(raw) {
  if (typeof raw !== "string") return "";
  const s = raw.trim();
  if (!s) return "";
  const tail = s.includes(",") ? s.split(",").pop().trim() : s;
  const parts = tail.split("/").map((p) => p.trim());
  if (parts.length === 3) return `${parts[0].padStart(2, "0")}/${parts[1].padStart(2, "0")}/${parts[2]}`;
  if (parts.length === 2) return `${parts[0].padStart(2, "0")}/${parts[1].padStart(2, "0")}`;
  return tail;
}

function parseBookingDateTime(dateRaw, timeRaw) {
  const dateNorm = normalizeBookingDate(dateRaw);
  const parts = dateNorm.split("/").map((p) => Number(p));
  if (parts.length < 2 || !Number.isFinite(parts[0]) || !Number.isFinite(parts[1])) return null;
  const day = parts[0];
  const month = parts[1];
  const year = parts.length >= 3 && Number.isFinite(parts[2]) ? parts[2] : new Date().getFullYear();
  const [hour, minute] = String(timeRaw || "00:00").split(":").map((p) => Number(p));
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

/**
 * Map loại sự kiện → key cài đặt thông báo của học viên. "booking_confirmed" (xác nhận thanh
 * toán/lịch) dùng interview_reminder; "booking_reminder" (nhắc trước giờ hẹn) dùng session_upcoming;
 * "feedback" dùng mentor_feedback; mọi sự kiện hủy/đổi lịch/hoàn tiền còn lại (booking_cancelled và
 * các thông báo "system" liên quan reschedule/refund) dùng chung booking_change.
 */
function customerBookingPrefKey(type) {
  if (type === "feedback") return "mentor_feedback";
  if (type === "booking_reminder") return "session_upcoming";
  if (type === "booking_confirmed") return "interview_reminder";
  return "booking_change";
}

async function notifyBookingOwner(userId, payload) {
  if (!mongoose.isValidObjectId(String(userId || ""))) return;
  const customerPrefKey = customerBookingPrefKey(payload.type);
  await deliverNotification(userId, {
    customerPrefKey,
    type: payload.type || "system",
    title: payload.title || "Cập nhật lịch hẹn",
    body: payload.body || "",
    metadata: payload.metadata || {},
  });
}

async function notifyMentorBooking(mentorUserId, mentorPrefKey, payload) {
  if (!mongoose.isValidObjectId(String(mentorUserId || ""))) return;
  await deliverNotification(mentorUserId, {
    mentorPrefKey,
    type: payload.type || "system",
    title: payload.title || "Cập nhật lịch mentor",
    body: payload.body || "",
    metadata: payload.metadata || {},
  });
}

async function refundBookingPaymentIfNeeded(booking) {
  const ps = String(booking.paymentStatus || "").toLowerCase();
  if (ps !== "paid" && ps !== "partial_refund") {
    return { refunded: false, amount: 0 };
  }

  const pay = await Payment.findOne({
    type: "booking",
    referenceModel: "Booking",
    referenceId: booking._id,
    status: { $in: ["success", "partial_refund"] },
  }).sort({ createdAt: -1 });

  if (!pay) {
    booking.paymentStatus = "refunded";
    return { refunded: true, amount: Number(booking.totalAmount || booking.price || 0) };
  }

  const refundAmount = Math.round(Number(pay.amount || booking.totalAmount || booking.price || 0));
  pay.status = "refunded";
  pay.refundedAt = new Date();
  pay.refundAmount = refundAmount;
  const prev = pay.providerResponse && typeof pay.providerResponse === "object" ? pay.providerResponse : {};
  pay.providerResponse = { ...prev, mentorCancelFullRefund: true, at: new Date().toISOString() };
  await pay.save();

  booking.paymentStatus = "refunded";
  return { refunded: true, amount: refundAmount };
}

function refundRequestAlreadyOnBooking(booking) {
  const pst = String(booking?.paymentStatus || "").toLowerCase();
  if (pst === "refund_pending" || pst === "refunded" || pst === "partial_refund") return true;
  if (Number(booking?.cancelRefundAmountVnd || 0) > 0 && booking?.cancelledAt) return true;
  return false;
}

function settlementForExistingRefund(booking, pay) {
  const paidTotal = Math.round(Number(booking?.totalAmount ?? booking?.price ?? 0));
  const ledgerAmount = pay ? Math.round(Number(pay.amount) || paidTotal) : paidTotal;
  const refundAmountVnd = Math.round(
    Number(booking?.cancelRefundAmountVnd ?? pay?.refundAmount ?? 0),
  );
  const retainedAmountVnd = Math.max(0, ledgerAmount - refundAmountVnd);
  return {
    refundAmountVnd,
    retainedAmountVnd,
    paidTotalVnd: ledgerAmount,
    ledger: "refund_already_requested",
  };
}

async function applyUserCancellationLedger(booking, refundPercent, { dryRun = false } = {}) {
  const rp = Math.max(0, Math.min(100, Math.round(Number(refundPercent))));
  const payStatus = String(booking.paymentStatus || "").toLowerCase();
  if (!dryRun && refundRequestAlreadyOnBooking(booking)) {
    const payExisting = await Payment.findOne({
      type: "booking",
      referenceModel: "Booking",
      referenceId: booking._id,
      provider: "transfer",
    }).sort({ createdAt: -1 });
    return settlementForExistingRefund(booking, payExisting);
  }
  if (["refund_pending", "refunded", "partial_refund"].includes(payStatus)) {
    return settlementForExistingRefund(booking, null);
  }
  const paidBooking = payStatus === "paid";

  const pay = await Payment.findOne({
    type: "booking",
    referenceModel: "Booking",
    referenceId: booking._id,
    provider: "transfer",
  })
    .sort({ createdAt: -1 });

  if (pay) {
    const st = String(pay.status || "");
    if (st === "pending") {
      if (!dryRun) {
        pay.status = "cancelled";
        pay.failureReason = "user_cancel_before_capture";
        const prev = pay.providerResponse && typeof pay.providerResponse === "object" ? pay.providerResponse : {};
        pay.providerResponse = { ...prev, cancelledAt: new Date().toISOString() };
        await pay.save();
      }
      return { refundAmountVnd: 0, retainedAmountVnd: 0, paidTotalVnd: 0, ledger: "cancelled_pending_transfer" };
    }
  }

  const paidTotal = Math.round(Number(booking.totalAmount ?? booking.price ?? 0));
  let refundAmountVnd = Math.round((paidTotal * rp) / 100);
  if (refundAmountVnd > paidTotal) refundAmountVnd = paidTotal;
  let retainedAmountVnd = paidTotal - refundAmountVnd;

  if (!paidBooking || paidTotal <= 0) {
    return { refundAmountVnd: 0, retainedAmountVnd: 0, paidTotalVnd: paidTotal, ledger: "not_paid_no_settlement" };
  }

  if (!pay) {
    return { refundAmountVnd, retainedAmountVnd, paidTotalVnd: paidTotal, ledger: "no_payment_row" };
  }

  const st = String(pay.status || "");
  if (["refund_pending", "refunded", "partial_refund"].includes(st)) {
    return settlementForExistingRefund(booking, pay);
  }
  if (st !== "success") {
    return { refundAmountVnd, retainedAmountVnd, paidTotalVnd: paidTotal, ledger: `skip_payment_status_${st}` };
  }

  const ledgerAmount = Math.round(Number(pay.amount) || paidTotal);
  const refundToRecord = Math.min(refundAmountVnd, ledgerAmount);
  retainedAmountVnd = ledgerAmount - refundToRecord;

  if (refundToRecord <= 0) {
    if (!dryRun) {
      const prev = pay.providerResponse && typeof pay.providerResponse === "object" ? pay.providerResponse : {};
      pay.providerResponse = {
        ...prev,
        userCancelNoRefund: true,
        retainedAmountVnd,
        at: new Date().toISOString(),
      };
      await pay.save();
    }
    return { refundAmountVnd: 0, retainedAmountVnd, paidTotalVnd: ledgerAmount, ledger: "retained_all" };
  }

  const isFullRefund = refundToRecord >= ledgerAmount;
  if (!dryRun) {
    const prev = pay.providerResponse && typeof pay.providerResponse === "object" ? pay.providerResponse : {};
    const providerResponse = {
      ...prev,
      userCancelRefundPercent: rp,
      expectedBankRefundVnd: refundToRecord,
      retainedAmountVnd,
      settlementTarget: isFullRefund ? "refunded" : "partial_refund",
      note: "Chờ admin CK hoàn — xác nhận qua PATCH /api/admin/bookings/:id/confirm-refund",
      requestedAt: new Date().toISOString(),
    };
    const updatedPay = await Payment.findOneAndUpdate(
      { _id: pay._id, status: "success" },
      {
        $set: {
          refundAmount: refundToRecord,
          status: "refund_pending",
          refundedAt: null,
          providerResponse,
        },
      },
      { new: true },
    );
    if (!updatedPay) {
      const latest = await Payment.findById(pay._id).lean();
      if (latest && ["refund_pending", "refunded", "partial_refund"].includes(String(latest.status || ""))) {
        return settlementForExistingRefund(booking, latest);
      }
      return {
        refundAmountVnd: refundToRecord,
        retainedAmountVnd,
        paidTotalVnd: ledgerAmount,
        ledger: `skip_payment_status_${String(latest?.status || st)}`,
      };
    }
  }

  return {
    refundAmountVnd: refundToRecord,
    retainedAmountVnd,
    paidTotalVnd: ledgerAmount,
    ledger: "refund_pending",
  };
}

/** Hoàn phần chênh lẻch credit (mentor mới rẻ hơn số đã trả) — booking nguồn vẫn `paid` trên Payment success. */
async function applyPartialBankRefundPending(booking, refundAmountVnd, { reason = "rebook_credit_remainder" } = {}) {
  const refundToRecord = Math.round(Number(refundAmountVnd) || 0);
  if (refundToRecord <= 0) {
    return { refundAmountVnd: 0, retainedAmountVnd: 0, paidTotalVnd: 0, ledger: "no_remainder" };
  }
  const pay = await Payment.findOne({
    type: "booking",
    referenceModel: "Booking",
    referenceId: booking._id,
    provider: "transfer",
    status: "success",
  })
    .sort({ createdAt: -1 });
  if (!pay) {
    return { refundAmountVnd: refundToRecord, retainedAmountVnd: 0, paidTotalVnd: 0, ledger: "no_payment_row" };
  }
  const ledgerAmount = Math.round(Number(pay.amount) || Number(booking.totalAmount) || 0);
  const refund = Math.min(refundToRecord, ledgerAmount);
  const retainedAmountVnd = ledgerAmount - refund;
  const prev = pay.providerResponse && typeof pay.providerResponse === "object" ? pay.providerResponse : {};
  const updatedPay = await Payment.findOneAndUpdate(
    { _id: pay._id, status: "success" },
    {
      $set: {
        refundAmount: refund,
        status: "refund_pending",
        refundedAt: null,
        providerResponse: {
          ...prev,
          reason,
          expectedBankRefundVnd: refund,
          retainedAmountVnd,
          settlementTarget: refund >= ledgerAmount ? "refunded" : "partial_refund",
          note: "Hoàn phần credit thừa sau đổi mentor — admin CK qua confirm-refund",
          requestedAt: new Date().toISOString(),
        },
      },
    },
    { new: true },
  );
  if (!updatedPay) {
    return { refundAmountVnd: refund, retainedAmountVnd, paidTotalVnd: ledgerAmount, ledger: "skip_payment_update" };
  }
  booking.cancelRefundAmountVnd = refund;
  booking.cancelRetainedAmountVnd = retainedAmountVnd;
  booking.rebookCreditRemainderVnd = refund;
  booking.paymentStatus = refund >= ledgerAmount ? "refund_pending" : "partial_refund";
  return {
    refundAmountVnd: refund,
    retainedAmountVnd,
    paidTotalVnd: ledgerAmount,
    ledger: "refund_pending",
  };
}

function deriveBookingPaymentStatusAfterUserCancel(settlement, bookingBefore) {
  if (settlement.ledger === "cancelled_pending_transfer") return "failed";
  if (settlement.refundAmountVnd > 0) return "refund_pending";
  if (settlement.retainedAmountVnd > 0) return "paid";
  const wasPending = String(bookingBefore?.paymentStatus || "").toLowerCase() === "pending";
  if (wasPending || settlement.ledger === "not_paid_no_settlement") return "failed";
  return "paid";
}

function parseDateParts(dateRaw) {
  const norm = normalizeBookingDate(dateRaw);
  const parts = norm.split("/").map((p) => Number(p));
  if (parts.length < 2 || !Number.isFinite(parts[0]) || !Number.isFinite(parts[1])) return null;
  return {
    day: parts[0],
    month: parts[1],
    year: parts.length >= 3 && Number.isFinite(parts[2]) ? parts[2] : new Date().getFullYear(),
  };
}

function toIsoDate(dateRaw) {
  const p = parseDateParts(dateRaw);
  if (!p) return "";
  return `${String(p.year).padStart(4, "0")}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

function normalizeDateKey(raw, fallbackYear) {
  const s = String(raw || "").trim();
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const parts = s.split("/").map((p) => Number(p));
  if (parts.length >= 2 && Number.isFinite(parts[0]) && Number.isFinite(parts[1])) {
    const year = parts.length >= 3 && Number.isFinite(parts[2]) ? parts[2] : fallbackYear;
    return `${String(year).padStart(4, "0")}-${String(parts[1]).padStart(2, "0")}-${String(parts[0]).padStart(2, "0")}`;
  }
  return "";
}

function getMentorSlotsForDate(mentor, dateRaw) {
  const iso = toIsoDate(dateRaw);
  if (!iso) return null;
  const year = Number(iso.slice(0, 4));

  const blocked = Array.isArray(mentor?.blockedDates) ? mentor.blockedDates : [];
  const blockedSet = new Set(blocked.map((d) => normalizeDateKey(d, year)).filter(Boolean));
  if (blockedSet.has(iso)) return [];

  const availableSlots = mentor?.availableSlots && typeof mentor.availableSlots === "object" ? mentor.availableSlots : {};
  const entries = Object.entries(availableSlots);
  const explicit = entries.find(([k]) => normalizeDateKey(k, year) === iso);
  if (explicit) {
    return Array.isArray(explicit[1]) ? explicit[1].map((x) => String(x).trim()).filter(Boolean) : [];
  }

  const recurring = Array.isArray(mentor?.recurringSchedule) ? mentor.recurringSchedule : [];
  if (recurring.length) {
    const [y, m, d] = iso.split("-").map(Number);
    const jsDay = new Date(y, m - 1, d).getDay(); // 0=Sun
    const mentorDay = (jsDay + 6) % 7; // 0=Mon
    const row = recurring.find((r) => Number(r?.dayOfWeek) === mentorDay);
    return row && Array.isArray(row.slots) ? row.slots.map((x) => String(x).trim()).filter(Boolean) : [];
  }

  return null;
}

/** Chỉ ép khung giờ khi mentor đã khai báo availableSlots hoặc recurringSchedule. */
function mentorHasExplicitSchedule(mentor) {
  const slots = mentor?.availableSlots;
  const map = slots && typeof slots === "object" ? slots : {};
  const keys =
    slots instanceof Map ? [...slots.keys()] : Object.keys(map);
  const recurring = Array.isArray(mentor?.recurringSchedule) ? mentor.recurringSchedule : [];
  return keys.length > 0 || recurring.length > 0;
}

function buildNotes(body) {
  const direct = typeof body.notes === "string" ? body.notes.trim() : "";
  if (direct) return direct.slice(0, 8000);

  const parts = [];
  const position = typeof body.position === "string" ? body.position.trim() : "";
  const note = typeof body.note === "string" ? body.note.trim() : "";
  const cvFile = typeof body.cvFile === "string" ? body.cvFile.trim() : "";
  const jdFile = typeof body.jdFile === "string" ? body.jdFile.trim() : "";

  if (position) parts.push(`Vị trí ứng tuyển: ${position}`);
  if (note) parts.push(`Ghi chú: ${note}`);
  if (cvFile) parts.push(`CV: ${cvFile}`);
  if (jdFile) parts.push(`JD: ${jdFile}`);
  return parts.join("\n").slice(0, 8000);
}

function mapPaymentMethod(method) {
  const m = String(method ?? "").toLowerCase();
  if (m === "momo") return "momo";
  if (m === "zalopay") return "zalopay";
  if (m === "vnpay") return "vnpay";
  if (m === "visa" || m === "card") return "card";
  if (m === "transfer" || m === "bank" || m === "bank_transfer" || m === "ck") return "transfer";
  return "card";
}

function extractOrderPart(value) {
  const s = String(value || "").trim();
  if (!s) return "";
  return s.split("|")[0].trim().slice(0, 120);
}

const SESSION_TYPES = new Set(["mock_interview", "cv_review", "career_consulting", "custom"]);

/**
 * @param {string} userId - JWT sub (User _id)
 * @param {object} body - Khớp payload từ Booking.jsx / Checkout
 */
/** Thông tin credit đổi mentor (sau mentor hủy + HV chọn đổi mentor). */
export async function getRebookCreditForUser(userId, rawId) {
  if (!isMongoReady()) return { ok: false, status: 503, error: MONGO_ERR };
  const uid = String(userId).trim();
  const q = bookingQueryForUser(rawId);
  if (!q) return { ok: false, status: 400, error: "Thiếu id booking." };

  const booking = await Booking.findOne({ userId: uid, ...q }).select(
    "mentorId mentorCancelResolution rebookCreditVnd rebookCreditStatus totalAmount price paymentStatus status cancelledBy",
  );
  if (!booking) return { ok: false, status: 404, error: "Không tìm thấy booking." };

  const creditVnd = Math.round(Number(booking.rebookCreditVnd) || 0);
  const available =
    String(booking.rebookCreditStatus || "") === "available" &&
    String(booking.mentorCancelResolution || "") === "change_mentor" &&
    creditVnd > 0;

  const mentor = await Mentor.findById(booking.mentorId).select("publicId").lean();
  return {
    ok: true,
    credit: {
      sourceBookingId: String(booking._id),
      creditVnd,
      available,
      excludeMentorId: mentor?.publicId ? String(mentor.publicId) : String(booking.mentorId),
      excludeMentorObjectId: String(booking.mentorId),
    },
  };
}

async function validateRebookCreditApply(uid, sourceBookingId, newMentorObjectId, newTotalAmount) {
  if (!mongoose.isValidObjectId(sourceBookingId)) {
    return { ok: false, status: 400, error: "Mã booking credit không hợp lệ." };
  }
  const source = await Booking.findOne({ _id: sourceBookingId, userId: uid });
  if (!source) return { ok: false, status: 404, error: "Không tìm thấy booking nguồn credit." };
  if (String(source.mentorCancelResolution || "") !== "change_mentor") {
    return { ok: false, status: 400, error: "Booking nguồn chưa chọn đổi mentor." };
  }
  if (String(source.rebookCreditStatus || "") !== "available") {
    return { ok: false, status: 400, error: "Credit đổi mentor đã được dùng hoặc không còn hiệu lực." };
  }
  const creditVnd = Math.round(Number(source.rebookCreditVnd) || 0);
  if (creditVnd <= 0) {
    return { ok: false, status: 400, error: "Không có số tiền credit để áp dụng." };
  }
  if (String(source.mentorId) === String(newMentorObjectId)) {
    return {
      ok: false,
      status: 400,
      error:
        "Đổi mentor yêu cầu mentor khác. Muốn giữ mentor này, hãy chọn «Đổi lịch» (cùng mentor, giờ mới) trên trang buổi hẹn.",
    };
  }
  const total = Math.round(Number(newTotalAmount) || 0);
  if (total > creditVnd) {
    return {
      ok: false,
      status: 400,
      error: `Giá buổi mới (${total.toLocaleString("vi-VN")}₫) cao hơn số đã trả (${creditVnd.toLocaleString("vi-VN")}₫). Chọn mentor giá thấp hơn hoặc chọn hoàn tiền.`,
    };
  }
  const remainderVnd = creditVnd - total;
  return { ok: true, source, creditVnd, amountAppliedVnd: total, remainderVnd };
}

export async function createBooking(userId, body) {
  if (!isMongoReady()) {
    return { ok: false, status: 503, error: MONGO_ERR };
  }

  const uid = typeof userId === "string" ? userId.trim() : "";
  if (!uid || !mongoose.isValidObjectId(uid)) {
    return { ok: false, status: 401, error: "Phiên đăng nhập không hợp lệ." };
  }

  const user = await User.findById(uid).lean();
  if (!user) {
    return { ok: false, status: 401, error: "Không tìm thấy người dùng." };
  }

  const mentorKey = typeof body.mentorId === "string" ? body.mentorId.trim() : "";
  if (!mentorKey) {
    return { ok: false, status: 400, error: "Thiếu mentorId." };
  }

  await ensureMentorProfilesForAllMentorUsers().catch((e) =>
    console.error("[createBooking] ensureMentorProfilesForAllMentorUsers:", e?.message || e),
  );

  const or = [{ publicId: mentorKey }];
  if (mongoose.isValidObjectId(mentorKey)) or.push({ _id: mentorKey });

  let mentor = await Mentor.findOne({ $or: or }).lean();
  if (!mentor) {
    return { ok: false, status: 404, error: "Không tìm thấy mentor." };
  }
  if (!mentor.userId) {
    return { ok: false, status: 404, error: "Mentor chưa có tài khoản đăng nhập — không thể đặt lịch." };
  }
  const mentorAccount = await User.findById(mentor.userId).select("role isActive").lean();
  if (!mentorAccount || mentorAccount.role !== "mentor" || mentorAccount.isActive === false) {
    return { ok: false, status: 404, error: "Mentor không khả dụng để đặt lịch." };
  }
  if (mentor.isActive === false) {
    return {
      ok: false,
      status: 400,
      error: "Mentor đang tạm ngưng. Liên hệ quản trị để kích hoạt.",
    };
  }
  if (mentor.autoSuspended === true) {
    return {
      ok: false,
      status: 400,
      error: "Mentor đang tạm ngưng nhận lịch mới do đang được xem xét báo cáo.",
    };
  }
  if (mentor.isVerified === false) {
    return {
      ok: false,
      status: 400,
      error: "Mentor chưa được duyệt. Admin cần phê duyệt tại /admin/mentors/pending.",
    };
  }
  // Mentor đã duyệt nhưng còn available=false (đăng ký cũ / chưa sync) — tự bật lại.
  if (mentor.available === false) {
    await Mentor.updateOne({ _id: mentor._id }, { $set: { available: true } });
    mentor = { ...mentor, available: true };
  }

  const timeSlot = String(body.timeSlot ?? body.time ?? "").trim();
  if (!timeSlot || !/^\d{1,2}:\d{2}$/.test(timeSlot)) {
    return { ok: false, status: 400, error: "Thiếu hoặc sai định dạng timeSlot (vd. 09:00)." };
  }
  const [th, tm] = timeSlot.split(":").map(Number);
  const timeNormalized = `${String(th).padStart(2, "0")}:${String(tm || 0).padStart(2, "0")}`;

  const rawDate = typeof body.date === "string" ? body.date.trim() : "";
  if (!rawDate) {
    return { ok: false, status: 400, error: "Thiếu date." };
  }
  const dateNormalized = normalizeBookingDate(rawDate);
  if (!dateNormalized || !/^\d{2}\/\d{2}(\/\d{4})?$/.test(dateNormalized)) {
    return { ok: false, status: 400, error: "Ngày đặt lịch không hợp lệ (dùng DD/MM/YYYY)." };
  }
  const allowedSlots = getMentorSlotsForDate(mentor, dateNormalized);
  if (mentorHasExplicitSchedule(mentor) && Array.isArray(allowedSlots)) {
    if (allowedSlots.length === 0) {
      return { ok: false, status: 400, error: "Mentor không mở lịch cho ngày này." };
    }
    if (!allowedSlots.includes(timeNormalized)) {
      return { ok: false, status: 400, error: "Khung giờ này không nằm trong lịch mentor mở." };
    }
  }
  const requestedAt = parseBookingDateTime(dateNormalized, timeNormalized);
  if (!requestedAt || Number.isNaN(requestedAt.getTime())) {
    return { ok: false, status: 400, error: "Ngày/giờ đặt lịch không hợp lệ." };
  }
  if (!isBookingSlotInFuture(dateNormalized, timeNormalized)) {
    return { ok: false, status: 400, error: "Không thể đặt lịch trong quá khứ." };
  }

  let sessionType = typeof body.sessionType === "string" ? body.sessionType.trim() : "mock_interview";
  if (!SESSION_TYPES.has(sessionType)) sessionType = "mock_interview";

  const durationMinutes =
    Number.isFinite(Number(body.durationMinutes)) && Number(body.durationMinutes) > 0
      ? Math.min(480, Math.round(Number(body.durationMinutes)))
      : 60;

  let basePrice = Number(mentor.pricePerHour);
  const st = Array.isArray(mentor.sessionTypes)
    ? mentor.sessionTypes.find((x) => x && x.type === sessionType)
    : null;
  if (st && typeof st.price === "number" && st.price > 0) basePrice = st.price;

  const { rate: platformRate } = resolveBookingPlatformFeeRate(mentor);
  /** VAT tách trong giá hiển thị (mentor.price), không cộng thêm lên số khách CK. */
  const vatRate = parseFeeRate(process.env.BOOKING_VAT_RATE, 0);

  let price = Math.round(basePrice);
  let platformFee = Math.round(price * platformRate);
  let totalAmount = price;
  let vat = vatRate > 0 ? Math.round((price * vatRate) / (1 + vatRate)) : 0;

  const dup = await Booking.findOne({
    mentorId: mentor._id,
    date: dateNormalized,
    timeSlot: timeNormalized,
    status: { $in: ["pending", "confirmed", "in_progress"] },
  });

  if (dup) {
    // Nếu là chính user này đang đặt lại khung giờ cũ (ví dụ: quay lại trang Checkout hoặc tải lại)
    // và booking cũ vẫn đang ở trạng thái chờ thanh toán
    if (String(dup.userId) === uid && dup.status === "pending" && dup.paymentStatus === "pending") {
      const expired = await expireBookingTransferIfNeeded(dup);
      if (!expired.expired) {
        const clientOrder = extractOrderPart(body.orderNum);
        const oldRef = extractOrderPart(dup.paymentRef);
        if (clientOrder && oldRef !== clientOrder) {
          dup.paymentRef = clientOrder;
          await dup.save();
          // Đồng bộ các booking anh em cùng nhóm đặt nhiều slot (cùng paymentRef cũ) sang mã CK mới,
          // để "Tạo đơn mới" ở Checkout không làm lệch mã PI giữa các buổi trong cùng 1 lần đặt.
          if (oldRef) {
            await Booking.updateMany(
              {
                _id: { $ne: dup._id },
                userId: uid,
                paymentRef: oldRef,
                paymentStatus: "pending",
                status: "pending",
              },
              { $set: { paymentRef: clientOrder } },
            );
          }
        }
        return { ok: true, booking: toPublicBooking(dup, mentor) };
      }
      // Đơn cũ đã hết hạn — tiếp tục tạo booking mới (slot được giải phóng).
    } else {
      return { ok: false, status: 409, error: "Khung giờ này đã được đặt. Chọn giờ khác." };
    }
  }

  const creditFromRaw =
    typeof body.applyRebookCreditFromBookingId === "string"
      ? body.applyRebookCreditFromBookingId.trim()
      : typeof body.rebookFromBookingId === "string"
        ? body.rebookFromBookingId.trim()
        : "";
  let rebookCreditSource = null;
  let rebookCreditVndApplied = 0;
  if (creditFromRaw) {
    const creditCheck = await validateRebookCreditApply(uid, creditFromRaw, mentor._id, totalAmount);
    if (!creditCheck.ok) return creditCheck;
    // Chuyển "available" -> "consumed" atomically NGAY (trước khi tạo booking mới) — tránh
    // 2 request đồng thời cùng pass validate rồi cùng tạo được booking "đã thanh toán" từ 1 credit.
    const reserved = await Booking.findOneAndUpdate(
      { _id: creditCheck.source._id, userId: uid, rebookCreditStatus: "available" },
      { $set: { rebookCreditStatus: "consumed" } },
      { new: true },
    );
    if (!reserved) {
      return { ok: false, status: 409, error: "Credit đổi mentor vừa được dùng ở nơi khác. Vui lòng tải lại trang." };
    }
    rebookCreditSource = reserved;
    rebookCreditVndApplied = creditCheck.creditVnd;
  }

  // Ưu đãi % theo gói khi tự đặt buổi mentor (student=5%, professional=10%) — khách vẫn tự thanh toán, không còn "buổi miễn phí trong quota".
  let mentorBookingDiscountPercent = 0;
  if (!rebookCreditSource) {
    const discountInfo = await resolveMentorBookingDiscountForUser(uid);
    mentorBookingDiscountPercent = discountInfo.discountPercent || 0;
  }
  if (mentorBookingDiscountPercent > 0) {
    price = Math.round(price * (1 - mentorBookingDiscountPercent / 100));
    platformFee = Math.round(price * platformRate);
    totalAmount = price;
    vat = vatRate > 0 ? Math.round((price * vatRate) / (1 + vatRate)) : 0;
  }

  const paymentStatusRaw = String(body.paymentStatus ?? "pending").toLowerCase();
  let paymentStatus = rebookCreditSource
    ? "paid"
    : paymentStatusRaw === "paid"
      ? "paid"
      : "pending";

  let status = "pending";
  if (paymentStatus === "paid") {
    status = "confirmed";
  }

  const meetingLink = typeof body.meetingLink === "string" ? body.meetingLink.trim().slice(0, 2000) : "";
  const timezone =
    typeof body.timezone === "string" && body.timezone.trim()
      ? body.timezone.trim()
      : "Asia/Ho_Chi_Minh";

  const paymentRefCandidate =
    typeof body.orderNum === "string"
      ? body.orderNum
      : typeof body.paymentRef === "string"
        ? body.paymentRef
        : "";
  const paymentRef = extractOrderPart(paymentRefCandidate);
  const transferPending =
    paymentStatus === "pending" && mapPaymentMethod(body.paymentMethod ?? body.method) === "transfer";
  const paymentExpiresAt = transferPending ? newPaymentExpiresAt() : undefined;

  let doc;
  try {
    doc = await Booking.create({
      userId: uid,
      mentorId: mentor._id,
      date: dateNormalized,
      timeSlot: timeNormalized,
      durationMinutes,
      timezone,
      sessionType,
      notes: buildNotes(body),
      cvFileName: typeof body.cvFile === "string" ? body.cvFile.trim().slice(0, 500) : "",
      jdFileName: typeof body.jdFile === "string" ? body.jdFile.trim().slice(0, 500) : "",
      cvFileUrl: typeof body.cvFileUrl === "string" ? body.cvFileUrl.trim().slice(0, 2000) : "",
      jdFileUrl: typeof body.jdFileUrl === "string" ? body.jdFileUrl.trim().slice(0, 2000) : "",
      meetingLink,
      status,
      price,
      platformFeeRate: platformRate,
      platformFee,
      vat,
      totalAmount,
      paymentStatus,
      paymentMethod: rebookCreditSource ? "transfer" : mapPaymentMethod(body.paymentMethod ?? body.method),
      paymentRef,
      paymentExpiresAt,
      paidAt: paymentStatus === "paid" ? new Date() : undefined,
      creditSourceBookingId: rebookCreditSource?._id ?? undefined,
    });
  } catch (err) {
    // Rollback credit đã reserve atomically ở trên nếu tạo booking thất bại (kể cả do
    // trùng khung giờ — unique index ở Booking model chặn double-booking tầng DB).
    if (rebookCreditSource) {
      await Booking.updateOne(
        { _id: rebookCreditSource._id, rebookCreditStatus: "consumed" },
        { $set: { rebookCreditStatus: "available" } },
      );
    }
    if (err?.code === 11000) {
      return { ok: false, status: 409, error: "Khung giờ này vừa được đặt. Chọn giờ khác." };
    }
    throw err;
  }

  if (rebookCreditSource) {
    const appliedVnd = Math.round(Number(doc.totalAmount ?? doc.price ?? 0));
    const remainderVnd = Math.max(0, rebookCreditVndApplied - appliedVnd);

    rebookCreditSource.rebookCreditUsedOnBookingId = doc._id;
    let remainderSettlement = null;
    if (remainderVnd > 0) {
      remainderSettlement = await applyPartialBankRefundPending(rebookCreditSource, remainderVnd);
    }
    await rebookCreditSource.save();

    const ledgerAmt = appliedVnd;
    if (ledgerAmt > 0) {
      try {
        const pay = new Payment({
          userId: doc.userId,
          type: "booking",
          referenceId: doc._id,
          referenceModel: "Booking",
          amount: ledgerAmt,
          currency: "VND",
          provider: "transfer",
          providerRef: `rebook-credit-${String(doc._id)}`,
          status: "success",
          paidAt: new Date(),
          providerResponse: {
            channel: "rebook_credit",
            sourceBookingId: String(rebookCreditSource._id),
            creditAppliedVnd: rebookCreditVndApplied,
            confirmedAt: new Date().toISOString(),
            note: "Thanh toán bằng credit đổi mentor — không CK thêm",
          },
        });
        await pay.save();
      } catch (e) {
        if (e?.code !== 11000) console.error("[createBooking] rebook credit payment:", e?.message || e);
      }
    }

    if (remainderVnd > 0) {
      await notifyBookingOwner(doc.userId, {
        type: "system",
        title: "Hoàn phần tiền thừa",
        body: `Mentor mới rẻ hơn số đã trả. Còn ${remainderVnd.toLocaleString("vi-VN")}₫ cần hoàn — vui lòng điền STK trên trang buổi cũ (đã hủy).`,
        metadata: {
          bookingId: rebookCreditSource._id,
          actionUrl: `/session/${rebookCreditSource._id}`,
          refundAmountVnd: remainderVnd,
        },
      });
    }

    return {
      ok: true,
      booking: toPublicBooking(doc, mentor),
      rebookCreditApplied: true,
      creditSourceBookingId: String(rebookCreditSource._id),
      creditAppliedVnd: appliedVnd,
      creditRemainderVnd: remainderVnd,
      needRefundDestinationForRemainder: remainderVnd > 0,
    };
  }

  // Nếu user chọn CK, tạo ledger pending ngay (để admin/finance nhìn thấy và đồng bộ về sau)
  if (doc.paymentStatus === "pending" && doc.paymentMethod === "transfer") {
    const ledgerAmt = Math.round(Number(doc.totalAmount ?? doc.price ?? 0));
    if (ledgerAmt > 0) {
      const ledger = await recordTransferPending({
        userId: doc.userId,
        type: "booking",
        referenceModel: "Booking",
        referenceId: doc._id,
        amount: ledgerAmt,
        paymentExpiresAt: doc.paymentExpiresAt,
      });
      if (!ledger.ok && !ledger.idempotent) {
        console.error("[createBooking] ledger:", ledger.error);
      }
    }
  }

  const customerName = user?.name || "Học viên";
  const payLabel =
    doc.paymentStatus === "paid" ? "đã thanh toán" : "đang chờ thanh toán";
  // Đặt lịch mentor ưu tiên (Professional) — mentor thấy ngay là khách gói cao để ưu tiên xử lý.
  const isPriorityCustomer = String(user?.plan || "") === "professional";
  await notifyMentorBooking(mentor.userId, "booking_request", {
    type: "new_booking_request",
    title: isPriorityCustomer ? "⭐ Yêu cầu đặt lịch ưu tiên" : "Yêu cầu đặt lịch mới",
    body: `${customerName} đặt buổi ${dateNormalized} lúc ${timeNormalized} (${payLabel})${
      isPriorityCustomer ? " — khách gói cao cấp, vui lòng ưu tiên xác nhận." : ""
    }`,
    metadata: {
      bookingId: doc._id,
      mentorId: mentor._id,
      actionUrl: `/mentor/meeting-detail/${doc._id}`,
      priority: isPriorityCustomer,
    },
  });

  return {
    ok: true,
    booking: toPublicBooking(doc, mentor),
  };
}

/**
 * @param {object} doc - Mongoose doc hoặc plain (populate mentorId tuỳ chọn)
 * @param {object | null} mentorLean - mentor plain khi create (chưa populate)
 */
export function toPublicBooking(doc, mentorLean) {
  const b = doc.toObject ? doc.toObject() : { ...doc };
  
  // Mentor info extraction
  let m = mentorLean;
  if (!m && b.mentorId && typeof b.mentorId === "object" && ("name" in b.mentorId || "userId" in b.mentorId)) {
    m = b.mentorId;
  }

  const mentorPublicId = m?.publicId ?? (m?._id ? String(m._id) : (typeof b.mentorId === "string" ? b.mentorId : String(b.mentorId || "")));
  
  // Robust mentor email extraction
  let mentorEmail = "";
  if (m?.userId && typeof m.userId === "object" && m.userId.email) {
    mentorEmail = m.userId.email;
  } else if (m?.email) {
    mentorEmail = m.email;
  } else if (m?.userId && typeof m.userId === "string" && m.userId.includes("@")) {
    mentorEmail = m.userId;
  }

  const cust = b.userId && typeof b.userId === "object" && (b.userId.email || b.userId.name) ? b.userId : null;

  return {
    id: String(b._id),
    userId: cust?._id ? String(cust._id) : String(b.userId || ""),
    customerName: cust?.name || "",
    customerEmail: cust?.email || "",
    customerAvatar: resolveStoredUploadUrl(cust?.avatar || ""),
    mentorId: mentorPublicId,
    mentorName: m?.name ?? "",
    mentorTitle: m?.title ?? "",
    mentorCompany: m?.company ?? "",
    mentorAvatar: resolveStoredUploadUrl(m?.avatar ?? ""),
    mentorEmail: mentorEmail,
    date: b.date,
    timeSlot: b.timeSlot,
    durationMinutes: b.durationMinutes,
    timezone: b.timezone,
    sessionType: b.sessionType,
    notes: b.notes,
    cvFileName: b.cvFileName ?? "",
    jdFileName: b.jdFileName ?? "",
    cvFileUrl: resolveStoredUploadUrl(b.cvFileUrl ?? ""),
    jdFileUrl: resolveStoredUploadUrl(b.jdFileUrl ?? ""),
    mentorNotes: b.mentorNotes ?? "",
    mentorSummary: b.mentorSummary?.submittedAt
      ? {
          rating: b.mentorSummary.rating ?? null,
          strengths: b.mentorSummary.strengths ?? "",
          improvements: b.mentorSummary.improvements ?? "",
          recommendation: b.mentorSummary.recommendation ?? "",
          generalNotes: b.mentorSummary.generalNotes ?? "",
          submittedAt: b.mentorSummary.submittedAt,
          submittedLate: Boolean(b.mentorSummary.submittedLate),
        }
      : null,
    completedAt: b.completedAt ?? null,
    reviewId: b.reviewId ? String(b.reviewId) : "",
    meetingLink: b.meetingLink ?? "",
    status: b.status,
    price: b.price,
    platformFeeRate: b.platformFeeRate ?? null,
    platformFee: b.platformFee,
    vat: b.vat,
    totalAmount: b.totalAmount,
    paymentStatus: b.paymentStatus,
    paymentMethod: b.paymentMethod,
    paymentRef: b.paymentRef ?? "",
    paymentExpiresAt: b.paymentExpiresAt ?? null,
    transferSubmittedAt: b.transferSubmittedAt ?? null,
    transferConfirmedAt: b.transferConfirmedAt ?? null,
    transferConfirmedBy: b.transferConfirmedBy ? String(b.transferConfirmedBy) : "",
    transferForceConfirm: Boolean(b.transferForceConfirm),
    transferForceNote: b.transferForceNote ?? "",
    rescheduleHistory: Array.isArray(b.rescheduleHistory) ? b.rescheduleHistory : [],
    cancelReason: b.cancelReason ?? "",
    cancelledBy: b.cancelledBy ?? "",
    cancelledAt: b.cancelledAt,
    mentorCancelResolution: b.mentorCancelResolution ?? "",
    mentorCancelResolutionAt: b.mentorCancelResolutionAt ?? null,
    rebookCreditVnd: b.rebookCreditVnd ?? null,
    rebookCreditStatus: b.rebookCreditStatus ?? "",
    rebookCreditUsedOnBookingId: b.rebookCreditUsedOnBookingId ? String(b.rebookCreditUsedOnBookingId) : "",
    rebookCreditRemainderVnd: b.rebookCreditRemainderVnd ?? null,
    creditSourceBookingId: b.creditSourceBookingId ? String(b.creditSourceBookingId) : "",
    cancelRefundAmountVnd: b.cancelRefundAmountVnd ?? null,
    cancelRetainedAmountVnd: b.cancelRetainedAmountVnd ?? null,
    cancelRefundPercent: b.cancelRefundPercent ?? null,
    refundReceiveBankName: b.refundReceiveBankName ?? "",
    refundReceiveAccountNumber: b.refundReceiveAccountNumber ?? "",
    refundReceiveAccountHolder: b.refundReceiveAccountHolder ?? "",
    refundCompletedAt: b.refundCompletedAt ?? null,
    mentorCheckInAt: b.mentorCheckInAt ?? null,
    mentorCheckInImageUrl: resolveStoredUploadUrl(b.mentorCheckInImageUrl ?? ""),
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
  };
}

/**
 * Admin xác nhận đã CK hoàn cho HV (sau khi user hủy → refund_pending).
 */
export async function confirmBankRefundByAdmin(bookingId, options = {}) {
  if (!isMongoReady()) return { ok: false, status: 503, error: MONGO_ERR };
  if (!mongoose.isValidObjectId(bookingId)) {
    return { ok: false, status: 400, error: "id booking không hợp lệ." };
  }

  const existing = await Booking.findById(bookingId).lean();
  if (!existing) return { ok: false, status: 404, error: "Không tìm thấy booking." };

  const pst0 = String(existing.paymentStatus || "").toLowerCase();
  if (pst0 === "refunded" || pst0 === "partial_refund" || existing.refundCompletedAt) {
    return { ok: false, status: 400, error: "Booking đã được đánh dấu hoàn tiền xong." };
  }
  if (pst0 !== "refund_pending") {
    return { ok: false, status: 400, error: "Booking không ở trạng thái chờ hoàn tiền." };
  }

  const refundVnd = Math.round(Number(existing.cancelRefundAmountVnd || 0));
  if (refundVnd <= 0) {
    return { ok: false, status: 400, error: "Không có số tiền hoàn trên booking." };
  }

  const payRow = await Payment.findOne({
    type: "booking",
    referenceModel: "Booking",
    referenceId: existing._id,
    provider: "transfer",
  }).sort({ createdAt: -1 });

  if (!payRow) {
    return { ok: false, status: 400, error: "Không tìm thấy giao dịch thanh toán để đối soát hoàn." };
  }

  const paySt0 = String(payRow.status || "");
  if (paySt0 === "refunded" || paySt0 === "partial_refund") {
    return { ok: false, status: 400, error: "Giao dịch đã được đánh dấu hoàn tiền." };
  }
  if (paySt0 !== "refund_pending") {
    return { ok: false, status: 400, error: "Giao dịch không ở trạng thái chờ hoàn." };
  }

  const ledgerAmount = Math.round(Number(payRow.amount) || existing.totalAmount || existing.price || 0);
  const retained = Math.round(Number(existing.cancelRetainedAmountVnd || 0));
  const isFull = refundVnd >= ledgerAmount || retained <= 0;
  const nextBookingPayStatus = isFull ? "refunded" : "partial_refund";
  const nextPayStatus = isFull ? "refunded" : "partial_refund";
  const now = new Date();
  const adminId =
    options?.adminUserId && mongoose.isValidObjectId(String(options.adminUserId))
      ? options.adminUserId
      : undefined;

  const updatedPay = await Payment.findOneAndUpdate(
    { _id: payRow._id, status: "refund_pending" },
    {
      $set: {
        refundAmount: refundVnd,
        refundedAt: now,
        status: nextPayStatus,
        providerResponse: {
          ...(payRow.providerResponse && typeof payRow.providerResponse === "object"
            ? payRow.providerResponse
            : {}),
          adminRefundConfirmedAt: now.toISOString(),
          adminRefundConfirmedBy: String(options?.adminUserId || ""),
        },
      },
    },
    { new: true },
  );
  if (!updatedPay) {
    return { ok: false, status: 409, error: "Hoàn tiền đã được xác nhận hoặc giao dịch không còn chờ hoàn." };
  }

  const booking = await Booking.findOneAndUpdate(
    { _id: bookingId, paymentStatus: "refund_pending" },
    {
      $set: {
        paymentStatus: nextBookingPayStatus,
        refundCompletedAt: now,
        refundCompletedBy: adminId,
      },
    },
    { new: true },
  );
  if (!booking) {
    await Payment.updateOne(
      { _id: payRow._id },
      { $set: { status: "refund_pending", refundedAt: null } },
    );
    const again = await Booking.findById(bookingId).lean();
    if (
      again &&
      (again.refundCompletedAt ||
        ["refunded", "partial_refund"].includes(String(again.paymentStatus || "").toLowerCase()))
    ) {
      return { ok: false, status: 400, error: "Booking đã được đánh dấu hoàn tiền xong." };
    }
    return { ok: false, status: 409, error: "Hoàn tiền đã được xác nhận hoặc không thể cập nhật booking." };
  }

  await notifyBookingOwner(booking.userId, {
    type: "system",
    title: "Đã hoàn tiền",
    body: `Admin đã xác nhận chuyển khoản hoàn ${refundVnd.toLocaleString("vi-VN")}₫ cho lịch hẹn đã hủy.`,
    metadata: { bookingId: String(booking._id), refundAmountVnd: refundVnd },
  });

  const populated = await Booking.findById(bookingId)
    .populate({ path: "mentorId", select: "name title company avatar publicId" })
    .populate({ path: "userId", select: "name email avatar" });

  return { ok: true, booking: toPublicBooking(populated) };
}

function bookingQueryForUser(rawId) {
  const id = typeof rawId === "string" ? rawId.trim() : "";
  if (!id) return null;
  if (mongoose.isValidObjectId(id)) return { _id: id };
  return { paymentRef: id };
}

async function getMentorByUserId(userId) {
  const uid = String(userId ?? "").trim();
  if (!mongoose.isValidObjectId(uid)) return null;
  return Mentor.findOne({ userId: uid }).lean();
}

export async function listMyBookings(userId) {
  if (!isMongoReady()) return { ok: false, status: 503, error: MONGO_ERR };
  const uid = String(userId).trim();
  if (!mongoose.isValidObjectId(uid)) return { ok: false, status: 401, error: "Phiên đăng nhập không hợp lệ." };

  await sweepExpiredTransferBookings({ userId: uid });

  const rows = await Booking.find({ userId: uid })
    .sort({ createdAt: -1 })
    .populate({ path: "userId", select: "name email avatar" })
    .populate({ 
      path: "mentorId", 
      select: "name title company avatar publicId userId",
      populate: { path: "userId", select: "email" }
    })
    .lean();


  return { ok: true, bookings: rows.map((row) => toPublicBooking(row)) };
}

export async function listMentorBookings(mentorUserId) {
  if (!isMongoReady()) return { ok: false, status: 503, error: MONGO_ERR };
  const mentor = await getMentorByUserId(mentorUserId);
  if (!mentor?._id) {
    return { ok: false, status: 404, error: "Không tìm thấy hồ sơ mentor." };
  }

  await sweepExpiredTransferBookings({ mentorId: mentor._id });
  await sweepOverdueMentorFeedback({ mentorId: mentor._id });

  const rows = await Booking.find({ mentorId: mentor._id })
    .sort({ createdAt: -1 })
    .populate({
      path: "mentorId",
      select: "name title company avatar publicId userId",
      populate: { path: "userId", select: "email" }
    })
    .populate({ path: "userId", select: "name email avatar" })
    .lean();

  const bookingIds = rows.map((r) => r._id).filter(Boolean);
  const reviewRows =
    bookingIds.length > 0
      ? await Review.find({
          bookingId: { $in: bookingIds },
          targetType: "mentor",
          isVisible: { $ne: false },
        })
          .select("bookingId rating comment")
          .lean()
      : [];
  const reviewByBookingId = new Map(
    reviewRows.map((r) => [String(r.bookingId), r]),
  );

  return {
    ok: true,
    bookings: rows.map((row) => {
      const booking = toPublicBooking(row);
      const rev = reviewByBookingId.get(String(row._id));
      if (rev) {
        booking.menteeRating = Number(rev.rating || 0);
        booking.reviewComment = String(rev.comment || "").trim();
      }
      return booking;
    }),
  };
}

export async function getMyBooking(userId, rawId) {
  if (!isMongoReady()) return { ok: false, status: 503, error: MONGO_ERR };
  const uid = String(userId).trim();
  const q = bookingQueryForUser(rawId);
  if (!q) return { ok: false, status: 400, error: "Thiếu id booking." };

  const row = await Booking.findOne({ userId: uid, ...q })
    .populate({ path: "userId", select: "name email avatar" })
    .populate({ 
      path: "mentorId", 
      select: "name title company avatar publicId userId",
      populate: { path: "userId", select: "email" }
    })
    .lean();

  if (!row) return { ok: false, status: 404, error: "Không tìm thấy booking." };
  return { ok: true, booking: toPublicBooking(row) };
}

export async function getMentorBooking(mentorUserId, rawId) {
  if (!isMongoReady()) return { ok: false, status: 503, error: MONGO_ERR };
  const mentor = await getMentorByUserId(mentorUserId);
  if (!mentor?._id) return { ok: false, status: 404, error: "Không tìm thấy hồ sơ mentor." };
  if (!mongoose.isValidObjectId(rawId)) return { ok: false, status: 400, error: "id booking không hợp lệ." };

  const row = await Booking.findOne({ _id: rawId, mentorId: mentor._id })
    .populate({ path: "userId", select: "name email avatar" })
    .populate({
      path: "mentorId",
      select: "name title company avatar publicId userId",
      populate: { path: "userId", select: "email" }
    })
    .lean();

  if (!row) return { ok: false, status: 404, error: "Không tìm thấy booking." };
  const booking = toPublicBooking(row);
  // Ghi chú live của mentor — riêng tư, chỉ trả về ở route mentor-only này (không đi qua toPublicBooking
  // dùng chung với response phía học viên, tránh lộ nhận xét nội bộ về học viên cho chính họ).
  booking.mentorSessionCapture = sanitizeSessionCapture(row.mentorSessionCapture);
  const review = await Review.findOne({
    bookingId: row._id,
    targetType: "mentor",
    isVisible: { $ne: false },
  })
    .select("rating comment")
    .lean();
  if (review) {
    booking.menteeRating = Number(review.rating || 0);
    booking.reviewComment = String(review.comment || "").trim();
  }
  return { ok: true, booking };
}

/**
 * Khách xác nhận đã chuyển khoản. `reference` tuỳ chọn (FT…); có thể gửi trùng mã đơn (nội dung QR) — không lưu trùng lặp trong paymentRef.
 */
export async function submitBankTransferReference(userId, rawId, body) {
  if (!isMongoReady()) return { ok: false, status: 503, error: MONGO_ERR };
  const uid = String(userId).trim();
  if (!mongoose.isValidObjectId(uid)) return { ok: false, status: 401, error: "Phiên đăng nhập không hợp lệ." };
  const q = bookingQueryForUser(rawId);
  if (!q) return { ok: false, status: 400, error: "Thiếu id booking." };

  const refRaw = String(body?.reference ?? body?.transferReference ?? "").trim();

  const booking = await Booking.findOne({ userId: uid, ...q });
  if (!booking) return { ok: false, status: 404, error: "Không tìm thấy booking." };
  if (booking.paymentMethod !== "transfer") {
    return { ok: false, status: 400, error: "Booking này không dùng hình thức chuyển khoản." };
  }
  if (booking.paymentStatus !== "pending") {
    return { ok: false, status: 400, error: "Thanh toán đã được xử lý." };
  }

  // Chuẩn mới: mỗi giao dịch chỉ giữ một nội dung chuyển khoản duy nhất (mã đơn gốc).
  const orderPart = extractOrderPart(booking.paymentRef) || extractOrderPart(refRaw) || String(booking._id).slice(-8);
  booking.paymentRef = orderPart.slice(0, 120);
  booking.transferSubmittedAt = new Date();
  await booking.save();

  // Đồng bộ ledger (payments) để admin/finance không phải nhìn 2 nguồn.
  // Nếu chưa có pending vì data cũ, cố gắng tạo lại rồi mới cập nhật metadata.
  const ledgerAmt = Math.round(Number(booking.totalAmount ?? booking.price ?? 0));
  if (ledgerAmt > 0) {
    const ensure = await recordTransferPending({
      userId: booking.userId,
      type: "booking",
      referenceModel: "Booking",
      referenceId: booking._id,
      amount: ledgerAmt,
    });
    if (!ensure.ok && !ensure.idempotent) {
      console.error("[submitBankTransferReference] ensure ledger:", ensure.error);
    } else {
      const meta = await recordTransferSubmitted({
        userId: booking.userId,
        type: "booking",
        referenceId: booking._id,
        paymentRef: booking.paymentRef,
        submittedAt: booking.transferSubmittedAt,
      });
      if (!meta.ok) {
        console.error("[submitBankTransferReference] ledger meta:", meta.error);
      }
    }
  }

  await booking.populate({ path: "userId", select: "name email avatar" });
  const mentor = await Mentor.findById(booking.mentorId).select("name title company avatar publicId").lean();
  return { ok: true, booking: toPublicBooking(booking, mentor) };
}

/**
 * Admin xác nhận đã nhận tiền CK — giống thanh toán thành công qua cổng.
 */
export async function confirmBankTransferPaymentByAdmin(bookingId, options = {}) {
  if (!isMongoReady()) return { ok: false, status: 503, error: MONGO_ERR };
  if (!mongoose.isValidObjectId(bookingId)) {
    return { ok: false, status: 400, error: "id booking không hợp lệ." };
  }
  const force = Boolean(options?.force);
  const forceNote = String(options?.forceNote || "").trim();
  if (force && forceNote.length < 3) {
    return { ok: false, status: 400, error: "Xác nhận ngoại lệ cần lý do rõ ràng (ít nhất 3 ký tự)." };
  }

  // Atomic claim: pending -> paid trong đúng 1 lệnh update, điều kiện trạng thái nằm ngay
  // trong filter — an toàn kể cả trên MongoDB standalone (không có transaction thật). 2 admin
  // cùng bấm xác nhận 1 lúc chỉ 1 người "thắng" filter, người còn lại nhận `before = null`
  // thay vì cả 2 cùng qua được check rồi cùng ghi ledger 2 lần.
  const transferConfirmedBy =
    options?.adminUserId && mongoose.isValidObjectId(String(options.adminUserId)) ? options.adminUserId : undefined;
  const paidAt = new Date();
  const claimFilter = { _id: bookingId, paymentMethod: "transfer", paymentStatus: "pending" };
  if (!force) claimFilter.transferSubmittedAt = { $ne: null };

  const before = await Booking.findOneAndUpdate(
    claimFilter,
    {
      $set: {
        paymentStatus: "paid",
        status: "confirmed",
        paidAt,
        transferConfirmedAt: paidAt,
        transferConfirmedBy,
        transferForceConfirm: force,
        transferForceNote: force ? forceNote.slice(0, 500) : "",
      },
    },
    { new: false },
  );

  if (!before) {
    const existing = await Booking.findById(bookingId)
      .select("paymentMethod paymentStatus transferSubmittedAt")
      .lean();
    if (!existing) return { ok: false, status: 404, error: "Không tìm thấy booking." };
    if (existing.paymentMethod !== "transfer") {
      return { ok: false, status: 400, error: "Chỉ áp dụng cho booking thanh toán chuyển khoản." };
    }
    if (existing.paymentStatus === "paid") {
      return { ok: false, status: 400, error: "Booking đã được đánh dấu đã thanh toán." };
    }
    if (existing.paymentStatus !== "pending") {
      return { ok: false, status: 400, error: "Trạng thái thanh toán không cho phép xác nhận." };
    }
    if (!force && !existing.transferSubmittedAt) {
      return {
        ok: false,
        status: 400,
        error:
          "Cần gửi force: true khi admin xác nhận thủ công (không bắt học viên bấm «đã chuyển khoản» trong app).",
      };
    }
    return { ok: false, status: 409, error: "Booking vừa được xử lý ở nơi khác. Vui lòng tải lại." };
  }

  const ledgerAmt = Math.round(Number(before.totalAmount ?? before.price ?? 0));
  if (ledgerAmt > 0) {
    const ledger = await recordAdminTransferSuccess({
      userId: before.userId,
      type: "booking",
      referenceModel: "Booking",
      referenceId: before._id,
      amount: ledgerAmt,
      adminUserId: options?.adminUserId || "",
      forceConfirm: force,
      forceNote,
    });
    if (!ledger.ok && !ledger.idempotent) {
      // Rollback claim vì không ghi được ledger — trả booking về đúng trạng thái trước đó.
      await Booking.updateOne(
        { _id: bookingId },
        {
          $set: { paymentStatus: before.paymentStatus, status: before.status },
          $unset: { paidAt: "", transferConfirmedAt: "", transferConfirmedBy: "" },
        },
      );
      console.error("[confirmBankTransferPaymentByAdmin] ERR_LEDGER", ledger.error);
      return { ok: false, status: 500, error: "Không thể ghi nhận giao dịch thanh toán. Vui lòng thử lại." };
    }
  }

  // Tự xác nhận các booking anh em cùng nhóm đặt nhiều slot (cùng userId + mentorId + paymentRef).
  // _skipSiblingConfirm chặn đệ quy vô hạn khi gọi lại cho từng anh em.
  if (!options?._skipSiblingConfirm) {
    const primary = await Booking.findById(bookingId).select("paymentRef userId mentorId").lean();
    const ref = String(primary?.paymentRef || "").trim();
    if (ref) {
      const siblings = await Booking.find({
        _id: { $ne: bookingId },
        userId: primary.userId,
        mentorId: primary.mentorId,
        paymentRef: ref,
        paymentStatus: "pending",
        paymentMethod: "transfer",
      })
        .select("_id")
        .lean();

      for (const sib of siblings) {
        const sibResult = await confirmBankTransferPaymentByAdmin(String(sib._id), {
          ...options,
          force: true,
          forceNote: options?.forceNote || "Auto-confirmed: cùng đơn đặt nhiều slot",
          _skipSiblingConfirm: true,
        });
        if (!sibResult.ok && !String(sibResult.error || "").includes("đã thanh toán")) {
          console.warn(`[confirmBankTransferPaymentByAdmin] sibling ${sib._id} failed:`, sibResult.error);
        }
      }
    }
  }

  const booking = await Booking.findById(bookingId)
    .populate({
      path: "mentorId",
      select: "name title company avatar publicId userId",
      populate: { path: "userId", select: "email" }
    })
    .populate({ path: "userId", select: "name email avatar" });
  if (!booking) return { ok: false, status: 404, error: "Không tìm thấy booking." };

  const mentorUid =
    booking.mentorId?.userId?._id || booking.mentorId?.userId;
  const studentName =
    booking.userId?.name || booking.userId?.email || "Học viên";
  // Booking anh em (gọi với _skipSiblingConfirm=true) bỏ qua thông báo riêng — booking chính ở trên
  // đã tự xác nhận cả nhóm trong 1 request, tránh spam N thông báo giống nhau cho cùng 1 mentor.
  if (mentorUid && !options?._skipSiblingConfirm) {
    await notifyMentorBooking(mentorUid, "booking_request", {
      type: "booking_confirmed",
      title: "Buổi mentor đã được thanh toán",
      body: `${studentName} — buổi ${booking.date} ${booking.timeSlot} đã xác nhận thanh toán.`,
      metadata: {
        bookingId: booking._id,
        actionUrl: `/mentor/meeting-detail/${booking._id}`,
      },
    });
  }

  if (!options?._skipSiblingConfirm) {
    await notifyBookingOwner(booking.userId?._id || booking.userId, {
      type: "booking_confirmed",
      title: "Lịch hẹn đã được xác nhận",
      body: `Thanh toán đã được duyệt — buổi với ${booking.mentorId?.name || "mentor"} lúc ${booking.date} ${booking.timeSlot} đã xác nhận.`,
      metadata: {
        bookingId: booking._id,
        mentorId: booking.mentorId?._id,
        actionUrl: `/session/${booking._id}`,
      },
    });
  }

  return { ok: true, booking: toPublicBooking(booking) };
}

export async function confirmMentorBooking(mentorUserId, rawId) {
  if (!isMongoReady()) return { ok: false, status: 503, error: MONGO_ERR };
  const mentor = await getMentorByUserId(mentorUserId);
  if (!mentor?._id) return { ok: false, status: 404, error: "Không tìm thấy hồ sơ mentor." };
  if (!mongoose.isValidObjectId(rawId)) return { ok: false, status: 400, error: "id booking không hợp lệ." };

  const booking = await Booking.findOne({ _id: rawId, mentorId: mentor._id });
  if (!booking) return { ok: false, status: 404, error: "Không tìm thấy booking." };

  if (["cancelled", "completed", "no_show"].includes(booking.status)) {
    return { ok: false, status: 400, error: "Không thể xác nhận booking ở trạng thái này." };
  }
  if (booking.status === "confirmed" || booking.status === "in_progress") {
    await booking.populate([
      { path: "userId", select: "name email avatar" },
      { path: "mentorId", select: "name title company avatar publicId userId", populate: { path: "userId", select: "email" } }
    ]);
    return { ok: true, booking: toPublicBooking(booking) };

  }
  if (booking.status !== "pending") {
    return { ok: false, status: 400, error: "Chỉ xác nhận khi booking đang chờ duyệt (pending)." };
  }

  const payGate = assertBookingPaidBeforeActiveStatus(booking, "confirmed");
  if (!payGate.ok) return payGate;

  booking.status = "confirmed";
  await booking.save();
  await booking.populate([
    { path: "userId", select: "name email avatar" },
    { path: "mentorId", select: "name title company avatar publicId userId", populate: { path: "userId", select: "email" } }
  ]);
  return { ok: true, booking: toPublicBooking(booking) };

}

export async function completeMentorBooking(mentorUserId, rawId) {
  if (!isMongoReady()) return { ok: false, status: 503, error: MONGO_ERR };
  const mentor = await getMentorByUserId(mentorUserId);
  if (!mentor?._id) return { ok: false, status: 404, error: "Không tìm thấy hồ sơ mentor." };
  if (!mongoose.isValidObjectId(rawId)) return { ok: false, status: 400, error: "id booking không hợp lệ." };

  const booking = await Booking.findOne({ _id: rawId, mentorId: mentor._id });
  if (!booking) return { ok: false, status: 404, error: "Không tìm thấy booking." };

  if (["cancelled", "completed", "no_show"].includes(booking.status)) {
    return { ok: false, status: 400, error: "Không thể hoàn thành booking ở trạng thái này." };
  }
  if (!["confirmed", "in_progress"].includes(booking.status)) {
    return {
      ok: false,
      status: 400,
      error: "Chỉ đánh dấu hoàn thành khi booking đã xác nhận hoặc đang diễn ra.",
    };
  }
  if (!isBookingCompletable(booking)) {
    return {
      ok: false,
      status: 400,
      error: "Chưa đủ tối thiểu 2/3 thời lượng buổi học — chưa thể đánh dấu hoàn thành.",
    };
  }

  booking.status = "completed";
  booking.completedAt = new Date();
  await booking.save();

  const credit = await tryCreditMentorForCompletedBooking(booking._id);
  if (!credit.ok) {
    console.error("[completeMentorBooking] mentor earnings:", credit.error || credit);
  } else if (credit.credited > 0) {
    await notifyMentorBooking(mentorUserId, "payout_update", {
      type: "payment_success",
      title: "Đã ghi nhận thu nhập buổi mentor",
      body: `+${Math.round(credit.credited).toLocaleString("vi-VN")}₫ đã vào số dư khả dụng.`,
      metadata: {
        bookingId: booking._id,
        actionUrl: "/mentor/finance",
      },
    });
  }

  await booking.populate([
    { path: "userId", select: "name email avatar" },
    { path: "mentorId", select: "name title company avatar publicId userId", populate: { path: "userId", select: "email" } }
  ]);
  return { ok: true, booking: toPublicBooking(booking) };
}

/**
 * Mentor báo học viên không tham gia buổi hẹn (customer no-show).
 * Khác `processBookingNoShow` (mentor no-show): ở đây lỗi thuộc về học viên nên
 * KHÔNG hoàn tiền, KHÔNG cộng vi phạm cho mentor — buổi được tính như đã hoàn
 * thành bình thường (mentor vẫn nhận đủ thu nhập, cộng vào số dư khả dụng).
 */
export async function processCustomerNoShow(mentorUserId, rawId, body = {}) {
  if (!isMongoReady()) return { ok: false, status: 503, error: MONGO_ERR };
  const mentor = await getMentorByUserId(mentorUserId);
  if (!mentor?._id) return { ok: false, status: 404, error: "Không tìm thấy hồ sơ mentor." };
  if (!mongoose.isValidObjectId(rawId)) return { ok: false, status: 400, error: "id booking không hợp lệ." };

  const booking = await Booking.findOne({ _id: rawId, mentorId: mentor._id });
  if (!booking) return { ok: false, status: 404, error: "Không tìm thấy booking." };

  if (["cancelled", "completed", "no_show"].includes(booking.status)) {
    return { ok: false, status: 400, error: "Booking đã ở trạng thái kết thúc, không thể báo no-show." };
  }
  if (!["confirmed", "in_progress"].includes(booking.status)) {
    return { ok: false, status: 400, error: "Chỉ báo no-show khi booking đã xác nhận hoặc đang diễn ra." };
  }

  const startAt = parseBookingDateTime(booking.date, booking.timeSlot);
  const graceMs = 15 * 60 * 1000;
  if (startAt && Number.isFinite(startAt.getTime()) && startAt.getTime() + graceMs > Date.now()) {
    return { ok: false, status: 400, error: "Chỉ báo no-show sau khi buổi đã bắt đầu (tối thiểu 15 phút)." };
  }
  // Cùng ngưỡng chống gian lận với completeMentorBooking — nếu không, mentor có thể né rule 2/3
  // bằng cách báo "học viên vắng mặt" (vẫn được cộng đủ tiền) thay vì bấm Kết thúc buổi thật.
  if (!isBookingCompletable(booking)) {
    return {
      ok: false,
      status: 400,
      error: "Chưa đủ tối thiểu 2/3 thời lượng buổi học — chưa thể đánh dấu học viên vắng mặt.",
    };
  }

  const note = typeof body?.note === "string" ? body.note.trim().slice(0, 2000) : "";

  booking.status = "completed";
  booking.completedAt = new Date();
  booking.noShowBy = "customer";
  booking.mentorNotes = note || booking.mentorNotes || "Học viên không tham gia buổi hẹn (no-show).";
  await booking.save();

  const credit = await tryCreditMentorForCompletedBooking(booking._id);
  if (!credit.ok) {
    console.error("[processCustomerNoShow] mentor earnings:", credit.error || credit);
  } else if (credit.credited > 0) {
    await notifyMentorBooking(mentorUserId, "payout_update", {
      type: "payment_success",
      title: "Đã ghi nhận thu nhập buổi mentor",
      body: `+${Math.round(credit.credited).toLocaleString("vi-VN")}₫ đã vào số dư khả dụng (học viên không tham gia).`,
      metadata: { bookingId: booking._id, actionUrl: "/mentor/finance" },
    });
  }

  await notifyBookingOwner(booking.userId, {
    type: "system",
    title: "Buổi hẹn được đánh dấu vắng mặt",
    body: "Bạn đã không tham gia buổi hẹn đúng giờ nên buổi học này không được hoàn tiền.",
    metadata: { bookingId: booking._id },
  });

  await booking.populate([
    { path: "userId", select: "name email avatar" },
    { path: "mentorId", select: "name title company avatar publicId userId", populate: { path: "userId", select: "email" } }
  ]);
  return { ok: true, booking: toPublicBooking(booking) };
}

function meetingEntryBlockedReason(booking, { asMentor = false } = {}) {
  const st = String(booking?.status || "").toLowerCase();
  const pst = String(booking?.paymentStatus || "").toLowerCase();
  if (["cancelled", "completed", "no_show"].includes(st)) {
    return "Buổi hẹn đã kết thúc hoặc đã bị hủy.";
  }
  if (!["confirmed", "in_progress"].includes(st)) {
    if (asMentor && st === "pending" && pst === "paid") return "";
    if (asMentor && st === "pending") {
      return "Học viên chưa hoàn tất thanh toán. Bạn có thể vào phòng sau khi đơn được thanh toán (admin xác nhận CK).";
    }
    if (asMentor) return "Buổi hẹn chưa sẵn sàng. Kiểm tra trạng thái trong Lịch mentor.";
    return pst === "paid"
      ? "Chờ mentor xác nhận buổi hẹn trước khi vào phòng."
      : "Buổi hẹn chưa được xác nhận. Hoàn tất thanh toán hoặc chờ mentor xác nhận.";
  }
  if (pst !== "paid") {
    return asMentor ? "Học viên chưa thanh toán buổi này." : "Buổi hẹn chưa được thanh toán.";
  }
  return "";
}

/** Mentor: tự xác nhận buổi pending (đã thanh toán) trước khi vào phòng / check-in. */
async function prepareBookingForMeetingEntry(booking, { asMentor = false } = {}) {
  if (!booking || !asMentor) return { ok: true };
  const st = String(booking.status || "").toLowerCase();
  if (["confirmed", "in_progress"].includes(st)) return { ok: true };
  if (st !== "pending") {
    const err = meetingEntryBlockedReason(booking, { asMentor: true });
    return err ? { ok: false, status: 400, error: err } : { ok: true };
  }
  const payGate = assertBookingPaidBeforeActiveStatus(booking, "confirmed");
  if (!payGate.ok) {
    return {
      ok: false,
      status: payGate.status || 400,
      error: "Học viên chưa hoàn tất thanh toán. Bạn có thể vào phòng sau khi đơn được thanh toán (admin xác nhận CK).",
    };
  }
  booking.status = "confirmed";
  await booking.save();
  return { ok: true };
}

function cleanCaptureList(arr, max = 40) {
  return Array.isArray(arr) ? arr.map((s) => String(s).trim()).filter(Boolean).slice(0, max) : [];
}

function sanitizeSessionCapture(raw) {
  if (!raw || typeof raw !== "object") {
    return {
      transcript: "",
      questionsAsked: [],
      commonMistakes: [],
      keyInsights: [],
      rating: 0,
      strengths: "",
      improvements: "",
      recommendation: "",
      updatedAt: null,
    };
  }
  return {
    transcript: String(raw.transcript || "").trim().slice(0, 12000),
    questionsAsked: cleanCaptureList(raw.questionsAsked),
    commonMistakes: cleanCaptureList(raw.commonMistakes),
    keyInsights: cleanCaptureList(raw.keyInsights),
    rating: Math.min(5, Math.max(0, Math.round(Number(raw.rating) || 0))),
    strengths: String(raw.strengths || "").trim().slice(0, 4000),
    improvements: String(raw.improvements || "").trim().slice(0, 4000),
    recommendation: String(raw.recommendation || "").trim().slice(0, 4000),
    updatedAt: raw.updatedAt ?? null,
  };
}

/** Mentor lưu ghi chú live (STT / tag nhanh) trong lúc buổi đang diễn ra. */
export async function saveMentorSessionCapture(mentorUserId, rawId, body) {
  if (!isMongoReady()) return { ok: false, status: 503, error: MONGO_ERR };
  const mentor = await getMentorByUserId(mentorUserId);
  if (!mentor?._id) return { ok: false, status: 404, error: "Không tìm thấy hồ sơ mentor." };
  if (!mongoose.isValidObjectId(rawId)) return { ok: false, status: 400, error: "id booking không hợp lệ." };

  const booking = await Booking.findOne({ _id: rawId, mentorId: mentor._id });
  if (!booking) return { ok: false, status: 404, error: "Không tìm thấy booking." };
  if (!["confirmed", "in_progress"].includes(booking.status)) {
    return { ok: false, status: 400, error: "Chỉ lưu ghi chú khi buổi đang diễn ra." };
  }

  booking.mentorSessionCapture = {
    ...sanitizeSessionCapture(body),
    updatedAt: new Date(),
  };
  await booking.save();
  return { ok: true, capture: sanitizeSessionCapture(booking.mentorSessionCapture) };
}

/** Vào phòng họp — đánh dấu `in_progress` (idempotent) + dựng phiên JaaS (nếu đã cấu hình). */
export async function startBookingMeeting(userId, rawId, { asMentor = false } = {}) {
  if (!isMongoReady()) return { ok: false, status: 503, error: MONGO_ERR };
  if (!mongoose.isValidObjectId(rawId)) return { ok: false, status: 400, error: "id booking không hợp lệ." };

  let booking;
  if (asMentor) {
    const mentor = await getMentorByUserId(userId);
    if (!mentor?._id) return { ok: false, status: 404, error: "Không tìm thấy hồ sơ mentor." };
    booking = await Booking.findOne({ _id: rawId, mentorId: mentor._id });
  } else {
    booking = await Booking.findOne({ _id: rawId, userId: String(userId).trim() });
  }

  if (!booking) return { ok: false, status: 404, error: "Không tìm thấy booking." };

  const prepared = await prepareBookingForMeetingEntry(booking, { asMentor });
  if (!prepared.ok) return prepared;

  const block = meetingEntryBlockedReason(booking, { asMentor });
  if (block) return { ok: false, status: 400, error: block };

  if (asMentor && !booking.mentorCheckInAt) {
    return {
      ok: false,
      status: 403,
      error: "Hoàn tất check-in webcam trước khi vào phòng họp.",
    };
  }

  let started = false;
  if (booking.status === "in_progress" && !isBookingInLiveWindow(booking)) {
    booking.status = "confirmed";
    await booking.save();
  } else if (booking.status === "confirmed" && isBookingInLiveWindow(booking)) {
    booking.status = "in_progress";
    await booking.save();
    started = true;
  }

  await booking.populate([
    { path: "userId", select: "name email avatar" },
    {
      path: "mentorId",
      select: "name title company avatar publicId userId",
      populate: { path: "userId", select: "email" },
    },
  ]);

  const actor = await User.findById(userId).select("name email avatar role").lean();
  let meeting = { provider: "jitsi_public" };
  try {
    meeting =
      buildJaasMeetingLaunch({
        bookingId: booking._id,
        user: actor
          ? { id: actor._id, name: actor.name, email: actor.email, avatar: actor.avatar }
          : null,
        asMentor,
      }) || meeting;
  } catch (err) {
    console.error("[jaas] Không ký được JWT phòng họp:", err?.message || err);
  }

  return { ok: true, booking: toPublicBooking(booking), started, meeting };
}

/** Mentor chụp webcam check-in trước khi vào phòng họp. */
export async function recordMentorMeetingCheckIn(mentorUserId, rawId, body = {}) {
  if (!isMongoReady()) return { ok: false, status: 503, error: MONGO_ERR };
  const mentor = await getMentorByUserId(mentorUserId);
  if (!mentor?._id) return { ok: false, status: 404, error: "Không tìm thấy hồ sơ mentor." };
  if (!mongoose.isValidObjectId(rawId)) return { ok: false, status: 400, error: "id booking không hợp lệ." };

  const imageUrl = String(body?.imageUrl ?? body?.checkInImageUrl ?? "").trim();
  if (!imageUrl) {
    return { ok: false, status: 400, error: "Thiếu ảnh check-in." };
  }

  const booking = await Booking.findOne({ _id: rawId, mentorId: mentor._id });
  if (!booking) return { ok: false, status: 404, error: "Không tìm thấy booking." };

  if (["cancelled", "completed", "no_show"].includes(String(booking.status || ""))) {
    return { ok: false, status: 400, error: "Không thể check-in cho buổi đã kết thúc hoặc đã hủy." };
  }

  const prepared = await prepareBookingForMeetingEntry(booking, { asMentor: true });
  if (!prepared.ok) return prepared;

  const block = meetingEntryBlockedReason(booking, { asMentor: true });
  if (block) return { ok: false, status: 400, error: block };

  booking.mentorCheckInImageUrl = imageUrl.slice(0, 2048);
  booking.mentorCheckInAt = new Date();
  booking.mentorCheckInUserId = mentorUserId;
  await booking.save();

  await booking.populate([
    { path: "userId", select: "name email avatar" },
    {
      path: "mentorId",
      select: "name title company avatar publicId userId",
      populate: { path: "userId", select: "email" },
    },
  ]);
  return { ok: true, booking: toPublicBooking(booking) };
}

export async function updateMentorNotes(mentorUserId, rawId, body) {
  if (!isMongoReady()) return { ok: false, status: 503, error: MONGO_ERR };
  const mentor = await getMentorByUserId(mentorUserId);
  if (!mentor?._id) return { ok: false, status: 404, error: "Không tìm thấy hồ sơ mentor." };
  if (!mongoose.isValidObjectId(rawId)) return { ok: false, status: 400, error: "id booking không hợp lệ." };

  const notes = typeof body?.notes === "string" ? body.notes.trim().slice(0, 8000) : "";
  if (!notes) return { ok: false, status: 400, error: "Thiếu notes." };

  const booking = await Booking.findOne({ _id: rawId, mentorId: mentor._id });
  if (!booking) return { ok: false, status: 404, error: "Không tìm thấy booking." };

  booking.mentorNotes = notes;
  await booking.save();
  await booking.populate([
    { path: "userId", select: "name email avatar settings.notificationPrefs" },
    { path: "mentorId", select: "name title company avatar publicId userId", populate: { path: "userId", select: "email" } }
  ]);

  // Gửi thông báo & email cho học viên
  const student = booking.userId;
  const mentorData = booking.mentorId;
  
  console.log(`[updateMentorNotes] Booking: ${booking._id}, Student: ${student ? student.email : "NULL"}`);

  if (student && student.email) {
    console.log(`Attempting to send email to ${student.email}`);
    // 1. Tạo thông báo trên Web
    try {
      await notifyBookingOwner(student._id, {
        type: "feedback",
        title: "Nhận xét mới từ Mentor",
        body: `Mentor ${mentorData?.name || "của bạn"} đã gửi nhận xét cho buổi học ${booking.sessionType === "mock_interview" ? "Phỏng vấn giả định" : "Tư vấn lộ trình"}.`,
        metadata: {
          bookingId: booking._id,
          mentorId: mentorData?._id,
          actionUrl: `/session/${booking._id}`,
        },
      });
      console.log(`Web notification created.`);
    } catch (err) {
      console.error(`Notification error: ${err.message}`);
    }

    // 2. Gửi Email — chỉ gửi nếu học viên chưa tắt "Phản hồi từ mentor" trong Cài đặt.
    const studentPrefs = mergeNotificationPrefs("customer", student.settings?.notificationPrefs);
    if (studentPrefs.mentor_feedback === false) {
      console.log(`SKIP EMAIL: student turned off mentor_feedback notifications.`);
    } else {
      try {
        const emailRes = await sendMentorFeedbackEmail(
          student.email,
          student.name || "Bạn",
          mentorData?.name || "Mentor",
          booking.sessionType,
          notes
        );
        console.log(`Email send result: ${JSON.stringify(emailRes)}`);
      } catch (err) {
        console.error(`Email send error: ${err.message}`);
      }
    }
  } else {
    console.log(`SKIP EMAIL: Student or Email is missing.`);
  }

  return { ok: true, booking: toPublicBooking(booking) };

}

/** Mentor gửi tổng kết có cấu trúc (rating + strengths/improvements/recommendation) sau khi buổi đã completed. */
export async function updateMentorSummary(mentorUserId, rawId, body) {
  if (!isMongoReady()) return { ok: false, status: 503, error: MONGO_ERR };
  const mentor = await getMentorByUserId(mentorUserId);
  if (!mentor?._id) return { ok: false, status: 404, error: "Không tìm thấy hồ sơ mentor." };
  if (!mongoose.isValidObjectId(rawId)) return { ok: false, status: 400, error: "id booking không hợp lệ." };

  const rating = Number(body?.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { ok: false, status: 400, error: "Đánh giá (rating) phải là số nguyên từ 1 đến 5." };
  }

  const clean = (v) => (typeof v === "string" ? v.trim().slice(0, 2000) : "");
  const strengths = clean(body?.strengths);
  const improvements = clean(body?.improvements);
  const recommendation = clean(body?.recommendation);
  const generalNotes = clean(body?.generalNotes);
  if (!strengths && !improvements && !recommendation && !generalNotes) {
    return { ok: false, status: 400, error: "Cần ít nhất một nội dung nhận xét." };
  }

  const booking = await Booking.findOne({ _id: rawId, mentorId: mentor._id });
  if (!booking) return { ok: false, status: 404, error: "Không tìm thấy booking." };
  if (booking.status !== "completed") {
    return { ok: false, status: 400, error: "Chỉ gửi tổng kết sau khi buổi học đã hoàn thành." };
  }

  const now = new Date();
  const submittedLate =
    booking.completedAt instanceof Date &&
    now.getTime() - booking.completedAt.getTime() > FEEDBACK_REMINDER_DAYS * 24 * 60 * 60 * 1000;

  booking.mentorSummary = {
    rating,
    strengths,
    improvements,
    recommendation,
    generalNotes,
    submittedAt: now,
    submittedLate,
  };
  await booking.save();
  await booking.populate([
    { path: "userId", select: "name email avatar settings.notificationPrefs" },
    { path: "mentorId", select: "name title company avatar publicId userId", populate: { path: "userId", select: "email" } }
  ]);

  const student = booking.userId;
  const mentorData = booking.mentorId;

  if (student && student.email) {
    try {
      await notifyBookingOwner(student._id, {
        type: "feedback",
        title: "Tổng kết buổi học từ Mentor",
        body: `Mentor ${mentorData?.name || "của bạn"} đã gửi tổng kết cho buổi học ${booking.sessionType === "mock_interview" ? "Phỏng vấn giả định" : "Tư vấn lộ trình"}.`,
        metadata: {
          bookingId: booking._id,
          mentorId: mentorData?._id,
          actionUrl: `/session/${booking._id}`,
        },
      });
    } catch (err) {
      console.error(`[updateMentorSummary] notify error: ${err.message}`);
    }

    const studentPrefs = mergeNotificationPrefs("customer", student.settings?.notificationPrefs);
    if (studentPrefs.mentor_feedback !== false) {
      const emailNotes = [
        strengths && `Điểm mạnh: ${strengths}`,
        improvements && `Cần cải thiện: ${improvements}`,
        recommendation && `Lời khuyên: ${recommendation}`,
        generalNotes && `Nhận xét chi tiết: ${generalNotes}`,
      ].filter(Boolean).join("\n\n");
      try {
        await sendMentorFeedbackEmail(
          student.email,
          student.name || "Bạn",
          mentorData?.name || "Mentor",
          booking.sessionType,
          emailNotes
        );
      } catch (err) {
        console.error(`[updateMentorSummary] email error: ${err.message}`);
      }
    }
  }

  return { ok: true, booking: toPublicBooking(booking) };
}

export async function cancelMyBooking(userId, rawId, body) {
  if (!isMongoReady()) return { ok: false, status: 503, error: MONGO_ERR };
  const uid = String(userId).trim();
  const q = bookingQueryForUser(rawId);
  if (!q) return { ok: false, status: 400, error: "Thiếu id booking." };

  const reason = typeof body?.reason === "string" ? body.reason.trim().slice(0, 2000) : "";

  const booking = await Booking.findOne({ userId: uid, ...q });
  if (!booking) return { ok: false, status: 404, error: "Không tìm thấy booking." };

  if (["cancelled", "completed", "no_show"].includes(booking.status)) {
    return { ok: false, status: 400, error: "Không thể hủy booking ở trạng thái này." };
  }

  // Buổi trả bằng quota gói — không có tiền CK để hoàn, xử lý riêng (bỏ qua ledger tiền mặt bên dưới).
  if (booking.paymentMethod === "plan_quota") {
    const sessionAt = parseBookingDateTime(booking.date, booking.timeSlot);
    const hoursUntilStart =
      sessionAt instanceof Date ? (sessionAt.getTime() - Date.now()) / 3_600_000 : Number.POSITIVE_INFINITY;
    const feePercent = userCancellationFeePercent(hoursUntilStart);
    const refundPercent = Math.max(0, 100 - feePercent);
    const quotaRestored = refundPercent === 100;

    booking.status = "cancelled";
    booking.cancelledBy = "user";
    booking.cancelReason = reason || "Người dùng hủy";
    booking.cancelledAt = new Date();
    booking.cancelRefundPercent = refundPercent;
    booking.cancelRefundAmountVnd = 0;
    booking.cancelRetainedAmountVnd = 0;
    await booking.save();

    if (quotaRestored) {
      await releaseMentorSessionQuota(booking.userId);
    }

    await notifyBookingOwner(booking.userId, {
      type: "booking_cancelled",
      title: "Đã hủy lịch hẹn",
      body: quotaRestored
        ? "Đã hủy buổi (dùng quota gói) — buổi đã được hoàn lại vào quota tháng này."
        : "Đã hủy buổi. Theo chính sách hủy trong vòng 24h trước giờ hẹn, buổi dùng quota gói này không được hoàn lại.",
      metadata: { bookingId: String(booking._id), refundAmountVnd: 0 },
    });

    const mentorLean = await Mentor.findById(booking.mentorId).select("userId").lean();
    if (mentorLean?.userId) {
      const student = await User.findById(booking.userId).select("name").lean();
      await notifyMentorBooking(mentorLean.userId, "booking_change", {
        type: "booking_cancelled",
        title: "Học viên đã hủy buổi",
        body: `${student?.name || "Học viên"} hủy lịch ${booking.date} ${booking.timeSlot}.`,
        metadata: { bookingId: booking._id, actionUrl: "/mentor/schedule" },
      });
    }

    const mentorForResponse = mentorLean || (await Mentor.findById(booking.mentorId).lean());
    return {
      ok: true,
      booking: toPublicBooking(booking, mentorForResponse),
      cancellationPolicy: {
        hoursUntilStart: Number.isFinite(hoursUntilStart) ? Number(hoursUntilStart.toFixed(2)) : null,
        feePercent,
        refundPercent,
        refundAmountVnd: 0,
        retainedAmountVnd: 0,
        paidTotalVnd: 0,
        ledger: quotaRestored ? "plan_quota_restored" : "plan_quota_forfeited",
      },
    };
  }

  const payStatusNow = String(booking.paymentStatus || "").toLowerCase();
  if (payStatusNow === "refund_pending") {
    return {
      ok: false,
      status: 400,
      error: "Yêu cầu hoàn tiền đã được ghi nhận. Vui lòng chờ admin xử lý.",
    };
  }
  if (payStatusNow === "refunded" || payStatusNow === "partial_refund") {
    return { ok: false, status: 400, error: "Booking đã được xử lý hoàn tiền." };
  }
  if (Number(booking.cancelRefundAmountVnd || 0) > 0 && booking.cancelledAt) {
    return {
      ok: false,
      status: 400,
      error: "Yêu cầu hoàn tiền chỉ được gửi một lần cho mỗi lịch hẹn.",
    };
  }

  const sessionAt = parseBookingDateTime(booking.date, booking.timeSlot);
  const hoursUntilStart = sessionAt instanceof Date ? (sessionAt.getTime() - Date.now()) / 3_600_000 : Number.POSITIVE_INFINITY;
  const feePercent = userCancellationFeePercent(hoursUntilStart);
  const refundPercent = Math.max(0, 100 - feePercent);

  let settlement = await applyUserCancellationLedger(booking, refundPercent, { dryRun: true });

  if (
    settlement.ledger === "not_paid_no_settlement" &&
    String(booking.paymentMethod || "").toLowerCase() !== "transfer" &&
    String(booking.paymentStatus || "").toLowerCase() === "paid"
  ) {
    const paidTotal = Math.round(Number(booking.totalAmount ?? booking.price ?? 0));
    const refundAmountVnd = Math.min(Math.round((paidTotal * refundPercent) / 100), paidTotal);
    const retainedAmountVnd = paidTotal - refundAmountVnd;
    settlement = {
      refundAmountVnd,
      retainedAmountVnd,
      paidTotalVnd: paidTotal,
      ledger: "non_transfer_manual_reconcile",
    };
  }

  const dest = parseRefundDestination(body);
  if (settlement.refundAmountVnd > 0 && !isValidRefundDestination(dest)) {
    return {
      ok: false,
      status: 400,
      error:
        "Bạn được hoàn tiền theo chính sách. Vui lòng điền đầy đủ ngân hàng, số tài khoản (ít nhất 6 chữ số) và tên chủ tài khoản nhận hoàn.",
      needRefundDestination: true,
    };
  }

  settlement = await applyUserCancellationLedger(booking, refundPercent);

  if (settlement.ledger === "refund_already_requested") {
    return {
      ok: false,
      status: 400,
      error: "Yêu cầu hoàn tiền chỉ được gửi một lần. Vui lòng chờ admin xử lý hoặc kiểm tra trạng thái lịch hẹn.",
    };
  }

  if (
    settlement.ledger === "not_paid_no_settlement" &&
    String(booking.paymentMethod || "").toLowerCase() !== "transfer" &&
    String(booking.paymentStatus || "").toLowerCase() === "paid"
  ) {
    const paidTotal = Math.round(Number(booking.totalAmount ?? booking.price ?? 0));
    const refundAmountVnd = Math.min(Math.round((paidTotal * refundPercent) / 100), paidTotal);
    const retainedAmountVnd = paidTotal - refundAmountVnd;
    settlement = {
      refundAmountVnd,
      retainedAmountVnd,
      paidTotalVnd: paidTotal,
      ledger: "non_transfer_manual_reconcile",
    };
  }

  booking.cancelRefundPercent = refundPercent;
  booking.cancelRefundAmountVnd = settlement.refundAmountVnd;
  booking.cancelRetainedAmountVnd = settlement.retainedAmountVnd;

  if (settlement.refundAmountVnd > 0) {
    booking.refundReceiveBankName = dest.bank;
    booking.refundReceiveAccountNumber = dest.acct;
    booking.refundReceiveAccountHolder = dest.holder;
  }

  const payStatusBefore = String(booking.paymentStatus || "").toLowerCase();
  booking.paymentStatus = deriveBookingPaymentStatusAfterUserCancel(settlement, {
    paymentStatus: payStatusBefore,
  });

  booking.status = "cancelled";
  booking.cancelledBy = "user";
  booking.cancelReason = reason || "Người dùng hủy";
  booking.cancelledAt = new Date();
  await booking.save();

  await notifyBookingOwner(booking.userId, {
    type: "booking_cancelled",
    title: "Đã hủy lịch hẹn",
    body:
      settlement.refundAmountVnd > 0
        ? `Đã ghi nhận yêu cầu hoàn ${Math.round(settlement.refundAmountVnd).toLocaleString("vi-VN")}₫ (${refundPercent}%). Admin sẽ CK hoàn vào STK bạn đã khai báo; bạn sẽ được thông báo khi hoàn xong.`
        : settlement.ledger === "cancelled_pending_transfer"
          ? "Giao dịch chờ chuyển khoản đã được hủy — bạn chưa bị trừ tiền thành công."
          : "Theo chính sách hủy, bạn không được hoàn tiền cho buổi này.",
    metadata: { bookingId: String(booking._id), refundAmountVnd: settlement.refundAmountVnd },
  });

  const mentorLean = await Mentor.findById(booking.mentorId).select("userId").lean();
  if (mentorLean?.userId) {
    const student = await User.findById(booking.userId).select("name").lean();
    await notifyMentorBooking(mentorLean.userId, "booking_change", {
      type: "booking_cancelled",
      title: "Học viên đã hủy buổi",
      body: `${student?.name || "Học viên"} hủy lịch ${booking.date} ${booking.timeSlot}.`,
      metadata: {
        bookingId: booking._id,
        actionUrl: "/mentor/schedule",
      },
    });
  }

  const mentor = mentorLean || (await Mentor.findById(booking.mentorId).lean());
  return {
    ok: true,
    booking: toPublicBooking(booking, mentor),
    cancellationPolicy: {
      hoursUntilStart: Number.isFinite(hoursUntilStart) ? Number(hoursUntilStart.toFixed(2)) : null,
      feePercent,
      refundPercent,
      refundAmountVnd: settlement.refundAmountVnd,
      retainedAmountVnd: settlement.retainedAmountVnd,
      paidTotalVnd: settlement.paidTotalVnd,
      ledger: settlement.ledger,
    },
  };
}

/** HV: không đổi lịch trực tiếp — dùng cancelMyBooking + đặt mới; hoặc resolveMentorCancelBooking khi mentor hủy ≥24h. */
export async function rescheduleMyBooking(_userId, _rawId, _body) {
  if (!isMongoReady()) return { ok: false, status: 503, error: MONGO_ERR };
  return {
    ok: false,
    status: 400,
    error:
      "Theo chính sách, bạn hủy buổi (hoàn theo thời điểm hủy) rồi đặt lịch mới. Đổi lịch trên cùng buổi chỉ khi mentor đã hủy từ 24 giờ trở lên — chọn phương án trên trang buổi hẹn.",
  };
}

export async function cancelMentorBooking(mentorUserId, rawId, body) {
  if (!isMongoReady()) return { ok: false, status: 503, error: MONGO_ERR };
  const mentor = await getMentorByUserId(mentorUserId);
  if (!mentor?._id) return { ok: false, status: 404, error: "Không tìm thấy hồ sơ mentor." };
  if (!mongoose.isValidObjectId(rawId)) return { ok: false, status: 400, error: "id booking không hợp lệ." };

  const reason = typeof body?.reason === "string" ? body.reason.trim().slice(0, 2000) : "";
  if (!reason) {
    return { ok: false, status: 400, error: "Vui lòng nhập lý do hủy lịch." };
  }
  const booking = await Booking.findOne({ _id: rawId, mentorId: mentor._id });
  if (!booking) return { ok: false, status: 404, error: "Không tìm thấy booking." };

  if (["cancelled", "completed", "no_show"].includes(booking.status)) {
    return { ok: false, status: 400, error: "Không thể hủy booking ở trạng thái này." };
  }

  const startAt = parseBookingDateTime(booking.date, booking.timeSlot);
  let hoursUntilStart = null;
  if (startAt && Number.isFinite(startAt.getTime())) {
    const diffMs = startAt.getTime() - Date.now();
    hoursUntilStart = diffMs / 3_600_000;
    if (diffMs <= 0) {
      return {
        ok: false,
        status: 400,
        error:
          "Buổi đã qua giờ bắt đầu. Nếu mentor không tham gia, học viên báo no-show hoặc admin xử lý.",
      };
    }
  }

  const payStatusBefore = String(booking.paymentStatus || "").toLowerCase();
  if (payStatusBefore === "refund_pending") {
    return {
      ok: false,
      status: 400,
      error: "Yêu cầu hoàn tiền đã được ghi nhận. Vui lòng chờ admin xử lý.",
    };
  }
  if (payStatusBefore === "refunded" || payStatusBefore === "partial_refund") {
    return { ok: false, status: 400, error: "Booking đã được xử lý hoàn tiền." };
  }

  const paidBooking = payStatusBefore === "paid";
  const paidTotal = Math.round(Number(booking.totalAmount ?? booking.price ?? 0));
  const isLateCancel =
    hoursUntilStart != null && hoursUntilStart > 0 && hoursUntilStart < MENTOR_CANCEL_MIN_HOURS;

  booking.status = "cancelled";
  booking.cancelledBy = "mentor";
  booking.cancelReason = reason;
  booking.cancelledAt = new Date();
  booking.mentorCancelResolutionAt = new Date();

  if (booking.paymentMethod === "plan_quota") {
    // Không có tiền CK để hoàn — mentor hủy không phải lỗi HV nên luôn hoàn lại quota buổi.
    await releaseMentorSessionQuota(booking.userId);
    booking.mentorCancelResolution = "";
    booking.cancelRefundPercent = null;
    booking.cancelRefundAmountVnd = null;
    booking.cancelRetainedAmountVnd = null;
    booking.paymentStatus = "paid";
  } else if (paidBooking && paidTotal > 0 && isLateCancel) {
    /** <24h: ưu tiên hoàn 100% — không chọn đổi lịch/đổi mentor. */
    let settlement = await applyUserCancellationLedger(booking, 100);
    if (settlement.ledger === "refund_already_requested") {
      return { ok: false, status: 400, error: "Yêu cầu hoàn tiền chỉ được gửi một lần." };
    }
    booking.mentorCancelResolution = "late_cancel_refund";
    booking.cancelRefundPercent = 100;
    booking.cancelRefundAmountVnd = settlement.refundAmountVnd;
    booking.cancelRetainedAmountVnd = settlement.retainedAmountVnd;
    booking.paymentStatus = deriveBookingPaymentStatusAfterUserCancel(settlement, {
      paymentStatus: payStatusBefore,
    });
  } else if (paidBooking && paidTotal > 0) {
    /** ≥24h: HV chọn đổi lịch / đổi mentor / hoàn 100%. */
    booking.mentorCancelResolution = "awaiting_user";
    booking.cancelRefundPercent = 100;
    booking.cancelRefundAmountVnd = paidTotal;
    booking.cancelRetainedAmountVnd = 0;
    booking.paymentStatus = "paid";
  } else {
    booking.mentorCancelResolution = "";
    booking.cancelRefundPercent = null;
    booking.cancelRefundAmountVnd = null;
    booking.cancelRetainedAmountVnd = null;
    if (payStatusBefore === "pending") booking.paymentStatus = "failed";
  }

  await booking.save();
  await booking.populate([
    { path: "userId", select: "name email avatar" },
    { path: "mentorId", select: "name title company avatar publicId userId", populate: { path: "userId", select: "email" } },
  ]);

  const notifyBody =
    paidBooking && paidTotal > 0 && isLateCancel
      ? `Mentor hủy khi còn dưới ${MENTOR_CANCEL_MIN_HOURS} giờ. Hoàn ưu tiên 100% (${paidTotal.toLocaleString("vi-VN")}₫) — vui lòng vào trang buổi hẹn để điền STK nhận hoàn.`
      : paidBooking && paidTotal > 0
        ? `Buổi ${booking.date} lúc ${booking.timeSlot} đã bị mentor hủy. Vui lòng vào trang buổi hẹn để chọn: đổi lịch, đổi mentor hoặc hoàn tiền 100% (${paidTotal.toLocaleString("vi-VN")}₫).`
        : `Buổi hẹn ngày ${booking.date} lúc ${booking.timeSlot} đã bị hủy. Lý do: ${reason}`;

  await notifyBookingOwner(booking.userId?._id || booking.userId, {
    type: "booking_cancelled",
    title: isLateCancel ? "Mentor hủy gấp — hoàn tiền ưu tiên" : "Mentor đã hủy lịch hẹn",
    body: notifyBody,
    metadata: {
      bookingId: booking._id,
      mentorId: booking.mentorId?._id || booking.mentorId,
      actionUrl: `/session/${booking._id}`,
      refundAmountVnd: paidBooking ? paidTotal : 0,
      lateCancel: isLateCancel,
    },
  });

  return {
    ok: true,
    booking: toPublicBooking(booking),
    lateCancel: isLateCancel,
    refundPending: String(booking.paymentStatus || "").toLowerCase() === "refund_pending",
  };
}

async function incrementMentorNoShowViolation(mentorObjectId, bookingId, note = "") {
  if (!mongoose.isValidObjectId(String(mentorObjectId || ""))) return;
  await Mentor.findByIdAndUpdate(mentorObjectId, {
    $inc: { "stats.noShowCount": 1 },
  });
  const mentorUser = await Mentor.findById(mentorObjectId).select("userId").lean();
  if (mentorUser?.userId) {
    await Notification.create({
      userId: mentorUser.userId,
      type: "system",
      title: "Ghi nhận no-show",
      body: note || "Buổi hẹn bị đánh dấu mentor không tham gia — vi phạm đã được ghi vào hồ sơ.",
      metadata: { bookingId, violation: "no_show" },
    });
  }
}

/**
 * Mentor no-show: hoàn 100% cho HV + tăng noShowCount trên hồ sơ mentor.
 * @param {"admin"|"user"|"system"} markedBy
 */
export async function processBookingNoShow(rawId, body = {}, { markedBy = "admin", actorUserId = null } = {}) {
  if (!isMongoReady()) return { ok: false, status: 503, error: MONGO_ERR };
  if (!mongoose.isValidObjectId(rawId)) {
    return { ok: false, status: 400, error: "id booking không hợp lệ." };
  }

  const booking = await Booking.findById(rawId);
  if (!booking) return { ok: false, status: 404, error: "Không tìm thấy booking." };

  if (booking.status === "no_show") {
    const mentor = await Mentor.findById(booking.mentorId).lean();
    return { ok: true, booking: toPublicBooking(booking, mentor), idempotent: true };
  }

  if (["cancelled", "completed"].includes(booking.status)) {
    return {
      ok: false,
      status: 400,
      error: "Không thể đánh no-show cho booking đã hủy hoặc đã hoàn thành.",
    };
  }

  const startAt = parseBookingDateTime(booking.date, booking.timeSlot);
  const graceMs = 15 * 60 * 1000;
  if (startAt && Number.isFinite(startAt.getTime()) && startAt.getTime() + graceMs > Date.now()) {
    return {
      ok: false,
      status: 400,
      error: "Chỉ báo no-show sau khi buổi đã bắt đầu (tối thiểu 15 phút).",
    };
  }

  if (markedBy === "user") {
    const uid = String(actorUserId || "").trim();
    if (String(booking.userId) !== uid) {
      return { ok: false, status: 403, error: "Chỉ học viên của buổi hẹn mới được báo no-show." };
    }
    // Mentor đã check-in webcam (bằng chứng đã cố vào phòng) — không cho HV tự báo no-show
    // (hoàn 100% + tăng vi phạm mentor) mâu thuẫn với bằng chứng có sẵn; đẩy sang admin xử lý.
    if (booking.mentorCheckInAt) {
      return {
        ok: false,
        status: 400,
        error:
          "Mentor đã check-in cho buổi này. Nếu mentor rời phòng giữa chừng, vui lòng liên hệ hỗ trợ để được xem xét thay vì tự báo no-show.",
      };
    }
  }

  const payStatusBefore = String(booking.paymentStatus || "").toLowerCase();
  const paidBooking = payStatusBefore === "paid";
  const note = typeof body?.note === "string" ? body.note.trim().slice(0, 2000) : "";

  booking.status = "no_show";
  booking.cancelledBy = "mentor";
  booking.cancelReason = note || "Mentor không tham gia buổi hẹn (no-show).";
  booking.cancelledAt = booking.cancelledAt || new Date();
  booking.noShowBy = "mentor";
  booking.mentorCancelResolution = "no_show_refund";
  booking.mentorCancelResolutionAt = new Date();

  let settlement = { refundAmountVnd: 0, ledger: "not_paid_no_settlement" };
  if (booking.paymentMethod === "plan_quota") {
    // Mentor no-show không phải lỗi HV — không có tiền CK để hoàn, hoàn lại quota buổi thay vào đó.
    await releaseMentorSessionQuota(booking.userId);
    booking.cancelRefundPercent = null;
    booking.cancelRefundAmountVnd = null;
    booking.cancelRetainedAmountVnd = null;
    booking.paymentStatus = "paid";
  } else if (paidBooking) {
    settlement = await applyUserCancellationLedger(booking, 100);
    if (settlement.ledger === "refund_already_requested") {
      return { ok: false, status: 400, error: "Yêu cầu hoàn tiền đã được ghi nhận." };
    }
    booking.cancelRefundPercent = 100;
    booking.cancelRefundAmountVnd = settlement.refundAmountVnd;
    booking.cancelRetainedAmountVnd = settlement.retainedAmountVnd;
    booking.paymentStatus = deriveBookingPaymentStatusAfterUserCancel(settlement, {
      paymentStatus: payStatusBefore,
    });
  }

  await booking.save();
  await incrementMentorNoShowViolation(
    booking.mentorId,
    booking._id,
    `No-show buổi ${booking.date} ${booking.timeSlot}${markedBy === "user" ? " (HV báo)" : ""}.`,
  );

  await notifyBookingOwner(booking.userId, {
    type: "booking_cancelled",
    title: "Mentor không tham gia (no-show)",
    body: paidBooking
      ? `Bạn được hoàn ưu tiên 100% (${Math.round(settlement.refundAmountVnd || 0).toLocaleString("vi-VN")}₫). Vui lòng điền STK nhận hoàn trên trang buổi hẹn.`
      : "Buổi được ghi nhận mentor no-show. Liên hệ support nếu cần hỗ trợ.",
    metadata: {
      bookingId: booking._id,
      actionUrl: `/session/${booking._id}`,
      refundAmountVnd: settlement.refundAmountVnd || 0,
    },
  });

  const mentor = await Mentor.findById(booking.mentorId).select("stats.noShowCount").lean();
  return {
    ok: true,
    booking: toPublicBooking(booking, mentor),
    refundAmountVnd: settlement.refundAmountVnd,
    mentorNoShowCount: mentor?.stats?.noShowCount ?? null,
  };
}

const MENTOR_CANCEL_RESOLUTION_CHOICES = new Set(["reschedule", "change_mentor", "refund"]);

/** HV chọn phương án sau khi mentor hủy (đã thanh toán, ≥24h). */
export async function resolveMentorCancelBooking(userId, rawId, body) {
  if (!isMongoReady()) return { ok: false, status: 503, error: MONGO_ERR };
  const uid = String(userId).trim();
  const q = bookingQueryForUser(rawId);
  if (!q) return { ok: false, status: 400, error: "Thiếu id booking." };

  const choice = String(body?.choice || "").trim().toLowerCase();
  if (!MENTOR_CANCEL_RESOLUTION_CHOICES.has(choice)) {
    return {
      ok: false,
      status: 400,
      error: "choice phải là reschedule, change_mentor hoặc refund.",
    };
  }

  const booking = await Booking.findOne({ userId: uid, ...q });
  if (!booking) return { ok: false, status: 404, error: "Không tìm thấy booking." };

  if (String(booking.cancelledBy || "") !== "mentor" || booking.status !== "cancelled") {
    return { ok: false, status: 400, error: "Booking không ở trạng thái chờ xử lý sau mentor hủy." };
  }
  if (String(booking.mentorCancelResolution || "") !== "awaiting_user") {
    return { ok: false, status: 400, error: "Bạn đã chọn phương án xử lý cho lịch hẹn này." };
  }
  if (String(booking.paymentStatus || "").toLowerCase() !== "paid") {
    return { ok: false, status: 400, error: "Chỉ áp dụng khi đã thanh toán." };
  }

  const now = new Date();
  booking.mentorCancelResolution = choice;
  booking.mentorCancelResolutionAt = now;

  if (choice === "change_mentor") {
    const creditVnd = Math.round(Number(booking.totalAmount ?? booking.price ?? 0));
    booking.rebookCreditVnd = creditVnd > 0 ? creditVnd : null;
    booking.rebookCreditStatus = creditVnd > 0 ? "available" : "";
    await booking.save();
    const mentor = await Mentor.findById(booking.mentorId).lean();
    await notifyBookingOwner(booking.userId, {
      type: "system",
      title: "Đổi mentor — dùng số tiền đã trả",
      body:
        creditVnd > 0
          ? `Bạn có ${creditVnd.toLocaleString("vi-VN")}₫ để đặt mentor khác (không cần CK lại nếu giá buổi mới ≤ số này).`
          : "Hãy chọn mentor khác để đặt lịch mới.",
      metadata: { bookingId: booking._id, actionUrl: `/mentors?rebookFrom=${booking._id}` },
    });
    return {
      ok: true,
      booking: toPublicBooking(booking, mentor),
      resolution: choice,
      rebookCreditVnd: creditVnd,
    };
  }

  if (choice === "refund") {
    const dest = parseRefundDestination(body);
    if (!isValidRefundDestination(dest)) {
      return {
        ok: false,
        status: 400,
        error: "Vui lòng điền đầy đủ ngân hàng, số tài khoản (≥6 chữ số) và tên chủ tài khoản.",
        needRefundDestination: true,
      };
    }
    const refundPercent = 100;
    let settlement = await applyUserCancellationLedger(booking, refundPercent);
    if (settlement.ledger === "refund_already_requested") {
      return { ok: false, status: 400, error: "Yêu cầu hoàn tiền chỉ được gửi một lần." };
    }
    booking.refundReceiveBankName = dest.bank;
    booking.refundReceiveAccountNumber = dest.acct;
    booking.refundReceiveAccountHolder = dest.holder;
    booking.cancelRefundPercent = refundPercent;
    booking.cancelRefundAmountVnd = settlement.refundAmountVnd;
    booking.cancelRetainedAmountVnd = settlement.retainedAmountVnd;
    booking.paymentStatus = deriveBookingPaymentStatusAfterUserCancel(settlement, {
      paymentStatus: "paid",
    });
    await booking.save();
    const mentor = await Mentor.findById(booking.mentorId).lean();
    return {
      ok: true,
      booking: toPublicBooking(booking, mentor),
      resolution: choice,
      refundAmountVnd: settlement.refundAmountVnd,
    };
  }

  /** reschedule — cùng mentor, slot mới */
  const newDateRaw = typeof body?.newDate === "string" ? body.newDate.trim() : "";
  const newTime = String(body?.newTimeSlot ?? body?.newTime ?? "").trim();
  if (!newDateRaw || !newTime || !/^\d{1,2}:\d{2}$/.test(newTime)) {
    return { ok: false, status: 400, error: "Thiếu newDate hoặc newTimeSlot (HH:mm) khi đổi lịch." };
  }

  const newDateNorm = normalizeBookingDate(newDateRaw);
  const [th, tm] = newTime.split(":").map(Number);
  const newSlot = `${String(th).padStart(2, "0")}:${String(tm || 0).padStart(2, "0")}`;
  const mentorDoc = await Mentor.findById(booking.mentorId).select("availableSlots recurringSchedule blockedDates").lean();
  const allowedSlots = getMentorSlotsForDate(mentorDoc, newDateNorm);
  if (Array.isArray(allowedSlots)) {
    if (allowedSlots.length === 0) return { ok: false, status: 400, error: "Mentor không mở lịch cho ngày này." };
    if (!allowedSlots.includes(newSlot)) {
      return { ok: false, status: 400, error: "Khung giờ mới không nằm trong lịch mentor mở." };
    }
  }
  const rescheduleAt = parseBookingDateTime(newDateNorm, newSlot);
  if (!rescheduleAt || Number.isNaN(rescheduleAt.getTime())) {
    return { ok: false, status: 400, error: "Ngày/giờ đổi lịch không hợp lệ." };
  }
  if (!isBookingSlotInFuture(newDateNorm, newSlot)) {
    return { ok: false, status: 400, error: "Không thể chọn khung giờ trong quá khứ." };
  }
  const dup = await Booking.findOne({
    mentorId: booking.mentorId,
    date: newDateNorm,
    timeSlot: newSlot,
    status: { $in: ["pending", "confirmed", "in_progress"] },
    _id: { $ne: booking._id },
  })
    .select("_id")
    .lean();
  if (dup) return { ok: false, status: 409, error: "Khung giờ mới đã có người đặt." };

  const entry = {
    oldDate: booking.date,
    oldTimeSlot: booking.timeSlot,
    newDate: newDateNorm,
    newTimeSlot: newSlot,
    reason: "Học viên đổi lịch sau mentor hủy",
    changedBy: "user",
    changedAt: now,
  };
  booking.rescheduleHistory = [...(booking.rescheduleHistory || []), entry];
  booking.date = newDateNorm;
  booking.timeSlot = newSlot;
  booking.status = "confirmed";
  booking.cancelledBy = "";
  booking.cancelReason = "";
  booking.cancelledAt = null;
  booking.cancelRefundPercent = null;
  booking.cancelRefundAmountVnd = null;
  booking.cancelRetainedAmountVnd = null;
  try {
    await booking.save();
  } catch (err) {
    if (err?.code === 11000) {
      return { ok: false, status: 409, error: "Khung giờ mới vừa có người đặt. Chọn giờ khác." };
    }
    throw err;
  }

  const mentor = await Mentor.findById(booking.mentorId).lean();
  await notifyBookingOwner(booking.userId, {
    type: "system",
    title: "Đã đổi lịch buổi hẹn",
    body: `Lịch mới: ${booking.date} lúc ${booking.timeSlot}. Buổi vẫn giữ nguyên thanh toán.`,
    metadata: { bookingId: booking._id, actionUrl: `/session/${booking._id}` },
  });
  return { ok: true, booking: toPublicBooking(booking, mentor), resolution: choice };
}

/** HV bổ sung STK nhận hoàn khi mentor hủy (chưa có TK lúc hủy). */
export async function updateMyBookingRefundDestination(userId, rawId, body) {
  if (!isMongoReady()) return { ok: false, status: 503, error: MONGO_ERR };
  const uid = String(userId).trim();
  const q = bookingQueryForUser(rawId);
  if (!q) return { ok: false, status: 400, error: "Thiếu id booking." };

  const booking = await Booking.findOne({ userId: uid, ...q });
  if (!booking) return { ok: false, status: 404, error: "Không tìm thấy booking." };

  if (String(booking.paymentStatus || "").toLowerCase() !== "refund_pending") {
    return {
      ok: false,
      status: 400,
      error: "Chỉ cập nhật STK khi lịch đang chờ hoàn tiền.",
    };
  }
  if (booking.refundCompletedAt) {
    return { ok: false, status: 400, error: "Admin đã xác nhận hoàn tiền — không thể đổi STK." };
  }

  const dest = parseRefundDestination(body);
  if (!isValidRefundDestination(dest)) {
    return {
      ok: false,
      status: 400,
      error: "Vui lòng điền đầy đủ ngân hàng, số tài khoản (≥6 chữ số) và tên chủ tài khoản.",
    };
  }

  booking.refundReceiveBankName = dest.bank;
  booking.refundReceiveAccountNumber = dest.acct;
  booking.refundReceiveAccountHolder = dest.holder;
  await booking.save();

  const mentor = await Mentor.findById(booking.mentorId).lean();
  return { ok: true, booking: toPublicBooking(booking, mentor) };
}

export async function rescheduleMentorBooking(mentorUserId, rawId, body) {
  if (!isMongoReady()) return { ok: false, status: 503, error: MONGO_ERR };
  const mentor = await getMentorByUserId(mentorUserId);
  if (!mentor?._id) return { ok: false, status: 404, error: "Không tìm thấy hồ sơ mentor." };
  if (!mongoose.isValidObjectId(rawId)) return { ok: false, status: 400, error: "id booking không hợp lệ." };

  const newDateRaw = typeof body?.newDate === "string" ? body.newDate.trim() : "";
  const newTime = String(body?.newTimeSlot ?? body?.newTime ?? "").trim();
  const reason = typeof body?.reason === "string" ? body.reason.trim().slice(0, 2000) : "";
  if (!newDateRaw || !newTime || !/^\d{1,2}:\d{2}$/.test(newTime)) {
    return { ok: false, status: 400, error: "Thiếu newDate hoặc newTimeSlot (HH:mm)." };
  }

  const booking = await Booking.findOne({ _id: rawId, mentorId: mentor._id });
  if (!booking) return { ok: false, status: 404, error: "Không tìm thấy booking." };
  if (Array.isArray(booking.rescheduleHistory) && booking.rescheduleHistory.length >= 1) {
    return { ok: false, status: 400, error: "Mỗi lịch hẹn chỉ được dời 1 lần." };
  }
  if (["cancelled", "completed", "no_show"].includes(booking.status)) {
    return { ok: false, status: 400, error: "Không thể đổi lịch booking ở trạng thái này." };
  }
  const windowCheck = assertRescheduleWindow(booking);
  if (!windowCheck.ok) return windowCheck;

  const newDateNorm = normalizeBookingDate(newDateRaw);
  const [th, tm] = newTime.split(":").map(Number);
  const newSlot = `${String(th).padStart(2, "0")}:${String(tm || 0).padStart(2, "0")}`;
  const mentorDoc = await Mentor.findById(booking.mentorId).select("availableSlots recurringSchedule blockedDates").lean();
  const allowedSlots = getMentorSlotsForDate(mentorDoc, newDateNorm);
  if (Array.isArray(allowedSlots)) {
    if (allowedSlots.length === 0) return { ok: false, status: 400, error: "Mentor không mở lịch cho ngày này." };
    if (!allowedSlots.includes(newSlot)) return { ok: false, status: 400, error: "Khung giờ mới không nằm trong lịch mentor mở." };
  }
  const rescheduleAt = parseBookingDateTime(newDateNorm, newSlot);
  if (!rescheduleAt || Number.isNaN(rescheduleAt.getTime())) {
    return { ok: false, status: 400, error: "Ngày/giờ đổi lịch không hợp lệ." };
  }
  if (!isBookingSlotInFuture(newDateNorm, newSlot)) {
    return { ok: false, status: 400, error: "Không thể chọn khung giờ trong quá khứ." };
  }
  const dup = await Booking.findOne({
    mentorId: booking.mentorId,
    date: newDateNorm,
    timeSlot: newSlot,
    status: { $in: ["pending", "confirmed", "in_progress"] },
    _id: { $ne: booking._id },
  }).select("_id").lean();
  if (dup) return { ok: false, status: 409, error: "Khung giờ mới đã có người đặt." };

  booking.rescheduleHistory = [
    ...(booking.rescheduleHistory || []),
    { oldDate: booking.date, oldTimeSlot: booking.timeSlot, newDate: newDateNorm, newTimeSlot: newSlot, reason, changedBy: "mentor", changedAt: new Date() },
  ];
  booking.date = newDateNorm;
  booking.timeSlot = newSlot;
  if (booking.status !== "pending") booking.status = "confirmed";
  try {
    await booking.save();
  } catch (err) {
    if (err?.code === 11000) {
      return { ok: false, status: 409, error: "Khung giờ mới vừa có người đặt. Chọn giờ khác." };
    }
    throw err;
  }
  await booking.populate([
    { path: "userId", select: "name email avatar" },
    { path: "mentorId", select: "name title company avatar publicId userId", populate: { path: "userId", select: "email" } }
  ]);

  await notifyBookingOwner(booking.userId?._id || booking.userId, {
    type: "system",
    title: "Lịch hẹn đã được mentor dời",
    body: `Mentor đã dời lịch sang ${booking.date} lúc ${booking.timeSlot}.${reason ? ` Lý do: ${reason}` : ""}`,
    metadata: {
      bookingId: booking._id,
      mentorId: booking.mentorId?._id || booking.mentorId,
      actionUrl: `/session/${booking._id}`,
    },
  });
  return { ok: true, booking: toPublicBooking(booking) };
}

export async function getMentorBookedSlots(mentorKey) {
  if (!isMongoReady()) return { ok: false, status: 503, error: MONGO_ERR };
  
  const or = [{ publicId: mentorKey }];
  if (mongoose.isValidObjectId(mentorKey)) or.push({ _id: mentorKey });

  const mentor = await Mentor.findOne({ $or: or }).select("_id").lean();
  if (!mentor) return { ok: false, status: 404, error: "Không tìm thấy mentor." };

  const rows = await Booking.find({
    mentorId: mentor._id,
    status: { $in: ["pending", "confirmed", "in_progress"] },
  })
    .select("date timeSlot")
    .lean();

  const booked = {};
  for (const r of rows) {
    if (!booked[r.date]) booked[r.date] = [];
    booked[r.date].push(r.timeSlot);
  }

  return { ok: true, booked };
}
