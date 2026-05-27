import React from "react";
import { FileText } from "lucide-react";
import { HOME_SECTION_INNER } from "../layout/customerShellLayout";
import {
  CvAnalysisScoreBreakdown,
  CV_HUB_DEMO_MATCH,
  CV_HUB_DEMO_SCORE_ROWS,
  CV_HOME_DEMO_JD_KEYWORDS,
} from "../cv/CvAnalysisScoreBreakdown";
import { CV_SHOWCASE_COPY } from "../../constants/brandVoice";
import {
  HOME_CV_SHOWCASE_TITLE_CLAMP,
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
}) {
  return (
    <div
      className={`cv-analysis-glass-card rounded-3xl border border-[#ccc3d8] bg-white px-[1.5rem] py-[0.875rem] shadow-xl transition-all duration-300 hover:scale-[1.02] sm:px-[1.75rem] sm:py-[1.15rem] ${className}`}
    >
      <div className={`flex items-center justify-between gap-3 ${children ? "mb-3 sm:mb-3.5" : ""}`}>
        <h3 className={ty.cardTitle}>{title}</h3>
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

function MascotSparkle({ className }) {
  return (
    <span
      className={`pointer-events-none absolute block h-3 w-3 rotate-45 rounded-[2px] bg-[#FACC15] shadow-sm ${className}`}
      aria-hidden
    />
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

/** Showcase phân tích CV — màn riêng trên Home; navbar vẫn active Lộ trình (#features). */
export function CvAnalysisFeatureShowcase({ onCtaClick }) {
  return (
    <section
      id="cv-analysis"
      className="relative z-10 flex h-screen max-h-screen flex-col justify-center overflow-x-hidden overflow-y-visible px-0 py-4 sm:py-6"
    >
      <style>{`
        .cv-analysis-glass-card {
          background-color: #ffffff;
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
      <div className={`relative z-10 flex w-full items-center overflow-visible py-2 ${HOME_SECTION_INNER}`}>
        <div className="grid w-full origin-center scale-[0.92] grid-cols-1 items-center gap-4 overflow-visible sm:scale-[0.96] lg:grid-cols-[minmax(0,1.14fr)_minmax(0,0.86fr)] lg:scale-100 lg:gap-6 xl:gap-7">
          <article className="relative z-10 flex min-w-0 flex-col items-start gap-3 sm:gap-3.5">
            <span className={ty.cvShowcaseBadge}>
              <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {CV_SHOWCASE_COPY.badge}
            </span>
            <h2 className={`max-w-full ${ty.title}`}>
              <span className={ty.titleLineDark} style={{ fontSize: HOME_CV_SHOWCASE_TITLE_CLAMP }}>
                {CV_SHOWCASE_COPY.titleLine1}
              </span>
              <span
                className={`mt-0.5 ${ty.titleLineAccent}`}
                style={{ fontSize: HOME_CV_SHOWCASE_TITLE_CLAMP }}
              >
                {CV_SHOWCASE_COPY.titleLine2}
              </span>
            </h2>
            <p className={`max-w-full lg:max-w-lg ${ty.cvShowcaseBody}`}>
              {CV_SHOWCASE_COPY.body}
            </p>
            {onCtaClick ? (
              <button
                type="button"
                onClick={onCtaClick}
                className={`${ty.cta} text-[#0f172a] hover:brightness-110`}
                style={{
                  background: "#93f72b",
                  boxShadow: "0 8px 20px rgba(15,23,42,0.08)",
                }}
              >
                {CV_SHOWCASE_COPY.cta}
              </button>
            ) : null}
          </article>

          <section className="cv-showcase-visual relative z-10 flex min-w-0 flex-col items-center justify-center overflow-visible lg:justify-self-center">
            <div className="relative mx-auto w-full max-w-[31rem] overflow-visible">
              <div className="pointer-events-none absolute left-1/2 top-0 z-0 w-[11.7rem] -translate-x-1/2 -translate-y-[1.14rem] sm:w-[13.7rem] sm:-translate-y-[1.39rem] lg:w-[15.2rem] lg:-translate-y-[1.64rem]">
                <div className="relative">
                  <MascotSparkle className="left-[14%] top-[18%] h-2 w-2 sm:left-[16%]" />
                  <MascotSparkle className="left-[10%] top-[34%] h-1.5 w-1.5 opacity-90 sm:left-[12%]" />
                  <img
                    src="/mascot-cv-analysis.png?v=2"
                    alt=""
                    aria-hidden
                    className="block h-auto w-full object-contain"
                  />
                </div>
              </div>

              <div className="relative z-10 flex w-full flex-col -space-y-3 pt-[7.75rem] sm:pt-[8.5rem] lg:pt-[9rem]">
                <CardReveal delayMs={0} className="relative z-10 translate-x-4 lg:translate-x-8">
                  <ScoreCard
                    className="rotate-1 scale-95 transform"
                    title="Độ khớp CV–JD"
                    score={`${DEMO_MATCH.percent}% Khá tốt`}
                    scoreBg="bg-[#e6f7ed]"
                    scoreClass="text-[#2e7d32]"
                    scoreBorder="border-[#c8e6c9]"
                  />
                </CardReveal>

                <CardReveal delayMs={140} className="relative z-20 lg:-translate-x-4">
                  <div className="cv-analysis-glass-card -rotate-1 scale-100 transform rounded-3xl border border-[#ccc3d8] bg-white px-[1.5rem] py-[0.875rem] shadow-xl transition-all duration-300 hover:scale-[1.02] sm:px-[1.75rem] sm:py-[1.15rem]">
                    <div className="mb-3 flex items-center gap-2.5 sm:mb-3.5">
                      <div className="flex h-[1.7rem] w-[1.7rem] shrink-0 items-center justify-center rounded-lg bg-violet-100 sm:h-[1.95rem] sm:w-[1.95rem]">
                        <FileText className="h-[0.7rem] w-[0.7rem] text-[#6d2fd6] sm:h-[0.825rem] sm:w-[0.825rem]" />
                      </div>
                      <h3 className={ty.cardTitle}>Từ khóa khớp với JD</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {CV_HOME_DEMO_JD_KEYWORDS.map((kw) => (
                        <span
                          key={kw}
                          className="rounded-full border border-lime-400/70 bg-lime-50 px-2.5 py-1 text-sm font-semibold lowercase text-emerald-900 sm:text-base"
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
                  <div className="cv-analysis-glass-card relative w-full rotate-1 scale-[1.03] transform overflow-hidden rounded-3xl border border-[#ccc3d8] bg-white shadow-xl transition-all duration-300 hover:scale-[1.02]">
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
