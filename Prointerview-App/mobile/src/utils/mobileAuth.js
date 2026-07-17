import { apiUrl, ensureApiBase, getLastApiProbeAttempts, setApiBaseUrl, getApiBaseUrl } from './api';
import { resolveConfiguredApiBase } from '../config/apiConfig';
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
  if (body && typeof body.error === 'string' && body.error.trim()) {
    return body.error.trim();
  }
  return fallback;
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

async function postLogin(base, email, password) {
  const res = await fetchWithTimeout(`${base}/api/auth/login`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.success) {
    return {
      success: false,
      error: parseApiError(body, 'Email hoặc mật khẩu không hợp lệ.'),
      status: res.status,
    };
  }
  setApiBaseUrl(base);
  // Không chờ SecureStore trước khi vào app. Trên Expo Go/iOS bước này có thể chậm
  // và làm UI login quay mãi dù backend đã trả token.
  void persistLoginPayload(body).catch(() => {});
  return { success: true, token: body.token, user: body.user };
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
  if (!String(email || '').trim() || !String(password || '').trim()) {
    return { success: false, error: 'Vui lòng nhập email và mật khẩu.' };
  }

  const preferred = getApiBaseUrl() || resolveConfiguredApiBase();

  // 1) Thử URL đã biết trước — không chờ probe toàn bộ LAN
  if (preferred) {
    try {
      const result = await postLogin(preferred, email, password);
      if (result.success || (result.status && result.status < 500 && result.status !== 0)) {
        return result;
      }
    } catch {
      // thử bước 2
    }
  }

  // 2) Probe nhanh rồi login
  try {
    const base = await ensureApiBase();
    if (!base) {
      return { success: false, error: backendUnreachableMessage() };
    }
    return await postLogin(base, email, password);
  } catch (err) {
    const aborted = err?.name === 'AbortError' || err?.name === 'TimeoutError';
    return {
      success: false,
      error: aborted
        ? 'Đăng nhập quá lâu — kiểm tra backend (port 5001) và Wi‑Fi.'
        : 'Không thể kết nối tới server Backend.',
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
  const credential =
    typeof credentialOrBody === 'string'
      ? credentialOrBody
      : credentialOrBody?.credential || credentialOrBody?.idToken;

  if (!credential) {
    return { success: false, error: 'Thiếu Google ID token (credential).' };
  }

  const preferred = getApiBaseUrl() || resolveConfiguredApiBase();
  if (preferred) setApiBaseUrl(preferred);

  const base = preferred || (await ensureApiBase());
  if (!base) {
    return {
      success: false,
      error: backendUnreachableMessage(),
    };
  }

  try {
    const res = await fetchWithTimeout(`${base}/api/auth/google`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ credential }),
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

export { clearAuthStorage, getAccessToken, getStoredUser, hasAuthCredentials, persistLoginPayload };
