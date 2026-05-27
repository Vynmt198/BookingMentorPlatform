/** Body chuẩn khi admin xác nhận CK thủ công (không bắt HV bấm «đã chuyển» trong app). */
export function buildAdminTransferConfirmBody(note = "") {
  const forceNote =
    String(note || "").trim() ||
    "Admin xác nhận sau khi đối chiếu sao kê (SePay lỗi hoặc học viên báo ngoài app)";
  return { force: true, forceNote };
}
