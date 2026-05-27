import { hasWorkHistoryContent } from "./profileWorkHistory";

/** Quy tắc đăng ký mentor: intro + học tập + thông tin mentor + (kinh nghiệm HOẶC ngoại khóa). */
export const PROFILE_CV_SECTIONS = [
  { key: "intro", label: "Giới thiệu bản thân" },
  { key: "education", label: "Quá trình học tập" },
  { key: "targetRate", label: "Thông tin đăng ký làm mentor" },
  { key: "work", label: "Kinh nghiệm làm việc" },
  { key: "extracurricular", label: "Hoạt động ngoại khóa" },
];

function filled(v) {
  if (v == null) return false;
  if (typeof v === "number") return Number.isFinite(v) && v >= 0;
  return String(v).trim().length > 0;
}

function hasWorkSection(cv) {
  if (hasWorkHistoryContent(cv?.workHistory)) return true;
  return (
    filled(cv?.workExperience) ||
    filled(cv?.title) ||
    filled(cv?.company) ||
    filled(cv?.yearsOfExperience)
  );
}

function hasMentorFee(cv) {
  const rate = Number(cv?.targetRate);
  return Number.isFinite(rate) && rate > 0;
}

export function getProfileCvMissing(cv) {
  const missing = [];
  if (!filled(cv?.intro)) missing.push("Giới thiệu bản thân");
  if (!filled(cv?.education)) missing.push("Quá trình học tập");
  if (!hasMentorFee(cv)) missing.push("Thông tin đăng ký làm mentor");
  if (!hasWorkSection(cv) && !filled(cv?.extracurricular)) {
    missing.push("Kinh nghiệm làm việc hoặc Hoạt động ngoại khóa");
  }
  return missing;
}

/** Gợi ý mở accordion khi thiếu field — dùng sau validate. */
export function getCvSectionKeysToExpand(cv) {
  const keys = [];
  if (!filled(cv?.intro)) keys.push("intro");
  if (!filled(cv?.education)) keys.push("education");
  if (!hasMentorFee(cv)) keys.push("mentorExtra");
  if (!hasWorkSection(cv)) keys.push("work");
  if (!filled(cv?.extracurricular) && !hasWorkSection(cv)) keys.push("extracurricular");
  return keys;
}

export function isProfileCvCompleteForMentor(cv) {
  return getProfileCvMissing(cv).length === 0;
}

export const MENTOR_APPLY_INCOMPLETE_MSG =
  "Vui lòng điền đầy đủ thông tin hồ sơ cá nhân để đăng ký làm mentor.";

export const MENTOR_APPLY_RESUBMIT_CONFIRM_TITLE =
  "Hồ sơ mentor đang chờ admin duyệt";
export const MENTOR_APPLY_RESUBMIT_CONFIRM_BODY =
  "Bạn có chắc muốn gửi lại? Admin chỉ xem bản gửi mới nhất.";

export function mentorApplyBlockedMessage(missing) {
  if (!missing?.length) return "";
  return MENTOR_APPLY_INCOMPLETE_MSG;
}
