import test from "node:test";
import assert from "node:assert/strict";
import { parsePiOrderFromText, orderRefsMatch, normalizePiOrderRef } from "./orderRef.js";

test("parsePiOrderFromText extracts PI code from transfer content", () => {
  assert.equal(
    parsePiOrderFromText("Chuyen tien PI441870 ProInterview", "ignored"),
    "PI441870",
  );
});

test("orderRefsMatch compares normalized PI refs", () => {
  assert.equal(orderRefsMatch("pi441870", "PI441870"), true);
  assert.equal(orderRefsMatch("PI441870|extra", "PI441870"), true);
  assert.equal(orderRefsMatch("PI111111", "PI222222"), false);
});

test("normalizePiOrderRef uppercases", () => {
  assert.equal(normalizePiOrderRef("pi123456"), "PI123456");
});
