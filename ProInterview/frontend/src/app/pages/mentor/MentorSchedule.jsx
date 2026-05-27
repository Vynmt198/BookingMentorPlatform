import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  CheckCircle2,
  AlertCircle,
  Video,
  Users,
  X,
  PlusCircle,
  Trash2,
  Save,
  Clock3,
  Globe
} from "lucide-react";
import { getUser } from "../../utils/auth";
import { MentorPageShell } from "../../components/mentor/MentorPageShell";
import { listMentorBookings } from "../../utils/bookingsApi";
import { fetchMentorAvailability, updateMyMentorAvailability } from "../../utils/mentorApi";
import { toastApiError, toastApiSuccess } from "../../utils/apiToast";

const DEFAULT_AVATAR = "https://i.pravatar.cc/120?img=22";

function toMeetingItem(booking) {
  return {
    id: booking.id || booking._id || "",
    status: booking.status || "",
    date: booking.date || "",
    scheduledTime: booking.timeSlot || "--:--",
    position: booking.sessionType || "Mentoring session",
    mentee: {
      name: booking.customerName || "Học viên",
      avatar: booking.customerAvatar || DEFAULT_AVATAR,
    },
  };
}

function bookingOnDate(bookingDate, selectedDate) {
  const normalized = String(bookingDate || "").trim();
  if (!normalized) return false;
  const parts = normalized.split("/");
  if (parts.length < 2) return false;
  const d = Number(parts[0]);
  const m = Number(parts[1]);
  const y = parts.length >= 3 ? Number(parts[2]) : null;
  if (!Number.isFinite(d) || !Number.isFinite(m)) return false;
  if (y && y !== selectedDate.getFullYear()) return false;
  return d === selectedDate.getDate() && m === selectedDate.getMonth() + 1;
}

function parseBookingDate(bookingDate) {
  const normalized = String(bookingDate || "").trim();
  if (!normalized) return null;
  const parts = normalized.split("/");
  if (parts.length < 2) return null;
  const d = Number(parts[0]);
  const m = Number(parts[1]);
  const y = parts.length >= 3 ? Number(parts[2]) : new Date().getFullYear();
  if (!Number.isFinite(d) || !Number.isFinite(m) || !Number.isFinite(y)) return null;
  const dt = new Date(y, m - 1, d, 0, 0, 0, 0);
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}

const MENTOR_SCHEDULE_EXTRA_CSS = `
        .calendar-cell {
           aspect-ratio: 1;
           display: flex;
           flex-direction: column;
           align-items: center;
           justify-content: center;
           border-radius: 18px;
           transition: all 0.3s;
           cursor: pointer;
           position: relative;
        }
        .calendar-cell:hover { background: rgba(15, 23, 42, 0.04); }
        .calendar-cell.active {
           background: #93f72b;
           color: black;
           box-shadow: 0 10px 30px rgba(180, 245, 0, 0.3);
           font-weight: 900;
        }
        .calendar-cell.dot::after {
           content: '';
           position: absolute;
           bottom: 6px;
           width: 4px;
           height: 4px;
           border-radius: 50%;
           background: #8037f4;
        }
`;

/* ── Manage Availability Modal ────────────────────────────────────────── */
const DAY_ROWS = [
  { key: 0, label: "Thứ 2" },
  { key: 1, label: "Thứ 3" },
  { key: 2, label: "Thứ 4" },
  { key: 3, label: "Thứ 5" },
  { key: 4, label: "Thứ 6" },
  { key: 5, label: "Thứ 7" },
  { key: 6, label: "Chủ nhật" },
];

const SLOT_OPTIONS = Array.from({ length: 16 }, (_, i) => {
  const hour = i + 7; // 07:00 -> 22:00
  return `${String(hour).padStart(2, "0")}:00`;
});

function toOneHourRange(start) {
  const [h, m] = String(start || "09:00").split(":").map(Number);
  const safeH = Number.isFinite(h) ? h : 9;
  const safeM = Number.isFinite(m) ? m : 0;
  const end = `${String(Math.min(safeH + 1, 23)).padStart(2, "0")}:${String(safeM).padStart(2, "0")}`;
  return `${String(safeH).padStart(2, "0")}:${String(safeM).padStart(2, "0")} - ${end}`;
}

function toRowSlots(slots = []) {
  return slots
    .filter(Boolean)
    .map((s) => {
      const [h, m] = String(s).split(":").map(Number);
      const endHour = Math.min((Number.isFinite(h) ? h : 0) + 1, 23);
      const end = `${String(endHour).padStart(2, "0")}:${String(Number.isFinite(m) ? m : 0).padStart(2, "0")}`;
      return `${s} - ${end}`;
    });
}

