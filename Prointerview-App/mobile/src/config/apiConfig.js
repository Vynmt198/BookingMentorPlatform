import Constants from 'expo-constants';
import { NativeModules, Platform } from 'react-native';

/** Backend ProInterview (Express) — cùng API với web frontend. */
export const PROINTERVIEW_PROD_API_URL = 'https://prointerview-backend.onrender.com';

/** Cổng dev của Prointerview-App/backend (.env.example: PORT=5001). */
export const DEV_API_PORTS = ['5001', '5000'];

function normalizeHost(value) {
  if (!value) return null;
  const raw = String(value).trim();
  const fromUrl = raw.match(/^(?:https?|exp):\/\/([^:/]+)/i)?.[1];
  const fromHostPort = raw.match(/^([^:/]+)(?::\d+)?$/i)?.[1];
  const host = (fromUrl || fromHostPort || '').trim().toLowerCase();
  if (!host || host === 'localhost' || host === '127.0.0.1') return null;
  return host;
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

  // 1) Expo / Metro đang chạy (IP hiện tại)
  push(Constants.expoGoConfig?.debuggerHost);
  push(Constants.manifest2?.extra?.expoGo?.debuggerHost);
  push(Constants.manifest?.debuggerHost);
  push(Constants.expoConfig?.hostUri);
  push(Constants.linkingUri);

  const scriptURL = NativeModules.SourceCode?.scriptURL;
  push(scriptURL?.match(/^(?:https?|exp):\/\/([^:/]+)/i)?.[1]);

  // 2) Override thủ công trong .env (fallback nếu Expo không có)
  const devHostEnv = process.env.EXPO_PUBLIC_DEV_API_HOST?.trim();
  if (devHostEnv) push(devHostEnv);

  return hosts;
}

/**
 * Host máy chạy backend khi dev local.
 */
export function resolveDevHost() {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return window.location.hostname;
  }

  const candidates = getDevHostCandidates();
  if (candidates.length) return candidates[0];

  if (Platform.OS === 'android') {
    return '10.0.2.2';
  }

  return 'localhost';
}

/** Thay localhost trong EXPO_PUBLIC_API_URL bằng IP LAN khi chạy trên điện thoại. */
export function resolveConfiguredApiBase() {
  const configured = getConfiguredApiBase();
  if (!configured || Platform.OS === 'web') return configured;

  try {
    const url = new URL(configured);
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
      url.hostname = resolveDevHost();
      return url.toString().replace(/\/$/, '');
    }
  } catch {
    // giữ nguyên nếu URL không hợp lệ
  }

  return configured;
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
