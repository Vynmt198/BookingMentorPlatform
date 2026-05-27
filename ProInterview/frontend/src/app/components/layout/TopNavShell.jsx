import React from "react";
import { CUSTOMER_SHELL_GUTTER, CUSTOMER_SHELL_MAX } from "./customerShellLayout";

export function TopNavShell({ variant = "light", scrolled = true, children }) {
  const isDark = variant === "dark";

  const pillStyle = isDark
    ? {
        background: "rgba(18, 10, 38, 0.78)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(148, 120, 255, 0.28)",
        borderRadius: "40px 10px 40px 10px",
        boxShadow: "0 4px 28px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(128, 55, 244, 0.15) inset",
      }
    : {
        background: "rgba(255, 255, 255, 0.94)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "2px solid rgba(186, 165, 255, 0.55)",
        borderRadius: "40px 10px 40px 10px",
        boxShadow:
          "0 0 0 1px rgba(255,255,255,0.9) inset, 0 4px 28px rgba(128, 55, 244, 0.12), 0 2px 10px rgba(0,0,0,0.04)",
      };

  return (
    <nav
      className={`fixed top-4 left-0 right-0 z-[100] pointer-events-none ${CUSTOMER_SHELL_GUTTER}`}
    >
      <div
        className={`pointer-events-auto flex h-10 items-center justify-between px-6 py-0 transition-all duration-500 sm:h-12 sm:px-8 md:h-14 ${CUSTOMER_SHELL_MAX}`}
        style={pillStyle}
      >
        {children}
      </div>
    </nav>
  );
}
