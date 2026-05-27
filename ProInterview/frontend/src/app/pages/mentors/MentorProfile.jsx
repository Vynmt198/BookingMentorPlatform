import React from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import {
  Star,
  Calendar as CalendarBlank,
  Briefcase,
  Medal,
  Video as VideoCamera,
  ArrowRight,
  ShieldCheck,
  Zap as Lightning,
  AlertTriangle as Warning,
} from "lucide-react";
import { AnimatePresence } from "motion/react";
import { fetchMentor, fetchMentorPublicReviews } from "../../utils/mentorApi";
import { ReportMentorModal } from "../../components/modals/ReportMentorModal";
import { ReviewReplyBlock } from "../../components/reviews/ReviewReplyBlock";
import { MentorPageShell } from "../../components/mentor/MentorPageShell";
import { toastApiError } from "../../utils/apiToast";

const INVALID_COMPANY = new Set(["-", "—", "n/a", "na", "none", ""]);

function normalizeCompanies(mentor) {
  const raw =
    Array.isArray(mentor.companies) && mentor.companies.length
      ? mentor.companies
      : mentor.company
        ? [mentor.company]
        : [];
  return raw
    .map((c) => String(c || "").trim())
    .filter((c) => c && !INVALID_COMPANY.has(c.toLowerCase()));
}

function displayTitle(mentor) {
  const title = (mentor.title || "").trim();
  if (title && title.toLowerCase() !== "mentor") return title;
  if (mentor.field) return mentor.field;
  return "Mentor ProInterview";
}

function formatPriceVnd(amount) {
  const n = Number(amount) || 0;
  return `${n.toLocaleString("vi-VN")}đ`;
}

function StatCell({ label, children }) {
  return (
    <div className="flex flex-col items-center text-center sm:items-start sm:text-left">
      <div className="mb-0.5 text-base font-bold text-slate-900">{children}</div>
      <p className="text-xs font-medium text-slate-500">{label}</p>
    </div>
  );
}

function SectionCard({ title, icon: Icon, children, className = "" }) {
  return (
    <section className={`glass-card p-5 sm:p-6 ${className}`.trim()}>
      {title ? (
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
          {Icon ? <Icon size={16} className="shrink-0 text-violet-600" aria-hidden /> : null}
          {title}
        </h3>
      ) : null}
      {children}
    </section>
  );
}

function EmptyBlock({ icon: Icon, message }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-violet-200/80 bg-violet-50/40 px-4 py-8 text-center">
      {Icon ? (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-violet-500 shadow-sm">
          <Icon size={20} strokeWidth={1.75} aria-hidden />
        </div>
      ) : null}
      <p className="max-w-sm text-sm text-slate-600">{message}</p>
    </div>
  );
}

