import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router";
import { Star, Check, ChevronRight as CaretRight, AlertCircle as WarningCircle } from "lucide-react";
import { toastApiError, tryApi } from "../../utils/apiToast.js";
import { isLoggedIn } from "../../utils/auth.js";
import { submitReview } from "../../utils/reviewsApi.js";
import { fetchBookingById } from "../../utils/bookingsApi.js";
import { apiBookingToLocal } from "../../utils/bookingMappers.js";
import { avatarSrc, DEFAULT_AVATAR } from "../../utils/mediaUrl.js";
import { MentorPageShell } from "../../components/mentor/MentorPageShell";
import { CUSTOMER_SHELL_GUTTER } from "../../components/layout/customerShellLayout";
import { BRAND_PURPLE, BRAND_LIME_SOFT, BRAND_LIME_BORDER } from "../../constants/brandColors";

function isMongoObjectId(value) {
  return typeof value === "string" && /^[a-f\d]{24}$/i.test(value.trim());
}

const HIGHLIGHT_OPTIONS = [
  "Câu hỏi thực tế & chuyên sâu",
  "Feedback rõ ràng, dễ hiểu",
  "Chia sẻ kinh nghiệm insider",
  "Phong thái chuyên nghiệp",
  "Đúng giờ, chuẩn bị kỹ",
  "Gợi ý cải thiện cụ thể",
  "Kiến thức kỹ thuật sâu",
  "Trả lời tận tâm",
];

const OVERALL_LABELS = ["", "Chưa hài lòng", "Tạm ổn", "Khá tốt", "Tốt lắm!", "Xuất sắc!"];

/** Khung trạng thái dùng chung cho các màn chặn (loading/lỗi/đã đánh giá), khớp style card-premium. */
function ReviewStatusScreen({ tone, icon, title, description, children }) {
  const toneStyles = {
    amber: { borderColor: "rgba(245,158,11,0.28)", backgroundColor: "rgba(245,158,11,0.12)" },
    lime: { borderColor: BRAND_LIME_BORDER, backgroundColor: BRAND_LIME_SOFT },
    slate: { borderColor: "rgba(148,163,184,0.35)", backgroundColor: "rgba(148,163,184,0.12)" },
  };
  return (
    <MentorPageShell bottomPad="pb-20">
      <div
        className={`relative z-10 flex min-h-[60vh] items-center justify-center pb-10 pt-8 sm:pt-10 ${CUSTOMER_SHELL_GUTTER}`}
      >
        <div className="card-premium w-full max-w-md p-8 text-center sm:p-10">
          <div
            className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-xl border"
            style={toneStyles[tone]}
          >
            {icon}
          </div>
          <h3 className="mb-2 text-xl font-bold text-violet-950">{title}</h3>
          <p className="mb-8 text-sm leading-relaxed text-violet-600">{description}</p>
          {children}
        </div>
      </div>
    </MentorPageShell>
  );
}

function PrimaryButton({ children, ...props }) {
  return (
    <button
      type="button"
      className="w-full rounded-xl py-3 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50"
      style={{ backgroundColor: BRAND_PURPLE }}
      {...props}
    >
      {children}
    </button>
  );
}

