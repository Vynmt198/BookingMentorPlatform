export const SUPPORTED_BANKS = [
  "Vietcombank",
  "BIDV",
  "VietinBank",
  "Agribank",
  "Techcombank",
  "MB Bank",
  "ACB",
  "VPBank",
  "TPBank",
  "Sacombank",
  "HDBank",
  "VIB",
  "SHB",
  "OCB",
  "Eximbank",
  "SeABank",
  "PVcomBank",
  "Nam A Bank",
];

export const BANK_OTHER = "__other__";

export function resolveBankFields(savedName) {
  const name = String(savedName || "").trim();
  if (!name) return { select: "", custom: "" };
  if (SUPPORTED_BANKS.includes(name)) return { select: name, custom: "" };
  return { select: BANK_OTHER, custom: name };
}

export function effectiveBankName(bankSelect, customBankName) {
  if (bankSelect === BANK_OTHER) return String(customBankName || "").trim();
  return String(bankSelect || "").trim();
}

export function refundBankValidationMessage(bankSelect, customBankName) {
  if (!bankSelect) return "Vui lòng chọn ngân hàng.";
  if (bankSelect === BANK_OTHER && !String(customBankName || "").trim()) {
    return "Bạn chọn «Ngân hàng khác» — vui lòng nhập tên ngân hàng.";
  }
  return "";
}

const BANK_INITIALS = {
  Vietcombank: "VCB",
  BIDV: "BIDV",
  VietinBank: "CTG",
  Agribank: "AGB",
  Techcombank: "TCB",
  "MB Bank": "MB",
  ACB: "ACB",
  VPBank: "VPB",
  TPBank: "TPB",
  Sacombank: "STB",
  HDBank: "HDB",
  VIB: "VIB",
  SHB: "SHB",
  OCB: "OCB",
  Eximbank: "EIB",
  SeABank: "SSB",
  PVcomBank: "PVC",
  "Nam A Bank": "NAB",
};

const BANK_BADGE_COLORS = [
  "#8037f4",
  "#0ea5e9",
  "#f59e0b",
  "#10b981",
  "#ef4444",
  "#6366f1",
  "#14b8a6",
  "#ec4899",
];

/** Icon tròn chữ viết tắt cho ngân hàng — không có logo thật trong repo nên dùng badge màu thay thế. */
export function getBankBadge(bankName) {
  const name = String(bankName || "").trim();
  const fallbackInitials = name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
  const initials = BANK_INITIALS[name] || fallbackInitials || "NH";
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) % 997;
  const color = BANK_BADGE_COLORS[Math.abs(hash) % BANK_BADGE_COLORS.length];
  return { initials, color };
}
