import * as WebBrowser from 'expo-web-browser';
import { GOOGLE_AUTH_CONFIG } from '../config/googleAuth';

// Redirect URI — phải đăng ký trong Google Console > Authorized redirect URIs
// http://localhost:8081 là port Expo Metro, Google chấp nhận localhost với port
const REDIRECT_URI = 'http://localhost:8081';

export interface GoogleBrowserAuthResult {
  success: boolean;
  accessToken?: string;
  idToken?: string;
  cancelled?: boolean;
  error?: string;
}

/**
 * Đăng nhập Google bằng Chrome/trình duyệt hệ thống thật.
 * - Mở Chrome Custom Tabs (user thấy tài khoản Gmail đã lưu).
 * - Chọn tài khoản → Chrome tự đóng → app nhận token.
 * - Hoạt động trên Expo Go, KHÔNG cần Development Build.
 */
export async function signInWithGoogleBrowser(): Promise<GoogleBrowserAuthResult> {
  const params = new URLSearchParams({
    client_id: GOOGLE_AUTH_CONFIG.webClientId,
    redirect_uri: REDIRECT_URI,
    response_type: 'token',
    scope: 'profile email',
    prompt: 'select_account',   // Luôn hiện màn hình chọn tài khoản
    include_granted_scopes: 'true',
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  try {
    // Mở Chrome Custom Tabs — user thấy tài khoản Gmail sẵn có
    const result = await WebBrowser.openAuthSessionAsync(authUrl, REDIRECT_URI);

    if (result.type === 'cancel' || result.type === 'dismiss') {
      return { success: false, cancelled: true, error: 'Đã hủy đăng nhập.' };
    }

    if (result.type === 'success' && result.url) {
      const returnUrl = result.url;

      // Trích xuất access_token từ fragment (#access_token=...)
      const fragmentIndex = returnUrl.indexOf('#');
      if (fragmentIndex !== -1) {
        const fragment = returnUrl.substring(fragmentIndex + 1);
        const fragmentParams = new URLSearchParams(fragment);
        const accessToken = fragmentParams.get('access_token');
        const idToken = fragmentParams.get('id_token');
        const error = fragmentParams.get('error');

        if (error) return { success: false, error: `Google lỗi: ${error}` };
        if (idToken) return { success: true, idToken };
        if (accessToken) return { success: true, accessToken };
      }

      // Fallback: thử từ query string (?access_token=...)
      const queryIndex = returnUrl.indexOf('?');
      if (queryIndex !== -1) {
        const query = returnUrl.substring(queryIndex + 1);
        const queryParams = new URLSearchParams(query);
        const accessToken = queryParams.get('access_token');
        const idToken = queryParams.get('id_token');
        const error = queryParams.get('error');

        if (error) return { success: false, error: `Google lỗi: ${error}` };
        if (idToken) return { success: true, idToken };
        if (accessToken) return { success: true, accessToken };
      }

      return {
        success: false,
        error: 'Không tìm được token trong URL redirect. Kiểm tra lại Google Console.',
      };
    }

    return { success: false, error: 'Đăng nhập thất bại hoặc bị hủy.' };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Lỗi mở trình duyệt đăng nhập Google.',
    };
  }
}
