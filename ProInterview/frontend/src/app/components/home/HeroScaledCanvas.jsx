import React, { useEffect, useState } from "react";

/** Desktop: grid cố định chữ | video, zoom chỉ phóng to, không chồng cột. */
export function HeroScaledCanvas({ children, className = "" }) {
  const [desktop, setDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onMq = () => setDesktop(mq.matches);
    onMq();
    mq.addEventListener("change", onMq);
    return () => mq.removeEventListener("change", onMq);
  }, []);

  if (!desktop) {
    return (
      <div className={`grid w-full grid-cols-1 gap-8 max-lg:gap-6 ${className}`.trim()}>
        {children}
      </div>
    );
  }

  return (
    <div className={`hero-scale-wrapper w-full ${className}`.trim()}>
      <div className="hero-scale-canvas">{children}</div>
    </div>
  );
}
