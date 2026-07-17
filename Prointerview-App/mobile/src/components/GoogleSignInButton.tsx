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

WebBrowser.maybeCompleteAuthSession();

const isExpoGo = Constants.appOwnership === 'expo';

const EXPO_GO_GOOGLE_MSG =
  'Đăng nhập Google không chạy ổn định trên Expo Go (proxy auth.expo.io đã lỗi thời).\n\n' +
  'Cách dùng được:\n' +
  '• Email / mật khẩu trên Expo Go\n' +
  '• Hoặc chạy development build: npx expo run:ios / run:android\n' +
  '• Hoặc thử trên web: npx expo start --web';

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
      // Development build: native SDK ổn định hơn expo-auth-session
      const nativeToken = await tryNativeGoogleIdToken();
      if (nativeToken) {
        await onCredential(nativeToken);
        return;
      }

      // Expo Go + auth.expo.io: proxy đã lỗi thời → báo rõ, tránh màn "Something went wrong"
      if (isExpoGo) {
        onError?.(EXPO_GO_GOOGLE_MSG);
        return;
      }

      if (!request) {
        onError?.('Google Sign-In chưa sẵn sàng. Thử lại sau vài giây.');
        return;
      }

      console.log('[GoogleAuth] redirectUri:', redirectUri);
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

  return (
    <TouchableOpacity
      style={[styles.btn, disabled && styles.btnDisabled]}
      onPress={handlePress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color="#ffffff" />
      ) : (
        <Text style={styles.btnText}>Tiếp tục với Google</Text>
      )}
    </TouchableOpacity>
  );
}

function WebGoogleButton({ onCredential, onError, disabled, loading }: Props) {
  const buttonRef = useRef<HTMLDivElement | null>(null);
  const [gsiReady, setGsiReady] = useState(false);
  const [gsiFailed, setGsiFailed] = useState(false);

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

        if (buttonRef.current) {
          buttonRef.current.innerHTML = '';
          (window as any).google.accounts.id.renderButton(buttonRef.current, {
            type: 'standard',
            theme: 'filled_black',
            size: 'large',
            text: 'continue_with',
            shape: 'pill',
            width: Math.min(buttonRef.current.offsetWidth || 320, 360),
            locale: 'vi',
          });
        }

        if (!cancelled) setGsiReady(true);
      } catch {
        if (!cancelled) setGsiFailed(true);
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

  if (loading) {
    return (
      <View style={[styles.btn, styles.btnDisabled]}>
        <ActivityIndicator color="#ffffff" />
      </View>
    );
  }

  if (gsiFailed) {
    return (
      <TouchableOpacity style={styles.btn} onPress={openOAuthPopup} disabled={disabled}>
        <Text style={styles.btnText}>Tiếp tục với Google</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.webWrap, disabled && { opacity: 0.5 }]} pointerEvents={disabled ? 'none' : 'auto'}>
      {!gsiReady ? (
        <View style={[styles.btn, styles.btnDisabled]}>
          <ActivityIndicator color="#ffffff" />
        </View>
      ) : (
        <div
          ref={buttonRef as any}
          style={{ width: '100%', minHeight: 44, display: 'flex', justifyContent: 'center' }}
        />
      )}
    </View>
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
    backgroundColor: '#1a1a2e',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#ffffff', fontSize: 15, fontWeight: '600' },
  webWrap: { width: '100%' },
  warnBox: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(239,68,68,0.15)',
  },
  warnText: { color: '#fca5a5', fontSize: 12, textAlign: 'center' },
});
