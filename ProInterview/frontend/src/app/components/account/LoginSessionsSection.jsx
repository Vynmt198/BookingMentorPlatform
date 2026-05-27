import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Monitor, Key, ShieldAlert, Fingerprint } from "lucide-react";
import { toastApiError, toastApiSuccess, tryApi } from "../../utils/apiToast";
import {
  fetchAuthSessions,
  revokeAuthSession,
  getCurrentAuthSessionId,
} from "../../utils/auth";

function formatSessionWhen(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("vi-VN", {
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
      ? "Thu hồi phiên này sẽ đăng xuất bạn khỏi thiết bị hiện tại (access token bị vô hiệu ngay). Tiếp tục?"
      : "Thu hồi phiên đăng nhập trên thiết bị đó?";
    if (!window.confirm(msg)) return;
    setRevokingId(sessionId);
    const res = await tryApi(() => revokeAuthSession(sessionId), {
      fallback: "Không thu hồi được phiên.",
      successMessage: isCurrent ? "Đã đăng xuất phiên hiện tại." : "Đã thu hồi phiên.",
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

  const suspiciousSessions = sessions.filter((s) => s.isSuspicious);

  return (
    <SectionCard title="Phiên đăng nhập & thiết bị" icon={Key}>
      <p className="mb-4 text-sm text-slate-600">
        Mỗi lần đăng nhập tạo một phiên refresh riêng. Dấu vân tay thiết bị (UA + IP) giúp phát hiện đăng nhập lạ.
      </p>

      {security?.hasSuspiciousLogin && (
        <div className="mb-4 flex gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <div>
            <p className="text-sm font-bold text-amber-950">Cảnh báo đăng nhập lạ</p>
            <p className="mt-1 text-sm text-amber-900/90">
              Có {security.suspiciousSessionCount} phiên khác thiết bị so với phiên bạn đang dùng
              {security.currentFingerprintShort
                ? ` (hiện tại: ${security.currentFingerprintShort})`
                : ""}
              . Nếu không phải bạn, hãy thu hồi phiên đó và đổi mật khẩu.
            </p>
          </div>
        </div>
      )}

      {loading && (
        <p className="text-sm font-medium text-slate-500">Đang tải phiên đăng nhập…</p>
      )}
      {error && !loading && (
        <p className="text-sm font-medium text-red-600">{error}</p>
      )}
      {!loading && !error && sessions.length === 0 && (
        <p className="text-sm font-medium text-slate-500">Không có phiên đăng nhập nào.</p>
      )}

      <div className="space-y-3">
        {sessions.map((sess) => {
          const isCurrent = sess.id === currentId || sess.isCurrent;
          const suspicious = Boolean(sess.isSuspicious);
          return (
            <div
              key={sess.id}
              className={`flex flex-col gap-4 rounded-2xl border p-5 sm:flex-row sm:items-center sm:justify-between ${
                suspicious
                  ? "border-amber-300 bg-amber-50/60"
                  : isCurrent
                    ? "border-emerald-300 bg-emerald-50/40"
                    : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex min-w-0 items-start gap-4">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                    suspicious ? "bg-amber-100 text-amber-800" : "bg-[#93f72b]/12 text-[#4d6600]"
                  }`}
                >
                  {suspicious ? <ShieldAlert size={20} strokeWidth={2} /> : <Monitor size={20} strokeWidth={2} />}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold text-slate-900">
                      {sess.deviceLabel || "Thiết bị không xác định"}
                    </p>
                    {isCurrent && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-800">
                        Đang dùng
                      </span>
                    )}
                    {suspicious && (
                      <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-950">
                        Đăng nhập lạ
                      </span>
                    )}
                  </div>
                  <p className="mt-1 flex flex-wrap items-center gap-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                    {sess.ip ? <span>IP: {sess.ip}</span> : null}
                    {sess.ip ? <span>·</span> : null}
                    <span>{formatSessionWhen(sess.lastUsedAt || sess.createdAt)}</span>
                  </p>
                  {sess.fingerprintShort ? (
                    <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                      <Fingerprint size={14} className="shrink-0 text-violet-600" />
                      <span title={sess.fingerprint || ""}>
                        Dấu vân tay: <span className="font-mono text-slate-800">{sess.fingerprintShort}</span>
                      </span>
                    </p>
                  ) : null}
                  {sess.expiresAt ? (
                    <p className="mt-1 text-[10px] text-slate-500">
                      Hết hạn refresh: {formatSessionWhen(sess.expiresAt)}
                    </p>
                  ) : null}
                </div>
              </div>
              <button
                type="button"
                disabled={revokingId === sess.id}
                onClick={() => handleRevoke(sess.id)}
                className={`self-start rounded-xl border px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-colors disabled:opacity-50 sm:self-center ${
                  isCurrent
                    ? "border-slate-300 text-slate-600 hover:border-red-300 hover:text-red-600"
                    : suspicious
                      ? "border-amber-400 bg-amber-100 text-amber-950 hover:bg-amber-200"
                      : "border-slate-300 text-slate-600 hover:border-red-300 hover:text-red-600"
                }`}
              >
                {revokingId === sess.id
                  ? "Đang thu hồi…"
                  : isCurrent
                    ? "Đăng xuất phiên này"
                    : "Thu hồi"}
              </button>
            </div>
          );
        })}
      </div>

      {!loading && suspiciousSessions.length > 0 && (
        <p className="mt-4 text-xs text-slate-500">
          Gợi ý: thu hồi các phiên “Đăng nhập lạ” nếu bạn không nhận ra thiết bị đó.
        </p>
      )}
    </SectionCard>
  );
}
