import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/** Khớp keys web frontend ProInterview/frontend/src/app/utils/auth.js */
export const AUTH_KEY = 'prointerview_auth';
export const TOKEN_KEY = 'prointerview_access_token';
export const REFRESH_KEY = 'prointerview_refresh_token';

/** Keys cũ — migrate khi đọc */
const LEGACY_TOKEN_KEY = 'user_jwt_token';
const LEGACY_USER_KEY = 'user_profile_data';

const Storage = {
  async setItem(key, value) {
    if (Platform.OS === 'web') {
      try {
        localStorage.setItem(key, value);
      } catch {
        /* ignore */
      }
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  async getItem(key) {
    if (Platform.OS === 'web') {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    }
    return SecureStore.getItemAsync(key);
  },
  async deleteItem(key) {
    if (Platform.OS === 'web') {
      try {
        localStorage.removeItem(key);
      } catch {
        /* ignore */
      }
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

export async function getAccessToken() {
  let token = await Storage.getItem(TOKEN_KEY);
  if (!token) {
    token = await Storage.getItem(LEGACY_TOKEN_KEY);
  }
  return token || '';
}

export async function getRefreshToken() {
  return (await Storage.getItem(REFRESH_KEY)) || '';
}

export async function getStoredUser() {
  const raw = await Storage.getItem(AUTH_KEY);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  const legacy = await Storage.getItem(LEGACY_USER_KEY);
  if (!legacy) return null;
  try {
    const parsed = JSON.parse(legacy);
    return {
      id: parsed.id,
      email: parsed.email,
      name: parsed.fullName || parsed.name,
      avatar: parsed.avatar,
    };
  } catch {
    return null;
  }
}

export async function persistLoginPayload(body) {
  if (body?.token) {
    await Storage.setItem(TOKEN_KEY, body.token);
    await Storage.deleteItem(LEGACY_TOKEN_KEY);
  }
  if (body?.refreshToken) {
    await Storage.setItem(REFRESH_KEY, body.refreshToken);
  }
  if (body?.user) {
    await Storage.setItem(AUTH_KEY, JSON.stringify(body.user));
    await Storage.deleteItem(LEGACY_USER_KEY);
  }
}

export async function clearAuthStorage() {
  await Storage.deleteItem(AUTH_KEY);
  await Storage.deleteItem(TOKEN_KEY);
  await Storage.deleteItem(REFRESH_KEY);
  await Storage.deleteItem(LEGACY_TOKEN_KEY);
  await Storage.deleteItem(LEGACY_USER_KEY);
}

export async function hasAuthCredentials() {
  const access = await getAccessToken();
  if (access) return true;
  return Boolean(await getRefreshToken());
}
