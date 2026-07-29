import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import {
  releaseEligibleEarnings,
  reconcileMentorClearingBalances,
} from "../services/mentorEarningsService.js";
import { cacheAcquireLock, cacheReleaseLock } from "../services/cacheService.js";

const INTERVAL_MS = 60 * 60 * 1000;
const RECONCILE_INTERVAL_MS = 24 * 60 * 60 * 1000;
const LOCK_KEY = "job:earnings-clearance:lock";
/** TTL dài hơn thời gian quét thực tế nhiều lần, để lock tự hết hạn nếu process chết giữa chừng. */
const LOCK_TTL_SECONDS = 600;

const instanceId = randomUUID();
let timerHandle = null;
let stopped = false;
let lastReconcileAt = 0;

async function runEarningsClearance() {
  if (mongoose.connection.readyState !== 1) return;

  // Lock chỉ để 2 instance khỏi quét trùng cho đỡ tốn query — `releaseEligibleEarnings` tự nó
  // đã an toàn trước việc chạy chồng nhờ claim-first, nên không giành được lock là bỏ qua yên tâm.
  const acquired = await cacheAcquireLock(LOCK_KEY, LOCK_TTL_SECONDS, instanceId);
  if (!acquired) return;

  try {
    const result = await releaseEligibleEarnings();
    if (result.releasedCount > 0 || result.heldCount > 0 || result.failedCount > 0) {
      console.log(
        `[earningsClearanceJob] released=${result.releasedCount} held(report mở)=${result.heldCount} failed=${result.failedCount}`,
      );
    }

    if (Date.now() - lastReconcileAt >= RECONCILE_INTERVAL_MS) {
      lastReconcileAt = Date.now();
      const audit = await reconcileMentorClearingBalances();
      if (audit.mismatches.length > 0) {
        console.error(
          `[earningsClearanceJob] LỆCH SỔ clearingBalance ở ${audit.mismatches.length}/${audit.checked} mentor:`,
          JSON.stringify(audit.mismatches.slice(0, 20)),
        );
      }
      const a = audit.alerts;
      if (a && (a.staleFailedClearances > 0 || a.heldPayments > 0 || a.suspendedMentorsWithBalance.length > 0)) {
        console.warn(
          `[earningsClearanceJob] CẦN XỬ LÝ — release lỗi quá 24h: ${a.staleFailedClearances}, ` +
            `giao dịch bị giữ (tài khoản khóa): ${a.heldPayments}, ` +
            `mentor tạm ngưng còn số dư quá ${7} ngày: ${a.suspendedMentorsWithBalance.length}`,
          JSON.stringify(a.suspendedMentorsWithBalance.slice(0, 10)),
        );
      }
    }
  } finally {
    await cacheReleaseLock(LOCK_KEY).catch(() => {});
  }
}

/**
 * Chạy mỗi giờ khi server đã kết nối MongoDB — release tiền đã đủ EARNINGS_HOLD_DAYS.
 *
 * Tự hẹn lượt kế tiếp SAU KHI lượt hiện tại xong (không dùng setInterval): một lượt quét chậm
 * hơn 1 tiếng sẽ không bị lượt sau chồng lên.
 */
export function startEarningsClearanceJob() {
  if (timerHandle || stopped) return;

  const loop = async () => {
    try {
      await runEarningsClearance();
    } catch (e) {
      console.error("[earningsClearanceJob]", e?.message || e);
    }
    if (stopped) return;
    timerHandle = setTimeout(loop, INTERVAL_MS);
    timerHandle.unref?.();
  };

  timerHandle = setTimeout(loop, 0);
  timerHandle.unref?.();
}

/** Dừng job — dùng trong test để tiến trình không bị treo. */
export function stopEarningsClearanceJob() {
  stopped = true;
  if (timerHandle) clearTimeout(timerHandle);
  timerHandle = null;
}
