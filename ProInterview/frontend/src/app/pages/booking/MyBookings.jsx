import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { Calendar, Video, Star, FileText, Receipt, CalendarClock, CalendarCheck, CheckCircle2, CalendarX, Landmark } from "lucide-react";
import { MentorPageShell } from "../../components/mentor/MentorPageShell";
import { CustomerPageHeader } from "../../components/layout/CustomerPageHeader";
import { CUSTOMER_SHELL_GUTTER, CUSTOMER_SHELL_MAX } from "../../components/layout/customerShellLayout";
import { CustomerStatGrid, CustomerStatCard } from "../../components/shared/CustomerStatCards";
import { listBookings, viewBookingInvoice } from "../../utils/bookingsApi";
import { apiBookingToLocal } from "../../utils/bookingMappers";
import { parseDateMs } from "../../utils/bookings";
import { isLoggedIn } from "../../utils/auth";
import { toastApiError, tryApi } from "../../utils/apiToast";

const TABS = [
  { id: "upcoming", label: "Sắp tới" },
  { id: "past", label: "Đã qua" },
  { id: "cancelled", label: "Đã hủy" },
];

/** Số ms đã trôi qua kể từ giờ hẹn (âm nếu chưa tới giờ). */
function elapsedMs(dateStr, timeStr) {
  const raw = String(dateStr || "").trim();
  const [hh, mm] = String(timeStr || "").split(":").map(Number);
  // Vài booking cũ (seed:ui-mock) lưu date dạng ISO "YYYY-MM-DD" thay vì "DD/MM/YYYY".
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const [d, m, y] = isoMatch
    ? [Number(isoMatch[3]), Number(isoMatch[2]), Number(isoMatch[1])]
    : raw.split("/").map(Number);
  const startAt = new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0, 0);
  if (!Number.isFinite(startAt.getTime())) return 0;
  return Date.now() - startAt.getTime();
}

function getTimeUntilSessionLabel(dateStr, timeStr) {
  const elapsed = elapsedMs(dateStr, timeStr);
  if (elapsed < 0) {
    const diffMs = -elapsed;
    const totalMin = Math.floor(diffMs / 60000);
    const h = Math.floor(totalMin / 60);
    const min = totalMin % 60;
    if (h <= 0) return `Còn ${min} phút`;
    if (min === 0) return `Còn ${h} giờ`;
    return `Còn ${h} giờ ${min} phút`;
  }
  if (elapsed <= 30 * 60000) return "Đang diễn ra";
  return "Đã qua giờ";
}

