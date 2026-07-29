import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { AlertCircle as WarningCircle, CheckCircle2, Pencil } from "lucide-react";
import { AppSelect } from "../../components/ui/AppSelect";
import { RefundBankFields } from "../../components/booking/RefundBankFields.jsx";
import { BANK_OTHER } from "../../constants/vietnamBanks.js";
import { formatVnd } from "../../utils/formatVnd.js";
import { avatarSrc, DEFAULT_AVATAR } from "../../utils/mediaUrl.js";

const TONE_STYLES = {
  rose: { icon: "border-rose-300 bg-rose-100 text-rose-800", eyebrow: "text-rose-700" },
  amber: { icon: "border-amber-300 bg-amber-100 text-amber-800", eyebrow: "text-amber-700" },
  violet: { icon: "border-violet-300 bg-violet-100 text-violet-800", eyebrow: "text-violet-800" },
};

/**
 * Giao diện xử lý sau khi mentor hủy / no-show — học viên chọn phương án hoặc điền STK.
 */
export function MentorCancelSessionPanel({
  sessionData,
  mode,
  needsChoose,
  mentorResolutionStep,
  setMentorResolutionStep,
  resolutionBusy,
  onResolve,
  rescheduleDate,
  rescheduleSlot,
  setRescheduleDate,
  setRescheduleSlot,
  rescheduleSlotOptions,
  loadingRescheduleSlots,
  refundBankSelect,
  setRefundBankSelect,
  refundCustomBankName,
  setRefundCustomBankName,
  refundAccountNumber,
  setRefundAccountNumber,
  refundAccountHolder,
  setRefundAccountHolder,
  refundBankFormTitle,
  needsRefundBankForm,
  refundDestBusy,
  onSubmitRefundDestination,
  onGoRebookMentors,
}) {
  const savedAccountNumber = sessionData?.refundReceiveAccountNumber || "";
  const hasSavedStk = Boolean(savedAccountNumber);
  const [editingBank, setEditingBank] = useState(false);

  // Vừa lưu STK thành công (savedAccountNumber đổi giá trị) → tự đóng form về trạng thái
  // "đã ghi nhận", tránh cảm giác "bấm gửi mà chẳng thấy gì đổi, chắc phải gửi lại".
  useEffect(() => {
    if (hasSavedStk) setEditingBank(false);
  }, [savedAccountNumber]);

  if (!sessionData) return null;

  const refundAmt = Number(sessionData.cancelRefundAmountVnd || sessionData.price || 0);
  const tone = mode === "no_show" ? "rose" : mode === "late_refund" ? "amber" : "violet";
  const toneStyle = TONE_STYLES[tone];
  const showAmountHero = refundAmt > 0 && ["choose", "late_refund", "no_show"].includes(mode);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
      <div className="card-premium overflow-hidden">
        {/* ── Trạng thái ── */}
        <div className="p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 ${toneStyle.icon}`}>
              <WarningCircle className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${toneStyle.eyebrow}`}>
                {mode === "no_show"
                  ? "Mentor không tham gia"
                  : mode === "late_refund"
                    ? "Mentor hủy gấp"
                    : "Mentor đã hủy lịch hẹn"}
              </p>
              <h2 className="mt-1 text-xl font-black tracking-tight text-slate-900">
                {mode === "choose"
                  ? "Chọn phương án xử lý"
                  : mode === "late_refund" || mode === "no_show"
                    ? "Hoàn tiền ưu tiên 100%"
                    : mode === "change_mentor_done"
                      ? "Đã chọn đổi mentor"
                      : "Buổi hẹn không còn hiệu lực"}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {mode === "choose" ? (
                  <>
                    Buổi <strong>{sessionData.date}</strong> lúc <strong>{sessionData.time}</strong> với{" "}
                    <strong>{sessionData.mentorName}</strong> đã bị mentor hủy (≥ 24h trước buổi, đã thanh toán).
                    Chọn đổi lịch, đổi mentor hoặc hoàn 100%.
                  </>
                ) : mode === "late_refund" ? (
                  <>Mentor hủy khi còn dưới 24 giờ — điền STK nhận hoàn bên dưới.</>
                ) : mode === "no_show" ? (
                  <>Buổi ghi nhận no-show — điền STK nhận hoàn bên dưới nếu chưa có.</>
                ) : mode === "change_mentor_done" ? (
                  <>Đã kích hoạt credit — chọn mentor khác để đặt lịch mới.</>
                ) : (
                  <>
                    Buổi <strong>{sessionData.date}</strong> lúc <strong>{sessionData.time}</strong> không còn hiệu
                    lực.
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* ── Mentor + số tiền, gộp 1 dòng để không lặp lại thông tin nhiều nơi ── */}
        <div className="mx-6 flex flex-wrap items-center gap-4 rounded-2xl border border-violet-100 bg-violet-50/40 p-4 sm:mx-8">
          <img
            src={avatarSrc(sessionData.mentorAvatar)}
            alt=""
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = DEFAULT_AVATAR;
            }}
            className="h-12 w-12 shrink-0 rounded-xl object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-slate-900">{sessionData.mentorName}</p>
            <p className="text-xs text-slate-500">
              {sessionData.date} · {sessionData.time} – {sessionData.endTime}
            </p>
            <p className="text-xs font-semibold text-violet-700">#{sessionData.orderNum}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {showAmountHero ? "Hoàn dự kiến" : "Giá trị buổi"}
            </p>
            <p className="text-lg font-black text-slate-900">
              {formatVnd(Math.round(showAmountHero ? refundAmt : sessionData.price || 0))}
            </p>
          </div>
        </div>

        {/* ── Hành động ── */}
        <div className="p-6 sm:p-8">
          {needsChoose ? (
            <>
              {!mentorResolutionStep ? (
                <div className="grid gap-3 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => setMentorResolutionStep("reschedule")}
                    className="rounded-2xl border border-violet-200 bg-white px-4 py-4 text-left transition hover:border-violet-400 hover:shadow-md"
                  >
                    <p className="text-xs font-black uppercase tracking-wider text-violet-900">Đổi lịch</p>
                    <p className="mt-2 text-[11px] leading-relaxed text-slate-600">Giữ mentor — chọn ngày/giờ mới</p>
                  </button>
                  <button
                    type="button"
                    disabled={resolutionBusy}
                    onClick={() => onResolve("change_mentor")}
                    className="rounded-2xl border border-violet-200 bg-white px-4 py-4 text-left transition hover:border-violet-400 hover:shadow-md disabled:opacity-50"
                  >
                    <p className="text-xs font-black uppercase tracking-wider text-violet-900">Đổi mentor</p>
                    <p className="mt-2 text-[11px] leading-relaxed text-slate-600">Dùng credit đã trả — mentor khác</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMentorResolutionStep("refund")}
                    className="rounded-2xl border border-violet-200 bg-white px-4 py-4 text-left transition hover:border-violet-400 hover:shadow-md"
                  >
                    <p className="text-xs font-black uppercase tracking-wider text-violet-900">Hoàn tiền 100%</p>
                    <p className="mt-2 text-[11px] leading-relaxed text-slate-600">Admin CK sau khi có STK</p>
                  </button>
                </div>
              ) : null}

              {mentorResolutionStep === "reschedule" ? (
                <div className="mt-4 space-y-3 rounded-2xl border border-violet-100 bg-white p-4">
                  <p className="text-xs font-black uppercase tracking-wider text-violet-900">Chọn khung giờ mới</p>
                  {loadingRescheduleSlots ? (
                    <p className="text-xs text-gray-500">Đang tải lịch trống…</p>
                  ) : rescheduleSlotOptions.length === 0 ? (
                    <p className="text-xs text-amber-700">Không có slot trống — chọn hoàn tiền hoặc liên hệ support.</p>
                  ) : (
                    <AppSelect
                      size="md"
                      value={`${rescheduleDate}|${rescheduleSlot}`}
                      onValueChange={(v) => {
                        const [d, s] = String(v).split("|");
                        setRescheduleDate(d);
                        setRescheduleSlot(s);
                      }}
                      options={rescheduleSlotOptions.map((o) => ({
                        value: `${o.date}|${o.slot}`,
                        label: o.label,
                      }))}
                    />
                  )}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={resolutionBusy || rescheduleSlotOptions.length === 0}
                      onClick={() => onResolve("reschedule")}
                      className="rounded-xl px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white disabled:opacity-50"
                      style={{ background: "#8037f4" }}
                    >
                      {resolutionBusy ? "Đang xử lý…" : "Xác nhận đổi lịch"}
                    </button>
                  </div>
                </div>
              ) : null}

              {mentorResolutionStep === "refund" ? (
                <RefundForm
                  refundBankSelect={refundBankSelect}
                  setRefundBankSelect={setRefundBankSelect}
                  refundCustomBankName={refundCustomBankName}
                  setRefundCustomBankName={setRefundCustomBankName}
                  refundAccountNumber={refundAccountNumber}
                  setRefundAccountNumber={setRefundAccountNumber}
                  refundAccountHolder={refundAccountHolder}
                  setRefundAccountHolder={setRefundAccountHolder}
                  busy={resolutionBusy}
                  onSubmit={() => onResolve("refund")}
                  submitLabel="Xác nhận hoàn 100%"
                />
              ) : null}
            </>
          ) : null}

          {mode === "change_mentor_done" ? (
            <button
              type="button"
              onClick={onGoRebookMentors}
              className="w-full rounded-2xl py-4 text-xs font-black uppercase tracking-wider text-white"
              style={{ background: "#8037f4" }}
            >
              Chọn mentor mới →
            </button>
          ) : null}

          {(mode === "late_refund" || mode === "no_show" || (needsRefundBankForm && !needsChoose)) &&
          mentorResolutionStep !== "refund" ? (
            hasSavedStk && !editingBank ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-emerald-800">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> Đã ghi nhận STK nhận hoàn
                  </p>
                  <p className="mt-1.5 truncate text-sm font-semibold text-slate-800">
                    {sessionData.refundReceiveBankName || "—"} · {sessionData.refundReceiveAccountNumber} ·{" "}
                    {sessionData.refundReceiveAccountHolder || "—"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Admin sẽ chuyển khoản khi đối soát — không cần gửi lại, chỉ sửa nếu điền sai.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingBank(true)}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-wider text-slate-700 transition hover:bg-slate-50"
                >
                  <Pencil className="h-3.5 w-3.5" /> Sửa lại
                </button>
              </div>
            ) : (
              <RefundForm
                title={refundBankFormTitle || (hasSavedStk ? "Sửa STK nhận hoàn" : "Điền STK nhận hoàn")}
                refundBankSelect={refundBankSelect}
                setRefundBankSelect={setRefundBankSelect}
                refundCustomBankName={refundCustomBankName}
                setRefundCustomBankName={setRefundCustomBankName}
                refundAccountNumber={refundAccountNumber}
                setRefundAccountNumber={setRefundAccountNumber}
                refundAccountHolder={refundAccountHolder}
                setRefundAccountHolder={setRefundAccountHolder}
                busy={refundDestBusy}
                onSubmit={onSubmitRefundDestination}
                submitLabel={hasSavedStk ? "Cập nhật STK nhận hoàn" : "Lưu STK nhận hoàn"}
                noTopPad
              />
            )
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}

function RefundForm({
  title = "STK nhận hoàn",
  refundBankSelect,
  setRefundBankSelect,
  refundCustomBankName,
  setRefundCustomBankName,
  refundAccountNumber,
  setRefundAccountNumber,
  refundAccountHolder,
  setRefundAccountHolder,
  busy,
  onSubmit,
  submitLabel,
  noTopPad = false,
}) {
  return (
    <div className={noTopPad ? "space-y-3" : "mt-4 space-y-3 border-t border-violet-100 pt-5"}>
      {title ? <p className="text-sm font-bold text-slate-900">{title}</p> : null}
      <RefundBankFields
        bankSelect={refundBankSelect}
        onBankSelectChange={(value) => {
          setRefundBankSelect(value);
          if (value !== BANK_OTHER) setRefundCustomBankName("");
        }}
        customBankName={refundCustomBankName}
        onCustomBankNameChange={setRefundCustomBankName}
        accountNumber={refundAccountNumber}
        onAccountNumberChange={setRefundAccountNumber}
        accountHolder={refundAccountHolder}
        onAccountHolderChange={setRefundAccountHolder}
      />
      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="button"
          disabled={busy}
          onClick={onSubmit}
          className="rounded-xl px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white disabled:opacity-50"
          style={{ background: "#8037f4" }}
        >
          {busy ? "Đang xử lý…" : submitLabel}
        </button>
      </div>
    </div>
  );
}
