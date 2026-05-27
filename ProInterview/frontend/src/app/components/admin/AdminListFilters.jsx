import { ChevronDown, RotateCcw } from "lucide-react";

const SELECT_CLASS =
  "w-full min-w-[11rem] appearance-none rounded-2xl border border-slate-200 bg-white py-2.5 pl-3 pr-9 text-sm font-semibold text-slate-900 outline-none transition focus:border-violet-400 sm:min-w-[12.5rem]";

export function AdminFilterSelect({ id, label, value, options, onChange }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-[10px] font-black uppercase tracking-widest text-slate-500">
        {label}
      </label>
      <div className="relative">
        <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={SELECT_CLASS}>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          aria-hidden
        />
      </div>
    </div>
  );
}

/** Thanh lọc gọn: dropdown + đặt lại (không hiện chip «Đang lọc»). */
export function AdminListFilterBar({ children, countText, onReset, showReset = false }) {
  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white/90 px-4 py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-wrap items-end gap-4">
          {children}
          {showReset ? (
            <div className="flex flex-col gap-1">
              <span
                className="text-[10px] font-black uppercase tracking-widest text-transparent select-none"
                aria-hidden
              >
                &nbsp;
              </span>
              <button
                type="button"
                onClick={onReset}
                className="inline-flex h-[42px] shrink-0 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-[10px] font-black uppercase tracking-wider text-slate-700 shadow-sm transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-900"
              >
                <RotateCcw className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                Đặt lại
              </button>
            </div>
          ) : null}
        </div>
        {countText ? <p className="shrink-0 text-xs font-medium text-slate-500 sm:pb-1">{countText}</p> : null}
      </div>
    </div>
  );
}
