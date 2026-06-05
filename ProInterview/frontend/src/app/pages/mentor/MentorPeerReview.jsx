import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
   Users,
   Star,
   Search,
   CheckCircle2,
   Clock,
   AlertCircle,
   FileBadge,
   ChevronRight,
   ShieldCheck,
   TrendingUp,
   Layout,
   BookOpen,
   PlayCircle,
   Zap,
   StarHalf
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { getUser } from "../../utils/auth";
import { MentorPageShell } from "../../components/mentor/MentorPageShell";
import { fetchMentorPeerReviews, submitMentorPeerReview } from "../../utils/mentorApi";
import { toastApiError, tryApi } from "../../utils/apiToast";
import { toast } from "sonner";
import { mediaSrc, DEFAULT_COURSE_THUMB } from "../../utils/mediaUrl";

const CATEGORY_LABELS = {
   all: "Tất cả lĩnh vực",
   technical: "Kỹ thuật",
   behavioral: "Hành vi",
   negotiation: "Đàm phán",
   other: "Khác",
};

function formatCategory(cat) {
   if (!cat || cat === "all") return CATEGORY_LABELS.all;
   const key = String(cat).toLowerCase();
   return CATEGORY_LABELS[key] || String(cat);
}

function PeerReviewStarRating({ value, onChange, label }) {
   return (
      <div className="flex items-center gap-0.5" role="group" aria-label={`${label}: ${value} sao`}>
         {[1, 2, 3, 4, 5].map((n) => (
            <button
               key={n}
               type="button"
               onClick={() => onChange(n)}
               className="rounded-md p-1 transition hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
               aria-label={`${n} sao`}
               aria-pressed={n <= value}
            >
               <Star
                  size={22}
                  className={
                     n <= value
                        ? "fill-amber-400 text-amber-400"
                        : "text-slate-300"
                  }
               />
            </button>
         ))}
      </div>
   );
}

