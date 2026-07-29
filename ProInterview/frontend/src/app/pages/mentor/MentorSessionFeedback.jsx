import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import {
  Star,
  Clock,
  CheckCircle2,
  User,
  Send,
  Target,
  Trophy,
  Lightbulb,
  MessageSquare,
  ArrowRight,
  NotebookText,
  ChevronDown,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toastApiError, toastApiSuccess } from "../../utils/apiToast.js";
import { MentorPageShell } from "../../components/mentor/MentorPageShell";
import { fetchMentorBookingById, updateMentorSummary } from "../../utils/bookingsApi.js";
import { avatarSrc, DEFAULT_AVATAR } from "../../utils/mediaUrl.js";
import { sessionTypeLabel } from "../../utils/sessionTypeLabels.js";

const FEEDBACK_DEADLINE_DAYS = 3;

const FIELD_TONES = {
  emerald: {
    badge: "bg-emerald-50 text-emerald-600",
    label: "text-emerald-600",
    ring: "focus:border-emerald-200 focus:ring-emerald-100",
  },
  rose: {
    badge: "bg-rose-50 text-rose-600",
    label: "text-rose-600",
    ring: "focus:border-rose-200 focus:ring-rose-100",
  },
  amber: {
    badge: "bg-amber-50 text-amber-600",
    label: "text-amber-600",
    ring: "focus:border-amber-200 focus:ring-amber-100",
  },
};

