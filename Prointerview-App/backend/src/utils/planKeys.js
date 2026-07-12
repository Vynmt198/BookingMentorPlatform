/** Chuẩn hóa plan key từ FE / payment metadata. */
export function normalizePlanKey(raw) {
  const k = String(raw ?? "").trim().toLowerCase().replace(/[-\s]/g, "_");
  if (k === "student") return "student";
  if (k === "professional") return "professional";
  if (k === "premium") return "premium";
  if (k === "free") return "free";
  // backward-compat aliases (dữ liệu cũ)
  if (k === "starterpro" || k === "starter_pro") return "student";
  if (k === "elitepro" || k === "elite_pro") return "professional";
  return null;
}

/** Map planKey subscription từ payment providerResponse / admin input. */
export function planKeyFromSubscriptionMeta(planKey) {
  const s = String(planKey ?? "").toLowerCase();
  if (s.includes("premium")) return "premium";
  if (s.includes("professional") || s.includes("career")) return "professional";
  if (s.includes("student") || s.includes("basic")) return "student";
  // backward-compat
  if (s.includes("elite")) return "professional";
  if (s.includes("starter") || s.includes("pro")) return "student";
  return normalizePlanKey(planKey);
}
