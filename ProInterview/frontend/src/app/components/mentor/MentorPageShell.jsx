import React from "react";

/**
 * Vỏ trang trong app user — nền trong suốt để lớp `app-shell-ambient` (Home) hiện ra;
 * lưới + blur tím nhạt giống họ Home.
 */
const MENTOR_LIGHT_STYLES = `
        .glass-card {
           background: #ffffff;
           backdrop-filter: none;
           border-radius: 20px;
           border: 1px solid rgba(186, 165, 255, 0.38);
           transition: transform 0.3s ease, border-color 0.25s ease, box-shadow 0.3s ease;
           position: relative;
           overflow: hidden;
           box-shadow: 0 8px 18px rgba(128, 55, 244, 0.07);
        }
        .glass-card::before {
           content: none;
        }
        .glass-card:hover {
           border-color: rgba(128, 55, 244, 0.35);
           transform: translateY(-2px);
           box-shadow: 0 12px 28px rgba(128, 55, 244, 0.12);
        }
        .glow-halo {
           position: relative;
           display: flex;
           align-items: center;
           justify-content: center;
        }
        .glow-halo::after {
           content: none;
        }
        @keyframes shimmer-bg {
           0%, 100% { opacity: 0.35; transform: translate(0,0) scale(1); }
           50% { opacity: 0.55; transform: translate(2%, -2%) scale(1.04); }
        }
        .font-headline {
          letter-spacing: -0.045em;
          text-shadow: none;
        }
        /* primary-fixed = lime CTA (#93f72b); giữ màu token Tailwind */
`;

export function MentorPageShell({
  children,
  className = "",
  extraStyles = "",
  bottomPad = "pb-20",
  fillHeight = false,
  /** false = chỉ dùng app-shell-ambient, không thêm blob/shimmer (tránh nền chia mảng) */
  showAmbient = true,
}) {
  const heightBlock = fillHeight
    ? "min-h-0 flex-1 h-full overflow-y-auto overflow-x-clip"
    : "min-h-screen overflow-x-clip";
  return (
    <div
      className={`mentor-surface relative antialiased ${heightBlock} font-sans text-slate-900 selection:bg-violet-100 selection:text-violet-900 bg-transparent ${bottomPad} ${className}`.trim()}
    >
      <style>{`${MENTOR_LIGHT_STYLES}${extraStyles || ""}`}</style>
      {showAmbient && (
        <>
          <div
            className="pointer-events-none fixed -top-[12%] -right-[6%] h-[min(560px,70vw)] w-[min(560px,70vw)] rounded-full bg-[#a66ff8]/28 blur-[120px] -z-[1]"
            aria-hidden
          />
          <div
            className="pointer-events-none fixed -bottom-[14%] -left-[8%] h-[min(520px,65vw)] w-[min(520px,65vw)] rounded-full bg-[#93f72b]/14 blur-[110px] -z-[1]"
            aria-hidden
          />
          <div
            className="pointer-events-none fixed inset-0 -z-[1] opacity-80"
            style={{ animation: "shimmer-bg 14s ease-in-out infinite" }}
            aria-hidden
          />
        </>
      )}
      {children}
    </div>
  );
}
