import React from "react";

export function StickerLimeSparkle({ className = "", style }) {
  return (
    <svg
      viewBox="-12 -12 88 88"
      className={`pointer-events-none ${className}`.trim()}
      style={style}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Lime Background Blob (thick stroke) */}
      <path
        d="M32 9.3C31 17.2 29.5 23.8 26.2 26.2C23.8 29.5 17.2 31 9.3 32C17.2 33 23.8 34.5 26.2 37.8C29.5 40.2 31 46.8 32 54.7C33 46.8 34.5 40.2 37.8 37.8C40.2 34.5 46.8 33 54.7 32C46.8 31 40.2 29.5 37.8 26.2C34.5 23.8 33 17.2 32 9.3Z"
        fill="#93f72b"
        stroke="#93f72b"
        strokeWidth="18"
        strokeLinejoin="round"
      />
      {/* White Inner Stroke */}
      <path
        d="M32 9.3C31 17.2 29.5 23.8 26.2 26.2C23.8 29.5 17.2 31 9.3 32C17.2 33 23.8 34.5 26.2 37.8C29.5 40.2 31 46.8 32 54.7C33 46.8 34.5 40.2 37.8 37.8C40.2 34.5 46.8 33 54.7 32C46.8 31 40.2 29.5 37.8 26.2C34.5 23.8 33 17.2 32 9.3Z"
        stroke="white"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
