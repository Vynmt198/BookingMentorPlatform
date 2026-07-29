import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { motion } from "motion/react";
import {
  Banknote,
  Calendar,
  Check,
  Copy,
  ExternalLink,
  FileText,
  Mail,
  Phone,
  User,
  Users,
} from "lucide-react";
import { adminGlassTable, adminPageWrap } from "../../components/admin/AdminPageShell.jsx";
import { AdminBookingStatusStack } from "../../components/admin/AdminStatusPill.jsx";
import { AdminSepayOverrideAction } from "../../components/admin/AdminSepayOverrideAction.jsx";
import { adminApi } from "../../utils/adminApi.js";
import { formatTransferConfirmedAt } from "../../utils/adminPaymentUi.js";
import { tryApi } from "../../utils/apiToast.js";
import { parseBookingNotes } from "../../utils/bookingMappers.js";
import { avatarSrc, resolveMediaUrl } from "../../utils/mediaUrl.js";

const SESSION_TYPE_VI = {
  mock_interview: "Phỏng vấn giả lập",
  cv_review: "Review CV",
  career_consulting: "Tư vấn nghề nghiệp",
  custom: "Buổi tùy chỉnh",
};

function vnd(amount) {
  return `${Number(amount || 0).toLocaleString("vi-VN")} đ`;
}

function formatWhen(date, timeSlot) {
  const d = String(date || "").trim();
  const t = String(timeSlot || "").trim();
  if (!d && !t) return "—";
  if (d.includes("/")) return t ? `${d} · ${t}` : d;
  const parts = d.split("-");
  if (parts.length === 3) {
    const pretty = `${parts[2].padStart(2, "0")}/${parts[1].padStart(2, "0")}/${parts[0]}`;
    return t ? `${pretty} · ${t}` : pretty;
  }
  return t ? `${d} · ${t}` : d;
}

function pickNoteLine(notes, label) {
  const re = new RegExp(`^${label}\\s*:\\s*(.+)`, "im");
  const m = String(notes || "").match(re);
  return m ? m[1].trim() : "";
}

function CopyAccountNumberButton({ value }) {
  const [copied, setCopied] = useState(false);
  if (!value) return null;
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(String(value)).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      title="Sao chép số tài khoản"
      className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-sky-200 bg-white px-2 py-1 text-[10px] font-bold uppercase text-sky-700 transition hover:bg-sky-50"
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? "Đã chép" : "Chép"}
    </button>
  );
}

function RefundAmountBreakdown({ booking, tone = "sky", label = "Cần hoàn" }) {
  const total = Number(booking.totalAmount ?? booking.price ?? 0);
  const refundAmt = Number(booking.cancelRefundAmountVnd ?? 0);
  const retainedAmt = Number(booking.cancelRetainedAmountVnd ?? 0);
  const pct = Number(booking.cancelRefundPercent);
  const labelClass = tone === "emerald" ? "text-emerald-800" : "text-sky-800";
  return (
    <div className="flex flex-wrap items-center gap-5">
      <div>
        <p className={`text-[10px] font-bold uppercase tracking-wider ${labelClass}`}>Tổng đã thu</p>
        <p className="text-sm font-black text-slate-900">{vnd(total)}</p>
      </div>
      {retainedAmt > 0 ? (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Giữ lại (không hoàn)</p>
          <p className="text-sm font-black text-rose-700">{vnd(retainedAmt)}</p>
        </div>
      ) : null}
      <div>
        <p className={`text-[10px] font-black uppercase tracking-wider ${labelClass}`}>
          {label}
          {Number.isFinite(pct) ? ` (${pct}%)` : ""}
        </p>
        <p className="text-base font-black text-slate-900">{vnd(refundAmt)}</p>
      </div>
    </div>
  );
}

