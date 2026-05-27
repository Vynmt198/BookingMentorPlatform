import { useState } from "react";
import { useNavigate } from "react-router";
import { Trash2 as Trash } from "lucide-react";
import { toastApiError, toastApiSuccess, tryApi } from "../../utils/apiToast";
import { deleteAccount, getUser } from "../../utils/auth";

export function AccountDangerZone({ SectionCard, onLogout }) {
  const navigate = useNavigate();
  const user = getUser();
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const email = (user?.email || "").trim().toLowerCase();
  const canDelete = email && confirmText.trim().toLowerCase() === email;

  const handleDeleteAccount = async () => {
    if (!canDelete) {
      toastApiError("Nhập đúng email tài khoản để xác nhận.");
      return;
    }
    if (!window.confirm("Xóa vĩnh viễn tài khoản và dữ liệu liên quan? Hành động không thể hoàn tác.")) {
      return;
    }
    setDeleting(true);
    const res = await tryApi(() => deleteAccount(), { fallback: "Không xóa được tài khoản." });
    setDeleting(false);
    if (!res.success) return;
    toastApiSuccess(res.message || "Đã xóa tài khoản.");
    navigate("/");
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <SectionCard title="Tài khoản" icon={Trash}>
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-6">
          <p className="mb-4 text-sm font-semibold text-slate-600">
            Đăng xuất khỏi thiết bị hiện tại nhưng giữ tài khoản.
          </p>
          <button
            type="button"
            onClick={onLogout}
            className="rounded-2xl border border-slate-300 px-8 py-3 text-[10px] font-black uppercase tracking-widest text-slate-700 transition-colors hover:bg-slate-100"
          >
            Đăng xuất
          </button>
        </div>
      </SectionCard>

      <SectionCard title="Xóa tài khoản" icon={Trash}>
        <div className="flex flex-col gap-6 rounded-2xl border border-red-300/40 bg-red-50/60 p-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-md">
            <h4 className="mb-3 text-2xl font-black tracking-tight text-slate-900">Vùng nguy hiểm</h4>
            <p className="text-sm font-semibold text-slate-600">
              Xóa vĩnh viễn tài khoản, hồ sơ mentor (nếu có) và phiên đăng nhập. Nhập email{" "}
              <span className="font-bold text-slate-900">{email || "của bạn"}</span> để xác nhận.
            </p>
            <input
              type="email"
              autoComplete="off"
              placeholder={email || "email@example.com"}
              className="input-glass mt-4 w-full"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
            />
          </div>
          <button
            type="button"
            disabled={!canDelete || deleting}
            onClick={handleDeleteAccount}
            className="rounded-2xl border border-red-400 bg-red-500 px-10 py-4 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {deleting ? "Đang xóa…" : "Xóa tài khoản vĩnh viễn"}
          </button>
        </div>
      </SectionCard>
    </div>
  );
}

export default AccountDangerZone;
