import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Platform,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  View,
  StyleSheet,
  NativeModules,
} from 'react-native';
import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { ResponseType } from 'expo-auth-session';
import {
  GOOGLE_AUTH_CONFIG,
  isGoogleAuthConfigured,
  resolveGoogleRedirectUri,
} from '../config/googleAuth';
import { signInWithGoogleBrowser } from '../services/googleBrowserAuth';

WebBrowser.maybeCompleteAuthSession();

const isExpoGo = Constants.appOwnership === 'expo';

function loadGoogleScript(): Promise<void> {
  if (typeof document === 'undefined') return Promise.reject(new Error('no document'));
  if ((window as any).google?.accounts?.id) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('gsi load failed')));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('gsi load failed'));
    document.head.appendChild(script);
  });
}

type Props = {
  onCredential: (credential: string) => void | Promise<void>;
  onError?: (message: string) => void;
  disabled?: boolean;
  loading?: boolean;
};

function tryNativeGoogleIdToken(): Promise<string | null> {
  try {
    if (!NativeModules.RNGoogleSignin) return Promise.resolve(null);
    const { GoogleSignin } = require('@react-native-google-signin/google-signin');
    GoogleSignin.configure({
      webClientId: GOOGLE_AUTH_CONFIG.webClientId,
      iosClientId: GOOGLE_AUTH_CONFIG.iosClientId,
      offlineAccess: false,
    });
    return (async () => {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true }).catch(() => undefined);
      const result = await GoogleSignin.signIn();
      const idToken =
        result?.data?.idToken ||
        result?.idToken ||
        (await GoogleSignin.getTokens().then((t: { idToken?: string }) => t.idToken).catch(() => ''));
      return idToken || null;
    })();
  } catch {
    return Promise.resolve(null);
  }
}

/** Expo Go: Safari + localhost redirect (Google Web Client không chấp nhận exp://). */
function ExpoGoGoogleButton({ onCredential, onError, disabled, loading }: Props) {
  const busyRef = useRef(false);
  const [opening, setOpening] = useState(false);

  const handlePress = useCallback(async () => {
    if (busyRef.current || disabled || loading) return;
    if (!isGoogleAuthConfigured()) {
      onError?.('Thiếu EXPO_PUBLIC_GOOGLE_CLIENT_ID trong mobile/.env');
      return;
    }

    busyRef.current = true;
    setOpening(true);
    try {
      const result = await signInWithGoogleBrowser();
      if (result.cancelled) return;

      if (result.success) {
        const token = result.idToken || result.accessToken;
        if (token) {
          await onCredential(token);
          return;
        }
      }

      onError?.(
        result.error ||
          'Đăng nhập Google thất bại. Kiểm tra Google Console có http://localhost:8081',
      );
    } catch (err: unknown) {
      onError?.(err instanceof Error ? err.message : 'Lỗi kết nối Google.');
    } finally {
      busyRef.current = false;
      setOpening(false);
    }
  }, [disabled, loading, onCredential, onError]);

  return (
    <TouchableOpacity
      style={[styles.btn, (disabled || loading || opening) && styles.btnDisabled]}
      onPress={handlePress}
      disabled={disabled || loading || opening}
    >
      {loading || opening ? (
        <ActivityIndicator color="#1f2937" />
      ) : (
        <Text style={styles.btnText}>Tiếp tục với Google</Text>
      )}
    </TouchableOpacity>
  );
}

function NativeGoogleButton({ onCredential, onError, disabled, loading }: Props) {
  const redirectUri = resolveGoogleRedirectUri();

  const [request, , promptAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_AUTH_CONFIG.webClientId,
    clientId: GOOGLE_AUTH_CONFIG.webClientId,
    redirectUri,
    responseType: ResponseType.IdToken,
    scopes: ['openid', 'profile', 'email'],
    extraParams: {
      nonce: Math.random().toString(36).slice(2),
    },
  });

  const handlePress = useCallback(async () => {
    try {
      const nativeToken = await tryNativeGoogleIdToken();
      if (nativeToken) {
        await onCredential(nativeToken);
        return;
      }

      if (!request) {
        onError?.('Google Sign-In chưa sẵn sàng. Thử lại sau vài giây.');
        return;
      }

      const result = await promptAsync();
      if (result.type === 'cancel' || result.type === 'dismiss') return;

      if (result.type === 'error') {
        onError?.(result.error?.message || 'Lỗi đăng nhập Google.');
        return;
      }

      if (result.type === 'success') {
        const params = result.params || {};
        const idToken =
          params.id_token ||
          params.idToken ||
          result.authentication?.idToken ||
          '';

        if (!idToken) {
          onError?.(
            `Không nhận được id_token. Thêm redirect URI vào Google Console:\n${redirectUri}`,
          );
          return;
        }

        await onCredential(idToken);
      }
    } catch (err: unknown) {
      onError?.(err instanceof Error ? err.message : 'Lỗi kết nối Google.');
    }
  }, [request, promptAsync, onCredential, onError, redirectUri]);

  if (isExpoGo) {
    return (
      <ExpoGoGoogleButton
        onCredential={onCredential}
        onError={onError}
        disabled={disabled}
        loading={loading}
      />
    );
  }

  return (
    <TouchableOpacity
      style={[styles.btn, disabled && styles.btnDisabled]}
      onPress={handlePress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color="#1f2937" />
      ) : (
        <Text style={styles.btnText}>Tiếp tục với Google</Text>
      )}
    </TouchableOpacity>
  );
}

