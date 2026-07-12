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
import { GOOGLE_AUTH_CONFIG } from '../config/googleAuth';

interface GoogleAuthWebViewProps {
  visible: boolean;
  onSuccess: (accessToken: string) => void;
  onCancel: () => void;
  onError: (error: string) => void;
}

// URI redirect — phải có trong Google Console > "Authorized redirect URIs"
// Dùng http://localhost:8081 vì Google không chấp nhận http://localhost (không có port) cho Web client
const REDIRECT_URI = 'http://localhost:8081';

function buildGoogleAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: GOOGLE_AUTH_CONFIG.webClientId,
    redirect_uri: REDIRECT_URI,
    response_type: 'token',
    scope: 'profile email',
    prompt: 'select_account',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Modal WebView đăng nhập Google trực tiếp trong app.
 * Tải trang OAuth của Google, tự chặn redirect và trích xuất access_token.
 * Hoạt động hoàn toàn trên Expo Go — không cần scheme hay proxy.
 */
export function GoogleAuthWebView({
  visible,
  onSuccess,
  onCancel,
  onError,
}: GoogleAuthWebViewProps) {
  const [loading, setLoading] = useState(true);
  const handled = useRef(false);

  const handleNavigationChange = (navState: { url: string }) => {
    const { url } = navState;
    if (!url) return;

    // Khi Google redirect về http://localhost:8081 hoặc http://localhost, bắt URL và trích xuất token
    if (url.startsWith('http://localhost')) {
      if (handled.current) return;
      extractTokenFromUrl(url);
    }
  };

  // Chặn WebView tải http://localhost:8081 — trích xuất token ngay, không để tải trang
  const handleShouldStartLoad = (request: { url: string }) => {
    const { url } = request;
    if (url.startsWith('http://localhost')) {
      if (!handled.current) {
        extractTokenFromUrl(url);
      }
      return false; // CHẶN — không tải trang
    }
    return true; // Cho phép tải trang Google
  };

  const extractTokenFromUrl = (url: string) => {
    // Thử lấy từ fragment (#access_token=...)
    const fragmentIndex = url.indexOf('#');
    if (fragmentIndex !== -1) {
      const fragment = url.substring(fragmentIndex + 1);
      const params = new URLSearchParams(fragment);
      const accessToken = params.get('access_token');
      const idToken = params.get('id_token');
      const error = params.get('error');

      if (error) { handled.current = true; onError(`Google lỗi: ${error}`); return; }
      if (idToken)  { handled.current = true; onSuccess(idToken); return; }
      if (accessToken) { handled.current = true; onSuccess(accessToken); return; }
    }

    // Thử lấy từ query string (?access_token=...)
    const queryIndex = url.indexOf('?');
    if (queryIndex !== -1) {
      const query = url.substring(queryIndex + 1);
      const params = new URLSearchParams(query);
      const accessToken = params.get('access_token');
      const idToken = params.get('id_token');
      const error = params.get('error');

      if (error) { handled.current = true; onError(`Google lỗi: ${error}`); return; }
      if (idToken) { handled.current = true; onSuccess(idToken); return; }
      if (accessToken) { handled.current = true; onSuccess(accessToken); return; }
    }

    // Không tìm được token
    handled.current = true;
    onError('Không nhận được token từ Google. Kiểm tra lại Redirect URI trong Google Console.');
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
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Đăng nhập với Google</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Text style={styles.closeText}>✕ Đóng</Text>
          </TouchableOpacity>
        </View>

        {/* Loading indicator */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4285F4" />
            <Text style={styles.loadingText}>Đang tải trang đăng nhập...</Text>
          </View>
        )}

        {/* Google OAuth WebView */}
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
          // Xóa cookies cũ khi mở lại để luôn hỏi chọn tài khoản
          incognito={false}
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
