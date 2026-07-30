import React, { useMemo, useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import {
  Calendar as CalendarBlank,
  Clock,
  Upload as UploadSimple,
  FileText,
  ChevronRight as CaretRight,
  Video as VideoCamera,
  Bell,
  ShieldCheck,
  Info,
  Timer,
  Sun,
  Coffee,
  Moon,
  RotateCcw as ArrowsClockwise,
  Sparkles as Sparkle,
  X,
} from "lucide-react";
import { fetchMentor, fetchMentorAvailability } from "../../utils/mentorApi";
import { isBookingSlotInFuture } from "../../utils/bookingSchedule";
import { fetchBookedSlots, fetchRebookCredit } from "../../utils/bookingsApi";
import { toastApiError, toastApiSuccess } from "../../utils/apiToast";
import { uploadFile } from "../../utils/uploadApi";
import { getSuggestedBookingDataAsync, saveUploadedCV, saveUploadedJD } from "../../utils/history";
import { fetchReusableBookingDocs } from "../../utils/bookingDocuments";
import { MentorPageShell } from "../../components/mentor/MentorPageShell";
import { BookingStepBar } from "../../components/booking/BookingStepBar";
import { BookingDocumentField } from "../../components/booking/BookingDocumentField";
import { CUSTOMER_SHELL_GUTTER, CUSTOMER_SHELL_MAX } from "../../components/layout/customerShellLayout";
import { BookingPolicySummary } from "../../components/booking/BookingPolicySummary";
import { BRAND_CTA_LIME_STYLE } from "../../constants/brandColors";
import { avatarSrc } from "../../utils/mediaUrl";
import { getPlans } from "../../utils/auth";

const VI_DAY_SHORT = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const VI_DAY_FULL = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];

function pad2(n) {
  return String(n).padStart(2, "0");
}

