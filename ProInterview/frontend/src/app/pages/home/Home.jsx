import React, { useEffect } from "react";
import { useNavigate, Link } from "react-router";
import {
  FileText,
  Users,
  TrendingUp as TrendUp,
  Star,
  ChevronRight as CaretRight,
  Brain,
  Target as Crosshair,
  Award as Medal,
  ArrowRight,
  Zap as Lightning,
  CircleCheck,
  Upload as UploadSimple,
  Video as VideoCamera,
  BadgeCheck as SealCheck,
  GraduationCap
} from "lucide-react";
import { Footer } from "../../components/layout/Footer";
import { RecommendedJourney } from "../../components/home/RecommendedJourney";
import { CvAnalysisFeatureShowcase } from "../../components/home/CvAnalysisFeatureShowcase";
import {
  MentorFeatureShowcase,
  HOME_MENTOR_MASCOTS,
} from "../../components/home/MentorFeatureShowcase";
import { CoursesFeatureShowcase } from "../../components/home/CoursesFeatureShowcase";
import { SparkleGlyph } from "../../components/decor/SparkleGlyph.jsx";
import {
  SectionReveal,
  LandingReveal,
  LandingStagger,
  LandingItem,
} from "../../components/home/landing/LandingReveal";
import {
  HOME_SHELL_MAX,
  HOME_SECTION_INNER,
} from "../../components/layout/customerShellLayout";
import { HOME_COPY, HOME_SECTION_COPY } from "../../constants/brandVoice";
import {
  HOME_HERO_TITLE_CLAMP,
  HOME_SECTION_TITLE_CLAMP,
  homeSectionClasses as homeTy,
} from "../../constants/homeTypography";
/* ─── Data ──────────────────────────────────────────────── */
const FEATURES = [
  {
    icon: FileText,
    accentClass: "from-[#93f72b] to-[#8fbc24]",
    bgClass: "bg-lime-50 dark:bg-lime-950/30",
    dotColor: "#93f72b",
    borderHover: "rgba(196, 255, 71,0.5)",
    bgHover: "rgba(196, 255, 71,0.07)",
    title: HOME_SECTION_COPY.features[0].title,
    desc: HOME_SECTION_COPY.features[0].desc,
    route: "/cv-analysis",
    cta: HOME_SECTION_COPY.features[0].cta,
  },
  {
    icon: Users,
    accentClass: "from-[#FFB800] to-[#FF8C42]",
    bgClass: "bg-amber-50 dark:bg-amber-950/30",
    dotColor: "#FFB800",
    borderHover: "rgba(255,184,0,0.5)",
    bgHover: "rgba(255,184,0,0.07)",
    title: HOME_SECTION_COPY.features[1].title,
    desc: HOME_SECTION_COPY.features[1].desc,
    route: "/mentors",
    cta: HOME_SECTION_COPY.features[1].cta,
  },
  {
    icon: TrendUp,
    accentClass: "from-sky-400 to-blue-600",
    bgClass: "bg-sky-50 dark:bg-sky-950/30",
    dotColor: "#38BDF8",
    borderHover: "rgba(167,139,250,0.)",
    bgHover: "rgba(167,139,250,0.)",
    title: HOME_SECTION_COPY.features[2].title,
    desc: HOME_SECTION_COPY.features[2].desc,
    route: "/my-bookings",
    cta: HOME_SECTION_COPY.features[2].cta,
  },
];

const STEP_ICONS = [FileText, VideoCamera, Users, GraduationCap];
const STEP_COLORS = ["#7000ff", "#7000ff", "#7000ff", "#7000ff"];

const STEPS = HOME_SECTION_COPY.steps.map((s, i) => ({
  ...s,
  icon: STEP_ICONS[i],
  color: STEP_COLORS[i],
}));

const TESTIMONIAL_MASCOTS = [
  HOME_MENTOR_MASCOTS.pro,
  HOME_MENTOR_MASCOTS.cv,
  HOME_MENTOR_MASCOTS.headset,
];

const TESTIMONIALS = HOME_SECTION_COPY.testimonials.items.map((t, i) => ({
  ...t,
  mascot: TESTIMONIAL_MASCOTS[i],
  stars: 5,
}));

/** Clip demo phỏng vấn AI — hero (cột phải). */
const HOME_AI_DEMO_VIDEO =
  "https://res.cloudinary.com/dee4bvivu/video/upload/v1774336640/Female_delxmy.mp4";

