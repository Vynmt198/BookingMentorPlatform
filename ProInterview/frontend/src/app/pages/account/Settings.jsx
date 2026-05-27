import { MentorPageShell } from "../../components/mentor/MentorPageShell";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import {
  Bell,
  LogOut,
  CheckCircle,
  ShieldCheck,
  UserCircle,
  ChevronRight,
} from "lucide-react";
import { toastApiError, toastApiSuccess } from "../../utils/apiToast";
import { logout, getUser, updateUser, refreshUserProfile } from "../../utils/auth";
import { LoginSessionsSection } from "../../components/account/LoginSessionsSection";
import { AccountDangerZone } from "../../components/account/AccountDangerZone";

const NOTIF_PREFS_KEY = "prointerview_notif_prefs";

function loadNotifPrefs() {
  try {
    const raw = localStorage.getItem(NOTIF_PREFS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/* ─── Reusable components ───────────────────────────────── */
function ToggleSwitch({
  enabled,
  onChange,
  colorClass = "bg-primary-fixed",
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={`relative w-11 h-6 rounded-full transition-all duration-300 flex-shrink-0 focus:outline-none focus:ring-4 focus:ring-[#8037f4]/20 ${
        enabled ? colorClass : "bg-slate-300"
      }`}
    >
      <div
        className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-lg transition-transform duration-300 ${
          enabled ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

function SectionCard({
  children,
  className = "",
  title,
  icon: Icon
}) {
  return (
    <div className={`glass-card p-8 ${className}`}>
      {title && (
         <div className="relative z-10 mb-8 flex items-center gap-3 border-b border-slate-200 pb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-[#8037f4]">
               {Icon && <Icon size={18} strokeWidth={2} />}
            </div>
            <div>
               <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-700">{title}</h3>
            </div>
         </div>
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

function SaveBar({
  dirty,
  saving,
  saved,
  onSave,
  onReset,
}) {
  if (!dirty && !saved) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      className={`fixed bottom-10 right-10 left-auto z-50 flex items-center gap-6 px-10 py-5 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] border backdrop-blur-3xl transition-all ${
        saved
          ? "bg-emerald-600 border-emerald-400 text-white"
          : "bg-[#1a0d35]/95 border-white/10"
      }`}
    >
      {saved ? (
        <div className="flex items-center gap-3">
          <CheckCircle className="w-5 h-5" />
          <span className="text-[10px] font-black uppercase tracking-widest text-white">Đã đồng bộ thành công</span>
        </div>
      ) : (
        <>
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/45">Hệ thống có thay đổi</span>
          <div className="flex items-center gap-4">
            <button
              onClick={onReset}
              className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white/50 transition-colors hover:text-white"
            >
              Hủy
            </button>
            <button
              onClick={onSave}
              disabled={saving}
              className="px-8 py-3 rounded-2xl bg-primary-fixed text-black text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg disabled:opacity-50"
            >
              {saving ? "..." : "Lưu thay đổi"}
            </button>
          </div>
        </>
      )}
    </motion.div>
  );
}

/* ─── TAB: Notifications ────────────────────────────────── */
const DEFAULT_NOTIFS = [
  { id: "interview_reminder", label: "Nhắc nhở buổi phỏng vấn", description: "Thông báo trước 1 giờ khi có lịch", value: true },
  { id: "mentor_feedback", label: "Phản hồi từ Mentor", description: "Khi mentor gửi đánh giá luyện tập", value: true },
  { id: "streak_reminder", label: "Nhắc nhở duy trì streak", description: "Giữ ngọn lửa phỏng vấn của bạn", value: true },
];

function NotificationsTab() {
  const [push, setPush] = useState(() => {
    const saved = loadNotifPrefs();
    if (!saved) return DEFAULT_NOTIFS;
    return DEFAULT_NOTIFS.map((d) => {
      const hit = saved.find((s) => s.id === d.id);
      return hit ? { ...d, value: !!hit.value } : d;
    });
  });
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const toggle = (id) => {
    setPush((prev) => prev.map((t) => (t.id === id ? { ...t, value: !t.value } : t)));
    setDirty(true);
  };

  const handleSave = () => {
    setSaving(true);
    try {
      localStorage.setItem(
        NOTIF_PREFS_KEY,
        JSON.stringify(push.map(({ id, value }) => ({ id, value }))),
      );
      setDirty(false);
      toastApiSuccess("Đã lưu cài đặt thông báo");
    } catch {
      toastApiError("Không lưu được cài đặt trên trình duyệt.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <SectionCard title="Trung tâm Thông báo" icon={Bell}>
        <div className="space-y-4">
          {push.map((item) => (
            <div key={item.id} className="group flex items-center justify-between gap-6 rounded-2xl border border-slate-200 bg-white p-5">
              <div>
                <p className="mb-0.5 text-sm font-bold text-slate-900">{item.label}</p>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{item.description}</p>
              </div>
              <ToggleSwitch enabled={item.value} onChange={() => toggle(item.id)} colorClass="bg-[#7fe015]" />
            </div>
          ))}
        </div>
      </SectionCard>
      <SaveBar dirty={dirty} saving={saving} saved={false} onSave={handleSave} onReset={() => { setPush(DEFAULT_NOTIFS); setDirty(false); }} />
    </div>
  );
}

/* ─── TAB: Security ─────────────────────────────────────── */
const MIN_PASS = 6;
const DEFAULT_SECURITY_PREFS = [
  { id: "two_factor", label: "Xác thực 2 bước", description: "Trình quản lý hệ thống", value: false },
  { id: "login_alert", label: "Thông báo đăng nhập mới", description: "Trình quản lý hệ thống", value: true },
];

function SecurityTab({ profileFromServer, onProfileSynced }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [securityPrefs, setSecurityPrefs] = useState(DEFAULT_SECURITY_PREFS);
  /** Profile có `hasGoogleLogin` từ server (đồng bộ từ trang Settings + sau đổi MK) */
  const [sessionUser, setSessionUser] = useState(
    () => profileFromServer ?? getUser()
  );

  useEffect(() => {
    setSessionUser(profileFromServer ?? getUser());
  }, [profileFromServer]);

  const hasGoogleLogin = Boolean(sessionUser?.hasGoogleLogin);
  /** Chỉ bắt buộc MK hiện tại khi server báo không có Google */
  const needsCurrentPassword = !hasGoogleLogin;
  const toggleSecurityPref = (id) => {
    setSecurityPrefs((prev) => prev.map((item) => (item.id === id ? { ...item, value: !item.value } : item)));
  };

  const handleUpdatePassword = async () => {
    const np = newPassword.trim();
    const cp = confirmPassword.trim();
    if (np.length < MIN_PASS) {
      toastApiError(`Mật khẩu mới cần ít nhất ${MIN_PASS} ký tự.`);
      return;
    }
    if (np !== cp) {
      toastApiError("Mật khẩu xác nhận không khớp.");
      return;
    }
    if (needsCurrentPassword && !currentPassword.trim()) {
      toastApiError("Vui lòng nhập mật khẩu hiện tại.");
      return;
    }
    setSaving(true);
    try {
      const payload = { newPassword: np };
      if (needsCurrentPassword) {
        payload.currentPassword = currentPassword.trim();
      } else if (currentPassword.trim()) {
        payload.currentPassword = currentPassword.trim();
      }
      const result = await updateUser(payload);
      if (result?.success) {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        const u = await refreshUserProfile();
        const next = u ?? getUser();
        setSessionUser(next);
        onProfileSynced?.(next);
        toastApiSuccess("Đã cập nhật mật khẩu.");
      } else {
        toastApiError(result?.error, "Không lưu được mật khẩu.");
      }
    } catch {
      toastApiError("Lỗi kết nối khi đổi mật khẩu.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <SectionCard title="Bảo mật đăng nhập" icon={ShieldCheck}>
        <div className="space-y-6">
          {securityPrefs.map((item) => (
            <div key={item.id} className="group flex items-center justify-between gap-6 rounded-2xl border border-slate-200 bg-white p-5">
              <div>
                <p className="mb-0.5 text-sm font-bold text-slate-900">{item.label}</p>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{item.description}</p>
              </div>
              <ToggleSwitch
                enabled={item.value}
                onChange={() => toggleSecurityPref(item.id)}
                colorClass="bg-[#7fe015]"
              />
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Cấu hình Bảo mật" icon={ShieldCheck}>
         <div className="grid md:grid-cols-2 gap-8 mb-6">
            <div className="space-y-3 md:col-span-2">
               <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                 Mật khẩu hiện tại
                 {needsCurrentPassword ? (
                   <span className="text-amber-400/90"> — bắt buộc</span>
                 ) : (
                  <span className="text-slate-400"> — không bắt buộc (đã liên kết Google)</span>
                 )}
               </label>
               <input
                 type="password"
                 autoComplete="current-password"
                 placeholder={
                   needsCurrentPassword
                     ? "Nhập mật khẩu hiện tại"
                     : "Để trống hoặc nhập mật khẩu cũ nếu có"
                 }
                 className="input-glass w-full"
                 value={currentPassword}
                 onChange={(e) => setCurrentPassword(e.target.value)}
               />
            </div>
            <div className="space-y-3">
               <label className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Mật khẩu mới</label>
               <input
                 type="password"
                 autoComplete="new-password"
                 placeholder="••••••••"
                 className="input-glass w-full"
                 value={newPassword}
                 onChange={(e) => setNewPassword(e.target.value)}
               />
            </div>
            <div className="space-y-3">
               <label className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Xác nhận mật khẩu mới</label>
               <input
                 type="password"
                 autoComplete="new-password"
                 placeholder="••••••••"
                 className="input-glass w-full"
                 value={confirmPassword}
                 onChange={(e) => setConfirmPassword(e.target.value)}
               />
            </div>
         </div>
         <button
           type="button"
           disabled={saving}
           onClick={handleUpdatePassword}
           className="px-8 py-4 rounded-xl bg-slate-100 border border-slate-300 text-slate-700 text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all disabled:opacity-50"
         >
            {saving ? "Đang lưu…" : "Cập nhật mật khẩu"}
         </button>
      </SectionCard>

      <LoginSessionsSection SectionCard={SectionCard} />
    </div>
  );
}

/* ─── TAB: Account ──────────────────────────────────────── */
function AccountTab({ onLogout }) {
  return <AccountDangerZone SectionCard={SectionCard} onLogout={onLogout} />;
}

/* ─── Main Settings Page ────────────────────────────────── */
const TABS = [
  { id: "notifications", label: "Thông báo", icon: Bell },
  { id: "security", label: "Bảo mật", icon: ShieldCheck },
  { id: "account", label: "Tài khoản", icon: UserCircle },
];

export function Settings() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("notifications");
  /** Đồng bộ GET /me ngay khi vào Cài đặt — tránh tab Bảo mật đọc localStorage cũ thiếu hasGoogleLogin */
  const [profileFromServer, setProfileFromServer] = useState(() => getUser());

  useEffect(() => {
    let cancelled = false;
    refreshUserProfile().then((u) => {
      if (!cancelled) setProfileFromServer(u ?? getUser());
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <MentorPageShell bottomPad="pb-32">
      <style>{`
        .glass-card {
           background: #ffffff;
           backdrop-filter: none;
           border-radius: 28px;
           border: 1px solid rgba(148, 163, 184, 0.28);
           transition: transform 0.45s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.35s ease, box-shadow 0.45s ease;
           position: relative;
           overflow: hidden;
           box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
        }
        .glass-card::before {
           content: none;
        }
        .glass-card:hover {
           border-color: rgba(122, 35, 229, 0.28);
           transform: translateY(-2px);
           box-shadow: 0 16px 32px rgba(15, 23, 42, 0.08);
        }
        .settings-glass-nav {
           background: #ffffff;
           backdrop-filter: none;
           border: 1px solid rgba(148, 163, 184, 0.28);
        }
        .settings-glass-nav:hover { border-color: rgba(122, 35, 229, 0.22); }
        .font-headline {
          letter-spacing: -0.045em;
          text-shadow: none;
        }
        .input-glass {
           background: #ffffff;
           border: 1px solid #e2e8f0;
           border-radius: 14px;
           color: #0f172a;
           padding: 12px 16px;
           font-size: 0.875rem;
           font-weight: 500;
           letter-spacing: -0.01em;
           transition: border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
        }
        .input-glass:focus {
           background: #ffffff;
           border-color: rgba(122, 35, 229, 0.45);
           outline: none;
           box-shadow: 0 0 0 2px rgba(122, 35, 229, 0.12);
        }
        .input-glass::placeholder { color: #94a3b8; }
        @keyframes settings-shimmer {
          0% { opacity: 0.4; transform: translate(0,0) scale(1); }
          50% { opacity: 0.7; transform: translate(2%, -2%) scale(1.05); }
          100% { opacity: 0.4; transform: translate(0,0) scale(1); }
        }
      `}</style>

      {/* ── Hero ── */}
      <header className="relative border-b border-slate-200 pb-10 pt-8 sm:pb-12 sm:pt-10">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.11]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.55) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.45) 1px,transparent 1px)",
            backgroundSize: "32px 32px",
          }}
          aria-hidden
        />
        <div className="relative z-10 mx-auto max-w-6xl px-6 sm:px-8">
          <h1 className="font-headline app-page-title mb-2">
            Hệ thống Cài đặt
          </h1>
          <p className="app-page-subtitle">
            Quản trị cấu hình bảo mật và cá nhân hóa trải nghiệm ProInterview Web.
          </p>
        </div>
      </header>

      <div className="relative z-10 mx-auto mt-10 max-w-6xl px-6 sm:mt-12 sm:px-8">
         <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Sidebar Navigation */}
            <aside className="lg:col-span-3">
               <div className="settings-glass-nav sticky top-24 rounded-[28px] p-2">
                  {TABS.map((tab) => {
                     const isActive = tab.id === activeTab;
                     return (
                        <button
                           key={tab.id}
                           type="button"
                           onClick={() => setActiveTab(tab.id)}
                           className={`group relative mb-1 flex w-full items-center justify-between rounded-[20px] px-5 py-4 text-left transition-all last:mb-0 ${
                              isActive ? "bg-[#f7f1ff] text-[#1d1a26] shadow-lg shadow-violet-200/40" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                           }`}
                        >
                           <div className="flex items-center gap-3">
                              <tab.icon size={18} strokeWidth={2} className={`shrink-0 transition-transform duration-300 ${isActive ? "scale-105 text-black" : "group-hover:translate-x-0.5"}`} />
                              <span className="text-[10px] font-bold uppercase tracking-[0.18em]">{tab.label}</span>
                           </div>
                           {isActive && <ChevronRight size={14} className="shrink-0 text-black/35" strokeWidth={2} />}
                        </button>
                     );
                  })}
                  <div className="mt-2 border-t border-slate-200 pt-2">
                     <button type="button" onClick={handleLogout} className="flex w-full items-center gap-3 rounded-[20px] px-5 py-4 text-left text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300">
                        <LogOut size={18} strokeWidth={2} />
                        <span className="text-[10px] font-bold uppercase tracking-[0.18em]">Đăng xuất</span>
                     </button>
                  </div>
               </div>
            </aside>

            {/* Dynamic Content Area */}
            <main className="lg:col-span-9">
               <div className="min-h-[400px]">
                  {activeTab === "notifications" && <NotificationsTab />}
                  {activeTab === "security" && (
                    <SecurityTab
                      profileFromServer={profileFromServer}
                      onProfileSynced={(u) => setProfileFromServer(u)}
                    />
                  )}
                  {activeTab === "account" && (
                    <AccountTab onLogout={handleLogout} />
                  )}
               </div>
            </main>
         </div>
      </div>
    </MentorPageShell>
  );
}