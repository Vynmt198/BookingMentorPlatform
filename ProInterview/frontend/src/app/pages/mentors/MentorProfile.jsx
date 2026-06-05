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
          <div className="min-w-0 space-y-5">
            <MentorProfileHeader
              mentor={mentor}
              ratingDisplay={ratingDisplay}
              reviewCount={reviewCount}
              experienceYears={experienceYears}
            />

            <div className="glass-card overflow-hidden">
              <TabBar activeTab={activeTab} onChange={setActiveTab} />
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

          <MentorProfileAside
            mentor={mentor}
            bookingHref={bookingHref}
            onBook={goBook}
            onReport={() => setShowReportModal(true)}
            scheduleRows={scheduleRows}
          />
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
