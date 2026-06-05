import React from "react";

const BADGE_COLORS = {
  purple: "bg-primary/10 text-primary border border-primary/20",
  lime: "bg-secondary/40 text-secondary-foreground border border-secondary/60",
  amber: "bg-accent/20 text-accent-foreground border border-accent/30",
  blue: "bg-sky-500/10 text-sky-700 border border-sky-500/20",
};

export function PageHeader({
  title,
  subtitle,
  actions,
  badge,
  badgeColor = "purple",
}) {
  return (
    <div className="mb-8">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex-1 min-w-0">
          {badge && (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mb-3 ${BADGE_COLORS[badgeColor]}`}>
              {badge}
            </span>
          )}
          <h1 className="app-page-title text-foreground">
            {title}
          </h1>
          {subtitle && (
            <p className="app-page-subtitle text-muted-foreground mt-1.5">
              {subtitle}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>
        )}
      </div>

      {/* Divider */}
      <div className="mt-6 h-px bg-primary/15" />
    </div>
  );
}