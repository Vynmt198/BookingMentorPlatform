import { MentorPageShell } from "../../components/mentor/MentorPageShell";
import React, { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "motion/react";
import { useNavigate, useSearchParams } from "react-router";
import {
  Search as MagnifyingGlass,
  X,
  AlertCircle,
  ChevronDown,
  Filter,
  SlidersHorizontal,
} from "lucide-react";
import { MentorListCard } from "../../components/mentor/MentorListCard";
import { fetchMentors } from "../../utils/mentorApi";
import { fetchRebookCredit } from "../../utils/bookingsApi";
import { toastApiError } from "../../utils/apiToast";
import {
  MENTOR_FILTER_FIELDS,
  mentorMatchesFilterField,
} from "../../constants/mentorFilterFields";
import {
  CUSTOMER_SHELL_GUTTER,
  CUSTOMER_SHELL_MAX,
} from "../../components/layout/customerShellLayout";
import { ListPagination } from "../../components/shared/ListPagination";
import { AppSelect } from "../../components/ui/AppSelect";

const EXPERIENCE_OPTIONS = [
  { label: "1-3 năm", value: "1-3" },
  { label: "4-6 năm", value: "4-6" },
  { label: "7+ năm", value: "7+" },
];

const PRICE_OPTIONS = [
  { label: "Dưới 280k", min: 0, max: 280000 },
  { label: "280k - 320k", min: 280000, max: 320000 },
  { label: "Trên 320k", min: 320000, max: Infinity },
];

const RATING_OPTIONS = [
  { label: "4.5+", min: 4.5 },
  { label: "4.0+", min: 4.0 },
  { label: "3.5+", min: 3.5 },
];

const TOPIC_OPTIONS = [
  { label: "CV Review", value: "cv_review", terms: ["cv", "resume", "review"] },
  { label: "Mock Interview", value: "mock_interview", terms: ["mock", "interview", "phỏng vấn"] },
  { label: "Career Advisory", value: "career_advisory", terms: ["career", "lộ trình", "advisory", "định hướng"] },
  { label: "Tech Stack Sharing", value: "tech_sharing", terms: ["tech", "stack", "frontend", "backend", "system", "data"] },
  { label: "Coding Practice", value: "coding_practice", terms: ["coding", "leetcode", "algorithm", "technical", "code"] },
];

const MENTORS_PAGE_SIZE = 8;

function mentorMatchesTopic(mentor, selectedTopic) {
  if (!selectedTopic) return true;
  const topic = TOPIC_OPTIONS.find((item) => item.value === selectedTopic);
  const haystack = [
    mentor.name,
    mentor.title,
    mentor.company,
    mentor.field,
    mentor.bio,
    ...(mentor.tags || []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (!topic) return haystack.includes(String(selectedTopic).toLowerCase());
  return topic.terms.some((term) => haystack.includes(term));
}

export function Mentors() {
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const glow1Y = useTransform(scrollYProgress, [0, 1], [0, -70]);
  const glow2Y = useTransform(scrollYProgress, [0, 1], [0, -45]);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rebookFrom =
    searchParams.get("rebookFrom") ||
    (typeof sessionStorage !== "undefined"
      ? sessionStorage.getItem("prointerview_rebook_from")
      : "") ||
    "";
  const [rebookCredit, setRebookCredit] = useState(null);
  const [search, setSearch] = useState("");

  const [selectedTopic, setSelectedTopic] = useState("");
  const [companySearch, setCompanySearch] = useState("");
  const [titleSearch, setTitleSearch] = useState("");
  const [selectedSchedule, setSelectedSchedule] = useState("");

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [selectedField, setSelectedField] = useState(null);
  const [selectedExp, setSelectedExp] = useState(null);
  const [selectedPriceIndex, setSelectedPriceIndex] = useState(null);
  const [selectedRating, setSelectedRating] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!rebookFrom) {
      setRebookCredit(null);
      return;
    }
    void fetchRebookCredit(rebookFrom)
      .then((response) => {
        if (response.success && response.credit?.available) {
          setRebookCredit(response.credit);
          return;
        }
        setRebookCredit(null);
        if (response && !response.success && response.error) {
          toastApiError(response.error);
        }
      })
      .catch(() => {
        setRebookCredit(null);
        toastApiError("Không tải được thông tin tín dụng đặt lại.");
      });
  }, [rebookFrom]);

  const bookingPath = (mentorId) => {
    const base = `/booking/${mentorId}`;
    return rebookFrom
      ? `${base}?rebookFrom=${encodeURIComponent(rebookFrom)}`
      : base;
  };

  const loadMentors = () => {
    setLoading(true);
    setError(null);
    fetchMentors()
      .then((res) => {
        if (res.success) {
          setMentors(res.mentors || []);
          return;
        }
        const msg = res.error || "Không tải được danh sách mentor.";
        setError(msg);
        setMentors([]);
        toastApiError(msg);
      })
      .catch(() => {
        const msg = "Lỗi kết nối khi tải danh sách mentor.";
        setError(msg);
        setMentors([]);
        toastApiError(msg);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadMentors();
  }, []);

  const filteredMentors = useMemo(() => {
    const filtered = mentors.filter((mentor) => {
      const q = search.toLowerCase();
      const tags = mentor.tags || [];
      const matchSearch =
        search === "" ||
        (mentor.name || "").toLowerCase().includes(q) ||
        (mentor.title || "").toLowerCase().includes(q) ||
        (mentor.bio || "").toLowerCase().includes(q) ||
        (mentor.field || "").toLowerCase().includes(q) ||
        tags.some((tag) => tag.toLowerCase().includes(q));

      const matchCompany =
        !companySearch ||
        (mentor.company || "").toLowerCase().includes(companySearch.toLowerCase());

      const matchTitle =
        !titleSearch ||
        (mentor.title || "").toLowerCase().includes(titleSearch.toLowerCase());

      const matchTopic = mentorMatchesTopic(mentor, selectedTopic);

      const isAvailable = Boolean(mentor.available || mentor.isOnline);
      const matchSchedule =
        !selectedSchedule ||
        selectedSchedule === "all" ||
        (selectedSchedule === "today" && isAvailable) ||
        selectedSchedule === "week";

      const matchField = mentorMatchesFilterField(mentor, selectedField);

      const matchExp =
        !selectedExp ||
        (selectedExp === "1-3" && mentor.experience <= 3) ||
        (selectedExp === "4-6" &&
          mentor.experience >= 4 &&
          mentor.experience <= 6) ||
        (selectedExp === "7+" && mentor.experience >= 7);

      const priceRange =
        selectedPriceIndex != null ? PRICE_OPTIONS[selectedPriceIndex] : null;
      const matchPrice =
        !priceRange ||
        (mentor.price >= priceRange.min && mentor.price <= priceRange.max);

      const ratingMin = RATING_OPTIONS.find(
        (item) => item.label === selectedRating,
      )?.min;
      const matchRating = !ratingMin || mentor.rating >= ratingMin;

      return (
        matchSearch &&
        matchCompany &&
        matchTitle &&
        matchTopic &&
        matchSchedule &&
        matchField &&
        matchExp &&
        matchPrice &&
        matchRating
      );
    });

    return filtered;
  }, [
    search,
    companySearch,
    titleSearch,
    selectedTopic,
    selectedSchedule,
    selectedField,
    selectedExp,
    selectedPriceIndex,
    selectedRating,
    mentors,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredMentors.length / MENTORS_PAGE_SIZE),
  );

  const paginatedMentors = useMemo(() => {
    const start = (currentPage - 1) * MENTORS_PAGE_SIZE;
    return filteredMentors.slice(start, start + MENTORS_PAGE_SIZE);
  }, [filteredMentors, currentPage]);

  const hasFilter =
    Boolean(search) ||
    Boolean(companySearch) ||
    Boolean(titleSearch) ||
    Boolean(selectedTopic) ||
    Boolean(selectedSchedule) ||
    Boolean(selectedField) ||
    Boolean(selectedExp) ||
    selectedPriceIndex != null ||
    Boolean(selectedRating);

  const clearFilters = () => {
    setSearch("");
    setCompanySearch("");
    setTitleSearch("");
    setSelectedTopic("");
    setSelectedSchedule("");
    setSelectedField(null);
    setSelectedExp(null);
    setSelectedPriceIndex(null);
    setSelectedRating(null);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [
    search,
    companySearch,
    titleSearch,
    selectedTopic,
    selectedSchedule,
    selectedField,
    selectedExp,
    selectedPriceIndex,
    selectedRating,
  ]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return (
    <MentorPageShell bottomPad="pb-20" showAmbient={false}>
      <div
        ref={heroRef}
        className="relative w-full overflow-hidden text-center"
        style={{
          background: "linear-gradient(135deg, #5b21b6 0%, #7c3aed 100%)",
          paddingTop: "5rem",
          paddingBottom: "5rem",
          minHeight: "420px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <motion.div
          style={{ y: glow1Y }}
          className="pointer-events-none absolute left-1/4 top-0 h-[350px] w-[350px] rounded-full bg-[#8037f4]/20 blur-[90px]"
        />
        <motion.div
          style={{ y: glow2Y }}
          className="pointer-events-none absolute bottom-0 right-1/4 h-[300px] w-[300px] rounded-full bg-lime-500/10 blur-[80px]"
        />

        <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center px-4">
          {rebookCredit?.available ? (
            <div className="mb-6 w-full max-w-2xl rounded-2xl border border-violet-800/40 bg-[#1a132f]/85 px-4 py-3 text-left text-sm text-violet-200 shadow-md backdrop-blur-md">
              <p className="font-bold text-lime-400">Credit đổi mentor</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-300">
                Bạn có{" "}
                <strong>
                  {Number(rebookCredit.creditVnd || 0).toLocaleString("vi-VN")}₫
                </strong>{" "}
                từ lịch mentor đã hủy. Chọn <strong>mentor khác</strong> nếu giá
                buổi mới không vượt quá credit thì <strong>không cần trả lại</strong>.
              </p>
            </div>
          ) : null}

          <motion.h1
            className="font-headline mb-3 text-3xl font-black uppercase tracking-tight text-white sm:text-4xl md:text-5xl"
            initial={{ opacity: 0, y: -28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.55,
              ease: [0.16, 1, 0.3, 1],
              delay: 0.05,
            }}
          >
            CỘNG ĐỒNG MENTOR
          </motion.h1>

          <motion.p
            className="mb-10 max-w-2xl text-sm font-medium leading-relaxed text-slate-300 sm:text-base"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut", delay: 0.2 }}
          >
            Tiến nhanh và xa hơn trong hành trình sự nghiệp cùng ProInterview
          </motion.p>

          <motion.div
            className="flex w-full max-w-4xl flex-col items-stretch gap-2 rounded-[2rem] border border-white/25 bg-white/15 p-2.5 shadow-[0_20px_70px_rgba(10,6,24,0.45)] backdrop-blur-2xl md:flex-row md:items-center"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              duration: 0.5,
              ease: [0.16, 1, 0.3, 1],
              delay: 0.35,
            }}
          >
            <div className="relative w-full flex-1 rounded-[1.35rem] border border-white/15 bg-[#120b24]/75">
              <MagnifyingGlass className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-white/45" />
              <input
                type="text"
                placeholder="Nhập từ khóa để tìm kiếm, ví dụ Tên, Công ty, Vị trí..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full border-none bg-transparent py-3.5 pl-11 pr-10 text-sm font-semibold text-white outline-none placeholder:text-white/42"
              />
              {search ? (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 rounded-full p-1 text-white/38 transition hover:bg-white/8 hover:text-white"
                  style={{ transform: "translateY(-50%)" }}
                >
                  <X className="size-3.5" />
                </button>
              ) : null}
            </div>

            <div className="hidden h-8 w-px shrink-0 bg-white/20 md:block" />

            <div className="w-full shrink-0 md:w-52">
              <AppSelect
                value={selectedField || ""}
                onValueChange={(value) => setSelectedField(value || null)}
                options={[
                  { value: "", label: "Chọn Lĩnh vực" },
                  ...MENTOR_FILTER_FIELDS.map((item) => ({
                    value: item,
                    label: item,
                  })),
                ]}
                placeholder="Lĩnh vực"
                triggerClassName="h-[52px] w-full rounded-[1.35rem] !border border-white/15 !bg-[#120b24]/75 px-4 text-sm font-semibold !text-white shadow-none transition hover:!bg-[#120b24]/90 hover:!border-white/25"
                contentClassName="rounded-2xl border border-violet-100 bg-white"
              />
            </div>

            <button
              type="button"
              className="w-full rounded-[1.35rem] bg-[#a3e635] px-7 py-3.5 text-xs font-black text-slate-900 shadow-[0_10px_30px_rgba(163,230,53,0.25)] transition-all hover:bg-[#b2f35a] hover:shadow-[0_16px_36px_rgba(163,230,53,0.32)] md:w-auto"
            >
              <span className="flex items-center justify-center gap-2">
                <MagnifyingGlass className="size-3.5" />
                <span>TÌM KIẾM</span>
              </span>
            </button>
          </motion.div>
        </div>
      </div>

      <div className={`relative z-10 flex flex-col pb-8 pt-8 ${CUSTOMER_SHELL_GUTTER}`}>
        <div className={`${CUSTOMER_SHELL_MAX} w-full`}>
          <motion.div
            className="mb-6 flex items-center justify-between border-b border-slate-100 px-1 pb-3"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.1 }}
          >
            <p className="text-sm font-semibold text-slate-700">
              Tìm thấy{" "}
              <span className="text-base font-extrabold text-[#8037f4]">
                {filteredMentors.length}
              </span>{" "}
              Mentor cho bạn!
            </p>
            <button
              type="button"
              onClick={() => setFiltersOpen((value) => !value)}
              className="inline-flex items-center gap-1.5 rounded-full border border-violet-100 bg-violet-50 px-4.5 py-2.5 text-xs font-black uppercase tracking-wider text-[#8037f4] transition-all hover:bg-violet-100/80"
            >
              <Filter className="size-3.5" />
              <span>Lọc kết quả</span>
              <ChevronDown
                className={`size-3.5 transition-transform duration-200 ${
                  filtersOpen ? "rotate-180" : ""
                }`}
              />
            </button>
          </motion.div>

          <AnimatePresence>
            {filtersOpen ? (
              <motion.div
                initial={{ opacity: 0, y: -12, scaleY: 0.95 }}
                animate={{ opacity: 1, y: 0, scaleY: 1 }}
                exit={{ opacity: 0, y: -8, scaleY: 0.96 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="mb-8 rounded-3xl border border-violet-950/20 bg-[#1a132f] p-5.5 shadow-xl"
                style={{ transformOrigin: "top" }}
              >
                <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                  <div className="flex flex-col gap-1.5">
                    <label className="px-1 text-[10px] font-extrabold uppercase tracking-wider text-violet-300/80">
                      Chọn Chủ đề
                    </label>
                    <AppSelect
                      value={selectedTopic}
                      onValueChange={setSelectedTopic}
                      options={[
                        { value: "", label: "Tất cả chủ đề" },
                        ...TOPIC_OPTIONS,
                      ]}
                      triggerClassName="h-[38px] w-full rounded-2xl !border-violet-950 !bg-violet-950/40 text-xs font-bold !text-slate-100 hover:!bg-violet-900/30 focus:!border-[#8037f4] focus:ring-2 focus:ring-violet-500/20"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="px-1 text-[10px] font-extrabold uppercase tracking-wider text-violet-300/80">
                      Tên công ty
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Nhập tên công ty..."
                        value={companySearch}
                        onChange={(e) => setCompanySearch(e.target.value)}
                        className="w-full rounded-2xl border border-violet-950 bg-violet-950/40 px-4 py-2.5 text-xs font-bold text-slate-100 outline-none transition-all placeholder:text-slate-500 focus:border-[#8037f4] focus:ring-2 focus:ring-violet-500/20"
                      />
                      {companySearch ? (
                        <button
                          type="button"
                          onClick={() => setCompanySearch("")}
                          className="absolute right-3 top-1/2 rounded-full p-1 text-slate-400 hover:bg-violet-900/40 hover:text-white"
                          style={{ transform: "translateY(-50%)" }}
                        >
                          <X className="size-3.5" />
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="px-1 text-[10px] font-extrabold uppercase tracking-wider text-violet-300/80">
                      Vị trí
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Nhập vị trí..."
                        value={titleSearch}
                        onChange={(e) => setTitleSearch(e.target.value)}
                        className="w-full rounded-2xl border border-violet-950 bg-violet-950/40 px-4 py-2.5 text-xs font-bold text-slate-100 outline-none transition-all placeholder:text-slate-500 focus:border-[#8037f4] focus:ring-2 focus:ring-violet-500/20"
                      />
                      {titleSearch ? (
                        <button
                          type="button"
                          onClick={() => setTitleSearch("")}
                          className="absolute right-3 top-1/2 rounded-full p-1 text-slate-400 hover:bg-violet-900/40 hover:text-white"
                          style={{ transform: "translateY(-50%)" }}
                        >
                          <X className="size-3.5" />
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="px-1 text-[10px] font-extrabold uppercase tracking-wider text-violet-300/80">
                      Lịch rảnh
                    </label>
                    <AppSelect
                      value={selectedSchedule}
                      onValueChange={setSelectedSchedule}
                      options={[
                        { value: "", label: "Tất cả thời gian" },
                        { value: "today", label: "Sẵn sàng ngay" },
                        { value: "week", label: "Có lịch trong tuần" },
                      ]}
                      triggerClassName="h-[38px] w-full rounded-2xl !border-violet-950 !bg-violet-950/40 text-xs font-bold !text-slate-100 hover:!bg-violet-900/30 focus:!border-[#8037f4] focus:ring-2 focus:ring-violet-500/20"
                    />
                  </div>

                  <div className="flex items-end gap-2">
                    <button
                      type="button"
                      onClick={clearFilters}
                      disabled={!hasFilter}
                      className="flex-1 rounded-2xl border border-violet-950 bg-violet-950/30 py-2.5 text-xs font-extrabold text-slate-300 transition-all hover:bg-violet-900/20 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      Xóa lọc
                    </button>
                    <button
                      type="button"
                      onClick={() => setFiltersOpen(false)}
                      className="flex-1 rounded-2xl bg-lime-400 py-2.5 text-xs font-black text-violet-950 shadow-sm transition-all hover:bg-lime-300"
                    >
                      ÁP DỤNG
                    </button>
                  </div>
                </div>

                <div className="mt-4 border-t border-violet-900/40 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAdvanced((value) => !value)}
                    className="flex items-center gap-1 text-xs font-bold text-violet-300 transition-colors hover:text-white"
                  >
                    <SlidersHorizontal className="size-3.5" />
                    <span>
                      {showAdvanced
                        ? "Ẩn bộ lọc nâng cao"
                        : "Hiện bộ lọc nâng cao"}
                    </span>
                  </button>

                  {showAdvanced ? (
                    <div className="mt-4 grid grid-cols-1 gap-4 animate-in fade-in duration-200 sm:grid-cols-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="px-1 text-[10px] font-extrabold uppercase tracking-wider text-violet-300/80">
                          Kinh nghiệm
                        </label>
                        <AppSelect
                          value={selectedExp || ""}
                          onValueChange={(value) => setSelectedExp(value || null)}
                          options={[
                            { value: "", label: "Tất cả kinh nghiệm" },
                            ...EXPERIENCE_OPTIONS,
                          ]}
                          triggerClassName="h-[38px] w-full rounded-2xl !border-violet-950 !bg-violet-950/40 text-xs font-bold !text-slate-100 hover:!bg-violet-900/30 focus:!border-[#8037f4] focus:ring-2 focus:ring-violet-500/20"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="px-1 text-[10px] font-extrabold uppercase tracking-wider text-violet-300/80">
                          Mức giá
                        </label>
                        <AppSelect
                          value={selectedPriceIndex ?? ""}
                          onValueChange={(value) =>
                            setSelectedPriceIndex(
                              value === "" ? null : Number(value),
                            )
                          }
                          options={[
                            { value: "", label: "Tất cả mức giá" },
                            ...PRICE_OPTIONS.map((item, index) => ({
                              value: index,
                              label: item.label,
                            })),
                          ]}
                          triggerClassName="h-[38px] w-full rounded-2xl !border-violet-950 !bg-violet-950/40 text-xs font-bold !text-slate-100 hover:!bg-violet-900/30 focus:!border-[#8037f4] focus:ring-2 focus:ring-violet-500/20"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="px-1 text-[10px] font-extrabold uppercase tracking-wider text-violet-300/80">
                          Đánh giá
                        </label>
                        <AppSelect
                          value={selectedRating || ""}
                          onValueChange={(value) => setSelectedRating(value || null)}
                          options={[
                            { value: "", label: "Tất cả đánh giá" },
                            ...RATING_OPTIONS.map((item) => ({
                              value: item.label,
                              label: item.label,
                            })),
                          ]}
                          triggerClassName="h-[38px] w-full rounded-2xl !border-violet-950 !bg-violet-950/40 text-xs font-bold !text-slate-100 hover:!bg-violet-900/30 focus:!border-[#8037f4] focus:ring-2 focus:ring-violet-500/20"
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {loading ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[...Array(8)].map((_, index) => (
                <div
                  key={index}
                  className="flex animate-pulse flex-col items-center space-y-4 rounded-3xl border border-violet-50 bg-white p-5 shadow-sm"
                >
                  <div className="size-24 rounded-full bg-violet-100/80" />
                  <div className="h-4 w-32 rounded bg-violet-100" />
                  <div className="h-3 w-40 rounded bg-violet-50" />
                  <div className="h-6 w-28 rounded-full bg-emerald-50" />
                  <div className="flex w-full justify-between border-t border-slate-100 pt-3">
                    <div className="h-3 w-16 rounded bg-violet-50" />
                    <div className="h-3 w-12 rounded bg-violet-50" />
                  </div>
                  <div className="h-8 w-full rounded-2xl bg-slate-100" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="rounded-3xl border border-violet-100 bg-white py-16 text-center shadow-sm">
              <AlertCircle className="mx-auto mb-3 size-10 text-violet-400" />
              <p className="font-semibold text-violet-950">
                Không thể tải danh sách mentor
              </p>
              <button
                type="button"
                onClick={loadMentors}
                className="mt-4 cursor-pointer rounded-xl bg-[#a3e635] px-6 py-2.5 text-sm font-bold text-slate-900 hover:bg-[#84cc16]"
              >
                Thử lại
              </button>
            </div>
          ) : filteredMentors.length === 0 ? (
            <div className="rounded-3xl border border-violet-100 bg-white py-16 text-center shadow-sm">
              <MagnifyingGlass className="mx-auto mb-4 size-12 text-violet-300" />
              <h3 className="mb-2 text-lg font-bold text-violet-950">
                Không tìm thấy mentor phù hợp
              </h3>
              <p className="mb-6 text-sm text-slate-600">
                Thử đổi bộ lọc hoặc từ khóa tìm kiếm.
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="cursor-pointer rounded-xl bg-[#a3e635] px-6 py-2.5 text-sm font-bold text-slate-900 hover:bg-[#84cc16]"
              >
                Xóa bộ lọc
              </button>
            </div>
          ) : (
            <>
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentPage}
                  className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  {paginatedMentors.map((mentor, index) => (
                    <motion.div
                      key={mentor.id}
                      className="h-full"
                      initial={{ opacity: 0, y: 44 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.12 }}
                      transition={{
                        duration: 0.48,
                        delay: (index % 4) * 0.09,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                    >
                      <MentorListCard
                        mentor={mentor}
                        onOpenProfile={() => navigate(`/mentors/${mentor.id}`)}
                        onBook={() => navigate(bookingPath(mentor.id))}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              </AnimatePresence>

              <motion.div
                className="mt-8"
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: 0.1 }}
              >
                <ListPagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </motion.div>
            </>
          )}
        </div>
      </div>
    </MentorPageShell>
  );
}
