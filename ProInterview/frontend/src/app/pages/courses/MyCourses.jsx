import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router";
import { BookOpen, PlayCircle, Trophy, Flame, TrendingUp, Clock, ArrowRight } from "lucide-react";
import { enrollmentApi } from "../../utils/enrollmentApi";
import { toastApiError } from "../../utils/apiToast";
import { normalizeCourseStats } from "../../utils/courseStats";
import { enrollmentAccessGranted } from "../../utils/enrollmentAccess.js";
import { mediaSrc, DEFAULT_COURSE_THUMB, avatarSrc } from "../../utils/mediaUrl";
import { ImageWithFallback } from "../../components/figma/ImageWithFallback";
import { MentorPageShell } from "../../components/mentor/MentorPageShell";
import { CustomerPageHeader } from "../../components/layout/CustomerPageHeader";
import { CUSTOMER_SHELL_GUTTER, CUSTOMER_SHELL_MAX } from "../../components/layout/customerShellLayout";
import { CustomerStatGrid, CustomerStatCard } from "../../components/shared/CustomerStatCards";

function CourseCard({ item, onDetails }) {
  const { course, progressPct } = item;
  const description =
    course.description?.trim() ||
    `Khóa học từ ${course.mentorName || "mentor"} — học theo lộ trình video ngắn, dễ áp dụng.`;

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-violet-200/70 bg-white shadow-sm transition-shadow hover:border-violet-300/80 hover:shadow-md">
      <div className="relative aspect-[5/3] w-full overflow-hidden bg-violet-50/80">
        <ImageWithFallback
          src={course.thumbnail}
          alt=""
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-black/70 via-black/30 to-transparent px-3 py-2.5">
          <span className="flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/60 bg-white/20">
            {course.mentorAvatar ? (
              <img src={course.mentorAvatar} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-[10px] font-bold text-white">{course.mentorName?.[0] || "M"}</span>
            )}
          </span>
          <div className="min-w-0 leading-tight text-white">
            <p className="truncate text-xs font-bold">{course.mentorName || "Mentor"}</p>
            <p className="flex items-center gap-1 text-[10px] text-white/80">
              <Clock className="size-2.5" />
              {course.lessonsCount} bài học
            </p>
          </div>
        </div>
      </div>
      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <h3 className="line-clamp-2 text-xs font-bold leading-snug text-slate-900 transition-colors group-hover:text-[#8037f4] sm:text-sm">
          {course.title}
        </h3>
        <p className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-slate-500 sm:text-xs">
          {description}
        </p>

        <div className="mt-3 flex-1">
          <div className="flex items-center justify-between text-[11px] sm:text-xs">
            <span className="font-medium text-slate-500">Tiến độ học</span>
            <span className="font-bold text-[#8037f4]">{progressPct}%</span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-violet-100">
            <div
              className="h-full rounded-full bg-[#8037f4]"
              style={{ width: `${Math.min(100, Math.max(0, progressPct))}%` }}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={onDetails}
          className="mt-4 -mx-3 -mb-3 flex items-center justify-center gap-1.5 border-t border-slate-100 py-3 text-xs font-semibold text-[#8037f4] transition-colors hover:bg-violet-50 sm:-mx-4 sm:-mb-4 sm:text-sm"
        >
          Chi tiết
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </article>
  );
}

function EmptyCourses({ onBrowse }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-16 text-center sm:py-24">
      <div className="relative mb-8 flex h-40 w-40 items-center justify-center sm:h-48 sm:w-48">
        <div className="absolute inset-0 rounded-full bg-violet-100/80" />
        <div className="absolute -right-1 top-2 flex size-10 items-center justify-center rounded-full bg-[#8037f4] text-lg font-bold text-white shadow-md">
          ?
        </div>
        <div className="relative flex size-24 items-center justify-center rounded-2xl border-2 border-dashed border-violet-200 bg-white shadow-sm">
          <BookOpen className="size-12 text-violet-300" strokeWidth={1.25} />
        </div>
      </div>
      <h2 className="text-lg font-bold text-violet-950 sm:text-xl">Bạn chưa mua khóa học nào</h2>
      <p className="mt-2 max-w-sm text-sm text-violet-600">
        Hãy khám phá các khóa học phù hợp với bạn
      </p>
      <button
        type="button"
        onClick={onBrowse}
        className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#8037f4] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-700"
      >
        <PlayCircle className="size-4" />
        Khám phá khóa học
      </button>
    </div>
  );
}

