import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  TRANSFER_PAYMENT_TIMEOUT_MINUTES,
  isTransferPaymentExpired,
  newPaymentExpiresAt,
  remainingTransferPaymentMs,
  resolvePaymentExpiresAt,
  transferPaymentExpiryMeta,
} from "./transferPaymentExpiry.js";

describe("transferPaymentExpiry", () => {
  it("newPaymentExpiresAt defaults to 15 minutes ahead", () => {
    const base = new Date("2026-05-31T10:00:00.000Z");
    const exp = newPaymentExpiresAt(base);
    assert.equal(exp.getTime() - base.getTime(), TRANSFER_PAYMENT_TIMEOUT_MINUTES * 60 * 1000);
  });

  it("resolvePaymentExpiresAt falls back to createdAt + timeout", () => {
    const createdAt = new Date("2026-05-31T10:00:00.000Z");
    const exp = resolvePaymentExpiresAt({ createdAt });
    assert.equal(exp.getTime(), createdAt.getTime() + 15 * 60 * 1000);
  });

  it("isTransferPaymentExpired before and after deadline", () => {
    const createdAt = new Date("2026-05-31T10:00:00.000Z");
    const doc = { paymentExpiresAt: newPaymentExpiresAt(createdAt) };
    assert.equal(isTransferPaymentExpired(doc, new Date("2026-05-31T10:14:59.000Z")), false);
    assert.equal(isTransferPaymentExpired(doc, new Date("2026-05-31T10:15:01.000Z")), true);
  });

  it("transferPaymentExpiryMeta exposes expiresInMs", () => {
    const createdAt = new Date("2026-05-31T10:00:00.000Z");
    const now = new Date("2026-05-31T10:05:00.000Z");
    const meta = transferPaymentExpiryMeta({ paymentExpiresAt: newPaymentExpiresAt(createdAt) }, now);
    assert.equal(meta.timeoutMinutes, 15);
    assert.equal(meta.expiresInMs, 10 * 60 * 1000);
    assert.equal(meta.expired, false);
  });
});
