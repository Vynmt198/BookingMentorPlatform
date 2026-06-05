import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import {
  Video as VideoIcon,
  VideoOff,
  LogOut,
  Clock,
  ShieldCheck,
  Sparkles,
  ArrowLeft,
} from "lucide-react";
import { motion } from "motion/react";
import { getUser, hasAuthCredentials } from "../../utils/auth";
import {
  fetchBookingById,
  fetchMentorBookingById,
  completeMentorBooking,
  startBookingMeeting,
} from "../../utils/bookingsApi";
import { KnowledgeCaptureModal } from "../../components/mentor/KnowledgeCaptureModal";
import {
  buildProInterviewMeetUrl,
  canEnterMeetingRoom,
  getMinutesUntilBookingStart,
  isBookingInLiveWindow,
} from "../../utils/meetingLinks";
import { toastApiError, toastApiSuccess } from "../../utils/apiToast";
import { sessionTypeLabel } from "../../utils/sessionTypeLabels";

export function MeetingRoom() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const user = getUser();

  const [meeting, setMeeting] = useState(null);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState("");
  const [elapsedTime, setElapsedTime] = useState(0);
  const [jitsiUrl, setJitsiUrl] = useState("");
  const [earlyNotice, setEarlyNotice] = useState("");
  const [showKnowledgeModal, setShowKnowledgeModal] = useState(false);
  const [bookingMeta, setBookingMeta] = useState({ role: "", field: "" });

  useEffect(() => {
    const u = getUser();
    if (!hasAuthCredentials() || !u || !sessionId) {
      navigate(`/login?redirect=${encodeURIComponent(`/meeting/${sessionId || ""}`)}`, { replace: true });
      return;
    }

    let active = true;

    async function loadMeeting() {
      try {
        const asMentor = u.role === "mentor";
        const fetchFn = asMentor ? fetchMentorBookingById : fetchBookingById;
        const res = await fetchFn(sessionId);

        if (!active) return;

        if (!res.success || !res.booking) {
          const msg = res.error || "Phòng họp không tồn tại hoặc bạn không có quyền truy cập.";
          setError(msg);
          toastApiError(msg);
          return;
        }

        const b = res.booking;
        const entry = canEnterMeetingRoom(b);
        if (!entry.ok) {
          setError(entry.message);
          toastApiError(entry.message);
          return;
        }

        const startRes = await startBookingMeeting(sessionId, { asMentor });
        if (!active) return;
        if (!startRes.success) {
          const msg = startRes.error || entry.message;
          setError(msg);
          toastApiError(msg);
          return;
        }

        if (!isBookingInLiveWindow(b)) {
          const mins = getMinutesUntilBookingStart(b);
          setEarlyNotice(
            mins > 0
              ? `Buổi hẹn chưa tới giờ (còn khoảng ${mins} phút). Bạn có thể vào thử phòng — lịch hẹn vẫn được giữ.`
              : "Bạn vào phòng trước giờ hẹn. Lịch vẫn hiển thị cho đến khi buổi diễn ra.",
          );
        } else {
          setEarlyNotice("");
        }

        setMeeting({
          sessionId: b.id || b._id || sessionId,
          mentorName: b.mentorName || b.mentor?.name || "Mentor",
          customerName: b.customerName || b.user?.name || b.customer?.name || "Học viên",
        });
        // Lưu metadata booking để pre-fill KnowledgeCaptureModal
        setBookingMeta({
          role: sessionTypeLabel(b.sessionType, ""),
          field: "",
        });
        setJoined(true);
        setJitsiUrl(buildProInterviewMeetUrl(sessionId, u.name || u.email || "User"));
      } catch {
        if (!active) return;
        const msg = "Lỗi kết nối khi mở phòng họp.";
        setError(msg);
        toastApiError(msg);
      }
    }

    loadMeeting();
    return () => {
      active = false;
    };
  }, [sessionId, navigate]);

  useEffect(() => {
    if (!joined) return;
    const timer = setInterval(() => setElapsedTime((prev) => prev + 1), 1000);
    return () => clearInterval(timer);
  }, [joined]);

  const handleEndCall = () => {
    navigate(user?.role === "mentor" ? "/mentor/dashboard" : "/");
  };

  const handleCompleteSession = async () => {
    if (!window.confirm("Bạn có chắc chắn muốn kết thúc và hoàn thành buổi học này?")) return;
    try {
      const res = await completeMentorBooking(sessionId);
      if (res.success) {
        toastApiSuccess("Đã kết thúc buổi học.");
        // Mở knowledge capture modal thay vì navigate ngay
        setShowKnowledgeModal(true);
      } else {
        toastApiError(res.error, "Không thể kết thúc buổi học.");
      }
    } catch {
      toastApiError("Lỗi kết nối khi kết thúc buổi học.");
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const isMentor = user?.role === "mentor";
  const counterpartName = isMentor ? meeting?.customerName : meeting?.mentorName;
  const counterpartLabel = isMentor ? "Học viên" : "Mentor";

  if (error) {
    return (
      <motion.div className="min-h-svh bg-[#07060E] flex items-center justify-center text-white p-6">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 text-red-400 border border-red-500/20">
            <VideoOff size={32} />
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tighter mb-4">Không vào được phòng</h2>
          <p className="text-white/60 font-medium mb-8 whitespace-pre-line">{error}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={() => navigate(isMentor ? "/mentor/dashboard" : `/session/${sessionId}`)}
              className="px-8 py-3 bg-[#93f72b] text-slate-900 rounded-2xl text-xs font-black uppercase tracking-widest"
            >
              Chi tiết buổi hẹn
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  if (!joined || !meeting) {
    return (
      <div className="min-h-svh bg-[#07060E] flex items-center justify-center">
        <div className="text-center">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
            <Sparkles size={48} className="text-violet-400 mb-6 opacity-60 mx-auto" />
          </motion.div>
          <p className="text-white/50 font-black uppercase tracking-widest text-xs">
            Đang chuẩn bị phòng phỏng vấn ProInterview…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-svh bg-[#07060E] flex flex-col relative overflow-hidden font-sans">
      {/* Knowledge Capture Modal — mentor chia sẻ insights sau buổi học */}
      {showKnowledgeModal && (
        <KnowledgeCaptureModal
          bookingId={sessionId}
          defaultRole={bookingMeta.role}
          defaultField={bookingMeta.field}
          onClose={() => { setShowKnowledgeModal(false); navigate("/mentor/dashboard"); }}
          onDone={() => { setShowKnowledgeModal(false); navigate("/mentor/dashboard"); }}
        />
      )}
      <motion.div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none opacity-20">
        <div className="absolute top-0 w-full h-[600px] bg-gradient-to-b from-violet-600/20 to-transparent blur-[100px]" />
      </motion.div>

      <header className="relative z-20 flex flex-wrap items-center justify-between gap-4 px-4 sm:px-8 py-3 sm:py-4 bg-black/50 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleEndCall}
            className="p-2.5 rounded-xl bg-white/5 text-white/70 hover:text-white hover:bg-white/10 transition-all"
            title="Thoát phòng"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="w-10 h-10 rounded-xl bg-[#93f72b] flex items-center justify-center text-slate-900">
            <VideoIcon size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black text-white/50 uppercase tracking-widest">Phòng ProInterview</p>
            <p className="text-xs font-bold uppercase tracking-tighter text-violet-700">#{sessionId.slice(-8)}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 sm:gap-5">
          {counterpartName && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-xl border border-white/10">
              <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center border border-violet-500/30">
                <span className="text-[10px] font-bold text-violet-300">{counterpartName.charAt(0)}</span>
              </div>
              <div>
                <p className="text-[9px] font-black text-white/40 uppercase tracking-widest leading-none mb-0.5">
                  {counterpartLabel}
                </p>
                <p className="text-[11px] font-bold text-white leading-none">{counterpartName}</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 text-red-400 rounded-xl border border-red-500/20">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[9px] font-black uppercase tracking-widest">Live</span>
          </div>
          <div className="flex items-center gap-2 text-white font-mono text-sm font-black">
            <Clock size={14} className="text-violet-400" />
            {formatTime(elapsedTime)}
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {isMentor ? (
            <>
              <button
                type="button"
                onClick={handleEndCall}
                className="px-5 py-2.5 rounded-xl bg-white/10 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/20"
              >
                Rời phòng
              </button>
              <button
                type="button"
                onClick={handleCompleteSession}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#93f72b] text-slate-900 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[#93f72b]/20"
              >
                <ShieldCheck size={16} /> Kết thúc buổi
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleEndCall}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest"
            >
              <LogOut size={16} /> Rời phòng
            </button>
          )}
        </div>
      </header>

      {earlyNotice ? (
        <div className="relative z-20 mx-2 sm:mx-4 mt-2 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-2.5 text-center text-xs text-amber-100">
          {earlyNotice}
        </div>
      ) : null}

      <main className="relative z-10 flex-1 min-h-0 p-1 sm:p-2">
        <div className="w-full h-full min-h-[min(70vh,720px)] rounded-xl overflow-hidden bg-black border border-white/5 shadow-2xl relative">
          <iframe
            allow="camera; microphone; display-capture; autoplay; clipboard-write"
            src={`${jitsiUrl}${jitsiUrl.includes("#") ? "&" : "#"}config.prejoinPageEnabled=false`}
            style={{ width: "100%", height: "100%", minHeight: "min(70vh, 720px)", border: "0" }}
            title="Phòng phỏng vấn ProInterview"
          />
          <div className="absolute top-4 left-4 pointer-events-none">
            <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-lg px-3 py-1.5 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#93f72b] shadow-[0_0_8px_#93f72b]" />
              <span className="text-[9px] font-bold text-white uppercase tracking-widest opacity-80">
                {isMentor ? "Mentor" : "Học viên"}
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
