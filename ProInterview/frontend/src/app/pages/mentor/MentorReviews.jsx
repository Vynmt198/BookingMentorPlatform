import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { Star, Calendar, Quote, Search, MessageCircle, TrendingUp } from "lucide-react";
import { getUser } from "../../utils/auth";
import { MentorPageShell } from "../../components/mentor/MentorPageShell";
import { fetchMentorReviews } from "../../utils/mentorApi";
import { replyToReview } from "../../utils/reviewsApi";
import { toastApiError, tryApi } from "../../utils/apiToast";
import { avatarSrc } from "../../utils/mediaUrl";

export function MentorReviews() {
  const navigate = useNavigate();
  const userAuth = getUser();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [reviewedMeetings, setReviewedMeetings] = useState([]);
  const [summary, setSummary] = useState({ avgRating: 0, reviewCount: 0 });
  const [replyId, setReplyId] = useState("");
  const [replyText, setReplyText] = useState("");
  const [replyBusy, setReplyBusy] = useState(false);

  const loadReviews = useCallback(() => {
    fetchMentorReviews().then((res) => {
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
          avatar: avatarSrc(r.mentee?.avatar),
        },
        position: r.position || "Mentee",
        company: r.company || "ProInterview",
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
    });
  }, []);

  useEffect(() => {
    if (!userAuth || userAuth.role !== "mentor") {
      navigate("/");
      return;
    }
    loadReviews();
  }, [navigate, userAuth?.role, loadReviews]);

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

  if (!userAuth || userAuth.role !== "mentor") return null;

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
    summary.reviewCount > 0 ? summary.avgRating : reviewedMeetings.length > 0
      ? reviewedMeetings.reduce((sum, m) => sum + m.menteeReview.rating, 0) / reviewedMeetings.length
      : 0;

  const recommendCount = reviewedMeetings.filter((m) => m.menteeReview.wouldRecommend).length;

  return (
    <MentorPageShell bottomPad="pb-32">
      <div className="relative z-10 mx-auto max-w-7xl px-8 pb-8">
        <div className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <h1 className="mb-3 font-headline text-2xl font-black uppercase tracking-tight text-slate-900 sm:text-3xl">
              Đánh giá <span className="text-violet-700">từ học viên</span>
            </h1>
          </div>
        </div>

        <div className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="glass-card group relative overflow-hidden p-7 sm:p-8">
            <p className="mb-4 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">
              Điểm trung bình
            </p>
            <div className="mb-6 flex items-end gap-3">
              <h3 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                {avgRating.toFixed(1)}
              </h3>
              <p className="mb-2 text-xl font-bold text-zinc-600">/5</p>
            </div>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  size={20}
                  className={i <= Math.round(avgRating) ? "text-[#FFD600] fill-[#FFD600]" : "text-slate-200"}
                />
              ))}
            </div>
          </div>

          <div className="glass-card group relative overflow-hidden p-7 sm:p-8">
            <p className="mb-4 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">
              Tổng nhận xét
            </p>
            <h3 className="mb-3 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              {summary.reviewCount || reviewedMeetings.length}
            </h3>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-violet-700">
              <TrendingUp size={14} className="text-violet-600" />
              Trên hồ sơ mentor
            </p>
          </div>

          <div className="glass-card group relative overflow-hidden border-violet-200/80 p-7 sm:p-8">
            <p className="mb-4 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">
              Tỷ lệ hài lòng
            </p>
            <h3 className="mb-3 text-2xl font-black tracking-tight text-violet-800 sm:text-3xl">
              {reviewedMeetings.length > 0
                ? Math.round((recommendCount / reviewedMeetings.length) * 100)
                : 0}
              %
            </h3>
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-600">
              Đánh giá từ 4 sao trở lên
            </p>
          </div>
        </div>

        <div className="mb-9 flex flex-col items-center gap-5 md:flex-row">
          <div className="group relative w-full flex-1">
            <Search
              className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500 group-focus-within:text-violet-600"
              size={20}
            />
            <input
              type="text"
              placeholder="Tìm theo tên hoặc nội dung…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-[20px] border border-slate-200 bg-white py-3.5 pl-16 pr-5 text-sm font-medium text-slate-900 shadow-sm outline-none transition placeholder:text-slate-500 focus:border-violet-400 focus:ring-2 focus:ring-violet-200/80"
            />
          </div>
          <div className="flex gap-2 rounded-[24px] border border-slate-200 bg-slate-50 p-2">
            {["all", "5", "4", "3"].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setFilter(v)}
                className={`rounded-[18px] px-8 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${
                  filter === v
                    ? "bg-violet-600 text-white shadow-md"
                    : "text-slate-600 hover:bg-white hover:text-slate-900"
                }`}
              >
                {v === "all" ? "Tất cả" : `${v}★`}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-5">
          {searched.length === 0 ? (
            <div className="glass-card p-14 text-center">
              <MessageCircle size={60} className="mx-auto mb-6 text-zinc-700 opacity-20" />
              <p className="text-lg font-bold text-zinc-500">Chưa có nhận xét phù hợp</p>
            </div>
          ) : (
            searched.map((meeting) => (
              <div key={meeting.id} className="glass-card group overflow-hidden p-10">
                <div className="flex flex-col justify-between gap-10 lg:flex-row lg:items-center">
                  <div className="flex items-center gap-8">
                    <img
                      src={meeting.mentee.avatar}
                      alt={meeting.mentee.name}
                      className="h-20 w-20 rounded-[30px] object-cover ring-4 ring-slate-200"
                    />
                    <div>
                      <h3 className="mb-1 text-2xl font-black tracking-tighter text-slate-900">
                        {meeting.mentee.name}
                      </h3>
                      <p className="mb-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                        {meeting.position} · {meeting.company}
                      </p>
                      <div className="flex items-center gap-3">
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <Star
                              key={i}
                              size={14}
                              className={
                                i <= meeting.menteeReview.rating
                                  ? "text-[#FFD600] fill-[#FFD600]"
                                  : "text-slate-200"
                              }
                            />
                          ))}
                        </div>
                        <span className="text-xs font-black text-slate-900">
                          {meeting.menteeReview.rating}/5
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                    <Calendar size={14} />
                    {new Date(meeting.menteeReview.reviewDate).toLocaleDateString("vi-VN")}
                  </p>
                </div>

                <div className="relative mt-8 rounded-[32px] border border-slate-200 bg-slate-50 p-7">
                  <Quote
                    size={80}
                    className="absolute -left-4 -top-4 -rotate-12 text-violet-700 opacity-[0.08]"
                  />
                  <p className="relative z-10 text-xl font-medium italic leading-relaxed text-slate-700">
                    "{meeting.menteeReview.comment}"
                  </p>

                  {meeting.menteeReview.reply?.content ? (
                    <div className="relative z-10 mt-6 rounded-2xl border border-violet-100 bg-violet-50/80 px-5 py-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-violet-800">
                        Phản hồi của bạn
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-slate-800">
                        {meeting.menteeReview.reply.content}
                      </p>
                    </div>
                  ) : replyId === meeting.id ? (
                    <div className="relative z-10 mt-6 space-y-3">
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        rows={3}
                        placeholder="Viết phản hồi cho học viên…"
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-violet-400"
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={replyBusy}
                          onClick={() => void submitReply(meeting.id)}
                          className="rounded-xl bg-violet-600 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-50"
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
                          className="rounded-xl border border-slate-200 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-600"
                        >
                          Hủy
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="relative z-10 mt-6 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setReplyId(meeting.id);
                          setReplyText("");
                        }}
                        className="text-[10px] font-black uppercase tracking-widest text-violet-700 hover:text-violet-900"
                      >
                        Phản hồi nhận xét
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </MentorPageShell>
  );
}
