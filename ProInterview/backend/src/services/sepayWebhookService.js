import mongoose from "mongoose";
import { Booking } from "../models/Booking.js";
import { Enrollment } from "../models/Enrollment.js";
import { Payment } from "../models/Payment.js";
import { User } from "../models/User.js";
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
import {
  isTransferPaymentExpired,
  transferPaymentExpiryMeta,
  TRANSFER_PAYMENT_TIMEOUT_MINUTES,
} from "../utils/transferPaymentExpiry.js";
import {
  expireBookingTransferIfNeeded,
  expireEnrollmentTransferIfNeeded,
  expireSubscriptionTransferIfNeeded,
} from "./transferPaymentExpiryService.js";

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
    .select("_id userId paymentRef totalAmount price paymentExpiresAt createdAt")
    .lean();

  // Gom các booking pending cùng (paymentRef, userId) — đơn đặt nhiều slot dùng chung 1 mã CK,
  // 1 lần chuyển khoản phải khớp TỔNG tiền cả nhóm chứ không phải từng booking riêng lẻ.
  const bookingGroupMap = new Map(); // `${norm}::${userId}` -> [booking]
  for (const b of bookings) {
    if (isTransferPaymentExpired(b)) continue;
    if (orderRefsMatch(b.paymentRef, norm)) {
      const groupKey = `${norm}::${String(b.userId)}`;
      if (!bookingGroupMap.has(groupKey)) bookingGroupMap.set(groupKey, []);
      bookingGroupMap.get(groupKey).push(b);
    }
  }
  for (const group of bookingGroupMap.values()) {
    const totalExpected = group.reduce((sum, b) => sum + expectedBookingAmount(b), 0);
    if (group.length === 1) {
      const b = group[0];
      targets.push({
        entityType: "booking",
        entityId: String(b._id),
        userId: String(b.userId),
        expectedAmount: totalExpected,
        transferSubmittedAt: b.transferSubmittedAt ?? null,
      });
    } else {
      targets.push({
        entityType: "booking_group",
        entityId: String(group[0]._id),
        entityIds: group.map((b) => String(b._id)),
        userId: String(group[0].userId),
        expectedAmount: totalExpected,
        transferSubmittedAt: group[0].transferSubmittedAt ?? null,
      });
    }
  }

  const enrollments = await Enrollment.find({
    paymentMethod: "transfer",
    paymentStatus: "pending",
  })
    .select("_id userId paymentRef pricePaid transferSubmittedAt courseId paymentExpiresAt createdAt")
    .lean();
  for (const e of enrollments) {
    if (isTransferPaymentExpired(e)) continue;
    if (orderRefsMatch(e.paymentRef, norm)) {
      // pricePaid được server tính lúc tạo ghi danh (áp dụng giảm giá theo gói) — nguồn sự thật duy nhất,
      // không dùng lại Course.price gốc (sẽ sai với user đang được giảm giá).
      const expectedAmount = Math.round(Number(e.pricePaid ?? 0));
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
    .select("_id userId amount providerRef providerResponse paymentExpiresAt createdAt")
    .lean();
  for (const p of payments) {
    if (isTransferPaymentExpired(p)) continue;
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

const LATE_TRANSFER_LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Tìm booking/enrollment/subscription-payment CK đã hết hạn (hoặc hết hạn về mặt logic nhưng DB
 * chưa kịp lazy-expire) trong 7 ngày gần nhất khớp mã PI — dùng khi webhook báo tiền vào TRỄ, sau
 * khi đơn gốc đã bị hệ thống tự hủy.
 */
async function findRecentlyExpiredTargets(orderRef) {
  const norm = normalizePiOrderRef(orderRef);
  if (!norm) return [];
  const since = new Date(Date.now() - LATE_TRANSFER_LOOKBACK_MS);
  const targets = [];

  const bookings = await Booking.find({
    paymentMethod: "transfer",
    paymentStatus: { $in: ["pending", "failed"] },
    createdAt: { $gte: since },
  })
    .select("_id userId paymentRef totalAmount price paymentStatus paymentExpiresAt createdAt")
    .lean();
  for (const b of bookings) {
    const isExpired = b.paymentStatus === "failed" || isTransferPaymentExpired(b);
    if (!isExpired) continue;
    if (orderRefsMatch(b.paymentRef, norm)) {
      targets.push({
        entityType: "booking",
        entityId: String(b._id),
        userId: String(b.userId),
        expectedAmount: expectedBookingAmount(b),
      });
    }
  }

  const enrollments = await Enrollment.find({
    paymentMethod: "transfer",
    paymentStatus: { $in: ["pending", "expired"] },
    createdAt: { $gte: since },
  })
    .select("_id userId paymentRef pricePaid paymentStatus paymentExpiresAt createdAt")
    .lean();
  for (const e of enrollments) {
    const isExpired = e.paymentStatus === "expired" || isTransferPaymentExpired(e);
    if (!isExpired) continue;
    if (orderRefsMatch(e.paymentRef, norm)) {
      targets.push({
        entityType: "course",
        entityId: String(e._id),
        userId: String(e.userId),
        expectedAmount: Math.round(Number(e.pricePaid ?? 0)),
      });
    }
  }

  const payments = await Payment.find({
    type: "subscription",
    provider: "transfer",
    status: { $in: ["pending", "cancelled"] },
    createdAt: { $gte: since },
  })
    .select("_id userId amount providerRef providerResponse status paymentExpiresAt createdAt")
    .lean();
  for (const p of payments) {
    const isExpired = p.status === "cancelled" || isTransferPaymentExpired(p);
    if (!isExpired) continue;
    const ref = p.providerRef || p.providerResponse?.paymentRef || "";
    if (orderRefsMatch(ref, norm)) {
      targets.push({
        entityType: "subscription",
        entityId: String(p._id),
        userId: String(p.userId),
        expectedAmount: Math.round(Number(p.amount ?? 0)),
      });
    }
  }

  return targets;
}

/**
 * Đánh dấu 1 giao dịch CK trễ (tiền vào sau khi hệ thống đã tự hủy đơn) là cần hoàn tiền —
 * đưa entity qua đúng state machine hết hạn trước (idempotent, no-op nếu đã hết hạn rồi), sau
 * đó chuyển sang `refund_pending` để admin xử lý qua luồng hoàn tiền đã có sẵn.
 */
async function flagLateTransferForRefund(target, { sepayId, amount }) {
  const now = new Date();
  const auditNote = {
    lateTransferSepayId: sepayId,
    lateTransferAmount: amount,
    lateTransferReceivedAt: now.toISOString(),
  };

  if (target.entityType === "booking") {
    const booking = await Booking.findById(target.entityId);
    if (!booking) return { ok: false, error: "Không tìm thấy booking." };
    await expireBookingTransferIfNeeded(booking);

    // Kiểm tra Payment TRƯỚC khi đụng Booking (giống nhánh course/subscription) — tránh trường
    // hợp Booking đã bị chuyển refund_pending nhưng Payment lại không ở trạng thái hợp lệ để
    // cập nhật theo, để lại 2 bản ghi lệch trạng thái nhau.
    const pay = await Payment.findOne({ type: "booking", referenceModel: "Booking", referenceId: target.entityId, provider: "transfer" });
    if (!pay) return { ok: false, error: "Không tìm thấy giao dịch thanh toán." };
    if (pay.status !== "cancelled") return { ok: false, error: "Giao dịch không ở trạng thái có thể đánh dấu hoàn tiền." };

    const updated = await Booking.findOneAndUpdate(
      { _id: target.entityId, paymentStatus: "failed" },
      {
        $set: {
          paymentStatus: "refund_pending",
          cancelRefundAmountVnd: amount,
          cancelRetainedAmountVnd: 0,
          cancelRefundPercent: 100,
        },
      },
      { new: true },
    );
    if (!updated) return { ok: false, error: "Booking không ở trạng thái có thể đánh dấu hoàn tiền." };

    const prev = pay.providerResponse && typeof pay.providerResponse === "object" ? pay.providerResponse : {};
    pay.status = "refund_pending";
    pay.providerResponse = { ...prev, ...auditNote };
    await pay.save();
    return { ok: true };
  }

  if (target.entityType === "subscription") {
    const pay = await Payment.findById(target.entityId);
    if (!pay) return { ok: false, error: "Không tìm thấy giao dịch." };
    await expireSubscriptionTransferIfNeeded(pay);

    const prev = pay.providerResponse && typeof pay.providerResponse === "object" ? pay.providerResponse : {};
    const updated = await Payment.findOneAndUpdate(
      { _id: target.entityId, status: "cancelled" },
      { $set: { status: "refund_pending", providerResponse: { ...prev, ...auditNote } } },
      { new: true },
    );
    if (!updated) return { ok: false, error: "Giao dịch không ở trạng thái có thể đánh dấu hoàn tiền." };
    return { ok: true };
  }

  if (target.entityType === "course") {
    const enrollment = await Enrollment.findById(target.entityId);
    if (!enrollment) return { ok: false, error: "Không tìm thấy ghi danh." };
    await expireEnrollmentTransferIfNeeded(enrollment);
    // Enrollment giữ nguyên "expired" (không có khái niệm refund_pending riêng trên Enrollment —
    // giống subscription, trạng thái hoàn tiền theo dõi hoàn toàn trên Payment ledger).
    const pay = await Payment.findOne({ type: "course", referenceModel: "Enrollment", referenceId: target.entityId, provider: "transfer" });
    if (!pay) return { ok: false, error: "Không tìm thấy giao dịch thanh toán." };
    if (pay.status !== "cancelled") return { ok: false, error: "Giao dịch không ở trạng thái có thể đánh dấu hoàn tiền." };
    const prev = pay.providerResponse && typeof pay.providerResponse === "object" ? pay.providerResponse : {};
    pay.status = "refund_pending";
    pay.providerResponse = { ...prev, ...auditNote };
    await pay.save();
    return { ok: true };
  }

  return { ok: false, error: "Loại đơn không hỗ trợ." };
}

async function upsertSepayLog(sepayId, patch) {
  await SepayWebhookEvent.findOneAndUpdate(
    { sepayId },
    { $set: patch },
    { upsert: true, new: true },
  );
}

/**
 * Nếu người thanh toán đang bị khóa (`User.isActive === false`), đánh dấu các dòng ledger
 * `Payment` liên quan sang `held_inactive_account` và trả `true` để caller dừng auto-confirm.
 *
 * Không đụng vào Booking/Enrollment — chúng vẫn ở `pending` và sẽ hết hạn bình thường; chỉ
 * ledger tiền được gắn cờ, vì đó là chỗ admin nhìn để quyết hoàn tiền.
 */
async function holdIfPayerInactive(target, { sepayId, amount }) {
  const uid = String(target.userId || "").trim();
  if (!mongoose.isValidObjectId(uid)) return false;

  const payer = await User.findById(uid).select("isActive").lean();
  if (!payer || payer.isActive !== false) return false;

  const entityIds = Array.isArray(target.entityIds) ? target.entityIds : [target.entityId];
  const objectIds = entityIds.filter((x) => mongoose.isValidObjectId(x));

  await Payment.updateMany(
    {
      $or: [{ referenceId: { $in: objectIds } }, { _id: { $in: objectIds } }],
      status: "pending",
    },
    {
      $set: {
        status: "held_inactive_account",
        heldAt: new Date(),
        heldReason: `Tài khoản bị khóa — SePay #${sepayId} amount=${amount}`,
      },
    },
  ).catch((err) => console.error("[holdIfPayerInactive]", err?.message || err));

  console.warn(`[PAYMENT_HELD_INACTIVE] user=${uid} sepayId=${sepayId} amount=${amount} entities=${objectIds.join(",")}`);
  return true;
}

async function autoConfirmTarget(target, { sepayId, amount }) {
  const forceNote = `SePay webhook #${sepayId} amount=${amount}`;
  const opts = { force: true, forceNote, adminUserId: "" };

  if (target.entityType === "booking") {
    return confirmBankTransferPaymentByAdmin(target.entityId, opts);
  }
  if (target.entityType === "booking_group") {
    // _skipSiblingConfirm: nhóm đã được liệt kê đủ entityIds ở đây — không cần từng booking
    // tự tìm anh em nữa (tránh xác nhận trùng 2 lần cho cùng 1 nhóm).
    const groupOpts = { ...opts, _skipSiblingConfirm: true };
    const errors = [];
    for (const id of target.entityIds) {
      const res = await confirmBankTransferPaymentByAdmin(id, groupOpts);
      if (!res.ok && !String(res.error || "").includes("đã thanh toán")) {
        errors.push(res.error || "lỗi không xác định");
      }
    }
    if (errors.length > 0) {
      return { ok: false, error: `Một số slot không xác nhận được: ${errors.join("; ")}` };
    }
    return { ok: true };
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
    // Không khớp đơn còn sống — thử tìm đơn vừa hết hạn (CK đến trễ) trước khi coi là rác.
    const expiredTargets = await findRecentlyExpiredTargets(orderRef);
    const expiredMatched = expiredTargets.filter((t) => amountsMatch(t.expectedAmount, amount));

    if (expiredMatched.length === 1) {
      const target = expiredMatched[0];
      const flagged = await flagLateTransferForRefund(target, { sepayId, amount });
      if (flagged.ok) {
        await upsertSepayLog(sepayId, {
          status: "refund_flagged",
          orderRef,
          entityType: target.entityType,
          entityId: target.entityId,
          resultMessage: "CK đến trễ (đơn đã hết hạn) — đã đánh dấu cần hoàn tiền",
        });
        return { ok: true, refundFlagged: true, entityType: target.entityType, entityId: target.entityId, orderRef };
      }
    }

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

  /**
   * Người trả tiền đang bị khóa → KHÔNG auto-confirm, nhưng cũng KHÔNG từ chối: tiền đã vào
   * tài khoản ngân hàng thật rồi, từ chối là mất dấu vết. Giữ lại thành hàng đợi để admin
   * quyết hoàn tiền hay mở khóa. Vẫn ack 200 cho SePay để họ không retry.
   */
  const heldForInactive = await holdIfPayerInactive(target, { sepayId, amount });
  if (heldForInactive) {
    await upsertSepayLog(sepayId, {
      status: "held_inactive_account",
      orderRef,
      entityType: target.entityType,
      entityId: target.entityId,
      resultMessage: "Tài khoản người thanh toán đang bị khóa — giữ lại chờ admin xử lý",
    });
    return { ok: true, held: true, reason: "inactive_account", orderRef };
  }

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
    resultMessage:
      target.entityType === "booking_group"
        ? `auto confirmed group (${target.entityIds.length} bookings)`
        : "auto confirmed",
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
    if (String(doc.status || "").toLowerCase() === "cancelled" && doc.paymentStatus === "failed") {
      return "expired";
    }
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
    if (doc.status === "cancelled") return "expired";
    if (doc.providerResponse?.submittedAt) return "submitted";
    return "pending";
  }
  return "pending";
}

function statusPayload(doc, entityType, entityId, orderRef, extra = {}) {
  const expiry = transferPaymentExpiryMeta(doc);
  const status = expiry.expired ? "expired" : mapEntityStatus(entityType, doc);
  return {
    ok: true,
    orderRef,
    status,
    entityType,
    entityId,
    paymentExpiresAt: expiry.paymentExpiresAt,
    expiresInMs: expiry.expiresInMs,
    timeoutMinutes: TRANSFER_PAYMENT_TIMEOUT_MINUTES,
    redirectTo: status === "paid" ? buildRedirect(entityType, doc) : null,
    ...extra,
  };
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
    .select("_id paymentRef paymentStatus transferSubmittedAt courseId totalAmount price paymentExpiresAt createdAt status")
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  for (const b of bookings) {
    if (orderRefsMatch(b.paymentRef, orderRef)) {
      const live = await Booking.findById(b._id);
      if (live) {
        const expired = await expireBookingTransferIfNeeded(live);
        if (expired.expired) {
          return statusPayload(live, "booking", String(live._id), orderRef, {
            redirectTo: null,
            sepayAuto: false,
          });
        }
        const status = mapEntityStatus("booking", live);
        return statusPayload(live, "booking", String(live._id), orderRef, {
          sepayAuto: Boolean(live.transferForceConfirm && status === "paid"),
        });
      }
    }
  }

  const enrollments = await Enrollment.find({ userId: uid, paymentMethod: "transfer" })
    .select("_id paymentRef paymentStatus transferSubmittedAt courseId transferForceConfirm paymentExpiresAt createdAt")
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  for (const e of enrollments) {
    if (orderRefsMatch(e.paymentRef, orderRef)) {
      const live = await Enrollment.findById(e._id);
      if (live) {
        const expired = await expireEnrollmentTransferIfNeeded(live);
        if (expired.expired) {
          return {
            ok: true,
            orderRef,
            status: "expired",
            entityType: "course",
            entityId: String(e._id),
            redirectTo: null,
            sepayAuto: false,
            paymentExpiresAt: transferPaymentExpiryMeta(e).paymentExpiresAt,
            expiresInMs: 0,
            timeoutMinutes: TRANSFER_PAYMENT_TIMEOUT_MINUTES,
          };
        }
        const status = mapEntityStatus("course", live);
        return statusPayload(live, "course", String(live._id), orderRef, {
          sepayAuto: Boolean(live.transferForceConfirm && status === "paid"),
        });
      }
    }
  }

  const payments = await Payment.find({
    userId: uid,
    type: "subscription",
    provider: "transfer",
  })
    .select("_id providerRef status providerResponse paymentExpiresAt createdAt")
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  for (const p of payments) {
    const ref = extractOrderPart(p.providerRef || p.providerResponse?.paymentRef || "");
    if (orderRefsMatch(ref, orderRef)) {
      const live = await Payment.findById(p._id);
      if (live) {
        const expired = await expireSubscriptionTransferIfNeeded(live);
        if (expired.expired) {
          return statusPayload(live, "subscription", String(live._id), orderRef, {
            redirectTo: null,
            sepayAuto: false,
          });
        }
        const status = mapEntityStatus("subscription", live);
        return statusPayload(live, "subscription", String(live._id), orderRef, {
          sepayAuto: status === "paid",
        });
      }
    }
  }

  return {
    ok: true,
    orderRef,
    status: "not_found",
    entityType: null,
    entityId: null,
    redirectTo: null,
    paymentExpiresAt: null,
    expiresInMs: 0,
    timeoutMinutes: TRANSFER_PAYMENT_TIMEOUT_MINUTES,
  };
}
