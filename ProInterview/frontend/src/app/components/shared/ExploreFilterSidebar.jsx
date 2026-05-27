import { useState } from "react";
import { ChevronDown } from "lucide-react";

export function FilterRadio({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-lg py-1.5 text-left text-sm text-slate-700 transition-colors hover:bg-violet-50/80"
    >
      <span
        className={`flex size-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
          active ? "border-[#8037f4] bg-[#8037f4]" : "border-slate-300 bg-white"
        }`}
        aria-hidden
      >
        {active ? <span className="size-1.5 rounded-full bg-white" /> : null}
      </span>
      <span className={active ? "font-semibold text-violet-950" : ""}>{children}</span>
    </button>
  );
}

export function FilterSection({ title, open, onToggle, children }) {
  return (
    <div className="border-b border-slate-200/80 py-3 last:border-0">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between text-left text-sm font-bold text-slate-800"
      >
        {title}
        <ChevronDown className={`size-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? <div className="mt-2 space-y-0.5">{children}</div> : null}
    </div>
  );
}

export function ExploreFilterSidebar({ title = "Bộ lọc", onClear, hasFilter, children }) {
  return (
    <aside className="w-full shrink-0 rounded-2xl border border-slate-200/90 bg-slate-50/90 p-4 lg:w-[15.5rem] xl:w-[17rem]">
      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">{title}</p>
      {children}
      <button
        type="button"
        onClick={onClear}
        disabled={!hasFilter}
        className="mt-4 w-full rounded-lg bg-[#8037f4] py-2.5 text-sm font-bold text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Xóa bộ lọc
      </button>
    </aside>
  );
}
