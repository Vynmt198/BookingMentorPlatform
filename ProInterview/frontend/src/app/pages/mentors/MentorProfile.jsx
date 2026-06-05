import React from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { AnimatePresence } from "motion/react";
import { fetchMentor, fetchMentorPublicReviews } from "../../utils/mentorApi";
import { ReportMentorModal } from "../../components/modals/ReportMentorModal";
import { MentorPageShell } from "../../components/mentor/MentorPageShell";
import { MentorProfileHeader } from "../../components/mentor/profile/MentorProfileHeader";
import { MentorProfileAside } from "../../components/mentor/profile/MentorProfileAside";
import {
  MentorIntroSection,
  MentorWorkSection,
  MentorSkillsSection,
  MentorReviewsSection,
} from "../../components/mentor/profile/MentorProfileSections";
import { toastApiError } from "../../utils/apiToast";
import {
  buildReviewRatingSummary,
  buildWorkEntriesForDisplay,
  formatRecurringScheduleRows,
  mentorFieldTags,
} from "../../utils/mentorProfileHelpers";
import { CUSTOMER_SHELL_GUTTER, CUSTOMER_SHELL_MAX } from "../../components/layout/customerShellLayout";
import { formatEducationDisplay } from "../../utils/profileEducationHistory";

const PROFILE_TABS = [
  { id: "intro", label: "Giới thiệu" },
  { id: "work", label: "Kinh nghiệm làm việc" },
  { id: "skills", label: "Kỹ năng" },
  { id: "reviews", label: "Đánh giá" },
];

function TabBar({ activeTab, onChange }) {
  return (
    <div
      className="flex gap-1 overflow-x-auto border-b border-slate-200/90"
      role="tablist"
      aria-label="Nội dung hồ sơ mentor"
    >
      {PROFILE_TABS.map((tab) => {
        const active = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={`shrink-0 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
              active
                ? "border-[#8037f4] text-[#8037f4]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

function SectionDivider() {
  return <hr className="my-8 border-slate-200/90" />;
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
  const [activeTab, setActiveTab] = React.useState("intro");

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
  const experienceYears = Number(mentor.experience) || 0;
  const bioText = (mentor.bio || "").trim();
  const skillTags = mentorFieldTags(mentor);
  const workEntries = buildWorkEntriesForDisplay(mentor);
  const scheduleRows = formatRecurringScheduleRows(mentor.recurringSchedule);
  const reviewSummary = buildReviewRatingSummary(realReviews);
  const education = formatEducationDisplay(mentor.profileEducation || "");
  const awards = String(mentor.profileAwards || "").trim();

  const goBook = () => navigate(bookingHref);

  const introFull = (
    <div className="space-y-0">
      <MentorIntroSection
        mentor={mentor}
        bioText={bioText}
        education={education}
        awards={awards}
      />
      <SectionDivider />
      <MentorWorkSection mentor={mentor} workEntries={workEntries} compactTitle />
      <SectionDivider />
      <MentorSkillsSection skillTags={skillTags} compactTitle />
      <SectionDivider />
      <MentorReviewsSection
        realReviews={realReviews}
        reviewSummary={reviewSummary}
        compactTitle
      />
    </div>
  );

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
                    <div className="flex h-28 w-28 items-center justify-center rounded-2xl bg-[#8037f4] text-2xl font-bold text-white shadow-md ring-4 ring-violet-100">
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

                <div className="p-4 sm:p-6">
                  {activeTab === "intro" ? introFull : null}
                  {activeTab === "work" ? (
                    <MentorWorkSection mentor={mentor} workEntries={workEntries} />
                  ) : null}
                  {activeTab === "skills" ? (
                    <MentorSkillsSection skillTags={skillTags} />
                  ) : null}
                  {activeTab === "reviews" ? (
                    <MentorReviewsSection
                      realReviews={realReviews}
                      reviewSummary={reviewSummary}
                    />
                  ) : null}
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
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#8037f4] text-xs font-bold text-white">
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
