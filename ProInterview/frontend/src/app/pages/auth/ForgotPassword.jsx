import React, { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Mail, CheckCircle2, AlertCircle } from "lucide-react";
import { BrandLogo } from "../../components/brand/BrandLogo";
import { requestPasswordReset } from "../../utils/auth";
import { toastApiError } from "../../utils/apiToast";

const INPUT_CLS =
  "w-full px-4 py-3.5 rounded-xl border border-gray-200 text-base outline-none transition-all " +
  "focus:border-[#8037f4] focus:ring-2 focus:ring-[#8037f4]/15 text-gray-900 placeholder-gray-400 " +
  "bg-white hover:bg-gray-50/50";

export function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [devResetUrl, setDevResetUrl] = useState("");
  const [error, setError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await requestPasswordReset(email.trim());
    setLoading(false);
    if (!res.success) {
      const msg = res.error || "Không thể gửi yêu cầu. Vui lòng thử lại.";
      setError(msg);
      toastApiError(msg);
      return;
    }
    setSent(true);
    setDevResetUrl(res.resetUrl || "");
  };

  return (
    <div className="min-h-screen bg-[#fcfaff] text-gray-900 antialiased">
      <div
        className="relative z-10 flex h-20 flex-shrink-0 items-center justify-between overflow-visible border-b px-10"
        style={{ borderColor: "rgba(128,55,244,0.1)" }}
      >
        <button onClick={() => navigate("/")} className="flex shrink-0 items-center gap-2.5 group" aria-label="Về trang chủ">
          <BrandLogo size="auth" />
        </button>
        <Link to="/login" className="text-sm font-semibold" style={{ color: "#8037f4" }}>
          Đăng nhập
        </Link>
      </div>

      <div className="mx-auto max-w-md px-6 py-12">
        <h1 className="mb-2 text-3xl font-black tracking-tight" style={{ letterSpacing: "-0.03em" }}>
          Quên mật khẩu
        </h1>
        <p className="mb-6 text-sm text-gray-600 leading-relaxed">
          Nhập email đã đăng ký. Nếu tài khoản có mật khẩu, hệ thống sẽ tạo link đặt lại mật khẩu.
        </p>

        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-300/40 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
            <p className="font-medium">{error}</p>
          </div>
        )}

        {sent ? (
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              <div>
                <p className="font-bold text-emerald-900">Đã gửi yêu cầu.</p>
                <p className="mt-1 text-sm text-emerald-900/80 leading-relaxed">
                  Nếu email tồn tại và tài khoản có mật khẩu, bạn sẽ nhận được hướng dẫn đặt lại.
                </p>
              </div>
            </div>

            {devResetUrl && (
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-white/70 p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-emerald-700 mb-2">
                  Dev link (không gửi email)
                </p>
                <a
                  href={devResetUrl}
                  className="break-all text-sm font-semibold text-[#8037f4] hover:underline"
                >
                  {devResetUrl}
                </a>
              </div>
            )}

            <div className="mt-5">
              <Link
                to="/login"
                className="inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-black text-white"
                style={{ background: "#8037f4" }}
              >
                Về trang đăng nhập
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <label className="block text-sm font-semibold text-gray-700 mb-1.5" htmlFor="fp-email">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                id="fp-email"
                type="email"
                required
                autoComplete="email"
                className={`${INPUT_CLS} pl-12`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-5 w-full rounded-2xl py-3.5 text-sm font-black text-white transition-all active:scale-[0.98] disabled:opacity-60"
              style={{ background: "#8037f4" }}
            >
              {loading ? "Đang gửi..." : "Gửi link đặt lại"}
            </button>

            <p className="mt-4 text-xs text-gray-500 leading-relaxed">
              Nếu bạn đăng nhập bằng Google và chưa đặt mật khẩu, hãy dùng nút Google ở trang đăng nhập hoặc đặt mật khẩu trong Cài đặt → Bảo mật.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

