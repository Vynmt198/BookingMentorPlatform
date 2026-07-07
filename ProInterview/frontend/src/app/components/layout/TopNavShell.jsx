import React from "react";
import { CUSTOMER_SHELL_MAX } from "./customerShellLayout";

export function TopNavShell({
  variant = "light",
  scrolled = true,
  alignTop = false,
  pinned = true,
  children,
}) {
  const isDark = variant === "dark";
  const isHome = variant === "home";

  const pillStyle = isDark
    ? {
        background: "rgba(35, 16, 74, 0.72)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(255, 255, 255, 0.18)",
        borderRadius: "999px",
        boxShadow: "0 14px 40px rgba(32, 10, 74, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.16)",
      }
    : isHome
      ? {
          background: "linear-gradient(180deg, rgba(23, 10, 50, 0.84) 0%, rgba(14, 6, 31, 0.78) 100%)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1.5px solid rgba(214, 205, 255, 0.18)",
          borderRadius: "999px",
          boxShadow:
            "0 0 0 1px rgba(255,255,255,0.05) inset, 0 16px 44px rgba(7, 3, 20, 0.34), 0 10px 26px rgba(128, 55, 244, 0.18)",
        }
    : {
        background: "rgba(255, 255, 255, 0.94)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "2px solid rgba(186, 165, 255, 0.55)",
        borderRadius: "999px",
        boxShadow:
          "0 0 0 1px rgba(255,255,255,0.9) inset, 0 4px 28px rgba(128, 55, 244, 0.12), 0 2px 10px rgba(0,0,0,0.04)",
      };

  return (
    <nav
      className={`top-nav-shell-outer ${pinned ? "fixed" : "absolute"} left-0 right-0 z-[100] pointer-events-none lg:px-24 ${
        alignTop ? "top-0 pt-3 sm:pt-4" : "top-4"
      }`}
    >
      <div
        className={`top-nav-pill pointer-events-auto mx-auto flex h-10 w-full max-w-full min-w-0 flex-nowrap items-center justify-between gap-2 px-3 py-0 max-lg:px-3.5 sm:h-12 sm:gap-3 sm:px-6 md:h-14 md:px-8 ${CUSTOMER_SHELL_MAX}`}
        style={pillStyle}
      >
        {children}
      </div>
    </nav>
  );
}
