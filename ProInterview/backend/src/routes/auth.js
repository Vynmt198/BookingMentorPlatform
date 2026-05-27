import express from "express";
import mongoose from "mongoose";
import { AuthController } from "../controllers/authController.js";
import { authJwt } from "../middleware/authJwt.js";
import { authWriteLimiter, refreshLimiter } from "../middleware/rateLimiters.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = express.Router();

router.use((req, res, next) => {
  if (mongoose.connection.readyState === 1) return next();
  return res.status(503).json({
    success: false,
    error:
      "Cơ sở dữ liệu chưa kết nối. Kiểm tra MONGO_URI trong backend .env và đảm bảo MongoDB đang chạy.",
  });
});

router.post("/register", authWriteLimiter, asyncHandler(AuthController.register));
router.get("/verify-email", asyncHandler(AuthController.verifyEmail));
router.post("/resend-verification", authWriteLimiter, asyncHandler(AuthController.resendVerification));
router.post("/login", authWriteLimiter, asyncHandler(AuthController.login));
router.post("/google", authWriteLimiter, asyncHandler(AuthController.google));
router.post("/forgot-password", authWriteLimiter, asyncHandler(AuthController.forgotPassword));
router.post("/reset-password", authWriteLimiter, asyncHandler(AuthController.resetPassword));
router.post("/refresh", refreshLimiter, asyncHandler(AuthController.refresh));
router.get("/me", authJwt, asyncHandler(AuthController.me));
router.patch("/me", authJwt, asyncHandler(AuthController.patchMe));
router.delete("/me", authJwt, asyncHandler(AuthController.deleteMe));
router.post("/logout", authJwt, asyncHandler(AuthController.logout));
router.get("/sessions", authJwt, asyncHandler(AuthController.sessions));
router.delete("/sessions/:sessionId", authJwt, asyncHandler(AuthController.revokeSession));

export const authRouter = router;
