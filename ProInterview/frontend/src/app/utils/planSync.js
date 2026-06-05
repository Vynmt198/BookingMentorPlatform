/** Logic thuần đồng bộ gói API → flags UI (test được bằng node --test). */

export const PLAN_STORAGE_KEY = "prointerview_plans";

export function apiPlanToLocalFlags(plan) {
  const p = String(plan || "free").toLowerCase();
  if (p === "premium")      return { student: true, professional: true, premium: true };
  if (p === "professional") return { student: true, professional: true, premium: false };
  if (p === "student")      return { student: true, professional: false, premium: false };
  return { student: false, professional: false, premium: false };
}

/** Migrate object cũ {starterPro/elitePro/voicePro/cvPro} → {student/professional/premium}. */
export function migrateLegacyPlanFlags(parsed) {
  if (!parsed || typeof parsed !== "object") {
    return { student: false, professional: false, premium: false };
  }
  // Đã là format mới
  if ("student" in parsed || "professional" in parsed || "premium" in parsed) {
    return { student: false, professional: false, premium: false, ...parsed };
  }
  // Format cũ {starterPro, elitePro}
  if ("starterPro" in parsed || "elitePro" in parsed || "voicePro" in parsed || "cvPro" in parsed) {
    const isElite = !!(parsed.elitePro || (parsed.voicePro && parsed.cvPro));
    const isPro   = !!(parsed.starterPro || parsed.voicePro || parsed.cvPro);
    if (isElite) return { student: true, professional: true, premium: false };
    if (isPro)   return { student: true, professional: false, premium: false };
    return { student: false, professional: false, premium: false };
  }
  return { student: false, professional: false, premium: false };
}

/** Nếu profile API có plan trả về flags mới hơn localStorage. */
export function resolvePlansFromStorageAndUser(stored, userPlan) {
  const base = stored ?? { student: false, professional: false, premium: false };
  if (!userPlan || userPlan === "free") return base;
  const fromApi = apiPlanToLocalFlags(userPlan);
  if (
    fromApi.student !== base.student ||
    fromApi.professional !== base.professional ||
    fromApi.premium !== base.premium
  ) {
    return fromApi;
  }
  return base;
}
