import { apiUrl, ensureApiBase, getLastApiProbeAttempts, setApiBaseUrl, getApiBaseUrl, resetApiBaseCache } from './api';
import { buildNativeDevApiUrl, isNativeRuntime, resolveConfiguredApiBase, resolveDevHost } from '../config/apiConfig';
import { formatBackendUnreachableMessage } from './backendErrors';
import {
  clearAuthStorage,
  getAccessToken,
  getRefreshToken,
  getStoredUser,
  hasAuthCredentials,
  persistLoginPayload,
} from './authStorage';

const jsonHeaders = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
};

const LOGIN_FETCH_TIMEOUT_MS = 8000;

function parseApiError(body, fallback) {
  if (!body || typeof body !== 'object') return fallback;
  if (typeof body.error === 'string' && body.error.trim()) {
    return body.error.trim();
  }
  if (typeof body.message === 'string' && body.message.trim()) {
    return body.message.trim();
  }
  return fallback;
}

function mapLoginHttpError(status) {
  if (status === 401) return 'Email hoặc mật khẩu không đúng.';
  if (status === 403) return 'Tài khoản đã bị khóa. Liên hệ quản trị viên.';
  if (status === 429) return 'Quá nhiều lần thử. Bạn đợi vài phút rồi thử lại nhé.';
  if (status === 503) return 'Dịch vụ tạm chưa sẵn sàng. Kiểm tra backend đang chạy.';
  if (status >= 500) {
    return 'Backend chưa chạy hoặc đang lỗi. Chạy `npm run dev` trong Prointerview-App/backend (cổng 5001).';
  }
  return '';
}

function backendUnreachableMessage() {
  return formatBackendUnreachableMessage(getLastApiProbeAttempts());
}

async function fetchWithTimeout(url, init, timeoutMs = LOGIN_FETCH_TIMEOUT_MS) {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  let timer;

  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => {
      controller?.abort();
      const err = new Error(`Request timed out after ${timeoutMs}ms`);
      err.name = 'TimeoutError';
      reject(err);
    }, timeoutMs);
  });

  try {
    return await Promise.race([
      fetch(url, {
        ...init,
        signal: controller?.signal,
      }),
      timeoutPromise,
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Login email/password — cùng contract với ProInterview web (`POST /api/auth/login`).
 */
async function postLogin(base, email, password) {
  const trimmedEmail = String(email || '').trim().toLowerCase();
  const trimmedPassword = String(password || '').trim();

  const res = await fetchWithTimeout(`${base}/api/auth/login`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ email: trimmedEmail, password: trimmedPassword }),
  });
  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    return {
      success: false,
      error:
        parseApiError(body, '') ||
        mapLoginHttpError(res.status) ||
        'Email hoặc mật khẩu không đúng.',
      status: res.status,
    };
  }

  if (!body.success || !body.token || !body.user) {
    return {
      success: false,
      error: parseApiError(body, 'Đăng nhập thất bại.'),
      status: res.status,
    };
  }

  setApiBaseUrl(base);
  // Giống web: lưu token trước khi vào app (cùng key prointerview_*).
  await persistLoginPayload(body);
  return {
    success: true,
    token: body.token,
    user: body.user,
    refreshToken: body.refreshToken,
    expiresIn: body.expiresIn,
  };
}

export async function tryRefreshAccessToken() {
  const rt = await getRefreshToken();
  if (!rt) return false;

  await ensureApiBase();

  try {
    const access = await getAccessToken();
    const headers = { ...jsonHeaders };
    if (access) headers.Authorization = `Bearer ${access}`;

    const res = await fetch(apiUrl('/api/auth/refresh'), {
      method: 'POST',
      headers,
      body: JSON.stringify({ refreshToken: rt }),
    });
    const body = await res.json().catch(() => ({}));

    if (!res.ok || !body.success || !body.token) {
      if (res.status === 401 || res.status === 403) {
        await clearAuthStorage();
      }
      return false;
    }

    await persistLoginPayload(body);
    return true;
  } catch {
    return false;
  }
}

export async function authFetch(path, init = {}) {
  await ensureApiBase();

  let access = await getAccessToken();
  if (!access && (await getRefreshToken())) {
    await tryRefreshAccessToken();
    access = await getAccessToken();
  }

  const run = async (token) => {
    const headers = new Headers(init.headers);
    if (!headers.has('Accept')) headers.set('Accept', 'application/json');
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return fetch(apiUrl(path), { ...init, headers });
  };

  let res = await run(access);
  if (res.status === 401 && (await getRefreshToken())) {
    const ok = await tryRefreshAccessToken();
    if (ok) {
      res = await run(await getAccessToken());
    }
  }
  return res;
}

