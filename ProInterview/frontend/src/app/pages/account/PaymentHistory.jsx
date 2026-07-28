import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  Receipt,
  Calendar,
  GraduationCap,
  Crown,
  CheckCircle2,
  Clock,
  XCircle,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { MentorPageShell } from "../../components/mentor/MentorPageShell";
import { CustomerPageHeader } from "../../components/layout/CustomerPageHeader";
import { CUSTOMER_SHELL_GUTTER, CUSTOMER_SHELL_MAX } from "../../components/layout/customerShellLayout";
import {
  fetchPaymentHistory,
  viewPaymentInvoice,
  viewBookingInvoice,
  viewEnrollmentInvoice,
} from "../../utils/paymentsApi";
import { isLoggedIn } from "../../utils/auth";
import { toastApiError, tryApi } from "../../utils/apiToast";

const TYPE_META = {
  booking: { label: "Buổi mentor", icon: Calendar },
  course: { label: "Khóa học", icon: GraduationCap },
  subscription: { label: "Gói cước", icon: Crown },
};

const PROVIDER_LABELS = {
  momo: "MoMo",
  zalopay: "ZaloPay",
  vnpay: "VNPay",
  card: "Thẻ",
  transfer: "Chuyển khoản",
};

const TYPE_TABS = [
  { id: "all", label: "Tất cả" },
  { id: "booking", label: "Buổi mentor" },
  { id: "course", label: "Khóa học" },
  { id: "subscription", label: "Gói cước" },
];

const STATUS_TABS = [
  { id: "all", label: "Tất cả trạng thái" },
  { id: "success", label: "Đã thanh toán" },
  { id: "pending", label: "Chờ xử lý" },
  { id: "failed", label: "Thất bại" },
  { id: "refund_pending", label: "Chờ hoàn tiền" },
  { id: "refunded", label: "Đã hoàn tiền" },
  { id: "partial_refund", label: "Hoàn một phần" },
  { id: "cancelled", label: "Đã hủy" },
];

const TH = "px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-slate-500 sm:px-5";
const TD = "px-4 py-3.5 sm:px-5";

