import React from "react";
import { ArrowRight, Award } from "lucide-react";
import { HOME_SECTION_INNER } from "../layout/customerShellLayout";
import { homeSectionClasses as homeTy, homeSectionTitleStyle } from "../../constants/homeTypography";

const NEWS_DATA = [
  {
    id: 1,
    image: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&q=80&w=800",
    date: "JUN 11, 2026",
    title: "Dự án ProInterview tiến vào Bán kết “Ra Khơi 2026”",
    author: "ProInterview Team",
    authorWebsite: "prointerview.vn",
    url: "#"
  },
  {
    id: 2,
    image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=800",
    date: "JUN 8, 2026",
    title: "ProInterview Đồng Hành Cùng Hội Thảo Phụ Huynh Tại Đại Học FPT Hồ Chí Minh",
    author: "ProInterview Team",
    authorWebsite: "prointerview.vn",
    url: "#"
  },
  {
    id: 3,
    image: "https://images.unsplash.com/photo-1515169067868-5387ec356754?auto=format&fit=crop&q=80&w=800",
    date: "JUN 8, 2026",
    title: "Trình Bày Demo Dự Án & Nhận Góp Ý từ Thầy Phó Hiệu Trưởng FPTU",
    author: "ProInterview Team",
    authorWebsite: "prointerview.vn",
    url: "#"
  }
];

export function NewsFeatureShowcase() {
  return (
    <section
      id="news"
      className="home-news-panel landing-section-flow relative z-10 flex min-h-svh scroll-mt-24 flex-col justify-center overflow-x-clip pb-8 pt-8 sm:pb-10 sm:pt-10 lg:pb-12 lg:pt-12 bg-news-panel"
    >
      <style>{`
        .bg-news-panel {
          background-color: #eee0fb;
        }
      `}</style>
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
        <svg viewBox="0 0 100 100" className="absolute -left-6 bottom-[-4rem] h-[25rem] w-[25rem] -rotate-6" fill="none">
          <path
            d="M15 68C11 46 32 30 52 38C72 46 74 70 56 76C38 82 24 66 32 52C40 38 62 32 82 40"
            stroke="#7c3aed"
            strokeOpacity="0.13"
            strokeWidth="13"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <svg viewBox="0 0 160 80" className="absolute -right-12 top-[0%] h-[22rem] w-[44rem] rotate-3" fill="none">
          <path
            d="M10 50C10 25 45 20 55 40C65 60 40 65 35 45C30 25 70 10 100 25C130 40 140 65 150 45"
            stroke="#7c3aed"
            strokeOpacity="0.18"
            strokeWidth="13"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div className={`${HOME_SECTION_INNER} relative z-10 flex flex-col items-center`}>

        {/* Header */}
        <div className="mb-6 sm:mb-8 flex w-full max-w-4xl flex-col items-center text-center">
          <div className="mb-3 sm:mb-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#7c3aed]/30 bg-[#7c3aed]/10 px-3.5 py-1 text-sm font-semibold text-[#7c3aed] sm:text-base">
              <Award className="size-3.5" />
              Tin tức & Hoạt động
            </div>
          </div>

          <h2 className={`home-section-title font-headline font-normal leading-[1.08] tracking-tight max-w-[20em]`} style={homeSectionTitleStyle}>
            <span className="text-[#000000]">Thành tựu nổi bật </span>
            <span className="text-[#7c3aed]">từ ProInterview</span>
          </h2>

          <p className={`text-pretty text-lg font-medium leading-relaxed text-slate-600 sm:text-xl mt-2 sm:mt-3 max-w-2xl`}>
            Cập nhật những tin tức, sự kiện và cột mốc phát triển mới nhất của chúng tôi.
          </p>
        </div>

        {/* Grid Cards */}
        <div className="grid w-full grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {NEWS_DATA.map((news) => (
            <a
              href={news.url}
              key={news.id}
              className="group flex flex-col overflow-hidden rounded-[1.5rem] bg-white shadow-[0_2px_12px_rgba(15,23,42,0.04)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_12px_32px_rgba(124,58,237,0.12)] hover:border-violet-200 border border-black/[0.04]"
            >
              {/* Image Container */}
              <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-100">
                <img
                  src={news.image}
                  alt={news.title}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                  onError={(e) => {
                    if (e.currentTarget.src !== "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3Crect width='1' height='1' fill='%23f1f5f9'/%3E%3C/svg%3E") {
                       e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3Crect width='1' height='1' fill='%23f1f5f9'/%3E%3C/svg%3E";
                    }
                  }}
                />
              </div>

              {/* Content Container */}
              <div className="flex flex-1 flex-col p-5 sm:p-6">
                <span className="mb-2 text-xs font-bold tracking-widest text-[#7c3aed] uppercase">
                  {news.date}
                </span>
                <h3 className="mb-4 font-headline text-[1.1rem] sm:text-[1.2rem] font-bold leading-snug text-slate-900 group-hover:text-[#630ed4] transition-colors line-clamp-2">
                  {news.title}
                </h3>

                {/* Author footer */}
                <div className="mt-auto flex items-center gap-3 pt-2">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-50 border border-violet-100 text-[#7c3aed] font-black text-[15px]">
                    P
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[13px] font-bold text-slate-800 leading-tight">{news.author}</span>
                    <span className="text-[11px] font-medium text-slate-500 leading-tight mt-0.5">{news.authorWebsite}</span>
                  </div>
                </div>
              </div>
            </a>
          ))}
        </div>

        {/* CTA Button */}
        <div className="mt-8 sm:mt-10 flex justify-center w-full">
          <button className="group inline-flex items-center justify-center gap-2 rounded-full bg-[#93f72b] px-7 py-3 sm:px-9 sm:py-3.5 text-[15px] sm:text-base font-bold text-black transition-all hover:-translate-y-0.5 hover:bg-[#a4d64c] hover:shadow-[0_12px_28px_rgba(147,247,43,0.35)] shadow-[0_6px_16px_rgba(147,247,43,0.25)]">
            Xem tất cả
            <ArrowRight className="size-4 sm:size-[18px] transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </div>
    </section>
  );
}
