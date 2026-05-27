import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import {
   Plus,
   Search,
   Users,
   Star,
   BookOpen,
   CircleDollarSign,
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

function formatCompactNumber(value) {
   const n = Number(value) || 0;
   if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
   if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
   if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
   return String(n);
}

const STATUS_LABELS = {
   published: "Đã đăng",
   pending_review: "Chờ duyệt mới",
   pending_update: "Chờ duyệt cập nhật",
   draft: "Bản nháp",
   archived: "Đã lưu trữ",
};

function mapCourseRow(c) {
   return {
      id: c._id,
      title: c.title,
      status: c.status || "draft",
      adminModerationNote: mapCourseAdminModerationNote(c),
      students: c.stats?.enrollmentCount || 0,
      rating: c.stats?.rating || 0,
      earnings: c.stats?.totalRevenue || 0,
      cover: mediaSrc(c.thumbnail, DEFAULT_COURSE_THUMB),
      level:
         c.level === "basic"
            ? "Basic"
            : c.level === "intermediate"
              ? "Intermediate"
              : "Advanced",
   };
}

export function MentorCourseManagement() {
   const navigate = useNavigate();
   const user = getUser();
   const [activeTab, setActiveTab] = useState("all");
   const [search, setSearch] = useState("");
  const [myCourses, setMyCourses] = useState([]);
   const [archiveTarget, setArchiveTarget] = useState(null);
   const [archiving, setArchiving] = useState(false);

   const loadCourses = useCallback(() => {
      fetchMyMentorCourses().then((res) => {
         if (!res.success || !Array.isArray(res.courses)) {
            setMyCourses([]);
            if (!res.success) toastApiError(res.error, "Không tải được khóa học của bạn.");
            return;
         }
         setMyCourses(res.courses.map(mapCourseRow));
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
   const totalCourses = activeCourses.length;
   const totalStudents = activeCourses.reduce((sum, c) => sum + (Number(c.students) || 0), 0);
   const totalRevenue = activeCourses.reduce((sum, c) => sum + (Number(c.earnings) || 0), 0);
   const ratedCourses = activeCourses.filter((c) => Number(c.rating) > 0);
   const avgRating = ratedCourses.length
      ? (ratedCourses.reduce((sum, c) => sum + Number(c.rating), 0) / ratedCourses.length).toFixed(1)
      : "0.0";

   return (
      <MentorPageShell bottomPad="pb-32">
         <div className="relative z-10 mx-auto max-w-7xl px-8 pb-8">
            {/* Header Unit */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
               <div>
                  <div className="flex items-center gap-3 text-[10px] font-black text-violet-700 uppercase tracking-[0.3em] mb-4">
                     <Shapes size={14} /> Hệ thống Đào tạo
                  </div>
                  <h1 className="mb-3 font-headline text-2xl font-black uppercase leading-none tracking-tight text-slate-900 sm:text-3xl">
                     Khóa học <span className="text-violet-700">của tôi</span>
                  </h1>
                  <p className="text-slate-600 text-sm font-medium">Xây dựng nội dung, theo dõi doanh thu và học viên của bạn</p>
               </div>
               <div className="flex gap-4">
                  <button onClick={() => navigate("/mentor/courses/new/edit")} className="px-10 py-5 rounded-3xl bg-primary-fixed text-black text-xs font-black uppercase tracking-widest hover:scale-105 transition-all shadow-[0_15px_40px_rgba(196, 255, 71,0.3)] flex items-center gap-3">
                     <Plus size={20} /> Tạo khóa học mới
                  </button>

               </div>
            </div>

            {/* Course Analytics Bar */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-14">
               {[
                  { label: "Tổng khóa học", value: totalCourses, icon: BookOpen, color: "#8037f4" },
                  { label: "Tổng học viên", value: formatCompactNumber(totalStudents), icon: Users, color: "#93f72b" },
                  { label: "Rating trung bình", value: avgRating, icon: Star, color: "#f59e0b" },
                  { label: "Doanh thu tạm tính", value: formatCompactNumber(totalRevenue), icon: CircleDollarSign, color: "#d946ef" }
               ].map((stat, i) => (
                  <div key={i} className="glass-card p-7 group overflow-hidden">
                     <div className="relative z-10">
                        <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                           <stat.icon size={22} style={{ color: stat.color }} />
                        </div>
                        <h3 className="mb-2 text-2xl font-black leading-none tracking-tight text-slate-900 sm:text-3xl">{stat.value}</h3>
                        <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">{stat.label}</p>
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
                           className={`rounded-[18px] px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all sm:px-8 ${activeTab === t ? "bg-violet-600 text-white shadow-md" : "text-slate-600 hover:bg-white hover:text-slate-900"
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
                              <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${
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
                              <span className="rounded-xl border border-slate-200 bg-slate-100 px-4 py-1.5 text-[9px] font-black uppercase tracking-widest text-slate-600 backdrop-blur-md">
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
                                    className={`text-[9px] font-black uppercase tracking-widest ${
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
                                    <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-1">Học viên</p>
                                    <p className="text-sm font-black text-slate-900">{course.students.toLocaleString()}</p>
                                 </div>
                              </div>
                              <div className="flex items-center gap-3">
                                 <Star size={16} className="text-[#FFD600]" />
                                 <div>
                                    <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-1">Đánh giá</p>
                                    <p className="text-sm font-black text-slate-900">{course.rating > 0 ? course.rating : 'N/A'}</p>
                                 </div>
                              </div>
                           </div>
                           <div className="flex items-center gap-3">
                              <button
                                 type="button"
                                 onClick={() => navigate(`/mentor/courses/${course.id}/edit`)}
                                 disabled={course.status === "archived"}
                                 className="flex-1 py-4 rounded-2xl bg-slate-50 border border-slate-200 text-[10px] font-black uppercase tracking-widest hover:text-slate-900 hover:bg-slate-100 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
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
                     <p className="text-xs font-black uppercase tracking-[0.3em]">Thiết kế khóa học mới</p>
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