import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { motion } from "motion/react";
import { RefreshCw } from "lucide-react";
import {
  adminGlassTable,
  adminHeaderRow,
  adminPageWrap,
  adminRefreshBtn,
  adminStatGrid3,
  adminStatGrid4,
  adminTdCell,
  adminThCell,
  adminToolbar,
} from "../../components/admin/AdminPageShell.jsx";
import { adminApi } from "../../utils/adminApi.js";
import { tryApi } from "../../utils/apiToast.js";

function vnd(n) {
  return `${Number(n || 0).toLocaleString("vi-VN")} đ`;
}

const BOOKING_STATUS_LABELS = {
  pending: "Chờ xử lý",
  confirmed: "Đã xác nhận",
  in_progress: "Đang diễn ra",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
  rescheduled: "Đổi lịch",
  no_show: "Không tham gia",
};

function StatCard({ label, value, accent = "violet" }) {
  const border =
    accent === "emerald"
      ? "border-emerald-200 bg-emerald-50/80"
      : accent === "amber"
        ? "border-amber-200 bg-amber-50/80"
        : accent === "sky"
          ? "border-sky-200 bg-sky-50/80"
          : "border-violet-200 bg-violet-50/80";
  const title =
    accent === "emerald"
      ? "text-emerald-900"
      : accent === "amber"
        ? "text-amber-900"
        : accent === "sky"
          ? "text-sky-900"
          : "text-violet-900";
  const num =
    accent === "emerald"
      ? "text-emerald-950"
      : accent === "amber"
        ? "text-amber-950"
        : accent === "sky"
          ? "text-sky-950"
          : "text-violet-950";

  return (
    <div className={`rounded-2xl border p-4 sm:p-5 ${border}`}>
      <p className={`text-[10px] font-black uppercase tracking-widest ${title}`}>{label}</p>
      <p className={`mt-1 text-2xl font-black sm:text-3xl ${num}`}>{value}</p>
    </div>
  );
}

