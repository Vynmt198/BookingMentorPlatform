/**
 * Chính sách hủy / hoàn tiền buổi mentor — khớp `bookingsService.userCancellationFeePercent`
 * và luồng `cancelMentorBooking` / `processBookingNoShow`.
 */

/**
 * Học viên **không** có «đổi lịch miễn phí» trên buổi đang active.
 * Muốn đổi giờ/mentor: hủy buổi (hoàn theo bảng) → đặt lịch mới.
 * «Đổi lịch» chỉ khi mentor đã hủy ≥24h (chọn phương án trên trang buổi hẹn).
 */
export const USER_CHANGE_SLOT_NOTE = "Đổi giờ: hủy buổi rồi đặt lại (không đổi lịch trực tiếp).";

/** Dòng ngắn khi học viên hủy (highlight theo giờ còn lại trước buổi). */
export const USER_CANCEL_POLICY_BRIEF = [
  { id: "gte24", text: "Từ 24 giờ trước buổi: hoàn 100%" },
  { id: "12to24", text: "12–24 giờ trước buổi: hoàn 50%" },
  { id: "lt12", text: "Dưới 12 giờ: không hoàn" },
];

/** Khối mentor — cùng cấu trúc tiêu đề + danh sách với `USER_CANCEL_POLICY_BRIEF`. */
export const MENTOR_CANCEL_POLICY_BRIEF = {
  title: "Khi mentor hủy / no-show",
  items: [{ id: "refund", text: "Hoàn 100% phí đã thanh toán" }],
};

/** Đối với User — hủy buổi do học viên */
export const USER_CANCEL_POLICY_ROWS = [
  {
    id: "gte24",
    when: "Hủy trước buổi hẹn từ 24 giờ trở lên",
    policy: "Hoàn 100%",
    minHours: 24,
  },
  {
    id: "12to24",
    when: "Hủy trong vòng 12 – dưới 24 giờ trước buổi hẹn",
    policy: "Hoàn 50%",
    minHours: 12,
    maxHours: 24,
  },
  {
    id: "lt12",
    when: "Hủy trong vòng dưới 12 giờ trước buổi hẹn / Không tham gia buổi hẹn",
    policy: "Không hoàn tiền",
    maxHours: 12,
  },
];

/** Đối với Mentor — mentor chủ động hủy / no-show */
export const MENTOR_CANCEL_POLICY_ROWS = [
  {
    id: "mentor_gte24",
    when: "Mentor hủy từ 24 giờ trở lên",
    policy: "Đổi lịch / đổi mentor / hoàn 100%",
  },
  {
    id: "mentor_lt24",
    when: "Mentor hủy trong vòng dưới 24 giờ",
    policy: "Hoàn 100% ưu tiên",
  },
  {
    id: "mentor_noshow",
    when: "Mentor no-show (không tham gia buổi hẹn)",
    policy: "Hoàn 100% + ghi nhận vi phạm mentor",
  },
];

/**
 * @param {number} hoursUntil — giờ còn lại trước buổi (âm = đã qua giờ)
 * @returns {{ feePercent: number, refundPercent: number, tierId: string, summary: string }}
 */
export function getUserCancelPolicyFromHours(hoursUntil) {
  if (!Number.isFinite(hoursUntil)) {
    return { feePercent: 0, refundPercent: 100, tierId: "gte24", summary: "Hoàn 100%" };
  }
  if (hoursUntil < 12) {
    return { feePercent: 100, refundPercent: 0, tierId: "lt12", summary: "Không hoàn tiền" };
  }
  if (hoursUntil < 24) {
    return { feePercent: 50, refundPercent: 50, tierId: "12to24", summary: "Hoàn 50%" };
  }
  return { feePercent: 0, refundPercent: 100, tierId: "gte24", summary: "Hoàn 100%" };
}

/** Parse ngày dd/mm/yyyy + HH:mm như booking UI. */
export function getUserCancelPolicyFromDateTime(dateStr, timeStr) {
  const [d, m, y] = String(dateStr || "").split("/").map(Number);
  const [hh, mm] = String(timeStr || "").split(":").map(Number);
  const startAt = new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0, 0);
  if (!Number.isFinite(startAt.getTime())) {
    return getUserCancelPolicyFromHours(Number.NaN);
  }
  const hoursUntil = (startAt.getTime() - Date.now()) / 3_600_000;
  return getUserCancelPolicyFromHours(hoursUntil);
}

export function userCancelWarningMessage(policy) {
  if (policy.feePercent === 100) {
    return "Hủy trong vòng dưới 12 giờ trước buổi hẹn: không hoàn tiền (100% phí giữ lại).";
  }
  if (policy.feePercent === 50) {
    return "Hủy từ 12 giờ đến dưới 24 giờ trước buổi: hoàn 50% phí đã thanh toán.";
  }
  return "Hủy từ 24 giờ trở lên trước buổi: hoàn 100% phí đã thanh toán.";
}

/** Dòng tóm tắt — UI sidebar buổi hẹn */
export function userCancelWarningShort(policy) {
  if (policy.feePercent === 100) return "Hủy ngay: không hoàn";
  if (policy.feePercent === 50) return "Hủy ngay: hoàn 50%";
  return "Hủy ngay: hoàn 100%";
}
