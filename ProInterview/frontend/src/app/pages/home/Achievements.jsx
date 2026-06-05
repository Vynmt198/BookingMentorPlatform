import React, { useEffect, useState } from "react";
import { getAchievements } from "../../utils/mockAchievements.js";
import { Award, CalendarDays, ChevronRight } from "lucide-react";

export function Achievements() {
  const [achievements, setAchievements] = useState([]);

  useEffect(() => {
    // Chỉ lấy các bài viết đã được publish
    const data = getAchievements().filter(item => item.isPublished);
    setAchievements(data);
  }, []);

  return (
    <div className="min-h-screen bg-transparent">
      {/* Hero Section */}
      <section className="relative pt-12 pb-8 sm:pt-16 sm:pb-12">
        <div
          className="pointer-events-none absolute left-1/2 top-0 z-0 h-[min(60vw,600px)] w-[min(60vw,600px)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#8037f4]/15 blur-[100px] sm:h-[800px] sm:w-[800px] sm:blur-[140px]"
          aria-hidden
        />
        <div className="relative z-10 mx-auto max-w-7xl px-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-violet-100/80 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-violet-800 backdrop-blur-md mb-6 border border-violet-200">
            <Award className="h-4 w-4" />
            Câu chuyện thành công
          </div>
          <h1 className="mx-auto max-w-4xl text-balance text-4xl font-black uppercase tracking-tighter text-slate-900 sm:text-5xl lg:text-7xl">
            Thành tựu <span className="text-[#8037f4]">ProInterview</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base text-slate-600 sm:text-lg">
            Cùng nhìn lại những cột mốc đáng nhớ và sự phát triển không ngừng của nền tảng luyện phỏng vấn ứng dụng AI hàng đầu.
          </p>
        </div>
      </section>

      {/* List Section */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 pb-24">
        {achievements.length === 0 ? (
          <div className="rounded-3xl border border-slate-200/60 bg-white/50 py-24 text-center backdrop-blur-xl">
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest">Chưa có thành tựu nào được đăng tải</p>
          </div>
        ) : (
          <div className="space-y-12 sm:space-y-16">
            {achievements.map((item, index) => (
              <div 
                key={item.id} 
                className="group relative flex flex-col gap-8 rounded-3xl border border-white/40 bg-white/60 p-6 shadow-xl shadow-slate-200/20 backdrop-blur-xl transition-all hover:bg-white/80 hover:shadow-2xl hover:shadow-[#8037f4]/10 sm:flex-row sm:items-center sm:p-8"
              >
                {/* Image */}
                {item.imageUrl && (
                  <div className="w-full shrink-0 overflow-hidden rounded-2xl sm:w-[320px] lg:w-[400px]">
                    <div className="relative pt-[65%] sm:pt-[75%]">
                      <img 
                        src={item.imageUrl} 
                        alt={item.title}
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    </div>
                  </div>
                )}
                
                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-400 mb-3">
                    <CalendarDays className="h-4 w-4" />
                    <time dateTime={item.date}>
                      {new Date(item.date).toLocaleDateString("vi-VN", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric"
                      })}
                    </time>
                  </div>
                  <h3 className="mb-4 text-2xl font-black text-slate-900 lg:text-3xl line-clamp-2 group-hover:text-[#8037f4] transition-colors">
                    {item.title}
                  </h3>
                  <p className="mb-6 text-slate-600 line-clamp-3 leading-relaxed">
                    {item.content}
                  </p>
                  <button className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-[#8037f4] transition-colors hover:text-[#5a22b5]">
                    Xem chi tiết
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
