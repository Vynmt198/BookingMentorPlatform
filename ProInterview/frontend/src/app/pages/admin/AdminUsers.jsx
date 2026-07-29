import { useState, useEffect } from "react";
import { Link } from "react-router";
import { Users, Search, ShieldAlert, ShieldCheck, Mail, Tag } from "lucide-react";
import { adminApi } from "../../utils/adminApi";
import { tryApi } from "../../utils/apiToast";
import { LockAccountModal } from "../../components/modals/LockAccountModal";

const PAGE_SIZE = 25;

export function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  /** Tách khỏi `searchTerm` để mỗi lần gõ phím không bắn 1 request. */
  const [appliedSearch, setAppliedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });
  const [lockTarget, setLockTarget] = useState(null);
  const [lockBusy, setLockBusy] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAppliedSearch(searchTerm.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    let cancelled = false;
    const loadUsers = async () => {
      setLoading(true);
      const res = await tryApi(() => adminApi.getUsers({ page, limit: PAGE_SIZE, q: appliedSearch }), {
        fallback: "Không thể tải danh sách người dùng.",
      });
      // Bỏ qua kết quả của request cũ nếu người dùng đã đổi trang/từ khóa trong lúc chờ.
      if (cancelled) return;
      if (res.success) {
        setUsers(res.users ?? []);
        setPagination(res.pagination ?? { page, total: res.users?.length ?? 0, totalPages: 1 });
      }
      setLoading(false);
    };
    void loadUsers();
    return () => {
      cancelled = true;
    };
  }, [page, appliedSearch]);

  /** Khóa là thao tác treo tiền và lịch hẹn → mở modal cho admin xem trước rồi mới xác nhận. */
  const handleToggleActive = async (user, currentStatus) => {
    if (currentStatus) {
      setLockTarget({ id: user._id, name: user.name || user.email });
      return;
    }
    const res = await tryApi(() => adminApi.updateUserStatus(user._id, true), {
      fallback: "Không thể cập nhật trạng thái người dùng.",
      successMessage: "Đã mở khóa người dùng",
    });
    if (res.success) {
      setUsers((prev) => prev.map((u) => (u._id === user._id ? { ...u, isActive: true } : u)));
    }
  };

  const confirmLock = async (mode) => {
    setLockBusy(true);
    const res = await tryApi(() => adminApi.updateUserStatus(lockTarget.id, false, mode), {
      fallback: "Không thể cập nhật trạng thái người dùng.",
      successMessage: mode === "ban" ? "Đã cấm đăng nhập" : "Đã tạm ngưng hoạt động",
    });
    setLockBusy(false);
    if (res.success) {
      // Chế độ "suspend" không đụng `isActive` — tài khoản vẫn đăng nhập được.
      if (mode === "ban") {
        setUsers((prev) => prev.map((u) => (u._id === lockTarget.id ? { ...u, isActive: false } : u)));
      }
      setLockTarget(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div>
          <h2 className="font-headline mb-2 text-3xl font-black uppercase tracking-tighter text-slate-900">
            Quản lý <span className="text-violet-700">Người dùng</span>
          </h2>
          <p className="text-sm font-medium text-slate-600">
            {pagination.total > 0
              ? `${pagination.total.toLocaleString("vi-VN")} tài khoản${appliedSearch ? ` khớp "${appliedSearch}"` : ""}.`
              : "Toàn bộ tài khoản đã đăng ký trên hệ thống."}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm email, tên..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-12 pr-6 text-sm text-slate-900 outline-none transition-all focus:border-violet-400 md:w-64"
            />
          </div>
        </div>
      </div>

      <div className="glass-card overflow-hidden border-slate-200/90">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/90">
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Người dùng / Email
                </th>
                <th className="px-8 py-6 text-center text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Vai trò
                </th>
                <th className="px-8 py-6 text-center text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Gói cước
                </th>
                <th className="px-8 py-6 text-center text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Trạng thái
                </th>
                <th className="px-8 py-6 text-right text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-8 py-20 text-center text-[10px] font-black uppercase italic tracking-widest text-slate-500">
                    Đang tải dữ liệu người dùng...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-8 py-20 text-center text-[10px] font-black uppercase italic tracking-widest text-slate-500">
                    {appliedSearch ? `Không tìm thấy tài khoản khớp "${appliedSearch}".` : "Không có dữ liệu người dùng."}
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user._id} className="group transition-colors hover:bg-violet-50/40">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="flex size-10 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 text-slate-400 transition-colors group-hover:border-violet-200 group-hover:text-violet-700">
                          {user.avatar ? (
                            <img src={user.avatar} alt="" className="size-full object-cover" />
                          ) : (
                            <Users size={20} />
                          )}
                        </div>
                        <div>
                          <Link to={`/admin/users/${user._id}`} className="font-black text-slate-900 hover:text-violet-700">
                            {user.name}
                          </Link>
                          <p className="flex items-center gap-1 text-[10px] text-slate-500">
                            <Mail size={10} /> {user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex justify-center">
                        <span
                          className={`rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-widest ${
                            user.role === "admin"
                              ? "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700"
                              : user.role === "mentor"
                                ? "border-lime-200 bg-lime-50 text-lime-900"
                                : "border-slate-200 bg-slate-100 text-slate-600"
                          }`}
                        >
                          {user.role}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <span className="flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-600">
                        <Tag size={12} className="text-violet-600" /> {user.plan || "free"}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex justify-center">
                        {user.isActive !== false ? (
                          <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-600">
                            <ShieldCheck size={12} /> Hoạt động
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-red-600">
                            <ShieldAlert size={12} /> Đã khóa
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(user, user.isActive !== false)}
                        className={`rounded-xl border px-4 py-2 text-[9px] font-black uppercase tracking-widest transition-all ${
                          user.isActive !== false
                            ? "border-red-200 bg-red-50 text-red-700 hover:border-red-400 hover:bg-red-600 hover:text-white"
                            : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:border-emerald-400 hover:bg-emerald-600 hover:text-white"
                        }`}
                      >
                        {user.isActive !== false ? "Khóa" : "Mở khóa"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination.totalPages > 1 ? (
          <div className="flex items-center justify-between gap-4 border-t border-slate-200 bg-slate-50/60 px-8 py-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              Trang {pagination.page} / {pagination.totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={loading || page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-[9px] font-black uppercase tracking-widest text-slate-700 transition-all hover:border-violet-400 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:text-slate-700"
              >
                Trước
              </button>
              <button
                type="button"
                disabled={loading || page >= pagination.totalPages}
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-[9px] font-black uppercase tracking-widest text-slate-700 transition-all hover:border-violet-400 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:text-slate-700"
              >
                Sau
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {lockTarget ? (
        <LockAccountModal
          userId={lockTarget.id}
          displayName={lockTarget.name}
          variant="user"
          busy={lockBusy}
          onCancel={() => !lockBusy && setLockTarget(null)}
          onConfirm={confirmLock}
        />
      ) : null}
    </div>
  );
}
