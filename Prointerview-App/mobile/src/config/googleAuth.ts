import { Platform } from 'react-native';
import { makeRedirectUri } from 'expo-auth-session';

/** Expo username trên https://expo.dev — khớp app.json / Google redirect URI */
export const EXPO_OWNER = 'vietvan';
export const EXPO_SLUG = 'prointerview-mobile';

/** Google OAuth — PHẢI khớp GOOGLE_CLIENT_ID backend ProInterview. */
const DEFAULT_GOOGLE_CLIENT_ID =
  '643387745996-jdlgo88csoc876tbphm9qmj50tjek9nf.apps.googleusercontent.com';

export const GOOGLE_AUTH_CONFIG = {
  webClientId:
    process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID?.trim() || DEFAULT_GOOGLE_CLIENT_ID,

  androidClientId:
    process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID?.trim() ||
    process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID?.trim() ||
    DEFAULT_GOOGLE_CLIENT_ID,

  iosClientId:
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() ||
    process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID?.trim() ||
    DEFAULT_GOOGLE_CLIENT_ID,

  expoUsername: EXPO_OWNER,
};

export function isGoogleAuthConfigured() {
  return Boolean(GOOGLE_AUTH_CONFIG.webClientId && !GOOGLE_AUTH_CONFIG.webClientId.includes('REPLACE'));
}

/**
 * Redirect URI cho Google OAuth (development build / standalone).
 *
 * Lưu ý: proxy `https://auth.expo.io/...` đã lỗi thời — trên Expo Go thường hiện
 * "Something went wrong trying to finish signing in". Google login ổn định cần:
 * development build (`npx expo run:ios|android`) + `@react-native-google-signin`,
 * hoặc đăng nhập trên web (`expo start --web`).
 */
export function resolveGoogleRedirectUri() {
  if (Platform.OS === 'web') {
    return makeRedirectUri();
  }

  return makeRedirectUri({ scheme: 'prointerview', path: 'oauthredirect' });
}

/** URI cần thêm vào Google Cloud Console → Authorized redirect URIs */
export function getGoogleConsoleRedirectUris() {
  return [
    `https://auth.expo.io/@${EXPO_OWNER}/${EXPO_SLUG}`,
    'prointerview://oauthredirect',
    'http://localhost:8081',
    'http://localhost:5173',
  ];
}
