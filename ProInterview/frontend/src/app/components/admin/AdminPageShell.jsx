import { RefreshCw, Search } from "lucide-react";

/** Layout thống nhất admin (theo Lịch hẹn & thanh toán). */
export const adminThCell =
  "px-4 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 sm:px-5 sm:py-5 lg:px-6";
export const adminTdCell = "px-4 py-4 sm:px-5 sm:py-5 lg:px-6";

export const adminPageWrap =
  "min-w-0 max-w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 sm:space-y-8";

export const adminHeaderRow =
  "flex min-w-0 flex-col justify-between gap-4 lg:flex-row lg:items-start lg:gap-6";

export const adminToolbar =
  "flex w-full min-w-0 flex-wrap items-center gap-3 sm:w-auto sm:justify-end";

export const adminRefreshBtn =
  "inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-700 hover:bg-slate-50 disabled:opacity-50";

export const adminSearchWrap = "relative min-w-0 flex-1 sm:flex-none sm:w-72";

export const adminSearchInput =
  "w-full min-w-0 rounded-2xl border border-slate-200 bg-white py-3 pl-12 pr-6 text-sm text-slate-900 outline-none transition-all focus:border-violet-400";

export const adminStatGrid2 = "grid gap-4 sm:grid-cols-2";
export const adminStatGrid3 = "grid gap-4 sm:grid-cols-3";
export const adminStatGrid4 = "grid gap-4 sm:grid-cols-2 lg:grid-cols-4";

export const adminGlassTable =
  "glass-card min-w-0 max-w-full overflow-hidden border-slate-200/90 [&:hover]:transform-none [&:hover]:shadow-[0_8px_18px_rgba(110,53,232,0.07)]";

export function AdminPageToolbar({ loading, onRefresh, searchTerm, onSearchChange, searchPlaceholder }) {
  return (
    <div className={adminToolbar}>
      <button type="button" onClick={onRefresh} disabled={loading} className={adminRefreshBtn}>
        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        Làm mới
      </button>
      <div className={adminSearchWrap}>
        <Search className="absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className={adminSearchInput}
        />
      </div>
    </div>
  );
}
