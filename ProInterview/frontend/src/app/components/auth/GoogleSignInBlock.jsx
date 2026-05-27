import React, { useCallback, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { getUser, loginWithGoogleCredential, getPostLoginPath } from "../../utils/auth";

const CLIENT_ID = String(import.meta.env.VITE_GOOGLE_CLIENT_ID || "").trim();

function loadGoogleScript() {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.google?.accounts?.id) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) {
      if (window.google?.accounts?.id) resolve();
      else {
        existing.addEventListener("load", () => resolve());
        existing.addEventListener("error", () => reject(new Error("gsi")));
      }
      return;
    }
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("gsi"));
    document.head.appendChild(s);
  });
}

export function GoogleSignInBlock({ onError }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialized = useRef(false);
  const buttonWrapRef = useRef(null);

  const onCredential = useCallback(
    async (response) => {
      console.log("[GoogleSignIn] Credential response received:", response ? "Yes" : "No");
      onError?.("");
      const cred = response?.credential;
      if (!cred) { 
        console.error("[GoogleSignIn] No credential in response");
        onError?.("Không nhận được phản hồi từ Google."); 
        return; 
      }
      console.log("[GoogleSignIn] Sending credential to backend...");
      try {
        const result = await loginWithGoogleCredential(cred);
        console.log("[GoogleSignIn] Backend result:", result);
        if (!result.success) {
          onError?.(result.error || "Đăng nhập Google thất bại.");
          return;
        }
        const user = getUser();
        console.log("[GoogleSignIn] Login successful, user:", user?.email);
        navigate(getPostLoginPath(user, params.get("redirect")));
      } catch {
        onError?.("Lỗi kết nối khi đăng nhập Google. Thử lại sau.");
      }
    },
    [navigate, onError, params],
  );

  useEffect(() => {
    if (!CLIENT_ID || initialized.current) return;
    let cancelled = false;

    (async () => {
      try {
        await loadGoogleScript();
        if (cancelled || !window.google?.accounts?.id) return;
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: (res) => { void onCredential(res); },
          auto_select: false,
        });
        if (buttonWrapRef.current) {
          buttonWrapRef.current.innerHTML = "";
          window.google.accounts.id.renderButton(buttonWrapRef.current, {
            type: "standard",
            theme: "outline",
            size: "large",
            text: "signin_with",
            shape: "pill",
            width: 360,
            locale: "vi-VN",
          });
        }
        initialized.current = true;
      } catch {
        if (!cancelled) onError?.("Không tải được Google. Kiểm tra mạng hoặc thử lại.");
      }
    })();

    return () => { cancelled = true; };
  }, [onCredential, onError]);

  return (
    <div className="w-full">
      {!CLIENT_ID ? (
        <button
          type="button"
          onClick={() =>
            onError?.("Đăng nhập Google chưa được bật (thiếu VITE_GOOGLE_CLIENT_ID). Vui lòng dùng email và mật khẩu.")
          }
          className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-full border text-base font-semibold text-gray-700 transition-all"
          style={{ background: "#fff", borderColor: "#E5E7EB" }}
        >
          Đăng nhập với Google
        </button>
      ) : (
        <div ref={buttonWrapRef} className="w-full min-h-[44px] flex items-center justify-center" />
      )}
    </div>
  );
}
