import mongoose from "mongoose";
import { releaseEligibleEarnings } from "../services/mentorEarningsService.js";

let intervalHandle = null;

async function runEarningsClearance() {
  if (mongoose.connection.readyState !== 1) return;
  const result = await releaseEligibleEarnings();
  if (result.releasedCount > 0 || result.heldCount > 0) {
    console.log(
      `[earningsClearanceJob] released=${result.releasedCount} held(report mở)=${result.heldCount}`,
    );
  }
}

/** Chạy mỗi giờ khi server đã kết nối MongoDB — release tiền đã đủ EARNINGS_HOLD_DAYS. */
export function startEarningsClearanceJob() {
  if (intervalHandle) return;
  const tick = () => {
    runEarningsClearance().catch((e) =>
      console.error("[earningsClearanceJob]", e?.message || e),
    );
  };
  tick();
  intervalHandle = setInterval(tick, 60 * 60 * 1000);
}
