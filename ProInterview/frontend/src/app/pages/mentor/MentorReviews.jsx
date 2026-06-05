import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { Star, Calendar, Quote, Search, MessageCircle, TrendingUp } from "lucide-react";
import { getUser } from "../../utils/auth";
import { MentorPageShell } from "../../components/mentor/MentorPageShell";
import { fetchMentorReviews } from "../../utils/mentorApi";
import { replyToReview } from "../../utils/reviewsApi";
import { toastApiError, tryApi } from "../../utils/apiToast";
import { avatarSrc, DEFAULT_AVATAR } from "../../utils/mediaUrl";
import {
  mentorPageTitle,
  mentorPageSubtitle,
  mentorStatValue,
  mentorAccentText,
  mentorSearchInput,
} from "../../components/mentor/mentorTypography";

const STAR_FILTERS = [
  { value: "all", stars: 0 },
  { value: "5", stars: 5 },
  { value: "4", stars: 4 },
  { value: "3", stars: 3 },
];

function filterAriaLabel(value, stars) {
  if (value === "all") return "Tất cả đánh giá";
  return `Lọc đánh giá ${stars} sao`;
}


function formatReviewDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("vi-VN");
}

export function MentorReviews() {
  const navigate = useNavigate();
  const userAuth = getUser();
  const isMentor = userAuth?.role === "mentor";
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [reviewedMeetings, setReviewedMeetings] = useState([]);
  const [summary, setSummary] = useState({ avgRating: 0, reviewCount: 0 });
  const [loading, setLoading] = useState(true);
  const [replyId, setReplyId] = useState("");
  const [replyText, setReplyText] = useState("");
  const [replyBusy, setReplyBusy] = useState(false);

  const loadReviews = useCallback(() => {
    setLoading(true);
    fetchMentorReviews()
      .then((res) => {
        if (!res.success || !Array.isArray(res.items)) {
          setReviewedMeetings([]);
          setSummary({ avgRating: 0, reviewCount: 0 });
          if (!res.success) toastApiError(res.error, "Không tải được đánh giá.");
          return;
        }
        const mapped = res.items.map((r) => ({
          id: r.id,
          mentee: {
            name: r.mentee?.name || "Học viên",
            avatar: avatarSrc(r.mentee?.avatar) || DEFAULT_AVATAR,
          },
          position: r.position || "Học viên",
          company: r.company || "",
          menteeReview: {
            rating: Number(r.rating || 0),
            comment: r.comment || "",
            wouldRecommend: Boolean(r.wouldRecommend),
            reviewDate: r.reviewDate,
            reply: r.reply || null,
          },
        }));
        setReviewedMeetings(mapped);
        const s = res.summary || {};
        setSummary({
          avgRating: Number(s.avgRating ?? 0),
          reviewCount: Number(s.reviewCount ?? mapped.length),
        });
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!isMentor) {
      navigate("/");
      return;
    }
    loadReviews();
  }, [navigate, isMentor, loadReviews]);

  const submitReply = async (reviewId) => {
    const content = replyText.trim();
    if (!content || content.length < 3) {
      toastApiError("Phản hồi cần ít nhất 3 ký tự.");
      return;
    }
    setReplyBusy(true);
    const res = await tryApi(() => replyToReview(reviewId, content), {
      fallback: "Không gửi được phản hồi.",
      successMessage: "Đã gửi phản hồi.",
    });
    setReplyBusy(false);
    if (!res.success) return;
    setReplyId("");
    setReplyText("");
    loadReviews();
  };

  if (!isMentor) return null;

  const filtered = reviewedMeetings.filter((m) => {
    if (filter === "all") return true;
    return m.menteeReview.rating === parseInt(filter, 10);
  });

  const searched = filtered.filter(
    (m) =>
      m.mentee.name.toLowerCase().includes(search.toLowerCase()) ||
      m.menteeReview.comment.toLowerCase().includes(search.toLowerCase()),
  );

  const avgRating =
    summary.reviewCount > 0
      ? summary.avgRating
      : reviewedMeetings.length > 0
        ? reviewedMeetings.reduce((sum, m) => sum + m.menteeReview.rating, 0) /
          reviewedMeetings.length
        : 0;

  const highRatingCount = reviewedMeetings.filter((m) => m.menteeReview.rating >= 4).length;
  const satisfactionPct =
    reviewedMeetings.length > 0
      ? Math.round((highRatingCount / reviewedMeetings.length) * 100)
      : 0;

  return (
    <MentorPageShell bottomPad="pb-32">
      <div className="relative z-10 mx-auto max-w-7xl px-6 pb-16 sm:px-8 sm:pb-20">
        <div className="mb-10 flex flex-col gap-3 md:mb-12">
          <h1 className={mentorPageTitle}>
            <span>Đánh giá</span>{" "}
            <span className={mentorAccentText}>từ học viên</span>
          </h1>
          <p className={mentorPageSubtitle}>Phản hồi sau buổi mentor — tìm kiếm và trả lời nhận xét</p>
        </div>

        <div className="mb-10 grid grid-cols-1 gap-5 md:mb-12 md:grid-cols-3 md:gap-6">
          <div className="glass-card p-6 sm:p-7">
            <p className="mb-3 text-xs font-semibold text-slate-500">Điểm trung bình</p>
            <div className="mb-4 flex items-end gap-2">
              <h3 className={mentorStatValue}>{avgRating.toFixed(1)}</h3>
              <span className="mb-1 text-lg font-semibold text-slate-500">/ 5</span>
            </div>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  size={18}
                  className={
                    i <= Math.round(avgRating)
                      ? "fill-[#FFD600] text-[#FFD600]"
                      : "text-slate-200"
                  }
                />
              ))}
            </div>
          </div>

          <div className="glass-card p-6 sm:p-7">
            <p className="mb-3 text-xs font-semibold text-slate-500">Tổng nhận xét</p>
            <h3 className={`mb-2 ${mentorStatValue}`}>
              {summary.reviewCount || reviewedMeetings.length}
            </h3>
            <p className="flex items-center gap-2 text-xs font-medium text-violet-700">
              <TrendingUp size={14} className="shrink-0" />
              Hiển thị trên hồ sơ mentor
            </p>
          </div>

          <div className="glass-card border-violet-200/80 p-6 sm:p-7">
            <p className="mb-3 text-xs font-semibold text-slate-500">Tỷ lệ hài lòng</p>
            <h3 className={`mb-2 ${mentorStatValue} text-violet-800`}>{satisfactionPct}%</h3>
            <p className="text-xs font-medium text-slate-600">Đánh giá từ 4 sao trở lên</p>
          </div>
        </div>

        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400"
              aria-hidden
            />
            <input
              type="search"
              placeholder="Tìm theo tên hoặc nội dung…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={mentorSearchInput}
              aria-label="Tìm theo tên hoặc nội dung nhận xét"
            />
          </div>
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label="Lọc theo số sao"
          >
            {STAR_FILTERS.map(({ value, stars }) => {
              const active = filter === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  aria-label={filterAriaLabel(value, stars)}
                  aria-pressed={active}
                  className={`inline-flex min-h-[42px] items-center justify-center rounded-xl border px-4 py-2.5 transition-all ${
                    value === "all" ? "min-w-[5.5rem] text-sm font-semibold" : "min-w-[4.5rem] gap-0.5"
                  } ${
                    active
                      ? "border-violet-600 bg-violet-600 text-white shadow-sm"
                      : "border-slate-300 bg-white text-slate-700 shadow-sm hover:border-violet-300 hover:bg-violet-50"
                  }`}
                >
                  {stars === 0 ? (
                    "Tất cả"
                  ) : (
                    <span className="flex items-center gap-px" aria-hidden>
                      {Array.from({ length: stars }, (_, i) => (
                        <Star
                          key={i}
                          size={15}
                          className="fill-[#FFD600] text-[#FFD600]"
                        />
                      ))}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-5 pb-6">
          {loading ? (
            <div className="glass-card p-12 text-center text-sm font-medium text-slate-500">
              Đang tải nhận xét…
            </div>
          ) : searched.length === 0 ? (
            <div className="glass-card p-12 text-center sm:p-14">
              <MessageCircle size={48} className="mx-auto mb-4 text-slate-300" />
              <p className="text-base font-semibold text-slate-600">Chưa có nhận xét phù hợp</p>
              <p className="mt-1 text-sm text-slate-500">
                Thử đổi bộ lọc hoặc từ khóa tìm kiếm
              </p>
            </div>
          ) : (
            searched.map((meeting) => (
              <article
                key={meeting.id}
                className="glass-card overflow-visible p-6 sm:p-8"
              >
                <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex gap-4 sm:gap-5">
                    <img
                      src={meeting.mentee.avatar}
                      alt=""
                      className="h-16 w-16 shrink-0 rounded-2xl object-cover ring-2 ring-slate-200 sm:h-20 sm:w-20"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = DEFAULT_AVATAR;
                      }}
                    />
                    <div className="min-w-0">
                      <h3 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                        {meeting.mentee.name}
                      </h3>
                      <p className="mt-0.5 text-sm font-medium text-slate-500">
                        {meeting.position}
                        {meeting.company ? ` · ${meeting.company}` : ""}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <Star
                              key={i}
                              size={14}
                              className={
                                i <= meeting.menteeReview.rating
                                  ? "fill-[#FFD600] text-[#FFD600]"
                                  : "text-slate-200"
                              }
                            />
                          ))}
                        </div>
                        <span className="text-sm font-semibold text-slate-800">
                          {meeting.menteeReview.rating}/5
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="flex shrink-0 items-center gap-2 text-sm font-medium text-slate-500">
                    <Calendar size={14} className="text-slate-400" />
                    {formatReviewDate(meeting.menteeReview.reviewDate)}
                  </p>
                </div>

                <div className="relative mt-6 rounded-2xl border border-slate-200 bg-slate-50/90 p-5 sm:p-6">
                  <Quote
                    size={56}
                    className="pointer-events-none absolute -left-1 -top-2 text-violet-600/10"
                    aria-hidden
                  />
                  <p className="relative text-base font-medium italic leading-relaxed text-slate-700 sm:text-lg">
                    &ldquo;{meeting.menteeReview.comment}&rdquo;
                  </p>

                  {meeting.menteeReview.reply?.content ? (
                    <div className="relative mt-5 rounded-xl border border-violet-100 bg-violet-50/90 px-4 py-3.5">
                      <p className="text-xs font-semibold text-violet-800">Phản hồi của bạn</p>
                      <p className="mt-1.5 text-sm leading-relaxed text-slate-800">
                        {meeting.menteeReview.reply.content}
                      </p>
                    </div>
                  ) : replyId === meeting.id ? (
                    <div className="relative mt-5 space-y-3">
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        rows={3}
                        placeholder="Viết phản hồi cho học viên…"
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#8037f4] focus:ring-2 focus:ring-[#8037f4]/15"
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={replyBusy}
                          onClick={() => void submitReply(meeting.id)}
                          className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50"
                        >
                          {replyBusy ? "Đang gửi…" : "Gửi phản hồi"}
                        </button>
                        <button
                          type="button"
                          disabled={replyBusy}
                          onClick={() => {
                            setReplyId("");
                            setReplyText("");
                          }}
                          className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Hủy
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="relative mt-5 flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setReplyId(meeting.id);
                          setReplyText("");
                        }}
                        className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-4 py-2.5 text-sm font-semibold text-violet-700 shadow-sm transition hover:border-violet-300 hover:bg-violet-50"
                      >
                        <MessageCircle size={16} />
                        Phản hồi nhận xét
                      </button>
                    </div>
                  )}
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </MentorPageShell>
  );
}