export function MyCourses() {
  const navigate = useNavigate();
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await enrollmentApi.getMyEnrollments();
      if (res.success) {
        const mapped = res.enrollments
          .filter((e) => e.courseId)
          .map((e) => {
            const c = e.courseId;
            const lessons = (c.modules || []).flatMap((module) =>
              (module.lessons || []).map((lesson) => ({
                id: String(lesson._id),
                title: lesson.title,
                duration: lesson.durationMinutes || 0,
              })),
            );
            const completedLessonIds = (e.completedLessons || []).map((id) => String(id));
            const totalCount = lessons.length || c.totalLessons || 1;
            const pct = Math.round((completedLessonIds.length / totalCount) * 100);
            const { rating } = normalizeCourseStats(c.stats);

            return {
              course: {
                id: c._id,
                title: c.title,
                description: c.description || c.shortDescription || "",
                thumbnail: mediaSrc(c.thumbnail, DEFAULT_COURSE_THUMB),
                mentorName: c.mentorId?.userId?.name || "Mentor",
                mentorAvatar: avatarSrc(c.mentorId?.userId?.avatar),
                rating,
                lessonsCount: totalCount,
                lessons,
              },
              progressPct: pct,
              isCompleted: pct === 100,
              hasPaidAccess: enrollmentAccessGranted(e),
              coursePrice: Number(c.price ?? 0),
            };
          });
        setEnrolledCourses(mapped);
      } else {
        toastApiError(res.error, "Không thể tải danh sách khóa học.");
      }
    } catch {
      toastApiError("Lỗi kết nối khi tải khóa học của bạn.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const stats = useMemo(() => {
    const total = enrolledCourses.length;
    const completed = enrolledCourses.filter((item) => item.isCompleted).length;
    const avgProgress = total
      ? Math.round(enrolledCourses.reduce((sum, item) => sum + item.progressPct, 0) / total)
      : 0;
    return { total, completed, inProgress: total - completed, avgProgress };
  }, [enrolledCourses]);

  return (
    <MentorPageShell bottomPad="pb-20">
      <div className={`relative z-10 flex flex-col pb-10 pt-8 sm:pt-10 ${CUSTOMER_SHELL_GUTTER}`}>
        <div className={`${CUSTOMER_SHELL_MAX} w-full`}>
          <CustomerPageHeader
            title={<span className="text-[#8037f4]">Khóa học của bạn</span>}
            subtitle="Tiếp tục xem lại bài cũ và theo dõi tiến độ trong các khóa đã mua."
            className="mb-6"
          />

          <CustomerStatGrid className="mb-6">
            <CustomerStatCard icon={BookOpen} value={stats.total} label="Khóa đã mua" />
            <CustomerStatCard icon={Trophy} value={stats.completed} label="Đã hoàn thành" tone="lime" />
            <CustomerStatCard icon={Flame} value={stats.inProgress} label="Đang học" />
            <CustomerStatCard icon={TrendingUp} value={`${stats.avgProgress}%`} label="Tiến độ trung bình" />
          </CustomerStatGrid>

          <div className="rounded-3xl border border-violet-200/80 bg-white p-4 shadow-sm sm:p-6">
            {loading ? (
              <div className="flex min-h-[280px] items-center justify-center">
                <div className="size-10 animate-spin rounded-full border-4 border-[#8037f4] border-t-transparent" />
              </div>
            ) : enrolledCourses.length === 0 ? (
              <EmptyCourses onBrowse={() => navigate("/courses")} />
            ) : (
              <div className="grid grid-cols-1 gap-4 min-[720px]:grid-cols-2 min-[1100px]:grid-cols-3 min-[1100px]:gap-5">
                {enrolledCourses.map((item) => (
                  <CourseCard
                    key={item.course.id}
                    item={item}
                    onDetails={() => navigate(`/courses/${item.course.id}`)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </MentorPageShell>
  );
}
