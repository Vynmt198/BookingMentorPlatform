import React from "react";
import { Users, Star, Search, CircleCheck } from "lucide-react";
import { HOME_SECTION_INNER } from "../layout/customerShellLayout";
import { SparkleGlyph } from "../decor/SparkleGlyph.jsx";
import { HOME_DEMO_MENTORS } from "../../data/homeLandingDemo";
import { MENTOR_SHOWCASE_COPY } from "../../constants/brandVoice";
import {
  homeSectionTitleStyle,
  homeSectionClasses as ty,
} from "../../constants/homeTypography";

const HOME_MENTORS = HOME_DEMO_MENTORS;
const FEATURED = HOME_MENTORS[0];
const FIND_MENTOR_STACK = HOME_MENTORS.slice(0, 3);

const FIND_MENTOR_CARD_LAYOUT = [
  { top: "top-8", inset: "left-2 right-1", z: "z-[2]", rotate: "rotate-[1deg]", shadow: "shadow-xl" },
  { top: "top-[5rem]", inset: "left-4 right-0", z: "z-[3]", rotate: "rotate-[-1.5deg]", shadow: "shadow-lg" },
  { top: "top-[7.85rem]", inset: "left-1 right-2", z: "z-[4]", rotate: "rotate-[0.75deg]", shadow: "shadow-lg" },
];

const FIND_MENTOR_BADGE_LAYOUT = [
  { top: "top-[4.35rem]", inset: "right-0" },
  { top: "top-[7.35rem]", inset: "right-0" },
  { top: "top-[10.35rem]", inset: "right-1" },
];

/** Linh vật mentor — export cho testimonial / section khác trên Home */
export const HOME_MENTOR_MASCOTS = {
  cv: "/mascot-mentor-avatar-cv.png?v=2",
  headset: "/mascot-mentor-avatar-headset.png?v=2",
  pro: "/mascot-mentor-avatar-pro.png?v=2",
  celebrate: "/mascot-home-avatar-celebrate.png?v=1",
  fallback: "/mascot-courses-ready.png?v=8",
};

const UPZI_STEPS = MENTOR_SHOWCASE_COPY.steps.map((step, i) => ({
  step: String(i + 1).padStart(2, "0"),
  ...step,
}));

function MentorMiniCard({ mentor, className }) {
  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-violet-200/80 bg-violet-50/90 text-[#8037f4]"
          aria-hidden
        >
          <Users className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[10px] font-bold text-slate-900">{mentor.name}</p>
          <p className="text-[8px] text-slate-500">{mentor.company}</p>
        </div>
        <span className="flex shrink-0 items-center gap-0.5 text-[9px] font-bold text-[#8037f4]">
          <Star className="h-3 w-3 fill-[#93f72b] text-[#8037f4]" />
          {mentor.rating}
        </span>
      </div>
    </div>
  );
}

