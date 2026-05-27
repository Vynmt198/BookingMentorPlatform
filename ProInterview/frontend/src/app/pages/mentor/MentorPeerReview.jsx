import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
   Users,
   Star,
   ArrowLeft,
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
   Zap,
   StarHalf
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { getUser } from "../../utils/auth";
import { MentorPageShell } from "../../components/mentor/MentorPageShell";
import { fetchMentorPeerReviews, submitMentorPeerReview } from "../../utils/mentorApi";
import { toastApiError, tryApi } from "../../utils/apiToast";
import { toast } from "sonner";

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
            fallback: "Không tải được danh sách peer review.",
         });
         if (!res.success || !Array.isArray(res.items)) {
            setCoursesForReview([]);
            return;
         }
         setCoursesForReview(
            res.items.map((item) => ({
               ...item,
               cover:
                  item.cover ||
                  "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&q=80&w=400",
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
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
               <div className="max-w-3xl">
                  <h1 className="mb-4 font-headline text-2xl font-black uppercase tracking-tight text-slate-900 sm:text-3xl">
                     Đánh giá <span className="text-secondary tracking-tighter">Chéo Khóa học</span>
                  </h1>
                  <p className="text-slate-600 text-sm font-medium leading-relaxed">
                     Với tư cách mentor trong hệ thống ProInterview, bạn có hành quyền đánh giá chuyên môn các khóa học của đồng nghiệp để đảm bảo chất lượng nội dung toàn hệ thống.
                  </p>
               </div>
               <button onClick={() => navigate("/mentor/dashboard")} className="px-8 py-4 rounded-3xl bg-slate-50 border border-slate-200 text-xs font-black uppercase tracking-widest hover:bg-slate-100 transition-all flex items-center gap-2">
                  <ArrowLeft size={14} /> Về dashboard
               </button>
            </div>

            {/* Global Stats Bar */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-12">
               {[
                  { label: "Cần đánh giá", value: pendingCount, icon: Clock, color: "#8037f4" },
                  { label: "Đã hoàn thành", value: reviewedCount, icon: CheckCircle2, color: "#93f72b" },
                  { label: "Review điểm cao", value: highScoreCount, icon: TrendingUp, color: "#secondary" },
                  { label: "Rating trung bình", value: avgRating, icon: Star, color: "#f59e0b" }
               ].map((stat, i) => (
                  <div key={i} className="glass-card p-7 group">
                     <div className="flex items-center justify-between mb-5">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center">
                           <stat.icon size={18} style={{ color: stat.color }} />
                        </div>
                        <div className="h-2 w-2 rounded-full bg-slate-200 transition-colors group-hover:bg-lime-400" />
                     </div>
                     <h3 className="mb-1 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">{stat.value}</h3>
                     <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none">{stat.label}</p>
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
                     <h4 className="text-xl font-black text-slate-900 tracking-tight mb-3">Quy tắc Đánh giá chuyên môn</h4>
                     <p className="text-sm font-medium text-zinc-500 max-w-2xl leading-relaxed italic">
                        "Hãy đánh giá khách quan và chuyên nghiệp dựa trên kiến thức của bạn. Đánh giá của bạn giúp học viên tin tưởng hơn vào nội dung và nhận point thưởng từ nền tảng."
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
                           className={`rounded-[18px] px-8 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${filter === v ? "bg-violet-600 text-white shadow-md" : "text-slate-600 hover:bg-white hover:text-slate-900"
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
                        className={`rounded-xl px-6 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all ${category === cat ? "bg-violet-600 text-white shadow-sm" : "border border-slate-200 bg-slate-50 text-slate-600 hover:text-slate-900"
                           }`}
                     >
                        {cat === "all" ? "Tất cả lĩnh vực" : cat}
                     </button>
                  ))}
               </div>

               {/* Course Grid */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {filtered.map((course) => (
                     <div key={course.id} className="glass-card overflow-hidden group">
                        <div className="relative h-48 overflow-hidden">
                           <img src={course.cover} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                           <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                           <div className="absolute top-6 left-6 flex gap-2">
                              <span className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-violet-800 backdrop-blur-md">
                                 {course.category}
                              </span>
                              <span className={`px-3 py-1 backdrop-blur-md rounded-lg text-[9px] font-black uppercase tracking-widest border ${course.status === 'reviewed' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20' : 'bg-orange-500/20 text-orange-400 border-orange-500/20'}`}>
                                 {course.status === 'reviewed' ? 'Đã Review' : 'Đang chờ'}
                              </span>
                           </div>
                        </div>
                        <div className="p-6">
                           <h4 className="text-xl font-black text-slate-900 tracking-tighter mb-2 group-hover:text-violet-700 transition-colors">
                              {course.title}
                           </h4>
                           <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-6">Tác giả: <span className="text-slate-900">{course.mentor}</span></p>

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
                                 className="flex items-center gap-2 text-[10px] font-black text-slate-900 uppercase tracking-widest hover:text-violet-700 transition-all group/btn"
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
                     <p className="text-sm font-semibold text-zinc-300">Hiện chưa có khóa học nào khả dụng để đánh giá chéo.</p>
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
                  className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-sm bg-slate-900/35"
                  onClick={() => setSelectedCourse(null)}
               >
                  <motion.div
                     initial={{ scale: 0.96, y: 20, opacity: 0 }}
                     animate={{ scale: 1, y: 0, opacity: 1 }}
                     exit={{ scale: 0.96, y: 20, opacity: 0 }}
                     className="glass-card w-full max-w-xl p-8"
                     onClick={(e) => e.stopPropagation()}
                  >
                     <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Đánh giá chéo khóa học</h3>
                     <p className="text-sm text-zinc-400 mb-6">{selectedCourse.title}</p>
                     <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                        <p className="text-xs text-zinc-300 line-clamp-3">
                           {selectedCourse.description || "Chưa có mô tả chi tiết cho khóa học này."}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 text-[10px] uppercase tracking-widest font-black text-zinc-500">
                           <span className="px-2 py-1 rounded-lg border border-slate-200 bg-white/5">{selectedCourse.level || "N/A"}</span>
                           <span>{selectedCourse.isFree ? "Miễn phí" : `${Number(selectedCourse.price || 0).toLocaleString("vi-VN")} ₫`}</span>
                           <span>{Number(selectedCourse.lessonCount || 0)} bài học</span>
                        </div>
                        <button
                           onClick={() => navigate(`/courses/${selectedCourse.id}`)}
                           className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-violet-700 hover:opacity-80"
                        >
                           <BookOpen size={14} /> Xem chi tiết khóa học
                        </button>
                     </div>
                     <div className="space-y-4">
                        {[
                           ["contentRating", "Nội dung"],
                           ["qualityRating", "Chất lượng"],
                           ["priceValueRating", "Giá trị / Chi phí"],
                        ].map(([field, label]) => (
                           <div key={field} className="flex items-center justify-between gap-4">
                              <span className="text-sm font-semibold text-slate-700">{label}</span>
                              <select
                                 value={reviewForm[field]}
                                 onChange={(e) => setReviewForm((prev) => ({ ...prev, [field]: Number(e.target.value) }))}
                                 className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-900"
                              >
                                 {[1, 2, 3, 4, 5].map((n) => (
                                    <option key={n} value={n} className="bg-white text-slate-900">
                                       {n} / 5
                                    </option>
                                 ))}
                              </select>
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
                           className="py-3 rounded-xl bg-slate-50 border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-900"
                        >
                           Hủy
                        </button>
                        <button
                           onClick={submitReview}
                           disabled={submitting}
                           className="py-3 rounded-xl bg-primary-fixed text-black text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
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