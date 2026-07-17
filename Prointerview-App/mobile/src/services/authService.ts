import { GOOGLE_AUTH_CONFIG } from '../config/googleAuth';
import { ensureApiBase } from '../utils/api';
import { BACKEND_DEV_HINT } from '../utils/backendErrors';
import { loginWithGoogleCredential } from '../utils/mobileAuth';
import {
  clearAuthStorage,
  getAccessToken,
  getStoredUser,
  persistLoginPayload,
} from '../utils/authStorage';

export type { UserProfile } from '../types/auth';

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: import('../types/auth').UserProfile;
  error?: string;
  errorCode?: 'CANCELLED' | 'IN_PROGRESS' | 'PLAY_SERVICES_UNAVAILABLE' | 'NETWORK_ERROR' | 'BACKEND_ERROR' | 'NO_ID_TOKEN' | 'UNKNOWN';
}

let GoogleSignin: any = null;
let statusCodes: any = {};
let isNativeGoogleAvailable = false;

try {
  const { NativeModules } = require('react-native');
  if (NativeModules.RNGoogleSignin) {
    const GoogleModule = require('@react-native-google-signin/google-signin');
    GoogleSignin = GoogleModule.GoogleSignin;
    statusCodes = GoogleModule.statusCodes;
    isNativeGoogleAvailable = true;

    GoogleSignin.configure({
      webClientId: GOOGLE_AUTH_CONFIG.webClientId,
      iosClientId: GOOGLE_AUTH_CONFIG.iosClientId,
      offlineAccess: false,
    });
  }
} catch {
  console.warn('Native RNGoogleSignin modules not available. Using Expo Go fallback mode.');
}

function mapUserProfile(user: Record<string, unknown> | undefined) {
  return {
    id: String(user?.id || user?._id || ''),
    email: String(user?.email || ''),
    fullName: String(user?.name || user?.fullName || ''),
    avatar: user?.avatar ? String(user.avatar) : undefined,
  };
}

export async function saveAuthData(token: string, user: import('../types/auth').UserProfile): Promise<void> {
  await persistLoginPayload({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.fullName,
      avatar: user.avatar,
    },
  });
}

export { getAccessToken as getStoredToken, getStoredUser, clearAuthStorage as clearAuthData };

/**
 * Gửi Google Token lên ProInterview backend (POST /api/auth/google).
 */
export async function sendGoogleTokenToBackend(params: {
  idToken?: string;
  accessToken?: string;
  backendHost?: string;
}): Promise<AuthResponse> {
  const idToken = params.idToken;
  if (!idToken) {
    return {
      success: false,
      error: 'Backend cần Google ID token (credential). accessToken không được hỗ trợ.',
      errorCode: 'NO_ID_TOKEN',
    };
  }

  await ensureApiBase();

  try {
    const result = await loginWithGoogleCredential(idToken);
    if (!result.success || !result.token) {
      return {
        success: false,
        error: result.error || 'Backend xác thực không thành công.',
        errorCode: 'BACKEND_ERROR',
      };
    }

    const userProfile = mapUserProfile(result.user);
    return { success: true, token: result.token, user: userProfile };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '';
    if (msg.includes('Network request failed') || msg.includes('fetch')) {
      return {
        success: false,
        error: `Không kết nối backend. ${BACKEND_DEV_HINT}`,
        errorCode: 'NETWORK_ERROR',
      };
    }
    return { success: false, error: msg || 'Lỗi không xác định.', errorCode: 'UNKNOWN' };
  }
}

export async function signInWithGoogle(_backendHost?: string): Promise<AuthResponse> {
  if (!isNativeGoogleAvailable) {
    return {
      success: false,
      error: 'EXPO_GO_FALLBACK',
      errorCode: 'PLAY_SERVICES_UNAVAILABLE',
    };
  }

  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const signInResult = await GoogleSignin.signIn();
    const idToken = signInResult.data?.idToken;

    if (!idToken) {
      return {
        success: false,
        error: 'Không lấy được ID Token từ Google.',
        errorCode: 'NO_ID_TOKEN',
      };
    }

    return sendGoogleTokenToBackend({ idToken });
  } catch (error: any) {
    if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      return { success: false, error: 'Người dùng đã hủy đăng nhập.', errorCode: 'CANCELLED' };
    }
    if (error.code === statusCodes.IN_PROGRESS) {
      return { success: false, error: 'Đang xử lý đăng nhập Google.', errorCode: 'IN_PROGRESS' };
    }
    if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      return {
        success: false,
        error: 'Google Play Services không khả dụng hoặc đã cũ.',
        errorCode: 'PLAY_SERVICES_UNAVAILABLE',
      };
    }

    const msg = error.message || '';
    if (msg.includes('Network request failed') || msg.includes('NetworkError') || error.code === '7') {
      return {
        success: false,
        error: 'Kết nối mạng không ổn định. Vui lòng thử lại.',
        errorCode: 'NETWORK_ERROR',
      };
    }
    return {
      success: false,
      error: error.message || 'Lỗi đăng nhập Google chưa xác định.',
      errorCode: 'UNKNOWN',
    };
  }
}
