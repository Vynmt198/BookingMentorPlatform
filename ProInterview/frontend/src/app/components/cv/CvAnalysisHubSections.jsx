import React, { useCallback, useEffect, useRef, useState } from "react";
import { FileText, Briefcase } from "lucide-react";
import {
  CvAnalysisScoreBreakdown,
  CV_HUB_DEMO_SCORE_ROWS,
  CV_HUB_DEMO_MATCH,
} from "./CvAnalysisScoreBreakdown";
import { CV_HUB_HERO_COPY, CV_SHOWCASE_COPY } from "../../constants/brandVoice";
import { HOME_SECTION_TITLE_CLAMP } from "../../constants/homeTypography";
import { CUSTOMER_SHELL_GUTTER, CUSTOMER_SHELL_MAX } from "../layout/customerShellLayout";
import { CustomerPageBadge } from "../layout/CustomerPageHeader";

const HUB_STYLES = `
  .cv-hub-enter {
    animation: cvHubIn 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
  }
  @keyframes cvHubIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .cv-hub-cta {
    transition: transform 0.28s cubic-bezier(0.34, 1.45, 0.64, 1), box-shadow 0.28s ease, filter 0.2s ease;
  }
  .cv-hub-cta:hover {
    transform: scale(1.045) translateY(-2px);
  }
  .cv-hub-cta:active {
    transform: scale(0.98) translateY(0);
  }
  @media (min-width: 1024px) {
    .cv-hub-unified-shell {
      display: flex;
      width: 100%;
      min-width: 0;
      justify-content: center;
      overflow: visible;
    }
    .cv-hub-scale-host {
      position: relative;
      overflow: visible;
    }
    .cv-hub-unified-block--scaled {
      transform-origin: top left;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .cv-hub-enter { animation: none; opacity: 1; transform: none; }
    .cv-hub-cta { transition: none; }
    .cv-hub-cta:hover,
    .cv-hub-cta:active { transform: none; }
  }
`;

const LG_UNIFIED_MQ = "(min-width: 1024px)";