/** Ô 1 — thẻ mentor xếp chồng */
function FindMentorVisual() {
  if (!FIND_MENTOR_STACK.length) return null;
  return (
    <div className="relative z-[1] flex h-full flex-col px-3 pb-4 pt-6 sm:px-3.5 sm:pt-7">
      <div className="relative mx-auto min-h-[12.5rem] w-[88%] flex-1 origin-top scale-105">
        <div className="absolute left-0 right-4 top-0 z-[1] rotate-[-2deg] rounded-2xl bg-white p-2 shadow-lg">
          <div className="flex items-center gap-1.5 rounded-lg bg-violet-50 px-2 py-1">
            <Search className="h-3 w-3 text-[#8037f4]" />
            <span className="text-[8px] font-semibold text-slate-600">IT · 4.5+ · dưới 400k</span>
          </div>
        </div>
        {FIND_MENTOR_STACK.map((mentor, i) => {
          const layout = FIND_MENTOR_CARD_LAYOUT[i];
          const badge = FIND_MENTOR_BADGE_LAYOUT[i];
          if (!layout || !badge) return null;
          return (
            <React.Fragment key={mentor.id}>
              <div className={`absolute ${layout.inset} ${layout.top} ${layout.z}`}>
                <MentorMiniCard
                  mentor={mentor}
                  className={`${layout.rotate} rounded-2xl border border-violet-100 bg-white p-2 ${layout.shadow}`}
                />
              </div>
              <div
                className={`absolute ${badge.inset} ${badge.top} z-[10] rounded-xl bg-white px-2.5 py-1.5 shadow-md ring-1 ring-violet-100`}
              >
                <p className="whitespace-nowrap text-[8px] font-bold leading-none text-[#8037f4]">
                  {mentor.reviews} review
                </p>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

/** Ô 2 — mock đặt lịch thành công */
function BookingVisual() {
  if (!FEATURED) return null;
  return (
    <div className="relative z-[1] flex h-full flex-col items-center justify-center px-3 py-4 sm:px-4">
      <SparkleGlyph className="absolute right-3 top-8 z-[2] h-8 w-8 opacity-80" />
      <SparkleGlyph className="absolute left-2 top-14 z-[2] h-7 w-7 opacity-60" />
      <div className="relative flex w-[86%] flex-col justify-center">
        <div className="relative z-[5] w-full rounded-md bg-white p-2.5 shadow-xl sm:p-3">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100">
              <CircleCheck className="h-5 w-5 text-[#8037f4]" strokeWidth={2.5} />
            </div>
            <p className="mt-1.5 text-[10px] font-extrabold leading-snug text-[#8037f4]">
              Đặt lịch thành công!
            </p>
            <span className="mt-1 rounded-md bg-violet-50 px-2.5 py-0.5 text-[7px] font-bold text-[#8037f4]">
              Mã BK-2847
            </span>
          </div>

          <div className="mt-2.5 space-y-1.5 rounded-md border border-violet-200 bg-violet-50/90 p-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[7px] font-semibold text-slate-500">Thời gian</span>
              <span className="text-[8px] font-bold text-slate-900">Thứ 5, 22/05 · 19:00</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[7px] font-semibold text-slate-500">Mentor</span>
              <span className="truncate text-[8px] font-bold text-slate-900">{FEATURED.name}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[7px] font-semibold text-slate-500">Buổi học</span>
              <span className="text-[8px] font-bold text-slate-900">Mock online · 60 phút</span>
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-violet-200/80 pt-1">
              <span className="text-[7px] font-semibold text-slate-500">Trạng thái</span>
              <span className="rounded-md bg-[#8037f4] px-2 py-0.5 text-[7px] font-bold text-white">
                Đã đặt
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const AFTER_MOCK_POINTS = MENTOR_SHOWCASE_COPY.afterMockPoints;

/** Ô 3 — checklist góp ý sau mock */
function FeedbackVisual() {
  return (
    <div className="relative z-[1] flex h-full flex-col items-center justify-center px-3 py-4 sm:px-4">
      <div className="flex w-[88%] flex-col origin-center scale-105">
        <p className="mb-2 shrink-0 text-center text-[11px] font-bold leading-snug text-[#8037f4] sm:text-[12px]">
          {MENTOR_SHOWCASE_COPY.afterMockLead}
        </p>
        <div className="flex flex-col rounded-lg bg-white p-3 shadow-xl sm:p-3.5">
          <ul className="flex flex-col justify-center gap-2.5 py-0.5 sm:gap-3">
            {AFTER_MOCK_POINTS.map((item) => (
              <li key={item.title} className="flex items-start gap-2">
                <CircleCheck
                  className="mt-0.5 h-4 w-4 shrink-0 text-[#8037f4] sm:h-[1.125rem] sm:w-[1.125rem]"
                  strokeWidth={2.5}
                />
                <div className="min-w-0">
                  <p className="text-[10px] font-bold leading-snug text-slate-900 sm:text-[11px]">
                    {item.title}
                  </p>
                  <p className="text-[9px] font-medium leading-snug text-slate-600 sm:text-[10px]">
                    {item.detail}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

const VISUALS = [FindMentorVisual, BookingVisual, FeedbackVisual];

function UpziStepCard({ step, index }) {
  const Visual = VISUALS[index];

  return (
    <div
      className="mentor-upzi-step flex min-w-0 flex-1 flex-col"
      style={{ animationDelay: `${index * 90}ms` }}
    >
      <div className="mentor-upzi-panel relative w-full overflow-hidden rounded-2xl shadow-[0_12px_32px_rgba(99,14,212,0.1)] sm:rounded-[1.35rem]">
        <Visual />
      </div>
      <h3 className={`mt-[0.825rem] text-center ${ty.stepCardTitle}`}>{step.title}</h3>
      <p className={`mt-[0.45rem] text-center ${ty.stepCardBody}`}>{step.description}</p>
    </div>
  );
}

/** Showcase mentor — Upzi layout, nền tím nhạt. */
export function MentorFeatureShowcase({ onCtaClick }) {
  return (
    <section
      id="find-mentor"
      className="home-mentor-panel relative z-10 flex min-h-svh scroll-mt-24 flex-col justify-center overflow-x-clip overflow-y-visible px-0 py-10 sm:py-12 lg:py-14"
    >
      <style>{`
        .mentor-upzi-panel {
          background: #f0ebf8;
          border: 2px solid #8037f4;
          height: 20.5rem;
        }
        @media (min-width: 640px) {
          .mentor-upzi-panel {
            height: 20rem;
          }
        }
        @media (min-width: 1024px) {
          .mentor-upzi-panel {
            height: 22rem;
          }
        }
        @keyframes mentor-upzi-rise {
          0% {
            opacity: 0;
            transform: translateY(12px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .mentor-upzi-step {
          animation: mentor-upzi-rise 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .mentor-showcase-cards-scale {
          --mentor-scale: 1.05;
          width: calc(100% / var(--mentor-scale));
          max-width: calc(81.7rem / var(--mentor-scale));
          margin-inline: auto;
          transform: scale(var(--mentor-scale));
          transform-origin: center center;
        }
        @media (min-width: 640px) {
          .mentor-showcase-cards-scale {
            --mentor-scale: 1.06;
          }
        }
        @media (min-width: 1024px) {
          .mentor-showcase-cards-scale {
            --mentor-scale: 1.065;
          }
        }
        .mentor-showcase-heading-align {
          padding-left: calc(0.75rem - 0.6rem);
        }
        @media (min-width: 640px) {
          .mentor-showcase-heading-align {
            --mentor-scale: 1.06;
            padding-left: calc((100% - (100% / var(--mentor-scale))) / 2 - 0.6rem);
          }
        }
        @media (min-width: 1024px) {
          .mentor-showcase-heading-align {
            --mentor-scale: 1.065;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .mentor-upzi-step {
            animation: none;
          }
        }
      `}</style>

      <div
        className={`home-mobile-gutter relative z-10 w-full overflow-visible py-2 ${HOME_SECTION_INNER} lg:!px-6 xl:!px-8 2xl:!px-12`}
      >
        <div className="flex w-full flex-col gap-[1.2rem] sm:gap-[1.45rem]">
          <article className="mentor-showcase-heading-align flex flex-col items-start gap-[0.7rem] sm:gap-[0.825rem]">
            <span className={ty.badge}>
              <Users className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {MENTOR_SHOWCASE_COPY.badge}
            </span>
            <h2
              className={`${ty.sectionTitle} max-w-full sm:max-w-none`}
              style={homeSectionTitleStyle}
            >
              <span
                className={`${ty.titleLineSecond} ${ty.titleLineDark} block pl-[0.2rem] lg:whitespace-nowrap`}
              >
                {MENTOR_SHOWCASE_COPY.titleLine1}
              </span>
              <span
                className={`${ty.titleLineSecond} ${ty.titleLineAccent} block lg:whitespace-nowrap`}
              >
                {MENTOR_SHOWCASE_COPY.titleLine2}
              </span>
            </h2>
          </article>

          <div className="mentor-showcase-cards-scale mt-[1.5rem] grid w-full grid-cols-1 gap-[1.2rem] px-3 sm:mt-4 sm:grid-cols-3 sm:gap-[1.75rem] sm:px-0">
            {UPZI_STEPS.map((step, idx) => (
              <UpziStepCard key={step.title} step={step} index={idx} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
