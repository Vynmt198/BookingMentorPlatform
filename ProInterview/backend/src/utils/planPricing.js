/** Bảng giá chuẩn (VND) — nguồn sự thật duy nhất cho backend, phải khớp PLANS ở frontend (Pricing.jsx / Checkout.jsx). */
export const PLAN_PRICES = {
  student: { monthly: 150000, yearly: 1440000 },
  professional: { monthly: 500000, yearly: 4800000 },
};

/** Giá thật của plan theo chu kỳ — không bao giờ tin số tiền client tự gửi lên. */
export function getPlanPrice(planKey, billing) {
  const cycle = billing === "yearly" ? "yearly" : "monthly";
  return PLAN_PRICES[planKey]?.[cycle] ?? 0;
}

const CYCLE_DAYS = { monthly: 30, yearly: 365 };

/** Sàn tối thiểu phải trả khi đổi hạng gói — không cho quy đổi làm giá về 0/âm. */
const MIN_UPGRADE_PAYMENT_RATIO = 0.1;

/**
 * Quy đổi giá trị những ngày CHƯA DÙNG của gói hiện tại (theo tiền, không theo ngày)
 * thành khoản giảm trừ khi đổi sang gói khác hạng. Chỉ áp dụng khi đổi hạng
 * (student ↔ professional) — gia hạn cùng hạng vẫn dùng cách cộng dồn ngày cũ.
 *
 * @returns {{ creditVnd: number, isTierChange: boolean }}
 */
export function computeUpgradeCredit({ currentPlan, currentBilling, currentExpiresAt, newPlan, newBilling, now = new Date() }) {
  const isTierChange = Boolean(currentPlan) && currentPlan !== "free" && currentPlan !== newPlan;
  if (!isTierChange) return { creditVnd: 0, isTierChange };

  const expiresAt = currentExpiresAt ? new Date(currentExpiresAt) : null;
  if (!expiresAt || Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= now.getTime()) {
    return { creditVnd: 0, isTierChange };
  }

  const cycle = currentBilling === "yearly" ? "yearly" : "monthly";
  const daysInCycle = CYCLE_DAYS[cycle];
  const remainingDays = (expiresAt.getTime() - now.getTime()) / 86_400_000;
  const dailyValue = getPlanPrice(currentPlan, cycle) / daysInCycle;
  const rawCredit = Math.round(dailyValue * remainingDays);

  const newPlanPrice = getPlanPrice(newPlan, newBilling);
  const minPayment = Math.ceil(newPlanPrice * MIN_UPGRADE_PAYMENT_RATIO);
  const maxCredit = Math.max(newPlanPrice - minPayment, 0);
  const creditVnd = Math.min(Math.max(rawCredit, 0), maxCredit);

  return { creditVnd, isTierChange };
}
