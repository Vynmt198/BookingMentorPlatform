import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ShieldAlert, Wallet, CalendarClock, AlertTriangle, Loader2, Info, RotateCcw } from "lucide-react";
import { adminApi } from "../../utils/adminApi";

const vnd = (n) => `${Math.round(Number(n) || 0).toLocaleString("vi-VN")}đ`;

function Row({ label, value, muted = false, strong = false }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <span className={`text-sm ${muted ? "text-slate-500" : "font-semibold text-slate-700"}`}>{label}</span>
      <span className={`tabular-nums ${strong ? "text-base font-black text-slate-900" : "text-sm font-bold text-slate-800"}`}>
        {value}
      </span>
    </div>
  );
}

function Section({ icon: Icon, title, tone = "slate", children }) {
  const tones = {
    slate: "border-slate-200 bg-slate-50/70",
    amber: "border-amber-200 bg-amber-50/70",
    violet: "border-violet-200 bg-violet-50/60",
  };
  return (
    <div className={`rounded-2xl border p-4 ${tones[tone]}`}>
      <div className="mb-2 flex items-center gap-2">
        <Icon size={14} className="text-slate-500" />
        <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-500">{title}</h5>
      </div>
      {children}
    </div>
  );
}

/**
 * Hộp thoại xác nhận trước khi khóa/tạm ngưng một tài khoản.
 *
 * Tự tải `GET /api/admin/users/:id/impact` để liệt kê đúng cái gì sẽ bị treo — thay cho
 * `window.confirm` chỉ có một câu chung chung.
 *
 * `variant`:
 *   "user"   — từ trang Người dùng: cho chọn giữa tạm ngưng và cấm đăng nhập (nếu là mentor).
 *   "mentor" — từ trang Cố vấn: luôn là tạm ngưng hoạt động, mentor vẫn đăng nhập được.
 */
