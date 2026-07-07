import React from "react";
import {
  ArrowRight,
  Zap,
  Sparkles,
  Twitter,
  Linkedin,
  Facebook,
  Instagram,
  Youtube,
} from "lucide-react";

const NAV_LINKS = [
  { label: "Mentors", href: "#/mentors" },
  { label: "Courses", href: "#/courses" },
  { label: "CV Analysis", href: "#/cv-analysis" },
  { label: "Pricing", href: "#/pricing" },
];

const SOCIAL_LINKS = [
  { icon: Twitter, label: "Twitter", href: "#" },
  { icon: Linkedin, label: "LinkedIn", href: "#" },
  { icon: Facebook, label: "Facebook", href: "#" },
  { icon: Instagram, label: "Instagram", href: "#" },
  { icon: Youtube, label: "YouTube", href: "#" },
];

export function CinematicHeroPage() {
  return (
    <div className="min-h-screen bg-[#0a0118] overflow-hidden relative flex flex-col">

      {/* ── Background Video ─────────────────────────────────
          Place your video at /public/hero-bg.mp4
          The bg-[#0a0118] acts as fallback when video is absent.
      ──────────────────────────────────────────────────────── */}
      <video
        className="absolute inset-0 w-full h-full object-cover object-bottom scale-[1.05] z-0"
        autoPlay
        loop
        muted
        playsInline
        src="/hero-bg.mp4"
      />

      {/* ── Overlay: mix-blend-color purple wash ──────────── */}
      <div
        className="absolute inset-0 z-[1] mix-blend-color bg-[#630ed4]/20 pointer-events-none"
        aria-hidden
      />

      {/* ── Overlay: directional gradient ────────────────── */}
      <div
        className="absolute inset-0 z-[2] bg-gradient-to-tr from-[#630ed4]/40 via-transparent to-[#93f72b]/10 pointer-events-none"
        aria-hidden
      />

      {/* ── Central soft glow behind hero text ───────────── */}
      <div
        className="absolute z-[3] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-[#630ed4]/25 blur-[100px] rounded-full pointer-events-none"
        aria-hidden
      />

      {/* ── Navbar ───────────────────────────────────────── */}
      <header className="relative z-10 w-full px-4 sm:px-6 pt-5">
        <nav className="liquid-glass max-w-6xl mx-auto rounded-2xl px-5 py-3 flex items-center justify-between gap-4">

          {/* Logo */}
          <a href="#/" className="flex items-center gap-2 shrink-0">
            <img
              src="/logo-mark.png?v=9"
              alt="ProInterview"
              className="h-7 w-auto object-contain"
            />
            <span className="font-black text-white text-sm tracking-tight hidden sm:block">
              ProInterview
            </span>
          </a>

          {/* Centre nav links */}
          <ul className="hidden md:flex items-center gap-7">
            {NAV_LINKS.map(({ label, href }) => (
              <li key={label}>
                <a
                  href={href}
                  className="text-white/65 hover:text-[#93f72b] text-sm font-medium transition-colors duration-200"
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>

          {/* Auth buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <a
              href="#/login"
              className="text-white/65 hover:text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors duration-200"
            >
              Đăng nhập
            </a>
            <a
              href="#/register"
              className="bg-[#93f72b] text-slate-900 font-black text-sm px-4 py-2.5 rounded-xl hover:brightness-105 active:scale-[0.98] shadow-[0_8px_24px_-6px_rgba(147,247,43,0.5)] transition-all duration-200 whitespace-nowrap"
            >
              Dùng thử miễn phí
            </a>
          </div>
        </nav>
      </header>

      {/* ── Hero Content ─────────────────────────────────── */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 -translate-y-[20%]">

        {/* Eyebrow badge */}
        <div className="liquid-glass rounded-full px-4 py-1.5 inline-flex items-center gap-2 mb-6">
          <Sparkles className="w-3.5 h-3.5 text-[#93f72b]" />
          <span className="text-white/75 text-xs font-bold tracking-[0.12em] uppercase">
            AI-Powered Interview Prep
          </span>
        </div>

        {/* Headline — Instrument Serif for editorial elegance */}
        <h1
          className="text-center text-white leading-[1.07] tracking-[-0.01em] drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)] max-w-[52rem]"
          style={{
            fontFamily: "'Instrument Serif', Georgia, 'Times New Roman', serif",
            fontSize: "clamp(2.6rem, 7vw, 5.5rem)",
          }}
        >
          Master Your Interview.{" "}
          <span className="text-[#93f72b] italic">Land Your Dream Job.</span>
        </h1>

        {/* Sub-headline */}
        <p className="mt-5 text-white/55 text-center leading-relaxed max-w-xl drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]"
          style={{ fontSize: "clamp(0.95rem, 1.8vw, 1.125rem)" }}>
          Luyện phỏng vấn với AI, phân tích CV thông minh, kết nối mentor 1:1 —
          tất cả trong một nền tảng.
        </p>

        {/* CTA row */}
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          {/* Primary — solid lime */}
          <a
            href="#/register"
            className="inline-flex items-center gap-2 bg-[#93f72b] text-slate-900 font-black text-sm px-7 py-3.5 rounded-2xl hover:brightness-105 active:scale-[0.98] shadow-[0_8px_24px_-6px_rgba(147,247,43,0.5)] transition-all duration-200"
          >
            Bắt đầu miễn phí
            <ArrowRight className="w-4 h-4" />
          </a>

          {/* Secondary — liquid glass */}
          <a
            href="#/mentors"
            className="liquid-glass inline-flex items-center gap-2 text-white font-semibold text-sm px-7 py-3.5 rounded-2xl hover:bg-white/[0.07] active:scale-[0.98] transition-all duration-200"
          >
            <Zap className="w-4 h-4 text-[#93f72b]" />
            Xem Mentor
          </a>
        </div>
      </main>

      {/* ── Social Icons ─────────────────────────────────── */}
      <footer className="relative z-10 flex items-center justify-center gap-3 pb-8">
        {SOCIAL_LINKS.map(({ icon: Icon, label, href }) => (
          <a
            key={label}
            href={href}
            aria-label={label}
            className="liquid-glass w-10 h-10 rounded-full flex items-center justify-center text-white/50 hover:text-[#93f72b] hover:border-[#93f72b]/30 transition-all duration-200"
          >
            <Icon className="w-[1.05rem] h-[1.05rem]" />
          </a>
        ))}
      </footer>
    </div>
  );
}
