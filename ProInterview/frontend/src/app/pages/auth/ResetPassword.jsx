import React, { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { ArrowLeft, Lock, CheckCircle2, AlertCircle } from "lucide-react";
import { BrandLogo } from "../../components/brand/BrandLogo";
import { resetPassword } from "../../utils/auth";
import { toastApiError } from "../../utils/apiToast";

const INPUT_CLS =
  "w-full px-4 py-3.5 rounded-xl border border-gray-200 text-base outline-none transition-all " +
  "focus:border-[#8037f4] focus:ring-2 focus:ring-[#8037f4]/15 text-gray-900 placeholder-gray-400 " +
  "bg-white hover:bg-gray-50/50";

export function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = useMemo(() => (searchParams.get("token") || "").trim(), [searchParams]);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Mã xác thực (token) không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu lại link mới.");
      return;
    }
    if (password.length < 6) {
      setError("Mật khẩu mới phải có ít nhất 6 ký tự.");
      return;
    }
    if (password !== confirm) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    setLoading(true);
    const res = await resetPassword(token, password);
    setLoading(false);

    if (res.success) {
      setDone(true);
    } else {
      const msg = res.error || "Có lỗi xảy ra. Vui lòng thử lại sau.";
      setError(msg);
      toastApiError(msg);
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfaff] text-gray-900 antialiased flex flex-col">
      {/* Header */}
      <div
        className="relative z-10 flex h-20 flex-shrink-0 items-center justify-between overflow-visible border-b bg-white px-10"
        style={{ borderColor: "rgba(128,55,244,0.1)" }}
      >
        <button onClick={() => navigate("/")} className="flex shrink-0 items-center gap-2.5 group">
          <BrandLogo size="auth" />
        </button>
        <Link to="/login" className="text-sm font-semibold text-[#8037f4]">
          Đăng nhập
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="max-w-md w-full">
          <button
            onClick={() => navigate("/login")}
            className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại đăng nhập
          </button>

          <div className="bg-white rounded-3xl border border-gray-200 p-8 shadow-sm">
            <h1 className="text-3xl font-black mb-2 tracking-tight">Đặt lại mật khẩu</h1>
            <p className="text-gray-500 text-sm mb-8 leading-relaxed">
              Vui lòng nhập mật khẩu mới cho tài khoản của bạn.
            </p>

            {error && (
              <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
                <p className="font-medium">{error}</p>
              </div>
            )}

            {done ? (
              <div className="text-center py-4">
                <div className="h-16 w-16 bg-emerald-50 rounded-full flex items-center justify-center mb-6 mx-auto">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                </div>
                <h2 className="text-2xl font-black mb-3">Thành công!</h2>
                <p className="text-gray-600 mb-8">Mật khẩu của bạn đã được cập nhật thành công.</p>
                <Link
                  to="/login"
                  className="w-full inline-flex items-center justify-center rounded-2xl px-6 py-4 text-base font-black text-white transition-all active:scale-[0.98]"
                  style={{ background: "#8037f4" }}
                >
                  Đăng nhập ngay
                </Link>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Mật khẩu mới</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="password"
                      className={`${INPUT_CLS} pl-12`}
                      placeholder="Ít nhất 6 ký tự"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Xác nhận mật khẩu</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="password"
                      className={`${INPUT_CLS} pl-12`}
                      placeholder="Nhập lại mật khẩu"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl py-4 text-base font-black text-white transition-all active:scale-[0.98] disabled:opacity-60"
                  style={{ background: "#8037f4" }}
                >
                  {loading ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
                </button>
              </form>
            )}

            {!token && !done && (
              <div className="mt-8 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                <p className="text-xs text-amber-800 leading-relaxed">
                  <strong>Lưu ý:</strong> Bạn cần truy cập trang này từ liên kết được gửi trong email để có mã xác thực hợp lệ.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

