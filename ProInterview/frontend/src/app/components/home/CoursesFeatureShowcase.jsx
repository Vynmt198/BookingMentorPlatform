import React from "react";
import {
  BadgeCheck,
  Building2,
  Calendar,
  MessageSquare,
  BookOpen,
} from "lucide-react";
import { HOME_SECTION_INNER } from "../layout/customerShellLayout";
import { COURSES_SHOWCASE_COPY } from "../../constants/brandVoice";
import { homeSectionTitleStyle } from "../../constants/homeTypography";

const VISUAL_TOP_IMG = "/courses-student-learning.png";
const VISUAL_BOTTOM_IMG =
  "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=720&q=80&auto=format&fit=crop";

const FRAME_CLASS =
  "overflow-hidden border-[5px] border-[#c4b5fd] bg-[#f5f0ff] p-[3px] shadow-[inset_0_3px_12px_rgba(128,55,244,0.08),0_10px_24px_rgba(128,55,244,0.04)]";

function CoursesBlobVisual() {
  return (
    <div className="relative flex min-h-[16.5rem] items-center justify-center sm:min-h-[18.5rem] lg:min-h-[20.5rem]">
      <div
        className="pointer-events-none absolute right-[9%] top-[5%] z-[1] size-10 rounded-full bg-lime-400 shadow-[0_4px_16px_rgba(163,230,53,0.45)] sm:right-[11%] sm:top-[7%] sm:size-[2.7rem]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute right-[18%] top-[16%] z-[1] size-6 rounded-full bg-lime-200 sm:right-[20%] sm:top-[18%] sm:size-7"
        aria-hidden
      />



      <div className="relative z-10 mx-auto -mt-12 h-[17.5rem] w-full max-w-[28.5rem] sm:h-[18.5rem] sm:max-w-[30rem]">
        {/* Top-left Bubble Card */}
        <div
          className={`absolute left-0 top-0 z-20 h-[58%] w-[50%] rounded-[2rem] rounded-br-none ${FRAME_CLASS}`}
        >
          <img
            src={VISUAL_TOP_IMG}
            alt=""
            className="h-full w-full rounded-[1.7rem] rounded-br-none object-cover"
            decoding="async"
          />
        </div>

        {/* Bottom-right Bubble Card */}
        <div
          className={`absolute bottom-0 right-0 z-10 h-[58%] w-[50%] rounded-[2rem] rounded-tl-none ${FRAME_CLASS}`}
        >
          <img
            src={VISUAL_BOTTOM_IMG}
            alt=""
            className="h-full w-full rounded-[1.7rem] rounded-tl-none object-cover"
            decoding="async"
          />
        </div>
      </div>
    </div>
  );
}

const COURSE_FEATURES = [
  { icon: Building2, text: COURSES_SHOWCASE_COPY.bullets[0], tone: "text-[#7c3aed]" },
  { icon: MessageSquare, text: COURSES_SHOWCASE_COPY.bullets[1], tone: "text-[#7c3aed]" },
  { icon: Calendar, text: COURSES_SHOWCASE_COPY.bullets[2], tone: "text-[#7c3aed]" },
  { icon: BadgeCheck, text: COURSES_SHOWCASE_COPY.bullets[3], tone: "text-[#7c3aed]" },
];

const COURSE_TABS = [
  { id: "interview", label: "Phỏng vấn" },
  { id: "cv", label: "Viết CV" },
  { id: "technical", label: "Technical" },
  { id: "soft-skills", label: "Soft skills" },
];