export function LockAccountModal({ userId, displayName, variant = "user", busy = false, onCancel, onConfirm }) {
  const [impact, setImpact] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mode, setMode] = useState("suspend");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const res = await adminApi.getUserImpact(userId);
      if (cancelled) return;
      if (res.success) setImpact(res.impact);
      else setError(res.error || "Không tải được thông tin tác động.");
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const isMentor = Boolean(impact?.mentor);
  const canChooseMode = variant === "user" && isMentor;
  const effectiveMode = variant === "mentor" ? "suspend" : canChooseMode ? mode : "ban";
  const f = impact?.mentor?.finance;
  const s = impact?.asStudent;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]"
      onClick={() => !busy && onCancel()}
    >
      <motion.div
        initial={{ scale: 0.96, y: 12, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        role="dialog"
        aria-modal="true"
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-600">
            <ShieldAlert size={20} />
          </div>
          <div className="min-w-0">
            <h4 className="text-lg font-black tracking-tight text-slate-900">
              {variant === "mentor" ? "Tạm ngưng cố vấn" : "Khóa tài khoản"}
            </h4>
            <p className="mt-0.5 truncate text-sm font-semibold text-slate-600">
              {displayName || impact?.user?.name || impact?.user?.email || "—"}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm font-semibold text-slate-500">
            <Loader2 size={16} className="animate-spin" /> Đang kiểm tra tác động…
          </div>
        ) : error ? (
          <p className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</p>
        ) : (
          <div className="mt-5 space-y-3">
            {isMentor ? (
              <Section icon={Wallet} title="Số dư cố vấn" tone="amber">
                <Row label="Đang trong thời gian giữ" value={vnd(f.clearingBalance)} muted />
                <Row label="Khả dụng (rút được)" value={vnd(f.availableBalance)} muted />
                <Row label="Đang chờ chi" value={vnd(f.pendingBalance)} muted />
                <div className="mt-2 border-t border-amber-200 pt-2">
                  <Row label="Tổng" value={vnd(f.total)} strong />
                </div>
              </Section>
            ) : null}

            {isMentor && impact.mentor.bookingsToRefund > 0 ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <RotateCcw size={14} className="text-red-600" />
                  <h5 className="text-[10px] font-black uppercase tracking-widest text-red-700">
                    Sẽ hoàn tiền cho học viên
                  </h5>
                </div>
                <Row label="Buổi đã bán sẽ bị hủy" value={impact.mentor.bookingsToRefund} />
                <Row label="Tổng tiền phải hoàn" value={vnd(impact.mentor.bookingsToRefundVnd)} strong />
                <p className="mt-2 border-t border-red-200 pt-2 text-xs font-semibold leading-relaxed text-red-800">
                  Các buổi này bị hủy ngay, hoàn <b>100%</b> (không trừ phí hủy) và học viên nhận thông
                  báo kèm hướng dẫn cung cấp tài khoản nhận tiền. Bạn cần chuyển khoản hoàn tay ở mục
                  Giao dịch.
                </p>
              </div>
            ) : null}

            {isMentor && (impact.mentor.openPayoutRequests > 0 || impact.mentor.unclearedRows > 0 || impact.mentor.failedClearances > 0 || impact.mentor.upcomingBookings > 0) ? (
              <Section icon={CalendarClock} title="Việc còn dở với tư cách cố vấn">
                {impact.mentor.openPayoutRequests > 0 ? <Row label="Yêu cầu rút đang mở" value={impact.mentor.openPayoutRequests} /> : null}
                {impact.mentor.unclearedRows > 0 ? <Row label="Khoản chưa tới hạn giải phóng" value={impact.mentor.unclearedRows} /> : null}
                {impact.mentor.failedClearances > 0 ? <Row label="Khoản giải phóng lỗi cần đối soát" value={impact.mentor.failedClearances} /> : null}
                {impact.mentor.upcomingBookings > 0 ? <Row label="Buổi đã xác nhận chưa diễn ra" value={impact.mentor.upcomingBookings} /> : null}
              </Section>
            ) : null}

            {s && (s.unusedPaidBookings > 0 || s.planActive || s.heldPayments > 0 || s.activeEnrollments > 0) ? (
              <Section icon={Info} title="Với tư cách học viên">
                {s.unusedPaidBookings > 0 ? <Row label="Buổi đã thanh toán chưa diễn ra" value={s.unusedPaidBookings} /> : null}
                {s.activeEnrollments > 0 ? <Row label="Khóa học đã mua" value={s.activeEnrollments} /> : null}
                {s.planActive ? <Row label={`Gói ${s.plan} còn hạn tới`} value={new Date(s.planExpiresAt).toLocaleDateString("vi-VN")} /> : null}
                {s.heldPayments > 0 ? <Row label="Giao dịch đang giữ chờ xử lý" value={s.heldPayments} /> : null}
              </Section>
            ) : null}

            {canChooseMode ? (
              <Section icon={AlertTriangle} title="Mức độ" tone="violet">
                <label className="flex cursor-pointer items-start gap-3 rounded-xl p-2 hover:bg-white/70">
                  <input type="radio" name="lock-mode" className="mt-1" checked={mode === "suspend"} onChange={() => setMode("suspend")} />
                  <span className="text-sm">
                    <span className="font-black text-slate-900">Tạm ngưng hoạt động</span>
                    <span className="block text-slate-600">
                      Ẩn khỏi tìm kiếm, không nhận lịch và không đăng khóa học mới. <b>Vẫn đăng nhập được</b> để xem và rút số dư.
                    </span>
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl p-2 hover:bg-white/70">
                  <input type="radio" name="lock-mode" className="mt-1" checked={mode === "ban"} onChange={() => setMode("ban")} />
                  <span className="text-sm">
                    <span className="font-black text-slate-900">Cấm đăng nhập</span>
                    <span className="block text-slate-600">
                      Cắt phiên ngay lập tức. Cố vấn <b>không tự rút được tiền</b> — admin phải tạo yêu cầu rút thay mặt.
                    </span>
                  </span>
                </label>
              </Section>
            ) : null}

            <p className="rounded-2xl border border-slate-200 bg-white p-3 text-xs font-semibold leading-relaxed text-slate-600">
              {effectiveMode === "ban"
                ? "Người dùng sẽ bị đăng xuất ngay và không đăng nhập lại được."
                : "Cố vấn vẫn đăng nhập được. Tiền không bị đóng băng: các khoản đang giữ vẫn được giải phóng theo lịch."}
            </p>
          </div>
        )}

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-700 transition-all hover:border-slate-400 disabled:opacity-40"
          >
            Hủy
          </button>
          <button
            type="button"
            disabled={busy || loading || Boolean(error)}
            onClick={() => onConfirm(effectiveMode)}
            className="flex items-center justify-center gap-2 rounded-xl border border-red-300 bg-red-600 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-red-700 disabled:opacity-40"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : null}
            {effectiveMode === "ban" ? "Cấm đăng nhập" : "Tạm ngưng"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
