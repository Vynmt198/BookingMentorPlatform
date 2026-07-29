/**
 * Ghi vết mọi thao tác thay đổi dữ liệu của admin vào `SecurityLog` (type `admin_action`).
 *
 * Mount ở router-level ngay sau `authJwt + requireAdmin` — không đụng vào từng handler, nên
 * không xung đột với các thay đổi đang diễn ra bên trong `adminController`.
 *
 * Chỉ ghi request thay đổi dữ liệu (không phải GET/HEAD/OPTIONS). Ghi cả request thất bại —
 * chuỗi 403/400 liên tiếp chính là tín hiệu bất thường đáng quan tâm nhất.
 */
import { SecurityLog } from "../models/SecurityLog.js";

const READ_ONLY_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/** Key có thể chứa bí mật — không bao giờ ghi giá trị thật xuống log. */
const REDACTED_KEYS = new Set([
  "password",
  "newpassword",
  "currentpassword",
  "passwordhash",
  "token",
  "accesstoken",
  "refreshtoken",
  "admininvitecode",
  "secret",
  "authorization",
]);

const MAX_BODY_CHARS = 2000;

/** Bản sao của body đã che các field nhạy cảm, giới hạn độ sâu để không đệ quy vô hạn. */
function redactBody(value, depth = 0) {
  if (value == null) return value;
  if (depth > 4) return "[deep]";
  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => redactBody(item, depth + 1));
  }
  if (typeof value !== "object") return value;

  const out = {};
  for (const [key, val] of Object.entries(value)) {
    out[key] = REDACTED_KEYS.has(key.toLowerCase()) ? "[redacted]" : redactBody(val, depth + 1);
  }
  return out;
}

/** Cắt bớt body quá lớn để 1 request bất thường không thổi phồng collection log. */
function boundedBody(body) {
  if (!body || typeof body !== "object" || Object.keys(body).length === 0) return undefined;
  const redacted = redactBody(body);
  try {
    const serialized = JSON.stringify(redacted);
    if (serialized.length <= MAX_BODY_CHARS) return redacted;
    return { _truncated: true, _preview: serialized.slice(0, MAX_BODY_CHARS) };
  } catch {
    return { _unserializable: true };
  }
}

export function adminAuditLog(req, res, next) {
  if (READ_ONLY_METHODS.has(req.method)) return next();

  // Snapshot trước khi handler chạy — handler có thể mutate req.body.
  const snapshot = {
    method: req.method,
    path: req.originalUrl || req.url,
    body: boundedBody(req.body),
  };
  const adminUserId = req.userId;
  const ipAddress = req.ip;
  const userAgent = String(req.headers["user-agent"] || "").slice(0, 500);

  res.on("finish", () => {
    // Fire-and-forget: audit log hỏng không bao giờ được làm hỏng response đã trả về.
    SecurityLog.create({
      userId: adminUserId,
      type: "admin_action",
      details: {
        ...snapshot,
        statusCode: res.statusCode,
        success: res.statusCode >= 200 && res.statusCode < 400,
      },
      ipAddress,
      userAgent,
    }).catch((err) => {
      console.error("[adminAuditLog] không ghi được log:", err.message);
    });
  });

  next();
}
