import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Smartphone, Laptop, ChevronRight, ShieldAlert, Key } from "lucide-react";
import { toastApiError, toastApiSuccess, tryApi } from "../../utils/apiToast";
import {
  fetchAuthSessions,
  revokeAuthSession,
  getCurrentAuthSessionId,
} from "../../utils/auth";

const ITEM_DESC_CLS = "text-sm text-slate-500 leading-relaxed tracking-normal";

function formatRelativeWhen(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const now = new Date();
    const time = d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
    const sameDay =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday =
      d.getDate() === yesterday.getDate() &&
      d.getMonth() === yesterday.getMonth() &&
      d.getFullYear() === yesterday.getFullYear();

    if (sameDay) return `Hôm nay lúc ${time}`;
    if (isYesterday) return `Hôm qua lúc ${time}`;
    return d.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function deviceDisplayName(sess) {
  const ua = String(sess.userAgent || "");
  if (/iPhone|iPad/i.test(ua)) return "Apple";
  if (/Macintosh|Mac OS X/i.test(ua)) return "Máy Mac";
  if (/Android/i.test(ua) && /Mobile/i.test(ua)) return "Android";
  if (/Android/i.test(ua)) return "Android";
  if (/Windows/i.test(ua)) return "Windows";
  return sess.deviceLabel || "Thiết bị không xác định";
}

function isMobileDevice(sess) {
  const ua = String(sess.userAgent || "");
  return /iPhone|iPad|Android.*Mobile|Mobile/i.test(ua);
}

function sessionMetaLine(sess) {
  const when = formatRelativeWhen(sess.lastUsedAt || sess.createdAt);
  return when ? `Việt Nam · ${when}` : "Việt Nam";
}

function SessionRow({ sess, isCurrent, suspicious, onRevoke, revoking, showChevron = true }) {
  const DeviceIcon = isMobileDevice(sess) ? Smartphone : Laptop;

  return (
    <div
      className={`flex items-center gap-4 border-b border-slate-100 py-4 last:border-b-0 ${
        suspicious ? "bg-amber-50/50 -mx-2 px-2 rounded-xl" : ""
      }`}
    >
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
          suspicious ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"
        }`}
      >
        <DeviceIcon size={20} strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-bold text-slate-900">{deviceDisplayName(sess)}</p>
          {isCurrent && (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
              Đang dùng
            </span>
          )}
          {suspicious && (
            <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-semibold text-amber-950">
              Đăng nhập lạ
            </span>
          )}
        </div>
        <p className="mt-0.5 text-sm text-slate-500">{sessionMetaLine(sess)}</p>
        {isCurrent && (
          <button
            type="button"
            disabled={revoking}
            onClick={onRevoke}
            className="mt-2 text-sm font-semibold text-[#8037f4] hover:underline disabled:opacity-50"
          >
            {revoking ? "Đang đăng xuất…" : "Đăng xuất phiên này"}
          </button>
        )}
      </div>
      {/* Phiên đang dùng: chỉ link chữ, không mũi tên (tránh trùng hành động + confirm browser) */}
      {showChevron && !isCurrent && (
        <button
          type="button"
          disabled={revoking}
          onClick={onRevoke}
          className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Thu hồi phiên đăng nhập"
          title="Thu hồi phiên"
        >
          <ChevronRight size={20} strokeWidth={2} />
        </button>
      )}
    </div>
  );
}

export function LoginSessionsSection({ SectionCard }) {
  const navigate = useNavigate();
  const currentId = getCurrentAuthSessionId();
  const [sessions, setSessions] = useState([]);
  const [security, setSecurity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revokingId, setRevokingId] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    const res = await tryApi(() => fetchAuthSessions(), {
      fallback: "Không tải được danh sách phiên.",
      silent: true,
    });
    if (!res.success) {
      const msg = res.error || "Không tải được danh sách phiên.";
      setError(msg);
      setSessions([]);
      setSecurity(null);
      toastApiError(msg);
    } else {
      setSessions(res.sessions || []);
      setSecurity(res.security || null);
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const handleRevoke = async (sessionId) => {
    if (!sessionId) return;
    const isCurrent = sessionId === currentId;
    const msg = isCurrent
      ? "Đăng xuất khỏi thiết bị này? Bạn sẽ cần đăng nhập lại."
      : "Thu hồi phiên đăng nhập trên thiết bị đó?";
    if (!window.confirm(msg)) return;
    setRevokingId(sessionId);
    const res = await tryApi(() => revokeAuthSession(sessionId), {
      fallback: "Không thu hồi được phiên.",
      successMessage: isCurrent ? "Đã đăng xuất." : "Đã thu hồi phiên.",
    });
    setRevokingId("");
    if (!res.success) return;
    if (isCurrent) {
      navigate("/");
      return;
    }
    toastApiSuccess("Đã thu hồi phiên lạ.");
    await load();
  };

  const currentSession = sessions.find((s) => s.id === currentId || s.isCurrent);
  const otherSessions = sessions.filter((s) => s.id !== currentId && !s.isCurrent);
  const suspiciousOthers = otherSessions.filter((s) => s.isSuspicious);

  return (
    <SectionCard title="Phiên đăng nhập & thiết bị" icon={Key}>
      <p className={`mb-6 ${ITEM_DESC_CLS}`}>
        Theo dõi các thiết bị đang đăng nhập vào tài khoản ProInterview của bạn.
      </p>

      {security?.hasSuspiciousLogin && (
        <div className="mb-6 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <div>
            <p className="text-sm font-bold text-amber-950">Cảnh báo đăng nhập lạ</p>
            <p className={`mt-1 ${ITEM_DESC_CLS} text-amber-900/90`}>
              Có {security.suspiciousSessionCount} phiên từ thiết bị khác so với phiên bạn đang
              dùng. Nếu không phải bạn, hãy thu hồi phiên đó và đổi mật khẩu.
            </p>
          </div>
        </div>
      )}

      {loading && (
        <p className="text-sm font-medium text-slate-500">Đang tải phiên đăng nhập…</p>
      )}
      {error && !loading && <p className="text-sm font-medium text-red-600">{error}</p>}
      {!loading && !error && sessions.length === 0 && (
        <p className="text-sm font-medium text-slate-500">Không có phiên đăng nhập nào.</p>
      )}

      {!loading && !error && sessions.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 sm:px-5">
          {currentSession && (
            <SessionRow
              sess={currentSession}
              isCurrent
              suspicious={Boolean(currentSession.isSuspicious)}
              revoking={revokingId === currentSession.id}
              onRevoke={() => handleRevoke(currentSession.id)}
            />
          )}

          {otherSessions.length > 0 && (
            <>
              <p
                className={`text-xs font-bold uppercase tracking-wide text-slate-600 ${
                  currentSession ? "border-t border-slate-100 pt-4" : "pt-4"
                }`}
              >
                Lần đăng nhập trên thiết bị khác
              </p>
              {otherSessions.map((sess) => (
                <SessionRow
                  key={sess.id}
                  sess={sess}
                  isCurrent={false}
                  suspicious={Boolean(sess.isSuspicious)}
                  revoking={revokingId === sess.id}
                  onRevoke={() => handleRevoke(sess.id)}
                />
              ))}
            </>
          )}
        </div>
      )}

      {!loading && suspiciousOthers.length > 0 && (
        <p className={`mt-4 ${ITEM_DESC_CLS}`}>
          Gợi ý: thu hồi các phiên “Đăng nhập lạ” nếu bạn không nhận ra thiết bị đó.
        </p>
      )}
    </SectionCard>
  );
}
