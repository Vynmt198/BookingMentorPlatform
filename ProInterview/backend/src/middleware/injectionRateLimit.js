/**
 * injectionRateLimit — DB-backed semantic rate limiter.
 *
 * Counts SecurityLog entries of type "prompt_injection_attempt" for a given
 * userId within a rolling window. Blocks if they exceed the threshold.
 *
 * Unlike express-rate-limit (IP/header-based, in-memory), this middleware:
 *  - Survives server restarts (persisted in MongoDB)
 *  - Tracks intent (injection attempts), not just request volume
 *  - Is scoped to authenticated userId, not IP (avoids shared-IP false positives)
 *
 * Mount AFTER authJwt (needs req.userId to be set).
 */

import { SecurityLog } from "../models/SecurityLog.js";
import { logger } from "../config/logger.js";

const WINDOW_MS  = 60 * 60 * 1000; // 1-hour rolling window
const THRESHOLD  = 3;               // block after 3 injection attempts within window

export async function injectionRateLimit(req, res, next) {
  const userId = req.userId;

  // Unauthenticated requests don't have a userId to track — let authJwt handle them
  if (!userId) return next();

  try {
    const since = new Date(Date.now() - WINDOW_MS);
    const count = await SecurityLog.countDocuments({
      userId,
      type: "prompt_injection_attempt",
      createdAt: { $gte: since },
    });

    if (count >= THRESHOLD) {
      logger.warn("injection_rate_limit_hit", { userId, count, threshold: THRESHOLD });

      // Persist to SecurityLog so admins can audit blocked users
      SecurityLog.create({
        userId,
        type: "rate_limit_hit",
        details: { count, threshold: THRESHOLD, windowMs: WINDOW_MS },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      }).catch(() => {});

      res.setHeader("Retry-After", Math.ceil(WINDOW_MS / 1000));
      return res.status(429).json({
        success: false,
        error: "too_many_suspicious_requests",
        message: "Tài khoản của bạn đã gửi nhiều request đáng ngờ. Vui lòng liên hệ support.",
        retryAfter: Math.ceil(WINDOW_MS / 1000),
      });
    }
  } catch (err) {
    // DB failure must never block legitimate users — log and continue
    logger.error("injection_rate_limit_db_error", { error: err.message, userId });
  }

  next();
}
