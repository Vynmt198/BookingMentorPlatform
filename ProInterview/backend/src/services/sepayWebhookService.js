import mongoose from "mongoose";
import { Booking } from "../models/Booking.js";
import { Course } from "../models/Course.js";
import { Enrollment } from "../models/Enrollment.js";
import { Payment } from "../models/Payment.js";
import { SepayWebhookEvent } from "../models/SepayWebhookEvent.js";
import { enrollmentAccessGranted } from "../helpers/enrollmentAccess.js";
import {
  extractOrderPart,
  normalizePiOrderRef,
  orderRefsMatch,
  parsePiOrderFromText,
} from "../utils/orderRef.js";
import {
  confirmEnrollmentTransferByAdmin,
  confirmSubscriptionTransferByAdmin,
} from "./paymentsService.js";
import { confirmBankTransferPaymentByAdmin } from "./bookingsService.js";

const MONGO_ERR = "MongoDB chưa kết nối. Kiểm tra MONGO_URI trong .env.";

function isMongoReady() {
  return mongoose.connection.readyState === 1;
}

function getSepayApiKey() {
  return String(process.env.SEPAY_WEBHOOK_API_KEY || process.env.SEPAY_API_KEY || "").trim();
}

export function verifySepayAuthorization(headerValue) {
  const expected = getSepayApiKey();
  if (!expected) return false;
  const raw = String(headerValue || "").trim();
  if (!raw) return false;
  const match = raw.match(/^Apikey\s+(.+)$/i);
  const token = match ? match[1].trim() : raw;
  return token === expected;
}

function amountsMatch(expected, received) {
  const e = Math.round(Number(expected) || 0);
  const r = Math.round(Number(received) || 0);
  if (e <= 0 || r <= 0) return false;
  return e === r;
}

function expectedBookingAmount(booking) {
  return Math.round(Number(booking.totalAmount ?? booking.price ?? 0));
}

async function findPendingTargets(orderRef) {
  const norm = normalizePiOrderRef(orderRef);
  if (!norm) return [];

  const targets = [];

  const bookings = await Booking.find({
    paymentMethod: "transfer",
    paymentStatus: "pending",
  })
    .select("_id userId paymentRef totalAmount price")
    .lean();
  for (const b of bookings) {
    if (orderRefsMatch(b.paymentRef, norm)) {
      targets.push({
        entityType: "booking",
        entityId: String(b._id),
        userId: String(b.userId),
        expectedAmount: expectedBookingAmount(b),
        transferSubmittedAt: b.transferSubmittedAt ?? null,
      });
    }
  }

  const enrollments = await Enrollment.find({
    paymentMethod: "transfer",
    paymentStatus: "pending",
  })
    .select("_id userId paymentRef pricePaid transferSubmittedAt courseId")
    .lean();
  const courseIds = enrollments.map((e) => e.courseId).filter(Boolean);
  const courseRows =
    courseIds.length > 0
      ? await Course.find({ _id: { $in: courseIds } })
          .select("price")
          .lean()
      : [];
  const priceByCourseId = new Map(
    courseRows.map((c) => [String(c._id), Math.round(Number(c.price ?? 0))]),
  );
  for (const e of enrollments) {
    if (orderRefsMatch(e.paymentRef, norm)) {
      const fromCourse = priceByCourseId.get(String(e.courseId)) ?? 0;
      const expectedAmount =
        fromCourse > 0 ? fromCourse : Math.round(Number(e.pricePaid ?? 0));
      targets.push({
        entityType: "course",
        entityId: String(e._id),
        userId: String(e.userId),
        expectedAmount,
        transferSubmittedAt: e.transferSubmittedAt ?? null,
        courseId: e.courseId ? String(e.courseId) : "",
      });
    }
  }

  const payments = await Payment.find({
    type: "subscription",
    provider: "transfer",
    status: "pending",
  })
    .select("_id userId amount providerRef providerResponse")
    .lean();
  for (const p of payments) {
    const ref = p.providerRef || p.providerResponse?.paymentRef || "";
    if (orderRefsMatch(ref, norm)) {
      targets.push({
        entityType: "subscription",
        entityId: String(p._id),
        userId: String(p.userId),
        expectedAmount: Math.round(Number(p.amount ?? 0)),
        transferSubmittedAt: p.providerResponse?.submittedAt ?? null,
      });
    }
  }

  return targets;
}

