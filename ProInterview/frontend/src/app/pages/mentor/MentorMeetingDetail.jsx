import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { 
  ArrowLeft, 
  Video, 
  Calendar, 
  Clock, 
  Star, 
  FileText, 
  User, 
  Briefcase, 
  Target, 
  CheckCircle2, 
  AlertCircle,
  MoreVertical,
  MessageSquare,
  Zap,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
  Layout
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { getUser } from "../../utils/auth";
import { MentorPageShell } from "../../components/mentor/MentorPageShell";
import { toastApiError, toastApiSuccess } from "../../utils/apiToast";
import {
  fetchMentorBookingById,
  listMentorBookings,
  mentorRescheduleBooking,
  mentorCancelBooking,
  fetchBookedSlots,
} from "../../utils/bookingsApi";
import { fetchMentorAvailability } from "../../utils/mentorApi";

const MENTOR_MEETING_DETAIL_EXTRA_CSS = `
        .neon-border { position: relative; }
        .neon-border::after {
           content: ''; position: absolute; inset: 0;
           border-radius: inherit;
           padding: 1px;
           background: linear-gradient(135deg, rgba(180, 245, 0, 0.4), transparent, rgba(128, 55, 244, 0.4));
           -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
           mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
           -webkit-mask-composite: xor;
           mask-composite: exclude;
           pointer-events: none;
        }
`;

export function MentorMeetingDetail() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const user = getUser();
  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [menteeSessionCount, setMenteeSessionCount] = useState(0);
  const [busyAction, setBusyAction] = useState("");
  const [actionModal, setActionModal] = useState("");
  const [actionError, setActionError] = useState("");
  const [rescheduleForm, setRescheduleForm] = useState({
    newDate: "",
    newTimeSlot: "",
    reason: "",
  });
  const [cancelReason, setCancelReason] = useState("");
  const [slotOptions, setSlotOptions] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  function toBookingDateFormat(input) {
    const raw = String(input || "").trim();
    if (!raw) return "";
    const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
    return raw;
  }

  function formatMeetingDate(dateStr, timeStr = "00:00") {
    const raw = String(dateStr || "").trim();
    const parts = raw.split("/").map((p) => Number(p));
    if (parts.length < 2 || !Number.isFinite(parts[0]) || !Number.isFinite(parts[1])) return raw || "--/--/----";
    const day = parts[0];
    const month = parts[1];
    const year = parts.length >= 3 && Number.isFinite(parts[2]) ? parts[2] : new Date().getFullYear();
    const [hour, minute] = String(timeStr || "00:00").split(":").map((p) => Number(p));
    const dt = new Date(year, month - 1, day, Number.isFinite(hour) ? hour : 0, Number.isFinite(minute) ? minute : 0);
    if (Number.isNaN(dt.getTime())) return raw || "--/--/----";
    return dt.toLocaleDateString("vi-VN");
  }

  useEffect(() => {
    if (!user || user.role !== "mentor") {
      navigate("/");
      return;
    }
    let active = true;
    (async () => {
      const res = await fetchMentorBookingById(sessionId);
      if (!active) return;
      if (!res.success || !res.booking) {
        setMeeting(null);
        toastApiError(res.error, "Không tải được chi tiết buổi hẹn.");
        setLoading(false);
        return;
      }
      const b = res.booking;
      setMeeting({
        id: b.id,
        userId: b.userId || "",
        mentorId: b.mentorId || "",
        status: b.status || "",
        scheduledTime: b.timeSlot || "--:--",
        scheduledDate: b.date || "",
        duration: Number(b.durationMinutes || 60),
        meetingType: b.sessionType || "mock-interview",
        rescheduleCount: Array.isArray(b.rescheduleHistory) ? b.rescheduleHistory.length : 0,
        notes: b.notes || "",
        feedback: b.mentorNotes || "",
        position:
          b.sessionType === "mock_interview"
            ? "Phỏng vấn thử"
            : b.sessionType === "cv_review"
              ? "CV Review"
              : b.sessionType === "career_consulting"
                ? "Tư vấn nghề nghiệp"
                : "Mentoring session",
        company: b.customerEmail || "ProInterview",
        overallScore: 0,
        starScores: { situation: 0, task: 0, action: 0, result: 0 },
        mentee: {
          name: b.customerName || "Học viên",
          avatar: b.customerAvatar || "https://i.pravatar.cc/120?img=22",
          level: "Mentee",
        },
      });
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [sessionId, user, navigate]);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!meeting?.userId) return;
      const res = await listMentorBookings();
      if (!active || !res.success) return;
      const rows = Array.isArray(res.bookings) ? res.bookings : [];
      const count = rows.filter((item) => String(item.userId || "") === String(meeting.userId)).length;
      setMenteeSessionCount(count);
    })();
    return () => {
      active = false;
    };
  }, [meeting?.userId]);

  if (!user || user.role !== "mentor") return null;
  if (loading) return <MentorPageShell bottomPad="pb-32"><div className="p-10 text-sm font-medium text-slate-500">Đang tải chi tiết buổi hẹn…</div></MentorPageShell>;
  if (!meeting) return <MentorPageShell bottomPad="pb-32"><div className="p-10 text-sm font-medium text-slate-600">Không tìm thấy buổi hẹn này.</div></MentorPageShell>;

  const isCompleted = meeting.status === "completed" || meeting.overallScore > 0;
  const canReschedule = Number(meeting.rescheduleCount || 0) < 1;
  const meetingTypeLabel =
    meeting.meetingType === "mock_interview"
      ? "Phỏng vấn thử"
      : meeting.meetingType === "cv_review"
        ? "CV Review"
        : meeting.meetingType === "career_consulting"
          ? "Tư vấn nghề nghiệp"
          : "Tư vấn chuyên sâu";

  const handleMentorReschedule = async () => {
    if (!canReschedule) {
      const msg = "Bạn đã hết lượt dời lịch cho buổi hẹn này.";
      setActionError(msg);
      toastApiError(msg);
      return;
    }
    const newDate = toBookingDateFormat(rescheduleForm.newDate);
    const newTimeSlot = String(rescheduleForm.newTimeSlot || "").trim();
    const reason = String(rescheduleForm.reason || "").trim();
    if (!newDate || !newTimeSlot) {
      setActionError("Vui lòng nhập đủ ngày và giờ mới.");
      return;
    }
    setBusyAction("reschedule");
    try {
    const res = await mentorRescheduleBooking(meeting.id, { newDate, newTimeSlot, reason });
    if (!res.success) {
      setActionError(res.error || "Không thể dời lịch.");
      toastApiError(res.error, "Không thể dời lịch.");
      return;
    }
    const b = res.booking || {};
    setMeeting((prev) =>
      prev
        ? {
            ...prev,
            scheduledDate: b.date || prev.scheduledDate,
            scheduledTime: b.timeSlot || prev.scheduledTime,
            status: b.status || prev.status,
            notes: b.notes || prev.notes,
            feedback: b.mentorNotes || prev.feedback,
          }
        : prev,
    );
    toastApiSuccess("Đã dời lịch buổi hẹn.");
    setActionModal("");
    setActionError("");
    } catch {
      setActionError("Lỗi kết nối khi dời lịch.");
      toastApiError("Lỗi kết nối khi dời lịch.");
    } finally {
      setBusyAction("");
    }
  };

  const loadAvailableSlots = async () => {
    if (!meeting?.mentorId) return;
    setLoadingSlots(true);
    setActionError("");
    try {
    const [availability, booked] = await Promise.all([
      fetchMentorAvailability(meeting.mentorId),
      fetchBookedSlots(meeting.mentorId),
    ]);
    if (!availability || !availability.availableSlots) {
      setActionError("Không tải được lịch rảnh của mentor.");
      toastApiError("Không tải được lịch rảnh của mentor.");
      return;
    }
    const bookedMap = booked.success ? booked.booked || {} : {};
    const all = [];
    for (const [date, slots] of Object.entries(availability.availableSlots || {})) {
      const bookingDate = toBookingDateFormat(date);
      for (const slot of Array.isArray(slots) ? slots : []) {
        const taken = Array.isArray(bookedMap[date]) ? bookedMap[date].includes(slot) : false;
        const isCurrent = bookingDate === meeting.scheduledDate && slot === meeting.scheduledTime;
        if (!taken || isCurrent) {
          all.push({ date: bookingDate, time: slot, label: `${bookingDate} • ${slot}` });
        }
      }
    }
    all.sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
    setSlotOptions(all);
    if (all.length > 0) {
      setRescheduleForm((prev) => ({
        ...prev,
        newDate: all[0].date,
        newTimeSlot: all[0].time,
      }));
    }
    } catch {
      setActionError("Lỗi kết nối khi tải lịch rảnh.");
      toastApiError("Lỗi kết nối khi tải lịch rảnh.");
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleMentorCancel = async () => {
    const reason = String(cancelReason || "").trim();
    if (!reason) {
      setActionError("Bạn cần nhập lý do để hủy lịch.");
      return;
    }
    setBusyAction("cancel");
    try {
    const res = await mentorCancelBooking(meeting.id, { reason });
    if (!res.success) {
      setActionError(res.error || "Không thể hủy buổi mentor.");
      toastApiError(res.error, "Không thể hủy buổi mentor.");
      return;
    }
    setActionModal("");
    setActionError("");
    if (res.lateCancel) {
      toastApiSuccess(
        "Đã hủy buổi (< 24h). Học viên được hoàn 100% ưu tiên — cần điền STK trên trang buổi hẹn.",
      );
    } else if (res.refundPending) {
      toastApiSuccess("Đã hủy. Yêu cầu hoàn tiền đã được ghi nhận.");
    } else {
      toastApiSuccess("Đã hủy. Học viên sẽ chọn đổi lịch, đổi mentor hoặc hoàn tiền trên trang buổi hẹn.");
    }
    navigate("/mentor/schedule");
    } catch {
      setActionError("Lỗi kết nối khi hủy buổi.");
      toastApiError("Lỗi kết nối khi hủy buổi.");
    } finally {
      setBusyAction("");
    }
  };

  return (
    <MentorPageShell bottomPad="pb-32" extraStyles={MENTOR_MEETING_DETAIL_EXTRA_CSS}>
      <div className="relative z-10 mx-auto max-w-7xl px-10 pb-10">
        {/* Header Navigation */}
        <div className="flex items-center justify-between mb-16">
           <button type="button" onClick={() => navigate(-1)} className="group flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 transition-all hover:text-slate-900">
              <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" /> Quay lại
           </button>
           <div className="flex gap-4">
              <button className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-zinc-500 hover:text-slate-900 transition-all">
                 <MoreVertical size={20} />
              </button>
           </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-10">
           {/* Main Session Content */}
           <div className="lg:col-span-8 space-y-10">
              {/* Session Core Info Card */}
              <div className="glass-card p-12 relative overflow-hidden group neon-border">
                 <div className="absolute top-0 right-0 p-12 opacity-5 scale-150 rotate-12 group-hover:rotate-0 transition-all duration-1000">
                    <Video size={180} className="text-violet-700" />
                 </div>
                 <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-8">
                       <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${isCompleted ? 'bg-primary-fixed/20 text-violet-700 border border-primary-fixed/20' : 'bg-orange-500/20 text-orange-400 border border-orange-500/20'}`}>
                          {isCompleted ? 'Đã hoàn thành' : 'Sắp diễn ra'}
                       </span>
                       <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                         <Layout size={14} /> {meetingTypeLabel}
                       </span>
                    </div>
                    <h1 className="mb-6 max-w-2xl font-headline text-2xl font-black leading-tight tracking-tight text-slate-900 sm:text-3xl">
                       {isCompleted ? 'Báo cáo chi tiết buổi Mentor' : 'Sẵn sàng phỏng vấn cùng Mentee'}
                    </h1>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-10">
                       <div className="space-y-2">
                          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Thời gian bắt đầu</p>
                          <p className="text-xl font-black text-slate-900 flex items-center gap-3">
                             <Clock size={20} className="text-violet-700" /> {meeting.scheduledTime}
                          </p>
                       </div>
                       <div className="space-y-2">
                          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Ngày diễn ra</p>
                          <p className="text-xl font-black text-slate-900 flex items-center gap-3">
                            <Calendar size={20} className="text-violet-700" /> {formatMeetingDate(meeting.scheduledDate, meeting.scheduledTime)}
                          </p>
                       </div>
                       <div className="space-y-2">
                          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Thời lượng</p>
                          <p className="text-xl font-black text-slate-900 flex items-center gap-3">
                             <ShieldCheck size={20} className="text-violet-700" /> {meeting.duration} Phút
                          </p>
                       </div>
                    </div>
                 </div>
              </div>

              {/* STAR Components Analysis (Visible if completed) */}
              {isCompleted && (
                 <div className="glass-card p-12">
                    <div className="flex items-center justify-between mb-12">
                       <h4 className="text-2xl font-black text-slate-900 font-headline tracking-tight flex items-center gap-4">
                          <Target className="text-violet-700" size={24} /> Kết quả STAR Framework
                       </h4>
                       <div className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-slate-50 border border-slate-200">
                          <Star className="text-[#FFD600] fill-current" size={18} />
                          <span className="text-lg font-black text-slate-900">{meeting.overallScore?.toFixed(1)}</span>
                          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">/ 5.0</span>
                       </div>
                    </div>

                    <div className="space-y-10">
                       {[
                         { label: "Situation", key: "situation", color: "#8037f4", desc: "Xác định hoàn cảnh và bối cảnh cụ thể" },
                         { label: "Task", key: "task", color: "#a66ff8", desc: "Nhiệm vụ và mục tiêu cần đạt được" },
                         { label: "Action", key: "action", color: "#93f72b", desc: "Hành động thực tế đã triển khai" },
                         { label: "Result", key: "result", color: "#FF8C42", desc: "Kết quả cuối cùng và giá trị đạt được" }
                       ].map((item) => {
                         const score = meeting.starScores?.[item.key] || 0;
                         return (
                           <div key={item.key} className="group">
                              <div className="flex items-start justify-between mb-4">
                                 <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-black text-sm" style={{ background: item.color }}>{item.label[0]}</div>
                                    <div>
                                       <p className="text-sm font-black text-slate-900 tracking-tight">{item.label}</p>
                                       <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">{item.desc}</p>
                                    </div>
                                 </div>
                                 <span className="text-sm font-black text-slate-900">{score.toFixed(1)}/5.0</span>
                              </div>
                              <div className="h-2 bg-slate-50 rounded-full overflow-hidden">
                                 <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(score / 5) * 100}%` }}
                                    transition={{ duration: 1.5, ease: "easeOut" }}
                                    className="h-full rounded-full" 
                                    style={{ background: item.color, boxShadow: `0 0 15px ${item.color}40` }} 
                                 />
                              </div>
                           </div>
                         );
                       })}
                    </div>
                 </div>
              )}

              {/* Luxury Minimalist Feedback & Notes */}
              <div className="space-y-10">
                <div className="relative overflow-hidden bg-white rounded-[2.5rem] p-12 shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-slate-100">
                  {/* Subtle Gradient Accent */}
                  <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-50/50 to-violet-50/30 blur-3xl -z-10" />
                  
                  <div className="mb-12">
                    <h5 className="text-[11px] font-black text-indigo-500 uppercase tracking-[0.3em] mb-3">BÁO CÁO PHÂN TÍCH</h5>
                    <h2 className="text-xl font-black sm:text-2xl text-slate-900 tracking-tight">Đánh giá từ chuyên gia</h2>
                  </div>
                  
                  <div className="space-y-1">
                    {(() => {
                      const raw = meeting.feedback || "";
                      if (!raw) return <p className="text-sm text-slate-400 font-medium">Đang chờ cập nhật nội dung đánh giá...</p>;
                      
                      const sections = raw.split(/\n/);
                      return sections.map((line, idx) => {
                        const trimmed = line.trim();
                        if (!trimmed) return null;
                        
                        const cleanLine = trimmed.replace(/^[🎯💪🚀💡📝]\s*/, "");
                        
                        if (cleanLine.includes(":")) {
                           const [title, ...contentParts] = cleanLine.split(":");
                           const content = contentParts.join(":").trim();
                           return (
                             <div key={idx} className="group py-8 first:pt-0 last:pb-0 border-b border-slate-50 last:border-0">
                               <div className="flex items-baseline gap-6">
                                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 group-hover:scale-150 transition-transform" />
                                  <div className="flex-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">{title}</p>
                                    <p className="text-lg font-semibold text-slate-800 leading-relaxed tracking-tight">{content}</p>
                                  </div>
                               </div>
                             </div>
                           );
                        }

                        return (
                          <div key={idx} className="py-6 first:pt-0 last:pb-0">
                            <p className="text-base font-medium text-slate-600 leading-relaxed">{cleanLine}</p>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-[2.5rem] p-12 shadow-2xl shadow-indigo-900/20 text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-12 opacity-10">
                    <div className="w-32 h-32 rounded-full border-8 border-white/20" />
                  </div>
                  <h5 className="text-[11px] font-black text-indigo-300 uppercase tracking-[0.3em] mb-8">GHI CHÚ VẬN HÀNH</h5>
                  <div className="backdrop-blur-md bg-white/5 rounded-3xl p-8 border border-white/10">
                    <p className="text-base font-medium text-indigo-50/80 leading-relaxed whitespace-pre-wrap">
                       {meeting.notes || "Hệ thống chưa ghi nhận ghi chú bổ sung cho buổi này."}
                    </p>
                  </div>
                </div>
              </div>
           </div>

           {/* Mentee Profile Sidebar */}
           <div className="lg:col-span-4 space-y-10">
              <div className="glass-card p-10">
                 <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-10">Hồ sơ Mentee</p>
                 <div className="flex flex-col items-center text-center mb-10">
                    <img src={meeting.mentee.avatar} className="w-32 h-32 rounded-[40px] object-cover ring-8 ring-white/5 shadow-2xl mb-6" />
                    <h3 className="text-xl font-black sm:text-2xl text-slate-900 tracking-tighter">{meeting.mentee.name}</h3>
                    <p className="text-sm font-black text-violet-700 uppercase tracking-widest mt-2">{meeting.mentee.level}</p>
                 </div>
                 
                 <div className="space-y-6 border-t border-slate-200">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-zinc-500"><Briefcase size={18} /></div>
                       <div>
                          <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Vị trí hiện tại</p>
                          <p className="text-xs font-bold text-slate-900">{meeting.position} @ {meeting.company}</p>
                       </div>
                    </div>
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-zinc-500"><Star size={18} /></div>
                       <div>
                          <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Các buổi đã tham gia</p>
                          <p className="text-xs font-bold text-slate-900">{menteeSessionCount || 1} buổi học tập</p>
                       </div>
                    </div>
                 </div>

                 <button onClick={() => navigate("/mentor/analytics")} className="w-full mt-10 py-4 rounded-3xl bg-slate-50 border border-slate-200 text-[10px] font-black uppercase tracking-widest hover:text-slate-900 hover:bg-slate-100 transition-all flex items-center justify-center gap-3">
                    Xem toàn bộ tiến trình <ChevronRight size={14} />
                 </button>
              </div>

              {/* Action Toolbar */}
              <div className="glass-card p-10">
                 <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-8">Thao tác hệ thống</h4>
                 <div className="space-y-4">
                    {!isCompleted ? (
                       <>
                         <button
                            onClick={() => navigate(`/meeting/${meeting.id}`)}
                            disabled={busyAction !== ""}
                            className="w-full py-5 rounded-3xl bg-primary-fixed text-black text-[10px] font-black uppercase tracking-widest shadow-[0_15px_40px_rgba(196, 255, 71,0.32)] hover:scale-105 transition-all"
                         >
                             Vào phòng họp ngay
                          </button>
                         <button
                            onClick={() => {
                              if (!canReschedule) {
                                const msg = "Bạn đã hết lượt dời lịch cho buổi hẹn này.";
                                setActionError(msg);
                                toastApiError(msg);
                                return;
                              }
                              setRescheduleForm({
                                newDate: meeting.scheduledDate || "",
                                newTimeSlot: meeting.scheduledTime || "09:00",
                                reason: "",
                              });
                              setActionError("");
                              setActionModal("reschedule");
                              loadAvailableSlots();
                            }}
                            disabled={busyAction !== ""}
                            className="w-full py-5 rounded-3xl bg-slate-50 border border-slate-200 text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all"
                         >
                            {busyAction === "reschedule" ? "Đang dời lịch..." : "Dời lịch hẹn"}
                          </button>
                         <button
                            onClick={() => {
                              setCancelReason("");
                              setActionError("");
                              setActionModal("cancel");
                            }}
                            disabled={busyAction !== ""}
                            className="w-full py-5 rounded-3xl bg-red-600/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all"
                         >
                            {busyAction === "cancel" ? "Đang hủy..." : "Hủy buổi mentor"}
                          </button>
                       </>
                    ) : (
                       <>
                          <button 
                            onClick={() => navigate(`/mentor/session-feedback/${meeting.id}`)}
                            className="w-full py-5 rounded-3xl bg-primary-fixed text-black text-[10px] font-black uppercase tracking-widest shadow-[0_15px_40px_rgba(196, 255, 71,0.32)] hover:scale-105 transition-all flex items-center justify-center gap-2"
                          >
                             <TrendingUp size={16} /> Gửi feedback bổ sung
                          </button>
                          <button className="w-full py-5 rounded-3xl bg-slate-50 border border-slate-200 text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all flex items-center justify-center gap-2">
                             <Layout size={16} /> Xem bản ghi video
                          </button>
                       </>
                    )}
                 </div>
              </div>
           </div>
        </div>
      </div>
      <AnimatePresence>
        {actionModal === "reschedule" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-sm bg-slate-900/35"
            onClick={() => setActionModal("")}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="glass-card w-full max-w-xl p-8"
              onClick={(e) => e.stopPropagation()}
            >
              <h4 className="text-xl font-black text-slate-900 mb-6">Dời lịch hẹn</h4>
              <div className="space-y-4">
                <input
                  value={canReschedule ? `${rescheduleForm.newDate} ${rescheduleForm.newTimeSlot}`.trim() : "Đã dời lịch 1 lần"}
                  readOnly
                  className="input-glass w-full"
                />
                <select
                  value={`${rescheduleForm.newDate}|${rescheduleForm.newTimeSlot}`}
                  onChange={(e) => {
                    const [date, time] = String(e.target.value).split("|");
                    setRescheduleForm((p) => ({ ...p, newDate: date || "", newTimeSlot: time || "" }));
                  }}
                  disabled={!canReschedule || loadingSlots || slotOptions.length === 0}
                  className="input-glass w-full"
                >
                  {loadingSlots && <option>Đang tải slot trống...</option>}
                  {!loadingSlots && slotOptions.length === 0 && <option>Không có slot trống phù hợp</option>}
                  {!loadingSlots &&
                    slotOptions.map((opt) => (
                      <option key={`${opt.date}|${opt.time}`} value={`${opt.date}|${opt.time}`}>
                        {opt.label}
                      </option>
                    ))}
                </select>
                <textarea
                  value={rescheduleForm.reason}
                  onChange={(e) => setRescheduleForm((p) => ({ ...p, reason: e.target.value }))}
                  placeholder="Lý do dời lịch (không bắt buộc)"
                  className="input-glass w-full min-h-24"
                />
                {!canReschedule && (
                  <p className="text-xs text-amber-300 font-bold">Lịch hẹn này đã dời 1 lần. Không thể dời thêm.</p>
                )}
                {actionError && <p className="text-xs text-red-400 font-bold">{actionError}</p>}
                <div className="flex justify-end gap-3">
                  <button onClick={() => setActionModal("")} className="px-5 py-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-black text-zinc-300">Đóng</button>
                  <button onClick={handleMentorReschedule} disabled={busyAction !== "" || !canReschedule || loadingSlots || slotOptions.length === 0} className="px-5 py-3 rounded-xl bg-primary-fixed text-black text-xs font-black disabled:opacity-60">
                    {busyAction === "reschedule" ? "Đang dời lịch..." : "Xác nhận dời lịch"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
        {actionModal === "cancel" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-sm bg-slate-900/35"
            onClick={() => setActionModal("")}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="glass-card w-full max-w-xl p-8"
              onClick={(e) => e.stopPropagation()}
            >
              <h4 className="text-xl font-black text-slate-900 mb-3">Hủy buổi mentor</h4>
              <p className="text-sm text-zinc-400 mb-2">
                Trước buổi <strong className="text-zinc-600">≥ 24h</strong>: học viên chọn đổi lịch / đổi mentor / hoàn 100%.
                <strong className="text-zinc-600"> Dưới 24h</strong>: hệ thống ưu tiên hoàn 100% (học viên điền STK). Sau giờ họp: dùng
                báo no-show (học viên/admin).
              </p>
              <p className="text-sm text-zinc-400 mb-4">Bạn cần nhập lý do trước khi hủy lịch.</p>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Nhập lý do hủy lịch..."
                className="input-glass w-full min-h-24"
              />
              {actionError && <p className="text-xs text-red-400 font-bold mt-3">{actionError}</p>}
              <div className="flex justify-end gap-3 mt-5">
                <button onClick={() => setActionModal("")} className="px-5 py-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-black text-zinc-300">Đóng</button>
                <button onClick={handleMentorCancel} disabled={busyAction !== ""} className="px-5 py-3 rounded-xl bg-red-600/20 border border-red-500/30 text-red-300 text-xs font-black">
                  {busyAction === "cancel" ? "Đang hủy..." : "Xác nhận hủy"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </MentorPageShell>
  );
}