export function MentorPeerReview() {
   const navigate = useNavigate();
   const user = getUser();
   const [filter, setFilter] = useState("all");
   const [search, setSearch] = useState("");
   const [category, setCategory] = useState("all");
   const [coursesForReview, setCoursesForReview] = useState([]);
   const [selectedCourse, setSelectedCourse] = useState(null);
   const [submitting, setSubmitting] = useState(false);
   const [reviewForm, setReviewForm] = useState({
      contentRating: 5,
      qualityRating: 5,
      priceValueRating: 5,
      feedback: "",
   });

   useEffect(() => {
      if (!user || user.role !== "mentor") {
         navigate("/");
         return;
      }
      void (async () => {
         const res = await tryApi(() => fetchMentorPeerReviews(), {
            fallback: "Không tải được danh sách đánh giá chéo.",
         });
         if (!res.success || !Array.isArray(res.items)) {
            setCoursesForReview([]);
            return;
         }
         setCoursesForReview(
            res.items.map((item) => ({
               ...item,
               cover: item.cover || "",
            })),
         );
      })();
   }, []);

   if (!user || user.role !== "mentor") return null;

   const filtered = coursesForReview.filter(c => {
      const matchesFilter = filter === "all" || c.status === filter;
      const matchesSearch = c.title.toLowerCase().includes(search.toLowerCase()) || c.mentor.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = category === "all" || c.category === category;
      return matchesFilter && matchesSearch && matchesCategory;
   });
   const pendingCount = coursesForReview.filter((c) => c.status === "pending").length;
   const reviewedCount = coursesForReview.filter((c) => c.status === "reviewed").length;
   const highScoreCount = coursesForReview.filter((c) => c.status === "reviewed" && Number(c.rating) >= 4.5).length;
   const reviewedRows = coursesForReview.filter((c) => c.status === "reviewed" && Number(c.rating) > 0);
   const avgRating = reviewedRows.length
      ? (reviewedRows.reduce((sum, c) => sum + Number(c.rating || 0), 0) / reviewedRows.length).toFixed(1)
      : "0.0";
   const categories = ["all", ...Array.from(new Set(coursesForReview.map((c) => c.category).filter(Boolean)))];

   const startReview = (course) => {
      if (course.status === "reviewed") {
         toast.info("Khóa học này đã được bạn đánh giá rồi.");
         return;
      }
      setSelectedCourse(course);
      setReviewForm({ contentRating: 5, qualityRating: 5, priceValueRating: 5, feedback: "" });
   };

   const submitReview = async () => {
      if (!selectedCourse?.id) return;
      setSubmitting(true);
      const res = await tryApi(() => submitMentorPeerReview(selectedCourse.id, reviewForm), {
         fallback: "Không gửi được đánh giá.",
         successMessage: "Đã gửi đánh giá chéo.",
      });
      setSubmitting(false);
      if (!res.success) return;
      setCoursesForReview((prev) =>
         prev.map((item) =>
            item.id === selectedCourse.id
               ? { ...item, status: "reviewed", rating: Number(res.review?.rating || item.rating || 0) }
               : item,
         ),
      );
      setSelectedCourse(null);
   };

   return (
      <MentorPageShell bottomPad="pb-32">
         <div className="relative z-10 mx-auto max-w-7xl px-8 pb-8">
            {/* Header Section */}
            <div className="mb-12 max-w-3xl">
               <h1 className="mb-4 font-headline overflow-visible pb-0.5 text-2xl font-black uppercase leading-[1.2] tracking-tight text-slate-900 sm:text-3xl">
                  Đánh giá <span className="text-secondary">chéo khóa học</span>
               </h1>
               <p className="text-slate-600 text-sm font-medium leading-relaxed">
                  Với tư cách mentor trong hệ thống ProInterview, bạn có hành quyền đánh giá chuyên môn các khóa học của đồng nghiệp để đảm bảo chất lượng nội dung toàn hệ thống.
               </p>
            </div>

            {/* Global Stats Bar */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-12">
               {[
                  { label: "Cần đánh giá", value: pendingCount, icon: Clock, color: "#8037f4" },
                  { label: "Đã hoàn thành", value: reviewedCount, icon: CheckCircle2, color: "#93f72b" },
                  { label: "Đánh giá điểm cao", value: highScoreCount, icon: TrendingUp, color: "#8037f4" },
                  { label: "Điểm trung bình", value: avgRating, icon: Star, color: "#f59e0b" }
               ].map((stat, i) => (
                  <div key={i} className="glass-card p-7 group">
                     <div className="flex items-center justify-between mb-5">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center">
                           <stat.icon size={18} style={{ color: stat.color }} />
                        </div>
                        <div className="h-2 w-2 rounded-full bg-slate-200 transition-colors group-hover:bg-lime-400" />
                     </div>
                     <h3 className="mb-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{stat.value}</h3>
                     <p className="text-sm font-medium text-zinc-500 leading-none">{stat.label}</p>
                  </div>
               ))}
            </div>

            {/* Informational Toast */}
            <div className="glass-card mb-12 p-7 relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-10 rotate-12 opacity-5 scale-125 group-hover:rotate-0 transition-all duration-1000">
                  <ShieldCheck size={140} className="text-violet-700" />
               </div>
               <div className="relative z-10 flex items-start gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-primary-fixed/20 flex items-center justify-center text-violet-700 shrink-0">
                     <Zap size={28} />
                  </div>
                  <div>
                     <h4 className="mb-3 text-xl font-bold text-slate-900">Quy tắc đánh giá chuyên môn</h4>
                     <p className="max-w-2xl text-sm font-medium leading-relaxed text-zinc-600">
                        Hãy đánh giá khách quan và chuyên nghiệp dựa trên kiến thức của bạn. Đánh giá của bạn giúp học viên tin tưởng hơn vào nội dung và nhận điểm thưởng từ nền tảng.
                     </p>
                  </div>
               </div>
            </div>

            {/* Filter & List Controls */}
            <div className="space-y-5">
               <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                  <div className="group relative max-w-xl flex-1">
                     <Search className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-violet-600" size={20} />
                     <input
                        type="text"
                        placeholder="Tìm kiếm khóa học hoặc mentor..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full rounded-[20px] border border-slate-200 bg-white py-3.5 pl-16 pr-5 text-sm font-medium text-slate-900 shadow-sm outline-none transition placeholder:text-slate-500 focus:border-violet-400 focus:ring-2 focus:ring-violet-200/80"
                     />
                  </div>
                  <div className="flex gap-2 rounded-[24px] border border-slate-200 bg-slate-50 p-2">
                     {["all", "pending", "reviewed"].map((v) => (
                        <button
                           key={v}
                           onClick={() => setFilter(v)}
                           className={`rounded-[18px] px-8 py-3 text-sm font-semibold transition-all ${filter === v ? "bg-violet-600 text-white shadow-md" : "text-slate-600 hover:bg-white hover:text-slate-900"
                              }`}
                        >
                           {v === "all" ? "Tất cả" : v === "pending" ? "Chưa đánh giá" : "Đã đánh giá"}
                        </button>
                     ))}
                  </div>
               </div>

               <div className="flex flex-wrap gap-3">
                  {categories.map((cat) => (
                     <button
                        key={cat}
                        onClick={() => setCategory(cat)}
                        className={`rounded-xl px-6 py-2.5 text-sm font-semibold transition-all ${category === cat ? "bg-violet-600 text-white shadow-sm" : "border border-slate-200 bg-slate-50 text-slate-600 hover:text-slate-900"
                           }`}
                     >
                        {formatCategory(cat)}
                     </button>
                  ))}
               </div>

               {/* Course Grid */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {filtered.map((course) => (
                     <div key={course.id} className="glass-card overflow-hidden group">
                        <div className="relative h-48 overflow-hidden">
                           <img
                             src={mediaSrc(course.cover, DEFAULT_COURSE_THUMB)}
                             alt=""
                             className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-110"
                           />
                           <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                           <div className="absolute top-6 left-6 flex gap-2">
                              <span className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-800 backdrop-blur-md">
                                 {formatCategory(course.category)}
                              </span>
                              <span className={`rounded-lg border px-3 py-1 text-xs font-semibold backdrop-blur-md ${course.status === 'reviewed' ? 'bg-emerald-500/20 text-emerald-600 border-emerald-500/20' : 'bg-orange-500/20 text-orange-600 border-orange-500/20'}`}>
                                 {course.status === 'reviewed' ? 'Đã đánh giá' : 'Chưa đánh giá'}
                              </span>
                           </div>
                        </div>
                        <div className="p-6">
                           <h4 className="mb-2 text-xl font-bold text-slate-900 transition-colors group-hover:text-violet-700">
                              {course.title}
                           </h4>
                           <p className="mb-6 text-sm text-zinc-600">Tác giả: <span className="font-medium text-slate-900">{course.mentor}</span></p>

                           <div className="flex items-center justify-between">
                              <div className="flex items-center gap-6">
                                 <div className="flex items-center gap-2">
                                    <Users size={14} className="text-zinc-600" />
                                    <span className="text-xs font-black text-slate-900">{course.participants}</span>
                                 </div>
                                 {course.rating > 0 && (
                                    <div className="flex items-center gap-2">
                                       <Star size={14} className="text-[#FFD600] fill-current" />
                                       <span className="text-xs font-black text-slate-900">{course.rating}</span>
                                    </div>
                                 )}
                              </div>
                              <button
                                 onClick={() => startReview(course)}
                                 className="flex items-center gap-2 text-sm font-semibold text-slate-900 transition-all hover:text-violet-700 group/btn"
                              >
                                 {course.status === "reviewed" ? "Đã đánh giá" : "Bắt đầu đánh giá"} <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                              </button>
                           </div>
                        </div>
                     </div>
                  ))}
               </div>
               {!coursesForReview.length && (
                  <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
                     <p className="text-sm font-semibold text-zinc-500">Hiện chưa có khóa học nào khả dụng để đánh giá chéo.</p>
                  </div>
               )}
            </div>
         </div>
         <AnimatePresence>
            {selectedCourse && (
               <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[200] flex items-center justify-center p-6 backdrop-blur-sm bg-slate-900/50"
                  onClick={() => setSelectedCourse(null)}
               >
                  <motion.div
                     initial={{ scale: 0.96, y: 20, opacity: 0 }}
                     animate={{ scale: 1, y: 0, opacity: 1 }}
                     exit={{ scale: 0.96, y: 20, opacity: 0 }}
                     className="glass-card w-full max-w-xl p-8"
                     onClick={(e) => e.stopPropagation()}
                  >
                     <h3 className="mb-2 text-2xl font-bold text-slate-900">Đánh giá chéo khóa học</h3>
                     <p className="mb-6 text-sm text-zinc-600">{selectedCourse.title}</p>
                     <div className="mb-6 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="line-clamp-3 text-sm text-zinc-600">
                           {selectedCourse.description || "Chưa có mô tả chi tiết cho khóa học này."}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-zinc-600">
                           <span className="rounded-lg border border-slate-200 bg-white px-2 py-1">{selectedCourse.level || "Chưa rõ"}</span>
                           <span>{selectedCourse.isFree ? "Miễn phí" : `${Number(selectedCourse.price || 0).toLocaleString("vi-VN")} ₫`}</span>
                           <span>{Number(selectedCourse.lessonCount || 0)} bài học</span>
                        </div>
                        <p className="text-xs text-zinc-500">
                           Xem mô tả và toàn bộ bài học (video/tài liệu mentor khác đã upload) trước khi chấm điểm.
                        </p>
                        <div className="flex flex-wrap gap-3">
                           <button
                              type="button"
                              onClick={() => navigate(`/courses/${selectedCourse.id}?peerReview=1`)}
                              className="inline-flex items-center gap-2 text-sm font-semibold text-violet-700 hover:opacity-80"
                           >
                              <BookOpen size={14} /> Mô tả &amp; chương trình
                           </button>
                           <button
                              type="button"
                              onClick={() => navigate(`/courses/${selectedCourse.id}/learn?peerReview=1`)}
                              className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:opacity-80"
                           >
                              <PlayCircle size={14} /> Xem bài học
                           </button>
                        </div>
                     </div>
                     <div className="space-y-4">
                        {[
                           ["contentRating", "Nội dung"],
                           ["qualityRating", "Chất lượng"],
                           ["priceValueRating", "Giá trị / Chi phí"],
                        ].map(([field, label]) => (
                           <div key={field} className="flex items-center justify-between gap-4">
                              <span className="text-sm font-semibold text-slate-700">{label}</span>
                              <PeerReviewStarRating
                                 label={label}
                                 value={reviewForm[field]}
                                 onChange={(n) =>
                                    setReviewForm((prev) => ({ ...prev, [field]: n }))
                                 }
                              />
                           </div>
                        ))}
                        <textarea
                           value={reviewForm.feedback}
                           onChange={(e) => setReviewForm((prev) => ({ ...prev, feedback: e.target.value }))}
                           placeholder="Nhận xét chi tiết (không bắt buộc)"
                           className="min-h-28 w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-violet-400 focus:ring-2 focus:ring-violet-200/80"
                        />
                     </div>
                     <div className="mt-7 grid grid-cols-2 gap-3">
                        <button
                           onClick={() => setSelectedCourse(null)}
                           className="rounded-xl border border-slate-200 bg-slate-50 py-3 text-sm font-semibold text-slate-900"
                        >
                           Hủy
                        </button>
                        <button
                           onClick={submitReview}
                           disabled={submitting}
                           className="rounded-xl bg-primary-fixed py-3 text-sm font-semibold text-slate-900 disabled:opacity-50"
                        >
                           {submitting ? "Đang gửi..." : "Gửi đánh giá"}
                        </button>
                     </div>
                  </motion.div>
               </motion.div>
            )}
         </AnimatePresence>
      </MentorPageShell>
   );
}