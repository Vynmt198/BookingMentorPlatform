function filled(v) {
  if (v == null) return false;
  if (typeof v === 'number') return Number.isFinite(v) && v >= 0;
  return String(v).trim().length > 0;
}

function hasWorkSection(form) {
  return (
    filled(form?.position) ||
    filled(form?.currentCompany) ||
    filled(form?.experience) ||
    filled(form?.profileWorkExperience)
  );
}

function hasMentorFee(form) {
  const rate = Number(String(form?.targetRate || '').replace(/\D/g, ''));
  return Number.isFinite(rate) && rate > 0;
}

export function getProfileCvMissing(form) {
  const missing = [];
  if (!filled(form?.name)) missing.push('Họ và tên');
  if (!filled(form?.email)) missing.push('Email');
  if (!filled(form?.bio)) missing.push('Giới thiệu bản thân');
  if (!hasWorkSection(form)) missing.push('Kinh nghiệm làm việc');
  if (!filled(form?.skillsCerts)) missing.push('Kỹ năng & chứng chỉ');
  if (!hasMentorFee(form)) missing.push('Mức giá đăng ký');
  return missing;
}

export function getCvSectionKeysToExpand(form) {
  const keys = [];
  if (!filled(form?.bio)) keys.push('intro');
  if (!hasWorkSection(form)) keys.push('work');
  if (!filled(form?.skillsCerts)) keys.push('skills');
  if (!hasMentorFee(form)) keys.push('price');
  return keys;
}

export function mentorApplyBlockedMessage(missing) {
  if (!missing?.length) return '';
  if (missing.length === 1) return `Còn thiếu: ${missing[0]}.`;
  return `Còn thiếu các mục bắt buộc: ${missing.join(', ')}.`;
}
