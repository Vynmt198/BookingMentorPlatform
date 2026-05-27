import { AlertCircle, CheckCircle, Clock, XCircle } from "lucide-react";
import { labelPaymentStatus } from "../../utils/adminPaymentUi.js";

const PILL =
  "inline-flex w-fit max-w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold leading-none";

function StatusRow({ caption, children }) {
  return (
    <div className="flex w-full flex-col items-center gap-1">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{caption}</p>
      {children}
    </div>
  );
}

/** Một badge trạng thái — dùng xếp dọc, không gom chung một khối. */
export function StatusPill({ icon: Icon, label, toneClass }) {
  return (
    <span className={`${PILL} ${toneClass}`}>
      {Icon ? <Icon size={12} className="shrink-0 opacity-90" aria-hidden /> : null}
      {label}
    </span>
  );
}

const BOOKING_TONES = {
  pending: { Icon: Clock, label: "Chờ duyệt buổi", tone: "border-orange-200 bg-orange-50 text-orange-800" },
  confirmed: { Icon: CheckCircle, label: "Đã duyệt buổi", tone: "border-cyan-200 bg-cyan-50 text-cyan-800" },
  paid: { Icon: CheckCircle, label: "Đã duyệt buổi", tone: "border-cyan-200 bg-cyan-50 text-cyan-800" },
  cancelled: { Icon: XCircle, label: "Đã hủy", tone: "border-red-200 bg-red-50 text-red-700" },
  in_progress: { Icon: AlertCircle, label: "Đang diễn ra", tone: "border-sky-200 bg-sky-50 text-sky-800" },
  completed: { Icon: CheckCircle, label: "Hoàn thành", tone: "border-emerald-200 bg-emerald-50 text-emerald-800" },
  no_show: { Icon: XCircle, label: "Không tham gia", tone: "border-rose-200 bg-rose-50 text-rose-800" },
};

const PAYMENT_TONES = {
  pending: { Icon: Clock, label: "Chờ đối soát", tone: "border-violet-200 bg-violet-50 text-violet-800" },
  paid: { Icon: CheckCircle, label: "Đã thanh toán", tone: "border-emerald-200 bg-emerald-50 text-emerald-800" },
  refund_pending: { Icon: Clock, label: "Chờ hoàn tiền", tone: "border-sky-200 bg-sky-50 text-sky-800" },
  refunded: { Icon: CheckCircle, label: "Đã hoàn tiền", tone: "border-slate-200 bg-slate-100 text-slate-700" },
  partial_refund: { Icon: AlertCircle, label: "Hoàn một phần", tone: "border-indigo-200 bg-indigo-50 text-indigo-800" },
};

export function BookingStatusPill({ status }) {
  const key = String(status || "").toLowerCase();
  const cfg = BOOKING_TONES[key] || {
    Icon: AlertCircle,
    label: status || "—",
    tone: "border-slate-200 bg-slate-100 text-slate-600",
  };
  return <StatusPill icon={cfg.Icon} label={cfg.label} toneClass={cfg.tone} />;
}

export function PaymentStatusPill({ status }) {
  const key = String(status || "").toLowerCase();
  const cfg = PAYMENT_TONES[key] || {
    Icon: AlertCircle,
    label: labelPaymentStatus(key),
    tone: "border-slate-200 bg-slate-50 text-slate-600",
  };
  return <StatusPill icon={cfg.Icon} label={cfg.label} toneClass={cfg.tone} />;
}

/**
 * Cột trạng thái lịch hẹn: 2 dòng độc lập
 * - Buổi hẹn (admin/mentor duyệt lịch)
 * - Thanh toán (SePay đối soát tiền CK)
 */
export function AdminBookingStatusStack({
  bookingStatus,
  paymentStatus,
  paymentMethod = "transfer",
  mentorCancelResolution = "",
}) {
  const showPayment = paymentMethod === "transfer" && paymentStatus;
  const extra =
    String(mentorCancelResolution || "") === "awaiting_user" ? (
      <StatusRow caption="Hủy / đổi lịch">
        <StatusPill
          icon={Clock}
          label="Chờ học viên chọn"
          toneClass="border-violet-200 bg-violet-50 text-violet-700"
        />
      </StatusRow>
    ) : null;

  return (
    <div className="mx-auto flex min-w-[10.5rem] flex-col items-center gap-2.5 py-0.5">
      <StatusRow caption="Buổi hẹn">
        <BookingStatusPill status={bookingStatus} />
      </StatusRow>
      {showPayment ? (
        <StatusRow caption="Thanh toán">
          <PaymentStatusPill status={paymentStatus} />
        </StatusRow>
      ) : null}
      {extra}
    </div>
  );
}
