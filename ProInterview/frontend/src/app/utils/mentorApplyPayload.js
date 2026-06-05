import { serializeEducationHistory } from "./profileEducationHistory";
import {
  estimateExperienceYears,
  formatWorkHistoryLines,
  pickCurrentWorkEntry,
  serializeWorkHistory,
  workHistoryToCompanies,
} from "./profileWorkHistory";

/**
 * Map form Profile → POST /api/mentors/apply (khớp mentorMeService.applyForMentor).
 */
export function buildMentorApplyPayload(form) {
  const splitCsv = (s) =>
    String(s ?? "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);

  const entries = Array.isArray(form.workHistory) ? form.workHistory : [];
  const current = pickCurrentWorkEntry(entries);
  const workText =
    entries.length > 0
      ? serializeWorkHistory(entries)
      : String(form.workExperience ?? form.careerHistory ?? "").trim();

  const manualYears = Number(form.yearsOfExperience);
  const autoYears = estimateExperienceYears(entries);
  const years =
    Number.isFinite(manualYears) && manualYears >= 0
      ? manualYears
      : autoYears ?? 0;

  const rate = Number(form.targetRate);
  const companies = workHistoryToCompanies(entries);
  const companiesFromText = splitCsv(form.workExperience ?? form.careerHistory);

  const eduEntries = Array.isArray(form.educationHistory) ? form.educationHistory : [];
  const profileEducation =
    eduEntries.length > 0
      ? serializeEducationHistory(eduEntries)
      : String(form.education ?? "").trim();

  return {
    title: String(current?.role ?? form.title ?? "").trim(),
    company: String(current?.company ?? form.company ?? "").trim(),
    bio: String(form.bio ?? form.intro ?? "").trim(),
    yearsOfExperience: years,
    targetRate: Number.isFinite(rate) && rate > 0 ? rate : undefined,
    tags: splitCsv(form.skillsCerts ?? form.skills),
    workExperience: workText,
    companies: companies.length ? companies : companiesFromText,
    fields: splitCsv(form.fields),
    linkedinProfile: String(form.linkedinProfile ?? "").trim(),
    portfolioLink: String(form.portfolioLink ?? "").trim(),
    responseTime: String(form.responseTime ?? "").trim() || "< 24 giờ",
    timezone: String(form.timezone ?? "").trim() || "Asia/Ho_Chi_Minh",
    profileEducation,
    profileExtracurricular: String(form.extracurricular ?? "").trim(),
    profileAwards: String(form.awards ?? "").trim(),
  };
}

/** Dùng khi cần text hiển thị (admin fallback). */
export function workHistoryDisplayFromForm(form) {
  const entries = Array.isArray(form?.workHistory) ? form.workHistory : [];
  if (entries.length) return formatWorkHistoryLines(entries);
  return String(form?.workExperience ?? "").trim();
}
