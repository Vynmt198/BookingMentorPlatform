import { Router } from "express";
import multer from "multer";
import { authJwt } from "../middleware/authJwt.js";
import { injectionRateLimit } from "../middleware/injectionRateLimit.js";
import { analyzeFaceLimiter } from "../middleware/rateLimiters.js";
import { InterviewsController } from "../controllers/interviewsController.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

export const interviewsRouter = Router();

// Session lifecycle
interviewsRouter.post("/sessions", authJwt, asyncHandler(InterviewsController.createSession));
interviewsRouter.patch("/sessions/:id", authJwt, asyncHandler(InterviewsController.updateAnswer));
interviewsRouter.post("/sessions/:id/complete", authJwt, asyncHandler(InterviewsController.completeSession));
interviewsRouter.post("/sessions/:id/evaluate", authJwt, asyncHandler(InterviewsController.evaluateSession));
interviewsRouter.get("/sessions", authJwt, asyncHandler(InterviewsController.list));
interviewsRouter.get("/sessions/:id", authJwt, asyncHandler(InterviewsController.getById));
// Middleware: validate image size trước khi gọi Vision API (tránh lạm dụng credits)
const validateFaceImage = (req, res, next) => {
  const b64 = req.body?.imageBase64;
  if (b64 && b64.length > 1_400_000) {
    // base64 > 1.4 M chars ≈ image > ~1 MB — từ chối
    return res.status(413).json({ success: true, emotion: null, reason: "image_too_large" });
  }
  next();
};

interviewsRouter.post(
  "/sessions/:id/analyze-face",
  authJwt,
  analyzeFaceLimiter,
  validateFaceImage,
  asyncHandler(InterviewsController.analyzeFace),
);

// AI question generation — injectionRateLimit blocks users with ≥3 injection attempts/hour
interviewsRouter.post(
  "/generate-questions",
  authJwt,
  injectionRateLimit,
  asyncHandler(InterviewsController.generateQuestions),
);
interviewsRouter.post(
  "/extract-cv-text",
  authJwt,
  upload.single("file"),
  asyncHandler(InterviewsController.extractCvText),
);
