"use client";

import { Toaster as Sonner } from "sonner";

const TOAST_CLASS =
  "group toast !rounded-2xl !border-2 !border-violet-200/70 !bg-white !text-slate-900 !shadow-lg !shadow-violet-500/12";

const Toaster = ({ ...props }) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: TOAST_CLASS,
          title: "!font-bold !text-[#000000]",
          description: "!text-slate-600",
<<<<<<< Updated upstream
          actionButton: "!bg-[#8037f4] !text-white",
          cancelButton: "!bg-violet-50 !text-[#8037f4]",
          closeButton:
            "!border-violet-200 !bg-violet-50 !text-[#8037f4] hover:!bg-violet-100",
          success: "!border-emerald-200/80 !shadow-emerald-500/10",
          error: "!border-violet-300/80",
          warning: "!border-amber-200/80",
          info: "!border-l-4 !border-l-[#8037f4] !bg-violet-50",
=======
          actionButton: "!bg-[#630ed4] !text-white",
          cancelButton: "!bg-violet-50 !text-[#630ed4]",
          closeButton:
            "!border-violet-200 !bg-violet-50 !text-[#630ed4] hover:!bg-violet-100",
          success: "!border-emerald-200/80 !shadow-emerald-500/10",
          error: "!border-violet-300/80",
          warning: "!border-amber-200/80",
          info: "!border-l-4 !border-l-[#630ed4] !from-violet-50/95 !to-white !bg-gradient-to-r",
>>>>>>> Stashed changes
        },
      }}
      style={{
        "--normal-bg": "#ffffff",
        "--normal-text": "#000000",
        "--normal-border": "rgba(128, 55, 244, 0.22)",
        "--success-bg": "#f0fdf4",
        "--success-border": "rgba(34, 197, 94, 0.35)",
        "--success-text": "#166534",
        "--error-bg": "#faf5ff",
        "--error-border": "rgba(128, 55, 244, 0.35)",
        "--error-text": "#8037f4",
        "--warning-bg": "#fffbeb",
        "--warning-border": "rgba(245, 158, 11, 0.35)",
        "--warning-text": "#92400e",
        "--info-bg": "#f5f3ff",
        "--info-border": "rgba(99, 14, 212, 0.35)",
        "--info-text": "#8037f4",
      }}
      {...props}
    />
  );
};

export { Toaster };