export function AdminAnalytics() {
  const [stats, setStats] = useState(null);
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [statsRes, contentRes] = await Promise.all([
      tryApi(() => adminApi.getStats(), { fallback: "Không tải được thống kê nền tảng." }),
      tryApi(() => adminApi.getContentStats(), { fallback: "", silent: true }),
    ]);
    if (statsRes.success) setStats(statsRes.stats || null);
    if (contentRes.success) setContent(contentRes.content || null);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const plans = stats?.plans || { free: 0, starter_pro: 0, elite_pro: 0 };
  const bookingBreakdown = useMemo(() => {
    const raw = stats?.bookingsByStatus || {};
    return Object.entries(raw)
      .map(([status, count]) => ({
        status,
        label: BOOKING_STATUS_LABELS[status] || status,
        count: Number(count) || 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [stats?.bookingsByStatus]);

  const recentBookings = stats?.recentBookings || [];
  const interviewOps = content?.interviewOps || {};

  return (
    <div className={adminPageWrap}>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={adminHeaderRow}>
        <div className="min-w-0 flex-1">
          <h2 className="font-headline text-3xl font-black uppercase tracking-tighter text-slate-900">
            <span className="text-violet-700">Phân tích</span>
          </h2>
        </div>
        <div className={adminToolbar}>
          <button type="button" onClick={() => void loadAll()} disabled={loading} className={adminRefreshBtn}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Làm mới
          </button>
        </div>
      </motion.div>

      {loading && !stats ? (
        <p className="text-sm text-slate-500">Đang tải…</p>
      ) : (
        <>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={adminStatGrid4}>
            <StatCard label="Khách hàng" value={stats?.users ?? 0} accent="violet" />
            <StatCard label="Cố vấn" value={stats?.mentors ?? 0} accent="emerald" />
            <StatCard label="Lịch hẹn" value={stats?.bookings ?? 0} accent="sky" />
            <StatCard label="Ghi danh" value={stats?.enrollmentsPaid ?? 0} accent="amber" />
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={adminStatGrid3}>
            <StatCard label="Gói Pro" value={plans.starter_pro ?? 0} accent="violet" />
            <StatCard label="Gói Elite" value={plans.elite_pro ?? 0} accent="emerald" />
            <StatCard label="Free" value={plans.free ?? 0} accent="sky" />
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={adminStatGrid4}>
            <StatCard label="Khóa chờ duyệt" value={stats?.courses?.pendingReview ?? 0} accent="amber" />
            <StatCard label="Khóa đã xuất bản" value={stats?.courses?.published ?? 0} accent="violet" />
            <StatCard label="Phân tích CV" value={content?.cvAnalyses ?? 0} accent="sky" />
            <StatCard label="Báo cáo mở" value={stats?.reportsOpen ?? 0} accent="emerald" />
          </motion.div>

          {interviewOps?.periodDays ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={adminStatGrid3}>
              <StatCard label="Phiên AI" value={content?.interviewSessions ?? 0} accent="violet" />
              <StatCard label={`AI · ${interviewOps.periodDays} ngày`} value={interviewOps.sessions7d ?? 0} accent="sky" />
              <StatCard
                label="Điểm TB"
                value={interviewOps.avgScore7d != null ? interviewOps.avgScore7d : "—"}
                accent="amber"
              />
            </motion.div>
          ) : null}

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={adminGlassTable}>
            <div className="border-b border-slate-200 bg-slate-50/90 px-5 py-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Lịch hẹn theo trạng thái</p>
            </div>
            <div className="p-5">
              {bookingBreakdown.length === 0 ? (
                <p className="text-sm text-slate-500">—</p>
              ) : (
                <ul className="space-y-3">
                  {bookingBreakdown.map((row) => {
                    const max = bookingBreakdown[0]?.count || 1;
                    const pct = Math.round((row.count / max) * 100);
                    return (
                      <li key={row.status}>
                        <div className="mb-1 flex justify-between text-sm">
                          <span className="font-semibold text-slate-800">{row.label}</span>
                          <span className="font-black text-violet-800">{row.count}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-violet-600 transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={adminGlassTable}>
            <div className="border-b border-slate-200 bg-slate-50/90 px-5 py-4 sm:px-6">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Gần đây</p>
            </div>
            <div className="max-w-full overflow-x-auto overscroll-x-contain">
              <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/50">
                    <th className={adminThCell}>Học viên</th>
                    <th className={adminThCell}>Cố vấn</th>
                    <th className={adminThCell}>Ngày giờ</th>
                    <th className={adminThCell}>Trạng thái</th>
                    <th className={adminThCell}>Thanh toán</th>
                    <th className={adminThCell}>Số tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {recentBookings.length === 0 ? (
                    <tr>
                      <td colSpan={6} className={`${adminTdCell} text-center text-slate-500`}>
                        —
                      </td>
                    </tr>
                  ) : (
                    recentBookings.map((b) => (
                      <tr key={b._id} className="border-b border-slate-100 last:border-0">
                        <td className={`${adminTdCell} font-semibold text-slate-900`}>{b.studentName}</td>
                        <td className={adminTdCell}>{b.mentorName}</td>
                        <td className={adminTdCell}>
                          {b.date} {b.timeSlot}
                        </td>
                        <td className={adminTdCell}>
                          {BOOKING_STATUS_LABELS[b.status] || b.status || "—"}
                        </td>
                        <td className={adminTdCell}>{String(b.paymentStatus || "—")}</td>
                        <td className={`${adminTdCell} font-semibold`}>{vnd(b.totalAmount)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="border-t border-slate-100 px-5 py-3 text-right sm:px-6">
              <Link
                to="/admin/bookings"
                className="text-[10px] font-black uppercase tracking-widest text-violet-700 hover:text-violet-900"
              >
                Lịch hẹn →
              </Link>
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}
