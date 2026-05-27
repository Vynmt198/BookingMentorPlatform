import React, { useState } from "react";
import { Zap as Lightning } from "lucide-react";

const BRAND_LOGO_SRC = "/Logo.png";

const LOGO_FRAMES = {
  default: "h-[80px] md:h-[130px]",
  compact: "h-[56px] md:h-[72px]",
  /** Navbar customer — ôm logo, hơi bé hơn một nấc */
  navbar: "h-9 sm:h-10 md:h-11",
  /** Đăng nhập / đăng ký — vừa thanh top h-20 */
  auth: "h-9 sm:h-10",
  /** Footer — ~nửa default */
  footer: "h-8 md:h-[52px]",
};

const LOGO_FALLBACK_FRAMES = {
  default: "w-[80px] h-[80px] md:w-[130px] md:h-[130px] rounded-[2.5rem]",
  compact: "w-[56px] h-[56px] md:w-[72px] md:h-[72px] rounded-[1.75rem]",
  navbar: "h-9 w-9 sm:h-10 sm:w-10 md:h-11 md:w-11 rounded-2xl",
  auth: "h-9 w-9 sm:h-10 sm:w-10 rounded-2xl",
  footer: "h-8 w-8 md:h-[52px] md:w-[52px] rounded-xl",
};

export function BrandLogo({ className = "", compact = false, size }) {
  const [loadError, setLoadError] = useState(false);

  const variant = size ?? (compact ? "compact" : "default");
  const frame = LOGO_FRAMES[variant] ?? LOGO_FRAMES.default;
  const fallbackFrame = LOGO_FALLBACK_FRAMES[variant] ?? LOGO_FALLBACK_FRAMES.default;

  return (
    <div className={`flex items-center ${className}`}>
      <div
        className={`${frame} w-auto flex items-center justify-center transition-all duration-300 ${variant === "navbar" || variant === "auth" ? "" : "hover:scale-[1.03]"}`}
      >
        {loadError ? (
          <div
            className={`${fallbackFrame} flex items-center justify-center shadow-2xl`}
            style={{ background: "#8037f4" }}
          >
            <Lightning className="w-6 h-6 text-white" />
          </div>
        ) : (
          <img
            src={BRAND_LOGO_SRC}
            alt="ProInterview logo"
            className={`h-full w-auto object-contain contrast-[1.12] brightness-[0.94] ${variant === "navbar" || variant === "auth" ? "object-left" : ""}`}
            onError={() => setLoadError(true)}
          />
        )}
      </div>
    </div>
  );
}
