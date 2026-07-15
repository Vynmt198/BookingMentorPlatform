import { Clock, MessageSquare, ShieldCheck, Video, X } from "lucide-react";
import { motion } from "motion/react";
import { BRAND_CTA_LIME_STYLE } from "../../constants/brandColors.js";

export function MeetingEndSessionPanel({
  open,
  onClose,
  onConfirm,
  confirming = false,
  elapsedLabel,
  counterpartName,
  counterpartLabel,
  sessionLabel,
  hasLiveNotes = false,
  canConfirm = true,
  blockReason = "",
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="meeting-end-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Đóng"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-violet-200/80 bg-white shadow-[0_24px_64px_rgba(128,55,244,0.18)]"
      >
        <div className="border-b border-violet-100 bg-gradient-to-r from-[#faf8ff] via-white to-[#f5fce8]/40 px-5 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-[#8037f4]">Kết thúc buổi mentor</p>
              <h2 id="meeting-end-title" className="mt-1 text-xl font-bold text-slate-900">
                Xác nhận hoàn thành buổi học
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="space-y-4 px-5 py-5 sm:px-6">
          <div className="rounded-xl border border-violet-100 bg-violet-50/60 px-4 py-3 text-sm leading-relaxed text-violet-950">
            Buổi video vẫn có thể tiếp tục nếu bạn chọn <strong>Quay lại buổi</strong>. Chỉ khi bấm{" "}
            <strong>Xác nhận kết thúc</strong> hệ thống mới đánh dấu hoàn thành và mở form ghi chú cho học viên.
          </div>

          <dl className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5">
              <dt className="text-[10px] font-black uppercase tracking-wider text-slate-500">Thời lượng</dt>
              <dd className="mt-1 flex items-center gap-2 text-sm font-bold text-slate-900">
                <Clock className="h-4 w-4 text-[#8037f4]" />
                {elapsedLabel}
              </dd>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5">
              <dt className="text-[10px] font-black uppercase tracking-wider text-slate-500">{counterpartLabel}</dt>
              <dd className="mt-1 text-sm font-bold text-slate-900">{counterpartName || "—"}</dd>
            </div>
          </dl>

          {sessionLabel ? (
            <p className="text-xs text-slate-500">
              Loại buổi: <span className="font-semibold text-slate-700">{sessionLabel}</span>
            </p>
          ) : null}

          <ul className="space-y-2 text-xs text-slate-600">
            <li className="flex items-start gap-2">
              <Video className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#8037f4]" />
              Video call không bị ngắt khi bạn mở panel này.
            </li>
            <li className="flex items-start gap-2">
              <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#8037f4]" />
              {hasLiveNotes
                ? "Ghi chú trong buổi sẽ tự lưu cho AI — không cần điền form sau buổi."
                : "Nếu chưa ghi chú, bạn vẫn có thể quay lại buổi và gõ nhanh trước khi xác nhận."}
            </li>
          </ul>

          {!canConfirm && blockReason ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-900">
              {blockReason}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/50 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          <button
            type="button"
            onClick={onClose}
            disabled={confirming}
            className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-black uppercase tracking-widest text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Quay lại buổi
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirming || !canConfirm}
            style={canConfirm ? BRAND_CTA_LIME_STYLE : undefined}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-xs font-black uppercase tracking-widest ${
              canConfirm ? "shadow-[0_8px_24px_rgba(147,247,43,0.35)]" : "cursor-not-allowed bg-slate-200 text-slate-500"
            } disabled:opacity-60`}
          >
            <ShieldCheck className="h-4 w-4" />
            {confirming ? "Đang xử lý…" : "Xác nhận kết thúc buổi"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
