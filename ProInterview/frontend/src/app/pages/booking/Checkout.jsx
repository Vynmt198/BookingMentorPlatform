import React, { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router";
import {
  ArrowLeft,
  Sparkles as Sparkle,
  Check,
  CheckCircle2,
  Lock,
  AlertCircle,
  Tag,
  Phone,
  Copy,
  Calendar,
  Clock,
  Video,
  Landmark,
  X,
} from "lucide-react";
import { getUser, isLoggedIn, setLoggedIn } from "../../utils/auth";
import { fetchCurrentPlan } from "../../utils/plansApi";
import { landingPrimaryButtonClass } from "../../constants/landingTheme";
import { fetchMentor } from "../../utils/mentorApi";
import { createBooking, fetchRebookCredit } from "../../utils/bookingsApi";
import { fetchCourseById } from "../../utils/courseApi";
import { enrollmentApi } from "../../utils/enrollmentApi";
import { createSubscriptionTransferPending, fetchTransferStatus } from "../../utils/paymentsApi";
import { toastApiError, toastApiSuccess } from "../../utils/apiToast";

/* ─── Plan meta ─────────────────────────────────────────── */

const PLANS = {
  starterPro: {
    name: "Pro",
    tagline: "Luyện tập nghiêm túc",
    monthlyPrice: 79000,
    yearlyPrice: 63000,
    badge: "PHỔ BIẾN",
    accentColor: "#8037f4",
    features: ["10 buổi AI phỏng vấn/tháng", "AI nhận dạng giọng nói", "20 lần phân tích CV/JD/tháng", "Phản hồi chi tiết từng câu", "Xuất kết quả PDF"],
  },
  elitePro: {
    name: "Elite",
    tagline: "Chinh phục mọi vòng phỏng vấn",
    monthlyPrice: 99000,
    yearlyPrice: 79000,
    badge: "TỐT NHẤT",
    accentColor: "#93f72b",
    features: ["AI phỏng vấn không giới hạn", "AI nhận dạng giọng nói — Turbo 2×", "CV/JD phân tích không giới hạn", "Phân tích hành vi: Giao tiếp mắt, Tư thế", "Phân tích giọng nói: Tốc độ, Từ đệm", "Mentor 1:1 ưu tiên"],
  },
};

function fmt(n) {
  return new Intl.NumberFormat("vi-VN").format(n) + "đ";
}

const checkoutCard =
  "rounded-2xl border border-slate-200 bg-white shadow-sm";
const labelMuted = "text-xs font-medium text-slate-500";
const textMuted = "text-sm text-slate-600";
const pageShell = "min-h-screen bg-[#faf9fc] text-slate-900 antialiased";

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
      className={`flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-all ${
        copied
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
          : "border-slate-200 bg-slate-50 text-slate-600 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-800"
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
            className="rounded-lg bg-[#8037f4] px-3 py-2 text-[10px] font-bold uppercase text-white hover:bg-[#6d2fd6]"
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

function OrderLineItem({ isBooking, isCourse, bookingMentor, courseInfo, plan, billing, bookingDate, bookingTime, baseTotal, fmt }) {
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
          </div>
          <p className="shrink-0 text-lg font-bold text-[#8037f4]">{fmt(baseTotal)}</p>
        </div>
      </div>
    );
  }
  return (
    <div className={`${checkoutCard} p-4 sm:p-5`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#8037f4]">Gói cước</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{plan.name}</p>
          <p className={`mt-1 ${labelMuted}`}>
            {billing === "yearly" ? "Gói năm" : "Gói tháng"}
          </p>
        </div>
        <p className="text-lg font-bold text-[#8037f4]">{fmt(baseTotal)}</p>
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
}) {
  if (!hasBank) {
    return (
      <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-800">
        Chưa cấu hình STK ngân hàng (<span className="font-mono">VITE_BANK_TRANSFER_*</span>).
      </p>
    );
  }

  return (
    <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="space-y-3 text-sm">
          <div className="flex justify-between gap-2">
            <span className={labelMuted}>Ngân hàng</span>
            <span className="text-right font-medium text-slate-800">{BANK_TRANSFER.bankName}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className={labelMuted}>Số TK</span>
            <span className="font-mono font-bold text-blue-600">{BANK_TRANSFER.accountNumber}</span>
          </div>
          {BANK_TRANSFER.accountOwner ? (
            <div className="flex justify-between gap-2">
              <span className={labelMuted}>Chủ TK</span>
              <span className="text-right font-medium text-slate-800">{BANK_TRANSFER.accountOwner}</span>
            </div>
          ) : null}
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className={labelMuted}>Nội dung chuyển khoản</p>
                <p className="mt-0.5 break-all font-mono text-sm font-semibold text-slate-900">{transferOrderNum}</p>
              </div>
              <CopyBtn text={transferOrderNum} />
            </div>
            <p className="mt-1.5 text-xs font-semibold text-[#8037f4]">Số tiền: {fmt(payAmount)}</p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center">
          {vietQrUrl && !vietQrLoadFailed ? (
            <button
              type="button"
              onClick={onOpenQrModal}
              className="w-full max-w-[200px] rounded-xl border border-slate-200 bg-white p-3 text-center shadow-sm transition-colors hover:border-violet-300 hover:shadow-md"
            >
              <img
                src={vietQrUrl}
                alt="Mã QR VietQR"
                className="w-full"
                loading="lazy"
                onError={onQrError}
              />
              <p className="mt-2 text-xs font-medium text-slate-500">Phóng to QR</p>
            </button>
          ) : vietQrUrl && vietQrLoadFailed ? (
            <p className={`text-center text-xs ${labelMuted}`}>Không tải QR — chuyển thủ công theo STK.</p>
          ) : (
            <p className={`text-center text-xs ${labelMuted}`}>
              Thêm <span className="font-mono">VITE_VIETQR_BANK_ID</span> để hiện QR.
            </p>
          )}
        </div>
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────── */

export function Checkout() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  /* ── Booking / Course / Plan mode ─────────────────────────────── */
  const isBooking = searchParams.get("type") === "booking";
  const isCourse = searchParams.get("type") === "course";
  const courseId = searchParams.get("courseId") ?? "";
  const isPlanCheckout = Boolean(searchParams.get("plan"));
  const isPaidCheckout = isBooking || isCourse || isPlanCheckout;
  const mentorId = searchParams.get("mentorId") ?? "";
  const [bookingMentor, setBookingMentor] = React.useState(null);
  const [courseInfo, setCourseInfo] = React.useState(null);

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

  const bookingPrice = Number(bookingMentor?.price ?? searchParams.get("price") ?? 0);
  const bookingDate = searchParams.get("date") ?? "";
  const bookingTime = searchParams.get("time") ?? "";

  /* ── Plan mode ────────────────────────────────────────── */
  const planKey = searchParams.get("plan") ?? "starterPro";
  const billing = (searchParams.get("billing") ?? "yearly");
  const plan = PLANS[planKey] ?? PLANS.starterPro;
  // Read the exact price shown on the Pricing page (passed via URL); fall back to PLANS data
  const urlPlanPrice = Number(searchParams.get("planPrice") ?? "0");
  const price = urlPlanPrice > 0
    ? urlPlanPrice
    : (billing === "yearly" ? plan.yearlyPrice : plan.monthlyPrice);
  const courseUrlPrice = Number(searchParams.get("price") ?? "0");
  const coursePriceNum = isCourse ? Number((courseInfo?.price ?? courseUrlPrice) || 0) : 0;
  const planListPrice =
    billing === "yearly" ? plan.monthlyPrice * 12 : plan.monthlyPrice;
  const baseTotal = isBooking ? bookingPrice : isCourse ? coursePriceNum : planListPrice;
  const total = isBooking ? bookingPrice : isCourse ? coursePriceNum : price;

  const [transferOrderNum, setTransferOrderNum] = useState(() => `PI${Math.floor(Math.random() * 900000 + 100000)}`);

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

  const [appStep, setAppStep] = useState("checkout");
  const [bankBookingId, setBankBookingId] = useState(null);
  const [bankEnrollmentId, setBankEnrollmentId] = useState(null);
  const [bankSubscriptionPaymentId, setBankSubscriptionPaymentId] = useState(null);
  const [awaitingAutoConfirm, setAwaitingAutoConfirm] = useState(false);
  const [paymentSuccessOverlay, setPaymentSuccessOverlay] = useState(null);
  const autoOrderStartedRef = useRef(false);
  const paidRedirectStartedRef = useRef(false);

  const [cardError, setCardError] = useState("");

  /* Coupon */
  const [coupon, setCoupon] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const discount = isCourse ? 0 : couponApplied ? Math.round(total * 0.1) : 0;
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

  const handlePay = async ({ silent = false } = {}) => {
    if (!isLoggedIn()) {
      setCardError("");
      const q = searchParams.toString();
      navigate(`/login?redirect=${encodeURIComponent(`/checkout?${q}`)}`);
      return { ok: false };
    }

    if (isPlanCheckout) {
      setCardError("");
      const apiPlanKey = planKey === "elitePro" ? "elite_pro" : "starter_pro";
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
          setAppStep("awaiting_transfer");
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
          const serverOrder = extractOrderPart(apiRes.orderNum || apiRes.enrollment?.paymentRef);
          if (serverOrder) setTransferOrderNum(serverOrder);
          setBankEnrollmentId(String(eid));
          setAppStep("awaiting_transfer");
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

    if (!bookingMentor || !bookingDate || !bookingTime) {
      setCardError("Thiếu thông tin đặt lịch. Hãy quay lại bước đặt lịch với mentor.");
      return { ok: false };
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
          price: bookingPrice,
          durationMinutes: 60,
          applyRebookCreditFromBookingId: rebookFrom,
        });
        if (apiRes.success && apiRes.booking?.id) {
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

      const apiRes = await createBooking({
        mentorId: bookingMentor.id,
        date: bookingDate,
        time: bookingTime,
        timeSlot: bookingTime,
        sessionType: "mock_interview",
        position: bookingPosition,
        note: bookingNote,
        cvFile: bookingCvFile || "",
        jdFile: bookingJdFile || "",
        price: bookingPrice,
        durationMinutes: 60,
        orderNum: transferOrderNum,
        paymentStatus: "pending",
        paymentMethod: "transfer",
      });
      if (apiRes.success && apiRes.booking?.id) {
        const serverOrder = extractOrderPart(apiRes.booking?.paymentRef);
        if (serverOrder) setTransferOrderNum(serverOrder);
        setBankBookingId(apiRes.booking.id);
        setAppStep("awaiting_transfer");
        if (!silent) {
          toastApiSuccess(
            "Đã tạo lịch. Quét QR, chuyển khoản — khi tiền vào sẽ tự xác nhận và chuyển sang buổi hẹn.",
          );
        }
        return { ok: true, bookingId: apiRes.booking.id };
      }
      const msg = apiRes.error || "Không thể tạo lịch chờ chuyển khoản.";
      console.warn("[POST /api/bookings]", msg);
      setCardError(msg);
      toastApiError(msg);
      return { ok: false };
    } catch {
      const msg = "Lỗi hệ thống khi tạo lịch hẹn.";
      setCardError(msg);
      toastApiError(msg);
      return { ok: false };
    }
  };

  const hasBank = Boolean(BANK_TRANSFER.bankName && BANK_TRANSFER.accountNumber);
  const showBankQr = payMode === PAY_MODE.BANK && payAmount > 0;
  const orderCreated = appStep === "awaiting_transfer";
  const paymentConfirmed = appStep === "paid";
  const stepCurrent = paymentConfirmed || orderCreated ? 2 : 1;
  const showPriceBreakdown =
    (billing === "yearly" && !isCourse && !isBooking && baseTotal > total) ||
    (couponApplied && !isCourse);

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

    if (isPlanCheckout) {
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

      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex items-center gap-2.5"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#8037f4] to-[#a66ff8] shadow-md">
              <Sparkle className="h-4 w-4 text-white" />
            </div>
            <span className="text-base font-bold text-slate-900">ProInterview</span>
          </button>
          <div className="flex items-center gap-4">
            <div className={`hidden items-center gap-1.5 sm:flex ${labelMuted}`}>
              <Phone className="h-3.5 w-3.5 text-[#8037f4]" />
              <span>Hỗ trợ: 1800 1234</span>
            </div>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Quay lại
            </button>
          </div>
        </nav>
      </header>

      <main className="fade-in relative z-10 mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Thanh toán</h1>
            {orderCreated ? (
              <p className={`mt-1 ${textMuted}`}>
                Mã CK: <span className="font-mono font-semibold text-slate-800">{transferOrderNum}</span>
              </p>
            ) : null}
          </div>
          {showStepBar ? <StepBar current={stepCurrent} steps={stepLabels} /> : null}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)] lg:items-start">
          {/* Cột trái ~70%: sản phẩm + CK + QR */}
          <div className="min-w-0 space-y-4">
            {!compactRebook && (
              <OrderLineItem
                isBooking={isBooking}
                isCourse={isCourse}
                bookingMentor={bookingMentor}
                courseInfo={courseInfo}
                plan={plan}
                billing={billing}
                bookingDate={bookingDate}
                bookingTime={bookingTime}
                baseTotal={baseTotal}
                fmt={fmt}
              />
            )}

            <div className={`${checkoutCard} p-5 sm:p-6`}>
              <CheckoutPayPanel
                mode={payMode}
                fmt={fmt}
                rebookCreditVnd={rebookCreditVnd}
                bookingTotalEstimate={bookingTotalEstimate}
                bookingMentor={bookingMentor}
                rebookFrom={rebookFrom}
                navigate={navigate}
              />

              {showBankQr && (
                <>
                  <h2 className="mb-4 text-base font-semibold text-slate-900">Chuyển khoản</h2>
                  <BankTransferBlock
                  hasBank={hasBank}
                  payAmount={payAmount}
                  transferOrderNum={transferOrderNum}
                  fmt={fmt}
                  vietQrUrl={vietQrUrl}
                  vietQrLoadFailed={vietQrLoadFailed}
                  onQrError={() => setVietQrLoadFailed(true)}
                  onOpenQrModal={() => setQrModalOpen(true)}
                />
                </>
              )}

              {isPlanCheckout && !isCourse && !isBooking && (
                <div className="mt-5 border-t border-slate-200 pt-5">
                  <p className={`mb-2 ${labelMuted}`}>Mã khuyến mãi</p>
                  {couponApplied ? (
                    <div className="flex items-center justify-between rounded-lg border border-violet-200 bg-violet-50 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4 text-[#8037f4]" />
                        <span className="text-sm font-semibold text-slate-900">{coupon.toUpperCase()}</span>
                      </div>
                      <span className="rounded-md bg-violet-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-violet-700">
                        Đã áp dụng
                      </span>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#8037f4] focus:outline-none focus:ring-1 focus:ring-violet-200"
                        placeholder="Nhập mã khuyến mãi"
                        value={coupon}
                        onChange={(e) => setCoupon(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (coupon.trim()) setCouponApplied(true);
                        }}
                        className="shrink-0 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-violet-300 hover:bg-violet-50"
                      >
                        Áp dụng
                      </button>
                    </div>
                  )}
                  <ul className="mt-4 space-y-2">
                    {plan.features.slice(0, 3).map((f, i) => (
                      <li key={i} className={`flex items-start gap-2 text-xs ${textMuted}`}>
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#8037f4]" />
                        {f}
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

          {/* Cột phải ~30%: tóm tắt + xác nhận CK */}
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
                  {couponApplied && !isCourse && (
                    <div className="flex justify-between text-sm">
                      <span className={labelMuted}>Mã giảm (10%)</span>
                      <span className="font-medium text-emerald-600">−{fmt(discount)}</span>
                    </div>
                  )}
                </div>
              ) : null}

              <div className="border-t border-slate-200 p-5 sm:p-6">
                {!payBlocked && !orderCreated && !showBankQr ? (
                  <button
                    type="button"
                    onClick={handlePay}
                    disabled={!isPaidCheckout || payMode === PAY_MODE.REBOOK_LOADING}
                    className={`${landingPrimaryButtonClass} h-12 w-full gap-2 rounded-xl text-base font-semibold disabled:pointer-events-none disabled:opacity-40`}
                  >
                    <Lock className="h-4 w-4" />
                    {payMode === PAY_MODE.REBOOK_READY ? "Xác nhận đặt lại" : "Tiếp tục"}
                  </button>
                ) : null}
                {showBankQr && orderCreated && !paymentConfirmed && awaitingAutoConfirm ? (
                  <div className="flex items-center justify-center gap-2 text-center text-sm text-violet-800">
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-violet-200 border-t-[#8037f4]" />
                    Đang chờ xác nhận thanh toán…
                  </div>
                ) : null}
                {showBankQr && !orderCreated && !payBlocked ? (
                  <p className={`text-center text-xs ${labelMuted}`}>Đang tạo đơn…</p>
                ) : null}
              </div>
            </div>
          </aside>
        </div>
      </main>

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