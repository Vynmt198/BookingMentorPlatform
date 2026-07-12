import React, { useCallback, useEffect, useRef, useState } from "react";
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

  // Tự động nhận diện nếu đang chạy trong iframe (giả lập Mobile Web)
  const isInsideIframe = typeof window !== "undefined" && window.self !== window.top;
  const [loadFailed, setLoadFailed] = useState(isInsideIframe);

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
    // Lắng nghe token gửi về từ cửa sổ popup
    const handleMessage = async (event) => {
      if (event.data?.type === "GOOGLE_AUTH_SUCCESS" && event.data?.credential) {
        onError?.("");
        try {
          const result = await loginWithGoogleCredential(event.data.credential);
          if (!result.success) {
            onError?.(result.error || "Đăng nhập Google thất bại.");
            return;
          }
          const user = getUser();
          navigate(getPostLoginPath(user, params.get("redirect")));
        } catch {
          onError?.("Lỗi kết nối khi đăng nhập Google. Thử lại sau.");
        }
      }
    };
    window.addEventListener("message", handleMessage);

    // Nếu cửa sổ hiện tại là đích redirect từ Google (url hash chứa id_token), gửi token về trang cha và đóng popup
    if (window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const idToken = hashParams.get("id_token");
      const state = hashParams.get("state");
      if (idToken && state === "google_auth" && window.opener) {
        window.opener.postMessage({ type: "GOOGLE_AUTH_SUCCESS", credential: idToken }, "*");
        window.close();
      }
    }

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [navigate, onError, params]);

  useEffect(() => {
    if (!CLIENT_ID || initialized.current || isInsideIframe) return;
    let cancelled = false;

    const isMobile = typeof window !== "undefined" && window.innerWidth < 640;

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
            size: isMobile ? "medium" : "large",
            text: "signin_with",
            shape: "pill",
            width: isMobile
              ? Math.min(buttonWrapRef.current.offsetWidth || 280, 280)
              : 360,
            locale: "vi-VN",
          });
        }
        initialized.current = true;
      } catch {
        if (!cancelled) {
          setLoadFailed(true);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [onCredential, onError, isInsideIframe]);

  const handleRealGoogleLogin = () => {
    if (!CLIENT_ID) {
      onError?.("Đăng nhập Google chưa được bật (thiếu VITE_GOOGLE_CLIENT_ID). Vui lòng dùng email và mật khẩu.");
      return;
    }
    onError?.("");
    const nonce = Math.random().toString(36).substring(2);
    const redirectUri = window.location.origin; 
    const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=id_token` +
      `&scope=${encodeURIComponent("openid profile email")}` +
      `&nonce=${nonce}` +
      `&state=google_auth`;
    
    window.open(oauthUrl, "Google Login", "width=500,height=600");
  };

  return (
    <div className="w-full">
      {!CLIENT_ID ? (
        <button
          type="button"
          onClick={() =>
            onError?.("Đăng nhập Google chưa được bật (thiếu VITE_GOOGLE_CLIENT_ID). Vui lòng dùng email và mật khẩu.")
          }
          className="w-full flex items-center justify-center gap-3 py-2.5 sm:py-3.5 px-4 rounded-full border text-sm sm:text-base font-semibold text-gray-700 transition-all"
          style={{ background: "#fff", borderColor: "#E5E7EB" }}
        >
          Sign in with Google
        </button>
      ) : loadFailed ? (
        <button
          type="button"
          onClick={handleRealGoogleLogin}
          className="w-full flex items-center justify-center gap-3 py-2.5 sm:py-3 px-4 rounded-full border text-sm sm:text-base font-semibold text-gray-700 transition-all active:scale-[0.98] hover:bg-slate-50"
          style={{ background: "#fff", borderColor: "#cbd5e1" }}
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path
              fill="#EA4335"
              d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114A5.99 5.99 0 0 1 8 12.5a5.99 5.99 0 0 1 5.99-6.012c1.49 0 2.854.545 3.903 1.446l3.155-3.155C19.123 2.923 16.746 2 13.99 2 8.47 2 4 6.47 4 12s4.47 10 9.99 10c5.78 0 9.77-4.062 9.77-9.929 0-.616-.055-1.21-.165-1.786H12.24Z"
            />
          </svg>
          Đăng nhập bằng Google
        </button>
      ) : (
        <div ref={buttonWrapRef} className="w-full min-h-[36px] sm:min-h-[44px] flex items-center justify-center" />
      )}
    </div>
  );
}