function WebGoogleButton({ onCredential, onError, disabled, loading }: Props) {
  const onCredentialRef = useRef(onCredential);
  const onErrorRef = useRef(onError);
  onCredentialRef.current = onCredential;
  onErrorRef.current = onError;

  useEffect(() => {
    if (!isGoogleAuthConfigured()) return;

    let cancelled = false;

    (async () => {
      try {
        await loadGoogleScript();
        if (cancelled || !(window as any).google?.accounts?.id) return;

        (window as any).google.accounts.id.initialize({
          client_id: GOOGLE_AUTH_CONFIG.webClientId,
          callback: (response: { credential?: string }) => {
            if (response?.credential) {
              void onCredentialRef.current(response.credential);
            } else {
              onErrorRef.current?.('Không nhận được credential từ Google.');
            }
          },
          auto_select: false,
        });
      } catch {
        // fallback popup
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const openOAuthPopup = useCallback(() => {
    const clientId = GOOGLE_AUTH_CONFIG.webClientId;
    const nonce = Math.random().toString(36).slice(2);
    const redirectUri = typeof window !== 'undefined' ? window.location.origin : '';
    const url =
      `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=id_token&scope=${encodeURIComponent('openid profile email')}` +
      `&nonce=${nonce}&state=google_auth`;

    const popup = window.open(url, 'Google Login', 'width=500,height=620');
    if (!popup) {
      onError?.('Trình duyệt chặn popup. Cho phép popup cho localhost.');
      return;
    }

    const onMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'GOOGLE_AUTH_SUCCESS' && event.data.credential) {
        window.removeEventListener('message', onMessage);
        await onCredential(event.data.credential);
      }
    };
    window.addEventListener('message', onMessage);
  }, [onCredential, onError]);

  const handlePress = useCallback(() => {
    try {
      const gsi = (window as any).google?.accounts?.id;
      if (gsi?.prompt) {
        gsi.prompt((notification: { isNotDisplayed?: () => boolean; isSkippedMoment?: () => boolean }) => {
          if (notification?.isNotDisplayed?.() || notification?.isSkippedMoment?.()) {
            openOAuthPopup();
          }
        });
        return;
      }
    } catch {
      // fallback
    }
    openOAuthPopup();
  }, [openOAuthPopup]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const hash = window.location.hash?.substring(1);
    if (!hash) return;
    const params = new URLSearchParams(hash);
    const idToken = params.get('id_token');
    if (idToken && params.get('state') === 'google_auth' && window.opener) {
      window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS', credential: idToken }, '*');
      window.close();
    }
  }, []);

  if (!isGoogleAuthConfigured()) {
    return (
      <View style={styles.warnBox}>
        <Text style={styles.warnText}>Thiếu EXPO_PUBLIC_GOOGLE_CLIENT_ID</Text>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.btn, (disabled || loading) && styles.btnDisabled]}
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.88}
    >
      {loading ? (
        <ActivityIndicator color="#1f2937" />
      ) : (
        <Text style={styles.btnText}>Tiếp tục với Google</Text>
      )}
    </TouchableOpacity>
  );
}

export default function GoogleSignInButton(props: Props) {
  if (Platform.OS === 'web') {
    return <WebGoogleButton {...props} />;
  }
  return <NativeGoogleButton {...props} />;
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.9)',
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#1f2937', fontSize: 15, fontWeight: '700' },
  warnBox: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(239,68,68,0.15)',
  },
  warnText: { color: '#fca5a5', fontSize: 12, textAlign: 'center' },
});
