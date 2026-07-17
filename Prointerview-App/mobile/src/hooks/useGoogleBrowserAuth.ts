import { useEffect, useCallback } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { GOOGLE_AUTH_CONFIG } from '../config/googleAuth';

// QUAN TRỌNG: Phải gọi ở module-level để xử lý redirect khi app mở lại sau khi đăng nhập Google
WebBrowser.maybeCompleteAuthSession();

export interface GoogleBrowserAuthResult {
  success: boolean;
  idToken?: string;
  accessToken?: string;
  error?: string;
  cancelled?: boolean;
}

interface UseGoogleBrowserAuthReturn {
  request: any;
  promptAsync: () => Promise<GoogleBrowserAuthResult>;
  isReady: boolean;
}

/**
 * Hook đăng nhập Google qua trình duyệt hệ thống (Browser Redirect OAuth2 flow).
 * - Hoạt động 100% trên Expo Go (không cần Development Build).
 * - Người dùng được mở trình duyệt, đăng nhập Google, sau đó redirect trở về app.
 * - Nhận accessToken từ Google, gửi lên Backend ProInterview để xác thực.
 */
export function useGoogleBrowserAuth(): UseGoogleBrowserAuthReturn {
  // KHÔNG truyền redirectUri — để expo-auth-session tự tạo đúng redirect URI
  // Khi chạy Expo Go: tự dùng https://auth.expo.io/@vietvan/prointerview-mobile
  // Khi chạy Development Build: tự dùng scheme prointerview://
  const [request, response, promptAsyncInternal] = Google.useAuthRequest({
    clientId: GOOGLE_AUTH_CONFIG.webClientId,
    androidClientId: GOOGLE_AUTH_CONFIG.androidClientId,
    iosClientId: GOOGLE_AUTH_CONFIG.iosClientId,
    scopes: ['profile', 'email'],
    usePKCE: false,
  });

  const promptAsync = useCallback(async (): Promise<GoogleBrowserAuthResult> => {
    if (!request) {
      return {
        success: false,
        error: 'Chưa sẵn sàng. Vui lòng thử lại.',
      };
    }

    try {
      // Log redirect URI thực tế để debug — xem trong Metro console
      console.log('[GoogleAuth] redirectUri:', request?.redirectUri);
      console.log('[GoogleAuth] clientId:', GOOGLE_AUTH_CONFIG.webClientId?.substring(0, 30) + '...');
      const result = await promptAsyncInternal();

      if (result.type === 'cancel' || result.type === 'dismiss') {
        return { success: false, cancelled: true, error: 'Người dùng đã hủy đăng nhập.' };
      }

      if (result.type === 'error') {
        return { success: false, error: result.error?.message || 'Lỗi đăng nhập Google.' };
      }

      if (result.type === 'success') {
        // expo-auth-session trả về authentication object chứa accessToken
        const authentication = (result as any).authentication;
        const accessToken = authentication?.accessToken;

        // Fallback: thử lấy từ params nếu authentication không có
        const params = (result as any).params;
        const paramsAccessToken = params?.access_token || params?.token;
        const idToken = params?.id_token || params?.idToken || authentication?.idToken;

        const finalAccessToken = accessToken || paramsAccessToken;
        const finalIdToken = idToken;

        if (finalIdToken) {
          return { success: true, idToken: finalIdToken };
        }

        if (finalAccessToken) {
          return { success: true, accessToken: finalAccessToken };
        }

        return {
          success: false,
          error: 'Không nhận được token từ Google. Kiểm tra lại Client ID và Redirect URI trong Google Console.',
        };
      }

      return { success: false, error: `Kết quả không mong đợi từ Google: ${result.type}` };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Lỗi kết nối khi đăng nhập Google.',
      };
    }
  }, [request, promptAsyncInternal]);

  return {
    request,
    promptAsync,
    isReady: !!request,
  };
}
