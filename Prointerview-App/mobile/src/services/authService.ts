import * as SecureStore from 'expo-secure-store';
import { GOOGLE_AUTH_CONFIG } from '../config/googleAuth';

const TOKEN_KEY = 'user_jwt_token';
const USER_KEY = 'user_profile_data';

// Tự động phát hiện và import động thư viện Native Google Sign-in để tránh lỗi vỡ app trên Expo Go
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

    // Khởi tạo cấu hình Google Sign-in nếu có
    GoogleSignin.configure({
      webClientId: GOOGLE_AUTH_CONFIG.webClientId,
      iosClientId: GOOGLE_AUTH_CONFIG.iosClientId,
      offlineAccess: false,
    });
  }
} catch (e) {
  console.warn('Native RNGoogleSignin modules not available. Using Expo Go fallback mode.');
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  avatar?: string;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: UserProfile;
  error?: string;
  errorCode?: 'CANCELLED' | 'IN_PROGRESS' | 'PLAY_SERVICES_UNAVAILABLE' | 'NETWORK_ERROR' | 'BACKEND_ERROR' | 'NO_ID_TOKEN' | 'UNKNOWN';
}

import { Platform } from 'react-native';

const Storage = {
  setItemAsync: async (key: string, value: string) => {
    if (Platform.OS === 'web') {
      try { localStorage.setItem(key, value); } catch (e) {}
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  },
  getItemAsync: async (key: string) => {
    if (Platform.OS === 'web') {
      try { return localStorage.getItem(key); } catch (e) { return null; }
    }
    return await SecureStore.getItemAsync(key);
  },
  deleteItemAsync: async (key: string) => {
    if (Platform.OS === 'web') {
      try { localStorage.removeItem(key); } catch (e) {}
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  }
};

/**
 * Lưu trữ Token và User Profile vào bộ nhớ bảo mật
 */
export async function saveAuthData(token: string, user: UserProfile): Promise<void> {
  await Storage.setItemAsync(TOKEN_KEY, token);
  await Storage.setItemAsync(USER_KEY, JSON.stringify(user));
}

/**
 * Lấy Token từ bộ nhớ
 */
export async function getStoredToken(): Promise<string | null> {
  return await Storage.getItemAsync(TOKEN_KEY);
}

/**
 * Lấy User Profile từ bộ nhớ
 */
export async function getStoredUser(): Promise<UserProfile | null> {
  const data = await Storage.getItemAsync(USER_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data) as UserProfile;
  } catch {
    return null;
  }
}

/**
 * Xóa dữ liệu xác thực khỏi bộ nhớ (Đăng xuất)
 */
export async function clearAuthData(): Promise<void> {
  await Storage.deleteItemAsync(TOKEN_KEY);
  await Storage.deleteItemAsync(USER_KEY);
  if (isNativeGoogleAvailable && GoogleSignin) {
    try {
      await GoogleSignin.signOut();
    } catch (err) {
      // Bỏ qua lỗi sign out nếu chưa đăng nhập Google trước đó
    }
  }
}

/**
 * Gửi Google Token (idToken hoặc accessToken) lên Backend xác thực.
 * Dùng cho Browser Redirect OAuth2 flow (expo-auth-session) — hoạt động trên Expo Go.
 */
export async function sendGoogleTokenToBackend(params: {
  idToken?: string;
  accessToken?: string;
  backendHost?: string;
}): Promise<AuthResponse> {
  const { idToken, accessToken, backendHost } = params;
  const targetHost = backendHost || GOOGLE_AUTH_CONFIG.backendUrl;

  if (!idToken && !accessToken) {
    return { success: false, error: 'Không có token nào được cung cấp.', errorCode: 'NO_ID_TOKEN' };
  }

  try {
    // Tạo body request phù hợp với backend
    // Backend chấp nhận: { idToken } hoặc { credential }
    // Nếu chỉ có accessToken, gửi để backend tự gọi userinfo endpoint
    const body: Record<string, string> = {};
    if (idToken) {
      body.idToken = idToken;
    } else if (accessToken) {
      body.accessToken = accessToken;
    }

    console.log(`[GoogleAuth] Sending token to ${targetHost}/api/auth/google`);

    const response = await fetch(`${targetHost}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const text = await response.text();
    let resData: any = {};
    try {
      resData = JSON.parse(text);
    } catch {
      return {
        success: false,
        error: `Server trả về lỗi không phải JSON (HTTP ${response.status}).`,
        errorCode: 'BACKEND_ERROR',
      };
    }

    if (!response.ok || !resData.success || !resData.token) {
      return {
        success: false,
        error: resData.error || `Backend lỗi HTTP ${response.status}`,
        errorCode: 'BACKEND_ERROR',
      };
    }

    const userProfile: UserProfile = {
      id: resData.user?.id || resData.user?._id || '',
      email: resData.user?.email || '',
      fullName: resData.user?.name || resData.user?.fullName || '',
      avatar: resData.user?.avatar || '',
    };

    await saveAuthData(resData.token, userProfile);

    return { success: true, token: resData.token, user: userProfile };
  } catch (err: any) {
    const msg = err?.message || '';
    if (msg.includes('Network request failed') || msg.includes('fetch')) {
      return {
        success: false,
        error: 'Không kết nối được Backend. Kiểm tra lại IP và server đang chạy.',
        errorCode: 'NETWORK_ERROR',
      };
    }
    return { success: false, error: msg || 'Lỗi không xác định.', errorCode: 'UNKNOWN' };
  }
}

/**
 * Thực hiện toàn bộ quy trình đăng nhập Google:
 * 1. Gọi GoogleSignin.hasPlayServices()
 * 2. Gọi GoogleSignin.signIn() lấy Google ID Token
 * 3. Gửi ID Token đến backend xác thực
 * 4. Lưu JWT của hệ thống
 */
export async function signInWithGoogle(backendHost?: string): Promise<AuthResponse> {
  if (!isNativeGoogleAvailable) {
    return {
      success: false,
      error: 'EXPO_GO_FALLBACK',
      errorCode: 'PLAY_SERVICES_UNAVAILABLE',
    };
  }
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    
    // Đăng nhập lấy thông tin Google
    const signInResult = await GoogleSignin.signIn();
    
    // Đối với thư viện Google Sign-in mới nhất, thông tin nằm ở signInResult.data
    const idToken = signInResult.data?.idToken;
    
    if (!idToken) {
      return {
        success: false,
        error: 'Không lấy được ID Token từ Google.',
        errorCode: 'NO_ID_TOKEN',
      };
    }

    // Gửi ID Token đến Backend hệ thống
    const targetHost = backendHost || GOOGLE_AUTH_CONFIG.backendUrl;
    console.log(`Sending ID Token to Backend: ${targetHost}/api/auth/google`);

    const response = await fetch(`${targetHost}/api/auth/google`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ idToken }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMsg = `Backend trả lỗi HTTP ${response.status}`;
      try {
        const parsed = JSON.parse(errorText);
        errorMsg = parsed.error || parsed.message || errorMsg;
      } catch {}
      
      return {
        success: false,
        error: errorMsg,
        errorCode: 'BACKEND_ERROR',
      };
    }

    const resData = await response.json();
    if (!resData.success || !resData.token) {
      return {
        success: false,
        error: resData.error || 'Backend xác thực không thành công.',
        errorCode: 'BACKEND_ERROR',
      };
    }

    // Map thông tin người dùng từ Backend trả về
    const userProfile: UserProfile = {
      id: resData.user?.id || resData.user?._id || '',
      email: resData.user?.email || '',
      fullName: resData.user?.name || resData.user?.fullName || '',
      avatar: resData.user?.avatar || '',
    };

    // Lưu trữ thông tin
    await saveAuthData(resData.token, userProfile);

    return {
      success: true,
      token: resData.token,
      user: userProfile,
    };

  } catch (error: any) {
    console.error('Google Sign-in error details:', error);
    
    if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      return {
        success: false,
        error: 'Người dùng đã hủy đăng nhập.',
        errorCode: 'CANCELLED',
      };
    } else if (error.code === statusCodes.IN_PROGRESS) {
      return {
        success: false,
        error: 'Đang xử lý đăng nhập Google.',
        errorCode: 'IN_PROGRESS',
      };
    } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      return {
        success: false,
        error: 'Google Play Services không khả dụng hoặc đã cũ.',
        errorCode: 'PLAY_SERVICES_UNAVAILABLE',
      };
    } else {
      // Kiểm tra lỗi kết nối mạng
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
}
