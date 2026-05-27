import test from "node:test";
import assert from "node:assert/strict";
import { assertBookingPaidBeforeActiveStatus } from "./bookingsService.js";

test("allows cancel without payment", () => {
  const r = assertBookingPaidBeforeActiveStatus(
    { paymentStatus: "pending", totalAmount: 320000 },
    "cancelled",
  );
  assert.equal(r.ok, true);
});

test("blocks confirmed when transfer pending", () => {
  const r = assertBookingPaidBeforeActiveStatus(
    { paymentStatus: "pending", totalAmount: 320000 },
    "confirmed",
  );
  assert.equal(r.ok, false);
  assert.match(r.error, /thanh toán thành công/i);
});

test("allows confirmed when paid", () => {
  const r = assertBookingPaidBeforeActiveStatus(
    { paymentStatus: "paid", totalAmount: 320000 },
    "confirmed",
  );
  assert.equal(r.ok, true);
});

test("allows confirmed when free", () => {
  const r = assertBookingPaidBeforeActiveStatus({ paymentStatus: "pending", totalAmount: 0 }, "confirmed");
  assert.equal(r.ok, true);
});
