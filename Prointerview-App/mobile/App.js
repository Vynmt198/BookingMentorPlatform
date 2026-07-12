import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  SafeAreaView, 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  Dimensions, 
  StatusBar,
  Platform,
  ActivityIndicator,
  Animated,
  TextInput,
  Modal,
  NativeModules,
  Alert,
  Linking
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import WebView from 'react-native-webview';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { useGoogleBrowserAuth } from './src/hooks/useGoogleBrowserAuth';

const { width, height } = Dimensions.get('window');

// Tự động nhận diện IP của máy tính chạy Expo để kết nối với Backend trong mạng cục bộ.
const BACKEND_HOST = (() => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return window.location.hostname;
  }
  if (Platform.OS === 'android') {
    return 'localhost';
  }
  const scriptURL = NativeModules.SourceCode?.scriptURL;
  if (scriptURL) {
    const match = scriptURL.match(/^https?:\/\/([^:/]+)/);
    if (match && match[1]) {
      return match[1];
    }
  }
  return 'localhost';
})();

const MOBILE_SCHEME = (() => {
  const scriptURL = NativeModules.SourceCode?.scriptURL;
  if (scriptURL) {
    const match = scriptURL.match(/^https?:\/\/([^/]+)/);
    if (match && match[1]) {
      return `exp://${match[1]}`;
    }
  }
  return 'exp://localhost:8081';
})();

