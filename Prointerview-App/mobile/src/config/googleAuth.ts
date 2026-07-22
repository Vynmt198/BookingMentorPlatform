import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { makeRedirectUri } from 'expo-auth-session';

export const EXPO_OWNER = 'vietvan';
export const EXPO_SLUG = 'prointerview-mobile';

const DEFAULT_GOOGLE_CLIENT_ID =
  '956250299695-4sqi587k4p3ubtrpcchhjvhkfats7nbe.apps.googleusercontent.com';

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
 * Expo Go trên điện thoại: Google Web Client CHỈ chấp nhận http://localhost (không chấp nhận exp://).
 * ASWebAuthenticationSession bắt URL redirect (#id_token=...) trước khi Safari tải trang.
 */
export const GOOGLE_EXPO_GO_REDIRECT_URI = 'http://localhost:8081';

export function resolveExpoGoGoogleRedirectUri() {
  if (Platform.OS === 'web') {
    return makeRedirectUri();
  }

  if (Constants.appOwnership === 'expo') {
    return GOOGLE_EXPO_GO_REDIRECT_URI;
  }

  return makeRedirectUri({ scheme: 'prointerview', path: 'oauthredirect' });
}

export function resolveGoogleRedirectUri() {
  return resolveExpoGoGoogleRedirectUri();
}

export function getGoogleConsoleRedirectUris() {
  return [
    GOOGLE_EXPO_GO_REDIRECT_URI,
    'http://127.0.0.1:8081',
    'prointerview://oauthredirect',
    'http://localhost:5173',
  ];
}