function toStartSlots(rangeSlots = []) {
  return rangeSlots
    .map((s) => String(s).split("-")[0]?.trim())
    .filter((v) => /^\d{2}:\d{2}$/.test(v));
}

function AvailabilityModal({ onClose, availability, onSaved }) {
  const [workingHours, setWorkingHours] = useState(() => {
    const hasData = availability && Array.isArray(availability.recurringSchedule);
    const recurring = hasData ? availability.recurringSchedule : [];
    
    const rows = recurring
      .filter((r) => Number.isFinite(Number(r?.dayOfWeek)))
      .map((r) => ({
        dayOfWeek: Number(r.dayOfWeek),
        day: DAY_ROWS.find((d) => d.key === Number(r.dayOfWeek))?.label || `Thứ ${Number(r.dayOfWeek) + 2}`,
        slots: toRowSlots(Array.isArray(r.slots) ? r.slots : []),
      }));

    if (rows.length > 0) return rows.sort((a, b) => a.dayOfWeek - b.dayOfWeek);

    return [];
  });
  const [saving, setSaving] = useState(false);
  const [newSlotDay, setNewSlotDay] = useState(0);
  const [newSlotRange, setNewSlotRange] = useState(toOneHourRange("09:00"));

  const addSlot = (dayOfWeek, value) => {
    const [h, m] = value.split(":").map(Number);
    const end = `${String(Math.min(h + 1, 23)).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    const range = `${value} - ${end}`;
    setWorkingHours((prev) =>
      (prev.some((row) => row.dayOfWeek === dayOfWeek)
        ? prev.map((row) => {
            if (row.dayOfWeek !== dayOfWeek) return row;
            if (row.slots.includes(range)) return row;
            const nextSlots = [...row.slots, range].sort((a, b) => a.localeCompare(b));
            return { ...row, slots: nextSlots };
          })
        : [
            ...prev,
            {
              dayOfWeek,
              day: DAY_ROWS.find((d) => d.key === dayOfWeek)?.label || "Thứ 2",
              slots: [range],
            },
          ])
        .sort((a, b) => a.dayOfWeek - b.dayOfWeek),
    );
  };

  const removeSlot = (dayOfWeek, slot) => {
    setWorkingHours((prev) =>
      prev
        .map((row) => (row.dayOfWeek === dayOfWeek ? { ...row, slots: row.slots.filter((s) => s !== slot) } : row))
        .sort((a, b) => a.dayOfWeek - b.dayOfWeek),
    );
  };

  const handleSave = async () => {
    setSaving(true);
    const recurringSchedule = workingHours
      .map((row) => ({ dayOfWeek: row.dayOfWeek, slots: toStartSlots(row.slots) }))
      .filter((row) => row.slots.length > 0)
      .sort((a, b) => a.dayOfWeek - b.dayOfWeek);
    try {
      const result = await updateMyMentorAvailability({ recurringSchedule });
      if (!result.success) {
        toastApiError(result.error, "Không lưu được lịch rảnh.");
        return;
      }
      toastApiSuccess("Đã lưu lịch rảnh.");
      onSaved?.(result.availability);
      onClose();
    } catch {
      toastApiError("Lỗi kết nối khi lưu lịch rảnh.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-sm bg-slate-900/35"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 30 }}
        className="glass-card w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-8 border-b border-slate-200 flex items-center justify-between bg-slate-50">
           <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tighter">Cài đặt Thời gian rảnh</h2>
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mt-1 text-violet-700">Quản lý lịch làm việc định kỳ hàng tuần</p>
           </div>
           <button onClick={onClose} className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-zinc-500 hover:text-slate-900 transition-all">
              <X size={18} />
           </button>
        </div>

        <div className="p-8 overflow-y-auto space-y-8 custom-scrollbar">
           <div className="p-6 rounded-3xl bg-primary-fixed/5 border border-primary-fixed/10 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary-fixed/20 flex items-center justify-center text-violet-700">
                 <Globe size={20} />
              </div>
              <div>
                 <p className="text-xs font-black text-slate-900 uppercase tracking-widest">Múi giờ hệ thống</p>
                 <p className="text-xs font-medium text-zinc-500">(GMT+07:00) Asia/Ho_Chi_Minh</p>
              </div>
           </div>

           <div className="space-y-4">
              {workingHours.map((row, idx) => (
                <div key={idx} className="p-6 rounded-[32px] bg-slate-50 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-6 group">
                   <div className="w-24 shrink-0">
                      <p className="text-sm font-black text-slate-900 group-hover:text-violet-700 transition-colors">{row.day}</p>
                   </div>
                    <div className="flex-1 flex flex-wrap gap-2">
                       {row.slots.map((s, i) => (
                         <div key={i} className="group/item relative px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-3 transition-all hover:border-red-200 hover:bg-red-50/30">
                            <span className="group-hover/item:text-slate-900 transition-colors">{s}</span>
                            <button 
                               onClick={() => removeSlot(row.dayOfWeek, s)}
                               className="p-1 rounded-md hover:bg-red-500/10 text-zinc-400 hover:text-red-600 transition-all flex items-center justify-center"
                               title="Xóa khung giờ này"
                            >
                               <X size={14} />
                            </button>
                         </div>
                       ))}
                       {row.slots.length === 0 && (
                          <p className="text-[10px] italic text-zinc-400 font-medium py-2">Chưa có khung giờ nào cho ngày này.</p>
                       )}
                    </div>
                </div>
              ))}

               <div className="mt-8 p-6 rounded-[32px] bg-slate-50/50 border-2 border-dashed border-slate-200">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 text-center">Thêm khung giờ mới</p>
                  <div className="flex flex-col md:flex-row items-center gap-4">
                     <div className="flex-1 w-full grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                           <p className="text-[9px] font-black text-violet-600 uppercase tracking-widest ml-3">Ngày trong tuần</p>
                           <select
                              value={newSlotDay}
                              onChange={(e) => setNewSlotDay(Number(e.target.value))}
                              className="w-full px-5 py-3 rounded-2xl bg-white border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-500/5 transition-all"
                           >
                              {DAY_ROWS.map((d) => (
                                 <option key={d.key} value={d.key}>{d.label}</option>
                              ))}
                           </select>
                        </div>
                        <div className="space-y-1.5">
                           <p className="text-[9px] font-black text-violet-600 uppercase tracking-widest ml-3">Bắt đầu từ</p>
                           <select
                              value={newSlotRange}
                              onChange={(e) => setNewSlotRange(e.target.value)}
                              className="w-full px-5 py-3 rounded-2xl bg-white border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-500/5 transition-all"
                           >
                              {SLOT_OPTIONS.map((start) => {
                                 const range = toOneHourRange(start);
                                 return (
                                    <option key={range} value={range}>{range}</option>
                                 )
                              })}
                           </select>
                        </div>
                     </div>
                     <div className="md:pt-5 w-full md:w-auto">
                        <button
                           onClick={() => addSlot(newSlotDay, String(newSlotRange).split("-")[0].trim())}
                           className="w-full md:w-auto px-8 py-3.5 rounded-2xl bg-violet-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-violet-700 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-violet-200 flex items-center justify-center gap-2"
                        >
                           <Plus size={14} /> Thêm vào lịch
                        </button>
                     </div>
                  </div>
               </div>
           </div>
        </div>

        <div className="p-6 border-t border-slate-200 bg-slate-100 flex items-center justify-between">
           <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest px-4">Lưu ý: Thay đổi sẽ áp dụng từ tuần kế tiếp</p>
           <div className="flex gap-4">
              <button onClick={onClose} className="px-8 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-slate-900 transition-all">Hủy</button>
              <button disabled={saving} onClick={handleSave} className="px-8 py-3 rounded-2xl bg-primary-fixed text-black text-[10px] font-black uppercase tracking-widest shadow-xl disabled:opacity-60">
                {saving ? "Đang lưu..." : "Lưu cấu hình"}
              </button>
           </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Main Schedule Component ────────────────────────────────────────── */
export function MentorSchedule() {
  const navigate = useNavigate();
  const user = getUser();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAvailability, setShowAvailability] = useState(false);
  const [mentorMeetings, setMentorMeetings] = useState([]);
  const [availability, setAvailability] = useState(null);

  useEffect(() => {
    if (!user || user.role !== "mentor") {
      navigate("/");
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      const result = await listMentorBookings();
      if (!active) return;
      if (!result.success) {
        toastApiError(result.error, "Không tải được lịch hẹn mentor.");
        return;
      }
      const rows = Array.isArray(result.bookings) ? result.bookings : [];
      setMentorMeetings(rows.map(toMeetingItem));
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      const mentorLookupId = user?.id || user?._id;
      if (!mentorLookupId) return;
      try {
        const data = await fetchMentorAvailability(mentorLookupId);
        if (!active) return;
        if (data) setAvailability(data);
      } catch {
        if (active) toastApiError("Lỗi kết nối khi tải lịch trống.");
      }
    })();
    return () => {
      active = false;
    };
  }, [user?.id, user?._id]);

  useEffect(() => {
    if (!mentorMeetings.length) return;
    const activeStatuses = new Set(["pending", "confirmed", "in_progress"]);
    const activeRows = mentorMeetings.filter((m) => activeStatuses.has(String(m.status || "").toLowerCase()));
    const rows = activeRows.length ? activeRows : mentorMeetings;

    const sortedDates = rows
      .map((m) => parseBookingDate(m.date || m.scheduledDate))
      .filter(Boolean)
      .sort((a, b) => a.getTime() - b.getTime());
    if (!sortedDates.length) return;

    const now = new Date();
    const next = sortedDates.find((d) => d.getTime() >= new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) || sortedDates[0];
    setSelectedDate((prev) => {
      if (prev.toDateString() === next.toDateString()) return prev;
      return next;
    });
    setCurrentDate((prev) => {
      if (prev.getMonth() === next.getMonth() && prev.getFullYear() === next.getFullYear()) return prev;
      return new Date(next.getFullYear(), next.getMonth(), 1);
    });
  }, [mentorMeetings]);

  if (!user || user.role !== "mentor") return null;

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const daysInMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
  const firstDayOfMonth = (getFirstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth()) + 6) % 7; // ISO week start

  const prevMonthDays = Array.from({ length: firstDayOfMonth }, (_, i) => {
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), -firstDayOfMonth + i + 1);
    return { date: d, currentMonth: false };
  });

  const currentMonthDays = Array.from({ length: daysInMonth }, (_, i) => {
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), i + 1);
    return { date: d, currentMonth: true };
  });

  const calendarDays = [...prevMonthDays, ...currentMonthDays];
  const totalCells = Math.ceil(calendarDays.length / 7) * 7;
  const paddingDays = Array.from({ length: totalCells - calendarDays.length }, (_, i) => {
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, i + 1);
    return { date: d, currentMonth: false };
  });

  const finalDays = [...calendarDays, ...paddingDays];
  const activeStatuses = new Set(["pending", "confirmed", "in_progress"]);
  const sourceMeetings = mentorMeetings;
  const selectedDayMeetings = sourceMeetings.filter((m) => bookingOnDate(m.date, selectedDate) || bookingOnDate(m.scheduledDate, selectedDate));

  return (
    <MentorPageShell bottomPad="pb-32" extraStyles={MENTOR_SCHEDULE_EXTRA_CSS}>
      <div className="relative z-10 mx-auto max-w-7xl px-10 pb-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-10 mb-16">
          <div>
            <h1 className="mb-3 font-headline text-2xl font-black uppercase tracking-tight text-slate-900 sm:text-3xl">
               Lịch trình <span className="text-violet-700 tracking-tighter">Hệ thống</span>
            </h1>
            <p className="text-zinc-500 text-sm font-medium">Bố trí thời gian rảnh và quản lý các buổi hẹn mentor</p>
          </div>
          <div className="flex gap-4">
            <button onClick={() => setShowAvailability(true)} className="px-8 py-4 rounded-3xl bg-secondary text-black text-xs font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl flex items-center gap-2">
              <Clock size={16} /> Cài đặt làm việc
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-10 items-start">
           {/* Calendar Glass UI */}
           <div className="lg:col-span-12 xl:col-span-7 glass-card p-10">
              <div className="flex items-center justify-between mb-10">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-violet-700">
                       <CalendarIcon size={22} />
                    </div>
                    <div>
                       <h3 className="text-2xl font-black text-slate-900 tracking-tighter italic">
                          {currentDate.toLocaleDateString("vi-VN", { month: "long", year: "numeric" })}
                       </h3>
                       <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Lịch trình khả dụng</p>
                    </div>
                 </div>
                 <div className="flex gap-2">
                    <button onClick={() => setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))} className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-zinc-500 hover:text-slate-900 transition-all"><ChevronLeft size={18} /></button>
                    <button onClick={() => setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))} className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-zinc-500 hover:text-slate-900 transition-all"><ChevronRight size={18} /></button>
                 </div>
              </div>

              <div className="grid grid-cols-7 gap-4 mb-4">
                 {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map(d => (
                   <div key={d} className="text-center text-[10px] font-black text-zinc-600 uppercase tracking-widest py-4">{d}</div>
                 ))}
                 {finalDays.map((cell, i) => {
                   const isSelected = selectedDate.toDateString() === cell.date.toDateString();
                   const isToday = new Date().toDateString() === cell.date.toDateString();
                   const hasMeetings = sourceMeetings.some((m) => bookingOnDate(m.date, cell.date) || bookingOnDate(m.scheduledDate, cell.date));
                   return (
                     <div 
                        key={i} 
                        onClick={() => setSelectedDate(cell.date)}
                        className={`calendar-cell ${isSelected ? 'active' : ''} ${cell.currentMonth ? 'text-slate-900' : 'text-zinc-700 opacity-30'} ${hasMeetings ? 'dot' : ''}`}
                     >
                        <span className="text-xs">{cell.date.getDate()}</span>
                        {isToday && !isSelected && <div className="absolute top-2 right-2 w-1 h-1 rounded-full bg-primary-fixed" />}
                     </div>
                   );
                 })}
              </div>
              <div className="mt-10 border-t border-slate-200 flex items-center gap-8 justify-center sm:justify-start">
                 <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                    <div className="w-3 h-3 rounded-full bg-primary-fixed" /> Hôm nay
                 </div>
                 <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                    <div className="w-3 h-3 rounded-full bg-[#8037f4]" /> Có lịch hẹn
                 </div>
              </div>
           </div>

           {/* Daily Schedule Stack */}
           <div className="lg:col-span-12 xl:col-span-5 space-y-8">
              <div className="glass-card p-10 h-full">
                 <div className="flex items-center justify-between mb-8">
                    <h4 className="text-lg font-black text-slate-900 uppercase tracking-tighter">Ngày {selectedDate.getDate()} thg {selectedDate.getMonth() + 1}</h4>
                    <button className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-violet-700 hover:bg-slate-100 transition-all"><Plus size={18} /></button>
                 </div>

                 <div className="space-y-4">
                    {selectedDayMeetings.map((meeting, i) => (
                      <div
                         key={meeting.id || i}
                         onClick={() => meeting.id && navigate(`/mentor/meeting-detail/${meeting.id}`)}
                         className="group relative p-6 rounded-[32px] bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-all cursor-pointer overflow-hidden"
                      >
                         <div className="absolute top-0 left-0 w-1.5 h-full bg-primary-fixed scale-y-0 group-hover:scale-y-100 transition-transform origin-top" />
                         <div className="flex items-center gap-4 mb-4">
                            <img src={meeting.mentee.avatar} className="w-10 h-10 rounded-2xl object-cover ring-2 ring-white/5" />
                            <div>
                               <p className="text-sm font-black text-slate-900">{meeting.mentee.name}</p>
                               <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">{meeting.position}</p>
                            </div>
                         </div>
                         <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 text-xs font-black text-violet-700 uppercase tracking-widest">
                               <Clock3 size={14} /> {meeting.scheduledTime}
                            </div>
                            <span
                              className={`text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-widest ${
                                String(meeting.status || "").toLowerCase() === "confirmed"
                                  ? "bg-emerald-500/20 text-emerald-300"
                                  : String(meeting.status || "").toLowerCase() === "pending"
                                    ? "bg-amber-500/20 text-amber-300"
                                    : String(meeting.status || "").toLowerCase() === "completed"
                                      ? "bg-sky-500/20 text-sky-300"
                                      : String(meeting.status || "").toLowerCase() === "cancelled"
                                        ? "bg-red-500/20 text-red-300"
                                        : "bg-slate-50 text-zinc-500"
                              }`}
                            >
                              {meeting.status || "online"}
                            </span>
                         </div>
                      </div>
                    ))}
                    {selectedDayMeetings.length === 0 && (
                      <div className="p-6 rounded-[32px] border border-slate-200 flex flex-col items-center justify-center text-zinc-500 min-h-[120px]">
                        <p className="text-[10px] font-black uppercase tracking-widest">Không có lịch hẹn trong ngày này</p>
                      </div>
                    )}
                    <div className="p-6 rounded-[32px] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-zinc-700 hover:border-slate-200 hover:text-zinc-500 transition-all cursor-pointer min-h-[140px]">
                       <PlusCircle size={32} className="mb-2 opacity-20" />
                       <p className="text-[10px] font-black uppercase tracking-widest">Thêm slot trống mới</p>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </div>

      <AnimatePresence>
        {showAvailability && (
          <AvailabilityModal
            availability={availability}
            onSaved={setAvailability}
            onClose={() => setShowAvailability(false)}
          />
        )}
      </AnimatePresence>
    </MentorPageShell>
  );
}