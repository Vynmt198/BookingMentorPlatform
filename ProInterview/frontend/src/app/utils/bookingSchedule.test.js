import test from "node:test";
import assert from "node:assert/strict";
import { isBookingSlotInFuture, parseBookingSlotMs } from "./bookingSchedule.js";

test("parseBookingSlotMs parses DD/MM/YYYY", () => {
  const ms = parseBookingSlotMs("06/06/2026", "21:00");
  const d = new Date(ms);
  assert.equal(d.getFullYear(), 2026);
  assert.equal(d.getMonth(), 5);
  assert.equal(d.getDate(), 6);
  assert.equal(d.getHours(), 21);
});

test("isBookingSlotInFuture rejects past slot", () => {
  const past = new Date(2020, 0, 1, 10, 0, 0, 0).getTime();
  assert.equal(isBookingSlotInFuture("01/01/2020", "10:00", past + 60_000), false);
});

test("isBookingSlotInFuture accepts future slot", () => {
  const now = Date.now();
  const futureMs = now + 7 * 24 * 60 * 60 * 1000;
  const d = new Date(futureMs);
  const dateStr = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  const timeStr = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  assert.equal(isBookingSlotInFuture(dateStr, timeStr, now), true);
});
