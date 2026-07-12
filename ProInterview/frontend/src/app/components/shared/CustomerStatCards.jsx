import React from "react";

const TONE = {
  purple: { iconBg: "bg-violet-100", icon: "text-[#8037f4]", valueColor: "#8037f4" },
  lime: { iconBg: "bg-lime-100", icon: "text-lime-800", valueColor: "#4d7c0f" },
  red: { iconBg: "bg-rose-100", icon: "text-rose-600", valueColor: "#e11d48" },
};

/** Lưới 4 (hoặc ít hơn) thẻ số liệu — dùng ở đầu các trang "của tôi" (khóa học, lịch hẹn, CV) */
export function CustomerStatGrid({ children, className = "" }) {
  return (
    <div className={`grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 ${className}`.trim()}>
      {children}
    </div>
  );
}

export function CustomerStatCard({ icon: Icon, value, label, tone = "purple" }) {
  const t = TONE[tone] || TONE.purple;
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-violet-200/70 bg-white p-4 shadow-sm sm:p-5">
      <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${t.iconBg}`}>
        <Icon className={`size-5 ${t.icon}`} strokeWidth={2.2} />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
        <p className="mentor-stat-num mentor-stat-num--card mt-1 leading-none" style={{ color: t.valueColor }}>
          {value}
        </p>
      </div>
    </div>
  );
}
