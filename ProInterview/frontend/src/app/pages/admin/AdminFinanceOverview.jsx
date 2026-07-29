import { useEffect, useState } from "react";
import { Banknote, TrendingDown, TrendingUp, Wallet, RefreshCw } from "lucide-react";
import { motion } from "motion/react";
import { adminApi } from "../../utils/adminApi";
import { toastApiError } from "../../utils/apiToast";
import { AppSelect } from "../../components/ui/AppSelect";

function vnd(n) {
  return `${Number(n || 0).toLocaleString("vi-VN")} đ`;
}

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

function HeadlineCard({ label, value, sub, icon: Icon, tone }) {
  return (
    <div className={`glass-card border-2 p-6 ${tone.border} ${tone.bg}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`text-[10px] font-black uppercase tracking-widest ${tone.label}`}>{label}</p>
          <p className={`mt-2 text-3xl font-black tracking-tight ${tone.value}`}>{value}</p>
          {sub ? <p className={`mt-2 text-xs font-medium leading-relaxed ${tone.sub}`}>{sub}</p> : null}
        </div>
        <div className={`flex size-11 shrink-0 items-center justify-center rounded-2xl border ${tone.border} ${tone.bg}`}>
          <Icon className={`h-5 w-5 ${tone.label}`} />
        </div>
      </div>
    </div>
  );
}

function BreakdownRow({ label, gross, refunded, mentorNet, profit, count }) {
  return (
    <tr className="border-b border-slate-100 last:border-0">
      <td className="px-4 py-4 sm:px-5">
        <p className="font-black text-slate-900">{label}</p>
        <p className="text-[10px] font-medium uppercase tracking-widest text-slate-400">{count} giao dịch</p>
      </td>
      <td className="px-4 py-4 text-right font-bold text-slate-800 sm:px-5">{vnd(gross)}</td>
      <td className="px-4 py-4 text-right font-bold text-rose-700 sm:px-5">
        {refunded > 0 ? `- ${vnd(refunded)}` : vnd(0)}
      </td>
      <td className="px-4 py-4 text-right font-bold text-slate-700 sm:px-5">
        {mentorNet != null ? vnd(mentorNet) : "—"}
      </td>
      <td className="px-4 py-4 text-right font-black text-emerald-700 sm:px-5">{vnd(profit)}</td>
    </tr>
  );
}

export function AdminFinanceOverview() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));

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

  const load = async () => {
    setLoading(true);
    const res = await adminApi.getFinanceOverview({ month: selectedMonth });
    if (res.success) setData(res.financeOverview || null);
    else {
      toastApiError(res.error, "Không tải được tổng quan thu chi.");
      setData(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth]);

  const totals = data?.totals || { grossIn: 0, refunded: 0, mentorPayout: 0, platformProfit: 0, mentorNet: 0 };
  const b = data?.breakdown?.booking || { grossIn: 0, refunded: 0, platformFee: 0, mentorNet: 0, count: 0 };
  const c = data?.breakdown?.course || { grossIn: 0, refunded: 0, platformFee: 0, mentorNet: 0, count: 0 };
  const s = data?.breakdown?.subscription || { grossIn: 0, refunded: 0, platformRevenue: 0, count: 0 };
  const mentorPayout = data?.mentorPayout || { amount: 0, count: 0 };
  const lifetime = data?.lifetime || { mentorNet: 0, mentorPaid: 0, mentorStillHolding: 0, mentorNotYetCredited: 0 };

  const totalChi = totals.refunded + totals.mentorPayout;
  const netIn = totals.grossIn - totals.refunded;

  return (
    <div className="min-w-0 max-w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 sm:space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex min-w-0 flex-col justify-between gap-4 lg:flex-row lg:items-start lg:gap-6"
      >
        <div className="min-w-0 flex-1">
          <h2 className="font-headline text-3xl font-black uppercase tracking-tighter text-slate-900">
            <span className="text-violet-700">Thu</span> – Chi – Lợi Nhuận
          </h2>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Gộp toàn bộ nguồn thu (lịch hẹn, khóa học, gói cước) và các khoản chi thật sự rời khỏi hệ thống.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex shrink-0 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Làm mới
        </button>
      </motion.div>

      <div className="glass-card flex flex-wrap items-center justify-between gap-3 p-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Kỳ xem: {monthLabel}</p>
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

      <div className="grid gap-4 sm:grid-cols-3">
        <HeadlineCard
          label="Tiền thu (gộp)"
          value={loading ? "…" : vnd(totals.grossIn)}
          sub="Tổng tiền khách đã chuyển vào — lịch hẹn + khóa học + gói cước, kể cả giao dịch sau đó bị hoàn."
          icon={TrendingUp}
          tone={{
            border: "border-emerald-200",
            bg: "bg-emerald-50/60",
            label: "text-emerald-800",
            value: "text-emerald-950",
            sub: "text-emerald-800/80",
          }}
        />
        <HeadlineCard
          label="Tiền chi (đã ra khỏi hệ thống)"
          value={loading ? "…" : vnd(totalChi)}
          sub={`Hoàn khách ${vnd(totals.refunded)} + trả cố vấn ${vnd(totals.mentorPayout)}.`}
          icon={TrendingDown}
          tone={{
            border: "border-rose-200",
            bg: "bg-rose-50/60",
            label: "text-rose-800",
            value: "text-rose-950",
            sub: "text-rose-800/80",
          }}
        />
        <HeadlineCard
          label="Lợi nhuận nền tảng"
          value={loading ? "…" : vnd(totals.platformProfit)}
          sub="Phí giữ lại từ lịch hẹn/khóa học + 100% doanh thu gói cước — đã trừ phần chia mentor và hoàn tiền."
          icon={Wallet}
          tone={{
            border: "border-violet-200",
            bg: "bg-violet-50/60",
            label: "text-violet-800",
            value: "text-violet-950",
            sub: "text-violet-800/80",
          }}
        />
      </div>

      <div className="glass-card border-slate-200/90 p-5">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
          Kỳ này: thu − hoàn = lợi nhuận + chia mentor
        </p>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">
          <span className="font-bold text-emerald-700">{vnd(totals.grossIn)}</span> (thu) −{" "}
          <span className="font-bold text-rose-700">{vnd(totals.refunded)}</span> (hoàn) ={" "}
          <span className="font-bold text-slate-900">{vnd(netIn)}</span> (còn lại) ={" "}
          <span className="font-bold text-violet-700">{vnd(totals.platformProfit)}</span> (lợi nhuận nền tảng) +{" "}
          <span className="font-bold text-slate-900">{vnd(totals.mentorNet)}</span> (chia mentor, dồn tích theo kỳ)
        </p>

        <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
          Toàn thời gian: phần chia mentor đi về đâu
        </p>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">
          <span className="font-bold text-slate-900">{vnd(lifetime.mentorNet)}</span> (tổng đã dồn tích cho mentor,
          mọi thời điểm) = <span className="font-semibold">{vnd(lifetime.mentorPaid)}</span> (đã chi/rút) +{" "}
          <span className="font-semibold">{vnd(lifetime.mentorStillHolding)}</span> (đang giữ hộ trong ví, chưa rút) +{" "}
          <span className="font-semibold">{vnd(lifetime.mentorNotYetCredited)}</span> (chưa ghi có ví — buổi/khóa
          chưa hoàn thành hoặc đang trong thời gian giữ tiền)
        </p>
      </div>

      <div className="glass-card min-w-0 max-w-full overflow-hidden border-slate-200/90">
        <div className="border-b border-slate-200 bg-slate-50/90 px-4 py-4 sm:px-5">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Chi tiết theo nguồn thu</h3>
        </div>
        <div className="max-w-full overflow-x-auto overscroll-x-contain">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/60">
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 sm:px-5">
                  Nguồn
                </th>
                <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-500 sm:px-5">
                  Thu gộp
                </th>
                <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-500 sm:px-5">
                  Đã hoàn
                </th>
                <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-500 sm:px-5">
                  Chia mentor
                </th>
                <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-500 sm:px-5">
                  Lợi nhuận nền tảng
                </th>
              </tr>
            </thead>
            <tbody>
              <BreakdownRow label="Lịch hẹn" gross={b.grossIn} refunded={b.refunded} mentorNet={b.mentorNet} profit={b.platformFee} count={b.count} />
              <BreakdownRow label="Khóa học" gross={c.grossIn} refunded={c.refunded} mentorNet={c.mentorNet} profit={c.platformFee} count={c.count} />
              <BreakdownRow
                label="Gói Sinh viên/Chuyên nghiệp"
                gross={s.grossIn}
                refunded={s.refunded}
                mentorNet={null}
                profit={s.platformRevenue}
                count={s.count}
              />
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-300 bg-slate-50/80 font-black">
                <td className="px-4 py-4 text-slate-900 sm:px-5">Tổng</td>
                <td className="px-4 py-4 text-right text-slate-900 sm:px-5">{vnd(totals.grossIn)}</td>
                <td className="px-4 py-4 text-right text-rose-700 sm:px-5">
                  {totals.refunded > 0 ? `- ${vnd(totals.refunded)}` : vnd(0)}
                </td>
                <td className="px-4 py-4 text-right text-slate-900 sm:px-5">{vnd(totals.mentorNet)}</td>
                <td className="px-4 py-4 text-right text-emerald-700 sm:px-5">{vnd(totals.platformProfit)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="glass-card border-slate-200/90 p-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
              <Banknote className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                Đã chi cho cố vấn (kỳ này)
              </p>
              <p className="mt-1 text-xl font-black text-slate-900">{vnd(mentorPayout.amount)}</p>
              <p className="text-xs text-slate-500">{mentorPayout.count} lượt rút đã chuyển khoản xong</p>
            </div>
          </div>
        </div>
        <div className="glass-card border-slate-200/90 p-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                Cố vấn đang giữ hộ (chưa rút)
              </p>
              <p className="mt-1 text-xl font-black text-slate-900">{vnd(lifetime.mentorStillHolding)}</p>
              <p className="text-xs text-slate-500">Số dư ví hiện tại, toàn thời gian — không tính theo kỳ đã chọn</p>
            </div>
          </div>
        </div>
        <div className="glass-card border-slate-200/90 p-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <TrendingDown className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Chưa ghi có ví mentor</p>
              <p className="mt-1 text-xl font-black text-slate-900">{vnd(lifetime.mentorNotYetCredited)}</p>
              <p className="text-xs text-slate-500">Buổi/khóa chưa hoàn thành hoặc đang trong thời gian giữ tiền</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
