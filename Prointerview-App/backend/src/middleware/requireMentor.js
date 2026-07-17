import { User } from "../models/User.js";
import { Mentor } from "../models/Mentor.js";

/** Sau `authJwt` — chỉ user có `role: "mentor"` mới qua được. */
export async function requireMentor(req, res, next) {
  try {
    const u = await User.findById(req.userId).select("role").lean();
    if (!u || u.role !== "mentor") {
      return res.status(403).json({
        success: false,
        error: "Chỉ mentor mới được thực hiện thao tác này.",
      });
    }
    const mentor = await Mentor.findOne({ userId: req.userId }).select("isActive isVerified").lean();
    if (!mentor || mentor.isActive !== true || mentor.isVerified !== true) {
      return res.status(403).json({
        success: false,
        error: "Hồ sơ mentor đang chờ duyệt, chưa được kích hoạt hoặc chưa được xác minh.",
      });
    }
    next();
  } catch (e) {
    next(e);
  }
}

