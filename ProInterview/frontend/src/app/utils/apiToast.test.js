import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  toastApiError,
  isCvQuotaError,
  toastCvQuotaExceeded,
  safeApiCall,
} from "./apiToast.js";

describe("isCvQuotaError", () => {
  it("nhận diện thông báo hết quota", () => {
    assert.equal(isCvQuotaError("Bạn đã hết lượt phân tích CV"), true);
    assert.equal(isCvQuotaError("Vui lòng nâng cấp gói"), true);
    assert.equal(isCvQuotaError("Lỗi mạng"), false);
  });
});

describe("toastApiError", () => {
  it("trả message đã trim hoặc fallback", () => {
    assert.equal(toastApiError("  lỗi API  ", "Mặc định"), "lỗi API");
    assert.equal(toastApiError("", "Mặc định"), "Mặc định");
    assert.equal(toastApiError(null, "Mặc định"), "Mặc định");
  });
});

describe("toastCvQuotaExceeded", () => {
  it("không throw khi không có goPricing", () => {
    assert.doesNotThrow(() => toastCvQuotaExceeded());
  });
});

describe("safeApiCall", () => {
  it("trả kết quả khi success", async () => {
    const out = await safeApiCall(Promise.resolve({ success: true, data: 1 }), { silent: true });
    assert.equal(out.success, true);
    assert.equal(out.data, 1);
  });

  it("trả success false khi API báo lỗi", async () => {
    const out = await safeApiCall(Promise.resolve({ success: false, error: "fail" }), { silent: true });
    assert.equal(out.success, false);
    assert.equal(out.error, "fail");
  });

  it("bắt throw và trả success false", async () => {
    const out = await safeApiCall(
      Promise.reject(new Error("network")),
      { silent: true, fallback: "Lỗi mạng" },
    );
    assert.equal(out.success, false);
    assert.equal(out.error, "network");
  });
});