/** Hero: video + overlay glass HUD (điểm AI, STAR, waveform, metrics). */
function HeroInterviewVideoCard() {
  const waveformHeights = [42, 68, 52, 82, 58, 90, 48, 76, 55, 88, 50, 72, 46, 80];
  const starBars = [78, 92, 65, 88, 72];

  return (
    <div className="relative mx-auto mt-8 w-full max-w-[min(100%,245.4px)] -translate-y-[2rem] translate-x-[4px] overflow-visible sm:max-w-[305.4px] lg:mx-0 lg:mt-0 lg:max-w-[405.4px] lg:-ml-2 lg:justify-self-end xl:max-w-[445.4px]">
      <div className="hero-video-frame relative rounded-[1.65rem] bg-white p-2 shadow-[0_16px_44px_rgba(99,14,212,0.14)] sm:rounded-[1.85rem] sm:p-2.5">
        <div
          className="relative overflow-hidden rounded-[1.2rem] bg-slate-100 sm:rounded-[1.35rem]"
          style={{ aspectRatio: "4 / 3.51" }}
        >
          <video
            autoPlay
            loop
            muted
            playsInline
            className="h-full w-full object-cover object-center"
          >
            <source src={HOME_AI_DEMO_VIDEO} type="video/mp4" />
          </video>
          <div
            className="pointer-events-none absolute inset-0 bg-violet-900/5"
            aria-hidden
          />

          {/* 92/100 — góc trên trái */}
          <div className="hero-video-glass absolute left-2 top-2 z-10 flex items-center gap-2 rounded-xl px-2.5 py-2 sm:left-3 sm:top-3 sm:rounded-2xl sm:px-3 sm:py-2.5">
            <div className="relative h-10 w-10 shrink-0 sm:h-11 sm:w-11">
              <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36" aria-hidden>
                <circle cx="18" cy="18" r="15.2" fill="none" stroke="#e8e0f5" strokeWidth="3" />
                <circle
                  cx="18"
                  cy="18"
                  r="15.2"
                  fill="none"
                  stroke="#8037f4"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray="86 96"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[9px] font-extrabold text-[#8037f4] sm:text-[10px]">
                92
              </span>
            </div>
            <p className="text-xs font-extrabold leading-tight text-slate-900 sm:text-sm">
              92<span className="text-[10px] font-bold text-slate-500 sm:text-[11px]">/100</span>
            </p>
          </div>

          {/* Waveform — giữa / trên laptop */}
          <div className="hero-video-glass absolute left-1/2 top-[42%] z-10 flex h-9 w-[min(88%,13rem)] -translate-x-1/2 items-end justify-center gap-[2px] rounded-xl px-2 py-1.5 sm:h-10 sm:gap-[3px] sm:rounded-2xl sm:px-2.5 sm:py-2">
            {waveformHeights.map((h, i) => (
              <span
                key={i}
                className="hero-video-wave w-[2.5px] rounded-full bg-[#8037f4] sm:w-[3px]"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>

          {/* Thanh STAR — dưới trái */}
          <div className="hero-video-glass absolute bottom-3 left-2 z-10 rounded-xl px-2.5 py-2 sm:bottom-4 sm:left-3 sm:rounded-2xl sm:px-3 sm:py-2.5">
            <div className="mb-1.5 flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star
                  key={n}
                  className="h-3 w-3 fill-amber-400 text-amber-400 sm:h-3.5 sm:w-3.5"
                  strokeWidth={1.5}
                />
              ))}
            </div>
            <div className="flex flex-col gap-1">
              {starBars.map((w, i) => (
                <div key={i} className="h-1.5 w-16 overflow-hidden rounded-full bg-violet-100 sm:w-[4.5rem]">
                  <div
                    className="h-full rounded-full bg-[#8037f4]"
                    style={{ width: `${w}%` }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Metrics — phải */}
          <div className="hero-video-glass absolute bottom-3 right-2 z-10 space-y-1 rounded-xl px-2.5 py-2 text-[9px] font-semibold text-slate-700 sm:bottom-4 sm:right-3 sm:rounded-2xl sm:px-3 sm:py-2.5 sm:text-[10px]">
            <div className="flex items-center justify-between gap-3">
              <span>Clarity</span>
              <span className="tracking-tight text-[#8037f4]">★★★★★</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>Confidence</span>
              <span className="font-extrabold text-[#8037f4]">95%</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span>Structure</span>
              <span className="inline-flex items-center gap-0.5 font-bold text-emerald-600">
                Excellent
                <CircleCheck className="h-3 w-3 shrink-0" strokeWidth={2.5} />
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Home() {
  const navigate = useNavigate();

  const renderSectionSticks = (sticks) => (
    <div className="pointer-events-none absolute inset-0 z-[1] hidden md:block" aria-hidden>
      {sticks.map((s, idx) => (
        <SparkleGlyph
          key={`section-stick-${idx}`}
          className="absolute"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            opacity: 1,
            filter: "drop-shadow(0 1px 2px rgba(15,23,42,0.12)) drop-shadow(0 0 8px rgba(95,0,240,0.35))",
            transform: `rotate(${typeof s.tilt === "number" ? s.tilt : idx % 4 === 0 ? 0 : idx % 4 === 1 ? -18 : idx % 4 === 2 ? 24 : -30
              }deg)`,
          }}
        />
      ))}
    </div>
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const scrollTarget = params.get("scrollTo");
    if (scrollTarget) {
      setTimeout(() => {
        const el = document.getElementById(scrollTarget);
        if (el) {
          el.scrollIntoView({ behavior: "smooth" });
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }, 500);
    }

  }, []);

  return (
    <div
      className="min-h-screen selection:bg-violet-100 selection:text-violet-900 font-sans overflow-x-hidden relative bg-transparent text-slate-900"
    >
      <style>{`
        .cute-glass {
          background: rgba(0,0,0,0.03);
          border: 1px solid rgba(255,255,255,0.1);
          backdrop-filter: blur(14px);
          box-shadow: 0 12px 40px rgba(0,0,0,0.28);
        }
        .cute-pill {
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(0,0,0,0.03);
        }
        .cute-card {
          position: relative;
          border-radius: 24px;
          border: 1px solid rgba(0,0,0,0.03);
          background: rgba(0,0,0,0.03);
          transform-style: preserve-3d;
          transition: transform .28s ease, border-color .25s ease, box-shadow .25s ease;
        }
        .cute-card:hover {
          transform: perspective(1000px) translateY(-7px) rotateX(2.5deg) rotateY(-2.5deg);
          border-color: rgba(128, 55, 244, 0.42);
          box-shadow:
            0 16px 40px rgba(0,0,0,0.4),
            0 0 36px -8px rgba(128, 55, 244, 0.18),
            0 0 0 1px rgba(128, 55, 244, 0.1) inset;
        }
        .parallax-layer {
          transform: translateZ(18px);
        }
        .card-glow {
          position: absolute;
          inset: -30% -20% auto auto;
          width: 160px;
          height: 160px;
          border-radius: 999px;
          background: rgba(110,53,232,0.12);
          opacity: 0;
          transition: opacity .25s ease;
          pointer-events: none;
        }
        .cute-card:hover .card-glow {
          opacity: 1;
        }
        .card-shine {
          position: absolute;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
          border-radius: inherit;
        }
        .card-shine::after {
          content: "";
          position: absolute;
          top: -120%;
          left: -45%;
          width: 35%;
          height: 300%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.14), transparent);
          transform: rotate(18deg) translateX(-180%);
          transition: transform .65s ease;
        }
        .cute-card:hover .card-shine::after {
          transform: rotate(18deg) translateX(480%);
        }
        .hero-title-stack {
          display: flex;
          flex-direction: column;
          gap: 0.7rem;
          line-height: 0.98;
        }
        .hero-title-line {
          display: block;
          line-height: 0.98;
          white-space: nowrap;
        }
        .cute-heading {
          letter-spacing: -0.04em;
          font-weight: 850;
        }
        .sticker-badge {
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.24);
          background: rgba(255,255,255,0.8);
          backdrop-filter: blur(10px);
          box-shadow: 0 10px 24px rgba(0,0,0,0.25);
        }
        .float-icon {
          animation: cuteFloat 3.1s ease-in-out infinite;
        }
        .float-icon-delay {
          animation: cuteFloat 3.1s ease-in-out infinite;
          animation-delay: .4s;
        }
        .float-icon-slow {
          animation: cuteFloat 4.2s ease-in-out infinite;
          animation-delay: .2s;
        }
        .hero-badge-animated {
          animation: heroGlowPulse 2.8s ease-in-out infinite;
        }
        .hero-title-animated {
          background-size: 200% 200%;
          animation: heroGradientFlow 5s ease-in-out infinite;
        }
        @keyframes heroWiggle {
          0% { transform: translate3d(0,0,0) rotate(0deg) scale(1); }
          18% { transform: translate3d(0.5px,-0.8px,0) rotate(-1deg) scale(1.01); }
          36% { transform: translate3d(-0.6px,0.6px,0) rotate(1.2deg) scale(1.02); }
          54% { transform: translate3d(0.4px,-0.4px,0) rotate(-0.8deg) scale(1.01); }
          72% { transform: translate3d(-0.4px,0.4px,0) rotate(0.8deg) scale(1.01); }
          100% { transform: translate3d(0,0,0) rotate(0deg) scale(1); }
        }
        .hero-title-highlight {
          display: inline-block;
          transform-origin: 40% 70%;
          animation: heroWiggle 1.25s ease-in-out infinite;
          will-change: transform;
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-title-highlight { animation: none; }
        }
        .hero-orbit-text {
          display: inline-block;
          animation: heroOrbitPop 4.8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          transform-origin: center;
          will-change: transform, opacity, filter;
        }
        @keyframes cuteFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-5px); }
        }
        @keyframes heroGlowPulse {
          0%, 100% {
            box-shadow: 0 0 0 rgba(110,53,232,0.0), 0 0 0 rgba(196, 255, 71,0.0);
            transform: translateY(0px);
          }
          50% {
            box-shadow: 0 8px 28px rgba(110,53,232,0.2), 0 0 20px rgba(196, 255, 71,0.12);
            transform: translateY(-1px);
          }
        }
        @keyframes heroGradientFlow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes heroOrbitPop {
          0% {
            opacity: 1;
            transform: translate(0px, 0px) scale(1) rotate(0deg);
            filter: blur(0px);
          }
          25% {
            opacity: 1;
            transform: translate(5px, -3px) scale(1.02) rotate(2deg);
            filter: blur(0px);
          }
          50% {
            opacity: 1;
            transform: translate(-4px, 2px) scale(0.99) rotate(-2deg);
            filter: blur(0px);
          }
          75% {
            opacity: 1;
            transform: translate(3px, -2px) scale(1.01) rotate(1deg);
            filter: blur(0px);
          }
          100% {
            opacity: 1;
            transform: translate(0px, 0px) scale(1) rotate(0deg);
            filter: blur(0px);
          }
        }
        @keyframes shimmer-bg {
          0% { opacity: 0.4; transform: translate(0,0) scale(1); }
          50% { opacity: 0.7; transform: translate(2%, -2%) scale(1.05); }
          100% { opacity: 0.4; transform: translate(0,0) scale(1); }
        }
        .landing-section-flow {
          position: relative;
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-orbit-text { animation: none !important; }
          .float-icon, .float-icon-delay, .float-icon-slow { animation: none !important; }
        }
        .font-headline {
          letter-spacing: -0.045em;
          text-shadow: none;
        }
        .hero-video-glass {
          border: 1px solid rgba(255, 255, 255, 0.82);
          background: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          box-shadow: 0 8px 26px rgba(99, 14, 212, 0.14);
        }
        .hero-video-wave {
          animation: heroVideoWave 1.35s ease-in-out infinite;
        }
        .hero-video-wave:nth-child(odd) { animation-delay: 0.12s; }
        .hero-video-wave:nth-child(4n) { animation-delay: 0.28s; }
        @keyframes heroVideoWave {
          0%, 100% { transform: scaleY(0.7); opacity: 0.8; }
          50% { transform: scaleY(1); opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-video-wave { animation: none !important; }
        }
        .glass-card {
          background: #ffffff;
          backdrop-filter: none;
          border-radius: 28px;
          border: 2px solid rgba(128, 55, 244, 0.32);
          transition: transform 0.35s ease, border-color 0.25s ease, box-shadow 0.35s ease;
          position: relative;
          overflow: hidden;
          box-shadow: 0 4px 18px rgba(15, 23, 42, 0.06);
        }
        .glass-card::before {
          content: '';
          position: absolute;
          inset: 0;
          background: transparent;
          pointer-events: none;
          opacity: 0;
        }
        .glass-card:hover {
          border-color: rgba(128, 55, 244, 0.48);
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
        }
        /* Bước Nổi bật — nền tím nhạt */
        .home-step-featured-dots {
          background: #f0ebf8;
          border-color: rgba(128, 55, 244, 0.42) !important;
          box-shadow: 0 2px 12px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(128, 55, 244, 0.14) inset;
        }
        .courses-glass-card {
          background: rgba(255, 255, 255, 0.78);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.55);
          border-radius: 24px;
          box-shadow: 0 8px 32px rgba(124, 58, 237, 0.08);
          transition: border-color 0.25s ease, box-shadow 0.3s ease, transform 0.3s ease;
        }
        .courses-glass-card:hover {
          border-color: rgba(124, 58, 237, 0.22);
          box-shadow: 0 12px 40px rgba(124, 58, 237, 0.14);
          transform: translateY(-2px);
        }
        .courses-cta-primary {
          background: #93f72b;
          color: #000000;
          box-shadow: 0 10px 24px rgba(147, 247, 43, 0.35);
        }
        .courses-cta-primary:hover {
          box-shadow: 0 14px 32px rgba(164, 214, 76, 0.45);
        }
        .courses-mascot-lean {
          object-fit: contain;
          object-position: left bottom;
        }
        @keyframes testimonial-marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        @keyframes testimonial-marquee-rev {
          0% {
            transform: translateX(-50%);
          }
          100% {
            transform: translateX(0);
          }
        }
        .testimonial-marquee-row {
          overflow: hidden;
          width: 100%;
        }
        .testimonial-marquee-row:hover .testimonial-marquee-track {
          animation-play-state: paused;
        }
        .testimonial-marquee-track {
          display: flex;
          width: max-content;
          gap: 1.5rem;
          animation: testimonial-marquee 44s linear infinite;
        }
        .testimonial-marquee-track--alt {
          animation: testimonial-marquee-rev 56s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .testimonial-marquee-track,
          .testimonial-marquee-track--alt {
            animation: none !important;
          }
        }
      `}</style>

      {/* ═══ HERO ═══════════════════════════════════════════ */}
      <section className="relative z-10 flex h-screen max-h-screen flex-col justify-start overflow-x-hidden px-10 sm:px-16 lg:px-24 pt-6 sm:pt-8 md:pt-10 lg:justify-center lg:pt-0 lg:pb-10">
        {renderSectionSticks([
          { x: 5, y: 11, size: 38, opacity: 0.48 },
          { x: 93, y: 13, size: 44, opacity: 0.55 },
          { x: 3, y: 50, size: 32, opacity: 0.4 },
          { x: 92, y: 80, size: 36, opacity: 0.46 },
        ])}

        <div className={`relative z-10 ${HOME_SHELL_MAX}`}>
          <div className="mx-auto flex max-w-4xl flex-col items-center text-center lg:py-2">
            <div className="hero-intro-badge mb-5 -translate-y-[4.5rem] flex justify-center">
              <div
                className="inline-flex items-center gap-2 rounded-full border-2 bg-white px-3 py-1.5 text-xs font-bold sm:text-sm"
                style={{
                  borderColor: "rgba(128, 55, 244, 0.42)",
                  color: "#8037f4",
                }}
              >
                <SparkleGlyph className="h-3.5 w-3.5 shrink-0" />
                {HOME_COPY.badge}
              </div>
            </div>

            <div className="hero-intro-copy -translate-y-[2rem] flex w-full flex-col items-center">
              <h1
                className="hero-title-stack mb-6 max-w-full font-headline text-center text-slate-900 cute-heading"
                style={{
                  fontSize: HOME_HERO_TITLE_CLAMP,
                }}
              >
                <span className="hero-title-line text-slate-900">
                  {HOME_COPY.titleLine1}{" "}
                  <span className="hero-title-highlight" style={{ color: "#8037f4" }}>
                    {HOME_COPY.titleHighlight}
                  </span>
                </span>
                <span className="hero-title-line text-slate-900">
                  {HOME_COPY.titleLine2}
                </span>
              </h1>

              <div className="mb-5 flex translate-y-[2rem] flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap">
                <button
                  type="button"
                  onClick={() => navigate("/mentors")}
                  className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-black transition-all hover:brightness-105 active:scale-[0.98] hover:-translate-y-0.5 sm:px-6 sm:text-base"
                  style={{
                    background: "#93f72b",
                    color: "#000000",
                    boxShadow: "0 8px 22px rgba(147, 247, 43, 0.35)",
                  }}
                >
                  <Users className="h-3.5 w-3.5" />
                  {HOME_COPY.ctaMentor}
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/cv-analysis")}
                  className="inline-flex items-center justify-center gap-2 rounded-full border-2 bg-white px-5 py-2.5 text-sm font-black transition-all hover:scale-[1.02] active:scale-[0.98] sm:px-6 sm:text-base"
                  style={{
                    borderColor: "rgba(128, 55, 244, 0.45)",
                    color: "#8037f4",
                    boxShadow: "0 6px 18px rgba(128, 55, 244, 0.12)",
                  }}
                >
                  <Lightning className="h-3.5 w-3.5" />
                  {HOME_COPY.cta}
                </button>
              </div>
            </div>
          </div>
        </div>

      </section>

      {/* ═══ HOW IT WORKS ════════════════════════════════════ */}
      <section
        id="features"
        className="landing-section-flow relative z-10 h-screen max-h-screen flex flex-col justify-center overflow-hidden pt-6 md:pt-8 lg:pt-10"
      >
        {renderSectionSticks([
          { x: 10, y: 16, size: 34, opacity: 0.45 },
          { x: 88, y: 20, size: 40, opacity: 0.55 },
          { x: 82, y: 78, size: 32, opacity: 0.44 },
        ])}
        <div className={`${HOME_SECTION_INNER} relative z-10 py-2`}>
          <LandingReveal className="mb-8 pt-5" y={24}>
            <div className="mx-auto mb-5 flex max-w-4xl flex-col items-center">
              <div className="flex items-center justify-center">
                <img
                  src="/mascot-features.png?v=7"
                  alt=""
                  aria-hidden
                  className="relative z-10 h-auto w-[11rem] shrink-0 -translate-x-[1.9rem] -translate-y-[0.35rem] rotate-[3deg] object-contain sm:w-[12.5rem] sm:-translate-y-[0.55rem] md:w-[14rem] lg:w-[15rem]"
                />
                <div className="relative z-0 -ml-[3.5rem] -translate-x-[0.1rem] text-left sm:-ml-[4rem] md:-ml-[4.35rem] lg:-ml-[4.75rem]">
                  <span className="mb-3 block h-1.5 w-12 rounded-full bg-[#8037f4]/40" />
                  <h2
                    className={homeTy.howItWorksTitle}
                    style={{ fontSize: HOME_SECTION_TITLE_CLAMP }}
                  >
                    {HOME_SECTION_COPY.howItWorks.titleLine1}
                    <br />
                    <span className="text-[#7c3aed]">{HOME_SECTION_COPY.howItWorks.titleLine2}</span>
                  </h2>
                </div>
              </div>
            </div>
          </LandingReveal>

          <LandingStagger className="grid grid-cols-1 gap-5 md:grid-cols-3" stagger={0.1}>
            {STEPS.map((s, i) => (
              <LandingItem key={i}>
              <div
                className={`glass-card group min-h-[12.5rem] p-6 sm:min-h-[13.25rem] sm:p-7 relative overflow-hidden h-full transition-[border-color,box-shadow] duration-300 ${i === 1
                  ? "home-step-featured-dots"
                  : i === 2
                    ? "border-violet-400/35 shadow-[0_0_0_1px_rgba(167,139,250,0.15)_inset]"
                    : "border-black/[0.05]"
                  }`}
                style={i === 1 ? undefined : {
                  background: "rgba(255,255,255,0.98)",
                  boxShadow: "0 12px 26px rgba(15,23,42,0.09), 0 2px 10px rgba(95,0,240,0.08)",
                }}
              >
                <div className="relative z-[1]">
                  {/* Hàng nhãn cố định — tránh absolute đè lên icon */}
                  <div className="mb-3.5 min-h-[32px] flex items-center justify-start">
                    {(i === 1 || i === 2) && (
                    <span
                        className={`inline-flex px-2 py-1 text-[10px] sm:text-[11px] font-bold tracking-wide rounded-md border ${i === 1
                          ? "border-[#8037f4]/50 bg-white/90 text-[#8037f4]"
                          : "border-violet-200 bg-violet-100 text-violet-800 shadow-sm"
                          }`}
                      >
                        {i === 1 ? "Nổi bật" : "Học thêm"}
                      </span>
                    )}
                  </div>
                  <div
                    className={`pointer-events-none absolute top-0 right-0 p-4 transition-opacity ${
                      i === 1 ? "" : "opacity-[0.18] group-hover:opacity-[0.26]"
                    }`}
                  >
                    <span
                      className={`text-8xl font-black italic leading-none ${
                        i === 1
                          ? "text-[#d4c8eb] group-hover:text-[#c9b9e6]"
                          : "text-[#8037f4]/30"
                      }`}
                    >
                      {s.step}
                    </span>
                  </div>

                  <div
                    className={`relative mb-4 flex h-12 w-12 items-center justify-center rounded-xl shadow-lg transition-all duration-500 sm:h-[3.25rem] sm:w-[3.25rem] ${
                      i === 0
                        ? "bg-[#8037f4] text-[#ffffff] shadow-[0_0_24px_rgba(167,139,250,0.12)]"
                        : i === 1
                          ? "border-2 border-[#630ed4] bg-white text-[#630ed4]"
                          : "border-2 border-[#8037f4]/35 bg-white text-[#8037f4] shadow-[0_0_20px_rgba(128,55,244,0.1)]"
                    }`}
                  >
                    <s.icon className="h-[1.4rem] w-[1.4rem] sm:h-6 sm:w-6" />
                  </div>

                  <h3 className={homeTy.howItWorksStepTitle}>{s.title}</h3>
                  <p className={homeTy.howItWorksStepBody}>{s.desc}</p>
                </div>
              </div>
              </LandingItem>
            ))}
          </LandingStagger>
        </div>
      </section>

      {/* ═══ CV ANALYSIS (navbar #features) ═══ */}
      <div className="landing-section-flow">
        <SectionReveal variant="cv">
          <CvAnalysisFeatureShowcase/>
        </SectionReveal>
      </div>

      <div className="landing-section-flow" style={{ perspective: "1400px" }}>
        <SectionReveal variant="mentor">
          <MentorFeatureShowcase/>
        </SectionReveal>
      </div>

      <div className="landing-section-flow">
        <SectionReveal variant="courses" delay={0.05}>
          <CoursesFeatureShowcase/>
        </SectionReveal>
      </div>



      {/* ═══ TESTIMONIALS ═══════════════════════════════════ */}
      <section
        id="mentors"
        className="landing-section-flow relative z-10 -mt-[5rem] h-[calc(100vh+3rem)] max-h-[calc(100vh+3rem)] min-h-[calc(100vh+3rem)] overflow-x-hidden"
      >
        {renderSectionSticks([
          { x: 78, y: 12, size: 34, opacity: 0.46 },
          { x: 92, y: 52, size: 36, opacity: 0.5 },
          { x: 10, y: 86, size: 30, opacity: 0.38 },
        ])}
        <div className={`${HOME_SECTION_INNER} relative z-10 flex h-full w-full flex-col justify-center py-4 sm:py-6`}>
          <div className="flex min-w-0 w-full flex-col items-start gap-8 overflow-visible lg:flex-row lg:items-center lg:gap-4">
            <div className="relative z-20 w-full shrink-0 lg:w-fit lg:max-w-[min(100%,40rem)]">
              <h2
                className="mb-0 flex w-full max-w-none flex-col items-start gap-0 font-headline font-extrabold leading-[1.08] tracking-tight text-slate-900"
                style={{ fontSize: HOME_SECTION_TITLE_CLAMP }}
              >
                <span className="block max-w-full leading-none tracking-tight lg:whitespace-nowrap">
                  {HOME_SECTION_COPY.testimonials.titleLine}
                </span>
                <img
                  src="/Logo.png"
                  alt="ProInterview"
                  className="mt-2 block h-11 w-auto max-w-[min(100%,20rem)] object-contain object-left contrast-[1.06] sm:mt-2.5 sm:h-12 sm:max-w-[min(100%,22rem)] md:h-[3.25rem] md:max-w-[min(100%,24rem)] lg:h-16"
                  decoding="async"
                />
              </h2>
              <p className={`mt-1 lg:max-w-none ${homeTy.body}`}>
                {HOME_SECTION_COPY.testimonials.body}
              </p>

              <div className="mt-4 flex items-center gap-3">
                <div className="flex -space-x-3">
                  {TESTIMONIALS.map((t) => (
                    <div
                      key={`avatar-${t.name}`}
                      className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-violet-50 shadow-sm"
                    >
                      <img
                        src={t.mascot}
                        alt=""
                        className="h-[85%] w-[85%] object-contain object-bottom"
                        onError={(e) => {
                          if (e.currentTarget.src !== HOME_MENTOR_MASCOTS.fallback) {
                            e.currentTarget.src = HOME_MENTOR_MASCOTS.fallback;
                          }
                        }}
                      />
                    </div>
                  ))}
                </div>
                <p className="text-lg text-slate-600 sm:text-xl">
                  <span className="font-black text-[#8037f4]">500+</span>{" "}
                  {HOME_SECTION_COPY.testimonials.socialProof}
                </p>
              </div>
            </div>

            <div className="relative z-10 flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-visible py-[0.9rem] lg:min-h-[22rem] lg:pl-0">
              <div className="mb-3 shrink-0">
                <div className={homeTy.badge}>
                  <SparkleGlyph className="size-3.5" />
                  {HOME_SECTION_COPY.testimonials.badge}
                </div>
              </div>
              <div
                className="relative w-full overflow-hidden"
                style={{
                  maskImage:
                    "linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)",
                  WebkitMaskImage:
                    "linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)",
                }}
              >
                <div className="space-y-6">
                  <div className="testimonial-marquee-row">
                    <div className="testimonial-marquee-track">
                      {[...TESTIMONIALS, ...TESTIMONIALS].map((t, i) => (
                        <div
                          key={`marq1-${i}-${t.name}`}
                          className="shrink-0 w-[min(100%,17.5rem)] sm:w-[17.5rem] lg:w-[18.5rem] bg-white border border-slate-200 rounded-2xl p-5 shadow-sm sm:p-6"
                        >
                          <div className="flex items-center gap-2.5 mb-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-violet-100 bg-violet-50">
                              <img
                                src={t.mascot}
                                alt=""
                                className="h-[88%] w-[88%] object-contain object-bottom"
                                onError={(e) => {
                                  if (e.currentTarget.src !== HOME_MENTOR_MASCOTS.fallback) {
                                    e.currentTarget.src = HOME_MENTOR_MASCOTS.fallback;
                                  }
                                }}
                              />
                            </div>
                            <p className="text-xs uppercase tracking-widest text-[#8037f4] font-black leading-tight sm:text-sm">{t.tag}</p>
                          </div>
                          <p className="text-base text-slate-700 leading-snug line-clamp-2 sm:text-lg">"{t.text}"</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="testimonial-marquee-row">
                    <div className="testimonial-marquee-track testimonial-marquee-track--alt">
                      {[...TESTIMONIALS, ...TESTIMONIALS].map((t, i) => (
                        <div
                          key={`marq2-${i}-${t.name}`}
                          className="shrink-0 w-[min(100%,17.5rem)] sm:w-[17.5rem] lg:w-[18.5rem] bg-white border border-slate-200 rounded-2xl p-5 shadow-sm sm:p-6"
                        >
                          <div className="flex gap-1 mb-3">
                            {[...Array(t.stars)].map((_, j) => (
                              <Star key={`${t.name}-s-${i}-${j}`} className="size-4 text-yellow-400 fill-yellow-400" />
                            ))}
                          </div>
                          <p className="mb-2.5 text-base leading-snug text-slate-700 line-clamp-2 sm:text-lg">"{t.text}"</p>
                          <p className="text-base text-slate-600 font-semibold sm:text-lg">{t.name}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="pointer-events-none absolute inset-y-0 left-0 z-[2] w-12 bg-gradient-to-r from-[#f3f0f9] via-[#f3f0f9]/80 to-transparent sm:w-14" />
                <div className="pointer-events-none absolute inset-y-0 right-0 z-[2] w-12 bg-gradient-to-l from-[#f3f0f9] via-[#f3f0f9]/80 to-transparent sm:w-14" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ══════════════════════════════════════════ */}
      <Footer variant="light" />
    </div>
  );
}