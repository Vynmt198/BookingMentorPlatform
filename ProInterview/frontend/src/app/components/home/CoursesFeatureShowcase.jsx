import React from "react";
import { HOME_SECTION_INNER } from "../layout/customerShellLayout";
import {
  GraduationCap,
  Lock,
  BookOpen,
  CircleCheck,
  Video,
} from "lucide-react";
import { HOME_DEMO_COURSES } from "../../data/homeLandingDemo";
import { COURSES_SHOWCASE_COPY } from "../../constants/brandVoice";
import {
  HOME_SECTION_TITLE_CLAMP,
  homeSectionClasses as ty,
} from "../../constants/homeTypography";
import { SparkleGlyph } from "../decor/SparkleGlyph";

/** Một khóa mẫu cố định (STAR), tab lọc chỉ minh họa UI. */
const DEMO_COURSE = HOME_DEMO_COURSES[0];
const DEMO_FILTER_LABELS = ["Phỏng vấn", "Viết CV", "Technical", "Soft skills"];

const COURSE_CARD_MENTOR_AVATAR = "/mascot-course-card-avatar.png?v=2";
const COURSE_CARD_AVATAR_FALLBACK = "/mascot-courses-ready.png?v=8";

const DEMO_PROGRESS = (() => {
  const a = HOME_DEMO_COURSES[0];
  const b = HOME_DEMO_COURSES[1];
  const aTotal = a?.lessonsCount ?? 12;
  const bTotal = b?.lessonsCount ?? 10;
  const aDone = 3;
  const bDone = 1;
  return [
    {
      id: "1",
      title: a?.title,
      done: aDone,
      total: aTotal,
      pct: Math.round((aDone / aTotal) * 100),
      category: a?.category,
    },
    {
      id: "2",
      title: b?.title,
      done: bDone,
      total: bTotal,
      pct: Math.round((bDone / bTotal) * 100),
      category: b?.category,
    },
  ];
})();

