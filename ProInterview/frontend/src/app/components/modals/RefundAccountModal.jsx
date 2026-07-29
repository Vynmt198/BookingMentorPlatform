import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Mail, Copy, Check, ExternalLink } from "lucide-react";
import { SUPPORT_EMAIL } from "../../constants/brandVoice";

const vnd = (n) => `${Math.round(Number(n) || 0).toLocaleString("vi-VN")}đ`;

/**
 * Hướng dẫn học viên gửi thông tin nhận hoàn tiền cho quản trị viên qua email.
 *
 * Chỉ soạn sẵn nội dung — không lưu gì xuống hệ thống. Học viên tự gửi từ hòm thư của mình, nên
 * quản trị viên có luôn địa chỉ email để trả lời và đối chiếu danh tính người yêu cầu hoàn tiền.
 */
export function RefundAccountModal({ booking, onClose }) {
  const [copied, setCopied] = useState("");

  const amount = Number(booking?.cancelRefundAmountVnd ?? booking?.totalAmount ?? 0);
  const bookingId = String(booking?.id || booking?._id || "");

  const subject = useMemo(
    () => `[Hoàn tiền] Buổi hẹn ${booking?.date || ""} ${booking?.timeSlot || ""} — mã ${bookingId.slice(-8)}`.trim(),
    [booking?.date, booking?.timeSlot, bookingId],
  );

  const body = useMemo(
    () =>
      [
        "Kính gửi bộ phận hỗ trợ ProInterview,",
        "",
        booking?.mentorName
          ? `Buổi hẹn của tôi đã bị hủy do cố vấn ${booking.mentorName} bị khóa.`
          : "Buổi hẹn của tôi đã bị hủy do cố vấn bị khóa.",
        "Tôi xin cung cấp thông tin để nhận tiền hoàn:",
        "",
        `• Mã lịch hẹn: ${bookingId}`,
        `• Buổi hẹn: ${booking?.date || "—"} lúc ${booking?.timeSlot || "—"}`,
        `• Cố vấn: ${booking?.mentorName || "—"}`,
        `• Số tiền được hoàn: ${vnd(amount)}`,
        "",
        "Thông tin tài khoản nhận tiền:",
        "• Ngân hàng: (điền tên ngân hàng)",
        "• Số tài khoản: (điền số tài khoản)",
        "• Chủ tài khoản: (điền tên in trên thẻ, viết HOA không dấu)",
        "",
        "Mong quý bộ phận hỗ trợ chuyển khoản hoàn tiền. Xin cảm ơn.",
      ].join("\n"),
    [bookingId, booking?.date, booking?.timeSlot, booking?.mentorName, amount],
  );

  const mailtoUrl = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  /** Gmail compose trên web — không phụ thuộc máy có cài sẵn ứng dụng mail hay không. */
  const gmailUrl =
    "https://mail.google.com/mail/?view=cm&fs=1" +
    `&to=${encodeURIComponent(SUPPORT_EMAIL)}` +
    `&su=${encodeURIComponent(subject)}` +
    `&body=${encodeURIComponent(body)}`;

  const copy = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(""), 1800);
    } catch {
      setCopied("");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]"
      onClick={onClose}
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
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-violet-200 bg-violet-50 text-violet-600">
            <Mail size={20} />
          </div>
          <div className="min-w-0">
            <h4 className="text-lg font-black tracking-tight text-slate-900">Yêu cầu hoàn tiền</h4>
            <p className="mt-0.5 text-sm font-semibold text-slate-600">
              Gửi email cho bộ phận hỗ trợ kèm tài khoản ngân hàng của bạn.
            </p>
          </div>
        </div>

        {amount > 0 ? (
          <div className="mt-4 flex items-baseline justify-between rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <span className="text-sm font-semibold text-emerald-800">Số tiền được hoàn</span>
            <span className="text-lg font-black tabular-nums text-emerald-900">{vnd(amount)}</span>
          </div>
        ) : null}

        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Gửi tới</span>
            <button
              type="button"
              onClick={() => copy(SUPPORT_EMAIL, "email")}
              className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-violet-700 hover:text-violet-900"
            >
              {copied === "email" ? <Check size={12} /> : <Copy size={12} />}
              {copied === "email" ? "Đã chép" : "Chép"}
            </button>
          </div>
          <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm text-slate-900">
            {SUPPORT_EMAIL}
          </p>
        </div>

        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Nội dung mẫu</span>
            <button
              type="button"
              onClick={() => copy(body, "body")}
              className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-violet-700 hover:text-violet-900"
            >
              {copied === "body" ? <Check size={12} /> : <Copy size={12} />}
              {copied === "body" ? "Đã chép" : "Chép nội dung"}
            </button>
          </div>
          <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-slate-700">
            {body}
          </pre>
          <p className="mt-2 text-xs font-semibold text-amber-700">
            Nhớ thay 3 dòng trong ngoặc bằng thông tin ngân hàng thật của bạn trước khi gửi.
          </p>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-700 transition-all hover:border-slate-400"
          >
            Đóng
          </button>
          <a
            href={gmailUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl border border-violet-300 bg-[#8037f4] px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:opacity-95"
          >
            <ExternalLink size={14} />
            Soạn trên Gmail
          </a>
        </div>

        {/* Người không dùng Gmail vẫn cần một đường ra — mailto mở ứng dụng mail mặc định. */}
        <a
          href={mailtoUrl}
          className="mt-3 block text-center text-xs font-semibold text-slate-500 underline underline-offset-2 hover:text-slate-700"
        >
          Hoặc mở bằng ứng dụng email mặc định
        </a>
      </motion.div>
    </motion.div>
  );
}
