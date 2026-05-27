import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { BookOpen, PlayCircle } from "lucide-react";
import { enrollmentApi } from "../../utils/enrollmentApi";
import { toastApiError } from "../../utils/apiToast";
import { normalizeCourseStats } from "../../utils/courseStats";
import { enrollmentAccessGranted } from "../../utils/enrollmentAccess.js";
import { mediaSrc, DEFAULT_COURSE_THUMB, avatarSrc } from "../../utils/mediaUrl";
import { ImageWithFallback } from "../../components/figma/ImageWithFallback";
import { MentorPageShell } from "../../components/mentor/MentorPageShell";
import { CustomerPageHeader } from "../../components/layout/CustomerPageHeader";
import { CUSTOMER_SHELL_GUTTER, CUSTOMER_SHELL_MAX } from "../../components/layout/customerShellLayout";

function CourseCard({ item, onDetails }) {
  const { course } = item;
  const description =
    course.description?.trim() ||
    `Khóa học từ ${course.mentorName || "mentor"} — học theo lộ trình video ngắn, dễ áp dụng.`;

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-violet-200/70 bg-white shadow-sm transition-shadow hover:border-violet-300/80 hover:shadow-md">
      <div className="aspect-[5/3] w-full overflow-hidden bg-violet-50/80">
        <ImageWithFallback
          src={course.thumbnail}
          alt=""
          className="h-full w-full object-cover"
        />
      </div>
      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <h3 className="line-clamp-2 text-xs font-bold leading-snug text-violet-950 transition-colors group-hover:text-[#8037f4] sm:text-sm">
          {course.title}
        </h3>
        <p className="mt-1.5 line-clamp-2 flex-1 text-[11px] leading-relaxed text-slate-500 sm:text-xs">
          {description}
        </p>
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={onDetails}
            className="text-xs font-semibold text-[#8037f4] transition-colors hover:text-[#6d2fd6] hover:underline sm:text-sm"
          >
            Chi tiết
          </button>
        </div>
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

  return (
    <MentorPageShell bottomPad="pb-20">
      <div className={`relative z-10 flex flex-col pb-10 pt-8 sm:pt-10 ${CUSTOMER_SHELL_GUTTER}`}>
        <div className={`${CUSTOMER_SHELL_MAX} w-full`}>
          <CustomerPageHeader
            badge="Khóa học của tôi"
            title={
              <>
                Danh sách khóa <span className="text-[#6d2fd6]">bạn đã mua</span>
              </>
            }
            subtitle="Mở khóa để xem nội dung, tiếp tục học hoặc ôn lại bài đã hoàn thành."
            className="mb-6"
          />

          <div className="rounded-3xl border border-violet-200/80 bg-gradient-to-b from-violet-50/50 via-white to-white p-4 shadow-sm sm:p-6">
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
