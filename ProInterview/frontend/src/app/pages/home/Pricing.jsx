import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  CheckCircle2,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { SparkleGlyph } from "../../components/decor/SparkleGlyph.jsx";
import { MentorPageShell } from "../../components/mentor/MentorPageShell";
import { requireLoginNavigate } from "../../utils/authGate";
import { getUser, isLoggedIn } from "../../utils/auth";
import { fetchCurrentPlan } from "../../utils/plansApi";
import { CUSTOMER_SHELL_GUTTER, CUSTOMER_SHELL_MAX } from "../../components/layout/customerShellLayout";
import { CustomerPageHeader } from "../../components/layout/CustomerPageHeader";
import { PRICING_SUBTITLE } from "../../constants/brandVoice";

const FAQ_DATA = [
  {
    q: "Gói Pro và Elite khác nhau như thế nào?",
    a: "Gói Pro gồm 10 buổi phỏng vấn AI mỗi tháng và 20 lượt phân tích CV/JD. Gói Elite mở không giới hạn phỏng vấn AI, quota phân tích cao hơn và ưu tiên hỗ trợ.",
  },
  {
    q: "Tôi có thể hủy gói đăng ký bất cứ lúc nào không?",
    a: "Có. Vào Cài đặt để hủy gia hạn. Bạn vẫn dùng được quyền lợi gói đến hết chu kỳ đã thanh toán.",
  },
  {
    q: "Thanh toán qua kênh nào?",
    a: "Hiện hỗ trợ chuyển khoản ngân hàng (VietQR). Sau khi CK đúng mã và số tiền, SePay tự xác nhận và gói được kích hoạt trong vài phút.",
  },
  {
    q: "Chính sách hoàn tiền?",
    a: "Hoàn 100% trong 7 ngày nếu chưa hài lòng và chưa dùng quá 2 buổi phỏng vấn AI.",
  },
];

const PLANS = [
  {
    id: "free",
    title: "Basic",
    subtitle: "Miễn phí mãi mãi",
    monthlyDisplay: 0,
    yearlyDisplay: 0,
    yearlyTotal: null,
    yearlySave: null,
    features: [
      "3/5 câu hỏi phỏng vấn cùng AI",
      "1 lần phân tích CV/JD",
      "Bộ câu hỏi phỏng vấn theo ngành nghề",
    ],
    cta: "Bắt đầu ngay",
    checkoutMonthly: "/",
    checkoutYearly: "/",
    popular: false,
    variant: "outline",
  },
  {
    id: "starter_pro",
    title: "Pro",
    subtitle: "Dành cho ứng viên chủ động",
    monthlyDisplay: 79000,
    yearlyDisplay: 63000,
    yearlyTotal: 756000,
    yearlySave: 192000,
    features: [
      "10 buổi AI Interview/tháng",
      "Nhận diện giọng nói AI",
      "20 lần phân tích CV/JD",
      "Phản hồi chi tiết từng câu",
    ],
    cta: "Nâng cấp Pro",
    checkoutMonthly: "/checkout?plan=starterPro&billing=monthly&planPrice=79000",
    checkoutYearly: "/checkout?plan=starterPro&billing=yearly&planPrice=756000",
    popular: false,
    variant: "lime",
  },
  {
    id: "elite_pro",
    title: "Elite",
    subtitle: "Chinh phục tập đoàn lớn",
    monthlyDisplay: 99000,
    yearlyDisplay: 79000,
    yearlyTotal: 948000,
    yearlySave: 240000,
    features: [
      "AI Interview KHÔNG GIỚI HẠN",
      "CV/JD phân tích KHÔNG GIỚI HẠN",
      "Nhận diện giọng nói Turbo",
      "Hỗ trợ ưu tiên 24/7",
    ],
    cta: "Nâng cấp Elite",
    checkoutMonthly: "/checkout?plan=elitePro&billing=monthly&planPrice=99000",
    checkoutYearly: "/checkout?plan=elitePro&billing=yearly&planPrice=948000",
    popular: true,
    variant: "elite",
  },
];

