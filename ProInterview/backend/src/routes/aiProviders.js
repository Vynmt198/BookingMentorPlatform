import { Router } from "express";
import multer from "multer";
import { authJwt } from "../middleware/authJwt.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { AIProvidersController } from "../controllers/aiProvidersController.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 25 * 1024 * 1024 }, // 25MB cho audio files
});

export const aiProvidersRouter = Router();

// ── Public config ─────────────────────────────────────────────────────────────
aiProvidersRouter.get("/config", AIProvidersController.getConfig);

// ── STT ───────────────────────────────────────────────────────────────────────
aiProvidersRouter.post(
  "/transcribe",
  authJwt,
  upload.single("audio"),
  asyncHandler(AIProvidersController.transcribe),
);

// ── TTS ───────────────────────────────────────────────────────────────────────
aiProvidersRouter.post("/tts",       authJwt, asyncHandler(AIProvidersController.tts));
aiProvidersRouter.get("/tts/voices", authJwt, asyncHandler(AIProvidersController.listVoices));

// ── Emotion ───────────────────────────────────────────────────────────────────
aiProvidersRouter.post(
  "/emotion",
  authJwt,
  upload.single("audio"),
  asyncHandler(AIProvidersController.analyzeEmotion),
);

// ── D-ID Avatar ───────────────────────────────────────────────────────────────
aiProvidersRouter.get("/avatar/presenters", authJwt, asyncHandler(AIProvidersController.listPresenters));
aiProvidersRouter.get("/avatar/usage",      authJwt, asyncHandler(AIProvidersController.getAvatarUsage));

// ── Interview Pre-generation ──────────────────────────────────────────────────
// Sync (đợi tất cả xong — timeout ~120s): dùng cho interview flow chính
aiProvidersRouter.post(
  "/interview/pregenerate",
  authJwt,
  asyncHandler(AIProvidersController.pregenerateSync),
);

// Async (trả jobId ngay, poll để theo dõi): dùng khi cần progress updates chi tiết
aiProvidersRouter.post(
  "/interview/pregen/start",
  authJwt,
  asyncHandler(AIProvidersController.startPregenJob),
);
aiProvidersRouter.get(
  "/interview/pregen/:jobId",
  authJwt,
  asyncHandler(AIProvidersController.getPregenStatus),
);