/** Textarea tự giãn theo nội dung (kể cả khi bị set từ ngoài qua "Chèn" gợi ý, không chỉ khi gõ tay) — tối đa 420px rồi mới cuộn. */
function useAutoResizeTextarea(value) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 420)}px`;
  }, [value]);
  return ref;
}

function appendLine(current, line) {
  const trimmed = String(line || "").trim();
  if (!trimmed) return current;
  return current ? `${current}\n${trimmed}` : trimmed;
}

const CAPTURE_TAB_TONES = {
  mistakes: "data-[active=true]:bg-rose-500 data-[active=true]:text-white text-rose-600 bg-rose-50",
  insights: "data-[active=true]:bg-indigo-500 data-[active=true]:text-white text-indigo-600 bg-indigo-50",
  questions: "data-[active=true]:bg-slate-700 data-[active=true]:text-white text-slate-600 bg-slate-100",
};

/** Gợi ý lấy từ ghi chú live mentor gõ/đọc trong buổi (`useMeetingLiveCapture`) — không tự điền, mentor bấm "Chèn" mới đưa vào form chính thức. */
function LiveCaptureSuggestions({ capture, onInsertWeakness, onInsertNote }) {
  const [open, setOpen] = useState(false);
  const [activeTabKey, setActiveTabKey] = useState(null);

  const { questionsAsked = [], commonMistakes = [], keyInsights = [] } = capture || {};
  const groups = [
    { key: "mistakes", label: "Lỗi học viên", target: "→ Cần cải thiện", items: commonMistakes, onInsert: onInsertWeakness },
    { key: "insights", label: "Insight", target: "→ Phân tích chi tiết", items: keyInsights, onInsert: onInsertNote },
    { key: "questions", label: "Câu hỏi", target: "→ Phân tích chi tiết", items: questionsAsked, onInsert: onInsertNote },
  ].filter((g) => g.items.length);

  if (!groups.length) return null;
  const totalCount = groups.reduce((sum, g) => sum + g.items.length, 0);
  const activeGroup = groups.find((g) => g.key === activeTabKey) || groups[0];

  return (
    <div className="glass-card overflow-hidden border border-violet-100 bg-violet-50/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left"
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
            <NotebookText size={14} />
          </span>
          <div className="min-w-0">
            <h5 className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-600">
              Gợi ý từ ghi chú buổi họp
            </h5>
            {!open && <p className="truncate text-[11px] font-medium text-slate-500">Bấm để xem — không tự động điền vào form.</p>}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full bg-violet-600 px-2 py-0.5 text-[10px] font-black text-white">{totalCount}</span>
          <ChevronDown size={16} className={`text-violet-400 transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </button>

      {open ? (
        <div className="space-y-3 border-t border-violet-100/80 px-5 pb-5 pt-4">
          <p className="text-[11px] font-medium text-slate-500">Bấm "Chèn" để đưa dòng gợi ý vào ô nhận xét — không tự động điền.</p>

          <div className="flex flex-wrap gap-1.5">
            {groups.map((g) => (
              <button
                key={g.key}
                type="button"
                data-active={g.key === activeGroup.key}
                onClick={() => setActiveTabKey(g.key)}
                className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wide transition ${CAPTURE_TAB_TONES[g.key]}`}
              >
                {g.label} ({g.items.length})
              </button>
            ))}
          </div>

          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{activeGroup.target}</p>

          <div className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
            {activeGroup.items.map((text, i) => (
              <div key={`${activeGroup.key}-${i}`} className="flex items-start justify-between gap-3 rounded-xl bg-white/80 px-3 py-2">
                <p className="line-clamp-2 min-w-0 flex-1 text-xs font-medium leading-relaxed text-slate-700" title={text}>
                  {text}
                </p>
                <button
                  type="button"
                  onClick={() => activeGroup.onInsert(text)}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-violet-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-violet-700 transition hover:bg-violet-200"
                >
                  Chèn <ArrowRight size={11} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FeedbackField({ icon: Icon, label, tone, value, onChange, placeholder, minHeight = "min-h-24" }) {
  const t = FIELD_TONES[tone];
  const textareaRef = useAutoResizeTextarea(value);
  return (
    <div className="glass-card p-5">
      <div className="mb-3 flex items-center gap-2.5">
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${t.badge}`}>
          <Icon size={14} />
        </span>
        <h5 className={`text-[10px] font-black uppercase tracking-[0.18em] ${t.label}`}>{label}</h5>
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full ${minHeight} max-h-[420px] resize-none overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm font-medium text-slate-700 outline-none transition-all focus:bg-white focus:ring-4 ${t.ring}`}
      />
    </div>
  );
}

export function MentorSessionFeedback() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Form states
  const [rating, setRating] = useState(5);
  const [strengths, setStrengths] = useState("");
  const [weaknesses, setWeaknesses] = useState("");
  const [advice, setAdvice] = useState("");
  const [generalNotes, setGeneralNotes] = useState("");
  const generalNotesRef = useAutoResizeTextarea(generalNotes);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetchMentorBookingById(sessionId);
        if (!active) return;
        if (res.success && res.booking) {
          setBooking(res.booking);
          const existing = res.booking.mentorSummary;
          const liveCapture = res.booking.mentorSessionCapture;
          if (existing) {
            setRating(existing.rating || 5);
            setStrengths(existing.strengths || "");
            setWeaknesses(existing.improvements || "");
            setAdvice(existing.recommendation || "");
            setGeneralNotes(existing.generalNotes || "");
          } else if (liveCapture) {
            // Chưa gửi tổng kết chính thức — nạp sẵn phần "Đánh giá nhanh" mentor đã điền ngay trong buổi.
            if (liveCapture.rating) setRating(liveCapture.rating);
            if (liveCapture.strengths) setStrengths(liveCapture.strengths);
            if (liveCapture.improvements) setWeaknesses(liveCapture.improvements);
            if (liveCapture.recommendation) setAdvice(liveCapture.recommendation);
          }
        } else {
          toastApiError(res.error, "Không tải được thông tin buổi học.");
        }
      } catch {
        if (active) toastApiError("Lỗi kết nối khi tải buổi học.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [sessionId]);

  const handleSubmit = async () => {
    if (saving) return;
    if (!strengths.trim() && !weaknesses.trim() && !advice.trim() && !generalNotes.trim()) {
      toastApiError(null, "Cần nhập ít nhất một nội dung nhận xét.");
      return;
    }
    setSaving(true);

    try {
      const res = await updateMentorSummary(sessionId, {
        rating,
        strengths: strengths.trim(),
        improvements: weaknesses.trim(),
        recommendation: advice.trim(),
        generalNotes: generalNotes.trim(),
      });

      if (res.success) {
        toastApiSuccess("Đã lưu phản hồi buổi học.");
        setShowSuccess(true);
        setTimeout(() => {
          navigate("/mentor/schedule");
        }, 3000);
      } else {
        toastApiError(res.error, "Có lỗi xảy ra khi lưu đánh giá.");
      }
    } catch {
      toastApiError("Lỗi kết nối máy chủ khi gửi báo cáo.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <MentorPageShell mentorRole>
        <div className="p-20 text-center font-semibold text-slate-400">Đang tải thông tin...</div>
      </MentorPageShell>
    );
  }

  if (booking && booking.status !== "completed") {
    return (
      <MentorPageShell mentorRole>
        <div className="mx-auto max-w-lg p-20 text-center">
          <p className="text-sm font-semibold text-slate-500">
            Chỉ có thể gửi tổng kết sau khi buổi học đã được đánh dấu hoàn thành trong Lịch mentor.
          </p>
        </div>
      </MentorPageShell>
    );
  }

  const isPastFeedbackDeadline =
    !!booking?.completedAt &&
    Date.now() - new Date(booking.completedAt).getTime() > FEEDBACK_DEADLINE_DAYS * 24 * 60 * 60 * 1000;

  const completedDateLabel = booking?.completedAt
    ? new Date(booking.completedAt).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })
    : null;

  return (
    <MentorPageShell bottomPad="pb-16" mentorRole>
      <div className="relative z-10 mx-auto max-w-[1280px] px-4 pb-12 sm:px-6 lg:px-10">
        <motion.header
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="mb-6 pt-2 sm:mb-8"
        >
          <h1 className="font-headline text-[clamp(1.75rem,4vw,2.75rem)] font-black leading-tight tracking-tight text-slate-900">
            Đánh giá <span className="text-[#8037f4]">chuyên sâu</span>
          </h1>
          <p className="mt-2 max-w-xl text-sm text-slate-500">
            Ghi nhận tiến trình và định hướng cho học viên
          </p>
        </motion.header>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-8"
        >
          <div className="grid gap-8 lg:grid-cols-10">
            {/* Mentee Sidebar */}
            <div className="lg:col-span-3">
              <div className="glass-card sticky top-24 p-6 text-center">
                <img
                  src={avatarSrc(booking?.customerAvatar) || DEFAULT_AVATAR}
                  alt={booking?.customerName}
                  className="mx-auto mb-4 h-20 w-20 rounded-2xl object-cover ring-4 ring-violet-50 shadow-inner"
                />
                <h3 className="text-base font-black text-slate-900 tracking-tight">{booking?.customerName}</h3>
                <p className="mentor-label mt-1 inline-flex items-center gap-1">
                  <User size={10} /> Học viên
                </p>

                <div className="mt-6 space-y-4 border-t border-slate-100 pt-6 text-left">
                  <div>
                    <p className="mentor-label mb-1 flex items-center gap-1.5">
                      <Target size={11} /> Vị trí phỏng vấn
                    </p>
                    <p className="text-xs font-semibold text-slate-700">{sessionTypeLabel(booking?.sessionType)}</p>
                  </div>
                  <div>
                    <p className="mentor-label mb-1.5 flex items-center gap-1.5">
                      <Trophy size={11} /> Đánh giá tổng quan
                    </p>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setRating(value)}
                          className="transition-transform hover:scale-110"
                          aria-label={`${value} sao`}
                        >
                          <Star
                            size={17}
                            className={value <= rating ? "fill-amber-400 text-amber-400" : "text-slate-200"}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {completedDateLabel && (
                  <div className="mt-5 flex items-center justify-center gap-1.5 rounded-lg bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-slate-500">
                    <Clock size={12} /> Hoàn thành {completedDateLabel}
                  </div>
                )}
              </div>
            </div>

            {/* Main Form */}
            <div className="lg:col-span-7 space-y-4">
              <LiveCaptureSuggestions
                capture={booking?.mentorSessionCapture}
                onInsertWeakness={(text) => setWeaknesses((prev) => appendLine(prev, text))}
                onInsertNote={(text) => setGeneralNotes((prev) => appendLine(prev, text))}
              />

              <div className="grid sm:grid-cols-2 gap-4">
                <FeedbackField
                  icon={Trophy}
                  label="Điểm mạnh"
                  tone="emerald"
                  value={strengths}
                  onChange={(e) => setStrengths(e.target.value)}
                  placeholder="Nội dung..."
                />
                <FeedbackField
                  icon={Target}
                  label="Cần cải thiện"
                  tone="rose"
                  value={weaknesses}
                  onChange={(e) => setWeaknesses(e.target.value)}
                  placeholder="Nội dung..."
                />
              </div>

              <FeedbackField
                icon={Lightbulb}
                label="Lời khuyên phát triển"
                tone="amber"
                minHeight="min-h-20"
                value={advice}
                onChange={(e) => setAdvice(e.target.value)}
                placeholder="Định hướng tiếp theo cho học viên..."
              />

              {/* Detailed Analysis */}
              <div className="rounded-[1.5rem] bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-950 p-5 shadow-2xl shadow-violet-900/20 text-white">
                <div className="mb-3 flex items-center gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-violet-200">
                    <MessageSquare size={14} />
                  </span>
                  <h5 className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-200">Phân tích chi tiết</h5>
                </div>
                <textarea
                  ref={generalNotesRef}
                  value={generalNotes}
                  onChange={(e) => setGeneralNotes(e.target.value)}
                  placeholder="Ghi chú bổ sung khác..."
                  className="w-full min-h-24 max-h-[420px] overflow-y-auto bg-white/5 backdrop-blur-md rounded-2xl p-4 text-sm font-medium text-indigo-50 border border-white/10 focus:border-white/20 outline-none transition-all resize-none"
                />
              </div>

              {/* Action */}
              <div className="space-y-3 pt-1">
                {isPastFeedbackDeadline && (
                  <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-600">
                    <Clock size={14} className="shrink-0" />
                    Buổi này đã quá hạn {FEEDBACK_DEADLINE_DAYS} ngày — gửi lúc này sẽ được đánh dấu "Gửi trễ" cho học viên/admin thấy.
                  </div>
                )}
                <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={() => navigate("/mentor/dashboard")}
                    className="text-xs font-semibold text-slate-400 underline decoration-dotted underline-offset-4 hover:text-slate-600"
                  >
                    Bỏ qua, làm sau
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={saving}
                    className="shrink-0 inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl bg-violet-600 text-white text-xs font-semibold uppercase tracking-[0.2em] shadow-xl shadow-violet-600/30 hover:bg-violet-700 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:hover:translate-y-0"
                  >
                    <Send size={14} />
                    {saving ? "Đang xử lý..." : "Xác nhận gửi báo cáo"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Success Overlay */}
        <AnimatePresence>
          {showSuccess && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-white/80 backdrop-blur-xl flex items-center justify-center p-6"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-white rounded-[3rem] p-12 shadow-2xl border border-slate-100 text-center max-w-sm w-full"
              >
                <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-8">
                  <CheckCircle2 size={48} />
                </div>
                <h2 className="text-xl font-extrabold text-slate-900 mb-4 tracking-tight sm:text-2xl">Tuyệt vời!</h2>
                <p className="text-slate-500 font-normal leading-relaxed mb-8">
                  Đánh giá của bạn đã được gửi đi thành công. Cảm ơn bạn đã đồng hành cùng học viên.
                </p>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 2.5 }}
                    className="h-full bg-emerald-500"
                  />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MentorPageShell>
  );
}
