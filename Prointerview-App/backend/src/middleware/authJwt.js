import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { isAccessTokenJtiRevoked } from "../services/accessTokenBlacklist.js";

export async function authJwt(req, res, next) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return res.status(500).json({ success: false, error: "Server thiếu cấu hình JWT_SECRET" });
  }

  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, error: "Chưa đăng nhập" });
  }

  const token = header.slice(7).trim();
  if (!token) {
    return res.status(401).json({ success: false, error: "Chưa đăng nhập" });
  }

  try {
    const payload = jwt.verify(token, secret);
    if (!payload.sub) {
      console.warn("[Auth] Token missing sub payload");
      return res.status(401).json({ success: false, error: "Token không hợp lệ" });
    }
    const u = await User.findById(payload.sub).select("isActive tokenVersion").lean();
    if (!u) {
      console.warn(`[Auth] User not found in DB: ${payload.sub}. Có thể DB local và server khác nhau.`);
      return res.status(401).json({ success: false, error: "Tài khoản không tồn tại." });
    }
    if (u.isActive === false) {
      console.warn(`[Auth] User is inactive: ${payload.sub}`);
      return res.status(403).json({ success: false, error: "Tài khoản đã bị khóa." });
    }
    const expectedTv = u.tokenVersion ?? 0;
    const tokenTv = typeof payload.tv === "number" ? payload.tv : 0;
    if (tokenTv !== expectedTv) {
      console.warn(`[Auth] Token version mismatch. User: ${payload.sub}, Expected: ${expectedTv}, Token: ${tokenTv}`);
      return res.status(401).json({
        success: false,
        error: "Phiên đăng nhập đã kết thúc. Vui lòng đăng nhập lại.",
      });
    }
    if (payload.jti) {
      const revoked = await isAccessTokenJtiRevoked(payload.sub, payload.jti);
      if (revoked) {
        return res.status(401).json({
          success: false,
          error: "Phiên đăng nhập đã kết thúc. Vui lòng đăng nhập lại.",
        });
      }
    }
    req.userId = payload.sub;
    req.tokenJti = typeof payload.jti === "string" ? payload.jti : "";
    req.tokenExp = typeof payload.exp === "number" ? payload.exp : undefined;
    next();
  } catch (err) {
    console.error(`[Auth] JWT Verify Error: ${err.message}`);
    return res.status(401).json({ success: false, error: "Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại." });
  }
}