function RefundStkGrid({ booking, tone = "sky" }) {
  const labelClass = tone === "emerald" ? "text-emerald-700" : "text-sky-700";
  return (
    <div className={`mt-3 grid gap-3 border-t pt-3 sm:grid-cols-3 ${tone === "emerald" ? "border-emerald-200/70" : "border-sky-200/70"}`}>
      <div className="min-w-0">
        <p className={`text-[10px] font-bold uppercase tracking-wider ${labelClass}`}>Ngân hàng</p>
        <p className="mt-0.5 truncate text-base font-black text-slate-900">{booking.refundReceiveBankName || "—"}</p>
      </div>
      <div className="min-w-0">
        <p className={`text-[10px] font-bold uppercase tracking-wider ${labelClass}`}>Số tài khoản</p>
        <div className="mt-0.5 flex items-center gap-2">
          <p className="truncate font-mono text-lg font-black tracking-wide text-slate-900">
            {booking.refundReceiveAccountNumber}
          </p>
          <CopyAccountNumberButton value={booking.refundReceiveAccountNumber} />
        </div>
      </div>
      <div className="min-w-0">
        <p className={`text-[10px] font-bold uppercase tracking-wider ${labelClass}`}>Chủ tài khoản</p>
        <p className="mt-0.5 truncate text-base font-black text-slate-900">
          {booking.refundReceiveAccountHolder || "—"}
        </p>
      </div>
    </div>
  );
}

function AttachmentLink({ label, fileName }) {
  const href = resolveMediaUrl(fileName);
  const display = fileName?.split(/[/\\]/).pop() || fileName || label;
  if (!fileName) return null;
  return (
    <a
      href={href || "#"}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm font-semibold text-violet-800 hover:bg-violet-50"
    >
      <FileText className="h-4 w-4 shrink-0" />
      <span className="max-w-[12rem] truncate">{display}</span>
      <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-70" />
    </a>
  );
}

