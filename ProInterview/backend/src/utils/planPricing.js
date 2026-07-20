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
