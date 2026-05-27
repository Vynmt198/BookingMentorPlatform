import React from "react";

/** Linh vật góc phải dưới màn hình (không bong bóng). */
export function SidebarMascot() {
  return (
    <div
      className="fixed bottom-3 right-6 z-30 hidden -translate-x-2 sm:flex sm:right-8"
      aria-hidden
    >
      <img
        src="/mascot-sidebar.png?v=4"
        alt="Gấu Piupiu"
        className="mascot-corner-bob h-24 w-24 shrink-0 object-contain drop-shadow-[0_6px_14px_rgba(128,55,244,0.18)]"
      />
      <style>{`
        .mascot-corner-bob {
          animation: mascotCornerBob 2.8s ease-in-out infinite;
        }
        @keyframes mascotCornerBob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
      `}</style>
    </div>
  );
}