export async function loginWithEmail(email, password) {
  const trimmedEmail = String(email || '').trim().toLowerCase();
  const trimmedPassword = String(password || '').trim();

  if (!trimmedEmail || !trimmedPassword) {
    return { success: false, error: 'Vui lòng nhập email và mật khẩu.' };
  }

  // Máy thật: bỏ cache cũ (có thể còn localhost từ lần chạy web)
  if (isNativeRuntime()) {
    const cached = getApiBaseUrl();
    if (cached && /localhost|127\.0\.0\.1/i.test(cached)) {
      resetApiBaseCache();
    }
  }

  const preferred =
    getApiBaseUrl() ||
    resolveConfiguredApiBase() ||
    (isNativeRuntime() ? buildNativeDevApiUrl() : null);
  const preferredIsLoopback = preferred && /localhost|127\.0\.0\.1/i.test(preferred);

  // 1) Thử URL đã cấu hình — bỏ qua localhost trên điện thoại
  if (preferred && !(isNativeRuntime() && preferredIsLoopback)) {
    setApiBaseUrl(preferred);
    try {
      if (__DEV__) console.log('[login] try', preferred);
      const result = await postLogin(preferred, trimmedEmail, trimmedPassword);
      if (result.success || (result.status && result.status < 500 && result.status !== 0)) {
        return result;
      }
    } catch (err) {
      if (__DEV__) console.warn('[login] preferred failed', preferred, err?.message || err);
      // thử bước 2
    }
  }

  // 2) Probe LAN (IP Expo / EXPO_PUBLIC_DEV_API_HOST) rồi login
  try {
    if (isNativeRuntime()) {
      resetApiBaseCache();
    }
    const base = await ensureApiBase();
    if (!base) {
      const lan = resolveDevHost();
      return {
        success: false,
        error:
          formatBackendUnreachableMessage(getLastApiProbeAttempts()) +
          (isNativeRuntime()
            ? ` Điện thoại cần IP máy dev (hiện: ${lan}). Cùng Wi‑Fi, mở firewall cổng 5001, hoặc set EXPO_PUBLIC_DEV_API_HOST trong mobile/.env rồi restart Expo.`
            : ''),
      };
    }
    if (__DEV__) console.log('[login] using probed base', base);
    return await postLogin(base, trimmedEmail, trimmedPassword);
  } catch (err) {
    const aborted = err?.name === 'AbortError' || err?.name === 'TimeoutError';
    return {
      success: false,
      error: aborted
        ? 'Đăng nhập quá lâu — kiểm tra backend (port 5001), cùng Wi‑Fi và firewall.'
        : 'Không kết nối được backend từ điện thoại. Cùng Wi‑Fi với máy dev, chạy backend :5001, mở firewall.',
    };
  }
}

export async function registerAccount(payload) {
  const preferred = getApiBaseUrl() || resolveConfiguredApiBase();
  if (preferred) setApiBaseUrl(preferred);

  const base = preferred || (await ensureApiBase());
  if (!base) {
    return { success: false, error: backendUnreachableMessage() };
  }

  try {
    const res = await fetchWithTimeout(`${base}/api/auth/register`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));

    if (!res.ok || !body.success) {
      return { success: false, error: parseApiError(body, 'Đăng ký thất bại. Vui lòng thử lại.') };
    }

    setApiBaseUrl(base);
    return { success: true, message: body.message || 'Đăng ký thành công! Hãy đăng nhập.' };
  } catch {
    return { success: false, error: 'Không thể kết nối đến máy chủ Backend.' };
  }
}

