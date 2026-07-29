import { DoorOpen, LogOut, X } from "lucide-react";
import { motion } from "motion/react";

/** Xác nhận trước khi rời phòng đang họp live — thay cho window.confirm() mặc định của trình duyệt. */
export function MeetingLeaveConfirmPanel({ open, onCancel, onConfirm }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="meeting-leave-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onCancel}
        aria-label="Đóng"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-violet-200/80 bg-white shadow-[0_24px_64px_rgba(128,55,244,0.18)]"
      >
        <div className="border-b border-violet-100 bg-gradient-to-r from-[#faf8ff] via-white to-[#fff0f0]/60 px-5 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-500">
                <DoorOpen className="h-4 w-4" />
              </span>
              <h2 id="meeting-leave-title" className="text-lg font-bold text-slate-900">
                Rời phòng đang họp?
              </h2>
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="space-y-3 px-5 py-5 text-sm leading-relaxed text-slate-700 sm:px-6">
          <p>
            Buổi vẫn tính là <strong>đang diễn ra</strong> — đối phương có thể vẫn đang chờ trong phòng.
          </p>
          <p className="text-slate-500">Bạn có thể vào lại bất cứ lúc nào, buổi hẹn không bị huỷ.</p>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/50 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-black uppercase tracking-widest text-slate-700 hover:bg-slate-50"
          >
            Ở lại buổi
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-500 px-5 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-[0_8px_24px_rgba(239,68,68,0.3)] hover:bg-red-600"
          >
            <LogOut className="h-4 w-4" />
            Rời phòng
          </button>
        </div>
      </motion.div>
    </div>
  );
}