const STATUS_META = {
  pending: { label: "Chờ xử lý", icon: Clock, className: "border-amber-200 bg-amber-50 text-amber-800" },
  success: { label: "Đã thanh toán", icon: CheckCircle2, className: "border-emerald-200 bg-emerald-50 text-emerald-800" },
  failed: { label: "Thất bại", icon: XCircle, className: "border-red-200 bg-red-50 text-red-700" },
  refund_pending: { label: "Chờ hoàn tiền", icon: Clock, className: "border-sky-200 bg-sky-50 text-sky-800" },
  refunded: { label: "Đã hoàn tiền", icon: RotateCcw, className: "border-slate-200 bg-slate-100 text-slate-700" },
  partial_refund: { label: "Hoàn một phần", icon: RotateCcw, className: "border-indigo-200 bg-indigo-50 text-indigo-800" },
  cancelled: { label: "Đã hủy", icon: XCircle, className: "border-slate-200 bg-slate-100 text-slate-500" },
};

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.pending;
  const Icon = meta.icon;
  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold ${meta.className}`}
    >
      <Icon className="size-3.5" />
      {meta.label}
    </span>
  );
}

function vnd(n) {
  return `${Number(n || 0).toLocaleString("vi-VN")} đ`;
}

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function monthLabel(d) {
  if (!d) return "Không rõ ngày";
  const date = new Date(d);
  return `Tháng ${date.getMonth() + 1}, ${date.getFullYear()}`;
}

/** Gộp danh sách (đã sắp theo ngày giảm dần từ API) thành các nhóm theo tháng, giữ nguyên thứ tự. */
function groupByMonth(items) {
  const groups = [];
  const indexByKey = new Map();
  items.forEach((row) => {
    const date = row.paidAt || row.createdAt;
    const key = date ? new Date(date).toISOString().slice(0, 7) : "unknown";
    if (!indexByKey.has(key)) {
      indexByKey.set(key, groups.length);
      groups.push({ key, label: monthLabel(date), items: [], paidTotal: 0 });
    }
    const group = groups[indexByKey.get(key)];
    group.items.push(row);
    if (row.status === "success") group.paidTotal += Number(row.amount) || 0;
  });
  return groups;
}

export function PaymentHistory() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [invoiceBusyId, setInvoiceBusyId] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [monthIndex, setMonthIndex] = useState(0);

  const load = useCallback(async () => {
    if (!isLoggedIn()) {
      setRows([]);
      setLoading(false);
      setError("Vui lòng đăng nhập để xem lịch sử thanh toán.");
      return;
    }
    setLoading(true);
    setError("");
    const res = await fetchPaymentHistory(100);
    if (!res.success) {
      const msg = res.error || "Không tải được lịch sử thanh toán.";
      setError(msg);
      toastApiError(msg);
      setRows([]);
      setLoading(false);
      return;
    }
    setRows(res.payments || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const typeCounts = useMemo(() => {
    const counts = { all: rows.length, booking: 0, course: 0, subscription: 0 };
    rows.forEach((r) => {
      if (counts[r.type] != null) counts[r.type] += 1;
    });
    return counts;
  }, [rows]);

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (typeFilter !== "all" && r.type !== typeFilter) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      return true;
    });
  }, [rows, typeFilter, statusFilter]);

  const monthGroups = useMemo(() => groupByMonth(filteredRows), [filteredRows]);

  useEffect(() => {
    setMonthIndex(0);
  }, [typeFilter, statusFilter]);

  const safeMonthIndex = Math.min(monthIndex, Math.max(monthGroups.length - 1, 0));
  const currentMonth = monthGroups[safeMonthIndex] || null;
  const hasOlderMonth = safeMonthIndex < monthGroups.length - 1;
  const hasNewerMonth = safeMonthIndex > 0;

  const handleViewInvoice = async (row) => {
    setInvoiceBusyId(row.id);
    const call =
      row.type === "booking"
        ? viewBookingInvoice(row.referenceId)
        : row.type === "course"
          ? viewEnrollmentInvoice(row.referenceId)
          : viewPaymentInvoice(row.id);
    await tryApi(() => call, { fallback: "Không mở được hóa đơn." });
    setInvoiceBusyId("");
  };

  return (
    <MentorPageShell bottomPad="pb-16">
      <div className={`relative z-10 flex flex-col pb-10 pt-8 sm:pt-10 ${CUSTOMER_SHELL_GUTTER}`}>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${CUSTOMER_SHELL_MAX} space-y-8`}
        >
          <CustomerPageHeader
            title={<span className="text-[#8037f4]">Lịch sử thanh toán</span>}
            subtitle="Toàn bộ giao dịch gói cước, khóa học và buổi mentor — xem lại hóa đơn bất cứ lúc nào."
            className="mb-0 w-full"
          />

          {!loading && !error && rows.length > 0 && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex max-w-full flex-wrap gap-2 rounded-full border border-slate-200 bg-white p-1.5 shadow-sm" role="tablist">
                {TYPE_TABS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={typeFilter === t.id}
                    onClick={() => setTypeFilter(t.id)}
                    className={`rounded-full px-4 py-2.5 text-xs font-black uppercase tracking-wider transition-all ${
                      typeFilter === t.id
                        ? "bg-[#8037f4] text-white"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                    }`}
                  >
                    {t.label}
                    <span className="ml-1.5 opacity-70">({typeCounts[t.id] ?? 0})</span>
                  </button>
                ))}
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm outline-none focus:border-violet-400"
              >
                {STATUS_TABS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {loading ? (
            <p className="text-sm font-medium text-slate-500">Đang tải…</p>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">
              {error}
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/80 py-16 text-center">
              <Receipt className="mx-auto mb-4 h-10 w-10 text-slate-400" />
              <p className="text-sm font-semibold text-slate-600">Chưa có giao dịch nào</p>
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/80 py-16 text-center">
              <Receipt className="mx-auto mb-4 h-10 w-10 text-slate-400" />
              <p className="text-sm font-semibold text-slate-600">Không có giao dịch phù hợp bộ lọc</p>
            </div>
          ) : currentMonth ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-violet-200 bg-white px-4 py-3 shadow-sm">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setMonthIndex(safeMonthIndex + 1)}
                    disabled={!hasOlderMonth}
                    className="flex size-8 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-violet-100 hover:text-[#8037f4] disabled:opacity-30 disabled:hover:bg-transparent"
                    title="Tháng trước"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <h3 className="px-1 text-lg font-black text-slate-900">{currentMonth.label}</h3>
                  <button
                    type="button"
                    onClick={() => setMonthIndex(safeMonthIndex - 1)}
                    disabled={!hasNewerMonth}
                    className="flex size-8 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-violet-100 hover:text-[#8037f4] disabled:opacity-30 disabled:hover:bg-transparent"
                    title="Tháng sau"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>

                <span className="rounded-full border border-violet-200 bg-violet-50 px-5 py-2.5 text-base font-black text-violet-700">
                  {currentMonth.items.length} GD
                  {currentMonth.paidTotal > 0 && <> · {vnd(currentMonth.paidTotal)}</>}
                </span>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="max-w-full overflow-x-auto">
                  <table className="w-full min-w-[760px] table-fixed border-collapse text-left">
                    <colgroup>
                      <col className="w-[18%]" />
                      <col className="w-[28%]" />
                      <col className="w-[16%]" />
                      <col className="w-[14%]" />
                      <col className="w-[16%]" />
                      <col className="w-[8%]" />
                    </colgroup>
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/80">
                        <th className={TH}>Loại</th>
                        <th className={TH}>Mã tham chiếu</th>
                        <th className={TH}>Ngày</th>
                        <th className={`${TH} text-right`}>Số tiền</th>
                        <th className={`${TH} text-center`}>Trạng thái</th>
                        <th className={`${TH} text-right`}>Hóa đơn</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {currentMonth.items.map((row) => {
                        const meta = TYPE_META[row.type] || { label: row.type, icon: Receipt };
                        const Icon = meta.icon;
                        return (
                          <tr key={row.id} className="transition-colors hover:bg-violet-50/40">
                            <td className={TD}>
                              <div className="flex items-center gap-2.5">
                                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-violet-100">
                                  <Icon className="size-4 text-[#8037f4]" strokeWidth={2.2} />
                                </span>
                                <span className="font-bold text-slate-900">{meta.label}</span>
                              </div>
                            </td>
                            <td className={`${TD} min-w-0`}>
                              <p className="text-xs font-semibold text-slate-600">
                                {PROVIDER_LABELS[row.provider] || row.provider}
                              </p>
                              {row.providerRef && (
                                <p className="mt-0.5 truncate font-mono text-[11px] text-slate-400" title={row.providerRef}>
                                  {row.providerRef}
                                </p>
                              )}
                            </td>
                            <td className={`${TD} whitespace-nowrap text-xs text-slate-500`}>
                              {formatDate(row.paidAt || row.createdAt)}
                            </td>
                            <td className={`${TD} whitespace-nowrap text-right font-black text-slate-900`}>
                              {vnd(row.amount)}
                            </td>
                            <td className={`${TD} text-center`}>
                              <StatusBadge status={row.status} />
                            </td>
                            <td className={`${TD} text-right`}>
                              {row.status === "success" && (
                                <button
                                  type="button"
                                  onClick={() => handleViewInvoice(row)}
                                  disabled={invoiceBusyId === row.id}
                                  title="Xem hóa đơn"
                                  className="ml-auto flex size-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-800 disabled:opacity-50"
                                >
                                  <Receipt className="h-4 w-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}
        </motion.div>
      </div>
    </MentorPageShell>
  );
}
