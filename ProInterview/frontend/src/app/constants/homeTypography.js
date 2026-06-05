/**
 * Cỡ chữ thống nhất — các section Home (showcase, how-it-works, testimonials).
 * Palette: #8037f4 · #000000 · #28552a · #93f72b
 */
export const HOME_HERO_TITLE_CLAMP = "clamp(3rem, 7.5vw, 6rem)";
/** Tiêu đề section Home (trừ hero) — dùng chung một cỡ. */
export const HOME_SECTION_TITLE_CLAMP = "clamp(2.25rem, 3.5vw, 3.25rem)";
export const homeSectionTitleStyle = { fontSize: HOME_SECTION_TITLE_CLAMP };

export const homeSectionClasses = {
  badge:
    "inline-flex items-center gap-2 rounded-full border border-[#8037f4]/30 bg-[#8037f4]/10 px-3.5 py-1 text-sm font-semibold text-[#8037f4] sm:text-base",
  /** H2 showcase / lộ trình / testimonials — đồng bộ với HOME_SECTION_TITLE_CLAMP */
  sectionTitle:
    "home-section-title font-headline font-extrabold leading-[1.08] tracking-tight text-[#000000]",
  title: "max-w-2xl font-headline font-extrabold leading-[1.08] tracking-tight text-[#000000]",
  titleLineSecond: "block leading-[1.08]",
  titleLineDark: "block text-[#000000]",
  titleLineAccent: "block font-headline text-[#8037f4]",
  body: "max-w-2xl text-pretty text-lg font-medium leading-relaxed text-slate-600 sm:text-xl",
  cvShowcaseBadge:
    "inline-flex items-center gap-2 rounded-full border border-[#8037f4]/30 bg-[#8037f4]/10 px-3.5 py-1 font-semibold text-[#8037f4] text-[0.975rem] sm:text-[1.1rem]",
  cvShowcaseBody:
    "max-w-2xl text-pretty font-medium leading-relaxed text-slate-600 text-[1.225rem] sm:text-[1.35rem]",
  bulletList: "max-w-2xl space-y-3 text-pretty text-base font-medium text-slate-600 sm:text-lg",
  bulletIcon: "mt-0.5 h-5 w-5 shrink-0 text-[#8037f4]",
  cta: "inline-flex shrink-0 items-center gap-2 rounded-full px-6 py-2.5 text-lg font-bold transition-all hover:scale-[1.02] active:scale-[0.98] sm:px-8 sm:py-3 sm:text-xl",
  cardTitle: "font-headline text-xl font-bold text-[#000000] md:text-2xl",
  cardScore: "shrink-0 rounded-2xl border px-4 py-1.5 text-base font-bold sm:text-lg",
  stepCardTitle:
    "font-headline text-lg font-extrabold leading-snug text-[#000000] sm:text-xl",
  stepCardBody: "text-pretty text-base font-medium leading-relaxed text-slate-600 sm:text-lg",
  howItWorksTitle:
    "font-headline font-extrabold leading-[1.08] tracking-tight text-[#000000]",
  howItWorksStepTitle:
    "mb-2 font-headline text-lg font-extrabold tracking-tight text-[#000000] sm:text-xl",
  howItWorksStepBody:
    "flex-1 text-left text-pretty text-sm font-medium leading-relaxed text-slate-600 sm:text-base lg:min-h-[5.1rem]",
  howItWorksStepBadge:
    "inline-flex px-2 py-1 text-[10px] font-bold tracking-wide rounded-md border sm:text-[11px]",
};
