/** Tiêu đề & số liệu thống nhất trên các trang mentor (role mentor). */

export const mentorPageEyebrow =
  "mentor-eyebrow text-[11px] font-black uppercase tracking-[0.14em] text-[#7c3aed]";

export const mentorPageTitle =
  "font-headline overflow-visible pb-0.5 text-2xl font-black uppercase leading-[1.2] tracking-tight text-slate-900 sm:text-3xl";

export const mentorPageTitleHero =
  "font-headline text-[clamp(1.75rem,4vw,2.75rem)] font-black leading-tight tracking-tight text-slate-900";

export const mentorPageSubtitle =
  "text-sm font-semibold leading-relaxed text-slate-600";

export const mentorStatValue =
  "mentor-stat-num text-2xl font-black tracking-tight text-slate-900 sm:text-3xl";

export const mentorStatCaption = "mt-0.5 text-xs font-semibold text-slate-500";

export const mentorSectionTitle =
  "font-headline text-lg font-black tracking-tight text-slate-900 sm:text-xl";

export const mentorHeroStat =
  "mentor-stat-num text-3xl font-black tracking-tight text-slate-900 sm:text-4xl";

export const mentorAccentText = "font-semibold text-violet-700";

/** Ô tìm kiếm trên nền sáng (analytics, reviews, …) */
export const mentorSearchInput =
  "w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-11 pr-4 text-sm font-semibold text-slate-900 shadow-sm outline-none transition-all placeholder:font-medium placeholder:text-slate-400 focus:border-[#8037f4] focus:bg-[#faf8ff] focus:ring-2 focus:ring-[#8037f4]/15";

export const mentorTableTh =
  "px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 sm:px-6";

export const mentorTableTd =
  "px-4 py-3 text-sm font-semibold text-slate-800 sm:px-6";

/** Header trang mentor — eyebrow + tiêu đề + mô tả. */
export function MentorPageHeader({ eyebrow, title, subtitle, children, className = "" }) {
  return (
    <div className={`min-w-0 ${className}`.trim()}>
      {eyebrow ? <p className={mentorPageEyebrow}>{eyebrow}</p> : null}
      {typeof title === "string" ? (
        <h1 className={eyebrow ? `mt-2 ${mentorPageTitleHero}` : mentorPageTitleHero}>{title}</h1>
      ) : (
        title
      )}
      {subtitle ? <p className={`mt-2 ${mentorPageSubtitle}`}>{subtitle}</p> : null}
      {children}
    </div>
  );
}