/** % tiết kiệm khi trả năm (so với 12 × giá tháng). Pro & Elite đều = 20%. */
function yearlySavePercent(monthlyPerMonth, yearlyPerMonth) {
  if (!monthlyPerMonth) return 0;
  return Math.round((1 - yearlyPerMonth / monthlyPerMonth) * 100);
}

const YEARLY_SAVE_PCT = yearlySavePercent(
  PLANS[1].monthlyDisplay,
  PLANS[1].yearlyDisplay,
);

function fmtVnd(amount) {
  return new Intl.NumberFormat("vi-VN").format(amount) + "đ";
}

const UNLIMITED_HIGHLIGHT = "KHÔNG GIỚI HẠN";

function FeatureLabel({ text }) {
  if (!text.includes(UNLIMITED_HIGHLIGHT)) {
    return <span className="leading-snug">{text}</span>;
  }
  const parts = text.split(UNLIMITED_HIGHLIGHT);
  return (
    <span className="leading-snug">
      {parts.map((part, i) => (
        <React.Fragment key={i}>
          {part}
          {i < parts.length - 1 && (
            <span className="font-bold text-[#6d2fd6]">{UNLIMITED_HIGHLIGHT}</span>
          )}
        </React.Fragment>
      ))}
    </span>
  );
}

function normalizePlanKey(plan) {
  const k = String(plan ?? "").trim();
  if (k === "starterPro" || k === "starter_pro") return "starter_pro";
  if (k === "elitePro" || k === "elite_pro") return "elite_pro";
  return "free";
}

