import React from "react";
import { FileText } from "lucide-react";
import { HOME_SECTION_INNER } from "../layout/customerShellLayout";
import {
  CvAnalysisScoreBreakdown,
  CV_HUB_DEMO_MATCH,
  CV_HUB_DEMO_SCORE_ROWS,
  CV_HOME_DEMO_JD_KEYWORDS,
} from "../cv/CvAnalysisScoreBreakdown";
import { CV_HUB_HERO_COPY, CV_SHOWCASE_COPY } from "../../constants/brandVoice";
import {
  homeSectionTitleStyle,
  homeSectionClasses as ty,
} from "../../constants/homeTypography";

const DEMO_MATCH = CV_HUB_DEMO_MATCH;

function ScoreCard({
  title,
  score,
  scoreClass,
  scoreBg,
  scoreBorder,
  children,
  className = "",
  titleClassName = "",
}) {
  return (
    <div
      className={`cv-analysis-glass-card rounded-3xl border border-[#ccc3d8] bg-white px-[1.5rem] py-[0.875rem] shadow-xl transition-all duration-300 hover:scale-[1.02] sm:px-[1.75rem] sm:py-[1.15rem] max-lg:rounded-xl max-lg:px-4 max-lg:py-3 max-lg:shadow-md ${className}`}
    >
      <div className={`flex items-center justify-between gap-3 ${children ? "mb-3 sm:mb-3.5" : ""}`}>
        <h3 className={`${ty.cardTitle} ${titleClassName}`}>{title}</h3>
        <span
          className={`${ty.cardScore} ${scoreBg} ${scoreClass} ${scoreBorder}`}
        >
          {score}
        </span>
      </div>
      {children ? <ul className="space-y-2">{children}</ul> : null}
    </div>
  );
}

function CardReveal({ delayMs = 0, className = "", children }) {
  return (
    <div
      className={`cv-score-card-reveal w-full ${className}`}
      style={{ animationDelay: `${delayMs}ms` }}
    >
      {children}
    </div>
  );
}

