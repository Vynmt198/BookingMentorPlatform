import React, { useEffect, useState } from "react";
import {
  Star,
  Check,
  ChevronDown,
  ChevronUp,
  PlayCircle,
  FileText,
  HelpCircle,
  BookOpen,
  Clock,
  Award,
  Video,
  Lock,
  ShoppingCart,
  BadgeCheck,
  Pencil,
  MessageCircle,
} from "lucide-react";
import { ImageWithFallback } from "../figma/ImageWithFallback";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import { submitReview } from "../../utils/courseApi";
import { fetchMyReviewForTarget } from "../../utils/reviewsApi";
import { ReviewReplyBlock } from "../reviews/ReviewReplyBlock";
import { toastApiError, toastApiSuccess } from "../../utils/apiToast";
import { avatarSrc } from "../../utils/mediaUrl";

export const formatCoursePrice = (price) => {
  if (price === 0) return "Miễn phí";
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price);
};

export const formatCourseDuration = (minutes) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m > 0 ? `${m}m` : ""}`.trim() : `${m}m`;
};

export function StarRating({ rating, size = "sm" }) {
  const s = size === "lg" ? "size-5" : "size-4";
  const n = rating == null ? NaN : Number(rating);
  const filled = Number.isFinite(n) ? Math.min(5, Math.max(0, Math.round(n))) : 0;
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          fill={i <= filled ? "#FFD600" : "none"}
          className={s}
          style={{ color: "#FFD600" }}
        />
      ))}
    </div>
  );
}

function buildCourseIncludes(course) {
  const items = [];
  if (course.modulesCount > 0) {
    items.push({ icon: BookOpen, text: `${course.modulesCount} học phần` });
  }
  if (course.lessonsCount > 0) {
    items.push({ icon: PlayCircle, text: `${course.lessonsCount} bài học` });
  }
  if (course.duration > 0) {
    items.push({ icon: Clock, text: `Thời lượng ${formatCourseDuration(course.duration)}` });
  }
  items.push({ icon: Video, text: "Video & tài liệu bài giảng" });
  if (course.certificateEnabled) {
    items.push({ icon: Award, text: "Chứng chỉ hoàn thành khóa học" });
  }
  items.push({ icon: Check, text: "Truy cập khóa học không giới hạn" });
  return items;
}

function youtubeEmbedUrl(url) {
  if (!url) return null;
  const m = String(url).match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

export function CoursePurchaseCard({
  course,
  hasPaidEnrollment,
  hasPendingPayment,
  canTakeStudentActions,
  isReadOnlyMentorView,
  onEnroll,
  onContinueLearn,
  onContinuePayment,
}) {
  const price = Number(course.price) || 0;
  const discountPrice = Number(course.discountPrice) || 0;
  const hasDiscount = discountPrice > 0 && discountPrice < price;
  const displayPrice = hasDiscount ? discountPrice : price;
  const discountPct = hasDiscount ? Math.round((1 - discountPrice / price) * 100) : 0;
  const embed = youtubeEmbedUrl(course.previewVideoUrl);
  const includes = buildCourseIncludes(course);

  return (
    <div className="w-full max-w-[calc(300px+1rem)] overflow-hidden rounded-md border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.08)] lg:max-w-none">
      <div className="relative h-48 w-full overflow-hidden bg-slate-900 lg:h-52">
        {embed ? (
          <iframe
            title="Xem trước khóa học"
            src={embed}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <ImageWithFallback src={course.thumbnail} alt="" className="h-full w-full object-cover" />
        )}
      </div>

      <div className="space-y-3 p-4">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-2xl font-bold text-slate-900">{formatCoursePrice(displayPrice)}</span>
          {hasDiscount ? (
            <>
              <span className="text-sm text-slate-400 line-through">{formatCoursePrice(price)}</span>
              <span className="rounded-sm bg-sky-50 px-2 py-0.5 text-xs font-bold text-sky-700">
                Giảm {discountPct}%
              </span>
            </>
          ) : null}
        </div>

        {hasPaidEnrollment && !isReadOnlyMentorView ? (
          <button
            type="button"
            onClick={onContinueLearn}
            className="flex w-full items-center justify-center gap-2 rounded-sm bg-[#8037f4] py-3 text-sm font-bold text-white transition-all hover:bg-[#5b2bc4]"
          >
            <PlayCircle className="size-4" />
            Tiếp tục học
          </button>
        ) : hasPaidEnrollment && isReadOnlyMentorView ? (
          <button
            type="button"
            disabled
            className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-sm bg-[#8037f4]/50 py-3 text-sm font-bold text-white"
          >
            <Lock className="size-4" />
            Mentor chỉ xem
          </button>
        ) : hasPendingPayment && canTakeStudentActions ? (
          <button
            type="button"
            onClick={onContinuePayment}
            className="flex w-full items-center justify-center gap-2 rounded-sm bg-[#8037f4] py-3 text-sm font-bold text-white transition-all hover:bg-[#5b2bc4]"
          >
            <ShoppingCart className="size-4" />
            Tiếp tục thanh toán
          </button>
        ) : (
          <button
            type="button"
            onClick={canTakeStudentActions ? onEnroll : undefined}
            disabled={!canTakeStudentActions}
            className="flex w-full items-center justify-center gap-2 rounded-sm bg-[#8037f4] py-3 text-sm font-bold text-white transition-all hover:bg-[#5b2bc4] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ShoppingCart className="size-4" />
            {canTakeStudentActions
              ? price === 0
                ? "Đăng ký miễn phí"
                : "Ghi danh khóa học"
              : "Mentor chỉ xem"}
          </button>
        )}

        <div>
          <p className="mb-2 text-sm font-bold text-slate-900">Khóa học này bao gồm</p>
          <ul className="space-y-2">
            {includes.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.text} className="flex items-start gap-2.5 text-sm text-slate-600">
                  <Icon className="mt-0.5 size-4 shrink-0 text-slate-500" />
                  <span>{item.text}</span>
                </li>
              );
            })}
          </ul>
        </div>

        {!hasPaidEnrollment ? (
          <p className="border-t border-slate-100 pt-3 text-xs leading-relaxed text-slate-500">
            Bạn đang xem preview của khóa học này. Để truy cập đầy đủ nội dung, vui lòng đăng ký khóa học.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function LessonIcon({ type }) {
  if (type === "quiz") return <HelpCircle className="size-4 shrink-0 text-slate-400" />;
  if (type === "document") return <FileText className="size-4 shrink-0 text-slate-400" />;
  return <PlayCircle className="size-4 shrink-0 text-slate-400" />;
}

export function CourseCurriculumAccordion({ modules, certificateEnabled, enrolled }) {
  const [open, setOpen] = useState(() => {
    const init = {};
    modules.forEach((_, i) => {
      init[i] = i === 0;
    });
    return init;
  });

  if (!modules.length) {
    return (
      <p className="rounded-md border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
        Chưa có nội dung bài học.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
      {modules.map((mod, modIndex) => (
        <div key={mod.id} className="border-b border-slate-200 last:border-b-0">
          <button
            type="button"
            onClick={() => setOpen((v) => ({ ...v, [modIndex]: !v[modIndex] }))}
            className="flex w-full items-center justify-between gap-3 bg-slate-50 px-4 py-2.5 text-left transition-colors hover:bg-slate-100/80"
          >
            <span className="text-sm font-bold text-slate-800">
              {mod.title || `Phần ${modIndex + 1}`}
            </span>
            {open[modIndex] ? (
              <ChevronUp className="size-4 shrink-0 text-slate-500" />
            ) : (
              <ChevronDown className="size-4 shrink-0 text-slate-500" />
            )}
          </button>
          {open[modIndex] ? (
            <ul className="divide-y divide-slate-100">
              {mod.lessons.map((lesson) => (
                <li key={lesson.id} className="flex items-center gap-3 px-4 py-2.5">
                  <LessonIcon type={lesson.type} />
                  <span
                    className={`min-w-0 flex-1 truncate text-sm ${
                      lesson.isPreview || enrolled
                        ? "font-medium text-[#2563eb] hover:underline"
                        : "text-slate-700"
                    }`}
                  >
                    {lesson.title}
                  </span>
                  {!lesson.isPreview && !enrolled ? (
                    <Lock className="size-3.5 shrink-0 text-slate-300" />
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ))}
      {certificateEnabled ? (
        <div className="flex items-center gap-3 border-t border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-600">
          <Lock className="size-4 shrink-0 text-slate-400" />
          <span>Chứng chỉ hoàn thành khóa học</span>
        </div>
      ) : null}
    </div>
  );
}

export function CourseInstructorBlock({ course, onViewMentor, canNavigate }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4 sm:p-5">
      <button
        type="button"
        onClick={canNavigate ? onViewMentor : undefined}
        className={`mb-3 text-left ${canNavigate ? "hover:opacity-90" : ""}`}
        disabled={!canNavigate}
      >
        <h2 className="text-lg font-bold text-[#2563eb]">{course.mentorName}</h2>
        <p className="text-sm text-slate-500">{course.mentorTitle}</p>
      </button>
      <div className="flex items-start gap-4 rounded-sm border border-slate-100 bg-slate-50/80 p-4">
        <div className="relative shrink-0">
          <img
            src={course.mentorAvatar}
            alt={course.mentorName}
            className="size-20 rounded-sm object-cover"
          />
          <BadgeCheck className="absolute -bottom-1 -right-1 size-5 text-[#2563eb]" />
        </div>
        <div className="min-w-0 flex-1 text-sm text-slate-600">
          <p className="font-semibold text-slate-800">Mentor {course.mentorName}</p>
          <p className="mt-1 text-slate-500">{course.mentorCompany}</p>
          <p className="mt-2 text-xs text-slate-500">
            {course.studentsCount.toLocaleString("vi-VN")} học viên đã tham gia các khóa học
          </p>
        </div>
      </div>
    </div>
  );
}

export function CourseReviewsBlock({ course, enrolled, reviews, onReviewSubmitted }) {
  const [showAll, setShowAll] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!enrolled || !course?.id) return;
    void fetchMyReviewForTarget("course", course.id).then((res) => {
      if (res.success && res.hasReview) setSubmitted(true);
    });
  }, [enrolled, course?.id]);

  const visible = showAll ? reviews : reviews.slice(0, 3);
  const ratingLabel =
    course.rating != null ? `${Number(course.rating).toFixed(1)}` : "—";

  const handleSubmit = async () => {
    if (!reviewRating || reviewComment.trim().length < 30) return;
    setSubmitting(true);
    const res = await submitReview({
      targetType: "course",
      targetId: course.id,
      rating: reviewRating,
      comment: reviewComment,
    });
    setSubmitting(false);
    if (res.success) {
      setSubmitted(true);
      setShowDialog(false);
      setReviewRating(0);
      setReviewComment("");
      toastApiSuccess("Đã gửi đánh giá. Cảm ơn bạn!");
      onReviewSubmitted?.(res.review);
    } else {
      toastApiError(res.error, "Gửi đánh giá thất bại.");
    }
  };

  return (
    <div className="rounded-md border border-slate-200 bg-white p-4 sm:p-5">
      <h2 className="mb-3 text-lg font-bold text-slate-900">Đánh giá khóa học</h2>

      {!enrolled ? (
        <div className="mb-3 flex items-center gap-2 rounded-sm border border-violet-100 bg-violet-50/90 px-4 py-2.5 text-sm text-violet-900">
          <Lock className="size-4 shrink-0" />
          Bạn cần tham gia khóa học để có thể đánh giá.
        </div>
      ) : null}

      {enrolled && !submitted ? (
        <button
          type="button"
          onClick={() => setShowDialog(true)}
          className="mb-3 flex w-full items-center justify-center gap-2 rounded-sm border border-violet-200 bg-violet-50 py-2.5 text-sm font-semibold text-violet-900 hover:bg-violet-100"
        >
          <Pencil className="size-4" />
          Viết đánh giá
        </button>
      ) : null}
      {enrolled && submitted ? (
        <p className="mb-3 rounded-sm border border-emerald-100 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-900">
          Bạn đã gửi đánh giá cho khóa học này.
        </p>
      ) : null}

      <p className="mb-3 flex flex-wrap items-center gap-2 text-sm text-slate-700">
        <Star className="size-4 fill-amber-400 text-amber-400" />
        <span className="font-bold">{ratingLabel}</span>
        <span>xếp hạng khóa học</span>
        <span className="text-slate-400">·</span>
        <span>
          {course.reviewsCount} Đánh giá
        </span>
      </p>

      <div className="space-y-3">
        {visible.map((r) => (
          <div key={r.id} className="border-b border-slate-100 pb-3 last:border-0">
            <div className="mb-2 flex items-center gap-3">
              <img
                src={avatarSrc(r.userAvatar)}
                alt=""
                className="size-9 rounded-full object-cover"
              />
              <div>
                <p className="text-sm font-bold text-slate-900">{r.userName || "Học viên"}</p>
                <StarRating rating={r.rating} />
              </div>
            </div>
            <p className="text-sm leading-relaxed text-slate-700">{r.comment}</p>
            <ReviewReplyBlock reply={r.reply} />
            {r.createdAt ? (
              <p className="mt-1 text-xs text-slate-400">
                {new Date(r.createdAt).toLocaleString("vi-VN", {
                  hour: "2-digit",
                  minute: "2-digit",
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}
              </p>
            ) : null}
          </div>
        ))}
      </div>

      {reviews.length === 0 ? (
        <p className="text-sm text-slate-500">Chưa có đánh giá từ học viên.</p>
      ) : null}

      {reviews.length > 3 ? (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="mt-4 w-full text-center text-sm font-semibold text-[#8037f4] hover:underline"
        >
          {showAll ? "Thu gọn đánh giá" : "Hiển thị tất cả đánh giá"}
        </button>
      ) : null}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="border border-slate-200 bg-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Đánh giá khóa học</DialogTitle>
            <DialogDescription className="text-sm text-slate-600">
              Chia sẻ trải nghiệm sau khi học (tối thiểu 30 ký tự).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setReviewRating(s)}
                  onMouseEnter={() => setHoverRating(s)}
                  onMouseLeave={() => setHoverRating(0)}
                >
                  <Star
                    className="size-8"
                    fill={s <= (hoverRating || reviewRating) ? "#FFD600" : "none"}
                    style={{ color: s <= (hoverRating || reviewRating) ? "#FFD600" : "#cbd5e1" }}
                  />
                </button>
              ))}
            </div>
            <textarea
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              rows={4}
              className="w-full rounded-sm border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#8037f4] focus:ring-2 focus:ring-violet-500/20"
              placeholder="Khóa học giúp bạn điều gì?"
            />
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!reviewRating || reviewComment.trim().length < 30 || submitting}
              className="flex w-full items-center justify-center gap-2 rounded-sm bg-[#8037f4] py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              <MessageCircle className="size-4" />
              Gửi đánh giá
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