function BillingToggle({ billing, onChange, savePercent }) {
  return (
    <div className="mx-auto flex w-fit max-w-full flex-wrap items-center justify-center gap-1 rounded-full border border-violet-200/80 bg-white p-1.5 shadow-[0_8px_28px_rgba(99,14,212,0.1)]">
      <button
        type="button"
        onClick={() => onChange("monthly")}
        className={`rounded-full px-5 py-2.5 text-sm font-bold transition-all ${
          billing === "monthly"
            ? "bg-violet-100 text-violet-950 shadow-sm"
            : "text-violet-600 hover:text-violet-900"
        }`}
      >
        Hàng tháng
      </button>
      <button
        type="button"
        onClick={() => onChange("yearly")}
        className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition-all ${
          billing === "yearly"
            ? "bg-violet-100 text-violet-950 shadow-sm"
            : "text-violet-600 hover:text-violet-900"
        }`}
      >
        Hàng năm
        <span className="rounded-full bg-gradient-to-r from-[#93f72b] to-[#93f72b] px-2 py-0.5 text-[10px] font-extrabold text-violet-950">
          Tiết kiệm {savePercent}%
        </span>
      </button>
    </div>
  );
}

export function Pricing() {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState(null);
  const [billing, setBilling] = useState("monthly");
  const [currentPlan, setCurrentPlan] = useState(() =>
    normalizePlanKey(getUser()?.plan),
  );

  useEffect(() => {
    if (!isLoggedIn()) return;
    let cancelled = false;
    fetchCurrentPlan().then((res) => {
      if (!cancelled && res.success) {
        setCurrentPlan(normalizePlanKey(res.plan));
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleFaq = (i) => setOpenFaq(openFaq === i ? null : i);

  const handleCta = (plan) => {
    if (plan.id === "free") {
      requireLoginNavigate(navigate, "/");
      return;
    }
    if (currentPlan === plan.id) return;
    const path = billing === "yearly" ? plan.checkoutYearly : plan.checkoutMonthly;
    requireLoginNavigate(navigate, path);
  };

  return (
    <MentorPageShell className="pricing-page" bottomPad="pb-16" showAmbient={false}>
      <div className={CUSTOMER_SHELL_GUTTER}>
        <div className={`${CUSTOMER_SHELL_MAX} py-10 sm:py-14`}>
          <CustomerPageHeader
            centered
            className="mb-8 sm:mb-10"
            badge="Bảng giá"
            title={
              <>
                Sẵn sàng hơn cho{" "}
                <span className="bg-gradient-to-r from-[#6d2fd6] to-[#a66ff8] bg-clip-text text-transparent">
                  mọi buổi phỏng vấn
                </span>
              </>
            }
            subtitle={PRICING_SUBTITLE}
            subtitleClassName="mt-3 max-w-2xl text-base font-medium leading-relaxed text-violet-700/90"
          />

          <BillingToggle billing={billing} onChange={setBilling} savePercent={YEARLY_SAVE_PCT} />

          <div className="mt-10 grid w-full grid-cols-1 items-stretch justify-items-stretch gap-6 md:grid-cols-3 lg:gap-8 [&>article]:min-w-0 [&>article]:w-full">
            {PLANS.map((plan) => {
              const isCurrent = currentPlan === plan.id;
              const isPopular = plan.popular;
              const isYearly = billing === "yearly";
              const displayAmount = isYearly ? plan.yearlyDisplay : plan.monthlyDisplay;
              const isFree = plan.id === "free";
              const variant = plan.variant;
              /** Cùng chiều cao khối giá → vạch ngăn & list thẳng hàng (Basic 0đ = Pro/Elite) */
              const priceBlockMin = isYearly ? "min-h-[5.125rem]" : "min-h-[2.75rem]";
              return (
                <article
                  key={plan.id}
                  className={`glass-card relative flex h-full w-full min-w-0 flex-col !rounded-[20px] p-6 pt-[0.7rem] sm:p-7 sm:pt-[0.95rem] ${
                    isPopular
                      ? "z-10 !overflow-visible !border-[3px] !border-[#6d2fd6] !shadow-none hover:!translate-y-0 hover:!border-[#6d2fd6] hover:!shadow-none"
                      : ""
                  }`}
                >
                  {isPopular && (
                    <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 -translate-y-[62%]">
                      <span className="relative inline-block whitespace-nowrap rounded-full bg-[#6d2fd6] px-4 py-1 text-xs font-black uppercase tracking-widest text-white shadow-md">
                        Phổ biến nhất
                        <SparkleGlyph
                          className="absolute -right-5 -top-4 h-8 w-8"
                          style={{
                            filter:
                              "drop-shadow(0 1px 2px rgba(15,23,42,0.12)) drop-shadow(0 0 8px rgba(95,0,240,0.35))",
                            transform: "translateY(-0.1rem) rotate(16deg)",
                          }}
                        />
                        <SparkleGlyph
                          className="absolute -left-6 -top-6 h-4 w-4 -translate-y-[0.3rem] translate-x-[9.8rem] opacity-60"
                          style={{
                            filter:
                              "drop-shadow(0 1px 2px rgba(15,23,42,0.08)) drop-shadow(0 0 5px rgba(95,0,240,0.22))",
                            transform: "rotate(-18deg)",
                          }}
                        />
                        <SparkleGlyph
                          className="absolute -right-9 -top-6 h-4 w-4 opacity-70"
                          style={{
                            filter:
                              "drop-shadow(0 1px 2px rgba(15,23,42,0.1)) drop-shadow(0 0 6px rgba(95,0,240,0.28))",
                            transform: "rotate(22deg)",
                          }}
                        />
                        <SparkleGlyph
                          className="absolute -right-11 -top-8 h-3.5 w-3.5 opacity-60"
                          style={{
                            filter:
                              "drop-shadow(0 1px 2px rgba(15,23,42,0.08)) drop-shadow(0 0 5px rgba(95,0,240,0.22))",
                            transform: "rotate(28deg)",
                          }}
                        />
                      </span>
                    </div>
                  )}

                  <div className="mb-2 flex h-6 shrink-0 items-center">
                    {isCurrent ? (
                      <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-[10px] font-bold text-violet-800 ring-1 ring-violet-200">
                        Gói hiện tại
                      </span>
                    ) : (
                      <span className="invisible rounded-full px-2.5 py-0.5 text-[10px]" aria-hidden>
                        —
                      </span>
                    )}
                  </div>

                  <div className="shrink-0">
                    <p className="text-xs font-semibold text-slate-500">{plan.subtitle}</p>
                    <h3
                      className={`mt-1 font-headline text-xl font-bold ${
                        variant === "elite" ? "text-[#6d2fd6]" : "text-slate-900"
                      }`}
                    >
                      {plan.title}
                    </h3>

                    <div className={`mt-3 flex flex-col justify-start space-y-1.5 ${priceBlockMin}`}>
                      {isFree ? (
                        <p className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                          0đ
                        </p>
                      ) : (
                        <p className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                          {fmtVnd(displayAmount)}
                          <span className="ml-1 text-base font-bold text-slate-500">
                            {isYearly ? "/tháng (quy đổi)" : "/tháng"}
                          </span>
                        </p>
                      )}
                      {isYearly && !isFree && plan.yearlyTotal != null && (
                        <p className="text-base font-bold leading-snug text-slate-900">
                          Thanh toán một lần:{" "}
                          <span className="text-[#6d2fd6]">{fmtVnd(plan.yearlyTotal)}</span>
                          <span className="font-semibold text-slate-600"> /năm</span>
                        </p>
                      )}
                      {isYearly && isFree && (
                        <>
                          <p className="text-base font-bold leading-snug text-transparent" aria-hidden>
                            —
                          </p>
                          <p className="text-sm font-semibold leading-snug text-transparent" aria-hidden>
                            —
                          </p>
                        </>
                      )}
                      {isYearly && plan.yearlySave != null && (
                        <p className="text-sm font-semibold leading-snug text-[#6d2fd6]">
                          Tiết kiệm {fmtVnd(plan.yearlySave)}/năm
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="my-3 shrink-0 border-t border-slate-100" />

                  <ul className="flex flex-1 flex-col gap-2">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                        {variant === "elite" ? (
                          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#6d2fd6]" />
                        ) : (
                          <CheckCircle2
                            className={`mt-0.5 h-4 w-4 shrink-0 ${
                              variant === "lime" ? "text-[#6d2fd6]" : "text-slate-400"
                            }`}
                          />
                        )}
                        <span className="min-w-0 flex-1">
                          <FeatureLabel text={f} />
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-auto w-full shrink-0 pt-4">
                  <button
                    type="button"
                    disabled={isCurrent}
                    onClick={() => handleCta(plan)}
                    className={`flex w-full items-center justify-center rounded-full py-3 text-center text-sm font-bold transition-all ${
                      isCurrent
                        ? "cursor-not-allowed border border-slate-200 bg-slate-50 text-slate-400"
                        : variant === "outline"
                          ? "border border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
                          : "font-black hover:brightness-105 active:scale-[0.99]"
                    }`}
                    style={
                      isCurrent || variant === "outline"
                        ? undefined
                        : {
                            background: "#93f72b",
                            color: "#0f172a",
                            boxShadow: "0 8px 20px rgba(15,23,42,0.1)",
                          }
                    }
                  >
                    {isCurrent ? "Đang dùng" : plan.cta}
                  </button>
                  </div>
                </article>
              );
            })}
          </div>

          <section className="mx-auto mt-16 max-w-3xl sm:mt-20">
            <div className="mb-8 text-center">
              <h2 className="font-headline text-xl font-extrabold text-violet-950 sm:text-2xl">
                Câu hỏi thường gặp
              </h2>
              <p className="mt-2 text-sm text-violet-700/90">Mọi thứ bạn cần biết về gói và quyền lợi.</p>
            </div>

            <div className="space-y-3">
              {FAQ_DATA.map((item, i) => (
                <button
                  key={i}
                  type="button"
                  className={`w-full rounded-2xl border bg-white p-5 text-left shadow-sm transition-all ${
                    openFaq === i
                      ? "border-violet-300 ring-2 ring-violet-100"
                      : "border-slate-200/90 hover:border-violet-200"
                  }`}
                  onClick={() => toggleFaq(i)}
                >
                  <div className="flex items-center justify-between gap-4">
                    <h4 className="text-sm font-bold text-slate-900 sm:text-base">{item.q}</h4>
                    {openFaq === i ? (
                      <ChevronUp className="h-5 w-5 shrink-0 text-[#6d2fd6]" />
                    ) : (
                      <ChevronDown className="h-5 w-5 shrink-0 text-slate-400" />
                    )}
                  </div>
                  {openFaq === i && (
                    <p className="mt-3 border-t border-violet-100 pt-3 text-sm leading-relaxed text-slate-600">
                      {item.a}
                    </p>
                  )}
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>
    </MentorPageShell>
  );
}
