import React, { useState, useRef } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { GOOGLE_AUTH_CONFIG, GOOGLE_WEBVIEW_REDIRECT_URI } from '../config/googleAuth';

interface GoogleAuthWebViewProps {
  visible: boolean;
  onSuccess: (token: string, kind?: 'id_token' | 'access_token') => void;
  onCancel: () => void;
  onError: (error: string) => void;
}

function buildGoogleAuthUrl(): string {
  const nonce = Math.random().toString(36).slice(2);
  const params = new URLSearchParams({
    client_id: GOOGLE_AUTH_CONFIG.webClientId,
    redirect_uri: GOOGLE_WEBVIEW_REDIRECT_URI,
    response_type: 'id_token token',
    scope: 'openid profile email',
    prompt: 'select_account',
    nonce,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

function isOAuthRedirectUrl(url: string) {
  if (!url) return false;
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(url)) return true;
  return /[#?&](id_token|access_token)=/i.test(url);
}

/**
 * Modal WebView — chặn redirect localhost TRONG app, không mở Safari.
 */
export function GoogleAuthWebView({
  visible,
  onSuccess,
  onCancel,
  onError,
}: GoogleAuthWebViewProps) {
  const [loading, setLoading] = useState(true);
  const handled = useRef(false);

  const extractTokenFromUrl = (url: string) => {
    const tryParams = (raw: string) => {
      const params = new URLSearchParams(raw);
      return {
        accessToken: params.get('access_token'),
        idToken: params.get('id_token'),
        error: params.get('error'),
      };
    };

    const hashIndex = url.indexOf('#');
    if (hashIndex !== -1) {
      const { accessToken, idToken, error } = tryParams(url.substring(hashIndex + 1));
      if (error) {
        handled.current = true;
        onError(`Google lỗi: ${error}`);
        return;
      }
      if (idToken) {
        handled.current = true;
        onSuccess(idToken, 'id_token');
        return;
      }
      if (accessToken) {
        handled.current = true;
        onSuccess(accessToken, 'access_token');
        return;
      }
    }

    const queryIndex = url.indexOf('?');
    if (queryIndex !== -1) {
      const query = url.substring(queryIndex + 1).split('#')[0];
      const { accessToken, idToken, error } = tryParams(query);
      if (error) {
        handled.current = true;
        onError(`Google lỗi: ${error}`);
        return;
      }
      if (idToken) {
        handled.current = true;
        onSuccess(idToken, 'id_token');
        return;
      }
      if (accessToken) {
        handled.current = true;
        onSuccess(accessToken, 'access_token');
        return;
      }
    }

    handled.current = true;
    onError('Không nhận được token từ Google. Kiểm tra Redirect URI http://localhost:8081 trong Google Console.');
  };

  const handleNavigationChange = (navState: { url: string }) => {
    const { url } = navState;
    if (!url || !isOAuthRedirectUrl(url) || handled.current) return;
    extractTokenFromUrl(url);
  };

  const handleShouldStartLoad = (request: { url: string }) => {
    const { url } = request;
    if (isOAuthRedirectUrl(url)) {
      if (!handled.current) extractTokenFromUrl(url);
      return false;
    }
    return true;
  };

  const handleClose = () => {
    handled.current = false;
    onCancel();
  };

  const handleModalShow = () => {
    handled.current = false;
    setLoading(true);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onShow={handleModalShow}
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Đăng nhập với Google</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Text style={styles.closeText}>✕ Đóng</Text>
          </TouchableOpacity>
        </View>

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4285F4" />
            <Text style={styles.loadingText}>Đang tải trang đăng nhập...</Text>
          </View>
        )}

        <WebView
          source={{ uri: buildGoogleAuthUrl() }}
          onNavigationStateChange={handleNavigationChange}
          onShouldStartLoadWithRequest={handleShouldStartLoad}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          style={loading ? styles.hidden : styles.webview}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
          userAgent="Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  closeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
  },
  closeText: {
    fontSize: 14,
    color: '#555',
    fontWeight: '500',
  },
  loadingContainer: {
    position: 'absolute',
    top: 70,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    zIndex: 10,
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
    fontSize: 14,
  },
  webview: {
    flex: 1,
  },
  hidden: {
    width: 0,
    height: 0,
  },
});
