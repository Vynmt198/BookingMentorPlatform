import React from "react";
import { useNavigate } from "react-router";
import { getBrandClickPath } from "../../utils/auth";
import { Zap as Lightning } from "lucide-react";

/**
 * Nền đồng bộ Dashboard: gradient + blob/shimmer + lưới 32px toàn viewport.
 */
const PI = {
  pageGradient: "#ffffff",
  purple: "#8037f4",
  lilac: "#a66ff8",
  lime: "#93f72b",
  limeDark: "#7fe015",
  limeSoft: "rgba(196,255,71,0.16)",
  /** Khối form — light glass trên nền trắng */
  glass: {
    background: "rgba(255,255,255,0.85)",
    border: "1px solid rgba(128,55,244,0.12)",
    backdropFilter: "blur(20px) saturate(1.08)",
    WebkitBackdropFilter: "blur(20px) saturate(1.08)",
    boxShadow:
      "0 20px 50px rgba(128,55,244,0.10), 0 0 0 1px rgba(128,55,244,0.06) inset",
  },
};

/** Ô input dark — cùng vibe form trên Home */
export const AUTH_INPUT_CLASS =
  "w-full px-5 py-3.5 rounded-2xl font-medium text-gray-800 placeholder:text-gray-400 outline-none transition-all border border-gray-200 bg-white hover:bg-gray-50 focus:border-[#8037f4]/50 focus:ring-2 focus:ring-[#8037f4]/15";

/** Nút chính & Google: cùng full width, cùng bo góc, chiều dọc py-4 (không kéo cao). */
export const AUTH_CTA_FRAME_CLASS =
  "flex w-full items-center justify-center rounded-2xl py-4";

export function AuthShell({ children, aside, footerNote }) {
  const navigate = useNavigate();

  return (
    <div
      className="min-h-screen flex flex-col relative overflow-x-hidden font-sans selection:bg-[rgba(128,55,244,0.15)] selection:text-gray-900"
      style={{
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
        background: PI.pageGradient,
        color: "#1a1a1a",
      }}
    >
      <style>{`
        @keyframes auth-shimmer-bg {
          0% { opacity: 0.4; transform: translate(0,0) scale(1); }
          50% { opacity: 0.7; transform: translate(2%, -2%) scale(1.05); }
          100% { opacity: 0.4; transform: translate(0,0) scale(1); }
        }
      `}</style>
      {/* Blob + shimmer — cùng stack như Dashboard / Home */}
      <div
        className="fixed inset-0 pointer-events-none -z-10"
        style={{ animation: "auth-shimmer-bg 14s ease-in-out infinite" }}
        aria-hidden
      >
        {/* Top-right: vùng loang tím đậm chính */}
        <div className="absolute top-[-20%] right-[-10%] h-[80vh] w-[80vh] rounded-full blur-[80px]" style={{ background: "radial-gradient(circle, rgba(128,55,244,0.55) 0%, rgba(139,77,255,0.35) 45%, transparent 72%)" }} />
        {/* Bottom-left: loang tím lan rộng */}
        <div className="absolute bottom-[-15%] left-[-10%] h-[70vh] w-[70vh] rounded-full blur-[100px]" style={{ background: "radial-gradient(circle, rgba(88,28,200,0.45) 0%, rgba(128,55,244,0.25) 50%, transparent 72%)" }} />
        {/* Center: glow tím nhẹ giữa trang */}
        <div className="absolute top-[40%] left-[30%] h-[50vh] w-[50vh] rounded-full blur-[90px]" style={{ background: "radial-gradient(circle, rgba(128,55,244,0.22) 0%, transparent 65%)" }} />
        {/* Right mid: accent nhỏ hơn */}
        <div className="absolute top-[20%] right-[5%] h-[35vh] w-[35vh] rounded-full blur-[60px]" style={{ background: "radial-gradient(circle, rgba(139,77,255,0.45) 0%, transparent 65%)" }} />
      </div>

      {/* Lưới ô vuông nhẹ — on light bg */}
      <div
        className="pointer-events-none fixed inset-0 z-[1] opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(128,55,244,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(128,55,244,0.8) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
        aria-hidden
      />

      {/* Cùng chiều cao / logo / padding với nav Home.jsx (h-16, w-8 icon, px-5) */}
      <header
        className="relative z-10 w-full border-b"
        style={{
          background: "rgba(255,255,255,0.80)",
          backdropFilter: "blur(16px) saturate(1.1)",
          WebkitBackdropFilter: "blur(16px) saturate(1.1)",
          borderColor: "rgba(128,55,244,0.12)",
          boxShadow: "0 1px 0 rgba(128,55,244,0.06), 0 8px 32px -8px rgba(128,55,244,0.08)",
        }}
      >
        <div className="mx-auto flex h-16 w-full max-w-[min(100%,calc(64rem+2.5cm))] items-center justify-between gap-6 px-5">
          <button
            type="button"
            onClick={() => navigate(getBrandClickPath())}
            className="group flex shrink-0 items-center gap-2.5"
          >
            <div
              className="flex h-8 w-8 items-center justify-center rounded-xl shadow-lg transition-transform group-hover:scale-105"
              style={{
                background: "#8037f4",
              }}
            >
              <Lightning className="h-4 w-4 text-white" />
            </div>
            <span
              className="font-bold leading-none"
              style={{ fontSize: "1.05rem", letterSpacing: "-0.02em", color: "#1a1a1a" }}
            >
              ProInterview
            </span>
          </button>
          <div className="ml-auto flex shrink-0 items-center justify-end">{footerNote}</div>
        </div>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-5 pb-14 pt-6 sm:pt-8">
        <div className="grid w-full max-w-[min(100%,calc(64rem+2.5cm))] grid-cols-1 items-start gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="flex flex-col justify-start lg:col-span-5">
            <div className="rounded-[2rem] p-8 sm:p-10" style={PI.glass}>
              {children}
            </div>
          </div>

          {aside && (
            <div className="relative z-10 hidden flex-col justify-start lg:col-span-7 lg:flex">
              {aside}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export { PI as PRO_INTERVIEW_BRAND };
