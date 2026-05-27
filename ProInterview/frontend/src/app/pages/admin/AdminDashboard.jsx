import React, { useState, useEffect } from "react";
import { Link } from "react-router";
import {
  Users,
  GraduationCap,
  Calendar,
  Crown,
  LineChart,
  Star,
  MessageSquare,
  UserPlus,
  Banknote,
  Activity,
  ArrowRight,
  BookOpen,
} from "lucide-react";
import { adminApi } from "../../utils/adminApi";
import { toastApiError } from "../../utils/apiToast";

/** Cùng thứ tự ưu tiên với sidebar admin */
const TILES = [
  { to: "/admin/bookings", label: "Lịch hẹn & thanh toán", icon: Calendar, desc: "Lịch mentor, xác nhận CK SePay" },
  { to: "/admin/support", label: "Hỗ trợ", icon: MessageSquare, desc: "Khiếu nại, báo cáo mentor" },
  { to: "/admin/mentors/pending", label: "Duyệt cố vấn", icon: UserPlus, desc: "Hồ sơ chờ phê duyệt" },
  {
    to: "/admin/subscription-payments",
    label: "Gói Pro/Elite",
    icon: Crown,
    desc: "CK nâng cấp gói — SePay tự kích hoạt",
  },
  {
    to: "/admin/course-payments",
    label: "Học phí khóa",
    icon: BookOpen,
    desc: "Ghi danh CK — SePay mở khóa",
  },
  { to: "/admin/payouts", label: "Rút tiền cố vấn", icon: Banknote, desc: "Duyệt và chi trả mentor" },
  { to: "/admin/users", label: "Người dùng", icon: Users, desc: "Danh sách và chi tiết user" },
  { to: "/admin/mentors", label: "Cố vấn", icon: GraduationCap, desc: "Danh sách cố vấn" },
  { to: "/admin/content/courses", label: "Khóa học", icon: BookOpen, desc: "Duyệt và quản lý khóa" },
  { to: "/admin/reviews", label: "Đánh giá", icon: Star, desc: "Review mentor & khóa học" },
  { to: "/admin/analytics", label: "Phân tích", icon: LineChart, desc: "Báo cáo và biểu đồ" },
];

export function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getStats().then((res) => {
      if (res.success) setStats(res.stats);
      else toastApiError(res.error, "Không tải được thống kê admin.");
      setLoading(false);
    }).catch(() => {
      toastApiError("Lỗi kết nối khi tải dashboard admin.");
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="glass-card px-8 py-8">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[#8037f4]">
          ProInterview Command Center
        </p>
        <h1 className="font-headline text-5xl font-black tracking-tighter text-slate-900 sm:text-6xl">
          Xin chào, <span className="text-violet-700">Admin!</span>
        </h1>
        <p className="mt-3 text-sm font-medium text-slate-600">
          Trung tâm điều hành toàn bộ hệ thống ProInterview.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <StatCard
          label="Tổng người dùng"
          value={loading ? "..." : stats?.users || 0}
          icon={Users}
          color="#8037f4"
        />
        <StatCard
          label="Tổng cố vấn"
          value={loading ? "..." : stats?.mentors || 0}
          icon={GraduationCap}
          color="#84cc16"
        />
        <StatCard
          label="Lượt lịch hẹn"
          value={loading ? "..." : stats?.bookings || 0}
          icon={Activity}
          color="#f59e0b"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {TILES.map(({ to, label, icon: Icon, desc, highlight }) => (
          <Link
            key={to}
            to={to}
            className={`group glass-card border-slate-200/90 p-6 transition-all hover:border-violet-300/80 ${
              highlight ? "ring-2 ring-amber-400/50 border-amber-300/60 bg-amber-50/30" : ""
            }`}
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-violet-700 transition-all group-hover:border-[#93f72b]/60 group-hover:bg-[#93f72b]/20 group-hover:text-[#120B2E]">
              <Icon size={24} strokeWidth={2} />
            </div>
            <h2 className="flex items-center gap-2 text-base font-black text-slate-900 group-hover:text-violet-800">
              {label}{" "}
              <ArrowRight size={14} className="opacity-0 transition-all group-hover:opacity-100" />
            </h2>
            <p className="mt-2 text-[11px] font-medium leading-relaxed text-slate-500">{desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div className="glass-card flex items-center justify-between p-8 group">
      <div>
        <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p>
        <h3 className="origin-left text-4xl font-black tracking-tighter text-slate-900 transition-transform group-hover:scale-105">
          {value}
        </h3>
      </div>
      <div
        className="flex h-16 w-16 items-center justify-center rounded-[24px] border border-slate-200 bg-slate-50"
        style={{ color }}
      >
        <Icon size={32} strokeWidth={2.5} />
      </div>
    </div>
  );
}
