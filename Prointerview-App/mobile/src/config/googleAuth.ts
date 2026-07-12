export const GOOGLE_AUTH_CONFIG = {
  // Web Client ID: BẮT BUỘC - Dùng cho Expo Go (browser redirect flow)
  // Lấy từ Google Cloud Console > OAuth 2.0 Client IDs > Web application
  webClientId: '956250299695-4sqi587k4p3ubtrpcchhjvhkfats7nbe.apps.googleusercontent.com',

  // Android Client ID (chỉ dùng khi build native APK)
  androidClientId: 'REPLACE_WITH_YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com',

  // iOS Client ID (chỉ dùng khi build native iOS)
  iosClientId: 'REPLACE_WITH_YOUR_IOS_CLIENT_ID.apps.googleusercontent.com',

  // Expo username của bạn trên https://expo.dev (dùng để tạo redirect URI cho Expo Go)
  // VD: nếu profile là https://expo.dev/@myusername/... thì điền 'myusername'
  expoUsername: 'vietvan',

  // Backend Host URL dùng để gọi API xác thực
  backendUrl: 'http://10.0.2.2:5001' // 10.0.2.2 = localhost của máy tính khi chạy Android Emulator
};

