import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import {
   Plus,
   Search,
   Users,
   Star,
   BookOpen,
   PlusCircle,
   Edit3,
   Trash2,
   Shapes
} from "lucide-react";
import { toast } from "sonner";
import { toastApiError, toastApiSuccess } from "../../utils/apiToast";
import { getUser } from "../../utils/auth";
import { MentorPageShell } from "../../components/mentor/MentorPageShell";
import { ArchiveCourseDialog } from "../../components/courses/ArchiveCourseDialog";
import { archiveCourse, fetchMyMentorCourses } from "../../utils/courseApi";
import { mapCourseAdminModerationNote } from "../../utils/courseAdminReview";
import { mediaSrc, DEFAULT_COURSE_THUMB } from "../../utils/mediaUrl";
import { normalizeCourseStats } from "../../utils/courseStats.js";

const STATUS_LABELS = {
   published: "Đã đăng",
   pending_review: "Chờ duyệt mới",
   pending_update: "Chờ duyệt cập nhật",
   draft: "Bản nháp",
   archived: "Đã lưu trữ",
};

const LEVEL_LABELS = {
   basic: "Cơ bản",
   intermediate: "Trung cấp",
   advanced: "Nâng cao",
};

function formatCourseLevel(level) {
   const key = String(level || "").toLowerCase();
   return LEVEL_LABELS[key] || "Chưa rõ";
}

function mapCourseRow(c) {
   const { rating, reviewsCount } = normalizeCourseStats(c?.stats);
   return {
      id: c._id,
      title: c.title,
      status: c.status || "draft",
      adminModerationNote: mapCourseAdminModerationNote(c),
      students: c.stats?.enrollmentCount || 0,
      rating: rating ?? 0,
      reviewsCount,
      cover: mediaSrc(c.thumbnail, DEFAULT_COURSE_THUMB),
      level: formatCourseLevel(c.level),
   };
}

/** Khi API chưa trả summary.avgRating — tính từ stats từng khóa (cùng logic backend). */
function weightedAvgRatingFromCourses(courses) {
   const active = (courses || []).filter((c) => c.status !== "archived");
   let weighted = 0;
   let totalReviews = 0;
   for (const c of active) {
      const n = Number(c.reviewsCount) || 0;
      const r = c.rating;
      if (n > 0 && r != null && Number.isFinite(Number(r)) && Number(r) > 0) {
         weighted += Number(r) * n;
         totalReviews += n;
      }
   }
   if (!totalReviews) return null;
   return Number((weighted / totalReviews).toFixed(1));
}