function CoursesLearningCard() {
  return (
    <div className="relative">
      <div className="courses-learning-card rounded-[2rem] bg-white border border-[#c7d2fe]/40 p-5 shadow-[0_24px_64px_rgba(15,23,42,0.07)] sm:rounded-[2.25rem] sm:p-6 lg:p-7">
        <div
          className="pointer-events-none mb-5 inline-flex max-w-full flex-wrap rounded-full bg-[#e9e5f3] p-1.5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.03),0_8px_24px_rgba(15,23,42,0.03)]"
          aria-hidden
        >
          {COURSE_TABS.map((item, index) => {
            const active = index === 0;
            return (
              <span
                key={item.id}
                className={`rounded-full px-4 py-2 text-sm font-bold sm:px-5 sm:py-2.5 ${
                  active
                    ? "bg-[#7c3aed] text-white shadow-[0_8px_20px_rgba(124,58,237,0.22)]"
                    : "text-[#7c3aed]"
                }`}
              >
                {item.label}
              </span>
            );
          })}
        </div>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2 lg:gap-8 xl:gap-10">
          <div className="min-w-0">
            <p className="max-w-lg text-base font-medium leading-relaxed text-slate-600 sm:text-[1.05rem]">
              {COURSES_SHOWCASE_COPY.body}
            </p>

            <ul className="mt-7 space-y-4">
              {COURSE_FEATURES.map((feature) => {
                const Icon = feature.icon;
                return (
                  <li key={feature.text} className="flex items-start gap-3">
                    <Icon className={`mt-0.5 size-5 shrink-0 ${feature.tone}`} strokeWidth={2.25} />
                    <span className="text-[0.98rem] font-semibold leading-relaxed text-slate-800">
                      {feature.text}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          <CoursesBlobVisual />
        </div>
      </div>
    </div>
  );
}

/** Showcase khóa học — layout giống mẫu tab + nội dung trái / visual phải. */
export function CoursesFeatureShowcase() {
  return (
    <section
      id="courses"
      className="home-courses-panel relative z-10 flex min-h-svh scroll-mt-24 flex-col justify-center overflow-x-clip overflow-y-visible bg-[#eee0fb] px-0 py-4 sm:py-5 lg:py-6"
    >
      <div className={`relative z-10 ${HOME_SECTION_INNER}`}>
        <div className="flex justify-center mb-3 sm:mb-4">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#7c3aed]/30 bg-[#7c3aed]/10 px-3.5 py-1 font-semibold text-[#7c3aed] text-[0.875rem] sm:text-[0.95rem]">
            <BookOpen className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {COURSES_SHOWCASE_COPY.badge}
          </span>
        </div>
        <div className="relative mx-auto max-w-max">
          {/* Lime Squiggle Accent at bottom-left */}
          <svg
            viewBox="0 0 70 40"
            className="absolute -left-24 bottom-0 h-12 w-24 -rotate-[15deg] text-lime-400 opacity-90 sm:-left-36 sm:bottom-2 sm:h-16 sm:w-32"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10 35c3-15 12-22 17-12 3 7-4 15-9 9 9-15 18-22 23-12 3 7-4 15-9 9 9-15 18-22 23-12 3 7-4 15-9 9" />
          </svg>

          {/* Purple (now Lime) Squiggle Accent at top-right (scaled up) */}
          <svg
            viewBox="0 0 70 40"
            className="absolute -right-14 -top-8 h-12 w-24 rotate-[15deg] text-lime-400 opacity-90 sm:-right-20 sm:-top-10 sm:h-16 sm:w-32"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10 35c3-15 12-22 17-12 3 7-4 15-9 9 9-15 18-22 23-12 3 7-4 15-9 9 9-15 18-22 23-12 3 7-4 15-9 9" />
          </svg>

          <h2
            className="home-section-title mb-5 text-center font-headline font-bold leading-[1.08] tracking-tight text-slate-900 sm:mb-6"
            style={homeSectionTitleStyle}
          >
            <span className="block">{COURSES_SHOWCASE_COPY.sectionTitleLine1}</span>
            <span className="block text-[#7c3aed]">{COURSES_SHOWCASE_COPY.sectionTitleLine2}</span>
          </h2>
        </div>

        <CoursesLearningCard />
      </div>
    </section>
  );
}