async function upsertSepayLog(sepayId, patch) {
  await SepayWebhookEvent.findOneAndUpdate(
    { sepayId },
    { $set: patch },
    { upsert: true, new: true },
  );
}

async function autoConfirmTarget(target, { sepayId, amount }) {
  const forceNote = `SePay webhook #${sepayId} amount=${amount}`;
  const opts = { force: true, forceNote, adminUserId: "" };

  if (target.entityType === "booking") {
    return confirmBankTransferPaymentByAdmin(target.entityId, opts);
  }
  if (target.entityType === "course") {
    return confirmEnrollmentTransferByAdmin(target.entityId, opts);
  }
  if (target.entityType === "subscription") {
    return confirmSubscriptionTransferByAdmin(target.entityId, opts);
  }
  return { ok: false, status: 400, error: "Loại đơn không hỗ trợ." };
}

/**
 * Webhook SePay — chỉ xử lý tiền vào (`transferType: in`).
 * Trả HTTP 200 + `{ success: true }` khi nhận hợp lệ (kể cả không khớp đơn).
 */
export async function handleSepayWebhook(body, authHeader) {
  if (!isMongoReady()) return { ok: false, status: 503, error: MONGO_ERR };
  if (!verifySepayAuthorization(authHeader)) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  const payload = body && typeof body === "object" ? body : {};
  const sepayId = String(payload.id ?? payload.transactionId ?? "").trim();
  if (!sepayId) {
    return { ok: false, status: 400, error: "Thiếu id giao dịch SePay." };
  }

  const existing = await SepayWebhookEvent.findOne({ sepayId }).lean();
  if (existing?.status === "processed") {
    return { ok: true, idempotent: true, sepayId };
  }

  const transferType = String(payload.transferType ?? payload.transfer_type ?? "in").toLowerCase();
  if (transferType && transferType !== "in") {
    await upsertSepayLog(sepayId, {
      status: "ignored",
      transferType,
      rawPayload: payload,
      resultMessage: "outgoing transfer ignored",
    });
    return { ok: true, ignored: true };
  }

  const amount = Math.round(Number(payload.transferAmount ?? payload.amount ?? 0));
  const orderRef = parsePiOrderFromText(
    payload.content,
    payload.code,
    payload.description,
    payload.referenceCode,
    payload.transactionContent,
  );

  await upsertSepayLog(sepayId, {
    transferType: transferType || "in",
    transferAmount: amount,
    orderRef: orderRef || "",
    rawPayload: payload,
    status: "received",
  });

  if (!orderRef) {
    await upsertSepayLog(sepayId, {
      status: "unmatched",
      resultMessage: "no PI order ref in transfer content",
    });
    return { ok: true, unmatched: true, reason: "no_order_ref" };
  }

  const targets = await findPendingTargets(orderRef);
  const matched = targets.filter((t) => amountsMatch(t.expectedAmount, amount));

  if (matched.length === 0) {
    await upsertSepayLog(sepayId, {
      status: "unmatched",
      orderRef,
      resultMessage: targets.length
        ? `amount mismatch (got ${amount}, candidates ${targets.length})`
        : "no pending order for ref",
    });
    return { ok: true, unmatched: true, reason: "no_match", orderRef };
  }

  if (matched.length > 1) {
    await upsertSepayLog(sepayId, {
      status: "unmatched",
      orderRef,
      resultMessage: `ambiguous: ${matched.length} pending orders`,
    });
    return { ok: true, unmatched: true, reason: "ambiguous", orderRef };
  }

  const target = matched[0];
  const confirm = await autoConfirmTarget(target, { sepayId, amount });
  if (!confirm.ok) {
    await upsertSepayLog(sepayId, {
      status: "failed",
      orderRef,
      entityType: target.entityType,
      entityId: target.entityId,
      resultMessage: confirm.error || "confirm failed",
    });
    return { ok: true, confirmed: false, error: confirm.error, orderRef };
  }

  await upsertSepayLog(sepayId, {
    status: "processed",
    orderRef,
    entityType: target.entityType,
    entityId: target.entityId,
    resultMessage: "auto confirmed",
  });

  return {
    ok: true,
    confirmed: true,
    orderRef,
    entityType: target.entityType,
    entityId: target.entityId,
  };
}

