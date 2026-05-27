/**
 * Chuẩn hóa lỗi API — tránh lộ stack/chi tiết DB trên production.
 */

const DEFAULT_500 = "Đã xảy ra lỗi. Vui lòng thử lại sau.";

function isProd() {
  return process.env.NODE_ENV === "production";
}

/**
 * @param {unknown} err
 * @returns {{ status: number, error: string }}
 */
export function formatApiError(err) {
  if (!err || typeof err !== "object") {
    return { status: 500, error: DEFAULT_500 };
  }

  const e = /** @type {Record<string, unknown>} */ (err);

  if (typeof e.status === "number" && typeof e.error === "string") {
    return { status: e.status, error: e.error };
  }

  if (e.name === "ValidationError") {
    const errors = /** @type {Record<string, { message?: string }>} */ (e.errors || {});
    const first = Object.values(errors)[0];
    return { status: 400, error: first?.message || "Dữ liệu không hợp lệ." };
  }

  if (e.name === "CastError") {
    return { status: 400, error: "Id hoặc định dạng dữ liệu không hợp lệ." };
  }

  if (e.code === 11000) {
    return { status: 409, error: "Bản ghi đã tồn tại (trùng dữ liệu)." };
  }

  if (e.name === "JsonWebTokenError" || e.name === "TokenExpiredError") {
    return { status: 401, error: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn." };
  }

  const status = Number(e.statusCode || e.status);
  const message = String(e.message || "").trim();

  if (Number.isFinite(status) && status >= 400 && status < 600) {
    if (status >= 500 && isProd()) {
      if (status === 502) {
        return { status: 502, error: "Dịch vụ phân tích tạm thời không khả dụng. Thử lại sau." };
      }
      return { status, error: DEFAULT_500 };
    }
    return { status, error: message || DEFAULT_500 };
  }

  if (!isProd() && message) {
    return { status: 500, error: message };
  }

  return { status: 500, error: DEFAULT_500 };
}

/** Lỗi nghiệp vụ có status — `throw httpError(403, '...')` */
export function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}
