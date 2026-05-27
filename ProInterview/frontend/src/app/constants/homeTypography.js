/**
 * Cỡ chữ thống nhất — các section Home (showcase, how-it-works, testimonials).
 * Hero headline riêng (lớn hơn section).
 */
// Hero headline — tăng lại 1 bậc so với bản trước
export const HOME_HERO_TITLE_CLAMP = "clamp(2.2rem, 6.1vw, 4.45rem)";
export const HOME_SECTION_TITLE_CLAMP = "clamp(2.25rem, 3.5vw, 3.25rem)";
/** CV showcase — lớn hơn section chuẩn 0.1rem */
export const HOME_CV_SHOWCASE_TITLE_CLAMP =
  "clamp(2.35rem, calc(3.5vw + 0.1rem), 3.35rem)";

export const homeSectionClasses = {
  badge:
    "inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/10 px-3.5 py-1 text-sm font-semibold text-violet-700 sm:text-base",
  title: "max-w-2xl font-headline font-extrabold leading-[1.08] tracking-tight text-[#1a1b23]",
  titleLineDark: "block text-slate-900",
  titleLineAccent: "block font-headline text-[#6d2fd6]",
  body: "max-w-2xl text-pretty text-lg font-medium leading-relaxed text-slate-600 sm:text-xl",
  cvShowcaseBadge:
    "inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/10 px-3.5 py-1 font-semibold text-violet-700 text-[0.975rem] sm:text-[1.1rem]",
  cvShowcaseBody:
    "max-w-2xl text-pretty font-medium leading-relaxed text-slate-600 text-[1.225rem] sm:text-[1.35rem]",
  bulletList: "max-w-2xl space-y-3 text-pretty text-base font-medium text-slate-600 sm:text-lg",
  bulletIcon: "mt-0.5 h-5 w-5 shrink-0 text-[#6d2fd6]",
  cta: "inline-flex shrink-0 items-center gap-2 rounded-full px-6 py-2.5 text-lg font-bold transition-all hover:scale-[1.02] active:scale-[0.98] sm:px-8 sm:py-3 sm:text-xl",
  cardTitle: "font-headline text-xl font-bold text-[#1a1b23] md:text-2xl",
  cardScore: "shrink-0 rounded-2xl border px-4 py-1.5 text-base font-bold sm:text-lg",
  stepCardTitle:
    "font-headline text-lg font-extrabold leading-snug text-[#1a1b23] sm:text-xl",
  stepCardBody: "text-pretty text-base font-medium leading-relaxed text-slate-600 sm:text-lg",
  howItWorksTitle:
    "cute-heading font-headline font-black leading-[1.06] tracking-tighter text-slate-900",
  howItWorksStepTitle:
    "mb-2 font-headline text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl",
  howItWorksStepBody:
    "text-base font-medium leading-relaxed text-slate-600 sm:text-lg whitespace-pre-line",
};