function toDateOnly(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function formatDDMM(d) {
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`;
}

function formatDDMMYYYY(d) {
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function startOfIsoWeek(d) {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date;
}

function buildWeek(start, title, now) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const dateObj = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const dateOnly = toDateOnly(dateObj);
    const nowOnly = toDateOnly(now);
    const isPast = dateOnly < nowOnly;
    const dateDDMM = formatDDMM(dateObj);
    const dateKey = formatDDMMYYYY(dateObj);
    return {
      day: VI_DAY_SHORT[dateObj.getDay()],
      dateObj,
      date: dateDDMM,
      dateKey,
      full: `${VI_DAY_FULL[dateObj.getDay()]}, ${dateKey}`,
      available: !isPast,
      isPast,
    };
  });
  const from = formatDDMM(days[0].dateObj);
  const to = formatDDMM(days[6].dateObj);
  return { label: `${title} · ${from} – ${to}`, days };
}

const TIME_GROUPS = [
  { label: "Buổi sáng", icon: Sun, slots: ["08:00", "09:00", "10:00", "11:00"] },
  { label: "Buổi chiều", icon: Coffee, slots: ["14:00", "15:00", "16:00", "17:00"] },
  { label: "Buổi tối", icon: Moon, slots: ["19:00", "20:00", "21:00"] },
];



export function Booking() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const rebookFrom =
    searchParams.get("rebookFrom") ||
    (typeof sessionStorage !== "undefined" ? sessionStorage.getItem("prointerview_rebook_from") : "") ||
    "";
  const [rebookCredit, setRebookCredit] = useState(null);
  const [mentor, setMentor] = useState(null);
  const [mentorLoading, setMentorLoading] = useState(true);
  const [bookedSlots, setBookedSlots] = useState({});
  const [mentorAvailability, setMentorAvailability] = useState(null);

  useEffect(() => {
    if (!id) {
      setMentor(null);
      setMentorLoading(false);
      return;
    }
    setMentorLoading(true);

    (async () => {
      try {
        const [m, slotsRes, availability] = await Promise.all([
          fetchMentor(id),
          fetchBookedSlots(id),
          fetchMentorAvailability(id),
        ]);
        if (!m) {
          toastApiError("Không tải được thông tin mentor. Thử lại sau.");
        }
        setMentor(m);
        setMentorAvailability(availability);
        if (slotsRes.success) {
          setBookedSlots(slotsRes.booked);
        } else if (slotsRes.error) {
          toastApiError(slotsRes.error, "Không tải được lịch đã đặt của mentor.");
        }
      } catch {
        toastApiError("Lỗi kết nối khi tải trang đặt lịch.");
        setMentor(null);
      } finally {
        setMentorLoading(false);
      }
    })();
  }, [id]);

  const MAX_SLOTS = 5;

  const [step, setStep] = useState(1);
  const [selectedDay, setSelectedDay]     = useState(null);
  const [selectedDayFull, setSelectedDayFull] = useState(null);
  const [selectedSlots, setSelectedSlots] = useState([]); // [{dateKey, dayFull, time}]
  const [form, setForm] = useState({ position: "", note: "", jd: false, cv: false });

  const [suggestedData, setSuggestedData] = useState(null);
  const [showSmartBanner, setShowSmartBanner] = useState(false);
  const [selectedCvFile, setSelectedCvFile] = useState("");
  const [selectedCvUrl, setSelectedCvUrl] = useState("");
  const [cvUploading, setCvUploading] = useState(false);
  const [selectedJdFile, setSelectedJdFile] = useState("");
  const [selectedJdUrl, setSelectedJdUrl] = useState("");
  const [jdUploading, setJdUploading] = useState(false);
  const [cvFromHistory, setCvFromHistory] = useState(false);
  const [jdFromHistory, setJdFromHistory] = useState(false);
  const [reusableCvOptions, setReusableCvOptions] = useState([]);
  const [reusableJdOptions, setReusableJdOptions] = useState([]);
  const [reusableDocsLoading, setReusableDocsLoading] = useState(true);
  const calendarWeeks = useMemo(() => {
    const now = new Date();
    const thisWeekStart = startOfIsoWeek(now);
    const nextWeekStart = new Date(thisWeekStart.getFullYear(), thisWeekStart.getMonth(), thisWeekStart.getDate() + 7);
    return [buildWeek(thisWeekStart, "Tuần này", now), buildWeek(nextWeekStart, "Tuần sau", now)];
  }, []);

  useEffect(() => {
    void getSuggestedBookingDataAsync().then((suggested) => {
      setSuggestedData(suggested);
      if (suggested?.position) setShowSmartBanner(true);
    });
  }, []);

  // CV/JD đã upload ở các lần phân tích trước — cho phép dùng lại, không cần upload lại
  useEffect(() => {
    let alive = true;
    setReusableDocsLoading(true);
    void fetchReusableBookingDocs().then((res) => {
      if (!alive) return;
      setReusableCvOptions(res.cvOptions);
      setReusableJdOptions(res.jdOptions);
      setReusableDocsLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!rebookFrom) {
      setRebookCredit(null);
      return;
    }
    (async () => {
      try {
        const r = await fetchRebookCredit(rebookFrom);
        if (r.success && r.credit?.available) setRebookCredit(r.credit);
        else setRebookCredit(null);
      } catch {
        setRebookCredit(null);
      }
    })();
  }, [rebookFrom]);

  const handleUseSmartFill = () => {
    if (!suggestedData) return;
    const cvOption =
      reusableCvOptions.find((o) => o.name === suggestedData.cvFile) || reusableCvOptions[0] || null;
    const jdOption = suggestedData.jdFile
      ? reusableJdOptions.find((o) => o.name === suggestedData.jdFile) || reusableJdOptions[0] || null
      : null;

    setForm((prev) => ({
      ...prev,
      position: suggestedData.position || prev.position,
      cv: prev.cv || !!cvOption,
      jd: prev.jd || !!jdOption,
    }));
    if (cvOption) {
      setSelectedCvFile(cvOption.name);
      setSelectedCvUrl(cvOption.url);
      setCvFromHistory(true);
    }
    if (jdOption) {
      setSelectedJdFile(jdOption.name);
      setSelectedJdUrl(jdOption.url);
      setJdFromHistory(true);
    }
    setShowSmartBanner(false);
    if (!cvOption && suggestedData.cvFile) {
      toastApiError("Bản phân tích gần nhất không lưu file CV trên server — vui lòng tải CV lên.");
    }
  };

  const handleCvFileSelect = async (file) => {
    if (!file) return;
    setCvUploading(true);
    setCvFromHistory(false);
    setSelectedCvFile(file.name);
    setSelectedCvUrl("");
    const res = await uploadFile(file, "cv");
    setCvUploading(false);
    if (!res.success || !res.url) {
      setSelectedCvFile("");
      setForm((prev) => ({ ...prev, cv: false }));
      toastApiError(res.error, "Không tải CV lên được.");
      return;
    }
    setSelectedCvFile(res.fileName || file.name);
    setSelectedCvUrl(res.url);
    setForm((prev) => ({ ...prev, cv: true }));
    saveUploadedCV({ name: file.name, size: file.size, type: file.type });
    toastApiSuccess("Đã tải CV lên, mentor có thể mở khi xem buổi hẹn.");
  };

  const handleJdFileSelect = async (file) => {
    if (!file) return;
    setJdUploading(true);
    setJdFromHistory(false);
    setSelectedJdFile(file.name);
    setSelectedJdUrl("");
    const res = await uploadFile(file, "jd");
    setJdUploading(false);
    if (!res.success || !res.url) {
      setSelectedJdFile("");
      setForm((prev) => ({ ...prev, jd: false }));
      toastApiError(res.error, "Không tải JD lên được.");
      return;
    }
    setSelectedJdFile(res.fileName || file.name);
    setSelectedJdUrl(res.url);
    setForm((prev) => ({ ...prev, jd: true }));
    saveUploadedJD({ name: file.name, size: file.size, type: file.type });
    toastApiSuccess("Đã tải JD lên.");
  };

  const handleReuseCv = (option) => {
    setSelectedCvFile(option.name);
    setSelectedCvUrl(option.url);
    setCvFromHistory(true);
    setForm((prev) => ({ ...prev, cv: true, position: prev.position || option.position || "" }));
    toastApiSuccess("Đã dùng lại CV từ lịch sử phân tích.");
  };

  const handleReuseJd = (option) => {
    setSelectedJdFile(option.name);
    setSelectedJdUrl(option.url);
    setJdFromHistory(true);
    setForm((prev) => ({ ...prev, jd: true, position: prev.position || option.position || "" }));
    toastApiSuccess("Đã dùng lại JD từ lịch sử phân tích.");
  };

  const handleClearCv = () => {
    setSelectedCvFile("");
    setSelectedCvUrl("");
    setCvFromHistory(false);
    setForm((prev) => ({ ...prev, cv: false }));
  };

  const handleClearJd = () => {
    setSelectedJdFile("");
    setSelectedJdUrl("");
    setJdFromHistory(false);
    setForm((prev) => ({ ...prev, jd: false }));
  };

  const handleProceed = () => {
    if (!selectedCvFile || !selectedCvUrl) {
      toastApiError("Vui lòng tải CV lên server (chọn file và đợi tải xong).");
      return;
    }
    if (form.jd && selectedJdFile && !selectedJdUrl) {
      toastApiError("JD chưa tải xong, chọn lại file hoặc bỏ JD.");
      return;
    }
    const params = new URLSearchParams({
      type: "booking",
      mentorId: mentor.id,
      price: String(mentor.price),
      slots: JSON.stringify(selectedSlots),
      position: form.position,
      note: form.note,
      cvFile: selectedCvFile,
      cvFileUrl: selectedCvUrl,
      jdFile: form.jd && selectedJdFile ? selectedJdFile : "",
      jdFileUrl: form.jd && selectedJdUrl ? selectedJdUrl : "",
    });
    if (rebookFrom) params.set("rebookFrom", rebookFrom);
    navigate(`/checkout?${params.toString()}`);
  };

  const getBookedOfDay = (dayKey) => {
    if (!dayKey) return [];
    const noYear = dayKey.split("/").slice(0, 2).join("/");
    return bookedSlots[dayKey] ?? bookedSlots[noYear] ?? [];
  };

  const normalizeDateKey = (raw, fallbackYear) => {
    const s = String(raw || "").trim();
    if (!s) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const parts = s.split("/").map((p) => Number(p));
    if (parts.length >= 2 && Number.isFinite(parts[0]) && Number.isFinite(parts[1])) {
      const year = parts.length >= 3 && Number.isFinite(parts[2]) ? parts[2] : fallbackYear;
      return `${String(year).padStart(4, "0")}-${String(parts[1]).padStart(2, "0")}-${String(parts[0]).padStart(2, "0")}`;
    }
    return "";
  };

  const getMentorSlotsForDay = (day) => {
    if (!day) return TIME_GROUPS.flatMap((g) => g.slots);
    const av = mentorAvailability;
    const hasConfig = Boolean(
      av &&
        ((av.availableSlots && Object.keys(av.availableSlots).length) ||
          (Array.isArray(av.recurringSchedule) && av.recurringSchedule.length) ||
          (Array.isArray(av.blockedDates) && av.blockedDates.length)),
    );
    if (!hasConfig) return TIME_GROUPS.flatMap((g) => g.slots);

    const year = day.dateObj.getFullYear();
    const iso = `${year}-${pad2(day.dateObj.getMonth() + 1)}-${pad2(day.dateObj.getDate())}`;
    const blockedSet = new Set((av.blockedDates || []).map((d) => normalizeDateKey(d, year)).filter(Boolean));
    if (blockedSet.has(iso)) return [];

    const entries = Object.entries(av.availableSlots || {});
    const explicit = entries.find(([k]) => normalizeDateKey(k, year) === iso);
    if (explicit) {
      const slots = Array.isArray(explicit[1]) ? explicit[1].map((x) => String(x).trim()).filter(Boolean) : [];
      return slots;
    }

    const recurring = Array.isArray(av.recurringSchedule) ? av.recurringSchedule : [];
    const slotMapKeys = Object.keys(av.availableSlots || {}).length;
    // Chỉ chặn ngày (blockedDates), không có lịch cụ thể → mở khung giờ mặc định (khớp backend).
    if (!recurring.length && slotMapKeys === 0) {
      return TIME_GROUPS.flatMap((g) => g.slots);
    }
    if (!recurring.length) return [];
    const mentorDay = (day.dateObj.getDay() + 6) % 7; // Mon=0
    const row = recurring.find((r) => Number(r?.dayOfWeek) === mentorDay);
    return row && Array.isArray(row.slots) ? row.slots.map((x) => String(x).trim()).filter(Boolean) : [];
  };

  const isSlotBooked = (time) => (selectedDay ? getBookedOfDay(selectedDay).includes(time) : false);
  const isSlotPast = (time) => (selectedDay ? !isBookingSlotInFuture(selectedDay, time) : false);

  const isSlotSelected = (time) =>
    selectedDay ? selectedSlots.some((s) => s.dateKey === selectedDay && s.time === time) : false;

  const toggleSlot = (time) => {
    if (!selectedDay || !selectedDayFull) return;
    const alreadySelected = selectedSlots.some((s) => s.dateKey === selectedDay && s.time === time);
    if (alreadySelected) {
      setSelectedSlots((prev) => prev.filter((s) => !(s.dateKey === selectedDay && s.time === time)));
    } else {
      if (selectedSlots.length >= MAX_SLOTS) {
        toastApiError(`Tối đa ${MAX_SLOTS} buổi mỗi lần đặt lịch.`);
        return;
      }
      setSelectedSlots((prev) => [...prev, { dateKey: selectedDay, dayFull: selectedDayFull, time }]);
    }
  };

  const removeSlot = (dateKey, time) => {
    setSelectedSlots((prev) => prev.filter((s) => !(s.dateKey === dateKey && s.time === time)));
  };

  const availableSlotCount = selectedDay
    ? (() => {
        const selectedObj = calendarWeeks.flatMap((w) => w.days).find((d) => d.dateKey === selectedDay);
        const allowed = getMentorSlotsForDay(selectedObj);
        return allowed.filter((t) => !isSlotBooked(t) && !isSlotPast(t)).length;
      })()
    : 0;

  const totalSlotCount = selectedSlots.length;
  const totalPrice = (mentor?.price || 0) * Math.max(0, totalSlotCount);
  /* Ưu đãi Sinh Viên/Chuyên Nghiệp (-5%/-10%) — ước tính hiển thị theo gói hiện tại, số tiền thật chốt ở /checkout. */
  const plans = getPlans();
  const planDiscountRate = plans.professional ? 0.1 : plans.student ? 0.05 : 0;
  const planLabel = plans.professional ? "Chuyên Nghiệp" : plans.student ? "Sinh Viên" : "";
  const headerPlanDiscountAmount =
    mentor?.price > 0 && planDiscountRate > 0 ? Math.round(mentor.price * planDiscountRate) : 0;
  const planDiscountAmount = totalPrice > 0 && planDiscountRate > 0 ? Math.round(totalPrice * planDiscountRate) : 0;
  const finalTotalPrice = totalPrice - planDiscountAmount;

  const fieldClass =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-[#8037f4]/45 focus:outline-none focus:ring-2 focus:ring-[#8037f4]/15";

  if (mentorLoading) {
    return (
      <MentorPageShell bottomPad="pb-32">
        <div className={`relative z-10 flex min-h-[50vh] items-center justify-center pb-8 pt-8 sm:pt-10 ${CUSTOMER_SHELL_GUTTER}`}>
          <div className={`${CUSTOMER_SHELL_MAX} w-full text-center text-sm font-medium text-slate-600`}>
            Đang tải thông tin mentor…
          </div>
        </div>
      </MentorPageShell>
    );
  }

  if (!mentor) {
    return (
      <MentorPageShell bottomPad="pb-32">
        <div className={`relative z-10 flex min-h-[50vh] flex-col items-center justify-center gap-4 pb-8 pt-8 text-center text-slate-600 sm:pt-10 ${CUSTOMER_SHELL_GUTTER}`}>
          <div className={`${CUSTOMER_SHELL_MAX} flex w-full flex-col items-center gap-4`}>
          <p>Không tìm thấy mentor hoặc mentor chưa mở nhận booking.</p>
          <button
            type="button"
            onClick={() => navigate("/mentors")}
            className="rounded-full bg-[#93f72b] px-6 py-2 text-sm font-bold text-slate-900 shadow-sm transition hover:brightness-95"
          >
            Về danh sách mentor
          </button>
          </div>
        </div>
      </MentorPageShell>
    );
  }

  return (
    <MentorPageShell bottomPad="pb-32">
      <div className={`relative z-10 pb-8 pt-8 sm:pt-10 ${CUSTOMER_SHELL_GUTTER}`}>
        <div
          className={`${CUSTOMER_SHELL_MAX} w-full font-sans text-slate-900 antialiased selection:bg-[rgba(122,35,229,0.18)] selection:text-slate-900`}
        >
        <BookingStepBar current={step} />

        {step === 1 ? (
        <div className="mb-6 flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <img
            src={avatarSrc(mentor.avatar)}
            alt={mentor.name}
            className="h-12 w-12 flex-shrink-0 rounded-xl object-cover ring-1 ring-slate-200"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = avatarSrc("");
            }}
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-900">{mentor.name}</p>
            <p className="truncate text-xs text-slate-600">
              {mentor.title} · {mentor.company}
            </p>
          </div>
          <div className="ml-auto flex-shrink-0 text-right">
            <p className="flex items-center justify-end gap-1.5">
              {headerPlanDiscountAmount > 0 && (
                <span className="rounded-full bg-emerald-600 px-1.5 py-0.5 text-[9px] font-bold text-white">
                  -{Math.round(planDiscountRate * 100)}% {planLabel}
                </span>
              )}
              <span className="text-lg font-black text-[#3d5200]">
                {(mentor.price - headerPlanDiscountAmount).toLocaleString("vi")}đ
              </span>
            </p>
            {headerPlanDiscountAmount > 0 && (
              <p className="text-xs text-slate-400 line-through">{mentor.price.toLocaleString("vi")}đ</p>
            )}
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">/ 60 phút</p>
          </div>
        </div>
        ) : null}

        {step === 1 && (
          <div className="space-y-4">
            <div className="glass-card overflow-hidden">
              <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-50/90 px-5 py-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100">
                  <CalendarBlank className="h-4 w-4 text-[#8037f4]" strokeWidth={2} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Chọn ngày phỏng vấn</p>
                  <p className="text-xs text-slate-500">Lịch trống của {mentor.name}, theo thời gian hiện tại</p>
                </div>
              </div>
              <div className="space-y-5 p-5">
                {calendarWeeks.map((week) => (
                  <div key={week.label}>
                    <p className="mb-3 text-[10px] font-black uppercase tracking-wide text-slate-500">{week.label}</p>
                    <div className="grid grid-cols-7 gap-2">
                      {week.days.map((d) => {
                        const isSelected = selectedDay === d.dateKey;
                        const mentorSlots = getMentorSlotsForDay(d);
                        const freeSlots = mentorSlots.filter((t) => !getBookedOfDay(d.dateKey).includes(t)).length;
                        const canBookDay = d.available && freeSlots > 0;
                        return (
                          <button
                            key={d.dateKey}
                            type="button"
                            disabled={!canBookDay}
                            onClick={() => {
                              setSelectedDay(d.dateKey);
                              setSelectedDayFull(d.full);
                            }}
                            className={`flex flex-col items-center rounded-xl py-3 transition-all ${
                              isSelected
                                ? "bg-gradient-to-br from-[#8037f4] to-[#a66ff8] text-white shadow-[0_8px_24px_rgba(128,55,244,0.35)]"
                                : canBookDay
                                  ? "border border-slate-200 bg-white text-slate-900 shadow-sm hover:border-violet-300 hover:shadow-md"
                                  : "cursor-not-allowed border border-slate-100 bg-slate-50 opacity-45"
                            }`}
                          >
                            <span
                              className={`mb-1 text-xs font-semibold ${
                                isSelected ? "text-white/80" : canBookDay ? "text-slate-500" : "text-slate-400"
                              }`}
                            >
                              {d.day}
                            </span>
                            <span className={`text-[0.95rem] font-black ${isSelected ? "text-white" : canBookDay ? "text-slate-900" : "text-slate-400"}`}>
                              {d.date.split("/")[0]}
                            </span>
                            {canBookDay && (
                              <span
                                className={`mt-1 rounded-full px-1.5 text-[0.6rem] font-bold ${
                                  isSelected
                                    ? "bg-white/20 text-white"
                                    : freeSlots <= 3
                                      ? "bg-orange-100 text-orange-800"
                                      : "bg-lime-100 text-[#2f4200]"
                                }`}
                              >
                                {freeSlots} chỗ
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
                <div className="flex flex-wrap items-center gap-4 border-t border-slate-200 pt-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-[#8037f4] to-[#a66ff8]" />
                    Đã chọn
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full border border-slate-300 bg-white" />
                    Còn chỗ
                  </span>
                  <span className="flex items-center gap-1.5 text-orange-700">
                    <span className="h-2.5 w-2.5 rounded-full bg-orange-400" />
                    Còn ít chỗ
                  </span>
                </div>
              </div>
            </div>

            {selectedDay ? (
              <div className="glass-card overflow-hidden">
                <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-50/90 px-5 py-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100">
                    <Clock className="h-4 w-4 text-[#8037f4]" strokeWidth={2} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900">Chọn khung giờ</p>
                    <p className="truncate text-xs text-slate-500">
                      {selectedDayFull} · {availableSlotCount} khung giờ trống
                    </p>
                  </div>
                  <div className="ml-auto flex flex-shrink-0 items-center gap-1.5 rounded-full border border-lime-300 bg-lime-50 px-3 py-1.5 text-[11px] font-bold text-[#2f4200]">
                    <Timer className="h-3.5 w-3.5" />
                    60 phút / buổi
                  </div>
                </div>
                <div className="space-y-5 p-5">
                  {TIME_GROUPS.map((group) => (
                    <div key={group.label}>
                      <div className="mb-3 flex items-center gap-2">
                        <group.icon className="h-3.5 w-3.5 text-slate-500" />
                        <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">{group.label}</p>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {group.slots
                          .filter((time) => {
                            const selectedObj = calendarWeeks.flatMap((w) => w.days).find((d) => d.dateKey === selectedDay);
                            const allowed = getMentorSlotsForDay(selectedObj);
                            return allowed.includes(time);
                          })
                          .map((time) => {
                          const booked = isSlotBooked(time);
                          const inPast = isSlotPast(time);
                          const disabled = booked || inPast;
                          const selected = isSlotSelected(time);
                          const slotOrder = selected
                            ? selectedSlots.findIndex((s) => s.dateKey === selectedDay && s.time === time) + 1
                            : null;
                          return (
                            <button
                              key={time}
                              type="button"
                              disabled={disabled}
                              onClick={() => toggleSlot(time)}
                              className={`relative rounded-xl py-3 text-sm font-bold transition-all ${
                                selected
                                  ? "bg-gradient-to-br from-[#8037f4] to-[#a66ff8] text-white shadow-[0_6px_20px_rgba(128,55,244,0.35)]"
                                  : disabled
                                    ? "cursor-not-allowed border border-slate-100 bg-slate-50 text-slate-400"
                                    : "border border-slate-200 bg-white text-slate-900 shadow-sm hover:border-violet-300 hover:text-[#8037f4]"
                              }`}
                            >
                              {time}
                              {selected && slotOrder && (
                                <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#93f72b] text-[0.55rem] font-black text-slate-900 shadow">
                                  {slotOrder}
                                </span>
                              )}
                              {booked && (
                                <span className="absolute -right-1 -top-1 rounded-full bg-slate-200 px-1 text-[0.55rem] font-bold text-slate-600">
                                  Hết
                                </span>
                              )}
                              {inPast && !booked && (
                                <span className="absolute -right-1 -top-1 rounded-full bg-slate-200 px-1 text-[0.55rem] font-bold text-slate-600">
                                  Qua giờ
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {selectedSlots.length > 0 && (
                    <div className="mt-2 rounded-xl border border-violet-200 bg-violet-50 p-4">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-sm font-bold text-slate-900">
                          Đã chọn {selectedSlots.length}/{MAX_SLOTS} buổi
                        </p>
                        <div className="flex flex-col items-end gap-0.5">
                          {planDiscountAmount > 0 && (
                            <span className="text-[10px] font-medium text-slate-400 line-through">
                              {totalPrice.toLocaleString("vi")}đ
                            </span>
                          )}
                          <span className="flex items-center gap-1 rounded-full bg-[#8037f4] px-2.5 py-0.5 text-[11px] font-black text-white">
                            {planDiscountAmount > 0 && (
                              <span className="rounded-full bg-emerald-500 px-1 text-[9px] font-bold">
                                -{Math.round(planDiscountRate * 100)}%
                              </span>
                            )}
                            {finalTotalPrice.toLocaleString("vi")}đ
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {selectedSlots.map((s, i) => (
                          <div
                            key={`${s.dateKey}_${s.time}`}
                            className="flex items-center gap-1.5 rounded-full border border-violet-300 bg-white px-3 py-1.5 text-xs font-semibold text-violet-900"
                          >
                            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#8037f4] text-[0.6rem] font-black text-white">
                              {i + 1}
                            </span>
                            <span>{s.dayFull} · {s.time}</span>
                            <button
                              type="button"
                              onClick={() => removeSlot(s.dateKey, s.time)}
                              className="text-violet-400 hover:text-violet-900"
                              aria-label="Bỏ slot này"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                      {selectedSlots.length < MAX_SLOTS && (
                        <p className="mt-2 text-[11px] text-violet-600">
                          Nhấn thêm vào khung giờ khác để chọn thêm buổi
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex items-start gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
                    <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
                    <span>
                      Múi giờ: <strong className="text-slate-700">Việt Nam (UTC+7)</strong> · Khung giờ được giữ trong 15 phút sau khi tiếp tục.
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
                <Clock className="h-5 w-5 flex-shrink-0 text-slate-400" />
                <p>Chọn ngày để xem các khung giờ trống khả dụng</p>
              </div>
            )}

            <button
              type="button"
              disabled={selectedSlots.length === 0}
              onClick={() => setStep(2)}
              className={`flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-black uppercase tracking-wide transition-all active:scale-[0.98] ${
                selectedSlots.length > 0
                  ? "bg-gradient-to-br from-[#8037f4] to-[#a66ff8] text-white shadow-[0_8px_28px_rgba(128,55,244,0.35)] hover:shadow-[0_12px_36px_rgba(128,55,244,0.45)]"
                  : "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400"
              }`}
            >
              {selectedSlots.length > 0 ? (
                <>
                  Tiếp tục · {selectedSlots.length} buổi · {finalTotalPrice.toLocaleString("vi")}đ
                  <CaretRight className="h-4 w-4" />
                </>
              ) : (
                "Vui lòng chọn ít nhất 1 khung giờ"
              )}
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            {showSmartBanner && suggestedData && (
              <div className="flex items-start gap-3 rounded-2xl border border-lime-200 bg-gradient-to-br from-lime-50 to-violet-50 p-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-lime-100">
                  <Sparkle className="h-5 w-5 text-[#4d6600]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="mb-1 text-sm font-bold text-[#2f4200]">Tự động điền từ phân tích CV/JD gần nhất</p>
                  <p className="mb-2 text-xs text-slate-600">
                    Đã phân tích <span className="font-bold text-slate-900">{suggestedData.position}</span>. Điền nhanh để tiết kiệm thời gian?
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleUseSmartFill}
                      className="rounded-lg bg-gradient-to-br from-[#8037f4] to-[#a66ff8] px-4 py-1.5 text-xs font-black text-white shadow-lg"
                    >
                      Dùng ngay
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowSmartBanner(false)}
                      className="rounded-lg px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-white hover:text-slate-900"
                    >
                      Bỏ qua
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSmartBanner(false)}
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                  aria-label="Đóng"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
              <div className="glass-card space-y-5 p-5 lg:col-span-7 xl:col-span-8">
                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-wide text-slate-500">
                    Vị trí đang ứng tuyển <span className="text-[#4d6600]">*</span>
                  </label>
                  <input
                    className={fieldClass}
                    placeholder="Ví dụ: Frontend Developer tại Shopee"
                    value={form.position}
                    onChange={(e) => setForm({ ...form, position: e.target.value })}
                  />
                </div>

                <BookingDocumentField
                  label="Tải lên CV"
                  hint="bắt buộc"
                  icon={FileText}
                  emptyTitle="Nhấn để tải lên CV"
                  emptySubtitle="PDF, DOC (tối đa 5MB)"
                  uploadingText="Đang tải CV lên server…"
                  selectedText="Mentor sẽ mở được file sau khi đặt lịch"
                  reuseLabel="Hoặc dùng lại CV đã phân tích"
                  fileName={form.cv ? selectedCvFile : ""}
                  fileUrl={selectedCvUrl}
                  fromHistory={cvFromHistory}
                  uploading={cvUploading}
                  options={reusableCvOptions}
                  optionsLoading={reusableDocsLoading}
                  onFileSelect={handleCvFileSelect}
                  onPickOption={handleReuseCv}
                  onClear={handleClearCv}
                />

                <BookingDocumentField
                  label="Tải lên JD"
                  hint="khuyến khích"
                  icon={UploadSimple}
                  emptyTitle="Nhấn để tải lên JD"
                  emptySubtitle="Giúp mentor chuẩn bị câu hỏi phù hợp hơn"
                  uploadingText="Đang tải JD lên server…"
                  selectedText="Mentor sẽ mở được file sau khi đặt lịch"
                  reuseLabel="Hoặc dùng lại JD đã phân tích"
                  fileName={form.jd ? selectedJdFile : ""}
                  fileUrl={selectedJdUrl}
                  fromHistory={jdFromHistory}
                  uploading={jdUploading}
                  options={reusableJdOptions}
                  optionsLoading={reusableDocsLoading}
                  onFileSelect={handleJdFileSelect}
                  onPickOption={handleReuseJd}
                  onClear={handleClearJd}
                />

                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-wide text-slate-500">Ghi chú (nếu có)</label>
                  <textarea
                    className={`${fieldClass} resize-none`}
                    rows={2}
                    placeholder="Yêu cầu đặc biệt, tập trung kỹ năng nào, ngôn ngữ phỏng vấn..."
                    value={form.note}
                    onChange={(e) => setForm({ ...form, note: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-4 lg:col-span-5 xl:col-span-4">
                <div className="glass-card p-5">
                  <h2 className="mb-4 text-[10px] font-black uppercase tracking-wide text-slate-500">Tóm tắt đặt lịch</h2>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between gap-2 border-b border-slate-100 pb-3">
                      <span className="text-slate-500">Mentor</span>
                      <span className="max-w-[60%] text-right font-semibold text-slate-900">{mentor.name}</span>
                    </div>
                    <div className="space-y-1.5">
                      <span className="flex items-center gap-2 text-slate-500">
                        <CalendarBlank className="h-3.5 w-3.5 text-slate-400" />
                        {selectedSlots.length} buổi đã chọn
                      </span>
                      {selectedSlots.map((s, i) => (
                        <div
                          key={`${s.dateKey}_${s.time}`}
                          className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5"
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#8037f4] text-[0.6rem] font-black text-white">
                              {i + 1}
                            </span>
                            <span className="truncate text-xs font-medium text-slate-700">{s.dayFull}</span>
                          </div>
                          <span className="shrink-0 text-xs font-bold text-slate-900">{s.time}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between gap-2 border-t border-slate-100 pt-3">
                      <span className="flex items-center gap-2 text-slate-500">
                        <VideoCamera className="h-3.5 w-3.5 text-slate-400" />
                        Hình thức
                      </span>
                      <span className="font-semibold text-slate-900">Google Meet</span>
                    </div>
                    <div className="space-y-1 border-t border-slate-200 pt-3">
                      <div className="flex justify-between text-xs text-slate-500">
                        <span>{mentor.price.toLocaleString("vi")}đ × {selectedSlots.length} buổi</span>
                        <span>{totalPrice.toLocaleString("vi")}đ</span>
                      </div>
                      {planDiscountAmount > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-emerald-600">
                            Ưu đãi {planLabel} (-{Math.round(planDiscountRate * 100)}%)
                          </span>
                          <span className="font-medium text-emerald-600">−{planDiscountAmount.toLocaleString("vi")}đ</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="font-bold text-slate-900">Tổng tiền</span>
                        <span className="text-lg font-black text-[#3d5200]">{finalTotalPrice.toLocaleString("vi")}đ</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="glass-card p-4">
                  <BookingPolicySummary variant="compact" />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-violet-200 bg-violet-50/90 px-4 py-3">
              <Bell className="h-4 w-4 flex-shrink-0 text-[#8037f4]" />
              <p className="text-xs font-medium leading-relaxed text-violet-900/90">
                Email nhắc lịch sẽ được gửi trước buổi phỏng vấn 01 giờ
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <ShieldCheck className="h-4 w-4 flex-shrink-0 text-[#8037f4]" />
                Thanh toán bảo mật và mã hóa
              </div>
              <button
                type="button"
                disabled={!form.position || !form.cv || !selectedCvFile || !selectedCvUrl || cvUploading || jdUploading}
                onClick={handleProceed}
                className={`flex w-full items-center justify-center gap-2 rounded-2xl px-8 py-4 text-sm font-black uppercase tracking-wide transition-all active:scale-[0.98] sm:w-auto ${
                  form.position && form.cv && selectedCvFile && selectedCvUrl && !cvUploading && !jdUploading
                    ? "shadow-[0_8px_28px_rgba(147,247,43,0.35)] hover:brightness-95"
                    : "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400"
                }`}
                style={
                  form.position && form.cv && selectedCvFile && selectedCvUrl && !cvUploading && !jdUploading
                    ? BRAND_CTA_LIME_STYLE
                    : undefined
                }
              >
                Tiếp tục thanh toán · {selectedSlots.length} buổi · {finalTotalPrice.toLocaleString("vi")}đ
                <CaretRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
        </div>
      </div>
    </MentorPageShell>
  );
}