function mapEntityStatus(entityType, doc) {
  if (entityType === "booking") {
    if (doc.paymentStatus === "paid") return "paid";
    if (doc.transferSubmittedAt) return "submitted";
    return "pending";
  }
  if (entityType === "course") {
    if (doc.paymentStatus === "paid" || enrollmentAccessGranted(doc)) return "paid";
    if (doc.transferSubmittedAt) return "submitted";
    return "pending";
  }
  if (entityType === "subscription") {
    if (doc.status === "success") return "paid";
    if (doc.providerResponse?.submittedAt) return "submitted";
    return "pending";
  }
  return "pending";
}

function buildRedirect(entityType, doc) {
  if (entityType === "booking" && doc?._id) {
    return `/session/${encodeURIComponent(String(doc._id))}`;
  }
  if (entityType === "course" && doc?.courseId) {
    return `/courses/${encodeURIComponent(String(doc.courseId))}/learn`;
  }
  if (entityType === "subscription") return "/dashboard?planUpgraded=1";
  return "/dashboard";
}

/** Poll trạng thái CK theo mã PI — chỉ đơn thuộc user đăng nhập. */
export async function getTransferStatusForUser(userId, orderRefRaw) {
  if (!isMongoReady()) return { ok: false, status: 503, error: MONGO_ERR };
  if (!mongoose.isValidObjectId(userId)) {
    return { ok: false, status: 401, error: "Phiên không hợp lệ." };
  }
  const orderRef = normalizePiOrderRef(orderRefRaw);
  if (!orderRef) {
    return { ok: false, status: 400, error: "orderRef (mã PI) không hợp lệ." };
  }

  const uid = new mongoose.Types.ObjectId(userId);

  const bookings = await Booking.find({
    userId: uid,
    paymentMethod: "transfer",
  })
    .select("_id paymentRef paymentStatus transferSubmittedAt courseId totalAmount price")
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  for (const b of bookings) {
    if (orderRefsMatch(b.paymentRef, orderRef)) {
      const status = mapEntityStatus("booking", b);
      return {
        ok: true,
        orderRef,
        status,
        entityType: "booking",
        entityId: String(b._id),
        redirectTo: buildRedirect("booking", b),
        sepayAuto: Boolean(b.transferForceConfirm && b.paymentStatus === "paid"),
      };
    }
  }

  const enrollments = await Enrollment.find({ userId: uid, paymentMethod: "transfer" })
    .select("_id paymentRef paymentStatus transferSubmittedAt courseId transferForceConfirm")
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  for (const e of enrollments) {
    if (orderRefsMatch(e.paymentRef, orderRef)) {
      const status = mapEntityStatus("course", e);
      return {
        ok: true,
        orderRef,
        status,
        entityType: "course",
        entityId: String(e._id),
        redirectTo: buildRedirect("course", e),
        sepayAuto: Boolean(e.transferForceConfirm && status === "paid"),
      };
    }
  }

  const payments = await Payment.find({
    userId: uid,
    type: "subscription",
    provider: "transfer",
  })
    .select("_id providerRef status providerResponse")
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  for (const p of payments) {
    const ref = extractOrderPart(p.providerRef || p.providerResponse?.paymentRef || "");
    if (orderRefsMatch(ref, orderRef)) {
      const status = mapEntityStatus("subscription", p);
      return {
        ok: true,
        orderRef,
        status,
        entityType: "subscription",
        entityId: String(p._id),
        redirectTo: buildRedirect("subscription", p),
        sepayAuto: status === "paid",
      };
    }
  }

  return {
    ok: true,
    orderRef,
    status: "not_found",
    entityType: null,
    entityId: null,
    redirectTo: null,
  };
}
