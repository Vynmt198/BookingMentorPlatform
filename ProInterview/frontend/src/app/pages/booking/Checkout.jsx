import React, { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router";
import {
  Check,
  CheckCircle2,
  Lock,
  AlertCircle,
  Copy,
  Calendar,
  Clock,
  Video,
  Landmark,
  X,
} from "lucide-react";
import { getUser, isLoggedIn, setLoggedIn } from "../../utils/auth";
import { fetchCurrentPlan } from "../../utils/plansApi";
import { landingLimeButtonClass } from "../../constants/landingTheme";
import { fetchMentor } from "../../utils/mentorApi";
import { createBooking, cancelBooking, fetchRebookCredit } from "../../utils/bookingsApi";
import { fetchCourseById } from "../../utils/courseApi";
import { enrollmentApi } from "../../utils/enrollmentApi";
import { createSubscriptionTransferPending, fetchTransferStatus } from "../../utils/paymentsApi";
import { toastApiError, toastApiSuccess } from "../../utils/apiToast";
import { useCart } from "../../hooks/useCart";
import { cartApi } from "../../utils/cartApi";
import { isBookingSlotInFuture } from "../../utils/bookingSchedule";
import { usePageAnalytics } from "../../hooks/usePageAnalytics";
import { trackAction } from "../../utils/analytics/analyticsApi";

/* ─── Plan meta ─────────────────────────────────────────── */

const PLANS = {
  student: {
    name: "Sinh Viên",
    tagline: "Dành cho sinh viên",
    monthlyPrice: 150000,
    yearlyPrice: 120000,
    yearlyTotal: 1440000,
    badge: "PHỔ BIẾN",
    accentColor: "#8037f4",
    features: ["Phân tích CV/JD 10 lần/tháng", "Ưu đãi 5% khi đặt lịch Mentor", "Giảm 5% khi mua khóa học", "Phản hồi CV chi tiết"],
  },
  professional: {
    name: "Chuyên Nghiệp",
    tagline: "Dành cho người đi làm",
    monthlyPrice: 500000,
    yearlyPrice: 400000,
    yearlyTotal: 4800000,
    badge: "TỐT NHẤT",
    accentColor: "#6d2fd6",
    features: ["Phân tích CV/JD 30 lần/tháng", "Ưu đãi 10% khi đặt lịch Mentor", "Giảm 10% khi mua khóa học", "Đặt lịch mentor ưu tiên"],
  },
  // backward-compat aliases
  starterPro: null,
  elitePro: null,
};

function fmt(n) {
  return new Intl.NumberFormat("vi-VN").format(n) + "đ";
}

/** Thời hạn chờ CK hiển thị ở FE — khớp mặc định backend (TRANSFER_PAYMENT_TIMEOUT_MINUTES). */
const TRANSFER_TIMEOUT_MINUTES = 15;

function formatCountdown(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const mm = Math.floor(totalSeconds / 60);
  const ss = totalSeconds % 60;
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

const checkoutCard =
  "rounded-2xl border border-slate-200 bg-white shadow-sm";
const labelMuted = "text-xs font-medium text-slate-500";
const textMuted = "text-sm text-slate-600";
const pageShell = "min-h-screen bg-transparent text-slate-900 antialiased";

function mentorIdsMatch(a, b) {
  const na = String(a || "").trim().toLowerCase();
  const nb = String(b || "").trim().toLowerCase();
  if (!na || !nb) return false;
  if (na === nb) return true;
  const core = (x) => (x.startsWith("u") ? x.slice(1) : x);
  return core(na) === core(nb);
}

/** Hiển thị trên checkout CK — Vite: .env / .env.local (dev) hoặc env trên host build (Vercel) + redeploy. */
const BANK_TRANSFER = {
  bankName: import.meta.env.VITE_BANK_TRANSFER_NAME || "",
  accountNumber: import.meta.env.VITE_BANK_TRANSFER_ACCOUNT || "",
  accountOwner: import.meta.env.VITE_BANK_TRANSFER_OWNER || "",
};

/** Mã ngân hàng cho VietQR (img.vietqr.io). VD: TPB = TPBank, VCB = Vietcombank. */
function inferVietQrBankId() {
  const explicit = import.meta.env.VITE_VIETQR_BANK_ID;
  if (explicit && String(explicit).trim()) return String(explicit).trim().toUpperCase();
  const name = (BANK_TRANSFER.bankName || "").toLowerCase();
  if (
    name.includes("tiên phong") ||
    name.includes("tien phong") ||
    name.includes("tpbank") ||
    name.includes("tp bank")
  ) {
    return "TPB";
  }
  return "";
}

/** Ảnh QR VietQR: quét trong app NH — thường điền sẵn STK, số tiền, nội dung. */
function buildVietQrImageUrl(bankId, accountDigits, amountVnd, addInfo) {
  const bid = String(bankId || "").trim().toUpperCase();
  const acc = String(accountDigits || "").replace(/\D/g, "");
  const amt = Math.round(Number(amountVnd) || 0);
  if (!bid || !acc || amt <= 0) return null;
  const add = encodeURIComponent(String(addInfo || "").slice(0, 50));
  return `https://img.vietqr.io/image/${bid}-${acc}-compact2.png?amount=${amt}&addInfo=${add}`;
}

/** In đậm phần số/% trong text tính năng gói (VD: "Ưu đãi 10% khi đặt lịch Mentor"). */
function highlightPlanNumbers(text) {
  const parts = String(text).split(/(\d+%|\d+\s*lần\/tháng)/g);
  return parts.map((part, i) =>
    /^\d+%$|^\d+\s*lần\/tháng$/.test(part) ? (
      <strong key={i} className="font-extrabold text-[#8037f4]">
        {part}
      </strong>
    ) : (
      part
    ),
  );
}

function extractOrderPart(value) {
  const s = String(value || "").trim();
  if (!s) return "";
  return s.split("|")[0].trim();
}

/* ─── CopyBtn ────────────────────────────────────────────── */
function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold transition-all ${
        copied
          ? "bg-emerald-500 text-white"
          : "bg-[#93f72b] text-black hover:brightness-95"
      }`}
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? "Đã sao chép" : "Sao chép"}
    </button>
  );
}

/* ─── Step indicator ─────────────────────────────────────── */
const STEPS_BOOKING = ["THÔNG TIN", "THANH TOÁN"];
const STEPS_REBOOK = ["TÓM TẮT", "XÁC NHẬN"];

function StepBar({ current, steps = STEPS_BOOKING }) {
  return (
    <div className="mb-5 flex items-center justify-center">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={i} className="flex items-center">
            <div className="flex flex-col items-center gap-2">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-all ${
                  done || active
                    ? "bg-[#8037f4] text-white shadow-md shadow-violet-500/25"
                    : "border border-slate-200 bg-white text-slate-400"
                }`}
              >
                {done ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span
                className={`text-[11px] font-semibold uppercase tracking-wide ${
                  done || active ? "text-[#8037f4]" : "text-slate-400"
                }`}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`mx-4 mb-6 h-0.5 w-10 rounded-full md:w-16 ${
                  i < current ? "bg-[#8037f4]" : "bg-slate-200"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

const PAY_MODE = {
  BANK: "bank",
  REBOOK_LOADING: "rebook_loading",
  REBOOK_READY: "rebook_ready",
  REBOOK_SAME: "rebook_same",
  REBOOK_LOW: "rebook_low",
};

function resolvePayMode(ctx) {
  const { isBooking, rebookFrom, rebookCreditLoading, canUseRebookCredit, rebookSameMentor, rebookCreditTooLow } = ctx;
  if (!isBooking || !rebookFrom) return PAY_MODE.BANK;
  if (rebookCreditLoading) return PAY_MODE.REBOOK_LOADING;
  if (rebookSameMentor) return PAY_MODE.REBOOK_SAME;
  if (rebookCreditTooLow) return PAY_MODE.REBOOK_LOW;
  if (canUseRebookCredit) return PAY_MODE.REBOOK_READY;
  return PAY_MODE.BANK;
}

function CheckoutPayPanel({ mode, fmt, rebookCreditVnd, bookingTotalEstimate, bookingMentor, rebookFrom, navigate }) {
  if (mode === PAY_MODE.REBOOK_LOADING) {
    return (
      <div className="mb-6 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-[#8037f4]" />
        Đang kiểm tra credit…
      </div>
    );
  }
  if (mode === PAY_MODE.REBOOK_READY) {
    return (
      <div className="mb-6 rounded-xl border border-violet-200 bg-violet-50 px-4 py-4 text-xs leading-relaxed text-violet-900">
        Dùng <strong>{fmt(rebookCreditVnd)}</strong> đã trả cho buổi mới{" "}
        <strong>{fmt(bookingTotalEstimate)}</strong>. Bấm xác nhận — không CK lại.
      </div>
    );
  }
  if (mode === PAY_MODE.REBOOK_SAME) {
    return (
      <div className="mb-6 space-y-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-xs text-amber-900">
        <p>
          Credit chỉ khi đặt <strong>mentor khác</strong>
          {bookingMentor?.name ? ` (không phải ${bookingMentor.name})` : ""}. Giữ mentor này → buổi cũ → «Đổi lịch».
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => navigate(`/mentors?rebookFrom=${encodeURIComponent(rebookFrom)}`)}
            className="rounded-lg bg-[#8037f4] px-3 py-2 text-[10px] font-bold uppercase text-white hover:bg-[#8037f4]"
          >
            Mentor khác
          </button>
          <button
            type="button"
            onClick={() => navigate(`/session/${encodeURIComponent(rebookFrom)}`)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-[10px] font-bold uppercase text-slate-700 hover:border-violet-300 hover:bg-violet-50"
          >
            Đổi lịch (buổi cũ)
          </button>
        </div>
      </div>
    );
  }
  if (mode === PAY_MODE.REBOOK_LOW) {
    return (
      <div className="mb-6 space-y-3 rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-xs text-red-800">
        <p>
          Credit {fmt(rebookCreditVnd)} — buổi {fmt(bookingTotalEstimate)} (thiếu{" "}
          {fmt(bookingTotalEstimate - rebookCreditVnd)}).
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => navigate(`/mentors?rebookFrom=${encodeURIComponent(rebookFrom)}`)}
            className="rounded-lg bg-[#8037f4] px-3 py-2 text-[10px] font-black uppercase text-white"
          >
            Mentor khác
          </button>
          <button
            type="button"
            onClick={() => navigate(`/session/${encodeURIComponent(rebookFrom)}`)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-[10px] font-bold uppercase text-slate-700 hover:border-violet-300"
          >
            Buổi cũ
          </button>
        </div>
      </div>
    );
  }
  return null;
}

function OrderLineItem({ isBooking, isCourse, isCartItem, bookingMentor, courseInfo, plan, billing, bookingDate, bookingTime, bookingSlots, baseTotal, fmt }) {
  if (isCartItem) {
    return (
      <div className={`${checkoutCard} flex gap-4 p-4 sm:p-5 mb-4`}>
        <img
          src={courseInfo?.thumbnail || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=200&q=80"}
          alt=""
          className="h-20 w-28 shrink-0 rounded-lg border border-slate-200 object-cover sm:h-24 sm:w-32"
        />
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold leading-snug text-slate-900 sm:text-lg">
            {courseInfo?.title || "Đang tải..."}
          </p>
          <p className={`mt-1 ${labelMuted}`}>{courseInfo?.itemType || "Sản phẩm"}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-lg font-bold text-[#8037f4]">{fmt(baseTotal)}</p>
          <p className={`mt-1 ${labelMuted}`}>x{courseInfo?.quantity || 1}</p>
        </div>
      </div>
    );
  }
  if (isCourse) {
    return (
      <div className={`${checkoutCard} flex gap-4 p-4 sm:p-5`}>
        <img
          src={courseInfo?.thumbnail || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=200&q=80"}
          alt=""
          className="h-20 w-28 shrink-0 rounded-lg border border-slate-200 object-cover sm:h-24 sm:w-32"
        />
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold leading-snug text-slate-900 sm:text-lg">
            {courseInfo?.title || "Đang tải khóa học…"}
          </p>
          {courseInfo?.mentorId?.userId?.name && (
            <p className={`mt-1 ${labelMuted}`}>Giảng viên: {courseInfo.mentorId.userId.name}</p>
          )}
        </div>
        <p className="shrink-0 text-right text-lg font-bold text-[#8037f4]">{fmt(baseTotal)}</p>
      </div>
    );
  }
  if (isBooking) {
    const slots =
      bookingSlots ?? (bookingDate ? [{ dateKey: bookingDate, dayFull: bookingDate, time: bookingTime }] : []);
    return (
      <div className={`${checkoutCard} p-4 sm:p-5`}>
        <div className="flex gap-4">
          {bookingMentor ? (
            <img
              src={bookingMentor.avatar}
              alt={bookingMentor.name}
              className="h-16 w-16 shrink-0 rounded-xl border border-slate-200 object-cover"
            />
          ) : (
            <div className="h-16 w-16 shrink-0 rounded-xl bg-slate-100" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold text-slate-900 sm:text-lg">
              {bookingMentor?.name || "Đang tải mentor…"}
            </p>
            <p className={`mt-0.5 ${labelMuted}`}>{bookingMentor?.title || "Buổi phỏng vấn 1:1"}</p>
            {slots.length > 1 ? (
              <div className="mt-2 space-y-1">
                {slots.map((s, i) => (
                  <div key={`${s.dateKey}_${s.time}`} className="flex items-center gap-2 text-xs text-slate-600">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#8037f4] text-[0.6rem] font-black text-white">
                      {i + 1}
                    </span>
                    <Calendar className="h-3 w-3 text-[#8037f4]" />
                    <span className="font-medium">{s.dayFull || s.dateKey}</span>
                    <Clock className="h-3 w-3 text-[#8037f4]" />
                    <span className="font-bold">{s.time}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className={`mt-2 flex flex-wrap gap-3 ${textMuted} text-xs`}>
                {bookingDate && (
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-[#8037f4]" />
                    {bookingDate}
                  </span>
                )}
                {bookingTime && (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-[#8037f4]" />
                    {bookingTime}
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <Video className="h-3.5 w-3.5 text-[#8037f4]" />
                  Jitsi trên ProInterview · 60 phút
                </span>
              </div>
            )}
          </div>
          <div className="shrink-0 text-right">
            <p className="text-lg font-bold text-[#8037f4]">{fmt(baseTotal)}</p>
            {slots.length > 1 && <p className="text-xs text-slate-500">{slots.length} buổi</p>}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-violet-400/30 bg-[#8037f4] p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#93f72b]">Gói cước</p>
          <p className="mt-1 text-lg font-semibold text-white">{plan.name}</p>
          <p className="mt-1 text-xs font-medium text-white/70">
            {billing === "yearly" ? "Gói năm" : "Gói tháng"}
          </p>
        </div>
        <p className="text-lg font-bold text-white">{fmt(baseTotal)}</p>
      </div>
    </div>
  );
}

/** Modal VietQR giữa màn hình — nền tối mờ + thẻ trắng (giống FES) */
function VietQrModal({
  open,
  onClose,
  payAmount,
  transferOrderNum,
  fmt,
  vietQrUrl,
  vietQrLoadFailed,
  onQrError,
}) {
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="vietqr-modal-title">
      <button
        type="button"
        className="absolute inset-0 bg-black/75 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Đóng"
      />
      <div className="relative z-10 w-full max-w-[400px] overflow-hidden rounded-2xl bg-white shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
          aria-label="Đóng cửa sổ QR"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="px-6 pb-6 pt-8 text-center">
          <p id="vietqr-modal-title" className="mb-4 text-lg font-bold tracking-tight text-slate-800">
            VietQR
          </p>

          {vietQrUrl && !vietQrLoadFailed ? (
            <div className="mx-auto max-w-[300px]">
              <img
                src={vietQrUrl}
                alt="Mã QR thanh toán VietQR"
                className="w-full rounded-lg"
                loading="eager"
                onError={onQrError}
              />
            </div>
          ) : (
            <p className="rounded-lg bg-slate-50 px-4 py-8 text-sm text-slate-600">
              {vietQrLoadFailed
                ? "Không tải được mã QR. Vui lòng chuyển khoản thủ công theo thông tin bên dưới."
                : "Chưa có mã QR. Kiểm tra cấu hình VITE_VIETQR_BANK_ID và STK ngân hàng."}
            </p>
          )}

          <div className="mt-5 space-y-2 border-t border-slate-100 pt-5 text-center text-sm text-slate-600">
            <p className="font-mono text-lg font-bold tracking-wide text-blue-600">
              {BANK_TRANSFER.accountNumber || "—"}
            </p>
            <p>
              <span className="text-slate-500">Số tiền: </span>
              <span className="font-semibold text-slate-900">{fmt(payAmount)}</span>
            </p>
            <p>
              <span className="text-slate-500">Tên chủ TK: </span>
              <span className="font-semibold text-slate-800">
                {BANK_TRANSFER.accountOwner || "—"}
              </span>
            </p>
            <p className="px-2">
              <span className="text-slate-500">Nội dung CK: </span>
              <span className="break-all font-mono text-xs font-bold text-slate-900 sm:text-sm">
                {transferOrderNum}
              </span>
            </p>
            {BANK_TRANSFER.bankName ? (
              <p className="text-xs leading-snug text-slate-500">{BANK_TRANSFER.bankName}</p>
            ) : null}
          </div>

          <div className="mt-4 flex justify-center">
            <CopyBtn text={transferOrderNum} />
          </div>
          <p className="mt-3 text-xs text-slate-500">Vui lòng quét QR để thanh toán</p>
        </div>
      </div>
    </div>
  );
}

/** CK + QR — cột trái, trong khung «Thanh toán chuyển khoản» */
function BankTransferBlock({
  hasBank,
  payAmount,
  transferOrderNum,
  fmt,
  vietQrUrl,
  vietQrLoadFailed,
  onQrError,
  onOpenQrModal,
  countdownLabel,
  awaitingConfirm,
  expired,
  onCreateNewOrder,
}) {
  if (!hasBank) {
    return (
      <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-800">
        Chưa cấu hình STK ngân hàng (<span className="font-mono">VITE_BANK_TRANSFER_*</span>).
      </p>
    );
  }

  return (
    <div className="mt-4">
      <div className="grid gap-8 md:grid-cols-[1fr_1fr]">
        {/* QR */}
        <div className="flex flex-col items-center gap-2">
          {vietQrUrl && !vietQrLoadFailed ? (
            <button
              type="button"
              onClick={onOpenQrModal}
              className="w-full max-w-[240px] rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-sm transition-colors hover:border-violet-300 hover:shadow-md"
            >
              <img
                src={vietQrUrl}
                alt="Mã QR VietQR"
                className="w-full"
                loading="lazy"
                onError={onQrError}
              />
            </button>
          ) : vietQrUrl && vietQrLoadFailed ? (
            <p className={`text-center text-xs ${labelMuted}`}>Không tải QR — chuyển thủ công theo STK.</p>
          ) : (
            <p className={`text-center text-xs ${labelMuted}`}>
              Thêm <span className="font-mono">VITE_VIETQR_BANK_ID</span> để hiện QR.
            </p>
          )}
          <p className="text-xs font-medium text-slate-500">Chạm để phóng to QR</p>
        </div>

        {/* Thông tin thanh toán */}
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-violet-50/40 px-4 py-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-[#8037f4]">Số tiền cần thanh toán</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900 sm:text-3xl">{fmt(payAmount)}</p>
            </div>
            {countdownLabel ? (
              <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                <Clock className="h-3.5 w-3.5" />
                Còn {countdownLabel}
              </span>
            ) : null}
          </div>

          {expired ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4">
              <p className="text-sm font-bold text-red-700">Đơn đã hết hạn ({TRANSFER_TIMEOUT_MINUTES} phút)</p>
              <p className="mt-1 text-xs leading-relaxed text-red-700/90">
                Mã {transferOrderNum} không còn hiệu lực. Tạo đơn mới để nhận QR và mã chuyển khoản mới.
              </p>
              <button
                type="button"
                onClick={onCreateNewOrder}
                className="mt-3 rounded-full bg-[#93f72b] px-4 py-2 text-xs font-bold text-black transition-all hover:brightness-95"
              >
                Tạo đơn mới
              </button>
            </div>
          ) : null}

          <div className="border-t border-slate-200" />

          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <div className="bg-[#8037f4] px-4 py-2 text-xs font-bold uppercase tracking-wide text-white">
              Nội dung chuyển khoản
            </div>
            <div className="flex items-center justify-between gap-2 px-4 py-3">
              <span className="break-all font-mono text-sm font-bold text-slate-900">{transferOrderNum}</span>
              <CopyBtn text={transferOrderNum} />
            </div>
          </div>

          <div className="space-y-2.5 rounded-2xl border border-slate-200 px-4 py-4 text-sm">
            <div>
              <p className={labelMuted}>Ngân hàng</p>
              <p className="font-medium text-slate-800">{BANK_TRANSFER.bankName}</p>
            </div>
            <div className="flex items-center justify-between gap-2 border-l-2 border-emerald-400 pl-3">
              <div className="min-w-0">
                <p className={labelMuted}>Số tài khoản</p>
                <p className="break-all font-mono font-bold text-[#8037f4]">{BANK_TRANSFER.accountNumber}</p>
              </div>
              <CopyBtn text={BANK_TRANSFER.accountNumber} />
            </div>
            {BANK_TRANSFER.accountOwner ? (
              <div>
                <p className={labelMuted}>Chủ tài khoản</p>
                <p className="font-medium text-slate-800">{BANK_TRANSFER.accountOwner}</p>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {awaitingConfirm ? (
        <div className="mt-5 flex items-center justify-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-center text-sm font-medium text-violet-800">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          Đang chờ xác nhận thanh toán…
        </div>
      ) : null}
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────── */

export function Checkout() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  usePageAnalytics();

  // Đơn CK đang chờ (mã, hạn đếm ngược, id booking/enrollment/subscription…) được lưu tạm ở sessionStorage
  // theo query string trang này — để F5 khôi phục lại đúng đơn cũ thay vì tự sinh mã PI + hạn 15 phút mới.
  const checkoutStorageKey = `prointerview_checkout_pending:${searchParams.toString()}`;
  const restoredOrder = useMemo(() => {
    if (typeof sessionStorage === "undefined") return null;
    try {
      const raw = sessionStorage.getItem(checkoutStorageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed?.appStep === "awaiting_transfer" ? parsed : null;
    } catch {
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Booking / Course / Plan / Cart mode ─────────────────────────────── */
  const isBooking = searchParams.get("type") === "booking";
  const isCourse = searchParams.get("type") === "course";
  const isCart = searchParams.get("type") === "cart";
  const courseId = searchParams.get("courseId") ?? "";
  const isPlanCheckout = Boolean(searchParams.get("plan"));
  const isPaidCheckout = isBooking || isCourse || isPlanCheckout || isCart;
  const mentorId = searchParams.get("mentorId") ?? "";
  const [bookingMentor, setBookingMentor] = React.useState(null);
  const [courseInfo, setCourseInfo] = React.useState(null);
  
  const { cart, cartTotal, fetchCart } = useCart();
  const cartItems = cart?.items || [];
  // Chốt lại tổng tiền + danh sách sản phẩm giỏ hàng tại thời điểm tạo đơn CK, vì backend chỉ xóa
  // các item đã được cấp quyền ngay (miễn phí/gói) — item đang chờ chuyển khoản vẫn còn trong giỏ
  // cho tới khi thanh toán được xác nhận, nên fetchCart() sau đó có thể trả về cartItems/cartTotal
  // không khớp với đơn đang hiển thị QR ở đây.
  const [cartOrderSnapshot, setCartOrderSnapshot] = React.useState(() => restoredOrder?.cartOrderSnapshot ?? null);
  const displayCartItems = isCart ? (cartOrderSnapshot?.items ?? cartItems) : [];
  const displayCartTotal = isCart ? (cartOrderSnapshot?.total ?? cartTotal) : 0;

  React.useEffect(() => {
    if (!isBooking || !mentorId) {
      setBookingMentor(null);
      return;
    }
    setBookingMentor(null);
    (async () => {
      try {
        const m = await fetchMentor(mentorId);
        if (m) setBookingMentor(m);
        else toastApiError("Không tải được thông tin mentor.");
      } catch {
        toastApiError("Lỗi kết nối khi tải mentor.");
      }
    })();
  }, [isBooking, mentorId]);

  React.useEffect(() => {
    if (!isCourse || !courseId) {
      setCourseInfo(null);
      return;
    }
    setCourseInfo(null);
    (async () => {
      try {
        const r = await fetchCourseById(courseId);
        if (r.success && r.course) setCourseInfo(r.course);
        else toastApiError(r.error, "Không tải được khóa học.");
      } catch {
        toastApiError("Lỗi kết nối khi tải khóa học.");
      }
    })();
  }, [isCourse, courseId]);

  // Đặt nhiều buổi cùng lúc (Booking.jsx) — mảng [{dateKey, dayFull, time}] gửi qua URL dạng JSON.
  const bookingSlots = useMemo(() => {
    if (!isBooking) return null;
    const raw = searchParams.get("slots") ?? "";
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
    } catch {
      return null;
    }
  }, [isBooking, searchParams]);
  const bookingSlotCount = bookingSlots ? bookingSlots.length : 1;

  // Sau khi tạo booking, giá thực tế cần trả (có thể được backend tự giảm giá cho buổi ngoài quota
  // gói Chuyên Nghiệp) do server trả về — ưu tiên số này cho QR thay vì giá niêm yết của mentor.
  // Khi có nhiều slot, đây là TỔNG tiền của cả nhóm (cộng dồn totalAmount từng booking con).
  const [bookingChargeOverride, setBookingChargeOverride] = useState(() => restoredOrder?.bookingChargeOverride ?? null);
  const bookingPricePerSlot = Number(bookingMentor?.price ?? searchParams.get("price") ?? 0);
  const bookingPrice = Number(bookingChargeOverride ?? bookingPricePerSlot * bookingSlotCount);
  const bookingDate = bookingSlots?.[0]?.dateKey ?? searchParams.get("date") ?? "";
  const bookingTime = bookingSlots?.[0]?.time ?? searchParams.get("time") ?? "";

  /* ── Plan mode ────────────────────────────────────────── */
  const planKey = searchParams.get("plan") ?? "student";
  const billing = (searchParams.get("billing") ?? "yearly");
  const plan = PLANS[planKey] ?? PLANS.student;
  // Giá luôn lấy từ bảng giá cố định của FE (khớp backend) — không tin tham số planPrice trên URL,
  // vì nó có thể bị sửa tay và backend sẽ luôn tự tính lại giá theo plan+billing khi tạo giao dịch.
  const price = billing === "yearly" ? plan.yearlyTotal : plan.monthlyPrice;
  const courseUrlPrice = Number(searchParams.get("price") ?? "0");
  // Sau khi ghi danh, giá thực tế cần trả (đã áp giảm giá/miễn phí theo gói) do backend trả về — ưu tiên số này cho QR.
  const [courseChargeOverride, setCourseChargeOverride] = useState(() => restoredOrder?.courseChargeOverride ?? null);
  const coursePriceNum = isCourse
    ? Number(courseChargeOverride ?? (courseInfo?.price ?? courseUrlPrice) ?? 0)
    : 0;
  const planListPrice =
    billing === "yearly" ? plan.monthlyPrice * 12 : plan.monthlyPrice;
  const baseTotal = isBooking ? bookingPrice : isCourse ? coursePriceNum : isCart ? displayCartTotal : planListPrice;
  const total = isBooking ? bookingPrice : isCourse ? coursePriceNum : isCart ? displayCartTotal : price;

  const [transferOrderNum, setTransferOrderNum] = useState(
    () => restoredOrder?.transferOrderNum ?? `PI${Math.floor(Math.random() * 900000 + 100000)}`,
  );

  /* ── Read all booking params from URL ── */
  const bookingPosition = searchParams.get("position") ?? "";
  const bookingNote = searchParams.get("note") ?? "";
  const bookingCvFile = searchParams.get("cvFile") || null;
  const bookingJdFile = searchParams.get("jdFile") || null;
  const rebookFrom =
    searchParams.get("rebookFrom") ||
    (typeof sessionStorage !== "undefined" ? sessionStorage.getItem("prointerview_rebook_from") : "") ||
    "";
  const [rebookCredit, setRebookCredit] = React.useState(null);
  const [rebookCreditLoading, setRebookCreditLoading] = React.useState(false);

  React.useEffect(() => {
    if (!isBooking || !rebookFrom) {
      setRebookCredit(null);
      setRebookCreditLoading(false);
      return;
    }
    setRebookCreditLoading(true);
    (async () => {
      try {
        const r = await fetchRebookCredit(rebookFrom);
        if (r.success && r.credit?.available) setRebookCredit(r.credit);
        else setRebookCredit(null);
      } catch {
        setRebookCredit(null);
      } finally {
        setRebookCreditLoading(false);
      }
    })();
  }, [isBooking, rebookFrom]);

  const [appStep, setAppStep] = useState(() => restoredOrder?.appStep ?? "checkout");
  const [bankBookingId, setBankBookingId] = useState(() => restoredOrder?.bankBookingId ?? null);
  const [bankEnrollmentId, setBankEnrollmentId] = useState(() => restoredOrder?.bankEnrollmentId ?? null);
  const [bankSubscriptionPaymentId, setBankSubscriptionPaymentId] = useState(
    () => restoredOrder?.bankSubscriptionPaymentId ?? null,
  );
  const [transferDeadline, setTransferDeadline] = useState(() => restoredOrder?.transferDeadline ?? null);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [awaitingAutoConfirm, setAwaitingAutoConfirm] = useState(false);
  const [paymentSuccessOverlay, setPaymentSuccessOverlay] = useState(null);
  const autoOrderStartedRef = useRef(Boolean(restoredOrder));
  const paidRedirectStartedRef = useRef(false);
  const checkoutOpenTrackedRef = useRef(false);

  // Đếm ngược hạn CK — chỉ mang tính hiển thị, backend luôn là nguồn xác thực hạn thật.
  useEffect(() => {
    if (!transferDeadline) return;
    const id = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, [transferDeadline]);
  const transferExpired = Boolean(transferDeadline && nowTick >= transferDeadline);
  const countdownLabel = transferDeadline && !transferExpired ? formatCountdown(transferDeadline - nowTick) : null;

  // Ghi lại đơn CK đang chờ để F5 khôi phục đúng mã + hạn cũ (xem restoredOrder ở đầu component).
  useEffect(() => {
    if (typeof sessionStorage === "undefined" || appStep !== "awaiting_transfer") return;
    try {
      sessionStorage.setItem(
        checkoutStorageKey,
        JSON.stringify({
          appStep,
          transferOrderNum,
          transferDeadline,
          bankBookingId,
          bankEnrollmentId,
          bankSubscriptionPaymentId,
          bookingChargeOverride,
          courseChargeOverride,
          cartOrderSnapshot,
        }),
      );
    } catch {
      /* ignore */
    }
  }, [
    appStep,
    checkoutStorageKey,
    transferOrderNum,
    transferDeadline,
    bankBookingId,
    bankEnrollmentId,
    bankSubscriptionPaymentId,
    bookingChargeOverride,
    courseChargeOverride,
    cartOrderSnapshot,
  ]);

  const handleCreateNewOrder = () => {
    if (typeof sessionStorage !== "undefined") {
      try {
        sessionStorage.removeItem(checkoutStorageKey);
      } catch {
        /* ignore */
      }
    }
    autoOrderStartedRef.current = false;
    setAppStep("checkout");
    setTransferDeadline(null);
    setBankBookingId(null);
    setBankEnrollmentId(null);
    setBankSubscriptionPaymentId(null);
    setTransferOrderNum(`PI${Math.floor(Math.random() * 900000 + 100000)}`);
    setCardError("");
    setInvoiceConfirmed(false);
  };

  // Xác nhận lại số tiền hóa đơn ngay trên trang trước khi tạo đơn + chuyển sang QR chuyển khoản.
  const [invoiceConfirmed, setInvoiceConfirmed] = useState(false);

  const [cardError, setCardError] = useState("");

  // Không có hệ thống mã khuyến mãi được backend xác thực — giá luôn là giá đầy đủ.
  const discount = 0;
  const payAmount = total - discount;
  const bookingTotalEstimate = Math.round(isBooking ? payAmount : bookingPrice);

  const rebookCreditVnd = Number(rebookCredit?.creditVnd || 0);
  const rebookSameMentor = Boolean(
    rebookCredit?.available &&
      mentorId &&
      (mentorIdsMatch(rebookCredit.excludeMentorId, mentorId) ||
        mentorIdsMatch(rebookCredit.excludeMentorId, bookingMentor?.id)),
  );
  const canUseRebookCredit = Boolean(
    rebookCredit?.available &&
      !rebookSameMentor &&
      bookingTotalEstimate > 0 &&
      bookingTotalEstimate <= rebookCreditVnd &&
      mentorId,
  );
  const rebookCreditTooLow = Boolean(
    rebookFrom &&
      rebookCredit?.available &&
      !rebookSameMentor &&
      bookingTotalEstimate > rebookCreditVnd,
  );
  const payMode = useMemo(
    () =>
      resolvePayMode({
        isBooking,
        rebookFrom,
        rebookCreditLoading,
        canUseRebookCredit,
        rebookSameMentor,
        rebookCreditTooLow,
      }),
    [isBooking, rebookFrom, rebookCreditLoading, canUseRebookCredit, rebookSameMentor, rebookCreditTooLow],
  );
  const payBlocked = payMode === PAY_MODE.REBOOK_SAME || payMode === PAY_MODE.REBOOK_LOW;
  const showStepBar = payMode === PAY_MODE.BANK || payMode === PAY_MODE.REBOOK_READY;
  const stepLabels = payMode === PAY_MODE.REBOOK_READY ? STEPS_REBOOK : STEPS_BOOKING;
  const compactRebook = rebookFrom && payMode !== PAY_MODE.BANK;
  const grandTotal = total - discount;

  const vietQrBankId = useMemo(() => inferVietQrBankId(), []);
  const vietQrUrl = useMemo(
    () => buildVietQrImageUrl(vietQrBankId, BANK_TRANSFER.accountNumber, payAmount, transferOrderNum),
    [vietQrBankId, transferOrderNum, payAmount],
  );
  const [vietQrLoadFailed, setVietQrLoadFailed] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  useEffect(() => {
    setVietQrLoadFailed(false);
  }, [vietQrUrl]);

  useEffect(() => {
    if (checkoutOpenTrackedRef.current) return;
    checkoutOpenTrackedRef.current = true;
    trackAction("checkout_open", location.pathname, {
      checkoutType: isBooking ? "booking" : isCourse ? "course" : isCart ? "cart" : "plan",
      planKey: isPlanCheckout ? planKey : "",
      courseId: isCourse ? courseId : "",
      mentorId: isBooking ? mentorId : "",
      amount: payAmount,
    });
  }, [location.pathname, isBooking, isCourse, isCart, isPlanCheckout, planKey, courseId, mentorId, payAmount]);

  const handlePay = async ({ silent = false } = {}) => {
    if (!isLoggedIn()) {
      setCardError("");
      const q = searchParams.toString();
      navigate(`/login?redirect=${encodeURIComponent(`/checkout?${q}`)}`);
      return { ok: false };
    }

    if (isPlanCheckout) {
      setCardError("");
      const apiPlanKey = planKey; // student | professional (đã chuẩn hóa từ URL)
      try {
        const apiRes = await createSubscriptionTransferPending({
          amount: payAmount,
          planKey: apiPlanKey,
          orderNum: transferOrderNum,
          billing,
        });
        if (apiRes.success && apiRes.paymentId) {
          if (apiRes.providerRef) setTransferOrderNum(apiRes.providerRef);
          setBankSubscriptionPaymentId(apiRes.paymentId);
          setTransferDeadline(Date.now() + TRANSFER_TIMEOUT_MINUTES * 60 * 1000);
          setAppStep("awaiting_transfer");
          trackAction("plan_checkout_start", location.pathname, {
            planKey: apiPlanKey,
            billing,
            amount: payAmount,
            paymentMethod: "transfer",
          });
          if (!silent) {
            toastApiSuccess(
              "Đã tạo đơn gói cước. Quét QR, CK — khi tiền vào sẽ tự kích hoạt gói qua SePay.",
            );
          }
          return { ok: true, subscriptionPaymentId: apiRes.paymentId };
        }
        const msg = apiRes.error || "Không thể tạo giao dịch chờ chuyển khoản.";
        setCardError(msg);
        toastApiError(msg);
        return { ok: false };
      } catch {
        const msg = "Lỗi hệ thống khi tạo giao dịch gói cước.";
        setCardError(msg);
        toastApiError(msg);
        return { ok: false };
      }
    }

    if (isCourse) {
      if (!courseId) {
        setCardError("Thiếu mã khóa học.");
        return { ok: false };
      }
      if (!courseInfo) {
        setCardError("Đang tải thông tin khóa học…");
        return { ok: false };
      }
      const expected = Number(courseInfo.price ?? 0);
      if (!Number.isFinite(expected) || expected <= 0) {
        setCardError("Khóa học miễn phí không cần thanh toán tại đây. Hãy đăng ký trực tiếp trên trang khóa học.");
        return { ok: false };
      }
      // URL ?price= có thể cũ/sai — luôn ghi danh theo giá API, không chặn (tránh webhook SePay không khớp đơn).
      if (courseUrlPrice > 0 && Math.round(expected) !== Math.round(courseUrlPrice)) {
        console.warn(
          "[checkout] URL price",
          courseUrlPrice,
          "≠ server price",
          expected,
          "— dùng giá server cho ghi danh.",
        );
      }
      setCardError("");
      try {
        const apiRes = await enrollmentApi.enroll(courseId, { paymentMethod: "transfer", orderNum: transferOrderNum });
        const eid = apiRes.enrollment?._id || apiRes.enrollment?.id;
        if (apiRes.success && eid) {
          // Được gói trả (Professional) hoặc miễn phí sau giảm giá — backend đã xác nhận paid, không cần CK.
          if (apiRes.enrollment?.paymentStatus === "paid") {
            trackAction("course_enroll", location.pathname, {
              courseId,
              enrollmentId: String(eid),
              paymentMethod: apiRes.included ? "plan_included" : "free",
            });
            toastApiSuccess(
              apiRes.included
                ? "Khóa học này được tính vào gói của bạn — đã ghi danh, không cần chuyển khoản."
                : "Đã ghi danh khóa học.",
            );
            navigate(`/courses/${encodeURIComponent(courseId)}/learn`);
            return { ok: true, enrollmentId: String(eid) };
          }

          const realAmount = Number(apiRes.enrollment?.pricePaid ?? expected);
          setCourseChargeOverride(realAmount);
          const serverOrder = extractOrderPart(apiRes.orderNum || apiRes.enrollment?.paymentRef);
          if (serverOrder) setTransferOrderNum(serverOrder);
          setBankEnrollmentId(String(eid));
          setTransferDeadline(Date.now() + TRANSFER_TIMEOUT_MINUTES * 60 * 1000);
          setAppStep("awaiting_transfer");
          trackAction("course_enroll", location.pathname, {
            courseId,
            enrollmentId: String(eid),
            amount: realAmount,
            paymentMethod: "transfer_pending",
          });
          if (!silent) toastApiSuccess("Đã tạo ghi danh. Quét QR và chuyển khoản — hệ thống tự xác nhận qua SePay.");
          return { ok: true, enrollmentId: String(eid) };
        }
        const msg = apiRes.error || "Không thể tạo ghi danh chờ chuyển khoản.";
        setCardError(msg);
        toastApiError(msg);
        return { ok: false };
      } catch {
        const msg = "Lỗi hệ thống khi ghi danh.";
        setCardError(msg);
        toastApiError(msg);
        return { ok: false };
      }
    }

    if (isCart) {
      if (cartItems.length === 0) {
        setCardError("Giỏ hàng đang trống.");
        return { ok: false };
      }
      setCardError("");
      try {
        const apiRes = await cartApi.checkout({ paymentMethod: "transfer", orderNum: transferOrderNum });
        if (apiRes.success) {
          const realTotal = Number(apiRes.totalDue ?? cartTotal);
          // Toàn bộ khóa học trong giỏ được gói trả (Professional) — không còn gì cần chuyển khoản.
          if (realTotal <= 0) {
            trackAction("course_enroll", location.pathname, {
              checkoutType: "cart",
              itemCount: cartItems.length,
              paymentMethod: "plan_included",
            });
            toastApiSuccess("Các khóa học này được tính vào gói của bạn — đã ghi danh, không cần chuyển khoản.");
            fetchCart();
            navigate("/my-courses");
            return { ok: true, isCart: true };
          }

          const serverOrder = extractOrderPart(apiRes.orderNum || transferOrderNum);
          if (serverOrder) setTransferOrderNum(serverOrder);
          setBankEnrollmentId("cart-" + serverOrder); // Fake id to trigger the awaiting_transfer step
          setTransferDeadline(Date.now() + TRANSFER_TIMEOUT_MINUTES * 60 * 1000);
          setAppStep("awaiting_transfer");
          trackAction("course_enroll", location.pathname, {
            checkoutType: "cart",
            itemCount: cartItems.length,
            amount: realTotal,
            paymentMethod: "transfer_pending",
          });
          if (!silent) toastApiSuccess("Đã gộp đơn hàng. Quét QR và chuyển khoản — hệ thống tự xác nhận toàn bộ.");
          setCartOrderSnapshot({ items: cartItems, total: realTotal });
          // Không clearCart() ở đây — item vẫn "pending" chờ chuyển khoản, backend giữ nguyên trong giỏ
          // và chỉ xóa khi confirmEnrollmentTransferByAdmin xác nhận thanh toán thành công. Nhờ vậy nếu
          // user thoát trang thanh toán trước khi chuyển khoản, giỏ hàng vẫn còn nguyên khi quay lại.
          fetchCart();
          return { ok: true, isCart: true };
        }
        const msg = apiRes.error || "Không thể gộp đơn hàng.";
        setCardError(msg);
        toastApiError(msg);
        return { ok: false };
      } catch {
        const msg = "Lỗi hệ thống khi thanh toán giỏ hàng.";
        setCardError(msg);
        toastApiError(msg);
        return { ok: false };
      }
    }

    if (!bookingMentor || !bookingDate || !bookingTime) {
      setCardError("Thiếu thông tin đặt lịch. Hãy quay lại bước đặt lịch với mentor.");
      return { ok: false };
    }

    const slotsToBook =
      bookingSlots ?? [{ dateKey: bookingDate, dayFull: bookingDate, time: bookingTime }];
    const MAX_SLOTS = 5;
    if (slotsToBook.length > MAX_SLOTS) {
      setCardError(`Tối đa ${MAX_SLOTS} buổi trên một đơn đặt lịch.`);
      return { ok: false };
    }
    for (const slot of slotsToBook) {
      if (!isBookingSlotInFuture(slot.dateKey, slot.time)) {
        const msg = `Khung giờ ${slot.time} ngày ${slot.dateKey} đã qua. Vui lòng quay lại chọn lại.`;
        setCardError(msg);
        toastApiError(msg);
        return { ok: false };
      }
    }

    if (rebookCreditTooLow) {
      const msg = `Buổi mới ${fmt(bookingTotalEstimate)} cao hơn credit ${fmt(rebookCreditVnd)}. Chọn mentor rẻ hơn hoặc hoàn tiền ở buổi cũ.`;
      setCardError(msg);
      toastApiError(msg);
      return { ok: false };
    }
    if (rebookSameMentor) {
      const msg = "Chọn mentor khác hoặc quay buổi cũ chọn «Đổi lịch».";
      setCardError(msg);
      toastApiError(msg);
      return { ok: false };
    }

    setCardError("");
    try {
      if (canUseRebookCredit && rebookFrom) {
        const apiRes = await createBooking({
          mentorId: bookingMentor.id,
          date: bookingDate,
          timeSlot: bookingTime,
          sessionType: "mock_interview",
          position: bookingPosition,
          note: bookingNote,
          cvFile: bookingCvFile || "",
          jdFile: bookingJdFile || "",
          price: bookingPricePerSlot,
          durationMinutes: 60,
          applyRebookCreditFromBookingId: rebookFrom,
        });
        if (apiRes.success && apiRes.booking?.id) {
          trackAction("booking_submit", location.pathname, {
            bookingId: apiRes.booking.id,
            mentorId: bookingMentor.id,
            date: bookingDate,
            timeSlot: bookingTime,
            paymentMethod: "rebook_credit",
            rebookFrom,
          });
          try {
            sessionStorage.removeItem("prointerview_rebook_from");
          } catch {
            /* ignore */
          }
          navigate(`/session/${encodeURIComponent(apiRes.booking.id)}`);
          return { ok: false };
        }
        const msg = apiRes.error || "Không thể áp dụng credit đổi mentor.";
        setCardError(msg);
        toastApiError(msg);
        return { ok: false };
      }

      // Mỗi slot tạo 1 booking riêng, tất cả dùng chung 1 mã CK (orderNum) — chuyển khoản 1 lần cho cả nhóm.
      // Sau slot đầu, dùng paymentRef server xác nhận cho các slot sau (đề phòng server chuẩn hoá mã khác client).
      let confirmedOrderNum = transferOrderNum;
      const createdIds = [];
      let runningTotal = 0;
      for (const slot of slotsToBook) {
        const apiRes = await createBooking({
          mentorId: bookingMentor.id,
          date: slot.dateKey,
          time: slot.time,
          timeSlot: slot.time,
          sessionType: "mock_interview",
          position: bookingPosition,
          note: bookingNote,
          cvFile: bookingCvFile || "",
          jdFile: bookingJdFile || "",
          price: bookingPricePerSlot,
          durationMinutes: 60,
          orderNum: confirmedOrderNum,
          paymentStatus: "pending",
          paymentMethod: "transfer",
        });

        if (apiRes.success && apiRes.booking?.id) {
          // Buổi được gói trả (quota mentor session còn hạn) — backend đã xác nhận paid, không cần CK.
          // Chỉ xảy ra ở slot đầu (nếu có) vì đây là field lịch sử, không còn cấp mới theo business rule hiện tại.
          if (
            createdIds.length === 0 &&
            apiRes.booking.paymentMethod === "plan_quota" &&
            apiRes.booking.paymentStatus === "paid"
          ) {
            trackAction("booking_submit", location.pathname, {
              bookingId: apiRes.booking.id,
              mentorId: bookingMentor.id,
              date: slot.dateKey,
              timeSlot: slot.time,
              paymentMethod: "plan_quota",
            });
            toastApiSuccess("Buổi này được tính vào quota gói của bạn — đã xác nhận, không cần chuyển khoản.");
            navigate(`/session/${encodeURIComponent(apiRes.booking.id)}`);
            return { ok: true, bookingId: apiRes.booking.id };
          }

          createdIds.push(apiRes.booking.id);
          runningTotal += Number(apiRes.booking.totalAmount ?? apiRes.booking.price ?? bookingPricePerSlot);
          if (createdIds.length === 1) {
            const serverOrder = extractOrderPart(apiRes.booking?.paymentRef);
            if (serverOrder) {
              setTransferOrderNum(serverOrder);
              confirmedOrderNum = serverOrder;
            }
            setBankBookingId(apiRes.booking.id);
          }
          continue;
        }

        // Slot này tạo thất bại — huỷ các booking đã tạo trước đó trong vòng lặp để không để rác "pending".
        for (const id of createdIds) {
          cancelBooking(id).catch(() => {});
        }
        const msg = apiRes.error || `Không thể tạo lịch buổi ${slot.time} ngày ${slot.dateKey}.`;
        console.warn("[POST /api/bookings]", msg);
        setCardError(msg);
        toastApiError(msg);
        return { ok: false };
      }

      if (runningTotal > 0) setBookingChargeOverride(runningTotal);
      setTransferDeadline(Date.now() + TRANSFER_TIMEOUT_MINUTES * 60 * 1000);
      setAppStep("awaiting_transfer");
      trackAction("booking_submit", location.pathname, {
        bookingIds: createdIds,
        mentorId: bookingMentor.id,
        slotCount: createdIds.length,
        amount: runningTotal,
        paymentMethod: "transfer_pending",
        rebookFrom,
      });
      if (!silent) {
        toastApiSuccess(
          createdIds.length > 1
            ? `Đã tạo ${createdIds.length} buổi hẹn. Chuyển khoản 1 lần, hệ thống tự xác nhận tất cả.`
            : "Đã tạo lịch. Quét QR, chuyển khoản — khi tiền vào sẽ tự xác nhận và chuyển sang buổi hẹn.",
        );
      }
      return { ok: true, bookingId: createdIds[0], bookingIds: createdIds };
    } catch {
      const msg = "Lỗi hệ thống khi tạo lịch hẹn.";
      setCardError(msg);
      toastApiError(msg);
      return { ok: false };
    }
  };

  const hasBank = Boolean(BANK_TRANSFER.bankName && BANK_TRANSFER.accountNumber);
  const orderCreated = appStep === "awaiting_transfer";
  const paymentConfirmed = appStep === "paid";
  // Chỉ tạo đơn + hiện QR sau khi người dùng xác nhận hóa đơn (hoặc đơn đã tạo từ trước, vd sau F5).
  const showBankQr = payMode === PAY_MODE.BANK && payAmount > 0 && (invoiceConfirmed || orderCreated);
  const stepCurrent = paymentConfirmed || orderCreated ? 2 : 1;
  const showPriceBreakdown = billing === "yearly" && !isCourse && !isBooking && baseTotal > total;

  const resolvePaidRedirect = (apiRedirect) => {
    if (apiRedirect) return apiRedirect;
    if (isCourse && courseId) return `/courses/${encodeURIComponent(courseId)}/learn`;
    if (isBooking && bankBookingId) return `/session/${encodeURIComponent(bankBookingId)}`;
    if (isPlanCheckout) return "/dashboard?planUpgraded=1";
    return "/dashboard";
  };

  const handlePaymentSuccess = async (pollResult) => {
    if (paidRedirectStartedRef.current) return;
    paidRedirectStartedRef.current = true;
    const target = resolvePaidRedirect(pollResult?.redirectTo);
    setAwaitingAutoConfirm(false);
    setAppStep("paid");
    if (typeof sessionStorage !== "undefined") {
      try {
        sessionStorage.removeItem(checkoutStorageKey);
      } catch {
        /* ignore */
      }
    }

    if (isCart) {
      // Backend chỉ xóa item khỏi giỏ tại thời điểm này (thanh toán vừa được xác nhận) — đồng bộ lại
      // để icon/drawer giỏ hàng ở chỗ khác trong app cập nhật đúng ngay.
      fetchCart();
    }

    if (isPlanCheckout) {
      trackAction("plan_upgrade", location.pathname, {
        planKey,
        billing,
        amount: payAmount,
      });
      try {
        const pr = await fetchCurrentPlan();
        if (pr.success) {
          setLoggedIn({
            ...getUser(),
            plan: pr.plan,
            planExpiresAt: pr.planExpiresAt,
          });
        }
      } catch {
        /* ignore */
      }
    }

    const toastMsg = pollResult?.sepayAuto
      ? isPlanCheckout
        ? `Chuyển khoản thành công! Gói ${plan.name} đã được kích hoạt.`
        : isCourse
          ? "Chuyển khoản thành công! Đang mở trang học…"
          : "Chuyển khoản thành công!"
      : isPlanCheckout
        ? `Gói ${plan.name} đã được kích hoạt.`
        : "Thanh toán đã được xác nhận.";
    toastApiSuccess(toastMsg);
    setPaymentSuccessOverlay({
      title: "Thanh toán thành công",
      subtitle: isCourse
        ? "Đang mở trang học…"
        : isBooking
          ? "Đang mở buổi hẹn…"
          : isPlanCheckout
            ? `Gói ${plan.name} đã kích hoạt.`
            : "Đang chuyển hướng…",
    });
    window.setTimeout(() => navigate(target), 1500);
  };

  useEffect(() => {
    if (!showBankQr || !isLoggedIn() || payBlocked || orderCreated || autoOrderStartedRef.current) return;
    if (isCourse && !courseInfo) return;
    if (isBooking && (!bookingMentor || !bookingDate || !bookingTime)) return;
    autoOrderStartedRef.current = true;
    (async () => {
      const created = await handlePay({ silent: true });
      if (!created?.ok) autoOrderStartedRef.current = false;
    })();
  }, [
    showBankQr,
    payBlocked,
    orderCreated,
    isCourse,
    courseInfo,
    isBooking,
    bookingMentor,
    bookingDate,
    bookingTime,
  ]);

  // Khi đang ở màn hình chờ chuyển khoản của đơn giỏ hàng, nếu user thêm/bớt khóa học khác vào
  // giỏ ở nơi khác trong app (cart context là global nên cartItems ở đây tự cập nhật theo), QR/số
  // tiền đang hiển thị sẽ bị "đứng hình" nếu không có gì kích hoạt gọi lại handlePay. So sánh chữ
  // ký (itemId:quantity) của giỏ hiện tại với snapshot lúc tạo đơn — lệch thì tự gộp lại đơn cũ
  // (backend đã hỗ trợ merge theo cùng orderNum) để QR luôn phản ánh đúng tổng cần chuyển khoản.
  const cartCourseSignature = useMemo(() => {
    if (!isCart) return "";
    return cartItems
      .filter((it) => it.itemType === "Course")
      .map((it) => `${it.itemId}:${it.quantity}`)
      .sort()
      .join("|");
  }, [isCart, cartItems]);

  const mergingCartOrderRef = useRef(false);

  useEffect(() => {
    if (!isCart || !orderCreated || paymentConfirmed || !cartOrderSnapshot) return;
    const snapshotSignature = (cartOrderSnapshot.items || [])
      .filter((it) => it.itemType === "Course")
      .map((it) => `${it.itemId}:${it.quantity}`)
      .sort()
      .join("|");
    if (snapshotSignature === cartCourseSignature) return;
    if (mergingCartOrderRef.current) return;
    mergingCartOrderRef.current = true;
    (async () => {
      await handlePay({ silent: true });
      mergingCartOrderRef.current = false;
    })();
  }, [isCart, orderCreated, paymentConfirmed, cartOrderSnapshot, cartCourseSignature]);

  const pollErrorShownRef = useRef(false);

  const runTransferPoll = async () => {
    const r = await fetchTransferStatus(transferOrderNum);
    if (r.success && r.status === "paid") {
      handlePaymentSuccess(r);
      return;
    }
    if (!r.success && !pollErrorShownRef.current) {
      pollErrorShownRef.current = true;
      toastApiError(
        r.error ||
          "Không kiểm tra được trạng thanh toán. Kiểm tra đăng nhập và kết nối API (VITE_API_URL / CORS).",
      );
    }
  };

  useEffect(() => {
    if (!orderCreated || paymentConfirmed || !showBankQr || !transferOrderNum) {
      setAwaitingAutoConfirm(false);
      return undefined;
    }
    setAwaitingAutoConfirm(true);
    pollErrorShownRef.current = false;
    let cancelled = false;
    const poll = async () => {
      if (cancelled) return;
      await runTransferPoll();
    };
    const t0 = window.setTimeout(poll, 2000);
    const iv = window.setInterval(poll, 3000);
    return () => {
      cancelled = true;
      window.clearTimeout(t0);
      window.clearInterval(iv);
    };
  }, [
    orderCreated,
    paymentConfirmed,
    showBankQr,
    transferOrderNum,
    courseId,
    bankBookingId,
  ]);

  /* ── Checkout UI ── */
  return (
    <div className={`relative overflow-x-hidden ${pageShell}`}>
      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        .fade-in { animation: fadeIn 0.35s ease-out both; }
      `}</style>

      <div className="fade-in relative z-10 mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {orderCreated ? null : (
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Thanh toán</h1>
            </div>
            {showStepBar ? (
              <div className="mr-16">
                <StepBar current={stepCurrent} steps={stepLabels} />
              </div>
            ) : null}
          </div>
        )}

        <div
          className={`mt-6 grid gap-6 ${
            orderCreated ? "" : "lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)] lg:items-start"
          }`}
        >
          {/* Cột trái ~70%: sản phẩm + CK + QR (đã tạo đơn thì chỉ còn card CK, giống production) */}
          <div className="min-w-0 space-y-4">
            {!orderCreated && !compactRebook && !isCart && (
              <OrderLineItem
                isBooking={isBooking}
                isCourse={isCourse}
                bookingMentor={bookingMentor}
                courseInfo={courseInfo}
                plan={plan}
                billing={billing}
                bookingDate={bookingDate}
                bookingTime={bookingTime}
                bookingSlots={bookingSlots}
                baseTotal={baseTotal}
                fmt={fmt}
              />
            )}

            {!orderCreated && isCart && displayCartItems.length > 0 && (
              <div className="space-y-4">
                {displayCartItems.map((item) => (
                  <OrderLineItem
                    key={item._id}
                    isCartItem={true}
                    courseInfo={item}
                    baseTotal={item.price * item.quantity}
                    fmt={fmt}
                  />
                ))}
              </div>
            )}

            <div className={`${checkoutCard} p-5 sm:p-6`}>
              {orderCreated && showStepBar ? <StepBar current={stepCurrent} steps={stepLabels} /> : null}

              <CheckoutPayPanel
                mode={payMode}
                fmt={fmt}
                rebookCreditVnd={rebookCreditVnd}
                bookingTotalEstimate={bookingTotalEstimate}
                bookingMentor={bookingMentor}
                rebookFrom={rebookFrom}
                navigate={navigate}
              />

              {payMode === PAY_MODE.BANK && !showBankQr && (
                <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <Landmark className="mt-0.5 h-5 w-5 shrink-0 text-[#8037f4]" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Thanh toán chuyển khoản</p>
                    <p className={`mt-1 ${textMuted}`}>
                      Kiểm tra lại thông tin và <span className="font-semibold text-slate-900">số tiền</span> bên
                      phải, sau đó bấm <span className="font-semibold text-[#8037f4]">«Tiếp tục»</span> để xác nhận
                      hóa đơn và nhận mã QR chuyển khoản.
                    </p>
                  </div>
                </div>
              )}

              {showBankQr && (
                <>
                  <h2 className="text-lg font-bold text-slate-900">Thanh toán chuyển khoản</h2>
                  <p className={`mt-1 ${textMuted}`}>Quét QR hoặc chuyển thủ công, hệ thống tự xác nhận qua SePay.</p>
                  <BankTransferBlock
                  hasBank={hasBank}
                  payAmount={payAmount}
                  transferOrderNum={transferOrderNum}
                  fmt={fmt}
                  vietQrUrl={vietQrUrl}
                  vietQrLoadFailed={vietQrLoadFailed}
                  onQrError={() => setVietQrLoadFailed(true)}
                  onOpenQrModal={() => setQrModalOpen(true)}
                  countdownLabel={countdownLabel}
                  awaitingConfirm={orderCreated && !paymentConfirmed && awaitingAutoConfirm && !transferExpired}
                  expired={orderCreated && !paymentConfirmed && transferExpired}
                  onCreateNewOrder={handleCreateNewOrder}
                />
                </>
              )}

              {!orderCreated && isPlanCheckout && !isCourse && !isBooking && (
                <div className="mt-5 border-t border-slate-200 pt-5">
                  <ul className="space-y-2.5">
                    {plan.features.slice(0, 3).map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm font-semibold text-slate-900">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#8037f4]" />
                        {highlightPlanNumbers(f)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {cardError && (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{cardError}</span>
                </div>
              )}
            </div>
          </div>

          {/* Cột phải ~30%: tóm tắt + xác nhận CK — ẩn sau khi đã tạo đơn, chỉ còn card CK giống production */}
          {!orderCreated && (
            <aside className="min-w-0">
              <div className={`${checkoutCard} sticky top-20 overflow-hidden`}>
                <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
                  <p className={labelMuted}>Tổng cộng</p>
                  <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900">{fmt(grandTotal)}</p>
                </div>

                {showPriceBreakdown ? (
                  <div className="space-y-2 px-5 py-4 sm:px-6">
                    {billing === "yearly" && !isCourse && !isBooking && baseTotal > total && (
                      <div className="flex justify-between text-sm">
                        <span className={labelMuted}>Giảm gói năm</span>
                        <span className="font-medium text-emerald-600">−{fmt(baseTotal - total)}</span>
                      </div>
                    )}
                  </div>
                ) : null}

                <div className="border-t border-slate-200 p-5 sm:p-6">
                  {!payBlocked && !showBankQr ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (payMode === PAY_MODE.REBOOK_READY) {
                          handlePay();
                        } else {
                          setInvoiceConfirmed(true);
                        }
                      }}
                      disabled={!isPaidCheckout || payMode === PAY_MODE.REBOOK_LOADING}
                      className={`${landingLimeButtonClass} h-12 w-full gap-2 rounded-xl text-base font-semibold disabled:pointer-events-none disabled:opacity-40`}
                    >
                      <Lock className="h-4 w-4" />
                      {payMode === PAY_MODE.REBOOK_READY ? "Xác nhận đặt lại" : "Tiếp tục"}
                    </button>
                  ) : null}
                  {showBankQr && !payBlocked ? (
                    cardError ? (
                      <button
                        type="button"
                        onClick={() => handlePay()}
                        className={`${landingLimeButtonClass} h-12 w-full gap-2 rounded-xl text-base font-semibold`}
                      >
                        Thử lại
                      </button>
                    ) : (
                      <p className={`text-center text-xs ${labelMuted}`}>Đang tạo đơn…</p>
                    )
                  ) : null}
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>

      {paymentSuccessOverlay ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
          role="alertdialog"
          aria-live="assertive"
          aria-label="Thanh toán thành công"
        >
          <div className="w-full max-w-md rounded-2xl border border-emerald-200 bg-white p-8 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="h-9 w-9 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">{paymentSuccessOverlay.title}</h2>
            <p className="mt-2 text-sm text-slate-600">{paymentSuccessOverlay.subtitle}</p>
          </div>
        </div>
      ) : null}

      {showBankQr && (
        <VietQrModal
          open={qrModalOpen}
          onClose={() => setQrModalOpen(false)}
          payAmount={payAmount}
          transferOrderNum={transferOrderNum}
          fmt={fmt}
          vietQrUrl={vietQrUrl}
          vietQrLoadFailed={vietQrLoadFailed}
          onQrError={() => setVietQrLoadFailed(true)}
        />
      )}
    </div>
  );
}