import { hasWorkHistoryContent } from "./profileWorkHistory";

/** Các mục bắt buộc khi đăng ký mentor (có dấu * trên UI). */
export const MENTOR_REQUIRED_SECTION_LABELS = [
  "Thông tin",
  "Giới thiệu bản thân",
  "Kinh nghiệm làm việc",
  "Kỹ năng & chứng chỉ",
  "Mức giá đăng ký",
];

export const PROFILE_CV_SECTIONS = [
  { key: "intro", label: "Giới thiệu bản thân", mentorRequired: true },
  { key: "work", label: "Kinh nghiệm làm việc", mentorRequired: true },
  { key: "skills", label: "Kỹ năng & chứng chỉ", mentorRequired: true },
  { key: "targetRate", label: "Mức giá đăng ký", mentorRequired: true },
  { key: "education", label: "Quá trình học tập", mentorRequired: false },
  { key: "extracurricular", label: "Hoạt động ngoại khóa", mentorRequired: false },
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

function contactMissing(contact = {}) {
  const missing = [];
  if (!filled(contact?.name)) missing.push("Họ và tên");
  if (!filled(contact?.email)) missing.push("Email");
  return missing;
}

/** Thiếu field khi đăng ký mentor — khớp feedback sản phẩm. */
export function getProfileCvMissing(cv, contact = {}) {
  const missing = [...contactMissing(contact)];
  if (!filled(cv?.intro)) missing.push("Giới thiệu bản thân");
  if (!hasWorkSection(cv)) missing.push("Kinh nghiệm làm việc");
  if (!filled(cv?.skillsCerts)) missing.push("Kỹ năng & chứng chỉ");
  if (!hasMentorFee(cv)) missing.push("Mức giá đăng ký");
  return missing;
}

export function getCvSectionKeysToExpand(cv, contact = {}) {
  const keys = [];
  if (contactMissing(contact).length) {
    /* Thông tin luôn hiển thị — không có accordion */
  }
  if (!filled(cv?.intro)) keys.push("intro");
  if (!hasWorkSection(cv)) keys.push("work");
  if (!filled(cv?.skillsCerts)) keys.push("skills");
  if (!hasMentorFee(cv)) keys.push("mentorExtra");
  return keys;
}

export function isProfileCvCompleteForMentor(cv, contact = {}) {
  return getProfileCvMissing(cv, contact).length === 0;
}

export const MENTOR_APPLY_INCOMPLETE_MSG =
  "Vui lòng điền đầy đủ các mục có dấu (*) để đăng ký làm mentor.";

export const MENTOR_APPLY_RESUBMIT_CONFIRM_TITLE =
  "Hồ sơ mentor đang chờ admin duyệt";
export const MENTOR_APPLY_RESUBMIT_CONFIRM_BODY =
  "Bạn có chắc muốn gửi lại? Admin chỉ xem bản gửi mới nhất.";

export function mentorApplyBlockedMessage(missing) {
  if (!missing?.length) return "";
  if (missing.length === 1) {
    return `Còn thiếu: ${missing[0]}.`;
  }
  return `Còn thiếu các mục bắt buộc: ${missing.join(", ")}.`;
}
