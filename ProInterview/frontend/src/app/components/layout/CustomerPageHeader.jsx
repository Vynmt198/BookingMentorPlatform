import React from "react";

/** Pill badge + tiêu đề — đồng bộ CV hub / Pricing / các trang customer */
export function CustomerPageBadge({ children, pulse = true, className = "" }) {
  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full border border-violet-200/80 bg-white/90 px-3 py-1 shadow-sm backdrop-blur-sm ${className}`}
    >
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full bg-[#6d2fd6] ${pulse ? "animate-pulse" : ""}`}
        aria-hidden
      />
      <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#5b598c] sm:text-[11px]">
        {children}
      </span>
    </div>
  );
}

/**
 * Header trang customer: badge trắng + chấm tím, H1 đậm, subtitle tím nhạt.
 * `title` có thể là ReactNode (vd. <>Text <span className="text-[#6d2fd6]">highlight</span></>).
 */
export function CustomerPageHeader({
  badge,
  title,
  subtitle,
  subtitleClassName = "mt-2 max-w-2xl text-sm font-medium leading-relaxed text-violet-600 sm:text-[0.9375rem]",
  centered = false,
  badgePulse = true,
  className = "mb-6 w-full",
  actions,
}) {
  return (
    <header className={`${className} ${centered ? "text-center" : ""}`}>
      <div
        className={`mb-2 flex flex-wrap items-center gap-3 ${centered ? "justify-center" : "justify-between"}`}
      >
        {badge ? (
          <CustomerPageBadge pulse={badgePulse} className={centered ? "" : ""}>
            {badge}
          </CustomerPageBadge>
        ) : (
          <span />
        )}
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
      <h1 className="font-headline text-[clamp(1.75rem,3.5vw,2.5rem)] font-extrabold leading-[1.12] tracking-tight text-[#1a1b23]">
        {title}
      </h1>
      {subtitle ? (
        <p className={`${subtitleClassName} ${centered ? "mx-auto" : ""}`}>{subtitle}</p>
      ) : null}
    </header>
  );
}
