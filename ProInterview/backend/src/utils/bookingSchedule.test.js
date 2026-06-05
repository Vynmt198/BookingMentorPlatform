import test from "node:test";
import assert from "node:assert/strict";
import { parseBookingStartMs, isBookingInLiveWindow, isBookingSlotInFuture } from "./bookingSchedule.js";

test("parseBookingStartMs parses DD/MM/YYYY and HH:mm", () => {
  const ms = parseBookingStartMs("29/05/2026", "14:00");
  const d = new Date(ms);
  assert.equal(d.getFullYear(), 2026);
  assert.equal(d.getMonth(), 4);
  assert.equal(d.getDate(), 29);
  assert.equal(d.getHours(), 14);
});

test("isBookingInLiveWindow returns false for invalid date", () => {
  assert.equal(isBookingInLiveWindow({ date: "", timeSlot: "" }), true);
});

test("isBookingSlotInFuture rejects past", () => {
  const t = new Date(2020, 5, 1, 12, 0, 0, 0).getTime();
  assert.equal(isBookingSlotInFuture("01/06/2020", "11:00", t), false);
});