function getPaymentBadge(paymentStatus, status, dateStr, timeStr, refundAccountNumber) {
  const pst = String(paymentStatus || "").toLowerCase();
  const st = String(status || "").toLowerCase();
  if (pst === "refund_pending") {
    // "Chờ hoàn CK" ngụ ý hệ thống đang xử lý — chỉ đúng khi HV đã điền STK nhận hoàn.
    // Nếu chưa điền, quả bóng đang ở phía học viên, không phải đang "chờ" ai cả.
    // Style dùng inline hex thay vì class Tailwind "amber"/"violet" vì theme.css của app
    // này đã remap gần hết các màu đó về chung 1 tông tím thương hiệu — 2 trạng thái sẽ
    // nhìn giống hệt nhau nếu dùng class thường, mất tác dụng phân biệt "cần làm gì tiếp".
    const hasStk = String(refundAccountNumber || "").replace(/\D/g, "").length >= 6;
    return hasStk
      ? {
          text: "Chờ hoàn CK",
          className: "border",
          style: { backgroundColor: "rgba(128,55,244,0.08)", color: "#8037f4", borderColor: "rgba(128,55,244,0.28)" },
        }
      : {
          text: "Cần điền STK",
          className: "border",
          style: { backgroundColor: "#FFFBEB", color: "#B45309", borderColor: "#FDE68A" },
        };
  }
  if (pst === "refunded") {
    return { text: "Đã hoàn tiền", className: "bg-sky-50 text-sky-700 border-sky-200" };
  }
  if (st === "confirmed" || st === "in_progress" || pst === "paid") {
    return { text: "Đã thanh toán", className: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  }
  if (st === "cancelled" || st === "rescheduled") {
    if (pst === "failed") {
      return { text: "Hết hạn thanh toán", className: "bg-slate-100 text-slate-500 border-slate-200" };
    }
    return { text: "Đã hủy", className: "bg-slate-100 text-slate-500 border-slate-200" };
  }
  if (st === "pending" && elapsedMs(dateStr, timeStr) > 0) {
    return { text: "Hết hạn TT", className: "bg-slate-100 text-slate-400 border-slate-200" };
  }
  return { text: "Chờ thanh toán", className: "bg-amber-50 text-amber-700 border-amber-200" };
}

/** Sắp tới chỉ khi trạng thái còn hoạt động VÀ chưa quá lâu so với giờ hẹn — tránh
 * booking đã trôi qua nhiều ngày nhưng chưa được đánh dấu completed vẫn kẹt ở "Sắp tới".
 * `pending` (chưa thanh toán) không hiện ở tab nào — chỉ tính là buổi hẹn thật sau khi
 * thanh toán xong (chuyển "confirmed"); nếu hết hạn CK, backend tự hủy nên sẽ rơi vào "Đã hủy". */
function classifyBooking(row) {
  const st = String(row.status || "").toLowerCase();
  if (st === "pending") return "hidden";
  if (st === "cancelled" || st === "rescheduled") return "cancelled";
  if (st === "done" || st === "completed" || st === "no_show") return "past";
  if (st === "confirmed" || st === "in_progress") {
    return elapsedMs(row.date, row.time) > 2 * 3600000 ? "past" : "upcoming";
  }
  return "past";
}

export function MyBookings() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("upcoming");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [invoiceBusyId, setInvoiceBusyId] = useState("");

  const handleViewInvoice = useCallback(async (bookingId) => {
    setInvoiceBusyId(bookingId);
    await tryApi(() => viewBookingInvoice(bookingId), { fallback: "Không mở được hóa đơn." });
    setInvoiceBusyId("");
  }, []);

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
      <div className={`relative z-10 flex flex-col pb-10 pt-8 sm:pt-10 ${CUSTOMER_SHELL_GUTTER}`}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className={`${CUSTOMER_SHELL_MAX} space-y-8`}
      >
        <CustomerPageHeader
          title={<span className="text-[#8037f4]">Buổi Mentor 1:1 của bạn</span>}
          subtitle="Theo dõi lịch hẹn, trạng thái thanh toán và phiên học sắp tới."
          className="mb-0 w-full"
        />

        <CustomerStatGrid>
          <CustomerStatCard
            icon={CalendarClock}
            value={counts.upcoming + counts.past + counts.cancelled}
            label="Tổng lịch hẹn"
          />
          <CustomerStatCard icon={CalendarCheck} value={counts.upcoming} label="Sắp tới" />
          <CustomerStatCard icon={CheckCircle2} value={counts.past} label="Đã hoàn thành" tone="lime" />
          <CustomerStatCard icon={CalendarX} value={counts.cancelled} label="Đã hủy" tone="red" />
        </CustomerStatGrid>

        <motion.div
          className="flex max-w-md flex-wrap gap-2 rounded-full border border-slate-200 bg-white p-1.5 shadow-sm"
          role="tablist"
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 min-w-[100px] rounded-full px-4 py-2.5 text-xs font-black uppercase tracking-wider transition-all ${
                tab === t.id
                  ? "text-[#8037f4]"
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
              const badge = getPaymentBadge(s.paymentStatus, s.status, s.date, s.time, s.refundReceiveAccountNumber);
              const paid = String(s.paymentStatus || "").toLowerCase() === "paid";
              const canMeet =
                paid && (s.status === "confirmed" || s.status === "in_progress");
              const needsReview = s.status === "done" && !s.isReviewed;
              const needsRefundStk =
                String(s.paymentStatus || "").toLowerCase() === "refund_pending" &&
                String(s.refundReceiveAccountNumber || "").replace(/\D/g, "").length < 6;
              const timeLabel = tab === "upcoming" ? getTimeUntilSessionLabel(s.date, s.time) : "";

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
                          style={badge.style}
                        >
                          {badge.text}
                        </span>
                      </div>
                      {timeLabel && (
                        <p
                          className={`mb-1 text-xs font-semibold ${
                            timeLabel === "Đã qua giờ" ? "text-orange-500" : "text-violet-600"
                          }`}
                        >
                          {timeLabel}
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
                    {paid && (
                      <button
                        type="button"
                        onClick={() => handleViewInvoice(id)}
                        disabled={invoiceBusyId === id}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      >
                        <Receipt className="h-3.5 w-3.5" />
                        {invoiceBusyId === id ? "Đang mở…" : "Xem hóa đơn"}
                      </button>
                    )}
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
                    {needsRefundStk && (
                      <button
                        type="button"
                        onClick={() => navigate(`/session/${id}`)}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-amber-800 hover:bg-amber-100 sm:flex-none"
                      >
                        <Landmark className="h-3.5 w-3.5" />
                        Điền STK nhận hoàn
                      </button>
                    )}
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}
      </motion.div>
      </div>
    </MentorPageShell>
  );
}