// Dữ liệu Mock dự phòng
const FALLBACK_MENTORS = [
  { id: 'u6a521ef97d243982c05967c8', name: 'Nguyễn Minh An', role: 'Senior Frontend Engineer', rating: 4.9, avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', company: 'Grab', category: 'Frontend', reviews: 42 },
  { id: 'u6a521ef97d243982c05967ca', name: 'Trần Thị Hương', role: 'Technical Product Manager', rating: 4.8, avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80', company: 'Shopee', category: 'Product', reviews: 29 },
  { id: 'u6a521ef97d243982c05967cc', name: 'Lê Quốc Bảo', role: 'Engineering Manager', rating: 5.0, avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80', company: 'VNG', category: 'Backend', reviews: 35 }
];

const FALLBACK_COURSES = [
  { id: 1, title: 'React & TypeScript — Chuẩn bị phỏng vấn Frontend', price: '499.000đ', duration: '12 bài học', image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=300&auto=format&fit=crop&q=80', category: 'Frontend', rating: 4.8 },
  { id: 2, title: 'Product Manager — Case Interview & Metrics', price: '799.000đ', duration: '18 bài học', image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=300&auto=format&fit=crop&q=80', category: 'Backend', rating: 4.9 }
];

const NEWS_DATA = [
  {
    id: 1,
    image: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&q=80&w=800",
    date: "11 THÁNG 6, 2026",
    title: "Dự án ProInterview tiến vào Bán kết “Ra Khơi 2026”",
    author: "ProInterview Team",
    authorWebsite: "prointerview.vn"
  }
];

const API_PORTS = ['5001', '5000'];

const RICH_FALLBACK_PROFILE = {
  id: "65cb1a3b5f92d718b2c45def",
  name: "Nguyễn Văn Phong",
  email: "mentor@dev.local",
  role: "customer",
  avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
  phone: "0987 654 321",
  position: "Senior React Native Developer",
  currentCompany: "VNG Corporation",
  school: "Đại học FPT",
  experience: "5",
  expertise: ["React Native", "JavaScript", "TypeScript", "Redux", "CI/CD", "Docker", "NodeJS"],
  bio: "Đam mê xây dựng ứng dụng di động chất lượng cao, tối ưu hiệu năng và trải nghiệm người dùng đầu cuối.",
  profileWorkExperience: "3 năm Senior Mobile Engineer tại VNG, 2 năm React Native Developer tại FPT Software.",
  profileEducation: "Cử nhân Kỹ thuật Phần mềm - Đại học FPT Hồ Chí Minh (2018 - 2022)",
  profileAwards: "Lập trình viên xuất sắc nhất năm 2024 tại ZaloPay Division",
  plan: "professional",
  quota: {
    cvAnalysisUsed: 1,
    cvAnalysisLimit: 5,
    mentorSessionUsed: 2,
    mentorSessionLimit: 3
  }
};

const BackgroundVideo = ({ uri }) => {
  if (Platform.OS === 'web') {
    return (
      <video
        src={uri}
        autoPlay
        muted
        loop
        playsInline
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          bottom: 0,
          right: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          zIndex: 0,
        }}
      />
    );
  }

  try {
    const { Video, ResizeMode } = require('expo-av');
    return (
      <Video
        source={{ uri }}
        rate={1.0}
        volume={0.0}
        isMuted={true}
        resizeMode={ResizeMode.COVER}
        shouldPlay={true}
        isLooping={true}
        style={StyleSheet.absoluteFillObject}
      />
    );
  } catch (e) {
    return <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#06040b' }]} />;
  }
};

const HeroAtmosphere = () => {
  if (Platform.OS === 'web') {
    return (
      <>
        <style>{`
          .codex-mesh-bg {
            position: absolute;
            inset: 0;
            z-index: 0;
            overflow: hidden;
            pointer-events: none;
            isolation: isolate;
            mask-image: linear-gradient(180deg, #000 0%, #000 78%, rgba(0,0,0,0.92) 90%, rgba(0,0,0,0.5) 96%, transparent 100%);
          }
          .cb { position: absolute; border-radius: 50%; }
          .cb-far-1 { width: 80vw; height: 65vh; top: -20%; left: -15%; background: radial-gradient(ellipse at 40% 40%, rgba(128,55,244,0.55) 0%, rgba(128,55,244,0) 70%); filter: blur(65px); animation: fog-a 14s ease-in-out infinite; }
          .cb-far-2 { width: 65vw; height: 55vh; bottom: -15%; right: -10%; background: radial-gradient(ellipse at 55% 60%, rgba(147,87,245,0.45) 0%, rgba(147,87,245,0) 70%); filter: blur(70px); animation: fog-b 16s ease-in-out infinite; }
          .cb-glow-1 { width: 50vw; height: 45vh; top: 12%; left: 18%; background: radial-gradient(ellipse at 45% 45%, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0) 55%); filter: blur(50px); animation: fog-glow 11s ease-in-out infinite; }
          @keyframes fog-a { 0% { opacity: 1; transform: scale(1) translate(0,0); } 50% { opacity: 0.8; transform: scale(1.1) translate(6%,8%); } 100% { opacity: 1; transform: scale(1) translate(0,0); } }
          @keyframes fog-b { 0% { opacity: 1; transform: scale(1) translate(0,0); } 50% { opacity: 0.82; transform: scale(1.15) translate(-8%,5%); } 100% { opacity: 1; transform: scale(1) translate(0,0); } }
          @keyframes fog-glow { 0% { opacity: 1; transform: scale(1) translate(0,0); } 50% { opacity: 0.7; transform: scale(1.15) translate(5%,5%); } 100% { opacity: 1; transform: scale(1) translate(0,0); } }
        `}</style>
        <div className="codex-mesh-bg" aria-hidden="true">
          <div className="cb cb-far-1" />
          <div className="cb cb-far-2" />
          <div className="cb cb-glow-1" />
        </div>
      </>
    );
  }

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      <View style={[styles.glowSphere, { top: -100, left: -100, backgroundColor: 'rgba(128,55,244,0.35)' }]} />
      <View style={[styles.glowSphere, { bottom: -100, right: -100, backgroundColor: 'rgba(147,87,245,0.25)' }]} />
    </View>
  );
};

function AppInner() {
  const { loginWithGoogle, error: authContextError, isLoading: authContextLoading, logout: authContextLogout } = useAuth();
  const { promptAsync: promptGoogleBrowser, isReady: isGoogleBrowserReady } = useGoogleBrowserAuth();
  const [currentUser, setCurrentUser] = useState(null); 
  const [userToken, setUserToken] = useState(null);
  const [activeTab, setActiveTab] = useState('home'); 
  const [mentors, setMentors] = useState([]);
  const [courses, setCourses] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [cvAnalyses, setCvAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isUsingMock, setIsUsingMock] = useState(false);
  const [activePort, setActivePort] = useState(null);
  const [justLoggedOut, setJustLoggedOut] = useState(false);

  // Form Đăng Nhập
  const [email, setEmail] = useState('customer@dev.local'); 
  const [password, setPassword] = useState('Dev123456'); 
  const [authError, setAuthError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  // Form Đăng Ký (Native)
  const [authScreen, setAuthScreen] = useState('login'); // 'login' or 'register'
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regError, setRegError] = useState('');
  const [registering, setRegistering] = useState(false);
  const [regSuccessMessage, setRegSuccessMessage] = useState('');

  // Modal chọn tài khoản Google (OAuth simulation)
  const [googleModalVisible, setGoogleModalVisible] = useState(false);
  const [googleWebViewVisible, setGoogleWebViewVisible] = useState(false);
  const [loggingInGoogle, setLoggingInGoogle] = useState(false);

  // Modal danh sách thông báo
  const [notifModalVisible, setNotifModalVisible] = useState(false);

  // Bộ lọc tìm kiếm cho Mentors & Courses
  const [searchMentorQuery, setSearchMentorQuery] = useState('');
  const [selectedMentorCategory, setSelectedMentorCategory] = useState('Tất cả');
  const [searchCourseQuery, setSearchCourseQuery] = useState('');
  const [selectedCourseCategory, setSelectedCourseCategory] = useState('Tất cả');

  // Trạng thái Mô phỏng Phân tích CV
  const [cvFile, setCvFile] = useState(null);
  const [analyzingStatus, setAnalyzingStatus] = useState(''); 
  const [analysisProgress, setAnalysisProgress] = useState(0);

  // Modal thông báo đặt lịch thành công
  const [bookingSuccessModal, setBookingSuccessModal] = useState(false);
  const [bookedMentor, setBookedMentor] = useState(null);

  // Trạng thái Tab con của Trang cá nhân
  const [profileSubTab, setProfileSubTab] = useState('info');

  // Trạng thái Đổi mật khẩu
  const [changePasswordModalVisible, setChangePasswordModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changePasswordError, setChangePasswordError] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

  const handleChangePassword = async () => {
    setChangePasswordError('');
    if (!newPassword || newPassword.trim().length < 6) {
      setChangePasswordError('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setChangePasswordError('Mật khẩu mới và mật khẩu xác nhận không khớp.');
      return;
    }

    setUpdatingPassword(true);
    try {
      const body = {
        newPassword: newPassword.trim(),
      };
      if (!currentUser?.hasGoogleLogin) {
        if (!currentPassword) {
          setChangePasswordError('Vui lòng nhập mật khẩu hiện tại.');
          setUpdatingPassword(false);
          return;
        }
        body.currentPassword = currentPassword.trim();
      }

      const response = await fetch(`http://${BACKEND_HOST}:${activePort}/api/auth/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify(body)
      });

      const resData = await response.json();
      if (response.ok && resData.success) {
        if (Platform.OS === 'web') {
          window.alert('Thay đổi mật khẩu thành công!');
        } else {
          Alert.alert('Thành công', 'Thay đổi mật khẩu thành công!');
        }
        setChangePasswordModalVisible(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setChangePasswordError(resData.error || 'Thay đổi mật khẩu thất bại.');
      }
    } catch (e) {
      setChangePasswordError('Không thể kết nối đến máy chủ.');
    }
    setUpdatingPassword(false);
  };

  const handleToggleInAppNotifications = () => {
    const isCurrentlyOn = currentUser?.notificationPrefs?.customer?.mentor_feedback !== false;
    
    const performToggle = async () => {
      if (userToken && activePort) {
        try {
          const response = await fetch(`http://${BACKEND_HOST}:${activePort}/api/auth/me`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${userToken}`
            },
            body: JSON.stringify({
              notificationPrefs: {
                customer: {
                  interview_reminder: !isCurrentlyOn,
                  mentor_feedback: !isCurrentlyOn,
                  streak_reminder: !isCurrentlyOn
                }
              }
            })
          });
          if (response.ok) {
            if (Platform.OS === 'web') {
              window.alert(`Đã ${!isCurrentlyOn ? "bật" : "tắt"} thông báo đẩy thành công!`);
            } else {
              Alert.alert("Thành công", `Đã ${!isCurrentlyOn ? "bật" : "tắt"} thông báo đẩy thành công!`);
            }
            loadUserData(userToken, activePort);
          } else {
            if (Platform.OS === 'web') {
              window.alert("Không thể cập nhật cấu hình thông báo.");
            } else {
              Alert.alert("Lỗi", "Không thể cập nhật cấu hình thông báo.");
            }
          }
        } catch (e) {
          if (Platform.OS === 'web') {
            window.alert("Không thể kết nối tới server.");
          } else {
            Alert.alert("Lỗi", "Không thể kết nối tới server.");
          }
        }
      }
    };

    if (Platform.OS === 'web') {
      const confirmToggle = window.confirm(`Hiện tại thông báo đang: ${isCurrentlyOn ? "BẬT" : "TẮT"}.\nBạn có muốn ${isCurrentlyOn ? "Tắt" : "Bật"} toàn bộ thông báo đẩy không?`);
      if (confirmToggle) {
        performToggle();
      }
    } else {
      Alert.alert(
        "Thông báo đẩy (In-app)",
        `Hiện tại thông báo đang: ${isCurrentlyOn ? "BẬT" : "TẮT"}.\nBạn có muốn ${isCurrentlyOn ? "Tắt" : "Bật"} toàn bộ thông báo đẩy không?`,
        [
          { text: "Hủy", style: "cancel" },
          { 
            text: "Xác nhận", 
            onPress: performToggle
          }
        ]
      );
    }
  };

  const handleRealLogout = async () => {
    const performLogout = async () => {
      if (userToken && activePort) {
        try {
          await fetch(`http://${BACKEND_HOST}:${activePort}/api/auth/logout`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${userToken}`
            }
          });
        } catch (e) {}
      }
      try {
        const { clearAuthData } = require('./src/services/authService');
        await clearAuthData();
        await authContextLogout();
      } catch (err) {}
      setCurrentUser(null);
      setUserToken(null);
      setBookings([]);
      setNotifications([]);
      setCvAnalyses([]);
      setJustLoggedOut(true);
    };

    if (Platform.OS === 'web') {
      const confirmLogout = window.confirm("Bạn có chắc chắn muốn đăng xuất khỏi tài khoản không?");
      if (confirmLogout) {
        performLogout();
      }
    } else {
      Alert.alert(
        "Đăng xuất",
        "Bạn có chắc chắn muốn đăng xuất khỏi tài khoản không?",
        [
          { text: "Hủy", style: "cancel" },
          {
            text: "Đăng xuất",
            style: "destructive",
            onPress: performLogout
          }
        ]
      );
    }
  };

  // Hiệu ứng sparkles & quét CV
  const floatAnim = useRef(new Animated.Value(0)).current;
  const scanAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -8,
          duration: 2000,
          useNativeDriver: Platform.OS !== 'web'
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: Platform.OS !== 'web'
        })
      ])
    ).start();
  }, []);

  useEffect(() => {
    if (analyzingStatus === 'loading') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanAnim, {
            toValue: 140,
            duration: 1200,
            useNativeDriver: Platform.OS !== 'web'
          }),
          Animated.timing(scanAnim, {
            toValue: 0,
            duration: 1200,
            useNativeDriver: Platform.OS !== 'web'
          })
        ])
      ).start();
    } else {
      scanAnim.setValue(0);
    }
  }, [analyzingStatus]);

  const loadData = async () => {
    setLoading(true);
    let success = false;

    for (const port of API_PORTS) {
      try {
        const mentorsUrl = `http://${BACKEND_HOST}:${port}/api/mentors`;
        const coursesUrl = `http://${BACKEND_HOST}:${port}/api/courses`;

        const mentorsRes = await fetch(mentorsUrl, { headers: { Accept: 'application/json' } });
        if (mentorsRes.ok) {
          const rawMentors = await mentorsRes.json();
          const mentorsList = Array.isArray(rawMentors) ? rawMentors : (rawMentors?.mentors || []);
          const mappedMentors = mentorsList.map((m) => {
            const roleStr = m.role || m.title || m.headline || '';
            return {
              id: m._id || m.id,
              name: m.name || m.fullName || 'Mentor',
              role: roleStr || 'Chuyên gia công nghệ',
              company: m.company || m.currentCompany || 'Đang cập nhật',
              rating: m.rating || m.averageRating || 5.0,
              avatar: m.avatar || m.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
              category: roleStr.toLowerCase().includes('frontend') ? 'Frontend' : 
                        roleStr.toLowerCase().includes('backend') ? 'Backend' : 
                        roleStr.toLowerCase().includes('qa') ? 'QA/QC' : 'AI/ML',
              reviews: m.reviewsCount || Math.floor(Math.random() * 30) + 10
            };
          });
          setMentors(mappedMentors);

          try {
            const coursesRes = await fetch(coursesUrl, { headers: { Accept: 'application/json' } });
            if (coursesRes.ok) {
              const rawCourses = await coursesRes.json();
              const coursesList = Array.isArray(rawCourses) ? rawCourses : (rawCourses?.courses || []);
              const mappedCourses = coursesList.map((c) => {
                const titleStr = c.title || '';
                return {
                  id: c._id || c.id,
                  title: titleStr || 'Khóa học',
                  price: typeof c.price === 'number' ? `${c.price.toLocaleString('vi-VN')}đ` : 'Miễn phí',
                  duration: c.duration || (c.lessonsCount ? `${c.lessonsCount} bài học` : 'Đang cập nhật'),
                  image: c.image || c.thumbnail || c.coverImage || 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=300&auto=format&fit=crop&q=80',
                  category: titleStr.toLowerCase().includes('frontend') ? 'Frontend' : 
                            titleStr.toLowerCase().includes('backend') ? 'Backend' : 'AI/ML',
                  rating: c.rating || 4.8
                };
              });
              setCourses(mappedCourses);
            } else {
              setCourses(FALLBACK_COURSES);
            }
          } catch (e) {
            setCourses(FALLBACK_COURSES);
          }

          setActivePort(port);
          setIsUsingMock(false);
          success = true;
          break;
        }
      } catch (e) {
        // Thử cổng tiếp theo
      }
    }

    if (!success) {
      setMentors(FALLBACK_MENTORS);
      setCourses(FALLBACK_COURSES);
      setIsUsingMock(true);
      setActivePort(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    const checkSavedSession = async () => {
      try {
        const { getStoredToken, getStoredUser } = require('./src/services/authService');
        const token = await getStoredToken();
        const user = await getStoredUser();
        
        if (token && user) {
          const fullUserProfile = {
            ...RICH_FALLBACK_PROFILE,
            id: user.id,
            name: user.fullName,
            email: user.email,
            avatar: user.avatar || RICH_FALLBACK_PROFILE.avatar,
            hasGoogleLogin: true,
            quota: {
              ...RICH_FALLBACK_PROFILE.quota,
              ...(user.quota || {})
            }
          };
          setCurrentUser(fullUserProfile);
          setUserToken(token);
          setJustLoggedOut(false);
          
          let activeP = null;
          for (const port of API_PORTS) {
            try {
              const res = await fetch(`http://${BACKEND_HOST}:${port}/api/health`);
              if (res.ok) {
                activeP = port;
                break;
              }
            } catch (e) {}
          }
          const port = activeP || '5001';
          loadUserData(token, port);
        }
      } catch (err) {
        console.warn("Restore saved session exception:", err);
      }
    };
    checkSavedSession();
    loadData();

    const handleDeepLink = (event) => {
      if (event.url) {
        try {
          const url = event.url;
          if (url.includes('/auth')) {
            const query = url.split('?')[1];
            if (query) {
              const pairs = query.split('&');
              const params = {};
              pairs.forEach(pair => {
                const [key, val] = pair.split('=');
                params[key] = decodeURIComponent(val);
              });

              if (params.token && params.user) {
                const parsedUser = JSON.parse(params.user);
                const fullUserProfile = {
                  ...RICH_FALLBACK_PROFILE,
                  ...parsedUser,
                  hasGoogleLogin: true,
                  quota: {
                    ...RICH_FALLBACK_PROFILE.quota,
                    ...(parsedUser?.quota || {})
                  }
                };
                setCurrentUser(fullUserProfile);
                setUserToken(params.token);
                setJustLoggedOut(false);
                loadData();
                const port = activePort || '5001';
                loadUserData(params.token, port);
              }
            }
          }
        } catch (err) {
          console.warn("Lỗi xử lý Deep Link:", err);
        }
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);

    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // LOAD TOÀN BỘ CÁC TRƯỜNG DỮ LIỆU TỪ BACKEND DATABASE
  const loadUserData = async (token, port) => {
    if (!token || !port) return;
    
    // 0. Lấy thông tin user thực tế (Profile & Quota) từ DB
    try {
      const profileRes = await fetch(`http://${BACKEND_HOST}:${port}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      if (profileRes.ok) {
        const resData = await profileRes.json();
        if (resData.success && resData.user) {
          setCurrentUser(resData.user);
        }
      }
    } catch (e) {
      console.warn("Lỗi load profile thực tế:", e);
    }

    // 1. Lấy danh sách Bookings
    try {
      const bookingsRes = await fetch(`http://${BACKEND_HOST}:${port}/api/bookings`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      if (bookingsRes.ok) {
        const resData = await bookingsRes.json();
        if (resData.success && Array.isArray(resData.bookings)) {
          setBookings(resData.bookings);
        }
      }
    } catch (e) {
      console.warn("Lỗi load bookings:", e);
    }

    // 2. Lấy danh sách Notifications
    try {
      const notifRes = await fetch(`http://${BACKEND_HOST}:${port}/api/notifications`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      if (notifRes.ok) {
        const resData = await notifRes.json();
        if (resData.success && Array.isArray(resData.notifications)) {
          setNotifications(resData.notifications);
        }
      }
    } catch (e) {
      console.warn("Lỗi load notifications:", e);
    }

    // 3. Lấy danh sách CV Analyses
    try {
      const cvRes = await fetch(`http://${BACKEND_HOST}:${port}/api/cv/analyses`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      if (cvRes.ok) {
        const resData = await cvRes.json();
        if (resData.success && Array.isArray(resData.list)) {
          setCvAnalyses(resData.list);
        }
      }
    } catch (e) {
      console.warn("Lỗi load cv analyses:", e);
    }
  };

  const handleAuthLogin = async () => {
    setAuthError('');
    setLoggingIn(true);
    let success = false;

    for (const port of API_PORTS) {
      try {
        const loginUrl = `http://${BACKEND_HOST}:${port}/api/auth/login`;
        const response = await fetch(loginUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ email, password })
        });

        const resData = await response.json();

        if (response.ok && resData.success) {
          const fullUserProfile = {
            ...RICH_FALLBACK_PROFILE,
            ...resData.user,
            quota: {
              ...RICH_FALLBACK_PROFILE.quota,
              ...(resData.user?.quota || {})
            }
          };
          setCurrentUser(fullUserProfile);
          setUserToken(resData.token);
          success = true;
          loadData();
          loadUserData(resData.token, port);
          break;
        } else {
          setAuthError(resData.error || 'Email hoặc mật khẩu không hợp lệ.');
          success = true; 
          break;
        }
      } catch (e) {
        // Thử cổng tiếp theo
      }
    }

    if (!success) {
      setAuthError('Không thể kết nối tới server Backend. Hãy chắc chắn bạn đã chạy Express Server!');
    }
    setLoggingIn(false);
  };

  const handleAuthRegister = async () => {
    setRegError('');
    setRegSuccessMessage('');
    if (!regName.trim() || !regEmail.trim() || !regPassword) {
      setRegError('Vui lòng nhập đủ họ tên, email và mật khẩu.');
      return;
    }
    if (regPassword.length < 6) {
      setRegError('Mật khẩu cần ít nhất 6 ký tự.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setRegError('Mật khẩu và xác nhận mật khẩu không khớp.');
      return;
    }

    setRegistering(true);
    let success = false;
    for (const port of API_PORTS) {
      try {
        const response = await fetch(`http://${BACKEND_HOST}:${port}/api/auth/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            name: regName.trim(),
            email: regEmail.trim(),
            password: regPassword,
            role: 'customer'
          })
        });

        const resData = await response.json();
        if (response.ok && resData.success) {
          setRegSuccessMessage(resData.message || 'Đăng ký thành công! Hãy đăng nhập.');
          setEmail(regEmail.trim());
          setPassword(regPassword);
          setRegName('');
          setRegEmail('');
          setRegPassword('');
          setRegConfirmPassword('');
          
          setTimeout(() => {
            setAuthScreen('login');
            setRegSuccessMessage('');
          }, 2000);
          success = true;
          break;
        } else {
          setRegError(resData.error || 'Đăng ký thất bại. Vui lòng thử lại.');
          success = true;
          break;
        }
      } catch (e) {
        // Thử cổng tiếp theo
      }
    }

    if (!success) {
      setRegError('Không thể kết nối đến máy chủ Backend.');
    }
    setRegistering(false);
  };

  const handleGoogleAccountSelect = async (selectedEmail, selectedName, role) => {
    setGoogleModalVisible(false);
    setLoggingInGoogle(true);
    
    let success = false;
    for (const port of API_PORTS) {
      try {
        const googleLoginUrl = `http://${BACKEND_HOST}:${port}/api/auth/google`;
        const response = await fetch(googleLoginUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ credential: `mock_google_token_${selectedEmail}` })
        });

        const resData = await response.json();

        if (response.ok && resData.success) {
          const fullUserProfile = {
            ...RICH_FALLBACK_PROFILE,
            ...resData.user,
            name: selectedName, 
            hasGoogleLogin: true,
            quota: {
              ...RICH_FALLBACK_PROFILE.quota,
              ...(resData.user?.quota || {})
            }
          };
          setCurrentUser(fullUserProfile);
          setUserToken(resData.token);
          success = true;
          loadData();
          loadUserData(resData.token, port);
          break;
        }
      } catch (e) {
        // Thử cổng tiếp theo
      }
    }

    if (!success) {
      setCurrentUser({
        ...RICH_FALLBACK_PROFILE,
        name: selectedName,
        email: selectedEmail,
        role: role,
        hasGoogleLogin: true
      });
      loadData();
    }
    setLoggingInGoogle(false);
  };

  const handleRealGoogleLogin = async () => {
    setAuthError('');
    setLoggingInGoogle(true);
    
    const port = activePort || '5001';
    const host = `http://${BACKEND_HOST}:${port}`;
    
    try {
      // Mở trình duyệt hệ thống đến trang đăng nhập Google
      const browserResult = await promptGoogleBrowser();

      if (browserResult.cancelled) {
        return;
      }

      if (!browserResult.success) {
        setAuthError(browserResult.error || 'Đăng nhập Google thất bại.');
        return;
      }

      console.log('browserResult:', browserResult);

      // Gửi token nhận được lên Backend xác thực
      const { sendGoogleTokenToBackend } = require('./src/services/authService');
      const authResult = await sendGoogleTokenToBackend({
        idToken: browserResult.idToken,
        accessToken: browserResult.accessToken,
        backendHost: host,
      });

      if (!authResult.success) {
        setAuthError(authResult.error || 'Backend từ chối xác thực.');
        return;
      }

      const user = authResult.user;
      if (user) {
        const fullUserProfile = {
          ...RICH_FALLBACK_PROFILE,
          id: user.id,
          name: user.fullName,
          email: user.email,
          avatar: user.avatar || RICH_FALLBACK_PROFILE.avatar,
          hasGoogleLogin: true,
          quota: {
            ...RICH_FALLBACK_PROFILE.quota,
          }
        };
        setCurrentUser(fullUserProfile);
        setUserToken(authResult.token);
        setJustLoggedOut(false);
        loadData();
        loadUserData(authResult.token, port);
      }
    } catch (err) {
      console.warn("Google Browser Login exception:", err);
      setAuthError('Đăng nhập Google thất bại. Vui lòng thử lại.');
    } finally {
      setLoggingInGoogle(false);
    }
  };

  const handleWebViewMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data && data.type === 'TRIGGER_MOCK_GOOGLE_LOGIN') {
        setGoogleModalVisible(true);
        return;
      }
      if (data && data.type === 'AUTH_SUCCESS') {
        const fullUserProfile = {
          ...RICH_FALLBACK_PROFILE,
          ...data.user,
          hasGoogleLogin: true,
          quota: {
            ...RICH_FALLBACK_PROFILE.quota,
            ...(data.user?.quota || {})
          }
        };
        setCurrentUser(fullUserProfile);
        setUserToken(data.token);
        setJustLoggedOut(false);
        setGoogleWebViewVisible(false);
        loadData();
        
        const port = activePort || '5001';
        loadUserData(data.token, port);
      }
    } catch (e) {
      console.warn("Lỗi xử lý phản hồi đăng nhập từ WebView:", e);
    }
  };

  // ĐẶT LỊCH GHI DANH LÊN MONGODB DATABASE QUA API
  const handleBookMentor = async (mentor) => {
    setBookedMentor(mentor);
    setBookingSuccessModal(true);

    if (userToken && activePort) {
      try {
        const response = await fetch(`http://${BACKEND_HOST}:${activePort}/api/bookings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userToken}`
          },
          body: JSON.stringify({
            mentorId: mentor.id,
            timeSlot: "20:00",
            date: "16/07/2026",
            sessionType: "mock_interview",
            durationMinutes: 60,
            notes: `Luyện tập phỏng vấn 1-1 về chuyên môn với ${mentor.name}`
          })
        });

        if (response.ok) {
          // Refresh bookings
          loadUserData(userToken, activePort);
        }
      } catch (e) {
        console.warn("Lỗi khi ghi danh booking lên database:", e);
      }
    }
  };

  // KÍCH HOẠT PHÂN TÍCH CV VÀ LƯU KẾT QUẢ VÀO MONGODB
  const triggerCvAnalysis = () => {
    setCvFile({ name: 'CV_Software_Engineer_Phong.pdf', size: '1.4 MB' });
    setAnalyzingStatus('loading');
    setAnalysisProgress(0);

    const interval = setInterval(async () => {
      setAnalysisProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setAnalyzingStatus('success');

          // Lưu kết quả phân tích CV vào MongoDB qua API
          if (userToken && activePort) {
            saveCvAnalysisResult();
          }
          return 100;
        }
        return prev + 10;
      });
    }, 250);
  };

  const saveCvAnalysisResult = async () => {
    try {
      const response = await fetch(`http://${BACKEND_HOST}:${activePort}/api/cv/analyses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({
          cvFileName: "CV_Software_Engineer_Phong.pdf",
          cvFileId: "65cb1a3b5f92d718b2c45dee",
          cvFileUrl: `http://${BACKEND_HOST}:${activePort}/public/mock-cv.pdf`,
          result: {
            matchScore: 73,
            matchedKeywords: ["React", "CSS", "Docker", "Git", "HTML", "JavaScript"],
            missingKeywords: ["GraphQL", "Kubernetes"],
            skills: {
              cv: ["React", "JavaScript", "TypeScript"],
              jd: ["React", "TypeScript", "GraphQL"],
              matched: ["React", "TypeScript"],
              missing: ["GraphQL"]
            },
            scores: {
              clarity: 8,
              structure: 7,
              relevance: 6.5
            },
            suggestions: [
              "Bổ sung dự án thực tế về React Native để chứng minh kinh nghiệm 5 năm.",
              "Làm nổi bật kỹ năng tối ưu hiệu năng Bundle size."
            ]
          }
        })
      });

      if (response.ok) {
        // Refresh CV analyses list
        loadUserData(userToken, activePort);
      }
    } catch (e) {
      console.warn("Lỗi khi lưu kết quả CV lên database:", e);
    }
  };

  const handleMarkAllRead = async () => {
    if (userToken && activePort) {
      try {
        const res = await fetch(`http://${BACKEND_HOST}:${activePort}/api/notifications/read-all`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${userToken}`
          }
        });
        if (res.ok) {
          setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        }
      } catch (e) {
        // Fallback
      }
    }
  };

  const unreadNotifCount = notifications.filter(n => !n.isRead).length;

  // SCREEN LOGIN SYSTEM
  const renderLoginScreen = () => (
    <View style={styles.loginWrapper}>
      <BackgroundVideo uri="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_115001_bcdaa3b4-03de-47e7-ad63-ae3e392c32d4.mp4" />
      <View style={styles.loginOverlay}>
        <ScrollView contentContainerStyle={styles.loginScrollContainer} showsVerticalScrollIndicator={false}>
          
          <View style={styles.loginHeader}>
            <Image source={require('./assets/Logo.png')} style={styles.loginLogoImage} resizeMode="contain" />
            <Text style={styles.loginTagline}>Luyện phỏng vấn thông minh cùng Mentor & AI</Text>
          </View>

          <View style={styles.loginCard}>
            <Text style={styles.loginTitle}>Chào mừng quay lại</Text>
            <Text style={styles.loginSubtitle}>Đăng nhập tài khoản ProInterview của bạn</Text>

            <View style={styles.loginInputWrapper}>
              <Ionicons name="mail" size={18} color="#93f72b" style={styles.loginInputIcon} />
              <TextInput
                style={styles.loginTextInput}
                placeholder="Email của bạn"
                placeholderTextColor="#64748b"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.loginInputWrapper}>
              <Ionicons name="lock-closed" size={18} color="#93f72b" style={styles.loginInputIcon} />
              <TextInput
                style={styles.loginTextInput}
                placeholder="Mật khẩu"
                placeholderTextColor="#64748b"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                autoCapitalize="none"
              />
            </View>

            {authError || authContextError ? (
              <View style={styles.authErrorBox}>
                <Ionicons name="alert-circle" size={16} color="#ef4444" style={{ marginRight: 6 }} />
                <Text style={styles.authErrorText}>{authError || authContextError}</Text>
              </View>
            ) : null}

            <TouchableOpacity 
              style={styles.loginSubmitBtn} 
              onPress={handleAuthLogin}
              disabled={loggingIn || loggingInGoogle || authContextLoading}
            >
              {loggingIn ? (
                <ActivityIndicator color="#0f172a" />
              ) : (
                <>
                  <Text style={styles.loginSubmitBtnText}>Đăng nhập bằng Mật khẩu</Text>
                  <Ionicons name="arrow-forward" size={18} color="#0f172a" />
                </>
              )}
            </TouchableOpacity>

            <View style={styles.orDividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.orDividerText}>HOẶC KẾT NỐI</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity 
              style={styles.googleLoginSubmitBtn} 
              onPress={handleRealGoogleLogin}
              disabled={loggingIn || loggingInGoogle || authContextLoading}
            >
              {loggingInGoogle || authContextLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <Image 
                    source={{ uri: 'https://images.unsplash.com/photo-1573804633927-bfcbcd909acd?w=60&auto=format&fit=crop&q=80' }} 
                    style={styles.googleIconMini} 
                  />
                  <Text style={styles.googleLoginSubmitBtnText}>Tiếp tục với Google</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 20 }}>
              <Text style={{ color: '#94a3b8', fontSize: 13 }}>Chưa có tài khoản? </Text>
              <TouchableOpacity onPress={() => setAuthScreen('register')}>
                <Text style={{ color: '#a78bfa', fontSize: 13, fontWeight: 'bold' }}>Đăng ký ngay</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.loginGuestBtn} onPress={() => setCurrentUser(RICH_FALLBACK_PROFILE)}>
              <Text style={styles.loginGuestBtnText}>Trải nghiệm nhanh (Khách)</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </View>
    </View>
  );

  const renderRegisterScreen = () => (
    <View style={styles.loginWrapper}>
      <BackgroundVideo uri="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_115001_bcdaa3b4-03de-47e7-ad63-ae3e392c32d4.mp4" />
      <View style={styles.loginOverlay}>
        <ScrollView contentContainerStyle={styles.loginScrollContainer} showsVerticalScrollIndicator={false}>
          
          <View style={styles.loginHeader}>
            <Image source={require('./assets/Logo.png')} style={styles.loginLogoImage} resizeMode="contain" />
            <Text style={styles.loginTagline}>Luyện phỏng vấn thông minh cùng Mentor & AI</Text>
          </View>

          <View style={styles.loginCard}>
            <Text style={styles.loginTitle}>Đăng ký Tài khoản</Text>
            <Text style={styles.loginSubtitle}>Bắt đầu hành trình phỏng vấn chuyên nghiệp</Text>

            <View style={styles.loginInputWrapper}>
              <Ionicons name="person-outline" size={18} color="#93f72b" style={styles.loginInputIcon} />
              <TextInput
                style={styles.loginTextInput}
                placeholder="Họ và tên của bạn"
                placeholderTextColor="#64748b"
                value={regName}
                onChangeText={setRegName}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.loginInputWrapper}>
              <Ionicons name="mail-outline" size={18} color="#93f72b" style={styles.loginInputIcon} />
              <TextInput
                style={styles.loginTextInput}
                placeholder="Địa chỉ Email"
                placeholderTextColor="#64748b"
                value={regEmail}
                onChangeText={setRegEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.loginInputWrapper}>
              <Ionicons name="lock-closed-outline" size={18} color="#93f72b" style={styles.loginInputIcon} />
              <TextInput
                style={styles.loginTextInput}
                placeholder="Mật khẩu (tối thiểu 6 ký tự)"
                placeholderTextColor="#64748b"
                secureTextEntry
                value={regPassword}
                onChangeText={setRegPassword}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.loginInputWrapper}>
              <Ionicons name="shield-checkmark-outline" size={18} color="#93f72b" style={styles.loginInputIcon} />
              <TextInput
                style={styles.loginTextInput}
                placeholder="Xác nhận mật khẩu"
                placeholderTextColor="#64748b"
                secureTextEntry
                value={regConfirmPassword}
                onChangeText={setRegConfirmPassword}
                autoCapitalize="none"
              />
            </View>

            {regError ? (
              <View style={styles.authErrorBox}>
                <Ionicons name="alert-circle" size={16} color="#ef4444" style={{ marginRight: 6 }} />
                <Text style={styles.authErrorText}>{regError}</Text>
              </View>
            ) : null}

            {regSuccessMessage ? (
              <View style={[styles.authErrorBox, { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.2)' }]}>
                <Ionicons name="checkmark-circle" size={16} color="#10b981" style={{ marginRight: 6 }} />
                <Text style={[styles.authErrorText, { color: '#a7f3d0' }]}>{regSuccessMessage}</Text>
              </View>
            ) : null}

            <TouchableOpacity 
              style={styles.loginSubmitBtn} 
              onPress={handleAuthRegister}
              disabled={registering}
            >
              {registering ? (
                <ActivityIndicator color="#0f172a" />
              ) : (
                <>
                  <Text style={styles.loginSubmitBtnText}>Tạo tài khoản mới</Text>
                  <Ionicons name="checkmark" size={18} color="#0f172a" />
                </>
              )}
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 20 }}>
              <Text style={{ color: '#94a3b8', fontSize: 13 }}>Đã có tài khoản? </Text>
              <TouchableOpacity onPress={() => setAuthScreen('login')}>
                <Text style={{ color: '#a78bfa', fontSize: 13, fontWeight: 'bold' }}>Đăng nhập ngay</Text>
              </TouchableOpacity>
            </View>
          </View>

        </ScrollView>
      </View>
    </View>
  );

  // 1. MÀN HÌNH CHÍNH (DASHBOARD)
  const renderHomeTab = () => {
    // Tìm lịch học gần nhất lấy từ database
    const upcomingDbBooking = bookings.find(b => b.status === 'confirmed' || b.status === 'pending');

    return (
      <View style={styles.homeScrollWrapper}>
        <HeroAtmosphere />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
          
          <View style={[styles.heroWrapperCompact, { backgroundColor: '#0c081e' }]}>
            <View style={styles.heroOverlayWashCompact}>
              
              <View style={styles.topHeaderCompact}>
                <View style={styles.headerWelcomeBox}>
                  <Text style={styles.headerWelcomeText}>Xin chào,</Text>
                  <Text style={styles.headerUserName}>{currentUser?.name || 'Bạn học'} 👋</Text>
                </View>
                <View style={styles.headerRightActions}>
                  <TouchableOpacity style={styles.headerIconBtn} onPress={() => setNotifModalVisible(true)}>
                    <Ionicons name="notifications-outline" size={24} color="#ffffff" />
                    {unreadNotifCount > 0 ? (
                      <View style={styles.unreadNotifBadge}>
                        <Text style={styles.unreadNotifBadgeText}>{unreadNotifCount}</Text>
                      </View>
                    ) : null}
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.avatarProfile} onPress={() => setActiveTab('profile')}>
                    <Text style={styles.avatarText}>{currentUser?.name ? currentUser.name.substring(0,2).toUpperCase() : 'VP'}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.heroMiddleCompact}>
                <Image source={require('./assets/Logo.png')} style={styles.heroLogoCompact} resizeMode="contain" />
                <Text style={styles.heroHeadlineCompact}>Luyện phỏng vấn cùng Mentor thật</Text>
                
                <View style={styles.actionButtonContainerCompact}>
                  <TouchableOpacity style={styles.primaryLimeBtnCompact} onPress={() => setActiveTab('cv')}>
                    <Ionicons name="flash" size={16} color="#0f172a" />
                    <Text style={styles.primaryLimeBtnTextCompact}>Phân tích CV</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.secondaryOutlineBtnCompact} onPress={() => setActiveTab('mentors')}>
                    <Ionicons name="people" size={16} color="#0f172a" />
                    <Text style={styles.secondaryOutlineBtnTextCompact}>Tìm Mentor</Text>
                  </TouchableOpacity>
                </View>
              </View>

            </View>
          </View>

          {/* LỊCH HẸN DATABASE THỜI GIAN THỰC */}
          <View style={styles.widgetSection}>
            <View style={styles.upcomingMeetingWidget}>
              <View style={styles.widgetHeaderRow}>
                <View style={styles.liveIndicatorRow}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>Lịch hẹn tiếp theo</Text>
                </View>
                <Text style={styles.widgetRoomCode}>Zoom Meeting</Text>
              </View>
              {upcomingDbBooking ? (
                <>
                  <Text style={styles.widgetTitle}>{upcomingDbBooking.sessionType === 'mock_interview' ? 'Luyện Phỏng Vấn Thử' : 'Đánh giá review CV'}</Text>
                  <Text style={styles.widgetMetaText}>⏱ Lịch hẹn: {upcomingDbBooking.date} lúc {upcomingDbBooking.timeSlot} · Trạng thái: {upcomingDbBooking.status.toUpperCase()}</Text>
                  <TouchableOpacity style={styles.widgetActionBtn} onPress={() => alert('Đang kết nối Zoom...')}>
                    <Text style={styles.widgetActionBtnText}>Vào lớp Zoom</Text>
                    <Ionicons name="videocam" size={16} color="#0f172a" />
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.widgetTitle}>Luyện Phỏng Vấn Frontend Senior</Text>
                  <Text style={styles.widgetMetaText}>⏱ Thứ 5 tuần này · 20:00 - 21:00 với Mentor Nguyễn Yến Nhi</Text>
                  <TouchableOpacity style={styles.widgetActionBtn} onPress={() => alert('Đang mở ứng dụng Zoom để vào học...')}>
                    <Text style={styles.widgetActionBtnText}>Vào lớp Zoom ngay</Text>
                    <Ionicons name="videocam" size={16} color="#0f172a" />
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>

          <View style={styles.mobileSection}>
            <Text style={styles.mobileSectionTitle}>Lộ trình luyện phỏng vấn</Text>
            <View style={styles.stepFlowBar}>
              <TouchableOpacity style={styles.stepFlowPill} onPress={() => setActiveTab('cv')}>
                <Text style={styles.stepFlowNum}>01</Text>
                <Text style={styles.stepFlowName}>Phân tích CV</Text>
              </TouchableOpacity>
              <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.2)" />
              <TouchableOpacity style={styles.stepFlowPill} onPress={() => setActiveTab('mentors')}>
                <Text style={styles.stepFlowNum}>02</Text>
                <Text style={styles.stepFlowName}>Gặp Mentor</Text>
              </TouchableOpacity>
              <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.2)" />
              <TouchableOpacity style={styles.stepFlowPill} onPress={() => setActiveTab('courses')}>
                <Text style={styles.stepFlowNum}>03</Text>
                <Text style={styles.stepFlowName}>Học khóa học</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.mobileSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.mobileSectionTitle}>Đội ngũ Mentor tiêu biểu</Text>
              <TouchableOpacity style={styles.viewAllRow} onPress={() => setActiveTab('mentors')}>
                <Text style={styles.viewAllText}>Xem tất cả</Text>
                <Ionicons name="chevron-forward" size={12} color="#93f72b" />
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalCarouselContainer}>
              {mentors.length > 0 ? mentors.map(mentor => (
                <TouchableOpacity key={mentor.id} style={styles.mentorMiniCardMobile} onPress={() => handleBookMentor(mentor)}>
                  <View style={styles.avatarGlowContainer}>
                    <Image source={{ uri: mentor.avatar }} style={styles.mentorMiniAvatar} />
                    <View style={styles.onlineDotIndicator} />
                  </View>
                  <Text style={styles.mentorMiniName}>{mentor.name}</Text>
                  <Text style={styles.mentorMiniRole} numberOfLines={1}>{mentor.role}</Text>
                  <View style={styles.mentorMiniMeta}>
                    <View style={styles.miniCompanyBadge}>
                      <Text style={styles.mentorMiniCompany}>{mentor.company}</Text>
                    </View>
                    <View style={styles.mentorMiniRating}>
                      <Ionicons name="star" size={10} color="#f59e0b" />
                      <Text style={styles.mentorMiniRatingText}>{mentor.rating}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              )) : FALLBACK_MENTORS.map(mentor => (
                <TouchableOpacity key={mentor.id} style={styles.mentorMiniCardMobile} onPress={() => handleBookMentor(mentor)}>
                  <View style={styles.avatarGlowContainer}>
                    <Image source={{ uri: mentor.avatar }} style={styles.mentorMiniAvatar} />
                    <View style={styles.onlineDotIndicator} />
                  </View>
                  <Text style={styles.mentorMiniName}>{mentor.name}</Text>
                  <Text style={styles.mentorMiniRole} numberOfLines={1}>{mentor.role}</Text>
                  <View style={styles.mentorMiniMeta}>
                    <View style={styles.miniCompanyBadge}>
                      <Text style={styles.mentorMiniCompany}>{mentor.company}</Text>
                    </View>
                    <View style={styles.mentorMiniRating}>
                      <Ionicons name="star" size={10} color="#f59e0b" />
                      <Text style={styles.mentorMiniRatingText}>{mentor.rating}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.mobileSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.mobileSectionTitle}>Khóa học bán chạy</Text>
              <TouchableOpacity style={styles.viewAllRow} onPress={() => setActiveTab('courses')}>
                <Text style={styles.viewAllText}>Xem tất cả</Text>
                <Ionicons name="chevron-forward" size={12} color="#93f72b" />
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalCarouselContainer}>
              {courses.length > 0 ? courses.map(course => (
                <TouchableOpacity key={course.id} style={styles.courseMiniCardMobile} onPress={() => setActiveTab('courses')}>
                  <View style={{ position: 'relative' }}>
                    <Image source={{ uri: course.image }} style={styles.courseMiniImage} />
                    <View style={styles.courseMiniPriceBadge}>
                      <Text style={styles.courseMiniPriceText}>{course.price}</Text>
                    </View>
                  </View>
                  <View style={styles.courseMiniContent}>
                    <Text style={styles.courseMiniTitle} numberOfLines={1}>{course.title}</Text>
                    <View style={styles.courseMiniMetaRow}>
                      <Text style={styles.courseMiniDuration}>⏱ {course.duration}</Text>
                      <View style={styles.courseMiniRatingRow}>
                        <Ionicons name="star" size={10} color="#f59e0b" />
                        <Text style={styles.courseMiniRatingVal}>{course.rating}</Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              )) : FALLBACK_COURSES.map(course => (
                <TouchableOpacity key={course.id} style={styles.courseMiniCardMobile} onPress={() => setActiveTab('courses')}>
                  <View style={{ position: 'relative' }}>
                    <Image source={{ uri: course.image }} style={styles.courseMiniImage} />
                    <View style={styles.courseMiniPriceBadge}>
                      <Text style={styles.courseMiniPriceText}>{course.price}</Text>
                    </View>
                  </View>
                  <View style={styles.courseMiniContent}>
                    <Text style={styles.courseMiniTitle} numberOfLines={1}>{course.title}</Text>
                    <View style={styles.courseMiniMetaRow}>
                      <Text style={styles.courseMiniDuration}>⏱ {course.duration}</Text>
                      <View style={styles.courseMiniRatingRow}>
                        <Ionicons name="star" size={10} color="#f59e0b" />
                        <Text style={styles.courseMiniRatingVal}>{course.rating}</Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.mobileSection}>
            <Text style={styles.mobileSectionTitle}>Tin tức & Hoạt động</Text>
            <View style={styles.newsSpotlightCard}>
              <Image source={{ uri: NEWS_DATA[0].image }} style={styles.newsSpotlightImage} />
              <View style={styles.newsSpotlightContent}>
                <Text style={styles.newsSpotlightDate}>{NEWS_DATA[0].date}</Text>
                <Text style={styles.newsSpotlightTitle}>{NEWS_DATA[0].title}</Text>
                <TouchableOpacity style={styles.newsSpotlightLink} onPress={() => alert('Đang mở trang tin tức chi tiết...')}>
                  <Text style={styles.newsSpotlightLinkText}>Đọc tiếp bài viết</Text>
                  <Ionicons name="arrow-forward" size={14} color="#93f72b" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.footerMinimalContainer}>
            <Image source={require('./assets/Logo.png')} style={styles.footerMinimalLogo} resizeMode="contain" />
            <Text style={styles.footerMinimalCopyright}>© 2026 ProInterview. All rights reserved.</Text>
            <View style={styles.footerMinimalHeartRow}>
              <Text style={styles.footerMinimalHeartText}>Made with </Text>
              <Ionicons name="heart" size={10} color="#ef4444" />
              <Text style={styles.footerMinimalHeartText}> by ProInterview Team</Text>
            </View>
          </View>

        </ScrollView>
      </View>
    );
  };

  // 2. MÀN HÌNH MENTORS
  const renderMentorsTab = () => {
    const filteredMentors = mentors.filter(mentor => {
      const matchSearch = mentor.name.toLowerCase().includes(searchMentorQuery.toLowerCase()) || 
                          mentor.role.toLowerCase().includes(searchMentorQuery.toLowerCase()) ||
                          mentor.company.toLowerCase().includes(searchMentorQuery.toLowerCase());
      const matchCategory = selectedMentorCategory === 'Tất cả' || mentor.category === selectedMentorCategory;
      return matchSearch && matchCategory;
    });

    const categories = ['Tất cả', 'Frontend', 'Backend', 'AI/ML', 'QA/QC'];

    return (
      <View style={styles.tabContentContainer}>
        <Text style={styles.tabTitle}>Đội ngũ Mentor</Text>
        <Text style={styles.tabSubtitle}>Đặt lịch ôn luyện 1-1 cùng các chuyên gia hàng đầu</Text>

        <View style={styles.searchBarWrapper}>
          <Ionicons name="search" size={18} color="#94a3b8" style={{ marginRight: 10 }} />
          <TextInput
            style={styles.searchTextInput}
            placeholder="Tìm kiếm Mentor..."
            placeholderTextColor="#64748b"
            value={searchMentorQuery}
            onChangeText={setSearchMentorQuery}
          />
          {searchMentorQuery ? (
            <TouchableOpacity onPress={() => setSearchMentorQuery('')}>
              <Ionicons name="close-circle" size={18} color="#94a3b8" />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.filterPillsRowWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 10 }}>
            {categories.map(cat => (
              <TouchableOpacity 
                key={cat} 
                style={[
                  styles.filterPillBtn, 
                  selectedMentorCategory === cat ? styles.filterPillBtnActive : null
                ]}
                onPress={() => setSelectedMentorCategory(cat)}
              >
                <Text 
                  style={[
                    styles.filterPillBtnText, 
                    selectedMentorCategory === cat ? styles.filterPillBtnTextActive : null
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        
        {loading ? (
          <View style={styles.tabLoading}>
            <ActivityIndicator color="#7000ff" size="large" />
            <Text style={styles.loadingText}>Đang tải danh sách từ API...</Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.mentorsVerticalScroll}>
            {filteredMentors.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="sad-outline" size={44} color="#94a3b8" />
                <Text style={styles.emptyText}>Không tìm thấy Mentor phù hợp.</Text>
              </View>
            ) : (
              filteredMentors.map(mentor => (
                <View key={mentor.id} style={styles.mentorPremiumCard}>
                  <View style={styles.mentorCardTopRow}>
                    <View style={styles.avatarGlowContainer}>
                      <Image source={{ uri: mentor.avatar }} style={styles.mentorFullAvatar} />
                      <View style={styles.onlineDotIndicator} />
                    </View>
                    <View style={styles.mentorMainDetails}>
                      <Text style={styles.mentorFullName}>{mentor.name}</Text>
                      <Text style={styles.mentorFullRole} numberOfLines={1}>{mentor.role}</Text>
                      <View style={styles.mentorFullBadgeRow}>
                        <View style={styles.companyFullBadge}>
                          <Text style={styles.companyFullBadgeText}>{mentor.company}</Text>
                        </View>
                        <View style={styles.ratingFullRow}>
                          <Ionicons name="star" size={12} color="#f59e0b" />
                          <Text style={styles.ratingFullText}>{mentor.rating} ({mentor.reviews || 20} đánh giá)</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.bookPremiumBtn} onPress={() => handleBookMentor(mentor)}>
                    <Text style={styles.bookPremiumBtnText}>Đặt lịch phỏng vấn thử 1-1</Text>
                    <Ionicons name="calendar-outline" size={14} color="#0f172a" />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>
        )}
      </View>
    );
  };

  // 3. MÀN HÌNH KHÓC HỌC
  const renderCoursesTab = () => {
    const filteredCourses = courses.filter(course => {
      const matchSearch = course.title.toLowerCase().includes(searchCourseQuery.toLowerCase());
      const matchCategory = selectedCourseCategory === 'Tất cả' || course.category === selectedCourseCategory;
      return matchSearch && matchCategory;
    });

    const categories = ['Tất cả', 'Frontend', 'Backend', 'AI/ML'];

    return (
      <View style={styles.tabContentContainer}>
        <Text style={styles.tabTitle}>Khóa học tối ưu</Text>
        <Text style={styles.tabSubtitle}>Biên soạn bởi chuyên gia, học thử bài giảng chuẩn</Text>

        <View style={styles.searchBarWrapper}>
          <Ionicons name="search" size={18} color="#94a3b8" style={{ marginRight: 10 }} />
          <TextInput
            style={styles.searchTextInput}
            placeholder="Tìm kiếm khóa học..."
            placeholderTextColor="#64748b"
            value={searchCourseQuery}
            onChangeText={setSearchCourseQuery}
          />
          {searchCourseQuery ? (
            <TouchableOpacity onPress={() => setSearchCourseQuery('')}>
              <Ionicons name="close-circle" size={18} color="#94a3b8" />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.filterPillsRowWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 10 }}>
            {categories.map(cat => (
              <TouchableOpacity 
                key={cat} 
                style={[
                  styles.filterPillBtn, 
                  selectedCourseCategory === cat ? styles.filterPillBtnActive : null
                ]}
                onPress={() => setSelectedCourseCategory(cat)}
              >
                <Text 
                  style={[
                    styles.filterPillBtnText, 
                    selectedCourseCategory === cat ? styles.filterPillBtnTextActive : null
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        
        {loading ? (
          <View style={styles.tabLoading}>
            <ActivityIndicator color="#7000ff" size="large" />
            <Text style={styles.loadingText}>Đang tải danh sách khóa học...</Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.coursesVerticalScroll}>
            {filteredCourses.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="sad-outline" size={44} color="#94a3b8" />
                <Text style={styles.emptyText}>Không tìm thấy khóa học phù hợp.</Text>
              </View>
            ) : (
              filteredCourses.map(course => (
                <View key={course.id} style={styles.coursePremiumCard}>
                  <Image source={{ uri: course.image }} style={styles.coursePremiumImage} />
                  <View style={styles.coursePremiumBody}>
                    <Text style={styles.coursePremiumTitle}>{course.title}</Text>
                    <View style={styles.coursePremiumDetailsRow}>
                      <View style={styles.courseMetaIconRow}>
                        <Ionicons name="time-outline" size={14} color="#94a3b8" />
                        <Text style={styles.courseMetaText}>{course.duration}</Text>
                      </View>
                      <View style={styles.courseMetaIconRow}>
                        <Ionicons name="star" size={14} color="#f59e0b" />
                        <Text style={styles.courseMetaText}>{course.rating} / 5.0</Text>
                      </View>
                    </View>
                    <View style={styles.coursePremiumFooter}>
                      <Text style={styles.coursePremiumPrice}>{course.price}</Text>
                      <TouchableOpacity style={styles.courseBuyBtn} onPress={() => alert(`Đã ghi danh: ${course.title}`)}>
                        <Text style={styles.courseBuyBtnText}>Đăng ký ngay</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        )}
      </View>
    );
  };

  // 4. MÀN HÌNH PHÂN TÍCH CV (CÓ LỊCH SỬ TỪ DATABASE)
  const renderCvTab = () => (
    <View style={styles.tabContentContainer}>
      <Text style={styles.tabTitle}>Phân tích CV chuyên sâu</Text>
      <Text style={styles.tabSubtitle}>Đối chiếu hồ sơ của bạn với bản mô tả công việc (JD)</Text>
      
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        
        <View style={styles.cvMockCard}>
          {analyzingStatus === 'loading' ? (
            <View style={styles.cvScanningConsole}>
              <View style={styles.cvScanningCircle}>
                <Ionicons name="document-text" size={40} color="#7000ff" />
                <Animated.View style={[styles.scanningBeam, { transform: [{ translateY: scanAnim }] }]} />
              </View>
              <Text style={styles.cvProgressText}>Đang quét cấu trúc CV... {analysisProgress}%</Text>
              <View style={styles.cvProgressBarOutline}>
                <View style={[styles.cvProgressBarInner, { width: `${analysisProgress}%` }]} />
              </View>
            </View>
          ) : analyzingStatus === 'success' ? (
            <View style={styles.cvSuccessBox}>
              <View style={styles.cvSuccessBadge}>
                <Ionicons name="checkmark-circle" size={32} color="#93f72b" />
              </View>
              <Text style={styles.cvSuccessText}>Phân tích hoàn tất!</Text>
              <Text style={styles.cvSuccessFileName}>{cvFile?.name} ({cvFile?.size})</Text>
              <TouchableOpacity style={styles.reUploadBtn} onPress={triggerCvAnalysis}>
                <Text style={styles.reUploadBtnText}>Phân tích lại CV khác</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.cvUploadBoxContent}>
              <View style={styles.uploadIconCircle}>
                <Ionicons name="cloud-upload" size={34} color="#93f72b" />
              </View>
              <Text style={styles.cvMockTitle}>Chọn tệp tin CV của bạn</Text>
              <Text style={styles.cvMockDesc}>Hỗ trợ các định dạng PDF, DOCX (Tối đa 5MB)</Text>
              <TouchableOpacity style={styles.uploadMockBtn} onPress={triggerCvAnalysis}>
                <Text style={styles.uploadMockBtnText}>Tải lên & Phân tích ngay</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {analyzingStatus === 'success' && (
          <View style={{ marginTop: 32 }}>
            <Text style={styles.cvResultSectionTitle}>Kết quả phân tích độ tương thích</Text>
            
            <View style={styles.overlappingCardsContainer}>
              <View style={[styles.cvDeckCard, styles.cvDeckCard1]}>
                <Text style={styles.cvCard1Title}>Độ khớp CV–JD</Text>
                <View style={styles.cvBadgeGreen}>
                  <Text style={styles.cvBadgeGreenText}>73% Khá tốt</Text>
                </View>
              </View>

              <View style={[styles.cvDeckCard, styles.cvDeckCard2]}>
                <View style={styles.cvCard2Header}>
                  <Ionicons name="document-text" size={16} color="#7000ff" style={{ marginRight: 6 }} />
                  <Text style={styles.cvCard2Title}>Từ khóa khớp với JD</Text>
                </View>
                <View style={styles.keywordsGrid}>
                  <View style={styles.keywordPill}><Text style={styles.keywordText}>ci/cd ✓</Text></View>
                  <View style={styles.keywordPill}><Text style={styles.keywordText}>css ✓</Text></View>
                  <View style={styles.keywordPill}><Text style={styles.keywordText}>docker ✓</Text></View>
                  <View style={styles.keywordPill}><Text style={styles.keywordText}>git ✓</Text></View>
                  <View style={styles.keywordPill}><Text style={styles.keywordText}>html ✓</Text></View>
                  <View style={styles.keywordPill}><Text style={styles.keywordText}>javascript ✓</Text></View>
                </View>
              </View>

              <View style={[styles.cvDeckCard, styles.cvDeckCard3]}>
                <View style={styles.gaugeContainer}>
                  <View style={styles.circularProgressMock}>
                    <Text style={styles.circularScoreText}>73</Text>
                    <Text style={styles.circularScoreSub}>/ 100</Text>
                  </View>
                  <Text style={styles.gaugeTitle}>Điểm AI</Text>
                  <Text style={styles.gaugeSubtitle}>Clarity • Structure • Relevance • Credibility</Text>
                </View>

                <View style={styles.progressBarList}>
                  <View style={styles.progressBarItem}>
                    <View style={styles.progressLabelRow}>
                      <Text style={styles.progressLabelName}>Clarity (Rõ ràng)</Text>
                      <Text style={styles.progressLabelValue}>8/10</Text>
                    </View>
                    <View style={styles.progressBarTrack}>
                      <View style={[styles.progressBarFill, { width: '80%', backgroundColor: '#93f72b' }]} />
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* LỊCH SỬ PHÂN TÍCH CV MONGODB */}
        {cvAnalyses.length > 0 && (
          <View style={{ marginTop: 24 }}>
            <Text style={styles.cvResultSectionTitle}>Lịch sử CV đã phân tích</Text>
            {cvAnalyses.map((item, idx) => (
              <View key={item._id || idx} style={styles.cvHistoryCard}>
                <View style={styles.cvHistoryLeft}>
                  <Ionicons name="document-attach" size={24} color="#7000ff" />
                  <View style={{ marginLeft: 12 }}>
                    <Text style={styles.cvHistoryName} numberOfLines={1}>{item.cvFileName}</Text>
                    <Text style={styles.cvHistoryDate}>{new Date(item.createdAt).toLocaleDateString('vi-VN')}</Text>
                  </View>
                </View>
                <View style={styles.cvHistoryScore}>
                  <Text style={styles.cvHistoryScoreTxt}>{item.result?.match?.score || 70}%</Text>
                </View>
              </View>
            ))}
          </View>
        )}

      </ScrollView>
    </View>
  );

  // 5. MÀN HÌNH TÀI KHOẢN (ĐỒNG BỘ MONGODB)
  const renderProfileTab = () => {
    const profile = {
      ...RICH_FALLBACK_PROFILE,
      ...currentUser,
      quota: {
        ...RICH_FALLBACK_PROFILE.quota,
        ...(currentUser?.quota || {})
      }
    };

    return (
      <View style={styles.tabContentContainer}>
        <Text style={styles.tabTitle}>Hồ sơ cá nhân</Text>
        <Text style={styles.tabSubtitle}>Quản lý thông tin ứng viên đồng bộ dữ liệu MongoDB</Text>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 }}>
          
          <View style={styles.profileCard}>
            <View style={styles.profileHeaderRow}>
              <View style={styles.profileAvatarLarge}>
                {profile.avatar ? (
                  <Image source={{ uri: profile.avatar }} style={styles.profileAvatarImage} />
                ) : (
                  <Text style={styles.profileAvatarLargeText}>
                    {profile.name ? profile.name.substring(0,2).toUpperCase() : 'VP'}
                  </Text>
                )}
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={14} color="#93f72b" />
                </View>
              </View>
              <View style={styles.profileInfoDetails}>
                <Text style={styles.profileNameText}>{profile.name || 'Họ và tên'}</Text>
                <Text style={styles.profileEmailText}>{profile.email || 'email@domain.com'}</Text>
                
                {profile.position ? (
                  <Text style={styles.profileCompanyRoleText}>
                    💻 {profile.position} {profile.currentCompany ? `tại ${profile.currentCompany}` : ''}
                  </Text>
                ) : null}

                <View style={[
                  styles.profilePlanBadge, 
                  profile.plan === 'premium' || profile.plan === 'professional' ? { backgroundColor: 'rgba(112,0,255,0.2)', borderColor: '#7000ff', borderWidth: 1 } : null
                ]}>
                  <Text style={[styles.profilePlanBadgeText, { color: '#93f72b' }]}>
                    {profile.plan ? `MEMBER: ${profile.plan.toUpperCase()}` : 'MEMBER: FREE'}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.quotaBox}>
              <View style={styles.quotaHeaderRow}>
                <Ionicons name="speedometer" size={14} color="#93f72b" />
                <Text style={styles.quotaTitle}>Hạn mức tài nguyên đã dùng (Quota limit):</Text>
              </View>
              <View style={styles.quotaBody}>
                <View style={styles.quotaItem}>
                  <View style={styles.quotaLabelRow}>
                    <Text style={styles.quotaLabel}>Lượt Phân Tích CV: {profile.quota?.cvAnalysisUsed || 0}/{profile.quota?.cvAnalysisLimit || 2}</Text>
                  </View>
                  <View style={styles.quotaTrack}>
                    <View style={[
                      styles.quotaFill, 
                      { width: `${((profile.quota?.cvAnalysisUsed || 0) / (profile.quota?.cvAnalysisLimit || 2)) * 100}%`, backgroundColor: '#93f72b' }
                    ]} />
                  </View>
                </View>

                <View style={styles.quotaItem}>
                  <View style={styles.quotaLabelRow}>
                    <Text style={styles.quotaLabel}>Lượt Mentor Session: {profile.quota?.mentorSessionUsed || 0}/{profile.quota?.mentorSessionLimit || 1}</Text>
                  </View>
                  <View style={styles.quotaTrack}>
                    <View style={[
                      styles.quotaFill, 
                      { width: `${((profile.quota?.mentorSessionUsed || 0) / (profile.quota?.mentorSessionLimit || 1)) * 100}%`, backgroundColor: '#7000ff' }
                    ]} />
                  </View>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.subTabContainer}>
            <TouchableOpacity 
              style={[styles.subTabBtn, profileSubTab === 'info' ? styles.subTabBtnActive : null]}
              onPress={() => setProfileSubTab('info')}
            >
              <Text style={[styles.subTabBtnText, profileSubTab === 'info' ? styles.subTabBtnTextActive : null]}>Thông tin</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.subTabBtn, profileSubTab === 'resume' ? styles.subTabBtnActive : null]}
              onPress={() => setProfileSubTab('resume')}
            >
              <Text style={[styles.subTabBtnText, profileSubTab === 'resume' ? styles.subTabBtnTextActive : null]}>Hồ sơ CV</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.subTabBtn, profileSubTab === 'settings' ? styles.subTabBtnActive : null]}
              onPress={() => setProfileSubTab('settings')}
            >
              <Text style={[styles.subTabBtnText, profileSubTab === 'settings' ? styles.subTabBtnTextActive : null]}>Cài đặt</Text>
            </TouchableOpacity>
          </View>

          {profileSubTab === 'info' && (
            <View style={styles.subTabContentCard}>
              <View style={styles.infoFieldRow}>
                <Ionicons name="mail-outline" size={16} color="#94a3b8" />
                <View style={styles.infoFieldRight}>
                  <Text style={styles.infoFieldLabel}>Địa chỉ Email</Text>
                  <Text style={styles.infoFieldValue}>{profile.email}</Text>
                </View>
              </View>

              <View style={styles.infoFieldRow}>
                <Ionicons name="call-outline" size={16} color="#94a3b8" />
                <View style={styles.infoFieldRight}>
                  <Text style={styles.infoFieldLabel}>Số điện thoại</Text>
                  <Text style={styles.infoFieldValue}>{profile.phone || 'Chưa cập nhật'}</Text>
                </View>
              </View>

              <View style={styles.infoFieldRow}>
                <Ionicons name="school-outline" size={16} color="#94a3b8" />
                <View style={styles.infoFieldRight}>
                  <Text style={styles.infoFieldLabel}>Học vấn / Trường học</Text>
                  <Text style={styles.infoFieldValue}>{profile.school || 'Chưa cập nhật'}</Text>
                </View>
              </View>

              <View style={styles.infoFieldRow}>
                <Ionicons name="ribbon-outline" size={16} color="#94a3b8" />
                <View style={styles.infoFieldRight}>
                  <Text style={styles.infoFieldLabel}>Kinh nghiệm làm việc</Text>
                  <Text style={styles.infoFieldValue}>
                    {profile.experience ? `${profile.experience} năm kinh nghiệm` : 'Chưa cập nhật'}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {profileSubTab === 'resume' && (
            <View style={styles.subTabContentCard}>
              <View style={styles.resumeFieldBlock}>
                <Text style={styles.resumeBlockLabel}>Giới thiệu bản thân (Bio)</Text>
                <Text style={styles.resumeBlockValue}>{profile.bio || 'Chưa cập nhật tiểu sử bản thân.'}</Text>
              </View>

              <View style={styles.resumeFieldBlock}>
                <Text style={styles.resumeBlockLabel}>Kỹ năng & Chuyên môn (Skills)</Text>
                {profile.expertise && profile.expertise.length > 0 ? (
                  <View style={styles.profileSkillsGrid}>
                    {profile.expertise.map((skill, index) => (
                      <View key={index} style={styles.profileSkillPill}>
                        <Text style={styles.profileSkillPillText}>{skill}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.resumeBlockValue}>Chưa cập nhật kỹ năng.</Text>
                )}
              </View>

              <View style={styles.resumeFieldBlock}>
                <Text style={styles.resumeBlockLabel}>Kinh nghiệm làm việc chi tiết</Text>
                <Text style={styles.resumeBlockValue}>{profile.profileWorkExperience || 'Chưa cập nhật mô tả.'}</Text>
              </View>

              <View style={styles.resumeFieldBlock}>
                <Text style={styles.resumeBlockLabel}>Học vấn chi tiết</Text>
                <Text style={styles.resumeBlockValue}>{profile.profileEducation || 'Chưa cập nhật thông tin học vị.'}</Text>
              </View>

              <View style={[styles.resumeFieldBlock, { borderBottomWidth: 0, paddingBottom: 0 }]}>
                <Text style={styles.resumeBlockLabel}>Giải thưởng đạt được</Text>
                <Text style={styles.resumeBlockValue}>{profile.profileAwards || 'Chưa có thông tin giải thưởng.'}</Text>
              </View>
            </View>
          )}

          {profileSubTab === 'settings' && (
            <View style={styles.profileOptionsList}>
              <TouchableOpacity style={styles.profileOptionRow} onPress={handleToggleInAppNotifications}>
                <View style={styles.profileOptionLeft}>
                  <Ionicons name="notifications-outline" size={18} color="#93f72b" />
                  <Text style={styles.profileOptionLabel}>Thông báo đẩy (In-app)</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.3)" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.profileOptionRow} onPress={() => setChangePasswordModalVisible(true)}>
                <View style={styles.profileOptionLeft}>
                  <Ionicons name="lock-closed-outline" size={18} color="#93f72b" />
                  <Text style={styles.profileOptionLabel}>Thay đổi mật khẩu</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.3)" />
              </TouchableOpacity>

              <TouchableOpacity style={[styles.profileOptionRow, { borderBottomWidth: 0 }]} onPress={handleRealLogout}>
                <View style={styles.profileOptionLeft}>
                  <Ionicons name="log-out-outline" size={18} color="#ef4444" />
                  <Text style={[styles.profileOptionLabel, { color: '#fca5a5' }]}>Đăng xuất khỏi tài khoản</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="rgba(239, 68, 68, 0.3)" />
              </TouchableOpacity>
            </View>
          )}

          {/* HIỂN THỊ DANH SÁCH LỊCH HẸN TỪ MONGODB */}
          {bookings.length > 0 && (
            <View style={{ marginTop: 24 }}>
              <Text style={styles.cvResultSectionTitle}>Lịch hẹn phỏng vấn đã đặt</Text>
              {bookings.map((booking, idx) => (
                <View key={booking._id || idx} style={styles.bookingHistoryCard}>
                  <View style={styles.bookingHistoryTop}>
                    <Text style={styles.bookingSessionType}>
                      {booking.sessionType === 'mock_interview' ? 'Phỏng vấn thử 1-1' : 'Đánh giá review CV'}
                    </Text>
                    <View style={[
                      styles.bookingStatusBadge,
                      booking.status === 'confirmed' ? { backgroundColor: 'rgba(16,185,129,0.1)', borderColor: '#10b981' } : { backgroundColor: 'rgba(245,158,11,0.1)', borderColor: '#f59e0b' }
                    ]}>
                      <Text style={[
                        styles.bookingStatusBadgeText,
                        booking.status === 'confirmed' ? { color: '#10b981' } : { color: '#f59e0b' }
                      ]}>{booking.status.toUpperCase()}</Text>
                    </View>
                  </View>
                  <Text style={styles.bookingMentorName}>Chuyên gia: {booking.mentorId?.name || 'Đang cập nhật'}</Text>
                  <Text style={styles.bookingTimeText}>⏱ Ngày {booking.date} · Khung giờ: {booking.timeSlot}</Text>
                  {booking.meetingLink ? (
                    <TouchableOpacity style={styles.joinMeetingBtn} onPress={() => alert(`Đang truy cập: ${booking.meetingLink}`)}>
                      <Text style={styles.joinMeetingBtnText}>Vào Zoom Meeting</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ))}
            </View>
          )}

        </ScrollView>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.rootContainer}>
      <StatusBar barStyle="light-content" translucent={true} backgroundColor="transparent" />
      
      {currentUser == null ? (
        authScreen === 'login' ? renderLoginScreen() : renderRegisterScreen()
      ) : (
        <>
          {activeTab === 'home' && renderHomeTab()}
          {activeTab === 'mentors' && renderMentorsTab()}
          {activeTab === 'courses' && renderCoursesTab()}
          {activeTab === 'cv' && renderCvTab()}
          {activeTab === 'profile' && renderProfileTab()}

          <View style={styles.bottomNavFloating}>
            <TouchableOpacity style={styles.navItemFloating} onPress={() => setActiveTab('home')}>
              <Ionicons name="home" size={20} color={activeTab === 'home' ? '#93f72b' : '#94a3b8'} />
              <Text style={[styles.navTextFloating, { color: activeTab === 'home' ? '#93f72b' : '#94a3b8' }]}>Trang chủ</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.navItemFloating} onPress={() => setActiveTab('mentors')}>
              <Ionicons name="people" size={20} color={activeTab === 'mentors' ? '#93f72b' : '#94a3b8'} />
              <Text style={[styles.navTextFloating, { color: activeTab === 'mentors' ? '#93f72b' : '#94a3b8' }]}>Mentors</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.navItemFloating} onPress={() => setActiveTab('cv')}>
              <Ionicons name="document-text" size={20} color={activeTab === 'cv' ? '#93f72b' : '#94a3b8'} />
              <Text style={[styles.navTextFloating, { color: activeTab === 'cv' ? '#93f72b' : '#94a3b8' }]}>Quét CV</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.navItemFloating} onPress={() => setActiveTab('courses')}>
              <Ionicons name="school" size={20} color={activeTab === 'courses' ? '#93f72b' : '#94a3b8'} />
              <Text style={[styles.navTextFloating, { color: activeTab === 'courses' ? '#93f72b' : '#94a3b8' }]}>Khóa học</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.navItemFloating} onPress={() => setActiveTab('profile')}>
              <Ionicons name="person" size={20} color={activeTab === 'profile' ? '#93f72b' : '#94a3b8'} />
              <Text style={[styles.navTextFloating, { color: activeTab === 'profile' ? '#93f72b' : '#94a3b8' }]}>Cá nhân</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* MODAL DANH SÁCH THÔNG BÁO TỪ BACKEND DATABASE */}
      <Modal visible={notifModalVisible} transparent animationType="slide" onRequestClose={() => setNotifModalVisible(false)}>
        <View style={styles.googleModalOverlay}>
          <View style={styles.googleAccountSheet}>
            <View style={styles.notifSheetHeader}>
              <Text style={styles.notifSheetTitle}>Hộp thư thông báo ({notifications.length})</Text>
              {unreadNotifCount > 0 ? (
                <TouchableOpacity onPress={handleMarkAllRead}>
                  <Text style={styles.markAllReadText}>Đọc tất cả</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.notifsScrollList}>
              {notifications.length === 0 ? (
                <View style={styles.emptyNotifs}>
                  <Ionicons name="mail-open-outline" size={40} color="#cbd5e1" />
                  <Text style={styles.emptyNotifsTxt}>Hộp thư thông báo của bạn trống.</Text>
                </View>
              ) : (
                notifications.map((item, index) => (
                  <View key={item._id || index} style={[styles.notifItemRow, !item.isRead ? styles.notifUnreadBg : null]}>
                    <View style={styles.notifIconCircle}>
                      <Ionicons name="notifications" size={16} color="#7000ff" />
                    </View>
                    <View style={styles.notifBodyTextWrapper}>
                      <Text style={styles.notifBodyTitle}>{item.title}</Text>
                      <Text style={styles.notifBodyMsg}>{item.message}</Text>
                      <Text style={styles.notifBodyDate}>{new Date(item.createdAt).toLocaleDateString('vi-VN')}</Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>

            <TouchableOpacity style={styles.googleSheetCloseBtn} onPress={() => setNotifModalVisible(false)}>
              <Text style={styles.googleSheetCloseBtnText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL ĐẶT LỊCH MENTOR THÀNH CÔNG */}
      <Modal visible={bookingSuccessModal} transparent animationType="fade" onRequestClose={() => setBookingSuccessModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalCheckCircle}>
              <Ionicons name="checkmark" size={30} color="#93f72b" />
            </View>
            <Text style={styles.modalTitle}>Đặt lịch thành công!</Text>
            <Text style={styles.modalDesc}>
              Lịch hẹn luyện phỏng vấn 1-1 với Mentor{' '}
              <Text style={{ fontWeight: 'bold', color: '#7000ff' }}>{bookedMentor?.name}</Text> đã được ghi nhận trực tiếp vào Database!
            </Text>
            <View style={styles.modalTimeBox}>
              <Text style={styles.modalTimeText}>⏱ Thứ 5 tuần này · 20:00 - 21:00</Text>
            </View>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setBookingSuccessModal(false)}>
              <Text style={styles.modalCloseBtnText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>



      {/* GOOGLE ACCOUNTS SELECTOR SHEET (OAUTH SIMULATOR DIALOG) */}
      <Modal visible={googleModalVisible} transparent animationType="slide" onRequestClose={() => setGoogleModalVisible(false)}>
        <View style={styles.googleModalOverlay}>
          <View style={styles.googleAccountSheet}>
            <View style={styles.googleSheetHeader}>
              <Image 
                source={{ uri: 'https://images.unsplash.com/photo-1573804633927-bfcbcd909acd?w=60&auto=format&fit=crop&q=80' }} 
                style={styles.googleIconLarge} 
              />
              <Text style={styles.googleSheetTitle}>Chọn tài khoản Google</Text>
              <Text style={styles.googleSheetDesc}>để tiếp tục đăng nhập ProInterview</Text>
            </View>

            <View style={styles.googleAccountsList}>
              <TouchableOpacity 
                style={styles.googleAccountItem} 
                onPress={() => handleGoogleAccountSelect('customer@dev.local', 'Khách hàng Dev', 'customer')}
              >
                <View style={styles.googleAvatarCircle}><Text style={styles.googleAvatarTxt}>C</Text></View>
                <View style={styles.googleAccountInfo}>
                  <Text style={styles.googleAccountName}>Khách hàng Dev</Text>
                  <Text style={styles.googleAccountEmail}>customer@dev.local</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.googleAccountItem} 
                onPress={() => handleGoogleAccountSelect('mentor@dev.local', 'Mentor Dev', 'mentor')}
              >
                <View style={styles.googleAvatarCircle}><Text style={styles.googleAvatarTxt}>M</Text></View>
                <View style={styles.googleAccountInfo}>
                  <Text style={styles.googleAccountName}>Mentor Dev</Text>
                  <Text style={styles.googleAccountEmail}>mentor@dev.local</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.googleAccountItem} 
                onPress={() => handleGoogleAccountSelect('admin@dev.local', 'Admin Dev', 'admin')}
              >
                <View style={styles.googleAvatarCircle}><Text style={styles.googleAvatarTxt}>A</Text></View>
                <View style={styles.googleAccountInfo}>
                  <Text style={styles.googleAccountName}>Admin Dev</Text>
                  <Text style={styles.googleAccountEmail}>admin@dev.local</Text>
                </View>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.googleSheetCloseBtn} onPress={() => setGoogleModalVisible(false)}>
              <Text style={styles.googleSheetCloseBtnText}>Hủy bỏ</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL THAY ĐỔI MẬT KHẨU TỪ DATABASE */}
      <Modal visible={changePasswordModalVisible} transparent animationType="fade" onRequestClose={() => setChangePasswordModalVisible(false)}>
        <View style={styles.googleModalOverlay}>
          <View style={[styles.googleAccountSheet, { paddingVertical: 24 }]}>
            <View style={{ marginBottom: 16, alignItems: 'center' }}>
              <Ionicons name="lock-closed" size={36} color="#7000ff" />
              <Text style={[styles.notifSheetTitle, { marginTop: 8 }]}>Thay đổi mật khẩu</Text>
              <Text style={{ fontSize: 12, color: '#64748b', textAlign: 'center', marginTop: 4 }}>
                {currentUser?.hasGoogleLogin 
                  ? "Tài khoản Google: Bạn có thể đặt mật khẩu trực tiếp." 
                  : "Vui lòng nhập mật khẩu hiện tại và mật khẩu mới."}
              </Text>
            </View>

            {changePasswordError ? (
              <Text style={{ color: '#ef4444', fontSize: 12, textAlign: 'center', marginBottom: 12, fontWeight: 'bold' }}>
                {changePasswordError}
              </Text>
            ) : null}

            <View style={{ gap: 12, marginBottom: 20 }}>
              {!currentUser?.hasGoogleLogin ? (
                <View>
                  <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#64748b', marginBottom: 4 }}>Mật khẩu hiện tại</Text>
                  <TextInput
                    style={[styles.searchTextInput, { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 12, height: 44, color: '#0f172a' }]}
                    placeholder="Mật khẩu hiện tại"
                    placeholderTextColor="#94a3b8"
                    secureTextEntry
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                  />
                </View>
              ) : null}

              <View>
                <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#64748b', marginBottom: 4 }}>Mật khẩu mới (ít nhất 6 ký tự)</Text>
                <TextInput
                  style={[styles.searchTextInput, { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 12, height: 44, color: '#0f172a' }]}
                  placeholder="Mật khẩu mới"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry
                  value={newPassword}
                  onChangeText={setNewPassword}
                />
              </View>

              <View>
                <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#64748b', marginBottom: 4 }}>Xác nhận mật khẩu mới</Text>
                <TextInput
                  style={[styles.searchTextInput, { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 12, height: 44, color: '#0f172a' }]}
                  placeholder="Xác nhận mật khẩu mới"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity 
                style={[styles.googleSheetCloseBtn, { flex: 1, marginTop: 0, height: 44, backgroundColor: '#f1f5f9' }]} 
                onPress={() => {
                  setChangePasswordModalVisible(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                  setChangePasswordError('');
                }}
              >
                <Text style={[styles.googleSheetCloseBtnText, { color: '#64748b' }]}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.googleSheetCloseBtn, { flex: 1, marginTop: 0, height: 44, backgroundColor: '#7000ff' }]} 
                onPress={handleChangePassword}
                disabled={updatingPassword}
              >
                <Text style={[styles.googleSheetCloseBtnText, { color: '#ffffff' }]}>
                  {updatingPassword ? "Đang xử lý..." : "Cập nhật"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const hexToRgb = (hex) => {
  let cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(char => char + char).join('');
  }
  const num = parseInt(cleanHex, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `${r}, ${g}, ${b}`;
};

const createShadow = (color, offsetX, offsetY, opacity, radius, elevation = 0) => {
  return Platform.select({
    web: {
      boxShadow: `${offsetX}px ${offsetY}px ${radius}px rgba(${color.startsWith('#') ? hexToRgb(color) : color}, ${opacity})`,
    },
    default: {
      shadowColor: color,
      shadowOffset: { width: offsetX, height: offsetY },
      shadowOpacity: opacity,
      shadowRadius: radius,
      elevation: elevation,
    },
  });
};

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#06040b',
  },
  homeScrollWrapper: {
    flex: 1,
    backgroundColor: '#090514',
    position: 'relative',
  },
  glowSphere: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    opacity: 0.15,
  },

  // LOGIN SCREEN STYLE (COSMOS BRANDED GLASSMORPHISM)
  loginWrapper: {
    flex: 1,
    backgroundColor: '#06040b',
  },
  loginOverlay: {
    flex: 1,
    backgroundColor: 'rgba(6, 4, 11, 0.78)',
    paddingHorizontal: 24,
  },
  loginScrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loginHeader: {
    alignItems: 'center',
    marginBottom: 36,
  },
  loginLogoImage: {
    width: 190,
    height: 52,
    marginBottom: 10,
  },
  loginTagline: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
  },
  loginCard: {
    backgroundColor: 'rgba(22, 17, 41, 0.85)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(128, 55, 244, 0.25)', 
    ...createShadow('#7000ff', 0, 10, 0.15, 24, 8),
  },
  loginTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  loginSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 24,
  },
  loginInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    height: 52,
  },
  loginInputIcon: {
    marginRight: 12,
  },
  loginTextInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 15,
  },
  authErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  authErrorText: {
    color: '#fca5a5',
    fontSize: 12,
    flex: 1,
  },
  loginSubmitBtn: {
    backgroundColor: '#93f72b',
    borderRadius: 12,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    ...createShadow('#93f72b', 0, 4, 0.3, 8, 3),
  },
  loginSubmitBtnText: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: 'bold',
  },
  orDividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  orDividerText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontWeight: 'bold',
    marginHorizontal: 10,
    letterSpacing: 1,
  },
  googleLoginSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    height: 52,
    gap: 10,
    ...createShadow('#000', 0, 4, 0.1, 6),
  },
  googleIconMini: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  googleLoginSubmitBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  loginGuestBtn: {
    alignSelf: 'center',
    marginTop: 20,
    padding: 4,
  },
  loginGuestBtnText: {
    color: '#a78bfa',
    fontSize: 13,
    fontWeight: '600',
  },

  // CINEMATIC HERO STYLE OPTIMIZED FOR MOBILE (COMPACT DASHBOARD)
  heroWrapperCompact: {
    width: width,
    height: height * 0.44, 
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#0c081e',
  },
  heroOverlayWashCompact: {
    flex: 1,
    backgroundColor: 'rgba(9, 5, 20, 0.45)',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 44 : 20,
    justifyContent: 'space-between',
    paddingBottom: 24,
    zIndex: 1,
  },
  topHeaderCompact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerWelcomeBox: {
    gap: 2,
  },
  headerWelcomeText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  headerUserName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    position: 'relative',
  },
  headerIconBtn: {
    padding: 2,
    position: 'relative',
  },
  unreadNotifBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadNotifBadgeText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: 'bold',
  },
  avatarProfile: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#7000ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#93f72b',
  },
  avatarText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  heroMiddleCompact: {
    alignItems: 'center',
    paddingBottom: 10,
  },
  heroLogoCompact: {
    width: 150,
    height: 38,
    marginBottom: 6,
  },
  heroHeadlineCompact: {
    fontSize: 14,
    color: '#cbd5e1',
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '500',
  },
  actionButtonContainerCompact: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'center',
    gap: 10,
  },
  primaryLimeBtnCompact: {
    backgroundColor: '#93f72b',
    borderRadius: 20,
    flex: 1,
    maxWidth: 160,
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  primaryLimeBtnTextCompact: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  secondaryOutlineBtnCompact: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    flex: 1,
    maxWidth: 140,
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secondaryOutlineBtnTextCompact: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  // UTILITY WIDGET SECTION
  widgetSection: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  upcomingMeetingWidget: {
    backgroundColor: 'rgba(22, 17, 41, 0.8)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(128, 55, 244, 0.25)', 
    ...createShadow('#7000ff', 0, 6, 0.15, 15, 3),
  },
  widgetHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  liveIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ef4444',
  },
  liveText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ef4444',
    textTransform: 'uppercase',
  },
  widgetRoomCode: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: 'bold',
  },
  widgetTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  widgetMetaText: {
    fontSize: 11,
    color: '#94a3b8',
    lineHeight: 16,
    marginBottom: 14,
  },
  widgetActionBtn: {
    backgroundColor: '#93f72b',
    borderRadius: 12,
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  widgetActionBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0f172a',
  },

  // MOBILE FIRST GENERAL SECTION STYLE
  mobileSection: {
    paddingHorizontal: 20,
    marginTop: 32,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  mobileSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  viewAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewAllText: {
    fontSize: 12,
    color: '#93f72b',
    fontWeight: '600',
  },

  // STEP FLOW BAR
  stepFlowBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(22, 17, 41, 0.8)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(128, 55, 244, 0.2)',
    padding: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  stepFlowPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepFlowNum: {
    fontSize: 11,
    fontWeight: '950',
    color: '#7000ff',
    backgroundColor: '#93f72b', 
    width: 18,
    height: 18,
    borderRadius: 9,
    textAlign: 'center',
    lineHeight: 18,
  },
  stepFlowName: {
    fontSize: 11,
    color: '#cbd5e1',
    fontWeight: 'bold',
  },

  // MENTORS CAROUSEL
  horizontalCarouselContainer: {
    gap: 12,
    paddingRight: 20,
    marginTop: 4,
  },
  mentorMiniCardMobile: {
    backgroundColor: 'rgba(22, 17, 41, 0.8)',
    borderRadius: 20,
    padding: 14,
    width: 146,
    borderWidth: 1,
    borderColor: 'rgba(128, 55, 244, 0.25)',
    alignItems: 'center',
    ...createShadow('#7000ff', 0, 4, 0.1, 8),
  },
  avatarGlowContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  mentorMiniAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: '#7000ff',
  },
  onlineDotIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10b981',
    borderWidth: 1.5,
    borderColor: '#090514',
    position: 'absolute',
    bottom: 2,
    right: 2,
  },
  mentorMiniName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 2,
  },
  mentorMiniRole: {
    fontSize: 9,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 8,
    width: '100%',
  },
  mentorMiniMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingTop: 6,
  },
  miniCompanyBadge: {
    backgroundColor: 'rgba(147, 247, 43, 0.1)',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  mentorMiniCompany: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#93f72b',
  },
  mentorMiniRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  mentorMiniRatingText: {
    fontSize: 9,
    color: '#cbd5e1',
    fontWeight: 'bold',
  },

  // COURSES CAROUSEL
  courseMiniCardMobile: {
    backgroundColor: 'rgba(22, 17, 41, 0.8)',
    borderRadius: 20,
    overflow: 'hidden',
    width: 180,
    borderWidth: 1,
    borderColor: 'rgba(128, 55, 244, 0.25)',
  },
  courseMiniImage: {
    width: '100%',
    height: 94,
  },
  courseMiniPriceBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: '#93f72b',
    borderRadius: 8,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  courseMiniPriceText: {
    color: '#0f172a',
    fontSize: 10,
    fontWeight: 'bold',
  },
  courseMiniContent: {
    padding: 10,
  },
  courseMiniTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  courseMiniMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  courseMiniDuration: {
    fontSize: 9,
    color: '#cbd5e1',
  },
  courseMiniRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  courseMiniRatingVal: {
    fontSize: 9,
    color: '#cbd5e1',
    fontWeight: 'bold',
  },

  // MENTOR PREMIUM LIST
  mentorPremiumCard: {
    backgroundColor: 'rgba(22, 17, 41, 0.8)',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(128, 55, 244, 0.25)',
    ...createShadow('#7000ff', 0, 6, 0.1, 12, 3),
    marginBottom: 16,
  },
  mentorCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  mentorFullAvatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2,
    borderColor: '#7000ff',
  },
  mentorMainDetails: {
    flex: 1,
    marginLeft: 14,
  },
  mentorFullName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  mentorFullRole: {
    fontSize: 12,
    color: '#cbd5e1',
    marginTop: 2,
    marginBottom: 6,
  },
  mentorFullBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  companyFullBadge: {
    backgroundColor: 'rgba(147, 247, 43, 0.1)',
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  companyFullBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#93f72b',
  },
  ratingFullRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingFullText: {
    fontSize: 11,
    color: '#cbd5e1',
    fontWeight: '500',
  },
  bookPremiumBtn: {
    backgroundColor: '#93f72b',
    borderRadius: 14,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  bookPremiumBtnText: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: 'bold',
  },

  // COURSE PREMIUM LIST
  coursePremiumCard: {
    backgroundColor: 'rgba(22, 17, 41, 0.8)',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(128, 55, 244, 0.25)',
    marginBottom: 16,
    ...createShadow('#7000ff', 0, 6, 0.1, 12, 3),
  },
  coursePremiumImage: {
    width: '100%',
    height: 150,
  },
  coursePremiumBody: {
    padding: 16,
  },
  coursePremiumTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    lineHeight: 22,
    marginBottom: 8,
  },
  coursePremiumDetailsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  courseMetaIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  courseMetaText: {
    fontSize: 12,
    color: '#cbd5e1',
  },
  coursePremiumFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingTop: 14,
  },
  coursePremiumPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#10b981',
  },
  courseBuyBtn: {
    backgroundColor: '#93f72b',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  courseBuyBtnText: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: 'bold',
  },

  // NEWS SPOTLIGHT CARD
  newsSpotlightCard: {
    backgroundColor: 'rgba(22, 17, 41, 0.8)',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(128, 55, 244, 0.2)',
    marginTop: 10,
  },
  newsSpotlightImage: {
    width: '100%',
    height: 140,
  },
  newsSpotlightContent: {
    padding: 14,
  },
  newsSpotlightDate: {
    fontSize: 9,
    color: '#7000ff',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  newsSpotlightTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#ffffff',
    lineHeight: 18,
    marginBottom: 10,
  },
  newsSpotlightLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  newsSpotlightLinkText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#93f72b',
  },

  // MINIMAL FOOTER
  footerMinimalContainer: {
    marginTop: 48,
    paddingVertical: 32,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    backgroundColor: '#05040b',
  },
  footerMinimalLogo: {
    width: 120,
    height: 32,
    marginBottom: 8,
  },
  footerMinimalCopyright: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.4)',
    marginBottom: 4,
  },
  footerMinimalHeartRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerMinimalHeartText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.4)',
  },

  // MÀN HÌNH TÀI KHOẢN
  profileCard: {
    backgroundColor: 'rgba(22, 17, 41, 0.8)',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(128, 55, 244, 0.25)',
    ...createShadow('#7000ff', 0, 8, 0.1, 16, 3),
    marginBottom: 20,
    marginTop: 10,
  },
  profileAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 32,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#090514',
    borderRadius: 8,
    padding: 1,
  },
  profileHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  profileAvatarLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#7000ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#93f72b',
    position: 'relative',
  },
  profileAvatarLargeText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  profileInfoDetails: {
    marginLeft: 16,
    flex: 1,
    gap: 3,
  },
  profileNameText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  profileEmailText: {
    fontSize: 12,
    color: '#cbd5e1',
  },
  profileCompanyRoleText: {
    fontSize: 11,
    color: '#cbd5e1',
    marginTop: 2,
  },
  profilePlanBadge: {
    backgroundColor: 'rgba(147, 247, 43, 0.12)',
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 8,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  profilePlanBadgeText: {
    color: '#93f72b',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
 
  quotaBox: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    paddingTop: 16,
  },
  quotaHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  quotaTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#94a3b8',
  },
  quotaBody: {
    gap: 10,
  },
  quotaItem: {
    gap: 4,
  },
  quotaLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quotaLabel: {
    fontSize: 10,
    color: '#cbd5e1',
    fontWeight: '500',
  },
  quotaTrack: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  quotaFill: {
    height: '100%',
    borderRadius: 2,
  },
 
  subTabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 16,
  },
  subTabBtn: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subTabBtnActive: {
    backgroundColor: '#7000ff',
  },
  subTabBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#cbd5e1',
  },
  subTabBtnTextActive: {
    color: '#ffffff',
  },

  subTabContentCard: {
    backgroundColor: 'rgba(22, 17, 41, 0.8)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(128, 55, 244, 0.25)',
    gap: 16,
  },
  infoFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    paddingBottom: 12,
  },
  infoFieldRight: {
    flex: 1,
    gap: 2,
  },
  infoFieldLabel: {
    fontSize: 10,
    color: '#cbd5e1',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  infoFieldValue: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '500',
  },

  resumeFieldBlock: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    paddingBottom: 14,
    gap: 6,
  },
  resumeBlockLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#7000ff',
    textTransform: 'uppercase',
  },
  resumeBlockValue: {
    fontSize: 13,
    color: '#ffffff',
    lineHeight: 18,
  },
  profileSkillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  profileSkillPill: {
    backgroundColor: 'rgba(112, 0, 255, 0.15)',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(112, 0, 255, 0.25)',
  },
  profileSkillPillText: {
    fontSize: 11,
    color: '#a78bfa',
    fontWeight: 'bold',
  },

  profileOptionsList: {
    backgroundColor: 'rgba(22, 17, 41, 0.8)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(128, 55, 244, 0.2)',
    overflow: 'hidden',
    marginBottom: 32,
  },
  profileOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 52,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  profileOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profileOptionLabel: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '500',
  },

  // BOOKING HISTORY CARDS
  bookingHistoryCard: {
    backgroundColor: 'rgba(22, 17, 41, 0.8)',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(128, 55, 244, 0.25)',
    marginBottom: 14,
    ...createShadow('#7000ff', 0, 4, 0.08, 8),
  },
  bookingHistoryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  bookingSessionType: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  bookingStatusBadge: {
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  bookingStatusBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  bookingMentorName: {
    fontSize: 12,
    color: '#cbd5e1',
    marginBottom: 4,
  },
  bookingTimeText: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 12,
  },
  joinMeetingBtn: {
    backgroundColor: '#93f72b',
    borderRadius: 10,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinMeetingBtnText: {
    color: '#0f172a',
    fontSize: 11,
    fontWeight: 'bold',
  },

  // CV HISTORY CARD
  cvHistoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(22, 17, 41, 0.8)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(128, 55, 244, 0.25)',
    marginBottom: 12,
  },
  cvHistoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cvHistoryName: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
    maxWidth: width * 0.5,
  },
  cvHistoryDate: {
    color: '#cbd5e1',
    fontSize: 10,
    marginTop: 2,
  },
  cvHistoryScore: {
    backgroundColor: 'rgba(147,247,43,0.1)',
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#93f72b',
  },
  cvHistoryScoreTxt: {
    color: '#93f72b',
    fontSize: 12,
    fontWeight: 'bold',
  },

  // NOTIFICATION SHEET STYLES
  notifSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    paddingBottom: 16,
    marginBottom: 16,
  },
  notifSheetTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  markAllReadText: {
    color: '#93f72b',
    fontSize: 12,
    fontWeight: 'bold',
  },
  notifsScrollList: {
    gap: 12,
    paddingBottom: 16,
  },
  emptyNotifs: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyNotifsTxt: {
    color: '#cbd5e1',
    fontSize: 13,
  },
  notifItemRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  notifUnreadBg: {
    backgroundColor: 'rgba(112, 0, 255, 0.15)',
    borderColor: 'rgba(112, 0, 255, 0.3)',
  },
  notifIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(112, 0, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notifBodyTextWrapper: {
    flex: 1,
    gap: 2,
  },
  notifBodyTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  notifBodyMsg: {
    fontSize: 12,
    color: '#cbd5e1',
    lineHeight: 16,
  },
  notifBodyDate: {
    fontSize: 9,
    color: '#94a3b8',
    marginTop: 4,
  },

  // OVERLAPPING CARDS CV SHOWCASE
  overlappingCardsContainer: {
    position: 'relative',
    marginTop: 10,
    minHeight: 520,
    zIndex: 1,
  },
  cvDeckCard: {
    backgroundColor: 'rgba(22, 17, 41, 0.8)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(128, 55, 244, 0.25)',
    ...createShadow('#7000ff', 0, 10, 0.12, 20, 5),
    padding: 16,
  },
  cvDeckCard1: {
    width: '90%',
    alignSelf: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 1,
    height: 60,
    transform: [{ rotate: '1.25deg' }, { scale: 0.97 }, { translateX: 15 }],
  },
  cvCard1Title: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  cvBadgeGreen: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  cvBadgeGreenText: {
    fontSize: 11,
    color: '#10b981',
    fontWeight: 'bold',
  },
  cvDeckCard2: {
    width: '94%',
    alignSelf: 'center',
    marginTop: -16, 
    zIndex: 2,
    transform: [{ rotate: '-1.1deg' }, { scale: 1.0 }, { translateX: -10 }],
  },
  cvCard2Header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cvCard2Title: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  keywordsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  keywordPill: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  keywordText: {
    fontSize: 11,
    color: '#cbd5e1',
    fontWeight: '500',
  },
  cvDeckCard3: {
    width: '98%',
    alignSelf: 'center',
    marginTop: -2, 
    zIndex: 3,
    borderRadius: 20,
    padding: 20,
    transform: [{ rotate: '0.85deg' }, { scale: 1.02 }],
  },
  gaugeContainer: {
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    paddingBottom: 16,
  },
  circularProgressMock: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 4,
    borderColor: '#93f72b',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginBottom: 10,
  },
  circularScoreText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  circularScoreSub: {
    fontSize: 10,
    color: '#cbd5e1',
    marginLeft: 2,
  },
  gaugeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  gaugeSubtitle: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 4,
  },
  progressBarList: {
    gap: 14,
  },
  progressBarItem: {
    gap: 6,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabelName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  progressLabelValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },

  // SEARCH AND FILTER BAR STYLES
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 48,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 16,
    ...createShadow('#000000', 0, 4, 0.2, 6),
  },
  searchTextInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
  },
  filterPillsRowWrapper: {
    maxHeight: 40,
    marginBottom: 20,
  },
  filterPillBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    height: 32,
    justifyContent: 'center',
  },
  filterPillBtnActive: {
    backgroundColor: '#7000ff',
    borderColor: '#7000ff',
  },
  filterPillBtnText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: 'bold',
  },
  filterPillBtnTextActive: {
    color: '#ffffff',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 14,
  },

  // HIGH TECH SCANNING CONSOLE
  cvScanningConsole: {
    width: '100%',
    alignItems: 'center',
  },
  cvScanningCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: '#7000ff',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 24,
    backgroundColor: 'rgba(112, 0, 255, 0.05)',
  },
  scanningBeam: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#93f72b',
    ...createShadow('#93f72b', 0, 0, 0.8, 6, 4),
    width: '100%',
  },
  cvUploadBoxContent: {
    alignItems: 'center',
  },
  uploadIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(147, 247, 43, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(147, 247, 43, 0.25)',
  },
  cvMockCard: {
    backgroundColor: 'rgba(22, 17, 41, 0.8)',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(128, 55, 244, 0.25)',
    marginTop: 20,
    ...createShadow('#7000ff', 0, 6, 0.1, 16, 3),
  },
  cvMockTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 6,
  },
  cvMockDesc: {
    fontSize: 11,
    color: '#cbd5e1',
    textAlign: 'center',
    marginBottom: 20,
  },
  uploadMockBtn: {
    backgroundColor: '#93f72b',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 28,
  },
  uploadMockBtnText: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: 'bold',
  },
  cvProgressText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
  },
  cvProgressBarOutline: {
    width: '80%',
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  cvProgressBarInner: {
    height: '100%',
    backgroundColor: '#7000ff',
    borderRadius: 3,
  },
  cvSuccessBox: {
    alignItems: 'center',
    gap: 8,
  },
  cvSuccessBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(147, 247, 43, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: '#93f72b',
  },
  cvSuccessText: {
    color: '#93f72b',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cvSuccessFileName: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 16,
  },
  reUploadBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  reUploadBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  cvResultSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },

  // FLOATING BOTTOM PILL TAB BAR
  bottomNavFloating: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 28 : 16,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(12, 8, 30, 0.85)', 
    height: 64,
    borderRadius: 32,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(112, 0, 255, 0.25)', 
    ...createShadow('#7000ff', 0, 8, 0.2, 16, 6),
    paddingHorizontal: 10,
  },
  navItemFloating: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    height: '100%',
  },
  navTextFloating: {
    fontSize: 9,
    fontWeight: 'bold',
    marginTop: 3,
  },

  // MODAL STYLES
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: '#161129',
    borderRadius: 24,
    padding: 28,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  modalCheckCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(147, 247, 43, 0.15)',
    borderWidth: 1.5,
    borderColor: '#93f72b',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
  },
  modalDesc: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  modalTimeBox: {
    backgroundColor: 'rgba(112, 0, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(112, 0, 255, 0.3)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  modalTimeText: {
    fontSize: 12,
    color: '#a78bfa',
    fontWeight: 'bold',
  },
  modalCloseBtn: {
    backgroundColor: '#93f72b',
    borderRadius: 12,
    height: 48,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseBtnText: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: 'bold',
  },

  // TAB CONTENT GENERAL STYLES
  tabContentContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 50 : 24,
  },
  tabTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  tabSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 20,
    lineHeight: 18,
  },
  tabLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 14,
  },

  // MENTORS TAB
  mentorsVerticalScroll: {
    gap: 16,
    paddingBottom: 120,
  },

  // COURSES TAB
  coursesVerticalScroll: {
    gap: 20,
    paddingBottom: 120,
  },

  // GOOGLE MODAL SHEET STYLES
  googleModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  googleAccountSheet: {
    backgroundColor: '#0f0c1b',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    maxHeight: height * 0.7,
    borderWidth: 1,
    borderColor: 'rgba(128, 55, 244, 0.25)',
  },
  googleSheetHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  googleIconLarge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginBottom: 12,
  },
  googleSheetTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  googleSheetDesc: {
    fontSize: 12,
    color: '#cbd5e1',
    marginTop: 4,
  },
  googleAccountsList: {
    gap: 12,
    marginBottom: 20,
  },
  googleAccountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  googleAvatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  googleAvatarTxt: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  googleAccountInfo: {
    flex: 1,
  },
  googleAccountName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  googleAccountEmail: {
    fontSize: 12,
    color: '#cbd5e1',
    marginTop: 1,
  },
  googleSheetCloseBtn: {
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    marginTop: 8,
  },
  googleSheetCloseBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  }
});

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
