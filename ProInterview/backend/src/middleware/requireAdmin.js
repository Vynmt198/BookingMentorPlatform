import { User } from "../models/User.js";

const DENIED = {
  success: false,
  error: "Chỉ quản trị viên mới được thực hiện thao tác này.",
};

/**
 * Sau `authJwt` — chỉ user có `role: "admin"` mới qua được.
 *
 * `authJwt` đã đọc `role` từ DB trên chính request này và gán vào `req.userRole`, nên dùng lại
 * giá trị đó thay vì query lần hai: vẫn tươi như cũ (không phải claim trong token), bớt một
 * round-trip DB cho mỗi request admin.
 *
 * Vẫn giữ đường query dự phòng để middleware không âm thầm cho qua nếu có nơi nào gắn nó mà
 * quên `authJwt` phía trước.
 */
export async function requireAdmin(req, res, next) {
  try {
    if (typeof req.userRole === "string") {
      if (req.userRole !== "admin") return res.status(403).json(DENIED);
      return next();
    }

    if (!req.userId) return res.status(403).json(DENIED);
    const u = await User.findById(req.userId).select("role").lean();
    if (!u || u.role !== "admin") return res.status(403).json(DENIED);
    next();
  } catch (e) {
    next(e);
  }
}