export function AdminBookingDetail() {
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    const res = await tryApi(() => adminApi.getBookingById(id), {
      fallback: "Không tải được lịch hẹn.",
      silent: true,
    });
    if (!res.success) {
      setBooking(null);
      setError(res.error || "Không tải được lịch hẹn.");
    } else if (!res.booking) {
      setBooking(null);
      setError("Không tìm thấy lịch hẹn.");
    } else {
      setBooking(res.booking);
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, [id]);

  const parsed = useMemo(() => parseBookingNotes(booking?.notes), [booking?.notes]);
  const freeNote = useMemo(() => pickNoteLine(booking?.notes, "Ghi chú"), [booking?.notes]);
  const confirmed = booking ? formatTransferConfirmedAt(booking) : null;

  const sessionLabel =
    SESSION_TYPE_VI[String(booking?.sessionType || "").toLowerCase()] ||
    booking?.sessionType ||
    "Buổi mentor";
  const title = parsed.position || sessionLabel;
  const showSessionType = Boolean(parsed.position);
  const paymentRef =
    booking?.paymentRef || (booking?._id ? `PI${String(booking._id).slice(-6)}` : "—");
  const student = booking?.userId;
  const mentor = booking?.mentorId;
  const mentorId = mentor?._id || mentor?.id;
  const studentId = student?._id || student?.id;
  const showSepayPending =
    booking?.paymentMethod === "transfer" &&
    String(booking?.paymentStatus || "").toLowerCase() === "pending";
  const refundPending = String(booking?.paymentStatus || "").toLowerCase() === "refund_pending";
  const refundCompleted = Boolean(booking?.refundCompletedAt);

  const confirmCkOverride = async (confirmBody) => {
    if (!booking) return;
    setBusy(true);
    const res = await tryApi(
      () =>
        adminApi.confirmBookingTransferPayment(booking._id || booking.id, confirmBody || { force: true }),
      {
        fallback: "Không xác nhận được chuyển khoản.",
        successMessage: "Đã xác nhận thanh toán.",
      },
    );
    setBusy(false);
    if (res.success) await load();
  };

  const hasRefundStk = Boolean(booking?.refundReceiveAccountNumber);

  const confirmRefund = async () => {
    if (!booking || !hasRefundStk) return;
    const amt = vnd(booking.cancelRefundAmountVnd);
    if (
      !window.confirm(
        `Xác nhận đã chuyển khoản hoàn ${amt} cho học viên?\n\nSTK nhận hoàn: ${booking.refundReceiveBankName || "—"} · ${booking.refundReceiveAccountNumber} · ${booking.refundReceiveAccountHolder || "—"}\n\nChỉ bấm sau khi đã chuyển tiền thật vào đúng số tài khoản trên.`,
      )
    ) {
      return;
    }
    setBusy(true);
    const res = await tryApi(() => adminApi.confirmBookingRefund(booking._id || booking.id), {
      fallback: "Không xác nhận được hoàn tiền.",
      successMessage: "Đã đánh dấu hoàn tiền xong.",
    });
    setBusy(false);
    if (res.success) await load();
  };

  return (
    <div className={adminPageWrap}>
      {loading && <p className="text-sm text-slate-500">Đang tải…</p>}

      {error && !loading && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">{error}</div>
      )}

      {booking && !loading && (
        <>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${adminGlassTable} p-5 sm:p-6`}
          >
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                {showSessionType ? (
                  <p className="text-[10px] font-black uppercase tracking-widest text-violet-700">{sessionLabel}</p>
                ) : null}
                <h3 className="mt-0.5 font-headline text-2xl font-black text-slate-900">{title}</h3>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                  <Calendar className="h-4 w-4 shrink-0 text-violet-600" />
                  {formatWhen(booking.date, booking.timeSlot)}
                  {booking.durationMinutes ? (
                    <span className="text-slate-400">· {booking.durationMinutes}p</span>
                  ) : null}
                </p>
                {booking.cancelReason ? (
                  <p className="mt-2 rounded-lg border border-red-100 bg-red-50/80 px-3 py-2 text-sm text-red-800">
                    {booking.cancelReason}
                  </p>
                ) : null}
              </div>
              <AdminBookingStatusStack
                bookingStatus={booking.status}
                paymentStatus={booking.paymentStatus}
                paymentMethod={booking.paymentMethod || "transfer"}
                mentorCancelResolution={booking.mentorCancelResolution}
              />
            </div>

            <div className="mt-5 flex flex-wrap items-end justify-between gap-4 border-t border-slate-100 pt-5">
              <div className="flex flex-wrap gap-6">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Tổng</p>
                  <p className="text-xl font-black text-slate-900">{vnd(booking.totalAmount || booking.price)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Mã PI</p>
                  <p className="font-mono text-lg font-black text-violet-800">{paymentRef}</p>
                </div>
              </div>
              {showSepayPending ? (
                <AdminSepayOverrideAction onConfirm={confirmCkOverride} busy={busy} iconOnly={false} />
              ) : null}
            </div>

            {confirmed ? (
              <p
                className={`mt-4 rounded-lg px-3 py-2 text-sm font-semibold ${
                  confirmed.tone === "override"
                    ? "border border-rose-200 bg-rose-50 text-rose-900"
                    : "border border-emerald-200 bg-emerald-50 text-emerald-900"
                }`}
              >
                {confirmed.text}
              </p>
            ) : null}

            {refundPending ? (
              <div className="mt-3 rounded-2xl border border-sky-200 bg-sky-50/80 p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <RefundAmountBreakdown booking={booking} tone="sky" label="Cần hoàn" />
                  <button
                    type="button"
                    disabled={!hasRefundStk || busy}
                    onClick={() => void confirmRefund()}
                    title={hasRefundStk ? "Xác nhận đã chuyển khoản" : "Chờ học viên điền STK trước"}
                    className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-sky-300 bg-white px-4 py-2 text-xs font-black uppercase tracking-wider text-sky-800 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Banknote className="h-4 w-4" />
                    {busy ? "Đang xử lý…" : "Xác nhận đã chuyển"}
                  </button>
                </div>

                {hasRefundStk ? (
                  <RefundStkGrid booking={booking} tone="sky" />
                ) : (
                  <p className="mt-3 border-t border-sky-200/70 pt-3 text-sm font-semibold text-amber-700">
                    Học viên chưa điền STK nhận hoàn
                  </p>
                )}
              </div>
            ) : refundCompleted ? (
              <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
                <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-800">
                  <Check className="h-3.5 w-3.5" /> Hoàn tất lúc{" "}
                  {new Date(booking.refundCompletedAt).toLocaleString("vi-VN")}
                </p>
                <div className="mt-2">
                  <RefundAmountBreakdown booking={booking} tone="emerald" label="Đã hoàn" />
                </div>
                {hasRefundStk ? <RefundStkGrid booking={booking} tone="emerald" /> : null}
              </div>
            ) : null}
          </motion.div>

          <div className="grid gap-4 lg:grid-cols-2">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`${adminGlassTable} p-5`}>
              <h4 className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
                <User className="h-4 w-4" />
                Học viên
              </h4>
              <div className="flex gap-4">
                <img
                  src={avatarSrc(student?.avatar)}
                  alt=""
                  className="h-14 w-14 shrink-0 rounded-xl border border-slate-200 object-cover"
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="font-bold text-slate-900">{student?.name || "—"}</p>
                  <p className="flex items-center gap-1.5 text-sm text-slate-600">
                    <Mail className="h-4 w-4 shrink-0" />
                    {student?.email || "—"}
                  </p>
                  {student?.phone ? (
                    <p className="flex items-center gap-1.5 text-sm text-slate-600">
                      <Phone className="h-4 w-4 shrink-0" />
                      {student.phone}
                    </p>
                  ) : null}
                  {studentId ? (
                    <Link to={`/admin/users/${studentId}`} className="text-sm font-bold text-violet-700 hover:underline">
                      Xem
                    </Link>
                  ) : null}
                </div>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`${adminGlassTable} p-5`}>
              <h4 className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
                <Users className="h-4 w-4" />
                Cố vấn
              </h4>
              <div className="space-y-1">
                <p className="text-lg font-bold text-slate-900">{mentor?.name || mentor?.userId?.name || "—"}</p>
                {mentor?.userId?.email ? (
                  <p className="flex items-center gap-1.5 text-sm text-slate-600">
                    <Mail className="h-4 w-4 shrink-0" />
                    {mentor.userId.email}
                  </p>
                ) : null}
                {mentorId ? (
                  <Link to={`/admin/mentors/${mentorId}`} className="text-sm font-bold text-violet-700 hover:underline">
                    Xem
                  </Link>
                ) : null}
              </div>
            </motion.div>
          </div>

          {(freeNote || parsed.cvFile || parsed.jdFile || booking.mentorNotes || booking.mentorSummary?.submittedAt) && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`${adminGlassTable} p-5`}>
              <div className="space-y-3">
                {freeNote ? (
                  <p className="whitespace-pre-wrap text-sm text-slate-700">{freeNote}</p>
                ) : null}
                {(parsed.cvFile || parsed.jdFile) && (
                  <div className="flex flex-wrap gap-2">
                    <AttachmentLink label="CV" fileName={parsed.cvFile} />
                    <AttachmentLink label="JD" fileName={parsed.jdFile} />
                  </div>
                )}
                {booking.mentorSummary?.submittedAt ? (
                  <div className="space-y-2 border-t border-slate-100 pt-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Tổng kết từ mentor</p>
                      {booking.mentorSummary.submittedLate ? (
                        <span className="rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-700">
                          Gửi trễ
                        </span>
                      ) : null}
                    </div>
                    {[
                      { label: "Điểm mạnh", value: booking.mentorSummary.strengths },
                      { label: "Cần cải thiện", value: booking.mentorSummary.improvements },
                      { label: "Lời khuyên", value: booking.mentorSummary.recommendation },
                      { label: "Nhận xét chi tiết", value: booking.mentorSummary.generalNotes },
                    ]
                      .filter((s) => s.value)
                      .map((s) => (
                        <p key={s.label} className="text-sm text-slate-600">
                          <span className="font-semibold text-slate-800">{s.label}:</span> {s.value}
                        </p>
                      ))}
                  </div>
                ) : booking.mentorNotes ? (
                  <p className="whitespace-pre-wrap border-t border-slate-100 pt-3 text-sm text-slate-600">
                    {booking.mentorNotes}
                  </p>
                ) : null}
              </div>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
