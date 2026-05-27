/**
 * Toast thống nhất cho lỗi API (Sonner — Toaster trong App.jsx).
 */
import { toast } from "sonner";

export function toastApiError(error, fallback = "Đã xảy ra lỗi. Vui lòng thử lại.") {
  const msg = String(error || "").trim() || fallback;
  toast.error(msg);
  return msg;
}

export function toastApiSuccess(message) {
  toast.success(message);
}

export function isCvQuotaError(message) {
  return /hết lượt|nâng cấp gói/i.test(String(message || ""));
}

/** @param {() => void} [goPricing] */
export function toastCvQuotaExceeded(goPricing) {
  toast.error("Bạn đã hết lượt phân tích CV. Nâng cấp gói Pro để tiếp tục.", {
    duration: 6000,
    action: goPricing
      ? { label: "Xem gói", onClick: goPricing }
      : undefined,
  });
}

/**
 * Gọi API (Promise hoặc hàm async). Toast khi `success === false` hoặc throw.
 * @returns Kết quả API hoặc `{ success: false, error }` khi lỗi.
 */
export async function safeApiCall(promiseOrFn, { fallback = "Đã xảy ra lỗi.", successMessage, silent = false } = {}) {
  try {
    const result =
      typeof promiseOrFn === "function" ? await promiseOrFn() : await promiseOrFn;
    if (result && result.success === false) {
      if (!silent) toastApiError(result.error, fallback);
      return result;
    }
    if (successMessage && !silent) toastApiSuccess(successMessage);
    return result;
  } catch (err) {
    const out = { success: false, error: err?.message || fallback };
    if (!silent) toastApiError(out.error, fallback);
    return out;
  }
}

/** Alias — dùng trong handler: `await tryApi(() => apiFn(), { fallback: "..." })` */
export const tryApi = safeApiCall;
