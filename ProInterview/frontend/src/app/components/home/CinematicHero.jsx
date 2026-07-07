import React, { useEffect, useRef } from "react";
import { ArrowRight, Zap, Users } from "lucide-react";
import { useNavigate } from "react-router";
import { HOME_COPY } from "../../constants/brandVoice";
import { SparkleGlyph } from "../../components/decor/SparkleGlyph.jsx";
import { SOCIAL_LINKS } from "../layout/Footer";

export function CinematicHero() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let currentOpacity = 0;
    video.style.opacity = "0";

    const animateFade = (targetOpacity, duration, callback) => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      
      const startOpacity = currentOpacity;
      const startTime = performance.now();

      const step = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        currentOpacity = startOpacity + (targetOpacity - startOpacity) * progress;
        if (videoRef.current) {
          videoRef.current.style.opacity = currentOpacity.toString();
        }

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(step);
        } else if (callback) {
          callback();
        }
      };
      
      animationRef.current = requestAnimationFrame(step);
    };

    const handleLoadedData = () => {
      animateFade(1, 500);
    };

    video.addEventListener("loadeddata", handleLoadedData);

    if (video.readyState >= 3) {
      handleLoadedData();
    }

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      video.removeEventListener("loadeddata", handleLoadedData);
    };
  }, []);

  return (
    <>
      <style>{`
        .liquid-glass {
          background: rgba(255, 255, 255, 0.01);
          background-blend-mode: luminosity;
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          border: none;
          box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.1);
          position: relative;
          overflow: hidden;
        }

        .liquid-glass::before {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          padding: 1.4px;
          background: linear-gradient(180deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.15) 20%, rgba(255,255,255,0) 40%, rgba(255,255,255,0) 60%, rgba(255,255,255,0.15) 80%, rgba(255,255,255,0.45) 100%);
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
        }
      `}</style>
      
      {/* -mt-[5.25rem] / pt-[5.25rem] logic to counteract outer paddings if necessary, 
          but usually min-h-screen is enough if it spans full viewport. We'll stick to min-h-[100svh] */}
      <div className="relative min-h-[100svh] bg-[#0a0418] overflow-hidden flex flex-col w-full z-10">
        {/* Background Video */}
        <div className="absolute inset-0 z-0">
          <video
            ref={videoRef}
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_115001_bcdaa3b4-03de-47e7-ad63-ae3e392c32d4.mp4"
            autoPlay
            muted
            playsInline
            loop
            className="w-full h-full object-cover object-bottom scale-[1.15] sm:scale-[1.25]"
            style={{ opacity: 0 }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#1c0840]/40 via-[#0a0418]/65 to-[#1a053a]/60 mix-blend-multiply" />
          <div className="absolute inset-0 bg-[#7c3aed]/5 mix-blend-color" />
        </div>

        {/* Hero content area */}
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-12 pt-24 text-center -translate-y-[4%] sm:pt-28 sm:-translate-y-[8%]">
          <div className="hero-intro-badge mb-6">
             <div className="inline-flex items-center gap-2 rounded-full border border-[#7c3aed]/40 bg-[#7c3aed]/15 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.03em] text-[#93f72b] shadow-[0_0_15px_rgba(124,58,237,0.25)] backdrop-blur-md sm:text-xs">
               {HOME_COPY.badge}
             </div>
          </div>

          <h1 className="text-5xl md:text-6xl lg:text-7xl text-white mb-8 font-headline font-extrabold tracking-tight whitespace-nowrap drop-shadow-lg">
            {HOME_COPY.titleLine1} <span className="italic">{HOME_COPY.titleHighlight}</span><br />
            {HOME_COPY.titleLine2Suffix} {HOME_COPY.titleExtraLines?.[0] ?? ""}
          </h1>

          <div className="max-w-xl w-full space-y-4 flex flex-col items-center">
            <p className="text-white text-sm leading-relaxed px-4">
              Câu hỏi cá nhân hoá theo CV & JD, phản hồi chi tiết sau mỗi buổi.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
              <button
                onClick={() => navigate("/cv-analysis")}
                className="rounded-full px-8 py-3 text-[#0f172a] text-sm font-bold transition-all hover:brightness-110 active:scale-[0.98] flex items-center gap-2 shadow-[0_0_20px_rgba(147,247,43,0.3)]"
                style={{ background: "#93f72b" }}
              >
                <Zap className="h-4 w-4" />
                {HOME_COPY.cta}
              </button>
              {HOME_COPY.ctaMentor && (
                <button
                  onClick={() => navigate("/mentors")}
                  className="rounded-full px-8 py-3 text-white text-sm font-bold transition-all border border-white/20 bg-black/40 backdrop-blur-md shadow-lg hover:bg-white/10 hover:text-[#93f72b] active:scale-[0.98] flex items-center gap-2"
                >
                  <Users className="h-4 w-4" />
                  {HOME_COPY.ctaMentor}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Social icons footer */}
        <div className="relative z-10 flex justify-center gap-4 pb-12 mt-auto">
          {SOCIAL_LINKS.map((social) => {
            const Icon = social.icon;
            return (
              <a
                key={social.name}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                title={social.name}
                aria-label={social.name}
                className="liquid-glass rounded-full p-4 text-white/80 hover:text-[#93f72b] hover:border-[#93f72b]/50 hover:bg-[#93f72b]/10 transition-all flex items-center justify-center"
              >
                <Icon className="w-5 h-5" />
              </a>
            );
          })}
        </div>
      </div>
    </>
  );
}