/** Showcase phân tích CV, màn riêng trên Home; navbar vẫn active Lộ trình (#features). */
export function CvAnalysisFeatureShowcase({ onCtaClick }) {
  return (
    <section
      id="cv-analysis"
      className="home-mobile-tight relative z-10 flex min-h-svh flex-col justify-center overflow-x-clip overflow-y-visible px-0 py-10 sm:py-14 bg-cv-analysis-panel"
    >
      <style>{`
        .bg-cv-analysis-panel {
          background-color: #f2e8ff;
        }
        .cv-analysis-glass-card {
          background-color: #ffffff;
        }
        .cv-showcase-card {
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(168, 139, 250, 0.28);
          background: rgba(255, 255, 255, 0.98);
          box-shadow:
            0 24px 54px rgba(109, 40, 217, 0.10),
            0 8px 18px rgba(15, 23, 42, 0.05);
        }
        .cv-showcase-card::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: linear-gradient(180deg, rgba(255,255,255,0.72) 0%, rgba(255,255,255,0) 32%);
        }
        .cv-keyword-pill {
          border: 1px solid rgba(176, 230, 45, 0.82);
          background: linear-gradient(180deg, #fcfff6 0%, #f6fde8 100%);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.85);
          color: #415818;
        }
        @keyframes cv-score-card-grow {
          0% {
            opacity: 0;
            transform: scale(0.88);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        .cv-score-card-reveal {
          transform-origin: center top;
          animation: cv-score-card-grow 0.6s cubic-bezier(0.22, 1.12, 0.36, 1) both;
        }
        @media (prefers-reduced-motion: reduce) {
          .cv-score-card-reveal {
            animation: none;
            opacity: 1;
          }
        }
      `}</style>
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
        <div
          className="absolute -left-24 top-1/4 h-[26rem] w-[26rem]"
          style={{
            background: "#e4d2f6",
            borderRadius: "42% 58% 65% 35% / 45% 45% 55% 55%",
          }}
        />
        <div
          className="absolute -right-28 -bottom-20 h-80 w-80"
          style={{
            background: "#e4d2f6",
            borderRadius: "58% 42% 35% 65% / 55% 60% 40% 45%",
          }}
        />
        <svg viewBox="0 0 100 100" className="absolute right-[8%] bottom-[10%] h-28 w-28 rotate-6" fill="none">
          <path
            d="M15 68C11 46 32 30 52 38C72 46 74 70 56 76C38 82 24 66 32 52C40 38 62 32 82 40"
            stroke="#7c3aed"
            strokeOpacity="0.3"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div className={`home-mobile-gutter relative z-10 flex w-full items-center overflow-visible py-2 ${HOME_SECTION_INNER}`}>
        <div className="grid w-full grid-cols-1 items-center gap-4 overflow-visible max-lg:gap-3 lg:grid-cols-[minmax(0,1.14fr)_minmax(0,0.86fr)] lg:gap-6 xl:gap-7 lg:-translate-x-8">
          <article className="relative z-10 flex min-w-0 flex-col items-start gap-3 sm:gap-3.5 lg:-translate-y-10">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#7c3aed]/30 bg-[#7c3aed]/10 px-3.5 py-1 font-semibold text-[#7c3aed] text-[0.975rem] sm:text-[1.1rem]">
              <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {CV_SHOWCASE_COPY.badge}
            </span>
            <h2
              className={`home-section-title max-w-full font-headline font-normal leading-[1.08] tracking-tight text-[#000000] sm:max-w-none`}
              style={homeSectionTitleStyle}
            >
              <span className={`block leading-[1.08] text-[#000000]`}>
                Làm sao để CV ấn tượng
              </span>
              <span className={`block leading-[1.08] font-headline text-[#7c3aed]`}>
                trong mắt nhà tuyển dụng?
              </span>
            </h2>
            <p className={`max-w-full lg:max-w-none text-pretty font-medium leading-relaxed text-slate-600 text-[1.225rem] sm:text-[1.35rem]`}>
              <span className="hidden sm:block">
                <span className="block whitespace-nowrap">{CV_HUB_HERO_COPY.bodyLine1}</span>
                <span className="block whitespace-nowrap">{CV_HUB_HERO_COPY.bodyLine2}</span>
              </span>
              <span className="block sm:hidden">{CV_SHOWCASE_COPY.body}</span>
            </p>
            {onCtaClick ? (
              <button
                type="button"
                onClick={onCtaClick}
                className={`${ty.cta} text-[#000000] hover:brightness-110`}
                style={{
                  background: "#93f72b",
                  boxShadow: "0 8px 20px rgba(15,23,42,0.08)",
                }}
              >
                {CV_SHOWCASE_COPY.cta}
              </button>
            ) : null}
          </article>

          <section className="cv-showcase-visual relative z-10 flex min-w-0 origin-center scale-[0.92] flex-col items-center justify-center overflow-visible max-lg:scale-[0.9] sm:scale-[0.96] translate-x-[0.2rem] lg:translate-x-12 lg:scale-100 lg:-translate-y-4 lg:justify-self-center">
            <div className="relative mx-auto w-full max-w-[31rem] overflow-visible">
              <div className="pointer-events-none absolute left-[calc(50%-0.3rem)] top-0 z-[5] w-[14.5rem] -translate-x-1/2 -translate-y-[1.73rem] sm:w-[16.5rem] sm:-translate-y-[2.93rem] lg:w-[18rem] lg:-translate-y-[3.13rem]">
                <img
                  src="/mascot-cv-analysis-pose7.png?v=1"
                  alt=""
                  aria-hidden
                  className="block h-auto w-full object-contain"
                />
              </div>

              <div className="relative z-10 flex w-full flex-col -space-y-4 pt-[8.25rem] sm:pt-[9rem] lg:pt-[9.5rem]">
                <CardReveal delayMs={0} className="relative z-10 translate-x-5 lg:translate-x-9">
                  <ScoreCard
                    className="cv-showcase-card rotate-[1.25deg] scale-[0.97] transform rounded-[2rem] px-[1.65rem] py-[1.05rem] sm:px-[1.9rem] sm:py-[1.3rem] max-lg:px-[1.15rem] max-lg:py-[0.9rem]"
                    titleClassName="translate-y-[0.2rem]"
                    title="Độ khớp CV–JD"
                    score={`${DEMO_MATCH.percent}% Khá tốt`}
                    scoreBg="bg-[#e6f7ed]"
                    scoreClass="text-[#2e7d32]"
                    scoreBorder="border-[#c8e6c9]"
                  />
                </CardReveal>

                <CardReveal delayMs={140} className="relative z-20 lg:-translate-x-5">
                  <div className="cv-showcase-card -rotate-[1.1deg] scale-100 transform rounded-[2rem] px-[1.55rem] py-[0.95rem] sm:px-[1.8rem] sm:py-[1.2rem]">
                    <div className="mb-3 flex items-center gap-2.5 sm:mb-3.5">
                      <div className="flex h-[1.8rem] w-[1.8rem] shrink-0 items-center justify-center rounded-xl bg-violet-100 sm:h-[2rem] sm:w-[2rem]">
                        <FileText className="h-[0.7rem] w-[0.7rem] text-[#7c3aed] sm:h-[0.825rem] sm:w-[0.825rem]" />
                      </div>
                      <h3 className={ty.cardTitle}>Từ khóa khớp với JD</h3>
                    </div>
                    <div className="flex flex-wrap gap-2.5">
                      {CV_HOME_DEMO_JD_KEYWORDS.map((kw) => (
                        <span
                          key={kw}
                          className="cv-keyword-pill rounded-full px-2.5 py-1 text-sm font-semibold lowercase sm:text-base"
                        >
                          {kw} ✓
                        </span>
                      ))}
                    </div>
                  </div>
                </CardReveal>

                <CardReveal
                  delayMs={280}
                  className="relative z-30 -mx-4 w-[calc(100%+2rem)] sm:-mx-5 sm:w-[calc(100%+2.5rem)] lg:-mx-6 lg:w-[calc(100%+3rem)]"
                >
                  <div className="cv-showcase-card relative w-full rotate-[0.85deg] scale-[1.02] transform overflow-hidden rounded-[2rem]">
                    <CvAnalysisScoreBreakdown
                      overallScore={DEMO_MATCH.percent}
                      rows={CV_HUB_DEMO_SCORE_ROWS}
                      compact
                      homePreview
                      showHeader={false}
                      className="!rounded-none !border-0 !shadow-none"
                    />
                  </div>
                </CardReveal>
              </div>
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