export async function loginWithGoogleCredential(credentialOrBody) {
  const raw =
    typeof credentialOrBody === 'string'
      ? credentialOrBody
      : credentialOrBody?.credential || credentialOrBody?.idToken || credentialOrBody?.accessToken;

  const accessToken =
    typeof credentialOrBody === 'object' && credentialOrBody?.accessToken
      ? credentialOrBody.accessToken
      : null;

  const credential =
    typeof credentialOrBody === 'object'
      ? credentialOrBody?.credential || credentialOrBody?.idToken
      : typeof raw === 'string' && raw.startsWith('eyJ')
        ? raw
        : null;

  const accessTokenParam =
    accessToken || (typeof raw === 'string' && raw && !raw.startsWith('eyJ') ? raw : null);

  if (!credential && !accessTokenParam) {
    return { success: false, error: 'Thiếu Google ID token (credential).' };
  }

  const preferred = getApiBaseUrl() || resolveConfiguredApiBase() || (isNativeRuntime() ? buildNativeDevApiUrl() : null);
  if (preferred) setApiBaseUrl(preferred);

  const base = preferred || (await ensureApiBase());
  if (!base) {
    return {
      success: false,
      error: backendUnreachableMessage(),
    };
  }

  const loginBody = credential
    ? { credential }
    : { accessToken: accessTokenParam };

  try {
    const res = await fetchWithTimeout(`${base}/api/auth/google`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify(loginBody),
    });
    const body = await res.json().catch(() => ({}));

    if (!res.ok || !body.success || !body.token) {
      return {
        success: false,
        error:
          typeof body.error === 'string' && body.error.trim()
            ? body.error.trim()
            : `Google login thất bại (HTTP ${res.status}).`,
      };
    }

    setApiBaseUrl(base);
    await persistLoginPayload(body);
    return { success: true, token: body.token, user: body.user, refreshToken: body.refreshToken };
  } catch {
    return { success: false, error: 'Không thể kết nối tới server Backend.' };
  }
}

export async function fetchCurrentUser() {
  const res = await authFetch('/api/auth/me', { method: 'GET' });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.success) {
    return { success: false, error: parseApiError(body, 'Không tải được hồ sơ.') };
  }
  return { success: true, user: body.user };
}

export async function patchCurrentUser(payload) {
  const res = await authFetch('/api/auth/me', {
    method: 'PATCH',
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.success) {
    return { success: false, error: parseApiError(body, 'Cập nhật thất bại.') };
  }
  if (body.user) {
    const token = await getAccessToken();
    await persistLoginPayload({ token, user: body.user });
  }
  return { success: true, user: body.user, token: body.token, refreshToken: body.refreshToken };
}

export async function logoutSession() {
  try {
    if (await hasAuthCredentials()) {
      await authFetch('/api/auth/logout', { method: 'POST' });
    }
  } catch {
    /* ignore network */
  }
  await clearAuthStorage();
  return { success: true };
}

export async function requestPasswordReset(email) {
  const preferred = getApiBaseUrl() || resolveConfiguredApiBase();
  if (preferred) setApiBaseUrl(preferred);
  const base = preferred || (await ensureApiBase());
  if (!base) {
    return { success: false, error: backendUnreachableMessage() };
  }
  try {
    const res = await fetchWithTimeout(`${base}/api/auth/forgot-password`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ email: String(email || '').trim().toLowerCase() }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: parseApiError(body, 'Không gửi được yêu cầu đặt lại mật khẩu.') };
    }
    return {
      success: true,
      message:
        body.message ||
        'Nếu email tồn tại trong hệ thống, một liên kết đặt lại mật khẩu đã được gửi đi.',
      resetToken: body.resetToken,
      resetUrl: body.resetUrl,
      mailSent: Boolean(body.mailSent),
      mailConfigured: Boolean(body.mailConfigured),
      mailError: typeof body.mailError === 'string' ? body.mailError : '',
    };
  } catch {
    return { success: false, error: 'Không kết nối được backend.' };
  }
}

export async function resetPasswordWithToken(token, password) {
  const preferred = getApiBaseUrl() || resolveConfiguredApiBase();
  if (preferred) setApiBaseUrl(preferred);
  const base = preferred || (await ensureApiBase());
  if (!base) {
    return { success: false, error: backendUnreachableMessage() };
  }
  try {
    const res = await fetchWithTimeout(`${base}/api/auth/reset-password`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({
        token: String(token || '').trim(),
        password: String(password || '').trim(),
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body.success === false) {
      return { success: false, error: parseApiError(body, 'Đặt lại mật khẩu thất bại.') };
    }
    return { success: true };
  } catch {
    return { success: false, error: 'Không kết nối được backend.' };
  }
}

export async function deleteAccount() {
  try {
    const res = await authFetch('/api/auth/me', { method: 'DELETE' });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: parseApiError(body, 'Không xóa được tài khoản.') };
    }
    await clearAuthStorage();
    return { success: true, message: body.message || 'Đã xóa tài khoản.' };
  } catch {
    return { success: false, error: 'Không kết nối được backend.' };
  }
}

export { clearAuthStorage, getAccessToken, getStoredUser, hasAuthCredentials, persistLoginPayload };