export function MentorCourseManagement() {
   const navigate = useNavigate();
   const user = getUser();
   const [activeTab, setActiveTab] = useState("all");
   const [search, setSearch] = useState("");
  const [myCourses, setMyCourses] = useState([]);
  const [courseSummary, setCourseSummary] = useState(null);
   const [archiveTarget, setArchiveTarget] = useState(null);
   const [archiving, setArchiving] = useState(false);

   const loadCourses = useCallback(() => {
      fetchMyMentorCourses().then((res) => {
         if (!res.success || !Array.isArray(res.courses)) {
            setMyCourses([]);
            setCourseSummary(null);
            if (!res.success) toastApiError(res.error, "Không tải được khóa học của bạn.");
            return;
         }
         setMyCourses(res.courses.map(mapCourseRow));
         setCourseSummary(res.summary || null);
      });
   }, []);

   useEffect(() => {
      if (!user || user.role !== "mentor") {
         navigate("/");
         return;
      }
      loadCourses();
   }, [navigate, user, loadCourses]);

   const handleArchiveConfirm = async (courseId) => {
      const idToArchive = courseId || archiveTarget?.id;
      if (!idToArchive) return;
      setArchiving(true);
      try {
      const res = await archiveCourse(idToArchive);
      if (!res.success) {
         toastApiError(res.error, "Không thể lưu trữ khóa học.");
         return;
      }
      toastApiSuccess(res.message || "Đã lưu trữ khóa học.");
      setArchiveTarget(null);
      loadCourses();
      } catch {
         toastApiError("Lỗi kết nối khi lưu trữ khóa học.");
      } finally {
         setArchiving(false);
      }
   };

   if (!user || user.role !== "mentor") return null;

   const activeCourses = myCourses.filter((c) => c.status !== "archived");
   const filtered = myCourses.filter((c) => {
      const matchesTab =
         activeTab === "all"
            ? c.status !== "archived"
            : c.status === activeTab;
      const matchesSearch = c.title.toLowerCase().includes(search.toLowerCase());
      return matchesTab && matchesSearch;
   });
   const totalCourses = courseSummary?.totalCourses ?? activeCourses.length;
   const totalStudents = courseSummary?.totalStudents ?? activeCourses.reduce(
      (sum, c) => sum + (Number(c.students) || 0),
      0,
   );
   const avgRatingValue =
      courseSummary?.avgRating != null && Number.isFinite(Number(courseSummary.avgRating))
         ? Number(courseSummary.avgRating)
         : weightedAvgRatingFromCourses(myCourses);
   const hasAvgRating = avgRatingValue != null && Number.isFinite(avgRatingValue);
   const avgRatingDisplay = hasAvgRating ? avgRatingValue.toFixed(1) : null;

   const statCards = [
      { label: "Tổng khóa học", value: totalCourses, icon: BookOpen, color: "#8037f4" },
      {
         label: "Tổng học viên",
         value: Number(totalStudents || 0).toLocaleString("vi-VN"),
         icon: Users,
         color: "#93f72b",
      },
      {
         label: "Đánh giá trung bình",
         value: avgRatingDisplay,
         emptyLabel: "Chưa có đánh giá",
         icon: Star,
         color: "#f59e0b",
      },
   ];

   return (
      <MentorPageShell bottomPad="pb-32">
         <div className="relative z-10 mx-auto max-w-7xl px-8 pb-8">
            {/* Header Unit */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
               <div>
                  <div className="mb-4 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-violet-700">
                     <Shapes size={14} /> Hệ thống đào tạo
                  </div>
                  <h1 className="font-headline overflow-visible pb-0.5 text-2xl font-black uppercase leading-[1.2] tracking-tight text-slate-900 sm:text-3xl">
                     Khóa học <span className="text-violet-700">của tôi</span>
                  </h1>
               </div>
               <div className="flex gap-4">
                  <button onClick={() => navigate("/mentor/courses/new/edit")} className="flex items-center gap-3 rounded-3xl bg-primary-fixed px-10 py-5 text-sm font-semibold text-black shadow-[0_15px_40px_rgba(196,255,71,0.3)] transition-all hover:scale-105">
                     <Plus size={20} /> Tạo khóa học mới
                  </button>

               </div>
            </div>

            {/* Course Analytics Bar */}
            <div className="mb-14 grid grid-cols-1 gap-6 md:grid-cols-3">
               {statCards.map((stat, i) => (
                  <div key={i} className="glass-card group overflow-hidden p-7">
                     <div className="relative z-10">
                        <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                           <stat.icon size={22} style={{ color: stat.color }} />
                        </div>
                        {stat.value != null ? (
                          <h3 className="mb-2 text-2xl font-black leading-none tracking-tight text-slate-900 sm:text-3xl">
                            {stat.value}
                          </h3>
                        ) : (
                          <p className="mb-2 text-sm font-semibold text-slate-500">{stat.emptyLabel}</p>
                        )}
                        <p className="text-sm font-medium text-zinc-600">{stat.label}</p>
                     </div>
                     <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-gradient-to-br from-white/[0.03] to-transparent rounded-full" />
                  </div>
               ))}
            </div>

            {/* Controls & Grid */}
            <div className="space-y-6">
               <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                  <div className="flex gap-2 rounded-[24px] border border-slate-200 bg-slate-50 p-2">
                     {["all", "published", "pending_review", "pending_update", "draft", "archived"].map((t) => (
                        <button
                           key={t}
                           onClick={() => setActiveTab(t)}
                           className={`rounded-[18px] px-6 py-3 text-sm font-semibold transition-all sm:px-8 ${activeTab === t ? "bg-violet-600 text-white shadow-md" : "text-slate-600 hover:bg-white hover:text-slate-900"
                              }`}
                        >
                           {t === "all" ? "Tất cả" : STATUS_LABELS[t] || t}
                        </button>
                     ))}
                  </div>
                  <div className="group relative max-w-lg flex-1">
                     <Search className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-violet-600" size={20} />
                     <input
                        type="text"
                        placeholder="Tìm kiếm nội dung khóa học..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full rounded-[20px] border border-slate-200 bg-white py-3.5 pl-16 pr-5 text-sm font-medium text-slate-900 shadow-sm outline-none transition placeholder:text-slate-500 focus:border-violet-400 focus:ring-2 focus:ring-violet-200/80"
                     />
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
                  {filtered.map((course) => (
                     <div key={course.id} className="glass-card flex flex-col group h-full">
                        <div className="relative h-60 overflow-hidden">
                           <img
                              src={course.cover}
                              alt=""
                              className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-110"
                           />

                           <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                           <div className="absolute top-6 left-6 flex gap-2">
                              <span className={`rounded-xl border px-4 py-1.5 text-xs font-semibold ${
                                 course.status === "published"
                                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/20"
                                    : course.status === "pending_review"
                                      ? "bg-amber-500/20 text-amber-300 border-amber-400/30"
                                      : course.status === "pending_update"
                                        ? "bg-sky-500/20 text-sky-300 border-sky-400/30"
                                        : course.status === "archived"
                                          ? "bg-red-500/20 text-red-300 border-red-400/30"
                                          : "bg-zinc-500/20 text-zinc-500 border-zinc-500/20"
                                 }`}>
                                 {STATUS_LABELS[course.status] || "Bản nháp"}
                              </span>
                              <span className="rounded-xl border border-slate-200 bg-slate-100 px-4 py-1.5 text-xs font-semibold text-slate-600 backdrop-blur-md">
                                 {course.level}
                              </span>
                           </div>
                        </div>
                        <div className="p-8 flex-1 flex flex-col">
                           <h4 className="text-xl font-black text-slate-900 tracking-tighter mb-4 group-hover:text-violet-700 transition-colors leading-tight">
                              {course.title}
                           </h4>
                           {course.adminModerationNote ? (
                              <div
                                 className={`mb-4 rounded-xl border px-4 py-3 text-left text-sm ${
                                    course.adminModerationNote.tone === "amber"
                                       ? "border-amber-200 bg-amber-50 text-amber-950"
                                       : "border-red-200 bg-red-50 text-red-900"
                                 }`}
                              >
                                 <p
                                    className={`text-sm font-semibold ${
                                       course.adminModerationNote.tone === "amber" ? "text-amber-900" : "text-red-800"
                                    }`}
                                 >
                                    {course.adminModerationNote.title}
                                 </p>
                                 <p className="mt-1 whitespace-pre-wrap leading-relaxed">{course.adminModerationNote.reason}</p>
                              </div>
                           ) : null}
                           <div className="grid grid-cols-2 gap-6 mb-10 mt-auto">
                              <div className="flex items-center gap-3">
                                 <Users size={16} className="text-zinc-600" />
                                 <div>
                                    <p className="mb-1 text-xs font-medium text-zinc-500 leading-none">Học viên</p>
                                    <p className="text-sm font-black text-slate-900">{course.students.toLocaleString()}</p>
                                 </div>
                              </div>
                              <div className="flex items-center gap-3">
                                 <Star size={16} className="text-[#FFD600]" />
                                 <div>
                                    <p className="mb-1 text-xs font-medium text-zinc-500 leading-none">Đánh giá</p>
                                    <p className="text-sm font-bold text-slate-900">{course.rating > 0 ? course.rating : "—"}</p>
                                 </div>
                              </div>
                           </div>
                           <div className="flex items-center gap-3">
                              <button
                                 type="button"
                                 onClick={() => navigate(`/mentor/courses/${course.id}/edit`)}
                                 disabled={course.status === "archived"}
                                 className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 py-4 text-sm font-semibold transition-all hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40">
                                 <Edit3 size={14} /> Chỉnh sửa
                              </button>
                              {course.status !== "archived" ? (
                                 <button
                                    type="button"
                                    onClick={() => setArchiveTarget({ id: course.id, title: course.title })}
                                    title="Xóa khóa học"
                                    className="w-14 py-4 rounded-2xl border border-red-200 bg-red-50 text-red-600 transition-all hover:bg-red-100 flex items-center justify-center"
                                 >
                                    <Trash2 size={16} />
                                 </button>
                              ) : null}
                           </div>
                        </div>
                     </div>
                  ))}
                  <div
                     onClick={() => navigate("/mentor/courses/new/edit")}
                     className="glass-card border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-10 text-zinc-700 hover:border-primary-fixed hover:text-violet-700 transition-all cursor-pointer group min-h-[360px]"
                  >
                     <div className="w-16 h-16 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                        <PlusCircle size={32} className="opacity-40 group-hover:opacity-100" />
                     </div>
                     <p className="text-sm font-semibold text-zinc-600">Thiết kế khóa học mới</p>
                  </div>
               </div>
               {!activeCourses.length && activeTab !== "archived" && (
                  <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
                     <p className="text-sm font-semibold text-zinc-300">
                        Bạn chưa có khóa học nào trên hệ thống.
                     </p>
                     <p className="mt-2 text-xs text-zinc-500">
                        Hãy bấm "Tạo khóa học mới" để bắt đầu, sau đó gửi admin duyệt.
                     </p>
                  </div>
               )}
            </div>
         </div>

         <ArchiveCourseDialog
            open={Boolean(archiveTarget)}
            courseTitle={archiveTarget?.title}
            archiving={archiving}
            onOpenChange={(open) => {
               if (!open && !archiving) setArchiveTarget(null);
            }}
            onConfirm={() => handleArchiveConfirm(archiveTarget?.id)}
         />
      </MentorPageShell>
   );
}