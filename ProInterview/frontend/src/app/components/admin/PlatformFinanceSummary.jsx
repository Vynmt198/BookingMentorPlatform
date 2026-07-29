import React, { useEffect, useState } from "react";
import { Banknote, Users, Activity, RotateCcw } from "lucide-react";
import { adminApi } from "../../utils/adminApi.js";
import { toastApiError } from "../../utils/apiToast";
import { AppSelect } from "../ui/AppSelect";

const VIETNAMESE_MONTHS = [
  { value: "01", label: "Tháng 1" },
  { value: "02", label: "Tháng 2" },
  { value: "03", label: "Tháng 3" },
  { value: "04", label: "Tháng 4" },
  { value: "05", label: "Tháng 5" },
  { value: "06", label: "Tháng 6" },
  { value: "07", label: "Tháng 7" },
  { value: "08", label: "Tháng 8" },
  { value: "09", label: "Tháng 9" },
  { value: "10", label: "Tháng 10" },
  { value: "11", label: "Tháng 11" },
  { value: "12", label: "Tháng 12" },
];

/**
 * Nguồn hiển thị DUY NHẤT cho "Doanh thu nền tảng" — dùng chung ở AdminDashboard và
 * trang /admin/finance để 2 màn hình luôn khớp số (cùng gọi 1 endpoint, cùng công thức),
 * tránh mỗi trang tự tính lại theo cách khác nhau.
 */
export function PlatformFinanceSummary() {
  const [platformFinance, setPlatformFinance] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);
  const isAllTime = !selectedMonth;
  const monthLabel = selectedMonth || "Tất cả thời gian";
  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentYear = Number(currentMonth.slice(0, 4));
  const currentMonthPart = currentMonth.slice(5, 7);
  const selectedYear = selectedMonth ? selectedMonth.slice(0, 4) : String(currentYear);
  const selectedMonthPart = selectedMonth ? selectedMonth.slice(5, 7) : currentMonthPart;
  const yearOptions = Array.from({ length: 6 }, (_, idx) => String(currentYear - idx));

  function updateMonthValue(nextYear, nextMonthPart) {
    const clampedMonthPart =
      nextYear === String(currentYear) && nextMonthPart > currentMonthPart ? currentMonthPart : nextMonthPart;
    setSelectedMonth(`${nextYear}-${clampedMonthPart}`);
  }

  useEffect(() => {
    setLoading(true);
    adminApi
      .getPlatformFinanceSummary({ month: selectedMonth })
      .then((financeRes) => {
        if (financeRes.success) setPlatformFinance(financeRes.platformFinance || null);
        else {
          toastApiError(financeRes.error, "Không tải được tổng quan tài chính nền tảng.");
          setPlatformFinance(null);
        }
      })
      .catch(() => {
        toastApiError("Lỗi kết nối khi tải tổng quan tài chính nền tảng.");
        setPlatformFinance(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [selectedMonth]);

  return (
    <div className="glass-card space-y-6 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Doanh thu theo thời gian</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!isAllTime && (
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
              <AppSelect
                size="sm"
                value={selectedMonthPart}
                onValueChange={(v) => updateMonthValue(selectedYear, v)}
                options={VIETNAMESE_MONTHS.map((m) => ({
                  value: m.value,
                  label: m.label,
                  disabled: selectedYear === String(currentYear) && m.value > currentMonthPart,
                }))}
              />
              <AppSelect
                size="sm"
                value={selectedYear}
                onValueChange={(v) => updateMonthValue(v, selectedMonthPart)}
                options={yearOptions.map((year) => ({ value: year, label: year }))}
              />
            </div>
          )}
          <button
            type="button"
            onClick={() => setSelectedMonth(currentMonth)}
            className={`rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-wide transition ${
              !isAllTime
                ? "border-violet-300 bg-violet-100 text-violet-700"
                : "border-slate-300 bg-white text-slate-700 hover:border-violet-300 hover:text-violet-700"
            }`}
          >
            Theo tháng
          </button>
          <button
            type="button"
            onClick={() => setSelectedMonth("")}
            className={`rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-wide transition ${
              isAllTime
                ? "border-violet-300 bg-violet-100 text-violet-700"
                : "border-slate-300 bg-white text-slate-700 hover:border-violet-300 hover:text-violet-700"
            }`}
          >
            Tất cả thời gian
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <FinanceStatCard
          label={`Tổng thu (gộp) - ${monthLabel}`}
          value={loading ? "..." : `${Number(platformFinance?.totals?.grossCollected || 0).toLocaleString("vi-VN")}đ`}
          icon={Banknote}
          color="#4f46e5"
        />
        <FinanceStatCard
          label={`Đã hoàn - ${monthLabel}`}
          value={loading ? "..." : `${Number(platformFinance?.totals?.refunded || 0).toLocaleString("vi-VN")}đ`}
          icon={RotateCcw}
          color="#b91c1c"
        />
        <FinanceStatCard
          label={`Chia mentor - ${monthLabel}`}
          value={loading ? "..." : `${Number(platformFinance?.totals?.mentorNet || 0).toLocaleString("vi-VN")}đ`}
          icon={Users}
          color="#0f766e"
        />
        <FinanceStatCard
          label={`Lợi nhuận nền tảng - ${monthLabel}`}
          value={loading ? "..." : `${Number(platformFinance?.totals?.platformRevenue || 0).toLocaleString("vi-VN")}đ`}
          icon={Activity}
          color="#b45309"
        />
      </div>
    </div>
  );
}

function FinanceStatCard({ label, value, icon: Icon, color }) {
  return (
    <div className="glass-card min-w-0 p-6 group">
      <div className="mb-3 flex items-center gap-2.5">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50"
          style={{ color }}
        >
          <Icon size={18} strokeWidth={2.5} />
        </div>
        <p className="min-w-0 truncate text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p>
      </div>
      <h3
        className="origin-left truncate text-2xl font-black tracking-tight text-slate-900 transition-transform group-hover:scale-105 sm:text-3xl"
        title={value}
      >
        {value}
      </h3>
    </div>
  );
}
