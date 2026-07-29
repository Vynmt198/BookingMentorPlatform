import rateLimit from "express-rate-limit";

const isProd = process.env.NODE_ENV === "production";

/** Đăng ký / đăng nhập / Google — chống brute-force theo IP. */
export const authWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 40 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Quá nhiều yêu cầu. Thử lại sau ít phút." },
});

/** Làm mới access token — giới hạn nhẹ theo IP. */
export const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Quá nhiều yêu cầu làm mới phiên. Thử lại sau." },
});

/**
 * Google Vision face snapshot — tối đa 10 lần/phút/user.
 * 5 câu × 1 snapshot = 5 calls/session; dư cho retry không gây block.
 */
export const analyzeFaceLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.userId ?? req.ip,
  standardHeaders: false,
  legacyHeaders: false,
  handler: (_req, res) =>
    res.status(429).json({ success: true, emotion: null, reason: "rate_limited" }),
});

/** CV Analysis — giới hạn nhẹ theo user để tránh spam service Python/LLM. */
export const cvAnalyzeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isProd ? 5 : 30,
  keyGenerator: (req) => req.userId ?? req.ip,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Quá nhiều yêu cầu phân tích. Vui lòng thử lại sau 1 phút." },
});

/** Analytics events — tối đa 60 request/phút/user. Chống flood collection tracking. */
export const analyticsEventsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isProd ? 60 : 600,
  keyGenerator: (req) => req.userId ?? req.ip,
  standardHeaders: false,
  legacyHeaders: false,
  message: { success: false, error: "Quá nhiều sự kiện analytics. Thử lại sau." },
});

/**
 * Thao tác GHI của admin — tối đa 30 request/phút/admin (prod).
 *
 * Đếm theo `req.userId` chứ không theo IP: nhiều admin sau cùng một NAT văn phòng không được
 * ăn chung hạn mức của nhau. Chỉ tính request thay đổi dữ liệu — duyệt danh sách, mở nhiều tab
 * dashboard là hành vi bình thường, không nên bị chặn.
 *
 * Mục tiêu là chặn kịch bản double-click / script lặp / tài khoản admin bị chiếm rồi thao tác
 * hàng loạt — 30 thao tác ghi mỗi phút đã cao hơn nhiều so với tốc độ bấm tay thực tế.
 */
export const adminMutationLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isProd ? 30 : 300,
  keyGenerator: (req) => req.userId ?? req.ip,
  skip: (req) => req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS",
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Quá nhiều thao tác quản trị trong thời gian ngắn. Vui lòng chờ một phút.",
  },
});
