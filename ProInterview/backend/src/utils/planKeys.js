/** Chuẩn hóa plan key từ FE / payment metadata. */
export function normalizePlanKey(raw) {
  const k = String(raw ?? "").trim();
  if (k === "starterPro" || k === "starter_pro") return "starter_pro";
  if (k === "elitePro" || k === "elite_pro") return "elite_pro";
  if (k === "free") return "free";
  return null;
}

/** Map planKey subscription từ payment providerResponse / admin input. */
export function planKeyFromSubscriptionMeta(planKey) {
  const s = String(planKey ?? "").toLowerCase();
  if (s.includes("elite")) return "elite_pro";
  if (s.includes("starter")) return "starter_pro";
  return normalizePlanKey(planKey);
}
