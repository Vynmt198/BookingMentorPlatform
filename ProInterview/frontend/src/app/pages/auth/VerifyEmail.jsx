import React, { useEffect, useState, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { CheckCircle2, AlertCircle, Loader2, Mail } from "lucide-react";
import { BrandLogo } from "../../components/brand/BrandLogo";
import { verifyEmail } from "../../utils/auth";
import { toastApiError, toastApiSuccess } from "../../utils/apiToast";

export function VerifyEmail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = useMemo(() => (searchParams.get("token") || "").trim(), [searchParams]);

  const [status, setStatus] = useState("loading"); // loading, success, error
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Thiếu token xác thực. Vui lòng kiểm tra lại đường dẫn trong email.");
      return;
    }

    const doVerify = async () => {
      const res = await verifyEmail(token);
      if (res.success) {
        setStatus("success");
        const okMsg = res.message || "Xác thực email thành công!";
        setMessage(okMsg);
        toastApiSuccess(okMsg);
      } else {
        setStatus("error");
        const errMsg = res.error || "Xác thực thất bại hoặc token đã hết hạn.";
        setMessage(errMsg);
        toastApiError(errMsg);
      }
    };

    doVerify();
  }, [token]);

  return (
    <div className="min-h-screen bg-[#fcfaff] text-gray-900 antialiased flex flex-col">
      <div
        className="relative z-10 flex h-20 flex-shrink-0 items-center justify-between overflow-visible border-b bg-white px-10"
        style={{ borderColor: "rgba(128,55,244,0.1)" }}
      >
        <button onClick={() => navigate("/")} className="flex shrink-0 items-center gap-2.5 group">
          <BrandLogo size="auth" />
        </button>
        <Link to="/login" className="text-sm font-semibold" style={{ color: "#8037f4" }}>
          Đăng nhập
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="max-w-md w-full bg-white rounded-3xl border border-gray-200 p-8 shadow-sm text-center">
          {status === "loading" && (
            <div className="flex flex-col items-center py-8">
              <Loader2 className="h-12 w-12 text-[#8037f4] animate-spin mb-4" />
              <h1 className="text-2xl font-black mb-2">Đang xác thực...</h1>
              <p className="text-gray-500">Vui lòng đợi trong giây lát khi chúng tôi xác nhận email của bạn.</p>
            </div>
          )}

          {status === "success" && (
            <div className="flex flex-col items-center py-8">
              <div className="h-20 w-20 bg-emerald-50 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 className="h-10 w-10 text-emerald-600" />
              </div>
              <h1 className="text-3xl font-black mb-4 text-emerald-900">Xác thực thành công!</h1>
              <p className="text-gray-600 mb-8 leading-relaxed">
                Email của bạn đã được xác minh. Bây giờ bạn đã có thể đăng nhập và trải nghiệm đầy đủ các tính năng của ProInterview.
              </p>
              <Link
                to="/login"
                className="w-full inline-flex items-center justify-center rounded-2xl px-6 py-4 text-base font-black text-white transition-all active:scale-[0.98]"
                style={{ background: "#8037f4" }}
              >
                Đăng nhập ngay
              </Link>
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center py-8">
              <div className="h-20 w-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
                <AlertCircle className="h-10 w-10 text-red-500" />
              </div>
              <h1 className="text-3xl font-black mb-4">Opps! Lỗi rồi</h1>
              <p className="text-red-600 mb-8 leading-relaxed font-medium">
                {message}
              </p>
              <div className="space-y-4 w-full">
                <Link
                  to="/forgot-password"
                  className="w-full inline-flex items-center justify-center rounded-2xl px-6 py-4 text-base font-black text-white transition-all active:scale-[0.98]"
                  style={{ background: "#8037f4" }}
                >
                  Gửi lại yêu cầu
                </Link>
                <Link
                  to="/"
                  className="w-full inline-flex items-center justify-center rounded-2xl px-6 py-4 text-base font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all"
                >
                  Về trang chủ
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
