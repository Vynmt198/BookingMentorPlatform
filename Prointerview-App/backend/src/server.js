import "./config/loadEnv.js";
import mongoose from "mongoose";
import { connectDatabase } from "./db/connect.js";
import "./models/index.js";
import { createApp } from "./app.js";

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;
const isProd = process.env.NODE_ENV === "production";

// ── Env validation ────────────────────────────────────────────────────────────
const REQUIRED_ENV = {
  MONGO_URI:       { critical: true,  feature: "Database" },
  LLM_API_KEY:     { critical: true,  feature: "AI question generation + evaluation" },
  LLM_BASE_URL:    { critical: true,  feature: "LLM API endpoint" },
  CV_ANALYZER_URL: { critical: false, feature: "CV text extraction (Python service)" },
  DID_API_KEY:     { critical: false, feature: "D-ID avatar (fallback Cloudinary)" },
};

function validateEnv() {
  const critical = [];
  const warnings = [];

  for (const [key, config] of Object.entries(REQUIRED_ENV)) {
    if (!process.env[key]) {
      (config.critical ? critical : warnings).push({ key, feature: config.feature });
    }
  }

  if (critical.length > 0) {
    console.error("❌ CRITICAL: Missing required env vars — server cannot start:");
    critical.forEach((i) => console.error(`  - ${i.key}: required for ${i.feature}`));
    process.exit(1);
  }

  if (warnings.length > 0) {
    console.warn("⚠️  Optional env vars missing (features will degrade gracefully):");
    warnings.forEach((i) => console.warn(`  - ${i.key}: ${i.feature}`));
  }

  console.log("✅ Environment validated");
}

validateEnv();

const app = createApp();

export async function startServer() {
  try {
    if (MONGO_URI) {
      await connectDatabase(MONGO_URI);
      const dbName = mongoose.connection.db?.databaseName ?? "?";
      console.log(`MongoDB connected (database: ${dbName})`);
      if (mongoose.connection.readyState === 1) {
        const { ensureMentorProfilesForAllMentorUsers } = await import("./services/mentorProfileService.js");
        const sync = await ensureMentorProfilesForAllMentorUsers().catch((e) => ({
          ok: false,
          error: e?.message || e,
        }));
        if (sync?.ok && (sync.created > 0 || sync.errors > 0)) {
          console.log(
            `[startup] Đồng bộ hồ sơ mentor: tạo mới ${sync.created}, lỗi ${sync.errors ?? 0}, user role mentor: ${sync.totalMentorUsers ?? "?"}`,
          );
        }
        const { startBookingReminderJob } = await import("./jobs/bookingReminderJob.js");
        startBookingReminderJob();
      }
    } else {
      console.warn("MONGO_URI is missing. Một số route sẽ trả 503 cho đến khi MongoDB được cấu hình.");
    }

    if (!process.env.JWT_SECRET) {
      console.warn("JWT_SECRET is missing. Đăng nhập /api/auth sẽ lỗi cho đến khi bạn set trong .env");
    }

    if (isProd && !process.env.CORS_ORIGIN) {
      console.warn(
        "[deploy] CORS_ORIGIN chưa set — mọi origin được phép. Nên gắn URL frontend (cách nhau bởi dấu phẩy) để chặt chẽ hơn.",
      );
    }

    if (!isProd) {
      console.log(
        "API: /api/health, /api/auth, /api/mentors, /api/bookings, /api/plans, /api/payments, /api/users, /api/courses, /api/reviews, /api/reports, /api/notifications, /api/admin, /api/enrollments",
      );
    }

    const server = app.listen(PORT);
    server.once("listening", () => {
      const addr = server.address();
      const bound = typeof addr === "object" && addr ? addr.port : PORT;
      console.log(`ProInterview backend listening on port ${bound}`);
      if (!isProd) {
        console.log("Dev: GET /api/health — nếu frontend trỏ nhầm host/port, kiểm tra proxy VITE hoặc VITE_API_URL.");
      }
    });
    server.on("error", (err) => {
      if (err.code === "EADDRINUSE" && server.listening) return;
      if (err.code === "EADDRINUSE") {
        console.error(
          `\nCổng ${PORT} đang bị chiếm (thường do backend cũ còn chạy).\n` +
            `macOS/Linux: lsof -ti :${PORT} | xargs kill -9\n` +
            `Windows: netstat -ano | findstr :${PORT}  →  taskkill /PID <PID> /F\n` +
            `Hoặc tắt terminal đang chạy npm run dev / dev:full, rồi chạy lại.\n`,
        );
        process.exit(1);
        return;
      }
      console.error(err);
      process.exit(1);
    });
  } catch (error) {
    console.error("Failed to start backend:", error?.message || error);
    process.exit(1);
  }
}

startServer();
