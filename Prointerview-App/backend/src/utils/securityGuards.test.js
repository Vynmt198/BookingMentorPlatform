import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildSessionFingerprint, sanitizeObjectKeys, isUploadSizeAllowed } from "./securityGuards.js";
import { isAllowedUploadPayloadSize, MAX_UPLOAD_BYTES } from "../middleware/upload.js";

describe("securityGuards", () => {
  it("xóa key nghi ngờ NoSQL injection ($ và .)", () => {
    const payload = {
      email: "user@test.local",
      profile: {
        "$where": "sleep(1000)",
        "a.b": "bad",
        safe: "ok",
      },
      "$ne": "hack",
    };
    sanitizeObjectKeys(payload);
    assert.equal(payload.email, "user@test.local");
    assert.equal(payload.profile.safe, "ok");
    assert.equal(payload.profile.$where, undefined);
    assert.equal(payload.profile["a.b"], undefined);
    assert.equal(payload.$ne, undefined);
  });

  it("fingerprint ổn định với cùng UA/IP", () => {
    const a = buildSessionFingerprint({ userAgent: "Mozilla/5.0", ip: "::1" });
    const b = buildSessionFingerprint({ userAgent: "Mozilla/5.0", ip: "127.0.0.1" });
    assert.equal(a, b);
  });

  it("isUploadSizeAllowed hoạt động đúng", () => {
    assert.equal(isUploadSizeAllowed(10, 10), true);
    assert.equal(isUploadSizeAllowed(11, 10), false);
  });

  it("middleware upload giữ hard limit payload", () => {
    assert.equal(isAllowedUploadPayloadSize(MAX_UPLOAD_BYTES), true);
    assert.equal(isAllowedUploadPayloadSize(MAX_UPLOAD_BYTES + 1), false);
  });
});
