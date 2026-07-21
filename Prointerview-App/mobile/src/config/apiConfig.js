import Constants from 'expo-constants';
import { NativeModules, Platform } from 'react-native';

/** Backend ProInterview (Express) — cùng API với web frontend. */
export const PROINTERVIEW_PROD_API_URL = 'https://prointerview-backend.onrender.com';

/** Cổng dev của Prointerview-App/backend (.env: PORT=5001). */
export const DEV_API_PORTS = ['5001', '5000'];

function normalizeHost(value) {
  if (!value) return null;
  const raw = String(value).trim();
  const fromUrl = raw.match(/^(?:https?|exp|exps):\/\/([^:/]+)/i)?.[1];
  const fromHostPort = raw.match(/^([^:/]+)(?::\d+)?$/i)?.[1];
  const host = (fromUrl || fromHostPort || '').trim().toLowerCase();
  if (!host || host === 'localhost' || host === '127.0.0.1') return null;
  // Bỏ IPv6 loopback / link-local không dùng được từ điện thoại
  if (host === '::1' || host.startsWith('fe80:')) return null;
  return host;
}

function isLoopbackHost(host) {
  const h = String(host || '').toLowerCase();
  return !h || h === 'localhost' || h === '127.0.0.1' || h === '::1';
}

/**
 * Danh sách IP LAN — ưu tiên IP đang chạy Metro/Expo (luôn đúng hơn .env cũ).
 */
export function getDevHostCandidates() {
  const hosts = [];
  const seen = new Set();

  const push = (value) => {
    const host = normalizeHost(value);
    if (!host || seen.has(host)) return;
    seen.add(host);
    hosts.push(host);
  };

  // 0) Override thủ công trong .env — ưu tiên khi Expo không lấy được IP
  const devHostEnv = process.env.EXPO_PUBLIC_DEV_API_HOST?.trim();
  if (devHostEnv) push(devHostEnv);

  // 1) Expo / Metro đang chạy (IP hiện tại)
  push(Constants.expoGoConfig?.debuggerHost);
  push(Constants.manifest2?.extra?.expoGo?.debuggerHost);
  push(Constants.manifest?.debuggerHost);
  push(Constants.expoConfig?.hostUri);
  push(Constants.linkingUri);

  try {
    const scriptURL = NativeModules.SourceCode?.scriptURL;
    push(scriptURL);
  } catch {
    // ignore
  }

  return hosts;
}

/**
 * Host máy chạy backend khi dev local.
 * Trên điện thoại thật: KHÔNG trả localhost (sẽ gọi chính máy điện thoại).
 */
export function resolveDevHost() {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const host = window.location.hostname;
    return isLoopbackHost(host) ? host : host;
  }

  const candidates = getDevHostCandidates();
  if (candidates.length) return candidates[0];

  // Android emulator → host máy qua 10.0.2.2
  if (Platform.OS === 'android') {
    return '10.0.2.2';
  }

  // iOS simulator mới map localhost được; máy thật cần IP LAN trong .env
  return Platform.OS === 'ios' ? 'localhost' : 'localhost';
}

/** True khi đang chạy trên thiết bị thật / Expo Go (không phải web). */
export function isNativeRuntime() {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

/**
 * Thay localhost trong EXPO_PUBLIC_API_URL bằng IP LAN khi chạy trên điện thoại.
 * Trả null trên native nếu chỉ còn loopback — buộc probe LAN thay vì gọi localhost.
 */
export function resolveConfiguredApiBase() {
  const configured = getConfiguredApiBase();
  if (!configured) return null;

  if (Platform.OS === 'web') return configured;

  try {
    const url = new URL(configured);
    if (isLoopbackHost(url.hostname)) {
      const lan = resolveDevHost();
      if (isLoopbackHost(lan)) {
        // Máy thật + không biết IP → đừng dùng localhost
        return null;
      }
      url.hostname = lan;
      return url.toString().replace(/\/$/, '');
    }
    return configured.replace(/\/$/, '');
  } catch {
    return configured;
  }
}

/** Override qua EXPO_PUBLIC_API_URL nếu có (prod hoặc dev tùy chỉnh). */
export function getConfiguredApiBase() {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv && String(fromEnv).trim()) {
    return String(fromEnv).replace(/\/$/, '');
  }
  if (!__DEV__) {
    return PROINTERVIEW_PROD_API_URL;
  }
  return null;
}

/** IP máy dev từ Metro/Expo (điện thoại luôn tải bundle từ đây). */
export function getMetroDevHost() {
  const candidates = getDevHostCandidates();
  return candidates[0] || null;
}

/**
 * URL backend dev tốt nhất trên điện thoại — không dùng localhost.
 * Ưu tiên .env, sau đó IP Metro (cùng máy chạy Expo).
 */
export function buildNativeDevApiUrl(port = DEV_API_PORTS[0]) {
  const configured = resolveConfiguredApiBase() || getConfiguredApiBase();
  if (configured) {
    try {
      const url = new URL(configured);
      if (!isLoopbackHost(url.hostname)) {
        return configured.replace(/\/$/, '');
      }
    } catch {
      return configured.replace(/\/$/, '');
    }
  }

  const metroHost = getMetroDevHost();
  if (metroHost) {
    return `http://${metroHost}:${port}`;
  }

  return null;
}