export function CvAnalysisHubHero({ onJd, onField, navShellAligned = false }) {
  const { percent, matched, missing, summary } = CV_HUB_DEMO_MATCH;
  const shellRef = useRef(null);
  const blockRef = useRef(null);
  const [unifiedFit, setUnifiedFit] = useState({
    scale: 1,
    naturalW: 0,
    naturalH: 0,
    layoutW: 0,
    layoutH: 0,
  });

  const measureUnifiedScale = useCallback(() => {
    const shell = shellRef.current;
    const block = blockRef.current;
    if (!shell || !block || !navShellAligned) {
      setUnifiedFit({ scale: 1, naturalW: 0, naturalH: 0, layoutW: 0, layoutH: 0 });
      return;
    }

    if (!window.matchMedia(LG_UNIFIED_MQ).matches) {
      setUnifiedFit({ scale: 1, naturalW: 0, naturalH: 0, layoutW: 0, layoutH: 0 });
      block.style.transform = "";
      return;
    }

    block.style.transform = "none";
    const naturalW = block.offsetWidth;
    const naturalH = block.offsetHeight;
    const viewport = shell.closest(".cv-hub-viewport");
    const pad = 16;
    const availableW = Math.max(0, shell.clientWidth - pad);
    const availableH = Math.max(
      0,
      (viewport?.clientHeight ?? shell.clientHeight) - pad,
    );
    if (!naturalW || !naturalH || !availableW || !availableH) return;

    const scale = Math.min(1, availableW / naturalW, availableH / naturalH);
    setUnifiedFit({
      scale,
      naturalW,
      naturalH,
      layoutW: naturalW * scale,
      layoutH: naturalH * scale,
    });
  }, [navShellAligned]);

  useEffect(() => {
    if (!navShellAligned) return undefined;

    requestAnimationFrame(() => {
      requestAnimationFrame(measureUnifiedScale);
    });
    const shell = shellRef.current;
    const block = blockRef.current;
    const mq = window.matchMedia(LG_UNIFIED_MQ);

    const ro =
      shell && block
        ? new ResizeObserver(() => {
            requestAnimationFrame(measureUnifiedScale);
          })
        : null;

    if (ro) {
      ro.observe(shell);
      ro.observe(block);
    }

    const onMqChange = () => requestAnimationFrame(measureUnifiedScale);
    mq.addEventListener("change", onMqChange);
    window.addEventListener("resize", measureUnifiedScale);

    return () => {
      ro?.disconnect();
      mq.removeEventListener("change", onMqChange);
      window.removeEventListener("resize", measureUnifiedScale);
    };
  }, [navShellAligned, measureUnifiedScale]);

  const outerClass = navShellAligned
    ? "relative flex min-h-0 flex-col bg-transparent pb-2 pt-2 sm:pb-3 lg:pb-1 lg:pt-0"
    : `relative flex min-h-0 flex-col bg-transparent pb-4 pt-12 sm:pb-5 ${CUSTOMER_SHELL_GUTTER}`;

  const shellClass = navShellAligned
    ? "cv-hub-unified-shell w-full min-w-0"
    : `cv-hub-unified-shell ${CUSTOMER_SHELL_MAX} w-full min-w-0`;

  const unifiedBlockClass = [
    "cv-hub-unified-block cv-hub-enter flex w-full min-w-0 flex-col gap-6 sm:gap-8",
    navShellAligned ? "" : "mx-auto",
    "lg:w-max lg:max-w-none lg:flex-row lg:flex-nowrap lg:items-start lg:justify-start lg:gap-[2.5rem] xl:gap-[3.5rem]",
    navShellAligned ? "cv-hub-unified-block--scaled" : "",
  ].join(" ");

  const { scale, layoutW, layoutH } = unifiedFit;
  const hostStyle =
    navShellAligned && layoutW > 0 && layoutH > 0
      ? { width: layoutW, height: layoutH }
      : undefined;
  const blockStyle =
    navShellAligned && scale < 1
      ? { transform: `scale(${scale})`, transformOrigin: "top left" }
      : undefined;

  const unifiedInner = (
    <div
      ref={navShellAligned ? blockRef : null}
      className={unifiedBlockClass}
      style={blockStyle}
    >
      <div
        className={`cv-hub-unified-col cv-hub-unified-col--copy relative flex min-w-0 shrink-0 flex-col justify-center py-3 sm:py-4 lg:max-w-[44rem] lg:translate-y-20 ${
          navShellAligned ? "lg:py-0" : "lg:py-2"
        }`}
      >
        <div className="relative z-10 flex min-w-0 flex-col gap-2.5 sm:gap-3">
          {!navShellAligned && <CustomerPageBadge className="w-fit">Phân tích CV</CustomerPageBadge>}
          <h1 className="min-w-0 max-w-full font-headline tracking-tight">
            <span
              className="hidden flex-col gap-[0.25rem] font-extrabold leading-[1.06] lg:flex"
              style={{ fontSize: HOME_SECTION_TITLE_CLAMP }}
            >
              <span className="block text-pretty text-[#630ed4]">
                {CV_HUB_HERO_COPY.titleAccent}
              </span>
              <span className="block text-[#1a1b23] lg:whitespace-nowrap">
                {CV_HUB_HERO_COPY.titleRest}
              </span>
            </span>

            <span className="block text-[clamp(1.5rem,3.5vw,3.25rem)] font-extrabold leading-[1.12] lg:hidden">
              <span className="block text-[#630ed4]">Làm sao để CV ấn tượng</span>
              <span className="mt-0.5 block text-[#1a1b23] sm:whitespace-nowrap">
                trong mắt nhà tuyển dụng?
              </span>
            </span>
            <p className="mt-2 min-w-0 max-w-full text-sm font-medium leading-relaxed text-violet-700/90 sm:text-lg">
              ProInterview giúp bạn kiểm tra, góp ý và cải thiện CV trước khi gửi đến nhà
              <br className="hidden lg:block" />
              tuyển dụng.
            </p>
          </h1>

          <div className="flex flex-col gap-2 pt-0.5 max-sm:items-stretch sm:flex-row sm:flex-nowrap sm:items-center sm:justify-start sm:gap-2.5 lg:gap-3">
            <button
              type="button"
              onClick={onJd}
              className="cv-hub-cta inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-2xl bg-gradient-to-br from-[#630ed4] to-[#7c3aed] px-4 py-2 text-sm font-bold text-white shadow-lg shadow-violet-500/25 hover:brightness-105 hover:shadow-xl hover:shadow-violet-500/30 sm:px-5 sm:py-2.5 sm:text-base"
            >
              {CV_HUB_HERO_COPY.ctaJd}
            </button>
            <button
              type="button"
              onClick={onField}
              className="cv-hub-cta inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-2xl border-2 border-violet-200/80 bg-white/90 px-4 py-2 text-sm font-bold text-[#630ed4] shadow-sm backdrop-blur-sm hover:border-violet-300 hover:bg-white hover:shadow-md sm:px-5 sm:py-2.5 sm:text-base"
            >
              {CV_HUB_HERO_COPY.ctaField}
            </button>
          </div>
        </div>
      </div>

      <div className="cv-hub-unified-col cv-hub-unified-col--demo flex w-full min-w-0 shrink-0 flex-col gap-0 lg:w-[33rem] xl:w-[34.5rem]">
        <div className="cv-hub-demo-stack -mt-0.5 flex w-full min-w-0 max-w-full flex-col lg:mt-0 lg:pt-0">
          <div
            className="cv-hub-report-shell relative w-full overflow-hidden rounded-xl border border-violet-950/10 bg-white sm:rounded-[1.15rem]"
            style={{
              boxShadow:
                "0 28px 54px -16px rgba(128,55,244,0.32), 0 6px 16px -4px rgba(128,55,244,0.16)",
            }}
          >
            <div
              className="relative overflow-hidden px-3.5 py-4 text-white sm:px-4 sm:py-5 lg:px-4 lg:py-7"
              style={{ backgroundColor: "#8037f4" }}
            >
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.08] mix-blend-overlay"
                style={{
                  backgroundImage:
                    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
                }}
                aria-hidden
              />
              <div
                className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-[#93f72b]/20 blur-3xl"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute -left-10 -bottom-14 h-32 w-32 rounded-full bg-white/10 blur-3xl"
                aria-hidden
              />
              <p className="relative mb-1.5 text-[11px] font-medium text-violet-100/90 sm:text-xs">
                Mức độ phù hợp CV
              </p>
              <div className="relative flex flex-wrap items-end gap-2.5">
                <span className="font-headline text-[1.65rem] font-extrabold leading-none tracking-tight [font-variant-numeric:tabular-nums] sm:text-[2rem]">
                  {percent}%
                </span>
                <div className="mb-1 flex min-w-[6rem] flex-1 flex-col gap-1">
                  <span className="text-[11px] text-violet-100 sm:text-xs">keyword match</span>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/20 sm:h-2">
                    <div
                      className="h-full rounded-full bg-[#93f72b]"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              </div>
              <p className="relative mt-2 line-clamp-2 text-[11px] leading-snug text-violet-50/90 sm:text-xs">
                {summary}
              </p>
            </div>

            <div className="relative z-10 grid grid-cols-10 items-start divide-x divide-violet-100/70 border-b border-violet-100/70">
              <div className="col-span-6 p-3 sm:p-4">
                <div className="mb-1 flex items-center gap-1.5">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-lime-100 sm:h-7 sm:w-7">
                    <FileText className="h-3.5 w-3.5 text-[#28552a] sm:h-4 sm:w-4" />
                  </div>
                  <h3 className="text-[11px] font-semibold text-slate-900 sm:text-xs">Từ khóa khớp</h3>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {matched.map((kw) => (
                    <span
                      key={kw}
                      className="rounded-md bg-lime-50 px-2 py-0.5 text-[10px] font-semibold text-[#415818] sm:text-[11px]"
                    >
                      {kw} ✓
                    </span>
                  ))}
                </div>
              </div>
              <div className="col-span-4 p-3 sm:p-4">
                <div className="mb-1 flex items-center gap-1.5">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-orange-100 sm:h-7 sm:w-7">
                    <Briefcase className="h-3.5 w-3.5 text-orange-700 sm:h-4 sm:w-4" />
                  </div>
                  <h3 className="text-[11px] font-semibold text-slate-900 sm:text-xs">Cần bổ sung</h3>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {missing.map((kw) => (
                    <span
                      key={kw}
                      className="rounded-md bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-orange-900 sm:text-[11px]"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="relative hidden w-full min-w-0 overflow-visible lg:block">
              <CvAnalysisScoreBreakdown
                overallScore={percent}
                rows={CV_HUB_DEMO_SCORE_ROWS}
                compact
                hubPreview
                showHeader={false}
                className="relative z-10 w-full min-w-0 overflow-hidden !rounded-none !border-0 !shadow-none"
              />
            </div>

            <div className="w-full lg:hidden">
              <CvAnalysisScoreBreakdown
                overallScore={percent}
                rows={CV_HUB_DEMO_SCORE_ROWS}
                compact
                hubPreview
                showHeader={false}
                className="w-full !rounded-none !border-0 !shadow-none"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="cv-hub-page relative min-h-0 bg-transparent">
      <style>{HUB_STYLES}</style>

      <div className={outerClass}>
        <div ref={navShellAligned ? shellRef : null} className={shellClass}>
          {navShellAligned ? (
            <div className="cv-hub-scale-host lg:-translate-x-2" style={hostStyle}>
              {unifiedInner}
            </div>
          ) : (
            unifiedInner
          )}
        </div>
      </div>
    </div>
  );
}