function formatDurationMinutes(totalMin) {
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h <= 0) return `${m} phút`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function LessonRow({ title, active, locked }) {
  return (
    <li
      className={`flex items-center gap-2 rounded-xl px-2 py-1.5 sm:px-2.5 sm:py-2 ${
        active ? "bg-[#630ed4] text-white" : ""
      }`}
    >
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full sm:h-[1.375rem] sm:w-[1.375rem] ${
          active
            ? "bg-[#8037f4] text-white"
            : locked
              ? "bg-slate-100 text-slate-400"
              : "bg-violet-50 text-violet-400"
        }`}
      >
        {locked ? (
          <Lock className="h-2.5 w-2.5" strokeWidth={2.5} />
        ) : (
          <BookOpen className="h-2.5 w-2.5" strokeWidth={2.5} />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={`block text-[11px] font-semibold leading-snug sm:text-xs ${
            active ? "text-[#8037f4]" : locked ? "text-slate-400" : "text-slate-700"
          }`}
        >
          {title}
        </span>
      </span>
    </li>
  );
}

function CoursesLearningMockup() {
  if (!DEMO_COURSE) return null;

  const displayLessons = (DEMO_COURSE.lessons || []).slice(0, 4);
  const moreLessons = Math.max(0, (DEMO_COURSE.lessonsCount ?? 0) - displayLessons.length);

  return (
    <div className="courses-mock-panel relative mx-auto w-full max-w-[42rem] overflow-visible rounded-[1.75rem] px-4 pb-5 pt-[5rem] sm:rounded-[2rem] sm:px-5 sm:pb-6 sm:pt-[5.5rem] lg:max-w-none">
      <div
        className="pointer-events-none absolute left-1/2 top-0 z-[2] w-[11rem] -translate-x-1/2 translate-y-[calc(-38%+0.5rem)] sm:w-[12rem] lg:w-[12.2rem]"
        aria-hidden
      >
        <div className="courses-mascot-sticker relative mx-auto w-fit">
          <img
            src="/mascot-courses-ready.png?v=7"
            alt=""
            className="courses-mascot-img block h-auto w-[9.7rem] object-contain sm:w-[11.2rem]"
          />
          <div className="absolute -right-[3.84rem] top-[0.55rem] z-[1] sm:-right-[4.59rem] sm:top-[0.8rem]">
            <div className="courses-speech-bubble px-2.5 py-1.5 sm:px-3 sm:py-2">
              <p className="whitespace-nowrap font-headline text-[10px] font-bold leading-none text-[#8037f4] sm:text-[11px]">
                Sẵn sàng học chưa?
              </p>
            </div>
          </div>
        </div>
      </div>

      <div
        className="relative z-[1] flex flex-wrap justify-center gap-1.5 rounded-2xl border border-white/80 bg-white/90 p-1.5 shadow-sm sm:gap-2 sm:p-2"
        aria-hidden
      >
        {DEMO_FILTER_LABELS.map((label, idx) => (
          <span
            key={label}
            className={`inline-flex items-center rounded-xl px-3 py-1.5 text-[11px] font-bold sm:px-3.5 sm:py-2 sm:text-xs ${
              idx === 0
                ? "bg-[#8037f4] text-white shadow-md shadow-violet-500/25"
                : "text-slate-600"
            }`}
          >
            {label}
          </span>
        ))}
      </div>

      <div className="relative z-[1] mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[1.05fr_0.95fr] sm:items-stretch sm:gap-3.5">
        <div className="flex flex-col rounded-2xl border border-violet-100/80 bg-white p-3.5 shadow-[0_10px_28px_rgba(99,14,212,0.08)] sm:p-4">
          <div className="mb-2.5 flex items-start gap-2.5 border-b border-slate-100 pb-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-violet-100 bg-violet-50/90 sm:h-10 sm:w-10">
              <img
                src={COURSE_CARD_MENTOR_AVATAR}
                alt=""
                className="h-[90%] w-[90%] object-contain object-bottom"
                onError={(e) => {
                  if (e.currentTarget.src !== COURSE_CARD_AVATAR_FALLBACK) {
                    e.currentTarget.src = COURSE_CARD_AVATAR_FALLBACK;
                  }
                }}
              />
            </span>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-1 text-xs font-bold leading-snug text-[#000000] sm:text-sm">
                {DEMO_COURSE.title}
              </p>
              <p className="text-[10px] font-medium text-slate-500 sm:text-[11px]">
                {DEMO_COURSE.mentorName} · {DEMO_COURSE.mentorCompany}
              </p>
            </div>
          </div>
          <p className="mb-2 text-xs font-bold text-[#8037f4] sm:text-sm">
            Gồm {DEMO_COURSE.lessonsCount} bài video · {formatDurationMinutes(DEMO_COURSE.duration)}
          </p>
          <ul className="space-y-1.5">
            {displayLessons.map((lesson, idx) => (
              <LessonRow
                key={lesson.id}
                title={lesson.title}
                active={idx === 0}
                locked={idx > 0}
              />
            ))}
          </ul>
          {moreLessons > 0 ? (
            <p className="mt-2 pl-1 text-[10px] font-medium text-slate-400 sm:text-[11px]">
              +{moreLessons} bài khác trong khóa
            </p>
          ) : null}
        </div>

        <div className="flex h-full flex-col justify-between gap-2.5 sm:gap-3">
          <div className="rounded-2xl border border-violet-100/80 bg-white px-3.5 py-2.5 shadow-sm sm:px-4 sm:py-3">
            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-800 sm:text-xs">
              <Video className="h-4 w-4 shrink-0 text-[#8037f4]" />
              {COURSES_SHOWCASE_COPY.panelVideoTitle}
            </div>
            <p className="mt-1.5 text-[11px] font-medium leading-snug text-slate-600 sm:text-xs">
              {COURSES_SHOWCASE_COPY.panelVideoBody}
            </p>
            <p className="mt-1 text-[10px] text-slate-500 sm:text-[11px]">
              {COURSES_SHOWCASE_COPY.panelVideoNote}
            </p>
          </div>

          {DEMO_PROGRESS.map((mod) => (
            <div
              key={mod.id}
              className="rounded-2xl border border-violet-100/80 bg-white px-3.5 py-2.5 shadow-sm sm:px-4 sm:py-3"
            >
              <div className="mb-1.5 flex items-start justify-between gap-2">
                <p className="line-clamp-2 text-[11px] font-bold leading-snug text-slate-800 sm:text-xs">
                  {mod.title}
                </p>
                <span className="shrink-0 text-[11px] font-bold text-[#8037f4]">
                  {mod.done}/{mod.total}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-violet-100">
                <div
                  className="h-full rounded-full bg-[#8037f4]"
                  style={{ width: `${mod.pct}%` }}
                />
              </div>
              <p className="mt-1.5 text-[10px] font-medium text-slate-500 sm:text-[11px]">
                {mod.category}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Showcase khóa học — desktop: mockup trái, copy phải (khớp mock). */
export function CoursesFeatureShowcase({ onCtaClick }) {
  return (
    <section
      id="courses"
      className="relative z-10 flex h-screen max-h-screen flex-col justify-center overflow-hidden px-0 py-4 sm:py-6 max-lg:h-auto max-lg:max-h-none max-lg:min-h-0 max-lg:py-5 lg:overflow-visible"
    >
      <style>{`
        .courses-mock-panel {
          background: #f0ebf8;
          border: 2px solid rgba(128, 55, 244, 0.4);
          box-shadow: 0 12px 32px rgba(99, 14, 212, 0.1);
        }
      `}</style>
      <div
        className={`home-mobile-gutter relative z-10 flex w-full items-center overflow-visible py-2 ${HOME_SECTION_INNER}`}
      >
        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-8 overflow-visible max-lg:gap-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] lg:gap-4 xl:max-w-[68rem] xl:gap-5">
          <div className="relative z-10 flex w-full min-w-0 justify-center max-lg:order-last lg:justify-start lg:-translate-x-[5.9rem]">
            <div className="w-full origin-top max-lg:mx-auto lg:scale-[1.05]">
              <CoursesLearningMockup />
            </div>
          </div>

          <article className="relative z-10 flex min-w-0 flex-col items-start gap-[0.825rem] sm:gap-[0.95rem] max-lg:order-first lg:-translate-x-[5rem] lg:pl-0 xl:-translate-x-[5.5rem]">
            <SparkleGlyph
              className="pointer-events-none absolute right-0 top-0 z-[3] h-9 w-9 rotate-12 drop-shadow-md sm:h-11 sm:w-11 lg:right-2"
              tone="violet"
            />
            <span className={ty.badge}>
              <GraduationCap className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {COURSES_SHOWCASE_COPY.badge}
            </span>
            <h2
              className={`${ty.title} max-w-full pr-10 sm:pr-12 lg:max-w-none`}
              style={{ fontSize: HOME_SECTION_TITLE_CLAMP }}
            >
              <span
                className={`${ty.titleLineSecond} ${ty.titleLineDark} block lg:whitespace-nowrap`}
              >
                {COURSES_SHOWCASE_COPY.titleLine1}
              </span>
              <span
                className={`${ty.titleLineSecond} ${ty.titleLineAccent} block lg:whitespace-nowrap`}
              >
                {COURSES_SHOWCASE_COPY.titleLine2}
              </span>
            </h2>
            <p
              className={`${ty.coursesBody} flex w-full max-w-none flex-col gap-[0.25rem]`}
            >
              <span className="block max-lg:text-pretty lg:whitespace-nowrap">
                {COURSES_SHOWCASE_COPY.bodyLine1}
              </span>
              <span className="block max-lg:text-pretty lg:whitespace-nowrap">
                {COURSES_SHOWCASE_COPY.bodyLine2}
              </span>
            </p>
            <ul className={`${ty.coursesBulletList} w-full max-w-none`}>
              {COURSES_SHOWCASE_COPY.bullets.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CircleCheck className={ty.bulletIcon} strokeWidth={2.5} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            {onCtaClick ? (
              <button
                type="button"
                onClick={onCtaClick}
                className={`courses-cta-primary mt-1 ${ty.cta} text-[#000000]`}
              >
                {COURSES_SHOWCASE_COPY.cta}
              </button>
            ) : null}
          </article>
        </div>
      </div>
    </section>
  );
}
