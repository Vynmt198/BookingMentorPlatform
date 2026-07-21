import * as WebBrowser from 'expo-web-browser';
import {
  GOOGLE_AUTH_CONFIG,
  GOOGLE_EXPO_GO_REDIRECT_URI,
} from '../config/googleAuth';

export interface GoogleBrowserAuthResult {
  success: boolean;
  accessToken?: string;
  idToken?: string;
  cancelled?: boolean;
  error?: string;
  redirectUri?: string;
}

function extractTokensFromUrl(returnUrl: string) {
  const tryParams = (raw: string) => {
    const params = new URLSearchParams(raw);
    return {
      accessToken: params.get('access_token'),
      idToken: params.get('id_token'),
      error: params.get('error'),
      errorDescription: params.get('error_description'),
    };
  };

  const hashIndex = returnUrl.indexOf('#');
  if (hashIndex !== -1) {
    const fromHash = tryParams(returnUrl.substring(hashIndex + 1));
    if (fromHash.error || fromHash.idToken || fromHash.accessToken) return fromHash;
  }

  const queryIndex = returnUrl.indexOf('?');
  if (queryIndex !== -1) {
    const query = returnUrl.substring(queryIndex + 1).split('#')[0];
    return tryParams(query);
  }

  return { accessToken: null, idToken: null, error: null, errorDescription: null };
}

/**
 * Google OAuth qua Safari/Chrome — redirect http://localhost:8081 (đã có trong Google Console).
 * iOS bắt URL redirect và đóng browser → quay lại Expo Go.
 */
export async function signInWithGoogleBrowser(): Promise<GoogleBrowserAuthResult> {
  const redirectUri = GOOGLE_EXPO_GO_REDIRECT_URI;
  const nonce = Math.random().toString(36).slice(2);
  const params = new URLSearchParams({
    client_id: GOOGLE_AUTH_CONFIG.webClientId,
    redirect_uri: redirectUri,
    response_type: 'id_token',
    scope: 'openid profile email',
    prompt: 'select_account',
    nonce,
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  if (__DEV__) {
    console.log('[GoogleAuth] redirectUri:', redirectUri);
  }

  try {
    const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri, {
      preferEphemeralSession: false,
      showInRecents: false,
    });

    if (result.type === 'cancel' || result.type === 'dismiss') {
      return { success: false, cancelled: true, error: 'Đã hủy đăng nhập.', redirectUri };
    }

    if (result.type === 'success' && result.url) {
      const { accessToken, idToken, error, errorDescription } = extractTokensFromUrl(result.url);

      if (error) {
        return {
          success: false,
          error: `Google lỗi: ${errorDescription || error}`,
          redirectUri,
        };
      }
      if (idToken) return { success: true, idToken, redirectUri };
      if (accessToken) return { success: true, accessToken, redirectUri };

      return {
        success: false,
        error: 'Không tìm được token trong URL redirect.',
        redirectUri,
      };
    }

    return { success: false, error: 'Đăng nhập thất bại hoặc bị hủy.', redirectUri };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Lỗi mở trình duyệt đăng nhập Google.',
      redirectUri,
    };
  }
}
