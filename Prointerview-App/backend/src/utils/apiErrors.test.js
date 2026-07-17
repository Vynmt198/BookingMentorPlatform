import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatApiError } from "./apiErrors.js";

describe("formatApiError", () => {
  it("maps Mongoose ValidationError → 400", () => {
    const err = { name: "ValidationError", errors: { cvText: { message: "cvText bắt buộc" } } };
    const r = formatApiError(err);
    assert.equal(r.status, 400);
    assert.match(r.error, /cvText/i);
  });

  it("maps CastError → 400", () => {
    const r = formatApiError({ name: "CastError", message: "Cast to ObjectId failed" });
    assert.equal(r.status, 400);
  });

  it("maps duplicate key → 409", () => {
    const r = formatApiError({ code: 11000 });
    assert.equal(r.status, 409);
  });

  it("hides generic 500 message in production", () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    const r = formatApiError(new Error("secret db connection string"));
    process.env.NODE_ENV = prev;
    assert.equal(r.status, 500);
    assert.equal(r.error, "Đã xảy ra lỗi. Vui lòng thử lại sau.");
  });
});
