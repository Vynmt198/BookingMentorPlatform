import React from "react";

/** Khung nội dung chung cho các màn admin (stub / MVP) — đồng bộ nền sáng mentor/user. */
export function AdminPanel({ title, description, bullets = [], children }) {
  return (
    <div className="space-y-6">
      <div className="glass-card border-slate-200/90 px-6 py-5">
        <p className="mb-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#8037f4]">Admin Workspace</p>
        <h1 className="font-headline text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
        {description && <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">{description}</p>}
      </div>
      {bullets.length > 0 && (
        <ul className="list-inside list-disc space-y-1.5 rounded-2xl border border-slate-200 bg-slate-50/80 p-5 text-sm text-slate-700">
          {bullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      )}
      {children ?? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white/80 px-5 py-8 text-center text-sm text-slate-500">
          Giao diện đang ở dạng khung — API quản trị &amp; bảng dữ liệu sẽ nối trong bước tiếp theo.
        </p>
      )}
    </div>
  );
}