export function MentorReview() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Use initialRating from navigation state if available
  const [overallRating, setOverallRating] = useState(location.state?.initialRating || 0);
  const [highlights, setHighlights] = useState([]);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);

  useEffect(() => {
    const loadSession = async () => {
      setLoading(true);
      setLoadError("");
      setSession(null);
      if (!isLoggedIn()) {
        setLoadError("Vui lòng đăng nhập để đánh giá buổi phỏng vấn.");
        setLoading(false);
        return;
      }
      if (!isMongoObjectId(sessionId)) {
        setLoadError("Mã buổi hẹn không hợp lệ.");
        setLoading(false);
        return;
      }
      const res = await tryApi(() => fetchBookingById(sessionId), {
        fallback: "Không tải được buổi hẹn.",
        silent: true,
      });
      if (res.success && res.booking) {
        setSession(apiBookingToLocal(res.booking));
      } else {
        const msg = res.error || "Không tải được buổi hẹn.";
        setLoadError(msg);
        toastApiError(msg);
      }
      setLoading(false);
    };
    loadSession();
  }, [sessionId]);

  const canSubmit = overallRating > 0;

  const handleSubmit = async () => {
    if (!canSubmit || !session) return;
    setSubmitting(true);
    const res = await tryApi(
      () =>
        submitReview({
          targetType: "mentor",
          targetId: session.mentorId,
          bookingId: session.backendId || session.sessionId,
          rating: overallRating,
          comment: text,
          tags: highlights,
        }),
      { fallback: "Không thể gửi đánh giá.", successMessage: "Cảm ơn bạn đã gửi đánh giá!" },
    );
    setSubmitting(false);
    if (res.success) {
      navigate(`/session/${session.backendId || session.sessionId}`, { replace: true });
    }
  };

  if (loading) {
    return (
      <MentorPageShell bottomPad="pb-20">
        <div
          className={`relative z-10 flex min-h-[60vh] items-center justify-center pb-10 pt-8 sm:pt-10 ${CUSTOMER_SHELL_GUTTER}`}
        >
          <div className="flex flex-col items-center gap-4 text-center">
            <div
              className="h-10 w-10 animate-spin rounded-full border-4 border-violet-100"
              style={{ borderTopColor: BRAND_PURPLE }}
            />
            <p className="text-sm font-medium text-slate-500">Đang tải thông tin...</p>
          </div>
        </div>
      </MentorPageShell>
    );
  }

  if (session && session.status !== "done") {
    return (
      <ReviewStatusScreen
        tone="amber"
        icon={<WarningCircle className="h-7 w-7 text-amber-500" />}
        title="Chưa thể đánh giá"
        description="Chỉ đánh giá được sau khi buổi phỏng vấn đã hoàn thành."
      >
        <PrimaryButton onClick={() => navigate(`/session/${session.backendId || session.sessionId}`)}>
          Về chi tiết buổi hẹn
        </PrimaryButton>
      </ReviewStatusScreen>
    );
  }

  if (session?.isReviewed) {
    return (
      <ReviewStatusScreen
        tone="lime"
        icon={<Check className="h-7 w-7" style={{ color: BRAND_PURPLE }} />}
        title="Bạn đã đánh giá buổi này"
        description={`Cảm ơn phản hồi của bạn cho mentor ${session.mentorName}.`}
      >
        <PrimaryButton onClick={() => navigate(`/session/${session.backendId || session.sessionId}`)}>
          Xem buổi phỏng vấn
        </PrimaryButton>
      </ReviewStatusScreen>
    );
  }

  if (!session) {
    return (
      <ReviewStatusScreen
        tone="slate"
        icon={<WarningCircle className="h-7 w-7 text-slate-400" />}
        title="Không tìm thấy thông tin"
        description={loadError || "Buổi phỏng vấn này không tồn tại hoặc bạn không có quyền xem."}
      >
        {!isLoggedIn() ? (
          <PrimaryButton onClick={() => navigate("/login")}>Đăng nhập</PrimaryButton>
        ) : (
          <PrimaryButton onClick={() => navigate("/")}>Về trang chủ</PrimaryButton>
        )}
      </ReviewStatusScreen>
    );
  }

  return (
    <MentorPageShell fillHeight bottomPad="pb-4" className="!min-h-0 !pb-4">
      <div className="relative z-10 mx-auto flex max-lg:h-auto max-lg:min-h-0 max-lg:max-h-none min-h-0 w-full max-w-6xl flex-col overflow-visible px-4 pb-4 pt-4 sm:px-6 lg:h-[calc(100svh-7.5rem)] lg:max-h-[calc(100svh-7.5rem)] lg:px-8">
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-12">
          {/* LEFT — danh tính mentor + đánh giá sao */}
          <div className="card-premium flex min-h-0 flex-col items-center justify-center gap-5 p-5 text-center sm:p-6 lg:col-span-4 lg:self-start">
            <div className="flex flex-col items-center">
              <img
                src={avatarSrc(session.mentorAvatar)}
                alt={session.mentorName}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = DEFAULT_AVATAR;
                }}
                className="h-14 w-14 shrink-0 rounded-2xl object-cover"
              />
              <p className="mt-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: BRAND_PURPLE }}>
                Đánh giá mentor
              </p>
              <h2 className="text-lg font-bold text-violet-950">{session.mentorName}</h2>
              <p className="mt-0.5 text-xs text-violet-500">
                {session.date} · {session.time}
              </p>
            </div>

            <div className="w-full border-t border-violet-100 pt-5">
              <p className="mb-4 text-sm font-bold text-violet-950">Trải nghiệm của bạn thế nào?</p>
              <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <button
                    key={i}
                    type="button"
                    onMouseEnter={() => setHoverRating(i)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setOverallRating(i)}
                    className="rounded-md p-1 transition hover:scale-110 active:scale-95"
                    aria-label={`Đánh giá ${i} sao`}
                  >
                    <Star
                      className={`h-7 w-7 sm:h-8 sm:w-8 ${
                        i <= (hoverRating || overallRating) ? "fill-amber-400 text-amber-400" : "text-violet-100"
                      }`}
                    />
                  </button>
                ))}
              </div>

              <div className="mt-3 flex h-5 items-center justify-center">
                <span className="text-xs font-bold uppercase tracking-wide" style={{ color: BRAND_PURPLE }}>
                  {OVERALL_LABELS[hoverRating || overallRating]}
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT — điểm nổi bật + nhận xét + gửi */}
          <div className="card-premium flex min-h-0 flex-col p-6 sm:p-8 lg:col-span-8">
            <div className="shrink-0">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Điểm nổi bật</p>
              <div className="flex flex-wrap gap-2">
                {HIGHLIGHT_OPTIONS.map((opt) => {
                  const isSelected = highlights.includes(opt);
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() =>
                        setHighlights((prev) => (isSelected ? prev.filter((h) => h !== opt) : [...prev, opt]))
                      }
                      className={`rounded-xl border-2 px-3.5 py-2 text-xs font-bold transition-all ${
                        isSelected
                          ? "border-transparent text-white"
                          : "border-violet-100 bg-white text-violet-400 hover:border-violet-200"
                      }`}
                      style={isSelected ? { backgroundColor: BRAND_PURPLE } : undefined}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 flex min-h-0 flex-1 flex-col">
              <p className="mb-3 shrink-0 text-xs font-semibold uppercase tracking-wider text-gray-400">
                Nhận xét chi tiết
              </p>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={`Ví dụ: Buổi phỏng vấn với ${session.mentorName} rất bổ ích. Mentor đặt câu hỏi thực tế và cho feedback rõ ràng...`}
                maxLength={2000}
                className="w-full min-h-[80px] flex-1 resize-none rounded-2xl border border-violet-100 bg-violet-50/30 p-4 text-sm font-medium text-violet-900 outline-none transition-all placeholder:text-violet-300 focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
              />
              <p className="mt-2 shrink-0 text-right text-[10px] font-semibold uppercase tracking-wider text-violet-300">
                {text.length} / 2000 ký tự
              </p>
            </div>

            <div className="mt-4 flex shrink-0 items-center gap-4">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit || submitting}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white shadow-sm transition hover:brightness-110 disabled:opacity-50"
                style={{ backgroundColor: BRAND_PURPLE }}
              >
                {submitting ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <>
                    Gửi đánh giá <CaretRight className="h-4 w-4" />
                  </>
                )}
              </button>
              <p className="hidden max-w-[10rem] shrink-0 text-xs font-medium text-violet-500 sm:block">
                Chỉ mất 1 phút · Đánh giá của bạn rất quan trọng
              </p>
            </div>
          </div>
        </div>
      </div>
    </MentorPageShell>
  );
}
