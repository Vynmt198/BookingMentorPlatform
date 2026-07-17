/** Thời hạn chờ CK SePay (booking / khóa học / gói Pro). */
export const TRANSFER_PAYMENT_TIMEOUT_MINUTES = Math.max(
  1,
  Number(process.env.TRANSFER_PAYMENT_TIMEOUT_MINUTES) || 15,
);

export const TRANSFER_PAYMENT_TIMEOUT_MS = TRANSFER_PAYMENT_TIMEOUT_MINUTES * 60 * 1000;

export const TRANSFER_PAYMENT_EXPIRED_REASON = `Hết hạn thanh toán (${TRANSFER_PAYMENT_TIMEOUT_MINUTES} phút).`;

export function newPaymentExpiresAt(from = new Date()) {
  return new Date(from.getTime() + TRANSFER_PAYMENT_TIMEOUT_MS);
}

/** Ưu tiên paymentExpiresAt; fallback createdAt + timeout (đơn cũ). */
export function resolvePaymentExpiresAt(doc) {
  if (!doc || typeof doc !== "object") return null;
  if (doc.paymentExpiresAt) {
    const d = new Date(doc.paymentExpiresAt);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (doc.createdAt) {
    const base = new Date(doc.createdAt);
    if (Number.isNaN(base.getTime())) return null;
    return new Date(base.getTime() + TRANSFER_PAYMENT_TIMEOUT_MS);
  }
  return null;
}

export function isTransferPaymentExpired(doc, now = new Date()) {
  const exp = resolvePaymentExpiresAt(doc);
  if (!exp) return false;
  return now.getTime() > exp.getTime();
}

export function remainingTransferPaymentMs(doc, now = new Date()) {
  const exp = resolvePaymentExpiresAt(doc);
  if (!exp) return 0;
  return Math.max(0, exp.getTime() - now.getTime());
}

export function transferPaymentExpiryMeta(doc, now = new Date()) {
  const paymentExpiresAt = resolvePaymentExpiresAt(doc);
  const expiresInMs = remainingTransferPaymentMs(doc, now);
  return {
    paymentExpiresAt: paymentExpiresAt ? paymentExpiresAt.toISOString() : null,
    expiresInMs,
    timeoutMinutes: TRANSFER_PAYMENT_TIMEOUT_MINUTES,
    expired: isTransferPaymentExpired(doc, now),
  };
}
