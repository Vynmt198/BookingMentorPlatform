/** Chuẩn hóa plan key từ FE / payment metadata. */
export function normalizePlanKey(raw) {
  const k = String(raw ?? "").trim().toLowerCase().replace(/[-\s]/g, "_");
  if (k === "student") return "student";
  if (k === "professional") return "professional";
  if (k === "free") return "free";
  // backward-compat aliases (dữ liệu cũ / gói đã ngừng bán — premium gộp vào professional)
  if (k === "starterpro" || k === "starter_pro") return "student";
  if (k === "elitepro" || k === "elite_pro" || k === "premium") return "professional";
  return null;
}

/** Map planKey subscription từ payment providerResponse / admin input. */
export function planKeyFromSubscriptionMeta(planKey) {
  const s = String(planKey ?? "").toLowerCase();
  if (s.includes("professional") || s.includes("career")) return "professional";
  if (s.includes("student") || s.includes("basic")) return "student";
  // backward-compat / gói đã ngừng bán
  if (s.includes("premium") || s.includes("elite")) return "professional";
  if (s.includes("starter") || s.includes("pro")) return "student";
  return normalizePlanKey(planKey);
}