export function MentorProfile() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const rebookFrom =
    searchParams.get("rebookFrom") ||
    (typeof sessionStorage !== "undefined" ? sessionStorage.getItem("prointerview_rebook_from") : "") ||
    "";
  const bookingHref = rebookFrom
    ? `/booking/${id}?rebookFrom=${encodeURIComponent(rebookFrom)}`
    : `/booking/${id}`;
  const [mentor, setMentor] = React.useState(null);
  const [loadingMentor, setLoadingMentor] = React.useState(true);
  const [showReportModal, setShowReportModal] = React.useState(false);
  const [realReviews, setRealReviews] = React.useState([]);

  React.useEffect(() => {
    if (!id) {
      setMentor(null);
      setLoadingMentor(false);
      return;
    }
    setLoadingMentor(true);
    setMentor(null);
    fetchMentor(id)
      .then((m) => {
        if (m) setMentor(m);
        else toastApiError("Không tìm thấy mentor hoặc không tải được hồ sơ.");
      })
      .catch(() => toastApiError("Lỗi kết nối khi tải hồ sơ mentor."))
      .finally(() => setLoadingMentor(false));
  }, [id]);

  React.useEffect(() => {
    if (!id) return;
    fetchMentorPublicReviews(id).then((res) => {
      if (res.success) setRealReviews(res.reviews);
    });
  }, [id]);

  if (loadingMentor && !mentor) {
    return (
      <MentorPageShell bottomPad="pb-32">
        <div className="flex min-h-[50vh] items-center justify-center px-6">
          <div
            className="h-8 w-8 animate-spin rounded-full border-4 border-violet-300 border-t-violet-700"
            aria-hidden
          />
          <span className="sr-only">Đang tải…</span>
        </div>
      </MentorPageShell>
    );
  }

  if (!mentor) {
    return (
      <MentorPageShell bottomPad="pb-32">
        <div className="px-6 py-20 text-center text-sm font-medium text-slate-600">
          Không tìm thấy mentor.
        </div>
      </MentorPageShell>
    );
  }

  const ratingDisplay = Number(mentor.rating || 0).toFixed(1);
  const reviewCount = mentor.reviews ?? 0;
  const sessionCount = mentor.sessionsDone ?? 0;
  const bioText = (mentor.bio || "").trim();
  const avatarUrl = mentor.avatar?.trim();
  const initials = (mentor.name || "M")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  const companies = normalizeCompanies(mentor);
  const primaryCompany = companies[0] || null;
  const tagList =
    mentor.tags?.length > 0 ? mentor.tags : mentor.specialties?.length ? mentor.specialties : [];
  const experienceYears = Number(mentor.experience) || 0;
  const subtitle = displayTitle(mentor);
  const responseLabel = (mentor.responseTime || "< 24 giờ").trim();

  const bookingFeatures = [
    { icon: VideoCamera, text: "Hỗ trợ Zoom / Google Meet" },
    { icon: CalendarBlank, text: "Tự chọn lịch trình linh hoạt" },
    { icon: ShieldCheck, text: "Cam kết roadmap đầu ra" },
    { icon: Lightning, text: "Feedback gửi sau 24 giờ" },
  ];

  return (
    <MentorPageShell bottomPad="pb-24">
      <div className="relative z-10 mx-auto max-w-6xl px-4 pb-8 pt-6 sm:px-6 sm:pt-8">
        <div className="grid items-start gap-6 lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_340px]">
          {/* Cột trái */}
          <div className="min-w-0 space-y-5">
            {/* Hồ sơ chính */}
            <div className="glass-card relative overflow-hidden p-5 sm:p-6">
              <div
                className="pointer-events-none absolute -right-4 -top-4 opacity-[0.07]"
                aria-hidden
              >
                <Medal size={88} className="text-violet-600" />
              </div>
              <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:gap-6">
                <div className="flex shrink-0 flex-col items-center sm:items-start">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={mentor.name}
                      className="h-28 w-28 rounded-2xl object-cover ring-4 ring-violet-100 shadow-md"
                    />
                  ) : (
                    <div className="flex h-28 w-28 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-violet-400 text-2xl font-bold text-white shadow-md ring-4 ring-violet-100">
                      {initials}
                    </div>
                  )}
                  {mentor.available ? (
                    <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-lime-300 px-2.5 py-1 text-xs font-semibold text-slate-900">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-700" aria-hidden />
                      Sẵn sàng
                    </span>
                  ) : (
                    <span className="mt-3 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                      Đang bận
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1 text-center sm:text-left">
                  {primaryCompany ? (
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-violet-700">
                      {primaryCompany}
                    </p>
                  ) : null}
                  <h1 className="font-headline text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                    {mentor.name}
                  </h1>
                  <p className="mt-1 text-base text-slate-600">{subtitle}</p>

                  <div className="mt-5 grid grid-cols-3 gap-3 border-t border-violet-100 pt-5 sm:gap-6">
                    <StatCell label={`${reviewCount} đánh giá`}>
                      <span className="inline-flex items-center justify-center gap-1 sm:justify-start">
                        <Star size={16} className="fill-amber-400 text-amber-400" aria-hidden />
                        {ratingDisplay}
                      </span>
                    </StatCell>
                    <StatCell label="Buổi mentor">
                      {sessionCount > 0 ? `${sessionCount}+` : "0"}
                    </StatCell>
                    <StatCell label="Phản hồi">{responseLabel}</StatCell>
                  </div>
                </div>
              </div>
            </div>

            {/* Giới thiệu & chuyên môn */}
            <SectionCard title="Giới thiệu & chuyên môn" icon={Lightning}>
              {tagList.length > 0 ? (
                <div className="mb-4 flex flex-wrap gap-2">
                  {tagList.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-violet-100 bg-violet-50 px-3 py-1 text-xs font-medium text-slate-700"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
              {bioText ? (
                <p className="border-l-2 border-violet-500 py-0.5 pl-4 text-sm leading-relaxed text-slate-700">
                  {bioText}
                </p>
              ) : (
                <EmptyBlock
                  icon={Lightning}
                  message="Mentor chưa cập nhật phần giới thiệu. Bạn vẫn có thể đặt lịch và trao đổi trực tiếp trong buổi mentor."
                />
              )}
            </SectionCard>

            {/* Kinh nghiệm */}
            <SectionCard title="Kinh nghiệm" icon={Briefcase}>
              {companies.length > 0 ? (
                <ul className="space-y-4">
                  {companies.map((company, i) => (
                    <li key={`${company}-${i}`} className="flex gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600">
                        <Briefcase size={18} strokeWidth={1.75} aria-hidden />
                      </div>
                      <div className="min-w-0 pt-0.5">
                        <p className="font-semibold text-slate-900">{company}</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {i === 0 ? "Vị trí / công ty hiện tại" : "Kinh nghiệm trước đây"}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : experienceYears > 0 ? (
                <p className="text-sm text-slate-700">
                  <span className="font-semibold text-slate-900">{experienceYears}+ năm</span> kinh
                  nghiệm trong lĩnh vực tư vấn.
                </p>
              ) : (
                <EmptyBlock
                  icon={Briefcase}
                  message="Chưa có thông tin kinh nghiệm chi tiết. Hãy đặt lịch để tìm hiểu thêm về lộ trình và phong cách mentor."
                />
              )}
            </SectionCard>

            {/* Đánh giá */}
            <SectionCard>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-lg font-bold text-slate-900">
                  Đánh giá <span className="text-violet-600">học viên</span>
                </h3>
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
                  <Star className="fill-amber-400 text-amber-400" size={16} aria-hidden />
                  <span className="text-sm font-bold text-slate-900">{ratingDisplay}</span>
                </div>
              </div>
              <div className="space-y-3">
                {realReviews.length === 0 ? (
                  <EmptyBlock
                    icon={Star}
                    message="Chưa có đánh giá công khai. Hãy là người đầu tiên trải nghiệm buổi mentor này."
                  />
                ) : (
                  realReviews.map((review, i) => (
                    <article
                      key={review.id || i}
                      className="rounded-xl border border-violet-100 bg-white p-4 transition-colors hover:border-slate-300"
                    >
                      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-violet-400 text-xs font-bold text-white">
                            {(review.userName || "H").charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              {review.userName || "Học viên"}
                            </p>
                            <p className="text-xs text-slate-500">Đã tham gia đào tạo</p>
                          </div>
                        </div>
                        <div className="flex gap-0.5" aria-label={`${review.rating} sao`}>
                          {[...Array(5)].map((_, j) => (
                            <Star
                              key={j}
                              size={14}
                              className={
                                j < review.rating
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-slate-300"
                              }
                              aria-hidden
                            />
                          ))}
                        </div>
                      </div>
                      {review.comment ? (
                        <p className="text-sm leading-relaxed text-slate-700">
                          &ldquo;{review.comment}&rdquo;
                        </p>
                      ) : null}
                      <ReviewReplyBlock reply={review.reply} />
                      {review.createdAt ? (
                        <p className="mt-3 text-right text-xs text-slate-500">
                          {new Date(review.createdAt).toLocaleDateString("vi-VN")}
                        </p>
                      ) : null}
                    </article>
                  ))
                )}
              </div>
            </SectionCard>
          </div>

          {/* Sidebar đặt lịch */}
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <div className="glass-card overflow-hidden border-violet-200/60 p-5 shadow-[0_12px_40px_rgba(128,55,244,0.08)] sm:p-6">
              <div className="border-b border-violet-100 pb-5 text-center">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Chi phí mentor
                </p>
                <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                  {formatPriceVnd(mentor.price)}
                </p>
                <p className="mt-1 text-sm text-slate-600">/ 60 phút đào tạo 1-1</p>
              </div>

              <ul className="my-5 space-y-3">
                {bookingFeatures.map((item) => (
                  <li key={item.text} className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-violet-100 bg-violet-50 text-violet-700">
                      <item.icon size={16} strokeWidth={1.75} aria-hidden />
                    </div>
                    <span className="pt-1.5 text-sm text-slate-700">{item.text}</span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => navigate(bookingHref)}
                className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl bg-lime-300 py-3.5 text-sm font-semibold text-slate-900 shadow-md transition hover:brightness-95 active:scale-[0.99]"
              >
                Đặt lịch ngay
                <ArrowRight size={18} aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => navigate(bookingHref)}
                className="w-full rounded-xl border border-slate-200 bg-white py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                Xem lịch trống
              </button>

              <div className="mt-5 space-y-3 border-t border-violet-100 pt-5">
                <p className="flex items-start gap-2 text-xs leading-snug text-emerald-800">
                  <ShieldCheck size={16} className="mt-0.5 shrink-0" aria-hidden />
                  Hoàn tiền 100% nếu không hài lòng (theo chính sách nền tảng)
                </p>
                <button
                  type="button"
                  onClick={() => setShowReportModal(true)}
                  className="flex w-full items-center justify-center gap-2 text-xs font-medium text-slate-500 transition-colors hover:text-red-600"
                >
                  <Warning size={14} aria-hidden />
                  Báo cáo mentor
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <AnimatePresence>
        {showReportModal ? (
          <ReportMentorModal
            mentorId={mentor.id}
            mentorName={mentor.name}
            onClose={() => setShowReportModal(false)}
          />
        ) : null}
      </AnimatePresence>
    </MentorPageShell>
  );
}
