import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { Calendar, Video, Star, FileText } from "lucide-react";
import { MentorPageShell } from "../../components/mentor/MentorPageShell";
import { listBookings } from "../../utils/bookingsApi";
import { apiBookingToLocal } from "../../utils/bookingMappers";
import { parseDateMs } from "../../utils/bookings";
import { isLoggedIn } from "../../utils/auth";
import { toastApiError } from "../../utils/apiToast";

const TABS = [
  { id: "upcoming", label: "Sắp tới" },
  { id: "past", label: "Đã qua" },
  { id: "cancelled", label: "Đã hủy" },
];

function getTimeUntilSessionLabel(dateStr, timeStr) {
  const [d, m, y] = String(dateStr || "").split("/").map(Number);
  const [hh, mm] = String(timeStr || "").split(":").map(Number);
  const startAt = new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0, 0);
  if (!Number.isFinite(startAt.getTime())) return "";
  const diffMs = startAt.getTime() - Date.now();
  if (diffMs <= 0) return "Đến giờ";
  const totalMin = Math.floor(diffMs / 60000);
  const h = Math.floor(totalMin / 60);
  const min = totalMin % 60;
  if (h <= 0) return `Còn ${min} phút`;
  if (min === 0) return `Còn ${h} giờ`;
  return `Còn ${h} giờ ${min} phút`;
}

function getPaymentBadge(paymentStatus, status) {
  const pst = String(paymentStatus || "").toLowerCase();
  const st = String(status || "").toLowerCase();
  if (pst === "refund_pending") {
    return { text: "Chờ hoàn CK", className: "bg-amber-50 text-amber-700 border-amber-200" };
  }
  if (pst === "refunded") {
    return { text: "Đã hoàn tiền", className: "bg-sky-50 text-sky-700 border-sky-200" };
  }
  if (st === "confirmed" || st === "in_progress" || pst === "paid") {
    return { text: "Đã thanh toán", className: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  }
  return { text: "Chờ thanh toán", className: "bg-amber-50 text-amber-700 border-amber-200" };
}

function classifyBooking(row) {
  const st = String(row.status || "").toLowerCase();
  if (st === "cancelled" || st === "rescheduled") return "cancelled";
  if (st === "done" || st === "completed" || st === "no_show") return "past";
  if (st === "confirmed" || st === "in_progress" || st === "pending") return "upcoming";
  return "past";
}

export function MyBookings() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("upcoming");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!isLoggedIn()) {
      setRows([]);
      setLoading(false);
      setError("Vui lòng đăng nhập để xem lịch hẹn.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await listBookings();
      if (!res.success) {
        const msg = res.error || "Không tải được danh sách lịch hẹn.";
        setError(msg);
        toastApiError(msg);
        setRows([]);
        return;
      }
      const mapped = (res.bookings || []).map(apiBookingToLocal).filter(Boolean);
      mapped.sort((a, b) => parseDateMs(b.date, b.time) - parseDateMs(a.date, a.time));
      setRows(mapped);
    } catch {
      const msg = "Lỗi kết nối khi tải lịch hẹn.";
      setError(msg);
      toastApiError(msg);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const list = rows.filter((r) => classifyBooking(r) === tab);
    if (tab === "upcoming") {
      return [...list].sort((a, b) => parseDateMs(a.date, a.time) - parseDateMs(b.date, b.time));
    }
    return list;
  }, [rows, tab]);

  const counts = useMemo(() => {
    const c = { upcoming: 0, past: 0, cancelled: 0 };
    for (const r of rows) {
      const k = classifyBooking(r);
      if (c[k] != null) c[k] += 1;
    }
    return c;
  }, [rows]);

  return (
    <MentorPageShell bottomPad="pb-16">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-3xl space-y-8"
      >
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Lịch hẹn của tôi</h1>
          <p className="mt-2 text-sm text-slate-500">Tất cả buổi mentor bạn đã đặt trên ProInterview</p>
        </div>

        <motion.div
          className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm"
          role="tablist"
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 min-w-[100px] rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-wider transition-all ${
                tab === t.id
                  ? "bg-[#8037f4] text-white shadow-md"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              {t.label}
              <span className="ml-1.5 opacity-70">({counts[t.id] ?? 0})</span>
            </button>
          ))}
        </motion.div>

        {loading && (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 py-16 text-center text-sm text-slate-500">
            Đang tải lịch hẹn…
          </div>
        )}

        {!loading && error && (
          <motion.div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">
            {error}
          </motion.div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/80 py-16 text-center">
            <Calendar className="mx-auto mb-4 h-10 w-10 text-slate-400" />
            <p className="text-sm font-semibold text-slate-600">Chưa có lịch hẹn trong mục này</p>
            {tab === "upcoming" && (
              <button
                type="button"
                onClick={() => navigate("/mentors")}
                className="mt-6 rounded-xl bg-[#8037f4] px-6 py-3 text-xs font-black uppercase tracking-widest text-white hover:opacity-95"
              >
                Tìm mentor
              </button>
            )}
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="space-y-4">
            {filtered.map((s) => {
              const id = s.sessionId || s.backendId;
              const badge = getPaymentBadge(s.paymentStatus, s.status);
              const paid = String(s.paymentStatus || "").toLowerCase() === "paid";
              const canMeet =
                paid && (s.status === "confirmed" || s.status === "in_progress");
              const needsReview = s.status === "done" && !s.isReviewed;

              return (
                <motion.article
                  key={id}
                  layout
                  className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-slate-100 bg-slate-50">
                      {s.mentorAvatar ? (
                        <img src={s.mentorAvatar} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-xl font-black text-slate-400">{s.mentorName?.[0] || "?"}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-[10px] font-black uppercase tracking-wider text-[#8037f4]">
                          {s.date} · {s.time} – {s.endTime}
                        </p>
                        <span
                          className={`rounded-md border px-2 py-0.5 text-[8px] font-black uppercase ${badge.className}`}
                        >
                          {badge.text}
                        </span>
                      </div>
                      {tab === "upcoming" && (
                        <p className="mb-1 text-xs font-semibold text-violet-600">
                          {getTimeUntilSessionLabel(s.date, s.time)}
                        </p>
                      )}
                      <h2 className="truncate text-lg font-black text-slate-900">{s.mentorName}</h2>
                      <p className="mt-0.5 truncate text-xs font-medium text-slate-500">{s.position}</p>
                      <p className="mt-1 text-[10px] font-bold uppercase tracking-tight text-slate-400">
                        Mã: {s.orderNum}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                    <button
                      type="button"
                      onClick={() => navigate(`/session/${id}`)}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-700 hover:bg-slate-50"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Chi tiết
                    </button>
                    {canMeet && tab === "upcoming" && (
                      <button
                        type="button"
                        onClick={() => navigate(`/meeting/${id}`)}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#8037f4] px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white hover:opacity-95 sm:flex-none"
                      >
                        <Video className="h-3.5 w-3.5" />
                        Vào phòng
                      </button>
                    )}
                    {needsReview && (
                      <button
                        type="button"
                        onClick={() => navigate(`/review/${id}`)}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#bff365] px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-900 hover:opacity-95 sm:flex-none"
                      >
                        <Star className="h-3.5 w-3.5" />
                        Đánh giá mentor
                      </button>
                    )}
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}
      </motion.div>
    </MentorPageShell>
  );
}
