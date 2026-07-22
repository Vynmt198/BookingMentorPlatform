import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
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
  Pressable,
  NativeModules,
  Alert,
  Linking,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SystemUI from 'expo-system-ui';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/manrope';
import { getCourseDisplayTitle } from './src/utils/courseDisplay';
import WebView from 'react-native-webview';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import {
  fetchPublicCatalog,
  loadAuthenticatedUserData,
  analyzeAndSaveCv,
  analyzeCvAgainstJd,
  markAllNotificationsRead,
  markNotificationRead,
  deleteNotification,
  cancelCustomerBooking,
  createBookingReview,
  deleteCvAnalysis,
  createReport,
  ensureApiBase,
  getApiBaseUrl,
  resetApiBaseCache,
  getConfiguredApiBase,
  resolveConfiguredApiBase,
} from './src/services/proInterviewApi';
import { BACKEND_DEV_HINT } from './src/utils/backendErrors';
import { loadAdminPortalData, loadMentorPortalData } from './src/services/roleApi';
import RolePortal from './src/components/RolePortal';
import GoogleSignInButton from './src/components/GoogleSignInButton';
import CartScreen from './src/components/CartScreen';
import CheckoutScreen from './src/components/CheckoutScreen';
import PaymentResultScreen from './src/components/PaymentResultScreen';
import CourseLearningScreen from './src/components/CourseLearningScreen';
import CourseDetailScreen from './src/components/CourseDetailScreen';
import ProfileScreen from './src/components/ProfileScreen';
import CvAnalysisHubScreen from './src/components/CvAnalysisHubScreen';
import CvJdUploadScreen from './src/components/CvJdUploadScreen';
import MentorsScreen from './src/components/MentorsScreen';
import MentorBookingScreen from './src/components/MentorBookingScreen';
import {
  fetchCart,
  addToCart,
  removeFromCart,
  updateCartItemQty,
  calcCartSummary,
} from './src/services/cartApi';
import { enrollCourse, verifyVnpayReturn, fetchPaymentStatus } from './src/services/paymentApi';
import {
  loginWithEmail,
  registerAccount,
  logoutSession,
  patchCurrentUser,
  getAccessToken,
  fetchCurrentUser,
  loginWithGoogleCredential,
  requestPasswordReset,
  resetPasswordWithToken,
  deleteAccount,
} from './src/utils/mobileAuth';
import { resolveMediaUrl, DEFAULT_COURSE_THUMB, mentorAvatarFallback } from './src/utils/mediaUrl';
import * as DocumentPicker from 'expo-document-picker';
const { width, height } = Dimensions.get('window');
const AUTH_CARD_MAX_WIDTH = Math.min(292, Math.round(width * 0.74));
const AUTH_MASCOT_SIZE = Math.min(96, Math.round(width * 0.24));
const HOME_NAV_CLEARANCE = Platform.OS === 'ios' ? 90 : 80;
const HOME_SIDE_PAD = 16;
const HOME_GRID_GAP = 10;
const HOME_MENTOR_CARD_WIDTH = Math.floor((width - HOME_SIDE_PAD * 2 - HOME_GRID_GAP) / 2);
const HOME_MENTOR_CARD_HEIGHT = Math.round(
  Math.min(164, Math.max(112, HOME_MENTOR_CARD_WIDTH * 1.16)),
);
const HOME_NEWS_CARD_WIDTH = Math.round(Math.min(width - HOME_SIDE_PAD * 2 - 6, width * 0.78));
const HOME_NEWS_HEIGHT = Math.round(Math.min(128, Math.max(108, HOME_NEWS_CARD_WIDTH * 0.38)));

/** Màu nền ProInterview web (`app-shell-ambient--home`) */
const PI_SHELL_BG = '#f5f0fc';
const PI_SHELL_GRADIENT = ['#e8ddf5', '#efe6fa', '#f5f0fc', '#f5f0fc', '#f2edf9', '#efe6fa'];

const AppShellBackground = () => (
  <View style={StyleSheet.absoluteFill} pointerEvents="none">
    <LinearGradient
      colors={PI_SHELL_GRADIENT}
      locations={[0, 0.14, 0.28, 0.62, 0.82, 1]}
      style={StyleSheet.absoluteFill}
    />
  </View>
);

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
  const insets = useSafeAreaInsets();
  const safeTopInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0,
  );
  const shellTopPad = safeTopInset + 14;
  const authTopPad = safeTopInset + 10;
  const authBottomPad = Math.max(insets.bottom, 14);
  const homeTopPad = shellTopPad;
  const homeBottomPad = Math.max(insets.bottom, 12) + HOME_NAV_CLEARANCE;
  const [currentUser, setCurrentUser] = useState(null); 
  const [loginSession, setLoginSession] = useState(null);
  const [authRenderTick, setAuthRenderTick] = useState(0);
  const [userToken, setUserToken] = useState(null);
  const [activeTab, setActiveTab] = useState('home'); 
  const [mentors, setMentors] = useState([]);
  const [courses, setCourses] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [payments, setPayments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [cvAnalyses, setCvAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiConnected, setApiConnected] = useState(false);
  const [justLoggedOut, setJustLoggedOut] = useState(false);
  const [rolePortalData, setRolePortalData] = useState(null);
  const [roleDataLoading, setRoleDataLoading] = useState(false);
  const [profileSubTab, setProfileSubTab] = useState('profile');
  const homeEntrance = useRef(new Animated.Value(0)).current;
  const profileEntrance = useRef(new Animated.Value(0)).current;
  const profileTabEntrance = useRef(new Animated.Value(1)).current;
  /** Tăng khi login tay để hủy restore phiên cũ (tránh clear session vừa login). */
  const sessionEpochRef = useRef(0);

  const appUser = currentUser || loginSession?.user || null;
  const appToken = userToken || loginSession?.token || null;
  const userRole = appUser?.role || 'customer';

  useEffect(() => {
    if (Platform.OS === 'web') return;
    void SystemUI.setBackgroundColorAsync(appUser ? PI_SHELL_BG : '#f5f0fc');
  }, [appUser]);

  useEffect(() => {
    if (appUser) return;
    let cancelled = false;

    if (Platform.OS !== 'web') {
      const guess =
        resolveConfiguredApiBase() ||
        getConfiguredApiBase() ||
        null;
      if (guess) {
        setApiBaseLabel(guess);
        setApiReachable(true);
        setApiConnected(true);
      }
    }

    (async () => {
      try {
        if (Platform.OS === 'web') {
          resetApiBaseCache();
        }
        const base = await ensureApiBase();
        if (cancelled) return;
        setApiConnected(Boolean(base));
        setApiReachable(Boolean(base));
        setApiBaseLabel(
          base ||
            resolveConfiguredApiBase() ||
            getConfiguredApiBase() ||
            '(chưa có URL)',
        );
        if (!base && __DEV__) {
          console.warn('[API] Không tìm thấy backend. Thử EXPO_PUBLIC_DEV_API_HOST trong .env');
        } else if (base && __DEV__) {
          console.log('[API] connected:', base);
        }
      } catch (err) {
        if (!cancelled) {
          setApiReachable(false);
          console.warn('[API] probe failed:', err?.message || err);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [appUser]);

  useEffect(() => {
    if (activeTab !== 'home') return;
    homeEntrance.setValue(0);
    Animated.timing(homeEntrance, {
      toValue: 1,
      duration: 420,
      useNativeDriver: true,
    }).start();
  }, [activeTab, homeEntrance]);

  useEffect(() => {
    if (activeTab !== 'profile') return;
    profileEntrance.setValue(0);
    Animated.timing(profileEntrance, {
      toValue: 1,
      duration: 320,
      useNativeDriver: true,
    }).start();
  }, [activeTab, profileEntrance]);

  useEffect(() => {
    if (activeTab !== 'profile') return;
    profileTabEntrance.setValue(0);
    Animated.timing(profileTabEntrance, {
      toValue: 1,
      duration: 240,
      useNativeDriver: true,
    }).start();
  }, [activeTab, profileSubTab, profileTabEntrance]);

  const getDefaultTabForRole = (role) => {
    if (role === 'admin') return 'admin_home';
    if (role === 'mentor') return 'mentor_home';
    return 'home';
  };

  const clearLocalSession = () => {
    setCurrentUser(null);
    setLoginSession(null);
    setUserToken(null);
    setBookings([]);
    setEnrollments([]);
    setPayments([]);
    setNotifications([]);
    setCvAnalyses([]);
    setRolePortalData(null);
    setLearningEnrollment(null);
    setActiveTab('home');
    setCart(null);
  };

  const applyLoggedInUser = (user, token) => {
    const role = user?.role || 'customer';
    const safeUser = user && typeof user === 'object'
      ? { ...user, role }
      : { name: 'Bạn học', role: 'customer' };
    sessionEpochRef.current += 1;
    setLoginSession({ user: safeUser, token: token || null, at: Date.now() });
    setCurrentUser(safeUser);
    setUserToken(token || null);
    setJustLoggedOut(false);
    setActiveTab(getDefaultTabForRole(role));
    setAuthRenderTick((tick) => tick + 1);
    setTimeout(() => {
      setLoginSession((prev) => prev || { user: safeUser, token: token || null, at: Date.now() });
      setAuthRenderTick((tick) => tick + 1);
    }, 0);
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => setAuthRenderTick((tick) => tick + 1));
    }
  };

  const handleInvalidSession = async () => {
    await logoutSession();
    clearLocalSession();
    setJustLoggedOut(true);
  };

  const loadRolePortalData = async (role) => {
    if (role !== 'admin' && role !== 'mentor') {
      setRolePortalData(null);
      return;
    }
    setRoleDataLoading(true);
    try {
      const data =
        role === 'admin' ? await loadAdminPortalData() : await loadMentorPortalData();
      if (data.sessionValid === false) {
        await handleInvalidSession();
        return;
      }
      setRolePortalData(data);
    } catch (e) {
      console.warn('loadRolePortalData:', e);
    }
    setRoleDataLoading(false);
  };

  const showCartToast = (message) => {
    setCartToast(message);
    setTimeout(() => setCartToast(''), 2500);
  };

  const notifyUser = (title, message) => {
    const text = message ? `${title}: ${message}` : title;
    if (Platform.OS === 'web') {
      showCartToast(text);
      return;
    }
    Alert.alert(title, message || title);
  };

  /** available | pending | owned */
  const getCoursePurchaseState = (courseId) => {
    const id = String(courseId || '').trim();
    if (!id) return 'available';
    const row = enrollments.find((e) => {
      const cid = e.courseId?._id || e.courseId?.id || e.courseId;
      return String(cid) === id;
    });
    if (!row) return 'available';
    if (row.paymentStatus === 'pending') return 'pending';
    if (row.paymentStatus === 'paid' || row.paymentStatus == null) return 'owned';
    return 'available';
  };

  const refreshCart = async () => {
    const token = await getAccessToken();
    if (!token) {
      setCart(null);
      return;
    }
    setCartLoading(true);
    try {
      const res = await fetchCart();
      if (res.success) setCart(res.cart);
    } catch (e) {
      console.warn('refreshCart:', e);
    }
    setCartLoading(false);
  };

  const handleAddCourseToCart = async (course) => {
    if (!appUser) {
      notifyUser('Đăng nhập', 'Vui lòng đăng nhập để thêm vào giỏ hàng.');
      return;
    }
    if (!course?.id) {
      notifyUser('Lỗi', 'Khóa học thiếu mã ID. Kéo xuống để tải lại danh sách.');
      return;
    }
    if (course.isFree || !course.priceNum) {
      goToCheckout({ mode: 'course', course, fromTab: 'courses' });
      return;
    }

    setAddingCourseId(course.id);
    try {
      const base = await ensureApiBase();
      if (!base) {
        notifyUser('Backend', `Không kết nối backend. ${BACKEND_DEV_HINT}`);
        return;
      }

      const res = await addToCart({
        itemType: 'Course',
        itemId: course.id,
        title: course.title,
        price: course.priceNum,
        quantity: 1,
        thumbnail: course.image || '',
      });

      if (res.success) {
        setCart(res.cart);
        setTabBeforeCart(activeTab);
        setActiveTab('cart');
        showCartToast(`Đã thêm "${course.title}" vào giỏ (${calcCartSummary(res.cart).count} món)`);
      } else {
        notifyUser('Không thêm được', res.error || 'Lỗi giỏ hàng.');
      }
    } finally {
      setAddingCourseId(null);
    }
  };

  const handleRemoveCartItem = async (itemId) => {
    const res = await removeFromCart(itemId);
    if (res.success) setCart(res.cart);
    else notifyUser('Lỗi', res.error || 'Không xóa được sản phẩm.');
  };

  const handleUpdateCartQty = async (itemId, quantity) => {
    const qty = Math.max(1, Number(quantity) || 1);
    const res = await updateCartItemQty(itemId, qty);
    if (res.success) setCart(res.cart);
    else notifyUser('Lỗi', res.error || 'Không cập nhật số lượng.');
  };

  const goToCheckout = ({ mode, course, booking, fromTab }) => {
    setTabBeforeCheckout(fromTab || activeTab);
    setCheckoutMode(mode);
    setCheckoutCourse(course || null);
    setCheckoutBooking(booking || null);
    setActiveTab('checkout');
  };

  const handleStartCartCheckout = () => {
    if (!cartSummary.count) {
      notifyUser('Giỏ hàng trống', 'Hãy thêm khóa học trước khi thanh toán.');
      return;
    }
    goToCheckout({ mode: 'cart', fromTab: 'cart' });
  };

  const handleBuyCourseNow = (course) => {
    if (!appUser) {
      notifyUser('Đăng nhập', 'Vui lòng đăng nhập để mua khóa học.');
      return;
    }
    if (!course?.id) {
      notifyUser('Lỗi', 'Khóa học thiếu mã ID. Kéo xuống để tải lại danh sách.');
      return;
    }

    const purchaseState = getCoursePurchaseState(course.id);
    if (purchaseState === 'owned') {
      const ownedEnrollment = findEnrollmentForCourse(course.id);
      if (ownedEnrollment) {
        openCourseLearning(ownedEnrollment, 'courses');
        return;
      }
    }

    goToCheckout({ mode: 'course', course, fromTab: activeTab });
  };

  const handlePaymentSuccess = async () => {
    await refreshCart();
    loadUserData();
  };

  const openCourseLearning = (enrollment, returnTab = activeTab) => {
    if (!enrollment) {
      notifyUser('Khóa học', 'Không tìm thấy dữ liệu ghi danh.');
      return;
    }
    const paid = enrollment.paymentStatus === 'paid' || enrollment.paymentStatus == null;
    if (!paid) {
      notifyUser('Chưa thanh toán', 'Hoàn tất thanh toán để xem nội dung khóa học.');
      return;
    }
    setTabBeforeLearning(returnTab || activeTab);
    setLearningEnrollment(enrollment);
    setActiveTab('course_learning');
  };

  const findEnrollmentForCourse = (courseId) => {
    const id = String(courseId || '').trim();
    if (!id) return null;
    return enrollments.find((item) => {
      const enrolledCourseId = item.courseId?._id || item.courseId?.id || item.courseId;
      return String(enrolledCourseId) === id;
    }) || null;
  };

  const openCourseDetail = (course) => {
    const courseId = String(course?.id || course?._id || '').trim();
    if (!courseId) {
      notifyUser('Lỗi', 'Khóa học thiếu mã ID.');
      return;
    }
    setTabBeforeCourseDetail(activeTab);
    setDetailCourseId(courseId);
    setActiveTab('course_detail');
  };

  const handleFreeEnroll = async (course) => {
    if (!appUser) {
      notifyUser('Đăng nhập', 'Vui lòng đăng nhập để đăng ký khóa học.');
      return;
    }
    const courseId = String(course?.id || '').trim();
    if (!courseId) return;
    const res = await enrollCourse(courseId);
    if (res.success) {
      await loadUserData();
      notifyUser('Thành công', 'Đăng ký khóa học thành công!');
    } else {
      notifyUser('Lỗi', res.error || 'Không đăng ký được khóa học.');
    }
  };

  const toCheckoutCourse = (course) => ({
    id: course.id,
    title: course.title,
    priceNum: course.priceNum ?? 0,
    isFree: course.isFree ?? course.priceNum <= 0,
    price: course.price || (course.priceNum > 0 ? `${course.priceNum.toLocaleString('vi-VN')}đ` : 'Miễn phí'),
    image: course.image || course.thumbnail,
  });

  const handleLearningProgressUpdated = (updated) => {
    if (!updated?._id) return;
    setEnrollments((rows) =>
      rows.map((row) =>
        String(row._id) === String(updated._id)
          ? { ...row, ...updated, courseId: row.courseId }
          : row,
      ),
    );
    setLearningEnrollment((row) =>
      row && String(row._id) === String(updated._id)
        ? { ...row, ...updated, courseId: row.courseId }
        : row,
    );
  };

  const openCartPage = () => {
    if (!appUser) {
      notifyUser('Đăng nhập', 'Vui lòng đăng nhập để xem giỏ hàng.');
      return;
    }
    setTabBeforeCart(activeTab === 'cart' ? tabBeforeCart : activeTab);
    refreshCart();
    setActiveTab('cart');
  };

  // Form Đăng Nhập
  const [email, setEmail] = useState(__DEV__ ? 'customer@dev.local' : '');
  const [password, setPassword] = useState(__DEV__ ? 'Dev123456' : '');
  const [apiReachable, setApiReachable] = useState(null); // null | true | false
  const [apiBaseLabel, setApiBaseLabel] = useState('');
  const [authError, setAuthError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  // Form Đăng Ký (Native)
  const [authScreen, setAuthScreen] = useState('login'); // login | register | forgot | reset
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regError, setRegError] = useState('');
  const [registering, setRegistering] = useState(false);
  const [regSuccessMessage, setRegSuccessMessage] = useState('');

  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMailSent, setForgotMailSent] = useState(false);
  const [forgotMailConfigured, setForgotMailConfigured] = useState(false);
  const [forgotMailError, setForgotMailError] = useState('');
  const [devResetToken, setDevResetToken] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetDone, setResetDone] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [showResetPass, setShowResetPass] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const [loggingInGoogle, setLoggingInGoogle] = useState(false);

  // Giỏ hàng & thanh toán
  const [cart, setCart] = useState(null);
  const [cartLoading, setCartLoading] = useState(false);
  const [checkoutMode, setCheckoutMode] = useState('course');
  const [checkoutCourse, setCheckoutCourse] = useState(null);
  const [checkoutBooking, setCheckoutBooking] = useState(null);
  const [learningEnrollment, setLearningEnrollment] = useState(null);
  const [tabBeforeCheckout, setTabBeforeCheckout] = useState('courses');
  const [tabBeforeLearning, setTabBeforeLearning] = useState('courses');
  const [tabBeforeCart, setTabBeforeCart] = useState('courses');
  const [detailCourseId, setDetailCourseId] = useState(null);
  const [tabBeforeCourseDetail, setTabBeforeCourseDetail] = useState('courses');
  const [tabBeforeBooking, setTabBeforeBooking] = useState('mentors');
  const [tabBeforeCvJd, setTabBeforeCvJd] = useState('cv');
  const [addingCourseId, setAddingCourseId] = useState(null);
  const [cartToast, setCartToast] = useState('');
  const [paymentResult, setPaymentResult] = useState(null);
  const cartSummary = calcCartSummary(cart);

  const [showPass, setShowPass] = useState(false);

  // Modal danh sách thông báo
  const [notifModalVisible, setNotifModalVisible] = useState(false);
  const notifBellRef = useRef(null);
  const notifOverlayAnim = useRef(new Animated.Value(0)).current;
  const notifPanelAnim = useRef(new Animated.Value(0)).current;
  const notifClosingRef = useRef(false);
  const NOTIF_PANEL_WIDTH = Math.min(width - 20, 320);
  const [notifAnchor, setNotifAnchor] = useState({
    top: Platform.OS === 'ios' ? 56 : 48,
    right: 12,
    caretRight: 22,
  });

  // Modal Cài đặt (kiểu dropdown thông báo)
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const settingsBtnRef = useRef(null);
  const settingsOverlayAnim = useRef(new Animated.Value(0)).current;
  const settingsPanelAnim = useRef(new Animated.Value(0)).current;
  const settingsClosingRef = useRef(false);
  const SETTINGS_PANEL_WIDTH = Math.min(width - 24, 340);
  const [settingsAnchor, setSettingsAnchor] = useState({
    top: Platform.OS === 'ios' ? 100 : 88,
    right: 12,
    caretRight: 22,
  });
  const [settingsPanelView, setSettingsPanelView] = useState('menu'); // menu | security

  // Bộ lọc tìm kiếm cho Mentors & Courses
  const [searchMentorQuery, setSearchMentorQuery] = useState('');
  const [selectedMentorCategory, setSelectedMentorCategory] = useState('Tất cả');
  const [searchCourseQuery, setSearchCourseQuery] = useState('');
  const [selectedCourseCategory, setSelectedCourseCategory] = useState('Tất cả');
  const [homeSection, setHomeSection] = useState('all');

  // Trạng thái Mô phỏng Phân tích CV
  const [cvFile, setCvFile] = useState(null);
  const [cvFieldPickerVisible, setCvFieldPickerVisible] = useState(false);
  const [analyzingStatus, setAnalyzingStatus] = useState(''); 
  const [analysisProgress, setAnalysisProgress] = useState(0);

  const [bookedMentor, setBookedMentor] = useState(null);

  // Trạng thái Tab con của Trang cá nhân

  // Trạng thái Đổi mật khẩu
  const [changePasswordModalVisible, setChangePasswordModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changePasswordError, setChangePasswordError] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Xóa tài khoản (nhập email + xác nhận 2 bước như web)
  const [deleteAccountModalVisible, setDeleteAccountModalVisible] = useState(false);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('');
  const [deleteAccountError, setDeleteAccountError] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  // Dialog xác nhận sáng (thông báo / đăng xuất)
  const [confirmDialog, setConfirmDialog] = useState(null);
  const closeConfirmDialog = () => setConfirmDialog(null);

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
      if (!appUser?.hasGoogleLogin) {
        if (!currentPassword) {
          setChangePasswordError('Vui lòng nhập mật khẩu hiện tại.');
          setUpdatingPassword(false);
          return;
        }
        body.currentPassword = currentPassword.trim();
      }

      const result = await patchCurrentUser(body);
      if (result.success) {
        showCartToast('Thay đổi mật khẩu thành công!');
        setChangePasswordModalVisible(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setChangePasswordError(result.error || 'Thay đổi mật khẩu thất bại.');
      }
    } catch (e) {
      setChangePasswordError('Không thể kết nối đến máy chủ.');
    }
    setUpdatingPassword(false);
  };

  const handleToggleInAppNotifications = () => {
    const isCurrentlyOn = appUser?.notificationPrefs?.customer?.mentor_feedback !== false;

    const performToggle = async () => {
      if (userToken && apiConnected) {
        try {
          const result = await patchCurrentUser({
            notificationPrefs: {
              customer: {
                interview_reminder: !isCurrentlyOn,
                mentor_feedback: !isCurrentlyOn,
                streak_reminder: !isCurrentlyOn
              }
            }
          });
          if (result.success) {
            showCartToast(`Đã ${!isCurrentlyOn ? 'bật' : 'tắt'} thông báo đẩy`);
            loadUserData();
          } else {
            showCartToast('Không thể cập nhật cấu hình thông báo.');
          }
        } catch (e) {
          showCartToast('Không thể kết nối tới server.');
        }
      }
    };

    setConfirmDialog({
      icon: 'notifications-outline',
      title: 'Thông báo đẩy (In-app)',
      message: `Hiện tại thông báo đang: ${isCurrentlyOn ? 'BẬT' : 'TẮT'}. Bạn có muốn ${isCurrentlyOn ? 'Tắt' : 'Bật'} toàn bộ thông báo đẩy không?`,
      cancelText: 'Hủy',
      confirmText: 'Xác nhận',
      confirmTone: 'primary',
      onConfirm: performToggle,
    });
  };

  const handleRealLogout = async () => {
    const performLogout = async () => {
      try {
        await logoutSession();
        await authContextLogout();
      } catch (e) {}
      clearLocalSession();
      setJustLoggedOut(true);
    };

    setConfirmDialog({
      icon: 'log-out-outline',
      title: 'Đăng xuất',
      message: 'Bạn có chắc chắn muốn đăng xuất khỏi tài khoản không?',
      cancelText: 'Hủy',
      confirmText: 'Đăng xuất',
      confirmTone: 'danger',
      onConfirm: performLogout,
    });
  };

  const openForgotPassword = () => {
    setForgotEmail(email.trim());
    setForgotError('');
    setForgotSent(false);
    setForgotMailSent(false);
    setForgotMailConfigured(false);
    setForgotMailError('');
    setDevResetToken('');
    setAuthScreen('forgot');
  };

  const openResetFromDevLink = () => {
    if (!devResetToken) return;
    setResetToken(devResetToken);
    setResetPassword('');
    setResetConfirmPassword('');
    setResetError('');
    setResetDone(false);
    setAuthScreen('reset');
  };

  const handleForgotPassword = async () => {
    setForgotError('');
    const trimmed = forgotEmail.trim().toLowerCase();
    if (!trimmed) {
      setForgotError('Vui lòng nhập email.');
      return;
    }
    setForgotLoading(true);
    try {
      const result = await requestPasswordReset(trimmed);
      if (!result.success) {
        setForgotError(result.error || 'Không thể gửi yêu cầu. Vui lòng thử lại.');
        return;
      }
      setForgotEmail(trimmed);
      setForgotSent(true);
      setForgotMailSent(Boolean(result.mailSent));
      setForgotMailConfigured(Boolean(result.mailConfigured));
      setForgotMailError(result.mailError || '');
      setDevResetToken(result.resetToken ? String(result.resetToken) : '');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setResetError('');
    if (!resetToken.trim()) {
      setResetError('Mã xác thực không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu lại link mới.');
      return;
    }
    if (!resetPassword || resetPassword.length < 6) {
      setResetError('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }
    if (resetPassword !== resetConfirmPassword) {
      setResetError('Mật khẩu xác nhận không khớp.');
      return;
    }
    setResetLoading(true);
    try {
      const result = await resetPasswordWithToken(resetToken.trim(), resetPassword);
      if (!result.success) {
        setResetError(result.error || 'Có lỗi xảy ra. Vui lòng thử lại sau.');
        return;
      }
      setResetDone(true);
      setPassword('');
    } finally {
      setResetLoading(false);
    }
  };

  const openDeleteAccountModal = () => {
    setDeleteConfirmEmail('');
    setDeleteAccountError('');
    setDeleteAccountModalVisible(true);
  };

  const handleDeleteAccountRequest = () => {
    setDeleteAccountError('');
    const expected = String(appUser?.email || '').trim().toLowerCase();
    const typed = deleteConfirmEmail.trim().toLowerCase();
    if (!expected || typed !== expected) {
      setDeleteAccountError('Nhập đúng email tài khoản để xác nhận.');
      return;
    }
    setDeleteAccountModalVisible(false);
    setConfirmDialog({
      icon: 'trash-outline',
      title: 'Xóa vĩnh viễn?',
      message:
        'Xóa tài khoản, hồ sơ liên quan và phiên đăng nhập. Hành động không thể hoàn tác.',
      cancelText: 'Hủy',
      confirmText: 'Xóa tài khoản',
      confirmTone: 'danger',
      onCancel: () => setDeleteAccountModalVisible(true),
      onConfirm: async () => {
        setDeletingAccount(true);
        try {
          const result = await deleteAccount();
          if (!result.success) {
            setDeleteAccountError(result.error || 'Không xóa được tài khoản.');
            setDeleteAccountModalVisible(true);
            return;
          }
          try {
            await authContextLogout();
          } catch (e) {}
          clearLocalSession();
          setJustLoggedOut(true);
          setAuthScreen('login');
        } finally {
          setDeletingAccount(false);
        }
      },
    });
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
    const catalog = await fetchPublicCatalog();

    if (catalog.success) {
      setMentors(catalog.mentors || []);
      setCourses(catalog.courses || []);
      setApiConnected(true);
    } else {
      setMentors([]);
      setCourses([]);
      setApiConnected(false);
    }
    setLoading(false);
  };

  useEffect(() => {
    const checkSavedSession = async () => {
      const epochAtStart = sessionEpochRef.current;
      try {
        const token = await getAccessToken();
        if (!token) return;
        // Đã login tay trong lúc restore → bỏ qua
        if (epochAtStart !== sessionEpochRef.current) return;

        const base = await ensureApiBase();
        if (epochAtStart !== sessionEpochRef.current) return;
        setApiConnected(Boolean(base));

        const profile = await fetchCurrentUser();
        if (epochAtStart !== sessionEpochRef.current) return;

        if (!profile.success || !profile.user) {
          // Chỉ clear nếu chưa có user mới từ login form
          if (epochAtStart === sessionEpochRef.current) {
            await handleInvalidSession();
          }
          return;
        }

        applyLoggedInUser(profile.user, token);
        void loadData();
        void loadUserData(profile.user.role, profile.user);
      } catch (err) {
        console.warn("Restore saved session exception:", err);
        if (epochAtStart === sessionEpochRef.current) {
          await handleInvalidSession();
        }
      }
    };
    checkSavedSession();
    loadData();

    const handleVnpayReturn = async () => {
      if (Platform.OS !== 'web' || typeof window === 'undefined') return;
      const search = window.location.search || '';
      if (!search.includes('vnp_ResponseCode')) return;
      const params = new URLSearchParams(search);
      const responseCode = params.get('vnp_ResponseCode') || '';
      const pendingType = sessionStorage.getItem('vnpayPendingType') || 'course';
      const details = {
        amount: Math.round(Number(params.get('vnp_Amount') || 0) / 100),
        transactionNo: params.get('vnp_TransactionNo') || '',
        txnRef: params.get('vnp_TxnRef') || '',
        bankCode: params.get('vnp_BankCode') || '',
        payDate: params.get('vnp_PayDate') || '',
        responseCode,
      };
      setPaymentResult({ status: 'processing', message: '', details, type: pendingType });
      try {
        const verify = await verifyVnpayReturn(search.slice(1));
        window.history.replaceState({}, '', window.location.pathname || '/');
        const pendingId = sessionStorage.getItem('vnpayPendingPaymentId');
        sessionStorage.removeItem('vnpayPendingPaymentId');
        sessionStorage.removeItem('vnpayPendingType');
        if (verify.success) {
          await loadUserData();
          setPaymentResult({
            status: 'success',
            message: pendingType === 'booking'
              ? 'Lịch hẹn đã được thanh toán và lưu vào tài khoản.'
              : 'Thanh toán đã được xác nhận và lưu vào tài khoản.',
            details,
            type: pendingType,
          });
          return;
        }
        if (pendingId) {
          const status = await fetchPaymentStatus(pendingId);
          if (status.success && status.payment?.status === 'success') {
            await loadUserData();
            setPaymentResult({
              status: 'success',
              message: pendingType === 'booking'
                ? 'Lịch hẹn đã được thanh toán và lưu vào tài khoản.'
                : 'Thanh toán đã được xác nhận và lưu vào tài khoản.',
              details,
              type: pendingType,
            });
            return;
          }
        }
        if (verify.status === 'failed' || (responseCode && responseCode !== '00')) {
          setPaymentResult({
            status: 'failed',
            message: verify.error || 'VNPay thông báo giao dịch không thành công.',
            details,
            type: pendingType,
          });
          return;
        }
        setPaymentResult({
          status: 'error',
          message: verify.error || 'Không thể xác thực kết quả thanh toán.',
          details,
          type: pendingType,
        });
      } catch (e) {
        console.warn('VNPay return:', e);
        window.history.replaceState({}, '', window.location.pathname || '/');
        setPaymentResult({
          status: 'error',
          message: 'Mất kết nối khi xác nhận giao dịch. Vui lòng kiểm tra lại.',
          details,
          type: pendingType,
        });
      }
    };
    void handleVnpayReturn();

    const handleDeepLink = async (event) => {
      if (event.url) {
        try {
          const url = event.url;
          if (url.includes('vnp_ResponseCode')) {
            const query = url.split('?')[1] || '';
            const params = new URLSearchParams(query);
            const responseCode = params.get('vnp_ResponseCode') || '';
            const details = {
              amount: Math.round(Number(params.get('vnp_Amount') || 0) / 100),
              transactionNo: params.get('vnp_TransactionNo') || '',
              txnRef: params.get('vnp_TxnRef') || '',
              bankCode: params.get('vnp_BankCode') || '',
              payDate: params.get('vnp_PayDate') || '',
              responseCode,
            };
            setPaymentResult({ status: 'processing', message: '', details, type: 'course' });
            const verify = await verifyVnpayReturn(query);
            const paymentId = verify.paymentId;
            const paymentStatus = paymentId ? await fetchPaymentStatus(paymentId) : null;
            const type = paymentStatus?.payment?.type || 'course';
            if (verify.success || paymentStatus?.payment?.status === 'success') {
              await loadUserData();
              setPaymentResult({
                status: 'success',
                message: type === 'booking'
                  ? 'Lịch hẹn đã được thanh toán và lưu vào tài khoản.'
                  : 'Thanh toán đã được xác nhận và lưu vào tài khoản.',
                details,
                type,
              });
              return;
            }
            setPaymentResult({
              status: responseCode && responseCode !== '00' ? 'failed' : 'error',
              message: verify.error || 'Không thể xác thực kết quả thanh toán.',
              details,
              type,
            });
            return;
          }
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
                  ...parsedUser,
                  hasGoogleLogin: true,
                  quota: { ...(parsedUser?.quota || {}) },
                };
                setCurrentUser(fullUserProfile);
                setUserToken(params.token);
                setJustLoggedOut(false);
                loadData();
                loadUserData();
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

  useEffect(() => {
    if (appUser) {
      refreshCart();
    } else {
      setCart(null);
    }
  }, [appUser?.id]);

  const loadUserData = async (roleOverride, knownUser = null) => {
    const role = roleOverride || knownUser?.role || appUser?.role || 'customer';

    if (role === 'admin' || role === 'mentor') {
      await loadRolePortalData(role);
      if (!knownUser) {
        const profile = await fetchCurrentUser();
        if (profile.success && profile.user) {
          setCurrentUser(profile.user);
        }
      }
      return;
    }

    const data = await loadAuthenticatedUserData(knownUser);
    if (data.sessionValid === false) {
      await handleInvalidSession();
      return;
    }
    if (data.user && !knownUser) {
      setCurrentUser(data.user);
    }
    setBookings(data.bookings);
    setEnrollments(data.enrollments || []);
    setPayments(data.payments || []);
    setNotifications(data.notifications);
    setCvAnalyses(data.cvAnalyses);
  };

  const finalizeLogin = async (token, userFromLogin) => {
    // Vào app ngay — không await network sau bước này.
    const user =
      userFromLogin && typeof userFromLogin === 'object'
        ? userFromLogin
        : null;

    if (user) {
      applyLoggedInUser(user, token);
      setLoggingIn(false);
      setLoggingInGoogle(false);
      setApiConnected(Boolean(getApiBaseUrl()));
      void (async () => {
        try {
          const base = getApiBaseUrl() || (await ensureApiBase());
          setApiConnected(Boolean(base));
          void loadData();
          void loadUserData(user.role || 'customer', user);
        } catch (err) {
          console.warn('Post-login data load:', err);
        }
      })();
      return true;
    }

    // Fallback hiếm: login không trả user → lấy /me rồi mới vào.
    try {
      const profile = await fetchCurrentUser();
      if (!profile.success || !profile.user) {
        await handleInvalidSession();
        return false;
      }
      applyLoggedInUser(profile.user, token);
      setApiConnected(Boolean(getApiBaseUrl()));
      void loadData();
      void loadUserData(profile.user.role, profile.user);
      return true;
    } catch (err) {
      console.warn('finalizeLogin fallback:', err);
      return false;
    }
  };

  const handleAuthLogin = async () => {
    setAuthError('');
    const trimmedEmail = String(email || '').trim().toLowerCase();
    const trimmedPassword = String(password || '').trim();
    if (!trimmedEmail || !trimmedPassword) {
      setAuthError('Vui lòng nhập email và mật khẩu.');
      return;
    }

    setLoggingIn(true);

    try {
      // Cùng API với ProInterview web: POST /api/auth/login
      const result = await Promise.race([
        loginWithEmail(trimmedEmail, trimmedPassword),
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              success: false,
              error: 'Đăng nhập quá lâu. Kiểm tra backend port 5001, Wi-Fi và reload Expo.',
            });
          }, 12000);
        }),
      ]);

      if (result.success && result.token) {
        if (result.user && typeof result.user === 'object') {
          applyLoggedInUser(result.user, result.token);
          setAuthError('');
          setLoggingIn(false);
          void finalizeLogin(result.token, result.user);
        } else {
          const ok = await finalizeLogin(result.token, result.user);
          if (!ok) {
            setAuthError('Phiên đăng nhập không hợp lệ. Vui lòng thử lại.');
          }
        }
      } else {
        setAuthError(result.error || 'Email hoặc mật khẩu không đúng.');
      }
    } catch (err) {
      console.warn('handleAuthLogin:', err);
      setAuthError('Không kết nối được backend. Hãy chạy backend cổng 5001 rồi thử lại.');
    } finally {
      setLoggingIn(false);
    }
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

    const result = await registerAccount({
      name: regName.trim(),
      email: regEmail.trim(),
      password: regPassword,
      role: 'customer'
    });

    if (result.success) {
      setRegSuccessMessage(result.message || 'Đăng ký thành công! Hãy đăng nhập.');
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
    } else {
      setRegError(result.error || 'Đăng ký thất bại. Vui lòng thử lại.');
    }

    setRegistering(false);
  };

  const handleGoogleCredential = async (credential) => {
    setAuthError('');
    setLoggingInGoogle(true);
    try {
      const result = await loginWithGoogleCredential(credential);
      if (result.success && result.token) {
        const ok = await finalizeLogin(result.token, result.user);
        if (!ok) {
          setAuthError('Không lấy được thông tin tài khoản sau Google login.');
        }
      } else {
        setAuthError(result.error || 'Đăng nhập Google thất bại.');
      }
    } catch (err) {
      setAuthError('Lỗi kết nối khi đăng nhập Google.');
    } finally {
      setLoggingInGoogle(false);
    }
  };

  const handleWebViewMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data?.type === 'AUTH_SUCCESS' && data.token) {
        void finalizeLogin(data.token);
      }
    } catch (e) {
      console.warn("Lỗi xử lý phản hồi đăng nhập từ WebView:", e);
    }
  };

  const handleBookMentor = (mentor) => {
    setBookedMentor(mentor);
    setTabBeforeBooking(activeTab);
    setActiveTab('mentor_booking');
  };

  const handleMentorBookingConfirm = (bookingDraft) => {
    if (!userToken) {
      notifyUser('Đăng nhập', 'Vui lòng đăng nhập để đặt lịch với mentor.');
      return;
    }
    goToCheckout({ mode: 'booking', booking: bookingDraft, fromTab: 'mentor_booking' });
  };

  // Phân tích CV: JD (màn hình riêng CvJdUploadScreen) hoặc theo ngành (field picker + 1 file)
  const pickCvDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      copyToCacheDirectory: true,
    });
    if (result.canceled) return null;
    return result.assets?.[0] || null;
  };

  const runCvPipeline = async (runner) => {
    try {
      if (!userToken) {
        notifyUser('Đăng nhập', 'Vui lòng đăng nhập để phân tích CV.');
        return;
      }
      setAnalyzingStatus('loading');
      setAnalysisProgress(5);
      const out = await runner((n) => setAnalysisProgress(Math.min(100, Math.max(0, Number(n) || 0))));
      if (!out.success) {
        setAnalyzingStatus('idle');
        setAnalysisProgress(0);
        notifyUser('Phân tích CV', out.error || 'Không phân tích được CV.');
        return;
      }
      setAnalysisProgress(100);
      setAnalyzingStatus('success');
      await loadUserData();
    } catch (error) {
      console.error('Lỗi khi phân tích CV:', error);
      setAnalyzingStatus('idle');
      setAnalysisProgress(0);
      notifyUser('Phân tích CV', 'Có lỗi khi tải hoặc phân tích file.');
    }
  };

  // Phân tích CV theo ngành nghề đã chọn (không cần JD) qua /api/cv/analyze/field rồi lưu MongoDB
  const analyzeCvWithField = async (field) => {
    const resume = await pickCvDocument();
    if (!resume) return;
    const fileSizeInMB = resume.size != null ? (resume.size / (1024 * 1024)).toFixed(2) : '?';
    setCvFile({ name: resume.name, size: `${fileSizeInMB} MB` });
    await runCvPipeline((onProgress) =>
      analyzeAndSaveCv(
        {
          uri: resume.uri,
          name: resume.name || 'cv.pdf',
          mimeType: resume.mimeType || 'application/pdf',
          file: resume.file, // web: File thật từ <input type=file> (RN native không có field này)
        },
        { field, onProgress },
      ),
    );
  };

  const triggerCvAnalysisField = () => {
    if (!userToken) {
      notifyUser('Đăng nhập', 'Vui lòng đăng nhập để phân tích CV.');
      return;
    }
    setCvFieldPickerVisible(true);
  };

  // Mở màn hình tải CV + JD (giống web /cv-analysis/jd) từ nút "Tối ưu CV theo vị trí ứng tuyển"
  const openCvJdUploadScreen = () => {
    if (!userToken) {
      notifyUser('Đăng nhập', 'Vui lòng đăng nhập để phân tích CV.');
      return;
    }
    setTabBeforeCvJd(activeTab === 'cv_jd_upload' ? tabBeforeCvJd : activeTab);
    setActiveTab('cv_jd_upload');
  };

  // Tối ưu CV theo JD thật (CV + file JD đã chọn từ CvJdUploadScreen) qua /api/cv/analyze/suggestions rồi lưu MongoDB
  const runCvJdAnalysis = async (cvPicked, jdPicked) => {
    try {
      const fileSizeInMB = cvPicked.size != null ? (cvPicked.size / (1024 * 1024)).toFixed(2) : '?';
      setCvFile({ name: cvPicked.name, size: `${fileSizeInMB} MB` });
      setAnalyzingStatus('loading');
      setAnalysisProgress(5);

      const out = await analyzeCvAgainstJd(
        {
          uri: cvPicked.uri,
          name: cvPicked.name || 'cv.pdf',
          mimeType: cvPicked.mimeType || 'application/pdf',
          file: cvPicked.file, // web: File thật từ <input type=file>
        },
        {
          uri: jdPicked.uri,
          name: jdPicked.name || 'jd.pdf',
          mimeType: jdPicked.mimeType || 'application/pdf',
          file: jdPicked.file,
        },
        { onProgress: (n) => setAnalysisProgress(Math.min(100, Math.max(0, Number(n) || 0))) },
      );

      if (!out.success) {
        setAnalyzingStatus('idle');
        setAnalysisProgress(0);
        notifyUser('Phân tích CV theo JD', out.error || 'Không phân tích được CV theo JD.');
        return;
      }

      setAnalysisProgress(100);
      setAnalyzingStatus('success');
      await loadUserData();
      setActiveTab('cv');
      if (out.note) {
        notifyUser('Phân tích CV theo JD', out.note);
      }
    } catch (error) {
      console.error('Lỗi khi phân tích CV theo JD:', error);
      setAnalyzingStatus('idle');
      setAnalysisProgress(0);
      notifyUser('Phân tích CV theo JD', 'Có lỗi khi tải hoặc phân tích file.');
    }
  };

  const handleMarkAllRead = async () => {
    if (userToken && apiConnected) {
      try {
        const ok = await markAllNotificationsRead();
        if (ok) {
          setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        }
      } catch (e) {
        // Fallback
      }
    }
  };

  const computeNotifAnchor = (bellX, bellY, bellW, bellH) => {
    const panelRight = 12;
    const panelLeft = width - panelRight - NOTIF_PANEL_WIDTH;
    const bellCenterX = bellX + bellW / 2;
    const caretRight = Math.max(
      16,
      Math.min(NOTIF_PANEL_WIDTH - 16, NOTIF_PANEL_WIDTH - (bellCenterX - panelLeft) - 5),
    );

    return {
      top: bellY + bellH + 10,
      right: panelRight,
      caretRight,
    };
  };

  const runNotifOpenAnimation = () => {
    notifOverlayAnim.setValue(0);
    notifPanelAnim.setValue(0);
    Animated.parallel([
      Animated.timing(notifOverlayAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(notifPanelAnim, {
        toValue: 1,
        friction: 7,
        tension: 90,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const runNotifCloseAnimation = (onDone) => {
    Animated.parallel([
      Animated.timing(notifOverlayAnim, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }),
      Animated.timing(notifPanelAnim, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished && onDone) onDone();
    });
  };

  const openNotifDropdown = () => {
    const showPanel = (anchor) => {
      setNotifAnchor(anchor);
      setNotifModalVisible(true);
    };

    if (notifBellRef.current?.measureInWindow) {
      notifBellRef.current.measureInWindow((bellX, bellY, bellW, bellH) => {
        if (bellW > 0 && bellH > 0) {
          showPanel(computeNotifAnchor(bellX, bellY, bellW, bellH));
          return;
        }
        showPanel({
          top: Platform.OS === 'ios' ? 56 : 48,
          right: 12,
          caretRight: 22,
        });
      });
      return;
    }

    showPanel({
      top: Platform.OS === 'ios' ? 56 : 48,
      right: 12,
      caretRight: 22,
    });
  };

  const closeNotifDropdown = () => {
    if (notifClosingRef.current) return;
    notifClosingRef.current = true;
    runNotifCloseAnimation(() => {
      setNotifModalVisible(false);
      notifClosingRef.current = false;
    });
  };

  const toggleNotifDropdown = () => {
    if (notifModalVisible) {
      closeNotifDropdown();
      return;
    }
    openNotifDropdown();
  };

  useEffect(() => {
    if (!notifModalVisible) return;
    runNotifOpenAnimation();
  }, [notifModalVisible]);

  const computeSettingsAnchor = (btnX, btnY, btnW, btnH) => {
    const panelRight = 12;
    const panelLeft = width - panelRight - SETTINGS_PANEL_WIDTH;
    const btnCenterX = btnX + btnW / 2;
    const caretRight = Math.max(
      16,
      Math.min(SETTINGS_PANEL_WIDTH - 16, SETTINGS_PANEL_WIDTH - (btnCenterX - panelLeft) - 5),
    );
    return {
      top: btnY + btnH + 10,
      right: panelRight,
      caretRight,
    };
  };

  const runSettingsOpenAnimation = () => {
    settingsOverlayAnim.setValue(0);
    settingsPanelAnim.setValue(0);
    Animated.parallel([
      Animated.timing(settingsOverlayAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(settingsPanelAnim, {
        toValue: 1,
        friction: 7,
        tension: 90,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const runSettingsCloseAnimation = (onDone) => {
    Animated.parallel([
      Animated.timing(settingsOverlayAnim, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }),
      Animated.timing(settingsPanelAnim, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished && onDone) onDone();
    });
  };

  const openSettingsModal = () => {
    setSettingsPanelView('menu');

    const showPanel = (anchor) => {
      setSettingsAnchor(anchor);
      setSettingsModalVisible(true);
    };

    if (settingsBtnRef.current?.measureInWindow) {
      settingsBtnRef.current.measureInWindow((x, y, w, h) => {
        if (w > 0 && h > 0) {
          showPanel(computeSettingsAnchor(x, y, w, h));
          return;
        }
        showPanel({
          top: Platform.OS === 'ios' ? 100 : 88,
          right: 12,
          caretRight: 22,
        });
      });
      return;
    }

    showPanel({
      top: Platform.OS === 'ios' ? 100 : 88,
      right: 12,
      caretRight: 22,
    });
  };

  const closeSettingsModal = () => {
    if (settingsClosingRef.current) return;
    settingsClosingRef.current = true;
    runSettingsCloseAnimation(() => {
      setSettingsModalVisible(false);
      setSettingsPanelView('menu');
      settingsClosingRef.current = false;
    });
  };

  useEffect(() => {
    if (!settingsModalVisible) return;
    runSettingsOpenAnimation();
  }, [settingsModalVisible]);

  const unreadNotifCount = notifications.filter(n => !n.isRead).length;

  // SCREEN LOGIN SYSTEM
  const renderLoginScreen = () => (
    <View style={styles.authPageBg}>
      <View
        style={[
          styles.authPageBleed,
          { top: -insets.top, bottom: -insets.bottom },
        ]}
        pointerEvents="none"
      >
        <LinearGradient
          colors={['#f5f0fc', '#efe6fa', '#f7f3fd', '#fdfcff']}
          locations={[0, 0.35, 0.7, 1]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.authBlobTop} />
        <View style={styles.authBlobBottom} />
      </View>

      <KeyboardAvoidingView
        style={styles.authKeyboardWrap}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={authTopPad}
      >
        <ScrollView
          contentContainerStyle={[
            styles.authScrollContainer,
            { paddingTop: authTopPad, paddingBottom: authBottomPad },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
        <View style={styles.authTopBar}>
          <Image source={require('./assets/Logo.png')} style={styles.authLogoImg} resizeMode="contain" />
        </View>

        <View style={[styles.authCardArea, { maxWidth: AUTH_CARD_MAX_WIDTH }]}>
          <Image
            source={require('./assets/mascot-auth-login.png')}
            style={[styles.authMascot, { width: AUTH_MASCOT_SIZE, height: AUTH_MASCOT_SIZE }]}
            resizeMode="contain"
          />

          <View style={styles.authCard}>
            <Text style={styles.authCardTitle}>Đăng nhập</Text>
            <Text style={styles.authCardSubtitle}>
              Cùng tài khoản ProInterview với bản web — đăng nhập bằng email và mật khẩu.
            </Text>
            {__DEV__ ? (
              <Text
                style={{
                  fontSize: 10,
                  color: apiReachable === false ? '#fecaca' : 'rgba(255,255,255,0.75)',
                  marginBottom: 10,
                  lineHeight: 14,
                }}
              >
                {apiReachable === null
                  ? 'Đang kiểm tra backend…'
                  : apiReachable
                    ? `API OK · ${apiBaseLabel}`
                    : `API lỗi · ${apiBaseLabel}\nCùng Wi‑Fi, restart Expo (-c), firewall cổng 5001`}
              </Text>
            ) : null}

            {/* Error */}
            {(authError || authContextError) ? (
              <View style={styles.authErrorBox}>
                <Ionicons name="alert-circle" size={15} color="#fca5a5" style={{ marginRight: 6 }} />
                <Text style={styles.authErrorText}>{authError || authContextError}</Text>
              </View>
            ) : null}

            {/* Email */}
            <Text style={styles.authLabel}>Email</Text>
            <TextInput
              style={styles.authInput}
              placeholder="customer@dev.local"
              placeholderTextColor="#9ca3af"
              value={email}
              onChangeText={(v) => {
                setEmail(v);
                if (authError) setAuthError('');
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="next"
            />

            {/* Password */}
            <View style={styles.authLabelRow}>
              <Text style={styles.authLabel}>Mật khẩu</Text>
              <TouchableOpacity onPress={openForgotPassword} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.authForgot}>Quên mật khẩu?</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.authInputWrap}>
              <TextInput
                style={[styles.authInput, { flex: 1, marginBottom: 0 }]}
                placeholder="••••••••"
                placeholderTextColor="#9ca3af"
                secureTextEntry={!showPass}
                value={password}
                onChangeText={(v) => {
                  setPassword(v);
                  if (authError) setAuthError('');
                }}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="password"
                textContentType="password"
                returnKeyType="done"
                onSubmitEditing={handleAuthLogin}
              />
              <TouchableOpacity style={styles.authEyeBtn} onPress={() => setShowPass(v => !v)}>
                <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            {/* Submit */}
            <TouchableOpacity
              style={styles.authSubmitBtn}
              onPress={handleAuthLogin}
              disabled={loggingIn || loggingInGoogle || authContextLoading}
              activeOpacity={0.88}
            >
              {loggingIn ? (
                <ActivityIndicator color="#0f172a" />
              ) : (
                <Text style={styles.authSubmitBtnText}>Đăng nhập</Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.authDivider}>
              <View style={styles.authDividerLine} />
              <Text style={styles.authDividerText}>hoặc</Text>
              <View style={styles.authDividerLine} />
            </View>

            {/* Google */}
            <GoogleSignInButton
              onCredential={handleGoogleCredential}
              onError={setAuthError}
              disabled={loggingIn || authContextLoading}
              loading={loggingInGoogle || authContextLoading}
            />

            {/* Register link */}
            <View style={styles.authFooterRow}>
              <Text style={styles.authFooterText}>Chưa có tài khoản? </Text>
              <TouchableOpacity onPress={() => setAuthScreen('register')}>
                <Text style={styles.authFooterLink}>Đăng ký ngay</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );

  const renderRegisterScreen = () => (
    <View style={styles.authPageBg}>
      <View
        style={[
          styles.authPageBleed,
          { top: -insets.top, bottom: -insets.bottom },
        ]}
        pointerEvents="none"
      >
        <LinearGradient
          colors={['#f5f0fc', '#efe6fa', '#f7f3fd', '#fdfcff']}
          locations={[0, 0.35, 0.7, 1]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.authBlobTop} />
        <View style={styles.authBlobBottom} />
      </View>

      <KeyboardAvoidingView
        style={styles.authKeyboardWrap}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={authTopPad}
      >
        <ScrollView
          contentContainerStyle={[
            styles.authScrollContainer,
            { paddingTop: authTopPad, paddingBottom: authBottomPad },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
        <View style={styles.authTopBar}>
          <Image source={require('./assets/Logo.png')} style={styles.authLogoImg} resizeMode="contain" />
        </View>

        <View style={[styles.authCardArea, { maxWidth: AUTH_CARD_MAX_WIDTH }]}>
          <Image
            source={require('./assets/mascot-noeyes.png')}
            style={[styles.authMascotSmall, { width: AUTH_MASCOT_SIZE * 0.82, height: AUTH_MASCOT_SIZE * 0.82 }]}
            resizeMode="contain"
          />

          <View style={styles.authCard}>
            <Text style={styles.authCardTitle}>Đăng ký</Text>
            <Text style={styles.authCardSubtitle}>Bắt đầu hành trình phỏng vấn chuyên nghiệp</Text>

            {regError ? (
              <View style={styles.authErrorBox}>
                <Ionicons name="alert-circle" size={15} color="#fca5a5" style={{ marginRight: 6 }} />
                <Text style={styles.authErrorText}>{regError}</Text>
              </View>
            ) : null}

            {regSuccessMessage ? (
              <View style={[styles.authErrorBox, { backgroundColor: 'rgba(147,247,43,0.12)', borderColor: 'rgba(147,247,43,0.3)' }]}>
                <Ionicons name="checkmark-circle" size={15} color="#93f72b" style={{ marginRight: 6 }} />
                <Text style={[styles.authErrorText, { color: '#d4ffb2' }]}>{regSuccessMessage}</Text>
              </View>
            ) : null}

            <Text style={styles.authLabel}>Họ và tên</Text>
            <TextInput
              style={styles.authInput}
              placeholder="Nguyễn Văn A"
              placeholderTextColor="#9ca3af"
              value={regName}
              onChangeText={setRegName}
              autoCapitalize="words"
            />

            <Text style={styles.authLabel}>Email</Text>
            <TextInput
              style={styles.authInput}
              placeholder="email@example.com"
              placeholderTextColor="#9ca3af"
              value={regEmail}
              onChangeText={setRegEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.authLabel}>Mật khẩu</Text>
            <TextInput
              style={styles.authInput}
              placeholder="Tối thiểu 6 ký tự"
              placeholderTextColor="#9ca3af"
              secureTextEntry
              value={regPassword}
              onChangeText={setRegPassword}
              autoCapitalize="none"
            />

            <Text style={styles.authLabel}>Xác nhận mật khẩu</Text>
            <TextInput
              style={styles.authInput}
              placeholder="Nhập lại mật khẩu"
              placeholderTextColor="#9ca3af"
              secureTextEntry
              value={regConfirmPassword}
              onChangeText={setRegConfirmPassword}
              autoCapitalize="none"
            />

            <TouchableOpacity
              style={styles.authSubmitBtn}
              onPress={handleAuthRegister}
              disabled={registering}
              activeOpacity={0.88}
            >
              {registering ? (
                <ActivityIndicator color="#0f172a" />
              ) : (
                <Text style={styles.authSubmitBtnText}>Tạo tài khoản</Text>
              )}
            </TouchableOpacity>

            <View style={styles.authFooterRow}>
              <Text style={styles.authFooterText}>Đã có tài khoản? </Text>
              <TouchableOpacity onPress={() => setAuthScreen('login')}>
                <Text style={styles.authFooterLink}>Đăng nhập ngay</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );

  const renderForgotPasswordScreen = () => (
    <View style={styles.authPageBg}>
      <View
        style={[
          styles.authPageBleed,
          { top: -insets.top, bottom: -insets.bottom },
        ]}
        pointerEvents="none"
      >
        <LinearGradient
          colors={['#f5f0fc', '#efe6fa', '#f7f3fd', '#fdfcff']}
          locations={[0, 0.35, 0.7, 1]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.authBlobTop} />
        <View style={styles.authBlobBottom} />
      </View>

      <KeyboardAvoidingView
        style={styles.authKeyboardWrap}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={authTopPad}
      >
        <ScrollView
          contentContainerStyle={[
            styles.authScrollContainer,
            { paddingTop: authTopPad, paddingBottom: authBottomPad },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <View style={styles.authTopBar}>
            <Image source={require('./assets/Logo.png')} style={styles.authLogoImg} resizeMode="contain" />
          </View>

          <View style={[styles.authCardArea, { maxWidth: AUTH_CARD_MAX_WIDTH }]}>
            <View style={styles.authCard}>
              {forgotSent ? (
                <>
                  <View style={styles.authSuccessIconWrap}>
                    <Ionicons
                      name={forgotMailSent ? 'checkmark-circle' : 'mail-unread-outline'}
                      size={40}
                      color="#8037f4"
                    />
                  </View>
                  <Text style={[styles.authCardTitle, { textAlign: 'center' }]}>
                    {forgotMailSent ? 'Kiểm tra hộp thư' : 'Chưa gửi được email'}
                  </Text>
                  <Text style={[styles.authCardSubtitle, { textAlign: 'center' }]}>
                    {forgotMailSent
                      ? 'Nếu email tồn tại và tài khoản có mật khẩu, bạn sẽ nhận hướng dẫn đặt lại trong vài phút. Nhớ kiểm tra cả hộp thư spam.'
                      : !forgotMailConfigured
                        ? 'Backend chưa cấu hình SMTP (MAIL_USER / MAIL_PASS trong backend/.env), nên không gửi được mail thật.'
                        : forgotMailError ||
                          'Không gửi được mail. Nếu email chưa có trong DB local hoặc là tài khoản Google-only thì cũng không có link reset.'}
                  </Text>
                  {forgotEmail ? (
                    <View style={styles.authEmailChip}>
                      <Ionicons name="mail-outline" size={14} color="#8037f4" />
                      <Text style={styles.authEmailChipText} numberOfLines={1}>{forgotEmail}</Text>
                    </View>
                  ) : null}

                  {devResetToken ? (
                    <View style={styles.authDevResetBox}>
                      <Text style={styles.authDevResetTitle}>
                        {forgotMailSent ? 'Dev — mở link đặt lại' : 'Dev — đặt lại không cần mail'}
                      </Text>
                      <TouchableOpacity onPress={openResetFromDevLink} activeOpacity={0.85}>
                        <Text style={styles.authDevResetLink}>Mở màn đặt lại mật khẩu →</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.authDevResetBox}>
                      <Text style={styles.authDevResetTitle}>Không có link reset</Text>
                      <Text style={[styles.authInfoText, { color: 'rgba(255,255,255,0.85)' }]}>
                        Email chưa có trong MongoDB local, hoặc tài khoản chỉ đăng nhập Google (chưa có mật khẩu). Thử `customer@dev.local` hoặc đăng ký email này trước.
                      </Text>
                    </View>
                  )}

                  <TouchableOpacity
                    style={[styles.authSubmitBtn, { backgroundColor: '#8037f4' }]}
                    onPress={() => setAuthScreen('login')}
                    activeOpacity={0.88}
                  >
                    <Text style={[styles.authSubmitBtnText, { color: '#fff' }]}>Về trang đăng nhập</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.authCardTitle}>Quên mật khẩu</Text>
                  <Text style={styles.authCardSubtitle}>
                    Nhập email đã đăng ký. Nếu tài khoản có mật khẩu, ProInterview sẽ gửi link đặt lại qua email.
                  </Text>

                  {forgotError ? (
                    <View style={styles.authErrorBox}>
                      <Ionicons name="alert-circle" size={15} color="#fca5a5" style={{ marginRight: 6 }} />
                      <Text style={styles.authErrorText}>{forgotError}</Text>
                    </View>
                  ) : null}

                  <Text style={styles.authLabel}>Email</Text>
                  <TextInput
                    style={styles.authInput}
                    placeholder="email@example.com"
                    placeholderTextColor="#9ca3af"
                    value={forgotEmail}
                    onChangeText={setForgotEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                  />

                  <TouchableOpacity
                    style={[styles.authSubmitBtn, { backgroundColor: '#8037f4' }]}
                    onPress={handleForgotPassword}
                    disabled={forgotLoading}
                    activeOpacity={0.88}
                  >
                    {forgotLoading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={[styles.authSubmitBtnText, { color: '#fff' }]}>Gửi link đặt lại</Text>
                    )}
                  </TouchableOpacity>

                  <View style={styles.authInfoBox}>
                    <Ionicons name="information-circle-outline" size={16} color="#8037f4" style={{ marginTop: 1 }} />
                    <Text style={styles.authInfoText}>
                      Nếu bạn đăng nhập bằng Google và chưa đặt mật khẩu, dùng nút Google ở trang đăng nhập hoặc đặt mật khẩu trong Cài đặt.
                    </Text>
                  </View>

                  <View style={styles.authFooterRow}>
                    <Text style={styles.authFooterText}>Nhớ mật khẩu? </Text>
                    <TouchableOpacity onPress={() => setAuthScreen('login')}>
                      <Text style={styles.authFooterLink}>Đăng nhập</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );

  const renderResetPasswordScreen = () => (
    <View style={styles.authPageBg}>
      <View
        style={[
          styles.authPageBleed,
          { top: -insets.top, bottom: -insets.bottom },
        ]}
        pointerEvents="none"
      >
        <LinearGradient
          colors={['#f5f0fc', '#efe6fa', '#f7f3fd', '#fdfcff']}
          locations={[0, 0.35, 0.7, 1]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.authBlobTop} />
        <View style={styles.authBlobBottom} />
      </View>

      <KeyboardAvoidingView
        style={styles.authKeyboardWrap}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={authTopPad}
      >
        <ScrollView
          contentContainerStyle={[
            styles.authScrollContainer,
            { paddingTop: authTopPad, paddingBottom: authBottomPad },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <View style={styles.authTopBar}>
            <Image source={require('./assets/Logo.png')} style={styles.authLogoImg} resizeMode="contain" />
          </View>

          <View style={[styles.authCardArea, { maxWidth: AUTH_CARD_MAX_WIDTH }]}>
            <View style={styles.authCard}>
              {resetDone ? (
                <>
                  <View style={styles.authSuccessIconWrap}>
                    <Ionicons name="checkmark-circle" size={40} color="#8037f4" />
                  </View>
                  <Text style={[styles.authCardTitle, { textAlign: 'center' }]}>Mật khẩu đã được cập nhật</Text>
                  <Text style={[styles.authCardSubtitle, { textAlign: 'center' }]}>
                    Bạn có thể đăng nhập ngay bằng mật khẩu mới.
                  </Text>
                  <TouchableOpacity
                    style={[styles.authSubmitBtn, { backgroundColor: '#8037f4' }]}
                    onPress={() => {
                      setAuthScreen('login');
                      setResetToken('');
                      setResetPassword('');
                      setResetConfirmPassword('');
                      setResetDone(false);
                      setDevResetToken('');
                    }}
                    activeOpacity={0.88}
                  >
                    <Text style={[styles.authSubmitBtnText, { color: '#fff' }]}>Đăng nhập ngay</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.authCardTitle}>Đặt lại mật khẩu</Text>
                  <Text style={styles.authCardSubtitle}>
                    Nhập mật khẩu mới cho tài khoản ProInterview của bạn.
                  </Text>

                  {resetError ? (
                    <View style={styles.authErrorBox}>
                      <Ionicons name="alert-circle" size={15} color="#fca5a5" style={{ marginRight: 6 }} />
                      <Text style={styles.authErrorText}>{resetError}</Text>
                    </View>
                  ) : null}

                  {!resetToken.trim() ? (
                    <View style={styles.authWarnBox}>
                      <Ionicons name="information-circle-outline" size={16} color="#d97706" style={{ marginTop: 1 }} />
                      <Text style={styles.authWarnText}>
                        Bạn cần mở link từ email để có mã xác thực hợp lệ.{' '}
                        <Text style={styles.authFooterLink} onPress={() => setAuthScreen('forgot')}>
                          Yêu cầu link mới
                        </Text>
                      </Text>
                    </View>
                  ) : null}

                  <Text style={styles.authLabel}>Mật khẩu mới</Text>
                  <View style={styles.authInputWrap}>
                    <TextInput
                      style={[styles.authInput, { flex: 1, marginBottom: 0 }]}
                      placeholder="Ít nhất 6 ký tự"
                      placeholderTextColor="#9ca3af"
                      secureTextEntry={!showResetPass}
                      value={resetPassword}
                      onChangeText={setResetPassword}
                      autoCapitalize="none"
                      autoComplete="new-password"
                    />
                    <TouchableOpacity style={styles.authEyeBtn} onPress={() => setShowResetPass((v) => !v)}>
                      <Ionicons name={showResetPass ? 'eye-off-outline' : 'eye-outline'} size={18} color="#9ca3af" />
                    </TouchableOpacity>
                  </View>

                  <Text style={[styles.authLabel, { marginTop: 12 }]}>Xác nhận mật khẩu</Text>
                  <View style={styles.authInputWrap}>
                    <TextInput
                      style={[styles.authInput, { flex: 1, marginBottom: 0 }]}
                      placeholder="Nhập lại mật khẩu"
                      placeholderTextColor="#9ca3af"
                      secureTextEntry={!showResetConfirm}
                      value={resetConfirmPassword}
                      onChangeText={setResetConfirmPassword}
                      autoCapitalize="none"
                      autoComplete="new-password"
                    />
                    <TouchableOpacity style={styles.authEyeBtn} onPress={() => setShowResetConfirm((v) => !v)}>
                      <Ionicons name={showResetConfirm ? 'eye-off-outline' : 'eye-outline'} size={18} color="#9ca3af" />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.authSubmitBtn,
                      { backgroundColor: '#8037f4', marginTop: 14, opacity: !resetToken.trim() || resetLoading ? 0.55 : 1 },
                    ]}
                    onPress={handleResetPassword}
                    disabled={resetLoading || !resetToken.trim()}
                    activeOpacity={0.88}
                  >
                    {resetLoading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={[styles.authSubmitBtnText, { color: '#fff' }]}>Cập nhật mật khẩu</Text>
                    )}
                  </TouchableOpacity>

                  <View style={styles.authFooterRow}>
                    <Text style={styles.authFooterText}>Đã có mật khẩu? </Text>
                    <TouchableOpacity onPress={() => setAuthScreen('login')}>
                      <Text style={styles.authFooterLink}>Đăng nhập</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );

  // 1. MÀN HÌNH CHÍNH (DASHBOARD)
  const renderLegacyHomeTab = () => {
    const parseBookingTime = (booking) => {
      const [day, month, year = new Date().getFullYear()] = String(booking?.date || '').split('/').map(Number);
      const [hour = 0, minute = 0] = String(booking?.timeSlot || '').split(':').map(Number);
      const value = new Date(year, month - 1, day, hour, minute).getTime();
      return Number.isFinite(value) ? value : Number.MAX_SAFE_INTEGER;
    };
    const upcomingDbBooking = bookings
      .filter(
        (booking) =>
          ['confirmed', 'pending'].includes(booking.status)
          && parseBookingTime(booking) > Date.now() - 60 * 60 * 1000,
      )
      .sort((a, b) => parseBookingTime(a) - parseBookingTime(b))[0];
    const paidEnrollments = enrollments.filter(
      (item) => item.paymentStatus === 'paid' || item.paymentStatus == null,
    );
    const continueEnrollment =
      paidEnrollments.find((item) => Number(item.progressPercent) > 0 && Number(item.progressPercent) < 100)
      || paidEnrollments[0];
    const continueCourse = continueEnrollment?.courseId || {};
    const continueProgress = Math.min(100, Math.max(0, Number(continueEnrollment?.progressPercent) || 0));
    const displayMentors = mentors.slice(0, 5);
    const displayCourses = courses.slice(0, 5);

    return (
      <View style={styles.homeScrollWrapper}>
        <HeroAtmosphere />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.homeModernScroll}>
          <LinearGradient
            colors={['rgba(43, 19, 82, 0.98)', 'rgba(15, 10, 31, 0.98)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.homeHeroModern}
          >
            <View style={styles.homeHeroGlow} />
            <View style={styles.topHeaderCompact}>
                <View style={styles.headerWelcomeBox}>
                <Text style={styles.headerWelcomeText}>CHÀO BUỔI TỐI</Text>
                <Text style={styles.headerUserName} numberOfLines={1}>{appUser?.name || 'Bạn học'}</Text>
                </View>
                <View style={styles.headerRightActions}>
                  <TouchableOpacity style={styles.headerIconBtn} onPress={openCartPage}>
                  <Ionicons name="bag-handle-outline" size={19} color="#ffffff" />
                    {cartSummary.count > 0 ? (
                      <View style={styles.unreadNotifBadge}>
                        <Text style={styles.unreadNotifBadgeText}>{cartSummary.count > 9 ? '9+' : cartSummary.count}</Text>
                      </View>
                    ) : null}
                  </TouchableOpacity>
                  <TouchableOpacity ref={notifBellRef} style={styles.headerIconBtn} onPress={toggleNotifDropdown}>
                  <Ionicons name="notifications-outline" size={19} color="#ffffff" />
                    {unreadNotifCount > 0 ? (
                      <View style={styles.unreadNotifBadge}>
                        <Text style={styles.unreadNotifBadgeText}>{unreadNotifCount}</Text>
                      </View>
                    ) : null}
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.avatarProfile} onPress={() => setActiveTab('profile')}>
                    {appUser?.avatar ? (
                      <Image source={{ uri: resolveMediaUrl(appUser.avatar) }} style={styles.avatarImageCompact} />
                    ) : (
                      <Text style={styles.avatarText}>{appUser?.name ? appUser.name.substring(0,2).toUpperCase() : 'VP'}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

            <View style={styles.homeHeroCopy}>
              <View style={styles.homeHeroEyebrow}>
                <View style={styles.homeHeroEyebrowDot} />
                <Text style={styles.homeHeroEyebrowText}>CAREER PERFORMANCE</Text>
              </View>
              <Text style={styles.homeHeroTitle}>
                Nâng cấp sự nghiệp,{'\n'}<Text style={styles.homeHeroTitleAccent}>bắt đầu từ hôm nay.</Text>
              </Text>
              <Text style={styles.homeHeroSubtitle}>Luyện tập có chiến lược cùng mentor và dữ liệu cá nhân hóa.</Text>

              <View style={styles.homeHeroActions}>
                <TouchableOpacity style={styles.homeHeroPrimary} onPress={() => setActiveTab('cv')}>
                  <Text style={styles.homeHeroPrimaryText}>Phân tích CV</Text>
                  <Ionicons name="arrow-forward" size={15} color="#0d1410" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.homeHeroSecondary} onPress={() => setActiveTab('mentors')}>
                  <Ionicons name="people-outline" size={15} color="#ffffff" />
                  <Text style={styles.homeHeroSecondaryText}>Tìm mentor</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.homeStatsRow}>
              <View style={styles.homeStatItem}>
                <Text style={styles.homeStatValue}>{cvAnalyses.length}</Text>
                <Text style={styles.homeStatLabel}>CV đã phân tích</Text>
              </View>
              <View style={styles.homeStatDivider} />
              <View style={styles.homeStatItem}>
                <Text style={styles.homeStatValue}>{bookings.length}</Text>
                <Text style={styles.homeStatLabel}>Buổi luyện tập</Text>
              </View>
              <View style={styles.homeStatDivider} />
              <View style={styles.homeStatItem}>
                <Text style={styles.homeStatValue}>{paidEnrollments.length}</Text>
                <Text style={styles.homeStatLabel}>Khóa sở hữu</Text>
              </View>
            </View>
          </LinearGradient>

          <View style={styles.homeModernSection}>
            <View style={styles.homeSectionHeader}>
              <View>
                <Text style={styles.homeSectionEyebrow}>LỊCH TRÌNH</Text>
                <Text style={styles.homeSectionTitle}>Tiếp theo của bạn</Text>
              </View>
              <View style={styles.homeLiveBadge}>
                <View style={styles.homeLiveDot} />
                <Text style={styles.homeLiveText}>Đồng bộ API</Text>
              </View>
            </View>

            <LinearGradient
              colors={['#19182a', '#11131f']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.homeNextCard}
            >
              <View style={styles.homeNextIcon}>
                <Ionicons name={upcomingDbBooking ? 'calendar' : 'calendar-outline'} size={22} color="#93f72b" />
              </View>
              <View style={styles.homeNextBody}>
                {upcomingDbBooking ? (
                  <>
                    <Text style={styles.homeNextLabel}>BUỔI HẸN SẮP TỚI</Text>
                    <Text style={styles.homeNextTitle}>
                      {upcomingDbBooking.sessionType === 'mock_interview' ? 'Phỏng vấn thử 1-1' : 'Review hồ sơ cùng Mentor'}
                    </Text>
                    <Text style={styles.homeNextMeta}>
                      {upcomingDbBooking.date} · {upcomingDbBooking.timeSlot}
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.homeNextLabel}>CHƯA CÓ LỊCH HẸN</Text>
                    <Text style={styles.homeNextTitle}>Sẵn sàng luyện cùng chuyên gia?</Text>
                    <Text style={styles.homeNextMeta}>Chọn mentor phù hợp và đặt khung giờ của bạn.</Text>
                  </>
                )}
              </View>
              <TouchableOpacity
                style={styles.homeNextAction}
                onPress={() => {
                  if (upcomingDbBooking?.meetingLink) Linking.openURL(upcomingDbBooking.meetingLink);
                  else setActiveTab('mentors');
                }}
              >
                <Ionicons name={upcomingDbBooking?.meetingLink ? 'videocam' : 'arrow-forward'} size={17} color="#0d1410" />
              </TouchableOpacity>
            </LinearGradient>
          </View>

          {continueEnrollment ? (
            <View style={styles.homeModernSection}>
              <View style={styles.homeSectionHeader}>
                <View>
                  <Text style={styles.homeSectionEyebrow}>HỌC TẬP</Text>
                  <Text style={styles.homeSectionTitle}>Tiếp tục hành trình</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.homeLearningCard} onPress={() => openCourseLearning(continueEnrollment)}>
                {continueCourse.image || continueCourse.thumbnail ? (
                  <Image
                    source={{ uri: continueCourse.image || continueCourse.thumbnail }}
                    style={styles.homeLearningImage}
                  />
                ) : (
                  <LinearGradient colors={['#6d28d9', '#312e81']} style={styles.homeLearningImage}>
                    <Ionicons name="school" size={25} color="#fff" />
                  </LinearGradient>
                )}
                <View style={styles.homeLearningBody}>
                  <Text style={styles.homeLearningTitle} numberOfLines={2}>
                    {getCourseDisplayTitle(continueCourse.title || 'Khóa học của bạn')}
                  </Text>
                  <View style={styles.homeLearningProgressHeader}>
                    <Text style={styles.homeLearningProgressLabel}>Tiến độ</Text>
                    <Text style={styles.homeLearningProgressValue}>{continueProgress}%</Text>
                  </View>
                  <View style={styles.homeLearningTrack}>
                    <LinearGradient
                      colors={['#93f72b', '#22c55e']}
                      style={[styles.homeLearningFill, { width: `${continueProgress}%` }]}
                    />
                  </View>
                  <Text style={styles.homeLearningCta}>{continueProgress > 0 ? 'Học tiếp' : 'Bắt đầu học'}  →</Text>
                </View>
              </TouchableOpacity>
            </View>
          ) : null}

          <View style={styles.homeModernSection}>
            <View style={styles.homeSectionHeader}>
              <View>
                <Text style={styles.homeSectionEyebrow}>CHUYÊN GIA</Text>
                <Text style={styles.homeSectionTitle}>Mentor dành cho bạn</Text>
              </View>
              <TouchableOpacity onPress={() => setActiveTab('mentors')}>
                <Text style={styles.homeViewAll}>Xem tất cả</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.homeCarousel}>
              {displayMentors.map((mentor) => (
                <TouchableOpacity key={mentor.id} style={styles.homeMentorCard} onPress={() => handleBookMentor(mentor)}>
                  <View style={styles.homeMentorTop}>
                    {mentor.avatar ? (
                      <Image source={{ uri: resolveMediaUrl(mentor.avatar) || mentorAvatarFallback(mentor.name) }} style={styles.homeMentorAvatar} />
                    ) : (
                      <View style={[styles.homeMentorAvatar, { alignItems: 'center', justifyContent: 'center', backgroundColor: '#e9e0f7' }]}>
                        <Ionicons name="person" size={20} color="#7c6a9a" />
                      </View>
                    )}
                    {mentor.isVerified === true ? (
                      <View style={styles.homeMentorVerified}>
                        <Ionicons name="checkmark" size={9} color="#10131e" />
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.homeMentorName} numberOfLines={1}>{mentor.name}</Text>
                  <Text style={styles.homeMentorRole} numberOfLines={1}>{mentor.role}</Text>
                  <View style={styles.homeMentorBottom}>
                    <View style={styles.homeMentorRating}>
                      <Ionicons name="star" size={11} color="#f4c96b" />
                      <Text style={styles.homeMentorRatingText}>
                        {mentor.rating != null && Number(mentor.rating) > 0
                          ? Number(mentor.rating).toFixed(1)
                          : '—'}
                      </Text>
                    </View>
                    <Text style={styles.homeMentorPrice}>
                      {mentor.price ? `${Math.round(mentor.price / 1000)}K` : 'Liên hệ'}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.homeModernSection}>
            <View style={styles.homeSectionHeader}>
              <View>
                <Text style={styles.homeSectionEyebrow}>HỌC VIỆN</Text>
                <Text style={styles.homeSectionTitle}>Khóa học nổi bật</Text>
              </View>
              <TouchableOpacity onPress={() => setActiveTab('courses')}>
                <Text style={styles.homeViewAll}>Khám phá</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.homeCarousel}>
              {displayCourses.map((course) => (
                <TouchableOpacity
                  key={course.id}
                  style={styles.homeCourseCard}
                  onPress={() => apiConnected ? handleBuyCourseNow(course) : setActiveTab('courses')}
                >
                  {course.image ? (
                    <Image source={{ uri: resolveMediaUrl(course.image) || DEFAULT_COURSE_THUMB }} style={styles.homeCourseImage} />
                  ) : (
                    <View style={[styles.homeCourseImage, { backgroundColor: '#2D1B69' }]} />
                  )}
                  <LinearGradient
                    colors={['transparent', 'rgba(8,6,17,0.96)']}
                    style={styles.homeCourseShade}
                  />
                  <View style={styles.homeCourseBadge}>
                    <Text style={styles.homeCourseBadgeText}>{course.price}</Text>
                  </View>
                  <View style={styles.homeCourseContent}>
                    <Text style={styles.homeCourseTitle} numberOfLines={2}>{course.title}</Text>
                    <View style={styles.homeCourseMeta}>
                      <Text style={styles.homeCourseDuration}>{course.duration || '—'}</Text>
                      <View style={styles.homeMentorRating}>
                        <Ionicons name="star" size={10} color="#f4c96b" />
                        <Text style={styles.homeMentorRatingText}>
                          {course.rating != null && Number(course.rating) > 0
                            ? Number(course.rating).toFixed(1)
                            : '—'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.homeModernSection}>
            <View style={styles.homeSectionHeader}>
              <View>
                <Text style={styles.homeSectionEyebrow}>LỘ TRÌNH</Text>
                <Text style={styles.homeSectionTitle}>Ba bước để tiến xa hơn</Text>
              </View>
            </View>
            <View style={styles.homeJourneyGrid}>
              {[
                { icon: 'document-text-outline', title: 'Hiểu hồ sơ', done: cvAnalyses.length > 0, tab: 'cv' },
                { icon: 'people-outline', title: 'Luyện 1-1', done: bookings.length > 0, tab: 'mentors' },
                { icon: 'school-outline', title: 'Bổ sung kỹ năng', done: paidEnrollments.length > 0, tab: 'courses' },
              ].map((step, index) => (
                <TouchableOpacity key={step.title} style={styles.homeJourneyItem} onPress={() => setActiveTab(step.tab)}>
                  <View style={[styles.homeJourneyIcon, step.done && styles.homeJourneyIconDone]}>
                    <Ionicons name={step.done ? 'checkmark' : step.icon} size={17} color={step.done ? '#0d1410' : '#a78bfa'} />
                  </View>
                  <Text style={styles.homeJourneyNumber}>0{index + 1}</Text>
                  <Text style={styles.homeJourneyTitle}>{step.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.footerMinimalContainer}>
            <Text style={styles.footerMinimalCopyright}>PROINTERVIEW · GROW WITH PURPOSE</Text>
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderEditorialHomeTab = () => {
    const activeBookings = bookings.filter((item) => ['confirmed', 'pending'].includes(item.status));
    const nextBooking = activeBookings[0];
    const ownedEnrollments = enrollments.filter(
      (item) => item.paymentStatus === 'paid' || item.paymentStatus == null,
    );
    const learningEnrollment =
      ownedEnrollments.find((item) => Number(item.progressPercent) > 0 && Number(item.progressPercent) < 100)
      || ownedEnrollments[0];
    const learningCourse = learningEnrollment?.courseId || {};
    const learningProgress = Math.min(100, Math.max(0, Number(learningEnrollment?.progressPercent) || 0));
    const editorialMentors = mentors.slice(0, 4);
    const featuredMentor = editorialMentors[0];
    const editorialCourses = courses.slice(0, 3);

    return (
      <View style={styles.homeScrollWrapper}>
        <HeroAtmosphere />
        <Animated.ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.editorialScroll}
          style={{
            opacity: homeEntrance,
            transform: [{
              translateY: homeEntrance.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }),
            }],
          }}
        >
          <View style={styles.editorialHeader}>
            <TouchableOpacity style={styles.editorialIdentity} onPress={() => setActiveTab('profile')}>
              <View style={styles.editorialAvatar}>
                {appUser?.avatar ? (
                  <Image source={{ uri: resolveMediaUrl(appUser.avatar) }} style={styles.avatarImageCompact} />
                ) : (
                  <Text style={styles.avatarText}>{appUser?.name?.slice(0, 2).toUpperCase() || 'PI'}</Text>
                )}
              </View>
              <View>
                <Text style={styles.editorialHello}>XIN CHÀO</Text>
                <Text style={styles.editorialUserName} numberOfLines={1}>{appUser?.name || 'Bạn học'}</Text>
              </View>
            </TouchableOpacity>
            <View style={styles.editorialHeaderActions}>
              <TouchableOpacity style={styles.editorialHeaderButton} onPress={openCartPage}>
                <Ionicons name="bag-handle-outline" size={18} color="#e8eaf0" />
                {cartSummary.count > 0 ? <View style={styles.editorialAlertDot} /> : null}
              </TouchableOpacity>
              <TouchableOpacity ref={notifBellRef} style={styles.editorialHeaderButton} onPress={toggleNotifDropdown}>
                <Ionicons name="notifications-outline" size={18} color="#e8eaf0" />
                {unreadNotifCount > 0 ? <View style={styles.editorialAlertDot} /> : null}
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.editorialIntro}>
            <Text style={styles.editorialMonogram}>PI</Text>
            <View style={styles.editorialIntroTop}>
              <Text style={styles.editorialKicker}>PROINTERVIEW / CAREER LAB</Text>
              <View style={styles.editorialIssueBadge}>
                <Text style={styles.editorialIssueText}>ISSUE 07</Text>
              </View>
            </View>
            <Text style={styles.editorialHeadline}>Tập đúng.{'\n'}Hiểu sâu. <Text style={styles.editorialHeadlineAccent}>Bứt phá.</Text></Text>
            <View style={styles.editorialIntroBottom}>
              <View style={styles.editorialIntroRule} />
              <Text style={styles.editorialLead}>Một chiến lược rõ ràng, phản hồi thật và người đồng hành phù hợp.</Text>
            </View>
          </View>

          <LinearGradient
            colors={['#5520a5', '#24113f']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.editorialFeature}
          >
            <View style={styles.editorialFeatureOrb} />
            {featuredMentor?.avatar ? (
              <Image source={{ uri: featuredMentor.avatar }} style={styles.editorialFeaturePortrait} />
            ) : null}
            <View style={styles.editorialFeatureMetric}>
              <Text style={styles.editorialFeatureMetricValue}>
                {featuredMentor?.rating != null && Number(featuredMentor.rating) > 0
                  ? Number(featuredMentor.rating).toFixed(1)
                  : '—'}
              </Text>
              <Text style={styles.editorialFeatureMetricLabel}>MENTOR RATING</Text>
            </View>
            <Text style={styles.editorialFeatureVertical}>PRACTICE / PERFORM / PROGRESS</Text>
            <View style={styles.editorialFeatureCopy}>
              <Text style={styles.editorialFeatureTag}>LUYỆN TẬP 1-1</Text>
              <Text style={styles.editorialFeatureTitle}>Đừng đoán mình thiếu gì.{'\n'}Hãy hỏi người đã biết.</Text>
              <TouchableOpacity style={styles.editorialFeatureButton} onPress={() => setActiveTab('mentors')}>
                <Text style={styles.editorialFeatureButtonText}>Chọn mentor</Text>
                <Ionicons name="arrow-up-outline" size={14} color="#0d1410" style={{ transform: [{ rotate: '45deg' }] }} />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          <View style={styles.editorialTicker}>
            {['CV REVIEW', 'MOCK INTERVIEW', 'MENTOR 1-1'].map((item) => (
              <React.Fragment key={item}>
                <Text style={styles.editorialTickerText}>{item}</Text>
                <View style={styles.editorialTickerDot} />
              </React.Fragment>
            ))}
          </View>

          <View style={styles.editorialQuickGrid}>
            <TouchableOpacity style={styles.editorialQuickPrimary} onPress={() => setActiveTab('cv')}>
              <View style={styles.editorialQuickIcon}>
                <Ionicons name="scan-outline" size={20} color="#0d1410" />
              </View>
              <Text style={styles.editorialQuickCount}>{cvAnalyses.length.toString().padStart(2, '0')}</Text>
              <Text style={styles.editorialQuickTitle}>Hiểu rõ{'\n'}CV của bạn</Text>
              <Text style={styles.editorialQuickLink}>Phân tích ngay →</Text>
            </TouchableOpacity>
            <View style={styles.editorialQuickStack}>
              <TouchableOpacity style={styles.editorialQuickSmall} onPress={() => setActiveTab('mentors')}>
                <Ionicons name="people-outline" size={18} color="#a78bfa" />
                <Text style={styles.editorialQuickSmallValue}>{mentors.length}</Text>
                <Text style={styles.editorialQuickSmallLabel}>Mentor xác minh</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.editorialQuickSmall} onPress={() => setActiveTab('courses')}>
                <Ionicons name="library-outline" size={18} color="#93f72b" />
                <Text style={styles.editorialQuickSmallValue}>{ownedEnrollments.length}</Text>
                <Text style={styles.editorialQuickSmallLabel}>Khóa đã sở hữu</Text>
              </TouchableOpacity>
            </View>
          </View>

          {(nextBooking || learningEnrollment) ? (
            <View style={styles.editorialSection}>
              <Text style={styles.editorialSectionIndex}>01</Text>
              <View style={styles.editorialSectionHeadingRow}>
                <Text style={styles.editorialSectionTitle}>Nhịp độ của bạn</Text>
                <View style={styles.editorialSectionLine} />
              </View>

              {nextBooking ? (
                <TouchableOpacity
                  style={styles.editorialActivityRow}
                  onPress={() => {
                    if (nextBooking.meetingLink) {
                      Linking.openURL(nextBooking.meetingLink);
                    } else {
                      setProfileSubTab('history_bookings');
                      setActiveTab('profile');
                    }
                  }}
                >
                  <View style={styles.editorialActivityDate}>
                    <Text style={styles.editorialActivityDay}>{String(nextBooking.date || '').split('/')[0] || '--'}</Text>
                    <Text style={styles.editorialActivityMonth}>THÁNG {String(nextBooking.date || '').split('/')[1] || '--'}</Text>
                  </View>
                  <View style={styles.editorialActivityBody}>
                    <Text style={styles.editorialActivityType}>LỊCH HẸN MENTOR</Text>
                    <Text style={styles.editorialActivityTitle}>Phỏng vấn thử 1-1</Text>
                    <Text style={styles.editorialActivityMeta}>{nextBooking.timeSlot} · {nextBooking.status}</Text>
                  </View>
                  <Ionicons name="arrow-forward" size={18} color="#93f72b" />
                </TouchableOpacity>
              ) : null}

              {learningEnrollment ? (
                <TouchableOpacity style={styles.editorialLearningRow} onPress={() => openCourseLearning(learningEnrollment)}>
                  <View style={styles.editorialLearningTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.editorialActivityType}>ĐANG HỌC</Text>
                      <Text style={styles.editorialActivityTitle} numberOfLines={1}>
                        {getCourseDisplayTitle(learningCourse.title || 'Khóa học của bạn')}
                      </Text>
                    </View>
                    <Text style={styles.editorialLearningPercent}>{learningProgress}%</Text>
                  </View>
                  <View style={styles.editorialLearningTrack}>
                    <LinearGradient
                      colors={['#93f72b', '#22c55e']}
                      style={[styles.editorialLearningFill, { width: `${learningProgress}%` }]}
                    />
                  </View>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}

          {featuredMentor ? (
            <View style={styles.editorialSection}>
              <Text style={styles.editorialSectionIndex}>02</Text>
              <View style={styles.editorialSectionHeadingRow}>
                <Text style={styles.editorialSectionTitle}>Gương mặt được chọn</Text>
                <TouchableOpacity onPress={() => setActiveTab('mentors')}>
                  <Text style={styles.editorialSectionLink}>Tất cả</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.editorialMentorFeature} onPress={() => handleBookMentor(featuredMentor)}>
                {featuredMentor.avatar ? (
                  <Image source={{ uri: featuredMentor.avatar }} style={styles.editorialMentorImage} />
                ) : (
                  <View style={[styles.editorialMentorImage, { backgroundColor: '#2D1B69', alignItems: 'center', justifyContent: 'center' }]}>
                    <Ionicons name="person" size={40} color="#c4b5e0" />
                  </View>
                )}
                <View style={styles.editorialMentorCopy}>
                  <Text style={styles.editorialMentorRole}>{featuredMentor.role}</Text>
                  <Text style={styles.editorialMentorName}>{featuredMentor.name}</Text>
                  <Text style={styles.editorialMentorBio} numberOfLines={3}>
                    {featuredMentor.bio ||
                      [featuredMentor.experience ? `${featuredMentor.experience}+ năm kinh nghiệm` : null, featuredMentor.company]
                        .filter(Boolean)
                        .join(' · ') ||
                      'Mentor ProInterview'}
                  </Text>
                  <View style={styles.editorialMentorFooter}>
                    <Text style={styles.editorialMentorRating}>
                      ★{' '}
                      {featuredMentor.rating != null && Number(featuredMentor.rating) > 0
                        ? Number(featuredMentor.rating).toFixed(1)
                        : '—'}
                    </Text>
                    <View style={styles.editorialRoundArrow}>
                      <Ionicons name="arrow-forward" size={14} color="#0d1410" />
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
              <View style={styles.editorialMentorRail}>
                {editorialMentors.slice(1).map((mentor) => (
                  <TouchableOpacity key={mentor.id} onPress={() => handleBookMentor(mentor)}>
                    {mentor.avatar ? (
                      <Image source={{ uri: resolveMediaUrl(mentor.avatar) || mentorAvatarFallback(mentor.name) }} style={styles.editorialMentorThumb} />
                    ) : (
                      <View style={[styles.editorialMentorThumb, { backgroundColor: '#e9e0f7', alignItems: 'center', justifyContent: 'center' }]}>
                        <Ionicons name="person" size={16} color="#7c6a9a" />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
                <Text style={styles.editorialMentorRailText}>Chạm để xem thêm chuyên gia</Text>
              </View>
            </View>
          ) : null}

          <View style={styles.editorialSection}>
            <Text style={styles.editorialSectionIndex}>03</Text>
            <View style={styles.editorialSectionHeadingRow}>
              <Text style={styles.editorialSectionTitle}>Đọc · học · tiến bộ</Text>
              <TouchableOpacity onPress={() => setActiveTab('courses')}>
                <Text style={styles.editorialSectionLink}>Khám phá</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.editorialCourseList}>
              {editorialCourses.map((course, index) => (
                <TouchableOpacity
                  key={course.id}
                  style={styles.editorialCourseRow}
                  onPress={() => apiConnected ? handleBuyCourseNow(course) : setActiveTab('courses')}
                >
                  <Text style={styles.editorialCourseNumber}>0{index + 1}</Text>
                  {course.image ? (
                    <Image source={{ uri: resolveMediaUrl(course.image) || DEFAULT_COURSE_THUMB }} style={styles.editorialCourseImage} />
                  ) : (
                    <View style={[styles.editorialCourseImage, { backgroundColor: '#2D1B69' }]} />
                  )}
                  <View style={styles.editorialCourseBody}>
                    <Text style={styles.editorialCourseTitle} numberOfLines={2}>{course.title}</Text>
                    <Text style={styles.editorialCourseMeta}>
                      {[
                        course.duration || null,
                        course.rating != null && Number(course.rating) > 0
                          ? `★ ${Number(course.rating).toFixed(1)}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(' · ') || '—'}
                    </Text>
                  </View>
                  <Text style={styles.editorialCoursePrice}>{course.price}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.editorialFooter}>
            <View style={styles.editorialFooterDot} />
            <Text style={styles.editorialFooterText}>PROINTERVIEW · PRACTICE WITH PURPOSE</Text>
          </View>
        </Animated.ScrollView>
      </View>
    );
  };

  const renderHomeTab = () => {
    const homeMentors = mentors.slice(0, 4);
    const homeCourses = courses.slice(0, 4);
    const homeNews = [
      homeCourses[0]
        ? {
            id: `course-${homeCourses[0].id}`,
            tag: 'KHÓA HỌC',
            title: homeCourses[0].title,
            subtitle: homeCourses[0].description
              ? String(homeCourses[0].description).slice(0, 90)
              : homeCourses[0].mentorName
                ? `Mentor: ${homeCourses[0].mentorName}`
                : 'Khóa học từ catalog.',
            image: homeCourses[0].image || homeCourses[0].thumbnail || '',
            action: () => setActiveTab('courses'),
          }
        : null,
      homeMentors[0]
        ? {
            id: `mentor-${homeMentors[0].id}`,
            tag: 'MENTOR',
            title: `${homeMentors[0].name} đang nhận lịch`,
            subtitle: [homeMentors[0].role, homeMentors[0].company].filter(Boolean).join(' · ') || 'Luyện phỏng vấn 1-1.',
            image: homeMentors[0].avatar || '',
            action: () => handleBookMentor(homeMentors[0]),
          }
        : null,
      homeCourses[1]
        ? {
            id: `course-${homeCourses[1].id}`,
            tag: 'KHÓA HỌC',
            title: homeCourses[1].title,
            subtitle: homeCourses[1].mentorName
              ? `Mentor: ${homeCourses[1].mentorName}`
              : 'Khóa học từ catalog.',
            image: homeCourses[1].image || homeCourses[1].thumbnail || '',
            action: () => setActiveTab('courses'),
          }
        : null,
      homeMentors[1]
        ? {
            id: `mentor-${homeMentors[1].id}`,
            tag: 'MENTOR',
            title: `${homeMentors[1].name} sẵn sàng đồng hành`,
            subtitle: [homeMentors[1].role, homeMentors[1].company].filter(Boolean).join(' · ') || 'Luyện phỏng vấn 1-1.',
            image: homeMentors[1].avatar || '',
            action: () => handleBookMentor(homeMentors[1]),
          }
        : null,
    ].filter(Boolean);
    const recommendedJourney = [
      {
        id: 'cv',
        number: '01',
        icon: 'document-text-outline',
        title: 'Tối ưu CV',
        desc: 'Phân tích điểm mạnh, điểm yếu trước khi ứng tuyển.',
        color: '#8037f4',
        action: () => setActiveTab('cv'),
      },
      {
        id: 'courses',
        number: '02',
        icon: 'school-outline',
        title: 'Học kỹ năng',
        desc: 'Bổ sung kiến thức qua khóa học thực chiến.',
        color: '#93f72b',
        action: () => setActiveTab('courses'),
      },
      {
        id: 'mentors',
        number: '03',
        icon: 'people-outline',
        title: 'Đặt Mentor',
        desc: 'Luyện phỏng vấn 1:1 và nhận feedback rõ ràng.',
        color: '#f59e0b',
        action: () => setActiveTab('mentors'),
      },
    ];
    const featureTools = [
      {
        id: 'cv-review',
        icon: 'scan-outline',
        title: 'AI CV Review',
        desc: `${cvAnalyses.length || 0} hồ sơ đã phân tích`,
        action: () => setActiveTab('cv'),
      },
      {
        id: 'course-plan',
        icon: 'library-outline',
        title: 'Lộ trình khóa học',
        desc: `${courses.length} khóa sẵn sàng`,
        action: () => setActiveTab('courses'),
      },
    ];
    const quickStats = [
      { label: 'Mentor', value: mentors.length },
      { label: 'Khóa học', value: courses.length },
      { label: 'CV quota', value: appUser?.quota?.cvAnalysisLimit ?? 2 },
    ];
    const cvPreviewCards = [
      {
        id: 'score',
        icon: 'analytics-outline',
        title: 'Điểm phù hợp JD',
        desc: 'Chấm nhanh kỹ năng, keyword và mức độ khớp vị trí.',
      },
      {
        id: 'fix',
        icon: 'create-outline',
        title: 'Gợi ý chỉnh CV',
        desc: 'Tóm tắt các phần nên sửa để CV rõ và thuyết phục hơn.',
      },
    ];

    return (
      <View style={styles.homeScrollWrapper}>
        <Animated.ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          contentContainerStyle={[
            styles.cleanHomeScrollFit,
            { paddingTop: homeTopPad, paddingBottom: homeBottomPad },
          ]}
          style={[
            styles.homeTabScroll,
            { opacity: homeEntrance },
          ]}
        >
          <Animated.View
            style={{
              transform: [{
                translateY: homeEntrance.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }),
              }],
            }}
          >
          <View style={styles.cleanHomeHeader}>
            <TouchableOpacity style={styles.cleanHomeProfile} onPress={() => setActiveTab('profile')}>
              <View style={styles.cleanHomeAvatar}>
                {appUser?.avatar ? (
                  <Image source={{ uri: resolveMediaUrl(appUser.avatar) }} style={styles.cleanHomeAvatarImage} />
                ) : (
                  <Ionicons name="person" size={20} color="#2D1B69" />
                )}
              </View>
              <View style={styles.cleanHomeProfileText}>
                <Text style={styles.cleanHomeHello}>Xin chào</Text>
                <Text style={styles.cleanHomeName} numberOfLines={1}>{appUser?.name || 'Bạn học'}</Text>
              </View>
            </TouchableOpacity>
            <View style={styles.cleanHomeHeaderActions}>
              <TouchableOpacity style={styles.cleanHomeHeaderIcon} onPress={openCartPage}>
                <Ionicons name="bag-handle-outline" size={20} color="#2D1B69" />
                {cartSummary.count > 0 ? <View style={styles.cleanHomeRedDot} /> : null}
              </TouchableOpacity>
              <View ref={notifBellRef} collapsable={false}>
                <TouchableOpacity style={styles.cleanHomeHeaderIcon} onPress={toggleNotifDropdown}>
                  <Ionicons name="notifications-outline" size={20} color="#2D1B69" />
                  {unreadNotifCount > 0 ? <View style={styles.cleanHomeRedDot} /> : null}
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.cleanHomeSearch}>
            <View style={styles.cleanHomeSearchIcon}>
              <Ionicons name="search" size={16} color="#2D1B69" />
            </View>
            <TextInput
              value={searchMentorQuery}
              onChangeText={setSearchMentorQuery}
              onSubmitEditing={() => setActiveTab('mentors')}
              placeholder="Tìm mentor, kỹ năng, khóa học..."
              placeholderTextColor="#676d7e"
              style={styles.cleanHomeSearchInput}
            />
            {searchMentorQuery ? (
              <TouchableOpacity onPress={() => setSearchMentorQuery('')}>
                <Ionicons name="close-circle" size={17} color="#73798a" />
              </TouchableOpacity>
            ) : null}
          </View>

          {homeNews.length > 0 ? (
            <>
              <View style={styles.cleanNewsHeader}>
                <Text style={styles.cleanNewsHeading}>Tin mới nhất</Text>
                <Text style={styles.cleanNewsCount}>
                  {String(homeNews.length).padStart(2, '0')} mục
                </Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                decelerationRate="fast"
                snapToInterval={HOME_NEWS_CARD_WIDTH + 10}
                contentContainerStyle={styles.cleanNewsRail}
              >
                {homeNews.map((item, index) => (
                  <TouchableOpacity
                    key={item.id}
                    activeOpacity={0.88}
                    style={[
                      styles.cleanNewsCard,
                      { width: HOME_NEWS_CARD_WIDTH, height: HOME_NEWS_HEIGHT },
                    ]}
                    onPress={item.action}
                  >
                    {item.image ? (
                      <Image source={{ uri: item.image }} style={styles.cleanNewsImage} />
                    ) : (
                      <View style={[styles.cleanNewsImage, { backgroundColor: '#2D1B69' }]} />
                    )}
                    <LinearGradient
                      colors={['rgba(8,6,16,0.05)', 'rgba(8,6,16,0.96)']}
                      style={styles.cleanNewsShade}
                    />
                    <View style={styles.cleanNewsIndex}>
                      <Text style={styles.cleanNewsIndexText}>0{index + 1}</Text>
                    </View>
                    <View style={styles.cleanNewsContent}>
                      <View style={styles.cleanNewsTagPill}>
                        <Text style={styles.cleanNewsTag}>{item.tag}</Text>
                      </View>
                      <Text style={styles.cleanNewsTitle} numberOfLines={2}>{item.title}</Text>
                      <Text style={styles.cleanNewsSubtitle} numberOfLines={1}>{item.subtitle}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          ) : null}

          <View style={styles.homeJourneyCard}>
            <View style={styles.homeJourneyHeader}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.homeJourneyEyebrow}>LỘ TRÌNH GỢI Ý</Text>
                <Text style={styles.homeJourneyTitle}>Luồng được khuyên dùng</Text>
              </View>
              <View style={styles.homeJourneySpark}>
                <Ionicons name="flash" size={15} color="#2D1B69" />
              </View>
            </View>
            {recommendedJourney.map((step, stepIndex) => (
              <TouchableOpacity
                key={step.id}
                style={[
                  styles.homeJourneyStep,
                  stepIndex === recommendedJourney.length - 1 && styles.homeJourneyStepLast,
                ]}
                onPress={step.action}
                activeOpacity={0.86}
              >
                <View style={[styles.homeJourneyNumber, { backgroundColor: `${step.color}18` }]}>
                  <Text style={[styles.homeJourneyNumberText, { color: step.color }]}>{step.number}</Text>
                </View>
                <View style={[styles.homeJourneyIcon, { backgroundColor: `${step.color}12` }]}>
                  <Ionicons name={step.icon} size={16} color={step.color} />
                </View>
                <View style={styles.homeJourneyBody}>
                  <Text style={styles.homeJourneyStepTitle}>{step.title}</Text>
                  <Text style={styles.homeJourneyStepDesc} numberOfLines={1}>{step.desc}</Text>
                </View>
                <View style={styles.homeJourneyChevron}>
                  <Ionicons name="chevron-forward" size={14} color="rgba(45,27,105,0.35)" />
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.homeStatsRow}>
            {quickStats.map((stat) => (
              <View key={stat.label} style={styles.homeStatPill}>
                <Text style={styles.homeStatValue}>{stat.value}</Text>
                <Text style={styles.homeStatLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.homeToolsRow}>
            {featureTools.map((tool) => (
              <TouchableOpacity
                key={tool.id}
                style={styles.homeToolCard}
                onPress={tool.action}
                activeOpacity={0.88}
              >
                <View style={styles.homeToolIcon}>
                  <Ionicons name={tool.icon} size={18} color="#2D1B69" />
                </View>
                <Text style={styles.homeToolTitle}>{tool.title}</Text>
                <Text style={styles.homeToolDesc} numberOfLines={2}>{tool.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.cleanHomeTitleBlock}>
            <Text style={styles.cleanHomeTitle}>Khám phá Mentor</Text>
            <Text style={styles.cleanHomeTitleHint}>Mentor, khóa học và CV trong một luồng</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cleanHomeChips}>
            <TouchableOpacity
              style={[styles.cleanHomeChip, homeSection === 'all' && styles.cleanHomeChipActive]}
              onPress={() => setHomeSection('all')}
            >
              <Text style={[styles.cleanHomeChipText, homeSection === 'all' && styles.cleanHomeChipTextActive]}>Tất cả</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.cleanHomeChip, homeSection === 'mentors' && styles.cleanHomeChipActive]}
              onPress={() => setHomeSection('mentors')}
            >
              <Text style={[styles.cleanHomeChipText, homeSection === 'mentors' && styles.cleanHomeChipTextActive]}>Mentor</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.cleanHomeChip, homeSection === 'courses' && styles.cleanHomeChipActive]}
              onPress={() => setHomeSection('courses')}
            >
              <Text style={[styles.cleanHomeChipText, homeSection === 'courses' && styles.cleanHomeChipTextActive]}>Khóa học</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.cleanHomeChip, homeSection === 'cv' && styles.cleanHomeChipActive]}
              onPress={() => setHomeSection('cv')}
            >
              <Text style={[styles.cleanHomeChipText, homeSection === 'cv' && styles.cleanHomeChipTextActive]}>Phân tích CV</Text>
            </TouchableOpacity>
          </ScrollView>

          {(homeSection === 'all' || homeSection === 'mentors') ? (
          <View style={[styles.cleanCardGrid, { columnGap: HOME_GRID_GAP, rowGap: HOME_GRID_GAP }]}>
            {homeMentors.map((mentor) => (
              <TouchableOpacity
                key={mentor.id}
                style={[styles.cleanMentorCard, { width: HOME_MENTOR_CARD_WIDTH }]}
                onPress={() => handleBookMentor(mentor)}
                activeOpacity={0.92}
              >
                <View style={[styles.cleanMentorImageWrap, { height: HOME_MENTOR_CARD_HEIGHT }]}>
                  <Image source={{ uri: resolveMediaUrl(mentor.avatar) || mentorAvatarFallback(mentor.name) }} style={styles.cleanMentorImage} />
                  <LinearGradient
                    colors={['transparent', 'rgba(8, 8, 14, 0.92)']}
                    style={styles.cleanMentorImageFade}
                  />
                  {mentor.price ? (
                    <View style={styles.cleanMentorPriceChip}>
                      <Text style={styles.cleanMentorPriceChipText}>
                        {Math.round(mentor.price / 1000)}K
                      </Text>
                    </View>
                  ) : null}
                  <View style={styles.cleanMentorImageCaption}>
                    <Text style={styles.cleanCardTitle} numberOfLines={1}>{mentor.name}</Text>
                    {mentor.rating ? (
                      <View style={styles.cleanMentorRatingMini}>
                        <Ionicons name="star" size={9} color="#93f72b" />
                        <Text style={styles.cleanMentorRatingMiniText}>
                          {Number(mentor.rating).toFixed(1)}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
          ) : null}

          {homeSection === 'courses' ? (
            <View style={[styles.cleanCardGrid, { columnGap: HOME_GRID_GAP, rowGap: HOME_GRID_GAP }]}>
              {homeCourses.map((course) => (
                <TouchableOpacity
                  key={course.id}
                  style={[styles.homeCoursePreviewCard, { width: HOME_MENTOR_CARD_WIDTH }]}
                  onPress={() => openCourseDetail(course)}
                  activeOpacity={0.9}
                >
                  <Image source={{ uri: resolveMediaUrl(course.image || course.thumbnail) || DEFAULT_COURSE_THUMB }} style={styles.homeCoursePreviewImage} />
                  <Text style={styles.homeCoursePreviewTitle} numberOfLines={2}>{course.title}</Text>
                  <Text style={styles.homeCoursePreviewMeta} numberOfLines={1}>{course.duration || course.category || 'ProInterview'}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

          {homeSection === 'cv' ? (
            <View style={styles.homeCvPreviewWrap}>
              {cvPreviewCards.map((card) => (
                <TouchableOpacity key={card.id} style={styles.homeCvPreviewCard} onPress={() => setActiveTab('cv')} activeOpacity={0.9}>
                  <View style={styles.homeCvPreviewIcon}>
                    <Ionicons name={card.icon} size={18} color="#2D1B69" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.homeCvPreviewTitle}>{card.title}</Text>
                    <Text style={styles.homeCvPreviewDesc}>{card.desc}</Text>
                  </View>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.homeCvPreviewCta} onPress={() => setActiveTab('cv')}>
                <Text style={styles.homeCvPreviewCtaText}>Phân tích CV ngay</Text>
                <Ionicons name="arrow-forward" size={15} color="#2D1B69" />
              </TouchableOpacity>
            </View>
          ) : null}
          </Animated.View>
        </Animated.ScrollView>
      </View>
    );
  };

  // 2. MÀN HÌNH MENTORS
  const renderMentorsTab = () => (
    <MentorsScreen
      mentors={mentors}
      loading={loading}
      searchQuery={searchMentorQuery}
      onSearchChange={setSearchMentorQuery}
      selectedCategory={selectedMentorCategory}
      onCategoryChange={setSelectedMentorCategory}
      onMentorPress={handleBookMentor}
      topInset={shellTopPad}
    />
  );

  // 3. MÀN HÌNH KHÓC HỌC
  const renderCoursesTab = () => {
    const filteredCourses = courses.filter(course => {
      const matchSearch = course.title.toLowerCase().includes(searchCourseQuery.toLowerCase());
      const matchCategory = selectedCourseCategory === 'Tất cả' || course.category === selectedCourseCategory;
      return matchSearch && matchCategory;
    });

    const categorySet = new Set(courses.map((course) => course.category).filter(Boolean));
    const categories = ['Tất cả', ...Array.from(categorySet)];

    return (
      <View style={[styles.tabContentContainer, styles.coursesTabContainer, { paddingTop: shellTopPad }]}>
        <View style={styles.profilePageHeading}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={styles.profilePageEyebrow}>DANH SÁCH KHÓA HỌC</Text>
            <Text style={[styles.tabTitle, styles.profilePageTitle]}>Khóa học</Text>
          </View>
          <TouchableOpacity style={styles.cleanHomeHeaderIcon} onPress={openCartPage}>
            <Ionicons name="cart-outline" size={20} color="#8037f4" />
            {cartSummary.count > 0 ? (
              <View style={styles.unreadNotifBadge}>
                <Text style={styles.unreadNotifBadgeText}>{cartSummary.count > 9 ? '9+' : cartSummary.count}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>

        <View style={styles.coursesSearchBar}>
          <Ionicons name="search" size={18} color="#8a7fa2" style={{ marginRight: 10 }} />
          <TextInput
            style={styles.coursesSearchInput}
            placeholder="Tìm kiếm khóa học..."
            placeholderTextColor="#94a3b8"
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
                  styles.coursesFilterPill, 
                  selectedCourseCategory === cat ? styles.coursesFilterPillActive : null
                ]}
                onPress={() => setSelectedCourseCategory(cat)}
              >
                <Text 
                  style={[
                    styles.coursesFilterPillText, 
                    selectedCourseCategory === cat ? styles.coursesFilterPillTextActive : null
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
            <ActivityIndicator color="#8037f4" size="large" />
            <Text style={styles.loadingText}>Đang tải danh sách khóa học...</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.tabBodyScroll}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.coursesVerticalScroll}
          >
            {filteredCourses.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="sad-outline" size={44} color="#94a3b8" />
                <Text style={styles.emptyText}>Không tìm thấy khóa học phù hợp.</Text>
              </View>
            ) : (
              filteredCourses.map(course => {
                const purchaseState = getCoursePurchaseState(course.id);
                const isOwned = purchaseState === 'owned';
                const thumb =
                  resolveMediaUrl(course.image || course.thumbnail) || DEFAULT_COURSE_THUMB;

                return (
                  <TouchableOpacity
                    key={course.id}
                    style={styles.courseLightCard}
                    activeOpacity={0.92}
                    onPress={() => openCourseDetail(course)}
                  >
                    <Image source={{ uri: thumb }} style={styles.courseLightImage} />
                    <View style={styles.courseLightBody}>
                      <View style={styles.courseLightTitleRow}>
                        <Text style={styles.courseLightTitle} numberOfLines={2}>{course.title}</Text>
                        {isOwned ? (
                          <View style={styles.courseLightOwnedBadge}>
                            <Ionicons name="checkmark-circle" size={13} color="#059669" />
                            <Text style={styles.courseLightOwnedText}>Đã mua</Text>
                          </View>
                        ) : null}
                      </View>
                      {course.mentorName ? (
                        <Text style={styles.courseLightMentor} numberOfLines={1}>
                          {course.mentorName}
                          {course.levelLabel ? ` · ${course.levelLabel}` : ''}
                        </Text>
                      ) : null}
                      <View style={styles.courseLightMetaRow}>
                        <View style={styles.courseMetaIconRow}>
                          <Ionicons name="time-outline" size={14} color="#8a7fa2" />
                          <Text style={styles.courseLightMetaText}>{course.duration || '—'}</Text>
                        </View>
                        <View style={styles.courseMetaIconRow}>
                          <Ionicons name="star" size={14} color="#f59e0b" />
                          <Text style={styles.courseLightMetaText}>
                            {course.rating != null && Number(course.rating) > 0
                              ? `${Number(course.rating).toFixed(1)}`
                              : '—'}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.courseLightFooter}>
                        <Text style={styles.courseLightPrice}>{course.price}</Text>
                        <TouchableOpacity
                          style={styles.courseLightCta}
                          onPress={(event) => {
                            event?.stopPropagation?.();
                            openCourseDetail(course);
                          }}
                          activeOpacity={0.9}
                        >
                          <Text style={styles.courseLightCtaText}>
                            {isOwned ? 'Vào học' : 'Xem khóa học'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        )}
      </View>
    );
  };

  // 4. MÀN HÌNH PHÂN TÍCH CV (GIỐNG WEB /cv-analysis)
  const renderCvTab = () => (
    <View style={[styles.tabContentContainer, styles.cvTabContainer, { paddingTop: shellTopPad }]}>
      <CvAnalysisHubScreen
        analyzingStatus={analyzingStatus}
        analysisProgress={analysisProgress}
        cvFile={cvFile}
        cvAnalyses={cvAnalyses}
        bottomPadding={HOME_NAV_CLEARANCE + 16}
        onAnalyzeJd={openCvJdUploadScreen}
        onAnalyzeField={triggerCvAnalysisField}
      />
    </View>
  );

  // 5. MÀN HÌNH TÀI KHOẢN (ĐỒNG BỘ MONGODB)
  const renderProfileTab = () => {
    const profile = {
      ...(appUser || {}),
      quota: { ...(appUser?.quota || {}) },
    };
    const ownedEnrollments = enrollments.filter(
      (item) => item.paymentStatus === 'paid' || item.paymentStatus == null,
    );
    const paidCourses = ownedEnrollments.length;
    const averageProgress = paidCourses
      ? Math.round(
          ownedEnrollments.reduce(
            (sum, item) => sum + (Number(item.progressPercent) || 0),
            0,
          ) / paidCourses,
        )
      : 0;
    const completedBookings = bookings.filter(
      (item) => item.status === 'completed' || item.status === 'confirmed',
    ).length;
    const successfulPayments = payments.filter((item) => item.status === 'success');
    const totalSpent = successfulPayments.reduce(
      (sum, item) => sum + (Number(item.amount) || 0),
      0,
    );

    return (
      <Animated.View
        style={[
          styles.tabContentContainer,
          { paddingTop: shellTopPad, opacity: profileEntrance },
        ]}
      >
        <View style={styles.profilePageHeading}>
          {profileSubTab !== 'profile' ? (
            <TouchableOpacity
              style={styles.profileHeadingBack}
              onPress={() => setProfileSubTab('profile')}
            >
              <Ionicons name="arrow-back" size={20} color="#2D1B69" />
              <View>
                <Text style={styles.profilePageEyebrow}>
                  {profileSubTab === 'learning'
                    ? 'THƯ VIỆN'
                    : profileSubTab === 'history_payments'
                      ? 'THANH TOÁN'
                      : profileSubTab === 'history_bookings'
                        ? 'LỊCH HẸN'
                        : profileSubTab === 'history_cv'
                          ? 'HỒ SƠ CV'
                          : 'HỒ SƠ'}
                </Text>
                <Text style={[styles.tabTitle, styles.profilePageTitle]}>
                  {profileSubTab === 'learning'
                    ? 'Khóa đã mua'
                    : profileSubTab === 'history_payments'
                      ? 'Lịch sử giao dịch'
                      : profileSubTab === 'history_bookings'
                        ? 'Lịch sử phỏng vấn'
                        : profileSubTab === 'history_cv'
                          ? 'Lịch sử CV'
                          : 'Thông tin cá nhân'}
                </Text>
              </View>
            </TouchableOpacity>
          ) : (
            <View>
              <Text style={styles.profilePageEyebrow}>
                {userRole === 'admin'
                  ? 'QUẢN TRỊ'
                  : userRole === 'mentor'
                    ? 'CỐ VẤN'
                    : 'HỒ SƠ CÁ NHÂN'}
              </Text>
              <Text style={[styles.tabTitle, styles.profilePageTitle]}>Cá nhân</Text>
            </View>
          )}
          {profileSubTab === 'profile' ? (
            <TouchableOpacity
              ref={settingsBtnRef}
              style={styles.profileEditButton}
              onPress={() => {
                if (settingsModalVisible) {
                  closeSettingsModal();
                  return;
                }
                openSettingsModal();
              }}
            >
              <Ionicons name="settings-outline" size={18} color="#8037f4" />
            </TouchableOpacity>
          ) : null}
        </View>

        <Animated.View style={[styles.profileTabBody, { opacity: profileTabEntrance }]}>
        {(profileSubTab === 'profile' || profileSubTab === 'info') && (
          <ProfileScreen
            user={profile}
            mode={profileSubTab === 'info' ? 'edit' : 'hub'}
            ownedCourseCount={userRole === 'customer' ? paidCourses : 0}
            onOpenProfileInfo={() => setProfileSubTab('info')}
            onOpenLearning={
              userRole === 'customer' ? () => setProfileSubTab('learning') : undefined
            }
            onOpenHistoryPayments={
              userRole === 'customer' ? () => setProfileSubTab('history_payments') : undefined
            }
            onOpenHistoryBookings={
              userRole === 'customer' ? () => setProfileSubTab('history_bookings') : undefined
            }
            onOpenHistoryCv={
              userRole === 'customer' ? () => setProfileSubTab('history_cv') : undefined
            }
            onOpenRoleSessions={
              userRole === 'mentor'
                ? () => setActiveTab('mentor_sessions')
                : userRole === 'admin'
                  ? () => setActiveTab('admin_ops')
                  : undefined
            }
            onOpenRoleCourses={
              userRole === 'mentor' ? () => setActiveTab('mentor_courses') : undefined
            }
            onOpenRoleFinance={
              userRole === 'mentor'
                ? () => setActiveTab('mentor_finance')
                : userRole === 'admin'
                  ? () => setActiveTab('admin_finance')
                  : undefined
            }
            onLogout={handleRealLogout}
            onUserUpdated={(updatedUser) => {
              if (updatedUser) setCurrentUser(updatedUser);
            }}
          />
        )}

        {(profileSubTab === 'learning' ||
          profileSubTab === 'history_payments' ||
          profileSubTab === 'history_bookings' ||
          profileSubTab === 'history_cv') && (
            <ScrollView
              style={styles.tabBodyScroll}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: HOME_NAV_CLEARANCE + 16 }}
            >
          {profileSubTab === 'learning' && (
            <View style={styles.learningTab}>
              <LinearGradient
                colors={['#e8ddf5', '#efe6fa', '#f5f0fc']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.learningOverview}
              >
                <View>
                  <Text style={styles.learningOverviewEyebrow}>THƯ VIỆN CỦA BẠN</Text>
                  <Text style={styles.learningOverviewTitle}>{paidCourses} khóa học đã sở hữu</Text>
                  <Text style={styles.learningOverviewSub}>Tiến độ trung bình {averageProgress}%</Text>
                </View>
                <View style={styles.learningRing}>
                  <Text style={styles.learningRingValue}>{averageProgress}%</Text>
                </View>
              </LinearGradient>

              {enrollments.length > 0 ? enrollments.map((enrollment, idx) => {
                const course = enrollment.courseId || {};
                const paid = enrollment.paymentStatus === 'paid' || enrollment.paymentStatus == null;
                const progress = Math.min(100, Math.max(0, Number(enrollment.progressPercent) || 0));
                const purchasedAt = enrollment.paidAt || enrollment.updatedAt || enrollment.createdAt;
                const image =
                  resolveMediaUrl(course.image || course.thumbnail || course.coverImage) ||
                  DEFAULT_COURSE_THUMB;
                return (
                  <View key={enrollment._id || idx} style={styles.ownedCourseCard}>
                    <View style={styles.ownedCourseTop}>
                      <Image source={{ uri: image }} style={styles.ownedCourseImage} />
                      <View style={styles.ownedCourseInfo}>
                        <View style={styles.ownedCourseBadgeRow}>
                          <View style={[
                            styles.ownedCourseStatus,
                            { backgroundColor: paid ? 'rgba(147,247,43,0.12)' : 'rgba(251,191,36,0.12)' },
                          ]}>
                            <View style={[styles.ownedCourseStatusDot, { backgroundColor: paid ? '#93f72b' : '#fbbf24' }]} />
                            <Text style={[styles.ownedCourseStatusText, { color: paid ? '#3f6212' : '#a16207' }]}>
                              {paid ? 'ĐÃ SỞ HỮU' : 'CHỜ THANH TOÁN'}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.ownedCourseTitle} numberOfLines={2}>{getCourseDisplayTitle(course.title)}</Text>
                        <Text style={styles.ownedCourseMeta} numberOfLines={1}>
                          {course.category || 'ProInterview'} · {course.duration || `${course.totalLessons || 0} bài học`}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.ownedCourseProgressHeader}>
                      <Text style={styles.ownedCourseProgressLabel}>Tiến độ học tập</Text>
                      <Text style={styles.ownedCourseProgressValue}>{progress}%</Text>
                    </View>
                    <View style={styles.ownedCourseProgressTrack}>
                      <LinearGradient
                        colors={['#93f72b', '#22c55e']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[styles.ownedCourseProgressFill, { width: `${progress}%` }]}
                      />
                    </View>

                    <View style={styles.ownedCourseFooter}>
                      <View>
                        <Text style={styles.ownedCoursePurchaseLabel}>Ngày mua</Text>
                        <Text style={styles.ownedCoursePurchaseValue}>
                          {purchasedAt ? new Date(purchasedAt).toLocaleDateString('vi-VN') : '—'}
                          {Number(enrollment.pricePaid) > 0
                            ? ` · ${Number(enrollment.pricePaid).toLocaleString('vi-VN')}đ`
                            : ''}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.continueLearningButton, !paid && styles.continueLearningButtonDisabled]}
                        disabled={!paid}
                        onPress={() => openCourseLearning(enrollment)}
                      >
                        <Text style={styles.continueLearningText}>{progress > 0 ? 'Học tiếp' : 'Bắt đầu học'}</Text>
                        <Ionicons name="arrow-forward" size={14} color="#0c081e" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              }) : (
                <View style={styles.learningEmpty}>
                  <View style={styles.learningEmptyIcon}>
                    <Ionicons name="library-outline" size={30} color="#a78bfa" />
                  </View>
                  <Text style={styles.learningEmptyTitle}>Thư viện đang trống</Text>
                  <Text style={styles.learningEmptyText}>Khám phá khóa học phù hợp với lộ trình của bạn.</Text>
                  <TouchableOpacity style={styles.learningExploreButton} onPress={() => setActiveTab('courses')}>
                    <Text style={styles.learningExploreText}>Khám phá khóa học</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {profileSubTab === 'history_payments' && (
            <View style={styles.profileHistoryContent}>
              <View style={styles.historySummaryCard}>
                <View>
                  <Text style={styles.historySummaryLabel}>Tổng chi tiêu thành công</Text>
                  <Text style={styles.historySummaryValue}>{totalSpent.toLocaleString('vi-VN')}đ</Text>
                </View>
                <View style={styles.historySummaryIcon}>
                  <Ionicons name="wallet-outline" size={24} color="#93f72b" />
                </View>
              </View>

              <View style={styles.historySectionHeader}>
                <Text style={styles.cvResultSectionTitle}>Giao dịch gần đây</Text>
                <Text style={styles.historyCount}>{payments.length}</Text>
              </View>
              {payments.length > 0 ? payments.map((payment, idx) => {
                const succeeded = payment.status === 'success';
                const pending = payment.status === 'pending';
                const statusLabel = succeeded ? 'Thành công' : pending ? 'Đang chờ' : 'Thất bại';
                const statusColor = succeeded ? '#93f72b' : pending ? '#fbbf24' : '#fb7185';
                const typeLabel =
                  payment.type === 'course'
                    ? 'Thanh toán khóa học'
                    : payment.type === 'booking'
                      ? 'Thanh toán lịch hẹn'
                      : 'Thanh toán gói thành viên';
                return (
                  <View key={payment.id || idx} style={styles.paymentHistoryRow}>
                    <View style={[styles.historyItemIcon, { backgroundColor: `${statusColor}18` }]}>
                      <Ionicons
                        name={payment.type === 'course' ? 'school-outline' : payment.type === 'booking' ? 'calendar-outline' : 'diamond-outline'}
                        size={18}
                        color={statusColor}
                      />
                    </View>
                    <View style={styles.paymentHistoryMain}>
                      <Text style={styles.paymentHistoryTitle}>{typeLabel}</Text>
                      <Text style={styles.paymentHistoryMeta}>
                        {payment.provider?.toUpperCase()} · {new Date(payment.createdAt).toLocaleDateString('vi-VN')}
                      </Text>
                    </View>
                    <View style={styles.paymentHistoryRight}>
                      <Text style={styles.paymentHistoryAmount}>
                        {(Number(payment.amount) || 0).toLocaleString('vi-VN')}đ
                      </Text>
                      <Text style={[styles.paymentHistoryStatus, { color: statusColor }]}>{statusLabel}</Text>
                    </View>
                  </View>
                );
              }) : (
                <View style={styles.historyEmpty}>
                  <Ionicons name="receipt-outline" size={26} color="#64748b" />
                  <Text style={styles.historyEmptyText}>Chưa có giao dịch</Text>
                </View>
              )}
            </View>
          )}

          {profileSubTab === 'history_bookings' && (
            <View style={styles.profileHistoryContent}>
              <View style={styles.historySectionHeader}>
                <Text style={styles.cvResultSectionTitle}>Lịch hẹn đã đặt</Text>
                <Text style={styles.historyCount}>{bookings.length}</Text>
              </View>
              {bookings.length > 0 ? bookings.map((booking, idx) => (
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
                    <TouchableOpacity
                      style={styles.joinMeetingBtn}
                      onPress={() => {
                        const url = String(booking.meetingLink || '').trim();
                        if (!url) {
                          notifyUser('Phòng họp', 'Chưa có link meeting cho buổi này.');
                          return;
                        }
                        Linking.openURL(url).catch(() => {
                          notifyUser('Phòng họp', 'Không mở được link meeting.');
                        });
                      }}
                    >
                      <Text style={styles.joinMeetingBtnText}>Vào Zoom Meeting</Text>
                    </TouchableOpacity>
                  ) : null}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                    {booking.status !== 'cancelled' && booking.status !== 'completed' ? (
                      <TouchableOpacity
                        style={[styles.joinMeetingBtn, { backgroundColor: '#fee2e2' }]}
                        onPress={() => {
                          setConfirmDialog({
                            icon: 'close-circle-outline',
                            title: 'Hủy lịch hẹn?',
                            message: `Hủy buổi ${booking.date || ''} ${booking.timeSlot || ''} với ${booking.mentorId?.name || 'mentor'}?`,
                            cancelText: 'Không',
                            confirmText: 'Hủy lịch',
                            confirmTone: 'danger',
                            onConfirm: async () => {
                              const id = booking._id || booking.id;
                              const r = await cancelCustomerBooking(id);
                              if (!r.success) {
                                notifyUser('Lỗi', r.error || 'Không hủy được.');
                                return;
                              }
                              notifyUser('Đã hủy', 'Lịch hẹn đã được hủy.');
                              await loadUserData();
                            },
                          });
                        }}
                      >
                        <Text style={[styles.joinMeetingBtnText, { color: '#b91c1c' }]}>Hủy lịch</Text>
                      </TouchableOpacity>
                    ) : null}
                    {booking.status === 'completed' ? (
                      <TouchableOpacity
                        style={[styles.joinMeetingBtn, { backgroundColor: 'rgba(128,55,244,0.12)' }]}
                        onPress={() => {
                          setConfirmDialog({
                            icon: 'star-outline',
                            title: 'Đánh giá buổi mentoring',
                            message: 'Gửi đánh giá 5★ với nhận xét ngắn? (Có thể sửa nhận xét sau trên web.)',
                            cancelText: 'Hủy',
                            confirmText: 'Gửi 5★',
                            onConfirm: async () => {
                              const id = booking._id || booking.id;
                              const r = await createBookingReview(id, {
                                rating: 5,
                                comment: 'Buổi mentoring hữu ích.',
                              });
                              if (!r.success) {
                                notifyUser('Lỗi', r.error || 'Không gửi được đánh giá.');
                                return;
                              }
                              notifyUser('Cảm ơn!', 'Đã gửi đánh giá.');
                              await loadUserData();
                            },
                          });
                        }}
                      >
                        <Text style={[styles.joinMeetingBtnText, { color: '#8037f4' }]}>Đánh giá</Text>
                      </TouchableOpacity>
                    ) : null}
                    {booking.mentorId?._id || booking.mentorId?.id || booking.mentorId ? (
                      <TouchableOpacity
                        style={[styles.joinMeetingBtn, { backgroundColor: 'rgba(245,158,11,0.15)' }]}
                        onPress={() => {
                          const mentorId =
                            booking.mentorId?._id || booking.mentorId?.id || booking.mentorId;
                          setConfirmDialog({
                            icon: 'flag-outline',
                            title: 'Báo cáo mentor?',
                            message: 'Gửi báo cáo về buổi/mentor này tới admin.',
                            cancelText: 'Không',
                            confirmText: 'Gửi báo cáo',
                            confirmTone: 'danger',
                            onConfirm: async () => {
                              const r = await createReport({
                                targetType: 'booking',
                                targetId: String(booking._id || booking.id),
                                reason: 'other',
                                description: `Báo cáo từ mobile về booking với mentor ${booking.mentorId?.name || mentorId}.`,
                              });
                              if (!r.success) {
                                notifyUser('Lỗi', r.error || 'Không gửi được báo cáo.');
                                return;
                              }
                              notifyUser('Đã gửi', 'Admin sẽ xem xét báo cáo của bạn.');
                            },
                          });
                        }}
                      >
                        <Text style={[styles.joinMeetingBtnText, { color: '#b45309' }]}>Báo cáo</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              )) : (
                <View style={styles.historyEmpty}>
                  <Ionicons name="calendar-outline" size={26} color="#64748b" />
                  <Text style={styles.historyEmptyText}>Chưa có lịch hẹn phỏng vấn</Text>
                </View>
              )}
            </View>
          )}

          {profileSubTab === 'history_cv' && (
            <View style={styles.profileHistoryContent}>
              <View style={styles.historySectionHeader}>
                <Text style={styles.cvResultSectionTitle}>CV đã phân tích</Text>
                <Text style={styles.historyCount}>{cvAnalyses.length}</Text>
              </View>
              {cvAnalyses.length > 0 ? cvAnalyses.map((item, idx) => (
                <View key={item._id || idx} style={styles.cvHistoryCard}>
                  <View style={styles.cvHistoryLeft}>
                    <View style={styles.historyItemIcon}>
                      <Ionicons name="document-text-outline" size={18} color="#a78bfa" />
                    </View>
                    <View style={{ marginLeft: 10, flex: 1 }}>
                      <Text style={styles.cvHistoryName} numberOfLines={1}>{item.cvFileName || 'Hồ sơ CV'}</Text>
                      <Text style={styles.cvHistoryDate}>{new Date(item.createdAt).toLocaleDateString('vi-VN')}</Text>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 8 }}>
                    <View style={styles.cvHistoryScore}>
                      <Text style={styles.cvHistoryScoreTxt}>{item.result?.match?.score || 70}%</Text>
                    </View>
                    <TouchableOpacity
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      onPress={() => {
                        const id = item._id || item.id;
                        setConfirmDialog({
                          icon: 'trash-outline',
                          title: 'Xóa phân tích CV?',
                          message: 'Không thể hoàn tác sau khi xóa.',
                          cancelText: 'Không',
                          confirmText: 'Xóa',
                          confirmTone: 'danger',
                          onConfirm: async () => {
                            const r = await deleteCvAnalysis(id);
                            if (!r.success) {
                              notifyUser('Lỗi', r.error || 'Không xóa được.');
                              return;
                            }
                            notifyUser('Đã xóa', 'Đã xóa bản phân tích.');
                            await loadUserData();
                          },
                        });
                      }}
                    >
                      <Ionicons name="trash-outline" size={18} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              )) : (
                <View style={styles.historyEmpty}>
                  <Ionicons name="document-text-outline" size={26} color="#64748b" />
                  <Text style={styles.historyEmptyText}>Chưa có lần phân tích CV nào</Text>
                </View>
              )}
            </View>
          )}
            </ScrollView>
          )}
        </Animated.View>
      </Animated.View>
    );
  };

  const renderRoleBottomNav = () => {
    const goToProfile = () => {
      if (activeTab === 'profile') {
        setProfileSubTab('profile');
        return;
      }
      setActiveTab('profile');
    };
    const inactiveIconColor = '#8a7da8';
    const TabBtn = ({ tab, icon, label, center = false, alsoActiveFor = [] }) => {
      const isActive = activeTab === tab || alsoActiveFor.includes(activeTab);
      return (
        <TouchableOpacity
          style={[styles.navItemFloating, center && styles.navItemCenter]}
          activeOpacity={0.82}
          onPress={() => (tab === 'profile' ? goToProfile() : setActiveTab(tab))}
        >
          <View
            style={[
              styles.navIconWrap,
              isActive && styles.navIconWrapActive,
              center && styles.navCenterOuter,
              center && isActive && styles.navCenterOuterActive,
            ]}
          >
            <View style={center ? styles.navCenterInner : null}>
              <Ionicons
                name={icon}
                size={center ? 24 : 20}
                color={isActive ? '#93f72b' : inactiveIconColor}
              />
            </View>
          </View>
          {!center ? (
            <Text style={[styles.navTextFloating, isActive && styles.navTextFloatingActive]}>{label}</Text>
          ) : null}
        </TouchableOpacity>
      );
    };

    const BottomNavShell = ({ children }) => (
      <View style={styles.bottomNavFloating}>
        <View style={styles.bottomNavBackgroundClip} pointerEvents="none">
          <LinearGradient
            colors={['#f5f0fc', '#efe6fa', '#f5f0fc']}
            locations={[0, 0.5, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.bottomNavShellFill}
          />
          <View style={styles.bottomNavGlassTint} />
        </View>
        {children}
      </View>
    );

    if (userRole === 'admin') {
      return (
        <BottomNavShell>
          <TabBtn tab="admin_ops" icon="construct" label="Vận hành" />
          <TabBtn tab="admin_mentors" icon="school" label="Mentor" />
          <TabBtn tab="admin_home" icon="home" label="Trang chủ" center />
          <TabBtn tab="admin_content" icon="documents" label="Quản lý" />
          <TabBtn tab="profile" icon="person" label="Cá nhân" />
        </BottomNavShell>
      );
    }

    if (userRole === 'mentor') {
      return (
        <BottomNavShell>
          <TabBtn tab="mentor_sessions" icon="calendar" label="Lịch hẹn" />
          <TabBtn tab="mentor_schedule" icon="time" label="Lịch trống" />
          <TabBtn tab="mentor_home" icon="home" label="Trang chủ" center />
          <TabBtn tab="mentor_courses" icon="school" label="Khóa học" />
          <TabBtn tab="profile" icon="person" label="Cá nhân" />
        </BottomNavShell>
      );
    }

    return (
      <BottomNavShell>
        <TabBtn tab="mentors" icon="people" label="Mentors" />
        <TabBtn tab="cv" icon="scan-outline" label="Quét CV" />
        <TabBtn tab="home" icon="home" label="Trang chủ" center />
        <TabBtn tab="courses" icon="school" label="Khóa học" />
        <TabBtn tab="profile" icon="person" label="Cá nhân" />
      </BottomNavShell>
    );
  };

  const renderActiveTab = () => {
    if (userRole === 'admin' || userRole === 'mentor') {
      if (activeTab === 'profile') return renderProfileTab();
      return (
        <RolePortal
          role={userRole}
          activeTab={activeTab}
          data={rolePortalData}
          loading={roleDataLoading}
          user={appUser}
          onNavigate={setActiveTab}
          onRefresh={() => loadRolePortalData(userRole)}
        />
      );
    }

    if (activeTab === 'home') return renderHomeTab();
    if (activeTab === 'mentors') return renderMentorsTab();
    if (activeTab === 'courses') return renderCoursesTab();
    if (activeTab === 'cv') return renderCvTab();
    if (activeTab === 'profile') return renderProfileTab();
    if (activeTab === 'course_detail' && detailCourseId) {
      const detailEnrollment = findEnrollmentForCourse(detailCourseId);
      return (
        <CourseDetailScreen
          courseId={detailCourseId}
          enrollment={detailEnrollment}
          purchaseState={getCoursePurchaseState(detailCourseId)}
          topInset={shellTopPad}
          bottomPadding={HOME_NAV_CLEARANCE + 16}
          onBack={() => {
            setDetailCourseId(null);
            setActiveTab(tabBeforeCourseDetail || 'courses');
          }}
          onContinueLearn={(enrollment) => openCourseLearning(enrollment, 'course_detail')}
          onBuy={(course) => goToCheckout({ mode: 'course', course: toCheckoutCourse(course), fromTab: 'course_detail' })}
          onAddToCart={(course) => handleAddCourseToCart(toCheckoutCourse(course))}
          onFreeEnroll={handleFreeEnroll}
          addingToCart={addingCourseId === detailCourseId}
        />
      );
    }
    if (activeTab === 'course_learning' && learningEnrollment) {
      return (
        <CourseLearningScreen
          enrollment={learningEnrollment}
          onBack={() => setActiveTab(tabBeforeLearning || 'courses')}
          onProgressUpdated={handleLearningProgressUpdated}
        />
      );
    }
    if (activeTab === 'cart') {
      return (
        <CartScreen
          cart={cart}
          loading={cartLoading}
          topInset={shellTopPad}
          bottomPadding={16}
          onBack={() => setActiveTab(tabBeforeCart || 'courses')}
          onRemove={handleRemoveCartItem}
          onUpdateQty={handleUpdateCartQty}
          onCheckout={handleStartCartCheckout}
          onRefresh={refreshCart}
          onContinueShopping={() => setActiveTab('courses')}
        />
      );
    }
    if (activeTab === 'mentor_booking' && bookedMentor) {
      return (
        <MentorBookingScreen
          mentor={bookedMentor}
          onBack={() => {
            setBookedMentor(null);
            setActiveTab(tabBeforeBooking || 'mentors');
          }}
          onConfirm={handleMentorBookingConfirm}
        />
      );
    }
    if (activeTab === 'checkout') {
      return (
        <CheckoutScreen
          mode={checkoutMode}
          course={checkoutCourse}
          booking={checkoutBooking}
          cart={cart}
          onBack={() => setActiveTab(tabBeforeCheckout || 'courses')}
          onSuccess={handlePaymentSuccess}
        />
      );
    }
    if (activeTab === 'cv_jd_upload') {
      return (
        <CvJdUploadScreen
          analyzingStatus={analyzingStatus}
          analysisProgress={analysisProgress}
          onBack={() => setActiveTab(tabBeforeCvJd || 'cv')}
          onSubmit={runCvJdAnalysis}
        />
      );
    }
    return null;
  };

  const renderMainContent = () => (
    <View style={styles.mainTabHost}>
      {renderActiveTab()}
    </View>
  );

  return (
    <View
      key={appUser ? `app-${loginSession?.at || 'restored'}` : `auth-${authRenderTick}`}
      style={[
        styles.rootContainer,
        appUser ? styles.rootContainerLight : styles.rootContainerAuth,
      ]}
    >
      {appUser ? <AppShellBackground /> : null}
      <StatusBar
        barStyle="dark-content"
        translucent
        backgroundColor="transparent"
      />
      
      {paymentResult ? (
        <PaymentResultScreen
          status={paymentResult.status}
          message={paymentResult.message}
          details={paymentResult.details}
          paymentType={paymentResult.type}
          onContinue={() => {
            const nextTab = paymentResult.status === 'success' ? 'profile' : 'home';
            if (paymentResult.status === 'success') {
              setProfileSubTab(paymentResult.type === 'booking' ? 'history_bookings' : 'learning');
            }
            setPaymentResult(null);
            setActiveTab(nextTab);
          }}
          onRetry={() => {
            setPaymentResult(null);
            setActiveTab('courses');
          }}
        />
      ) : appUser == null ? (
        authScreen === 'forgot'
          ? renderForgotPasswordScreen()
          : authScreen === 'reset'
            ? renderResetPasswordScreen()
            : authScreen === 'login'
              ? renderLoginScreen()
              : renderRegisterScreen()
      ) : (
        <View style={styles.appShell}>
          <View style={styles.appShellContent}>
            {renderMainContent()}
          </View>
          {activeTab !== 'checkout' && activeTab !== 'course_learning' && activeTab !== 'course_detail' && activeTab !== 'cart' && activeTab !== 'mentor_booking' && activeTab !== 'cv_jd_upload' ? (
            <View style={styles.bottomNavDock} pointerEvents="box-none">
              {renderRoleBottomNav()}
            </View>
          ) : null}
        </View>
      )}

      {/* DROPDOWN THÔNG BÁO TỪ ICON CHUÔNG (GÓC TRÊN PHẢI) */}
      <Modal visible={notifModalVisible} transparent animationType="none" onRequestClose={closeNotifDropdown}>
        <View style={styles.notifDropdownOverlay}>
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              styles.notifDropdownBackdrop,
              { opacity: notifOverlayAnim },
            ]}
          />
          <Pressable style={StyleSheet.absoluteFill} onPress={closeNotifDropdown} />

          <Animated.View
            style={[
              styles.notifDropdownAnchor,
              {
                top: notifAnchor.top,
                right: notifAnchor.right,
                width: NOTIF_PANEL_WIDTH,
                opacity: notifPanelAnim,
                transform: [
                  {
                    translateY: notifPanelAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-10, 0],
                    }),
                  },
                  {
                    scale: notifPanelAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.94, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={[styles.notifDropdownCaret, { right: notifAnchor.caretRight }]} />
            <View style={styles.notifDropdownPanel}>
              <View style={styles.notifDropdownHeader}>
                <View>
                  <Text style={styles.notifDropdownTitle}>Thông báo</Text>
                  {unreadNotifCount > 0 ? (
                    <Text style={styles.notifDropdownSubtitle}>{unreadNotifCount} chưa đọc</Text>
                  ) : null}
                </View>
                <View style={styles.notifDropdownHeaderActions}>
                  {unreadNotifCount > 0 ? (
                    <TouchableOpacity onPress={handleMarkAllRead} style={styles.notifMarkAllBtn}>
                      <Text style={styles.markAllReadText}>Đọc tất cả</Text>
                    </TouchableOpacity>
                  ) : null}
                  <TouchableOpacity style={styles.notifDropdownCloseBtn} onPress={closeNotifDropdown}>
                    <Ionicons name="close" size={15} color="#2D1B69" />
                  </TouchableOpacity>
                </View>
              </View>

              <ScrollView
                showsVerticalScrollIndicator
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
                style={[
                  styles.notifDropdownScroll,
                  {
                    height: Math.min(
                      height * 0.45,
                      Math.max(
                        notifications.length === 0 ? 110 : 96,
                        notifications.length * 92 + 12,
                      ),
                    ),
                  },
                ]}
                contentContainerStyle={styles.notifsScrollList}
                bounces={false}
              >
                {notifications.length === 0 ? (
                  <View style={styles.emptyNotifs}>
                    <Ionicons name="notifications-off-outline" size={28} color="#64748b" />
                    <Text style={styles.emptyNotifsTxt}>Không có thông báo mới</Text>
                  </View>
                ) : (
                  notifications.map((item, index) => (
                    <TouchableOpacity
                      key={item._id || index}
                      activeOpacity={0.85}
                      onPress={async () => {
                        const id = item._id || item.id;
                        if (!id || item.isRead) return;
                        const r = await markNotificationRead(id);
                        if (r.success) {
                          setNotifications((prev) =>
                            prev.map((n) =>
                              (n._id || n.id) === id ? { ...n, isRead: true } : n,
                            ),
                          );
                        }
                      }}
                      style={[
                        styles.notifItemRow,
                        index < notifications.length - 1 ? styles.notifItemDivider : null,
                        !item.isRead ? styles.notifUnreadRow : null,
                      ]}
                    >
                      <View style={styles.notifBodyTextWrapper}>
                        <View style={styles.notifTitleRow}>
                          <Text style={[styles.notifBodyTitle, !item.isRead ? styles.notifBodyTitleUnread : null]} numberOfLines={1}>
                            {item.title}
                          </Text>
                          {!item.isRead ? <View style={styles.notifUnreadDot} /> : null}
                        </View>
                        <Text style={styles.notifBodyMsg} numberOfLines={2}>{item.body || item.message}</Text>
                        <Text style={styles.notifBodyDate}>{new Date(item.createdAt).toLocaleDateString('vi-VN')}</Text>
                      </View>
                      <TouchableOpacity
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        onPress={async (e) => {
                          e?.stopPropagation?.();
                          const id = item._id || item.id;
                          if (!id) return;
                          const r = await deleteNotification(id);
                          if (!r.success) {
                            notifyUser('Lỗi', r.error || 'Không xóa được thông báo.');
                            return;
                          }
                          setNotifications((prev) => prev.filter((n) => (n._id || n.id) !== id));
                        }}
                      >
                        <Ionicons name="close" size={16} color="#94a3b8" />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* DROPDOWN CÀI ĐẶT (từ icon bánh răng — giống thông báo) */}
      <Modal visible={settingsModalVisible} transparent animationType="none" onRequestClose={closeSettingsModal}>
        <View style={styles.notifDropdownOverlay}>
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              styles.notifDropdownBackdrop,
              { opacity: settingsOverlayAnim },
            ]}
          />
          <Pressable style={StyleSheet.absoluteFill} onPress={closeSettingsModal} />

          <Animated.View
            style={[
              styles.notifDropdownAnchor,
              {
                top: settingsAnchor.top,
                right: settingsAnchor.right,
                width: SETTINGS_PANEL_WIDTH,
                opacity: settingsPanelAnim,
                transform: [
                  {
                    translateY: settingsPanelAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-8, 0],
                    }),
                  },
                  {
                    scale: settingsPanelAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.94, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={[styles.notifDropdownCaret, { right: settingsAnchor.caretRight }]} />
            <View style={styles.settingsDropdownPanel}>
              <View style={styles.settingsDropdownHeader}>
                <View style={styles.settingsHeaderLeft}>
                  {settingsPanelView !== 'menu' ? (
                    <TouchableOpacity
                      style={styles.settingsBackBtn}
                      onPress={() => setSettingsPanelView('menu')}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="arrow-back" size={18} color="#2D1B69" />
                    </TouchableOpacity>
                  ) : null}
                  <View>
                    <Text style={styles.settingsDropdownEyebrow}>CÀI ĐẶT</Text>
                    <Text style={styles.settingsDropdownTitle}>
                      {settingsPanelView === 'security' ? 'Thông báo & bảo mật' : 'Cài đặt'}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.notifDropdownCloseBtn} onPress={closeSettingsModal}>
                  <Ionicons name="close" size={15} color="#2D1B69" />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={settingsPanelView !== 'menu'}
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
                style={styles.settingsDropdownScroll}
                contentContainerStyle={styles.settingsDropdownScrollContent}
                bounces={false}
              >
                {settingsPanelView === 'menu' ? (
                  <View style={styles.settingsOptionsCard}>
                    <TouchableOpacity
                      style={styles.profileOptionRow}
                      onPress={() => {
                        closeSettingsModal();
                        setTimeout(() => {
                          setActiveTab('profile');
                          setProfileSubTab('info');
                        }, 180);
                      }}
                      activeOpacity={0.85}
                    >
                      <View style={styles.profileOptionLeft}>
                        <Ionicons name="person-outline" size={18} color="#8037f4" />
                        <Text style={styles.profileOptionLabel}>Thông tin cá nhân</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="rgba(45,27,105,0.28)" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.profileOptionRow}
                      onPress={() => setSettingsPanelView('security')}
                      activeOpacity={0.85}
                    >
                      <View style={styles.profileOptionLeft}>
                        <Ionicons name="shield-checkmark-outline" size={18} color="#8037f4" />
                        <Text style={styles.profileOptionLabel}>Cài đặt thông báo & bảo mật</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="rgba(45,27,105,0.28)" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.profileOptionRow}
                      onPress={() => {
                        closeSettingsModal();
                        setTimeout(() => openDeleteAccountModal(), 180);
                      }}
                      activeOpacity={0.85}
                    >
                      <View style={styles.profileOptionLeft}>
                        <Ionicons name="trash-outline" size={18} color="#dc2626" />
                        <Text style={[styles.profileOptionLabel, { color: '#dc2626' }]}>Xóa tài khoản</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="rgba(220,38,38,0.45)" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.profileOptionRow, { borderBottomWidth: 0 }]}
                      onPress={() => {
                        closeSettingsModal();
                        setTimeout(() => handleRealLogout(), 180);
                      }}
                      activeOpacity={0.85}
                    >
                      <View style={styles.profileOptionLeft}>
                        <Ionicons name="log-out-outline" size={18} color="#8037f4" />
                        <Text style={styles.profileOptionLabel}>Đăng xuất</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="rgba(45,27,105,0.28)" />
                    </TouchableOpacity>
                  </View>
                ) : null}

                {settingsPanelView === 'security' ? (
                  <View style={styles.settingsOptionsCard}>
                    <TouchableOpacity
                      style={styles.profileOptionRow}
                      onPress={() => {
                        closeSettingsModal();
                        setTimeout(() => handleToggleInAppNotifications(), 180);
                      }}
                      activeOpacity={0.85}
                    >
                      <View style={styles.profileOptionLeft}>
                        <Ionicons name="notifications-outline" size={18} color="#8037f4" />
                        <Text style={styles.profileOptionLabel}>Thông báo đẩy (In-app)</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="rgba(45,27,105,0.28)" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.profileOptionRow, { borderBottomWidth: 0 }]}
                      onPress={() => {
                        closeSettingsModal();
                        setTimeout(() => setChangePasswordModalVisible(true), 180);
                      }}
                      activeOpacity={0.85}
                    >
                      <View style={styles.profileOptionLeft}>
                        <Ionicons name="lock-closed-outline" size={18} color="#8037f4" />
                        <Text style={styles.profileOptionLabel}>Thay đổi mật khẩu</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="rgba(45,27,105,0.28)" />
                    </TouchableOpacity>
                  </View>
                ) : null}
              </ScrollView>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {cartToast ? (
        <View style={styles.cartToast} pointerEvents="none">
          <Ionicons name="checkmark-circle" size={18} color="#93f72b" />
          <Text style={styles.cartToastText}>{cartToast}</Text>
        </View>
      ) : null}

      {/* MODAL THAY ĐỔI MẬT KHẨU — nền sáng đồng bộ */}
      <Modal visible={changePasswordModalVisible} transparent animationType="fade" onRequestClose={() => setChangePasswordModalVisible(false)}>
        <View style={styles.elegantModalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setChangePasswordModalVisible(false)} />
          <View style={styles.elegantSheet}>
            <View style={styles.elegantSheetHandle} />
            <View style={styles.elegantSheetHeader}>
              <View style={styles.elegantIconBadge}>
                <Ionicons name="lock-closed" size={22} color="#2D1B69" />
              </View>
              <Text style={styles.elegantSheetTitle}>Thay đổi mật khẩu</Text>
              <Text style={styles.elegantSheetSubtitle}>
                {appUser?.hasGoogleLogin
                  ? 'Tài khoản Google: Bạn có thể đặt mật khẩu trực tiếp.'
                  : 'Vui lòng nhập mật khẩu hiện tại và mật khẩu mới.'}
              </Text>
            </View>

            {changePasswordError ? (
              <Text style={styles.elegantErrorText}>{changePasswordError}</Text>
            ) : null}

            <View style={styles.elegantFieldGroup}>
              {!appUser?.hasGoogleLogin ? (
                <View>
                  <Text style={styles.elegantFieldLabel}>Mật khẩu hiện tại</Text>
                  <TextInput
                    style={styles.elegantInput}
                    placeholder="Mật khẩu hiện tại"
                    placeholderTextColor="#94a3b8"
                    secureTextEntry
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                  />
                </View>
              ) : null}

              <View>
                <Text style={styles.elegantFieldLabel}>Mật khẩu mới (ít nhất 6 ký tự)</Text>
                <TextInput
                  style={styles.elegantInput}
                  placeholder="Mật khẩu mới"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry
                  value={newPassword}
                  onChangeText={setNewPassword}
                />
              </View>

              <View>
                <Text style={styles.elegantFieldLabel}>Xác nhận mật khẩu mới</Text>
                <TextInput
                  style={styles.elegantInput}
                  placeholder="Xác nhận mật khẩu mới"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
              </View>
            </View>

            <View style={styles.elegantBtnRow}>
              <TouchableOpacity
                style={styles.elegantBtnGhost}
                onPress={() => {
                  setChangePasswordModalVisible(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                  setChangePasswordError('');
                }}
                activeOpacity={0.88}
              >
                <Text style={styles.elegantBtnGhostText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.elegantBtnPrimary}
                onPress={handleChangePassword}
                disabled={updatingPassword}
                activeOpacity={0.88}
              >
                <Text style={styles.elegantBtnPrimaryText}>
                  {updatingPassword ? 'Đang xử lý...' : 'Cập nhật'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL XÓA TÀI KHOẢN — nhập email xác nhận như ProInterview web */}
      <Modal
        visible={deleteAccountModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => !deletingAccount && setDeleteAccountModalVisible(false)}
      >
        <View style={styles.elegantModalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => !deletingAccount && setDeleteAccountModalVisible(false)}
          />
          <View style={styles.elegantSheet}>
            <View style={styles.elegantSheetHandle} />
            <View style={styles.elegantSheetHeader}>
              <View style={[styles.elegantIconBadge, { backgroundColor: 'rgba(220,38,38,0.12)' }]}>
                <Ionicons name="trash" size={22} color="#dc2626" />
              </View>
              <Text style={styles.elegantSheetTitle}>Xóa tài khoản</Text>
              <Text style={styles.elegantSheetSubtitle}>
                Xóa vĩnh viễn tài khoản và dữ liệu liên quan. Nhập email{' '}
                {appUser?.email || 'của bạn'} để xác nhận.
              </Text>
            </View>

            {deleteAccountError ? (
              <Text style={styles.elegantErrorText}>{deleteAccountError}</Text>
            ) : null}

            <View style={styles.elegantFieldGroup}>
              <View>
                <Text style={styles.elegantFieldLabel}>Email xác nhận</Text>
                <TextInput
                  style={styles.elegantInput}
                  placeholder={appUser?.email || 'email@example.com'}
                  placeholderTextColor="#94a3b8"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={deleteConfirmEmail}
                  onChangeText={setDeleteConfirmEmail}
                  editable={!deletingAccount}
                />
              </View>
            </View>

            <View style={styles.elegantBtnRow}>
              <TouchableOpacity
                style={styles.elegantBtnGhost}
                onPress={() => {
                  if (deletingAccount) return;
                  setDeleteAccountModalVisible(false);
                  setDeleteConfirmEmail('');
                  setDeleteAccountError('');
                }}
                activeOpacity={0.88}
              >
                <Text style={styles.elegantBtnGhostText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.elegantBtnPrimary, { backgroundColor: '#dc2626' }]}
                onPress={handleDeleteAccountRequest}
                disabled={deletingAccount}
                activeOpacity={0.88}
              >
                <Text style={[styles.elegantBtnPrimaryText, { color: '#fff' }]}>
                  {deletingAccount ? 'Đang xóa...' : 'Tiếp tục'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Dialog xác nhận sáng (thông báo / đăng xuất) */}
      <Modal
        visible={!!confirmDialog}
        transparent
        animationType="fade"
        onRequestClose={closeConfirmDialog}
      >
        <View style={styles.elegantConfirmOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeConfirmDialog} />
          <View style={styles.elegantConfirmCard}>
            {confirmDialog?.icon ? (
              <View
                style={[
                  styles.elegantConfirmIconWrap,
                  confirmDialog.confirmTone === 'danger' && styles.elegantConfirmIconWrapDanger,
                ]}
              >
                <Ionicons
                  name={confirmDialog.icon}
                  size={22}
                  color={confirmDialog.confirmTone === 'danger' ? '#dc2626' : '#2D1B69'}
                />
              </View>
            ) : null}
            <Text style={styles.elegantConfirmTitle}>{confirmDialog?.title}</Text>
            <Text style={styles.elegantConfirmMessage}>{confirmDialog?.message}</Text>
            <View style={styles.elegantConfirmBtnRow}>
              <TouchableOpacity
                style={styles.elegantConfirmBtnCancel}
                onPress={() => {
                  const cancelAction = confirmDialog?.onCancel;
                  closeConfirmDialog();
                  if (typeof cancelAction === 'function') cancelAction();
                }}
                activeOpacity={0.88}
              >
                <Text style={styles.elegantConfirmBtnCancelText}>
                  {confirmDialog?.cancelText || 'Hủy'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.elegantConfirmBtnOk,
                  confirmDialog?.confirmTone === 'danger' && styles.elegantConfirmBtnDanger,
                ]}
                onPress={() => {
                  const action = confirmDialog?.onConfirm;
                  closeConfirmDialog();
                  if (typeof action === 'function') action();
                }}
                activeOpacity={0.88}
              >
                <Text
                  style={[
                    styles.elegantConfirmBtnOkText,
                    confirmDialog?.confirmTone === 'danger' && styles.elegantConfirmBtnDangerText,
                  ]}
                >
                  {confirmDialog?.confirmText || 'Xác nhận'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={cvFieldPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCvFieldPickerVisible(false)}
      >
        <View style={styles.elegantModalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setCvFieldPickerVisible(false)} />
          <View style={styles.elegantSheet}>
            <View style={styles.elegantSheetHandle} />
            <Text style={styles.elegantSheetTitle}>Chọn ngành nghề</Text>
            <Text style={styles.elegantSheetSubtitle}>
              CV sẽ được phân tích theo ngành bạn chọn (không cần JD).
            </Text>
            {[
              'IT / Công nghệ',
              'Marketing',
              'Kế toán / Tài chính',
              'Nhân sự',
              'Kinh doanh',
              'Thiết kế',
            ].map((field) => (
              <TouchableOpacity
                key={field}
                style={styles.profileOptionRow}
                onPress={() => {
                  setCvFieldPickerVisible(false);
                  analyzeCvWithField(field);
                }}
                activeOpacity={0.88}
              >
                <Text style={styles.profileOptionLabel}>{field}</Text>
                <Ionicons name="chevron-forward" size={16} color="rgba(45,27,105,0.28)" />
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.elegantBtnGhost, { marginTop: 12 }]}
              onPress={() => setCvFieldPickerVisible(false)}
            >
              <Text style={styles.elegantBtnGhostText}>Hủy</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
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
    backgroundColor: PI_SHELL_BG,
    ...Platform.select({
      web: { height: '100vh', maxHeight: '100vh', overflow: 'hidden' },
      default: {},
    }),
  },
  rootContainerAuth: {
    backgroundColor: '#f5f0fc',
  },
  rootContainerLight: {
    backgroundColor: PI_SHELL_BG,
  },
  appShell: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    minHeight: 0,
    ...Platform.select({
      web: { height: '100%', maxHeight: '100%' },
      default: {},
    }),
  },
  appShellContent: {
    flex: 1,
    overflow: 'hidden',
    minHeight: 0,
  },
  mainTabHost: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
  bottomNavDock: Platform.select({
    web: {
      position: 'fixed',
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 1000,
      pointerEvents: 'box-none',
      overflow: 'visible',
    },
    default: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 100,
      elevation: 100,
      pointerEvents: 'box-none',
      overflow: 'visible',
    },
  }),
  homeTabScroll: {
    flex: 1,
    minHeight: 0,
  },
  tabBodyScroll: {
    flex: 1,
    minHeight: 0,
  },
  profileTabBody: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
  tabPageHeader: {
    flexShrink: 0,
  },
  homeScrollWrapper: {
    flex: 1,
    minHeight: 0,
    backgroundColor: 'transparent',
    position: 'relative',
    overflow: 'hidden',
  },
  glowSphere: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    opacity: 0.15,
  },
  homeModernScroll: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 42 : 18,
    paddingBottom: 118,
  },
  homeHeroModern: {
    minHeight: 410,
    borderRadius: 30,
    padding: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(137, 72, 236, 0.32)',
    ...createShadow('#000000', 0, 14, 0.34, 28, 7),
  },
  homeHeroGlow: {
    position: 'absolute',
    width: 210,
    height: 210,
    borderRadius: 105,
    right: -72,
    top: 54,
    backgroundColor: 'rgba(112, 0, 255, 0.18)',
  },
  homeHeroCopy: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: 28,
  },
  homeHeroEyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 11,
  },
  homeHeroEyebrowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#93f72b',
  },
  homeHeroEyebrowText: {
    color: '#b7a0dd',
    fontSize: 9,
    letterSpacing: 1.55,
    fontFamily: 'Manrope_700Bold',
  },
  homeHeroTitle: {
    color: '#ffffff',
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: -0.9,
    fontFamily: 'Manrope_800ExtraBold',
  },
  homeHeroTitleAccent: {
    color: '#93f72b',
  },
  homeHeroSubtitle: {
    maxWidth: 315,
    color: '#aba6ba',
    fontSize: 12,
    lineHeight: 19,
    marginTop: 10,
    fontFamily: 'Manrope_400Regular',
  },
  homeHeroActions: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 21,
  },
  homeHeroPrimary: {
    height: 43,
    borderRadius: 15,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#93f72b',
  },
  homeHeroPrimaryText: {
    color: '#0d1410',
    fontSize: 11,
    fontFamily: 'Manrope_700Bold',
  },
  homeHeroSecondary: {
    height: 43,
    borderRadius: 15,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: 'rgba(255,255,255,0.055)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  homeHeroSecondaryText: {
    color: '#ffffff',
    fontSize: 11,
    fontFamily: 'Manrope_600SemiBold',
  },
  homeStatsRow: {
    height: 66,
    borderRadius: 19,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(5, 5, 12, 0.34)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    paddingHorizontal: 7,
  },
  homeStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  homeStatValue: {
    color: '#ffffff',
    fontSize: 17,
    fontFamily: 'Manrope_800ExtraBold',
  },
  homeStatLabel: {
    color: '#8e899b',
    fontSize: 8,
    marginTop: 2,
    fontFamily: 'Manrope_500Medium',
  },
  homeStatDivider: {
    width: 1,
    height: 27,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  homeModernSection: {
    marginTop: 28,
  },
  homeSectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 13,
  },
  homeSectionEyebrow: {
    color: '#7f8496',
    fontSize: 8,
    letterSpacing: 1.45,
    marginBottom: 4,
    fontFamily: 'Manrope_700Bold',
  },
  homeSectionTitle: {
    color: '#ffffff',
    fontSize: 18,
    letterSpacing: -0.35,
    fontFamily: 'Manrope_700Bold',
  },
  homeViewAll: {
    color: '#93f72b',
    fontSize: 10,
    fontFamily: 'Manrope_600SemiBold',
  },
  homeLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(147,247,43,0.07)',
  },
  homeLiveDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#71d99d',
  },
  homeLiveText: {
    color: '#8da39a',
    fontSize: 8,
    fontFamily: 'Manrope_600SemiBold',
  },
  homeNextCard: {
    minHeight: 112,
    borderRadius: 23,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderWidth: 1,
    borderColor: 'rgba(112,0,255,0.25)',
  },
  homeNextIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(147,247,43,0.09)',
  },
  homeNextBody: {
    flex: 1,
    paddingHorizontal: 12,
  },
  homeNextLabel: {
    color: '#93f72b',
    fontSize: 7,
    letterSpacing: 1,
    marginBottom: 4,
    fontFamily: 'Manrope_700Bold',
  },
  homeNextTitle: {
    color: '#f7f7fa',
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'Manrope_700Bold',
  },
  homeNextMeta: {
    color: '#858a9d',
    fontSize: 9,
    lineHeight: 14,
    marginTop: 3,
    fontFamily: 'Manrope_500Medium',
  },
  homeNextAction: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#93f72b',
  },
  homeLearningCard: {
    minHeight: 122,
    borderRadius: 23,
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#151624',
    borderWidth: 1,
    borderColor: 'rgba(112,0,255,0.22)',
  },
  homeLearningImage: {
    width: 96,
    height: 96,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeLearningBody: {
    flex: 1,
    paddingLeft: 13,
    justifyContent: 'center',
  },
  homeLearningTitle: {
    color: '#ffffff',
    fontSize: 12,
    lineHeight: 17,
    fontFamily: 'Manrope_700Bold',
  },
  homeLearningProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 5,
  },
  homeLearningProgressLabel: {
    color: '#777d90',
    fontSize: 8,
    fontFamily: 'Manrope_500Medium',
  },
  homeLearningProgressValue: {
    color: '#93f72b',
    fontSize: 8,
    fontFamily: 'Manrope_700Bold',
  },
  homeLearningTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  homeLearningFill: {
    height: '100%',
    borderRadius: 2,
  },
  homeLearningCta: {
    color: '#b9a6df',
    fontSize: 9,
    marginTop: 8,
    fontFamily: 'Manrope_600SemiBold',
  },
  homeCarousel: {
    gap: 11,
    paddingRight: 15,
  },
  homeMentorCard: {
    width: 142,
    minHeight: 174,
    borderRadius: 22,
    padding: 13,
    backgroundColor: '#151624',
    borderWidth: 1,
    borderColor: 'rgba(112,0,255,0.22)',
  },
  homeMentorTop: {
    alignSelf: 'flex-start',
    position: 'relative',
    marginBottom: 10,
  },
  homeMentorAvatar: {
    width: 52,
    height: 52,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(112,0,255,0.65)',
  },
  homeMentorVerified: {
    position: 'absolute',
    right: -3,
    bottom: -3,
    width: 17,
    height: 17,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#93f72b',
    borderWidth: 2,
    borderColor: '#151624',
  },
  homeMentorName: {
    color: '#ffffff',
    fontSize: 12,
    fontFamily: 'Manrope_700Bold',
  },
  homeMentorRole: {
    color: '#818698',
    fontSize: 9,
    marginTop: 3,
    fontFamily: 'Manrope_500Medium',
  },
  homeMentorBottom: {
    marginTop: 'auto',
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  homeMentorRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  homeMentorRatingText: {
    color: '#dfe1e8',
    fontSize: 9,
    fontFamily: 'Manrope_700Bold',
  },
  homeMentorPrice: {
    color: '#93f72b',
    fontSize: 9,
    fontFamily: 'Manrope_700Bold',
  },
  homeCourseCard: {
    width: 226,
    height: 176,
    borderRadius: 23,
    overflow: 'hidden',
    backgroundColor: '#151624',
    borderWidth: 1,
    borderColor: 'rgba(112,0,255,0.24)',
  },
  homeCourseImage: {
    width: '100%',
    height: '100%',
  },
  homeCourseShade: {
    ...StyleSheet.absoluteFillObject,
  },
  homeCourseBadge: {
    position: 'absolute',
    top: 11,
    right: 11,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(10,11,16,0.82)',
  },
  homeCourseBadgeText: {
    color: '#93f72b',
    fontSize: 9,
    fontFamily: 'Manrope_700Bold',
  },
  homeCourseContent: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 13,
  },
  homeCourseTitle: {
    color: '#ffffff',
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'Manrope_700Bold',
  },
  homeCourseMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 7,
  },
  homeCourseDuration: {
    color: '#a7abba',
    fontSize: 9,
    fontFamily: 'Manrope_500Medium',
  },
  homeJourneyGrid: {
    flexDirection: 'row',
    gap: 9,
  },
  homeJourneyItem: {
    flex: 1,
    minHeight: 122,
    borderRadius: 20,
    padding: 12,
    backgroundColor: '#141521',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.065)',
  },
  homeJourneyIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(112,0,255,0.14)',
  },
  homeJourneyIconDone: {
    backgroundColor: '#93f72b',
  },
  homeJourneyNumber: {
    color: '#686d7f',
    fontSize: 8,
    marginTop: 12,
    fontFamily: 'Manrope_700Bold',
  },
  homeJourneyTitle: {
    color: '#e8e9ee',
    fontSize: 9,
    lineHeight: 13,
    marginTop: 3,
    fontFamily: 'Manrope_600SemiBold',
  },
  editorialScroll: {
    paddingHorizontal: 19,
    paddingTop: Platform.OS === 'android' ? 42 : 20,
    paddingBottom: 116,
  },
  editorialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  editorialIdentity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  editorialAvatar: {
    width: 38,
    height: 38,
    borderRadius: 14,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5420a5',
    borderWidth: 1,
    borderColor: 'rgba(147,247,43,0.45)',
  },
  editorialHello: {
    color: '#717789',
    fontSize: 7,
    letterSpacing: 1.25,
    fontFamily: 'Manrope_700Bold',
  },
  editorialUserName: {
    maxWidth: 155,
    color: '#f3f4f7',
    fontSize: 13,
    marginTop: 2,
    fontFamily: 'Manrope_700Bold',
  },
  editorialHeaderActions: {
    flexDirection: 'row',
    gap: 7,
  },
  editorialHeaderButton: {
    width: 36,
    height: 36,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  editorialAlertDot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    right: 7,
    top: 7,
    backgroundColor: '#93f72b',
  },
  editorialIntro: {
    position: 'relative',
    overflow: 'hidden',
    paddingTop: 48,
    paddingBottom: 31,
  },
  editorialMonogram: {
    position: 'absolute',
    right: -8,
    top: 22,
    color: 'rgba(112,0,255,0.1)',
    fontSize: 112,
    lineHeight: 120,
    letterSpacing: -12,
    fontFamily: 'Manrope_800ExtraBold',
  },
  editorialIntroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  editorialKicker: {
    color: '#93f72b',
    fontSize: 8,
    letterSpacing: 1.7,
    marginBottom: 14,
    fontFamily: 'Manrope_700Bold',
  },
  editorialIssueBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: 'rgba(112,0,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(151,96,235,0.25)',
    marginBottom: 14,
  },
  editorialIssueText: {
    color: '#a888db',
    fontSize: 6,
    letterSpacing: 1,
    fontFamily: 'Manrope_700Bold',
  },
  editorialHeadline: {
    color: '#f9f9fb',
    fontSize: 35,
    lineHeight: 42,
    letterSpacing: -1.5,
    fontFamily: 'Manrope_800ExtraBold',
  },
  editorialHeadlineAccent: {
    color: '#9b6ee8',
    fontFamily: 'Manrope_800ExtraBold',
  },
  editorialLead: {
    flex: 1,
    maxWidth: 282,
    color: '#858a9d',
    fontSize: 11,
    lineHeight: 18,
    fontFamily: 'Manrope_400Regular',
  },
  editorialIntroBottom: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
    marginTop: 16,
  },
  editorialIntroRule: {
    width: 31,
    height: 1,
    backgroundColor: '#93f72b',
    marginTop: 8,
  },
  editorialFeature: {
    height: 258,
    borderRadius: 29,
    overflow: 'hidden',
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(180,135,255,0.22)',
    ...createShadow('#000000', 0, 12, 0.32, 24, 7),
  },
  editorialFeatureOrb: {
    position: 'absolute',
    right: -42,
    top: -45,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(147,247,43,0.08)',
  },
  editorialFeaturePortrait: {
    position: 'absolute',
    width: 152,
    height: 205,
    right: -9,
    bottom: -8,
    borderTopLeftRadius: 82,
    opacity: 0.58,
  },
  editorialFeatureMetric: {
    position: 'absolute',
    right: 14,
    top: 14,
    width: 60,
    height: 55,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8,7,14,0.48)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    zIndex: 3,
  },
  editorialFeatureMetricValue: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'Manrope_800ExtraBold',
  },
  editorialFeatureMetricLabel: {
    color: '#93f72b',
    fontSize: 5,
    letterSpacing: 0.65,
    marginTop: 1,
    fontFamily: 'Manrope_700Bold',
  },
  editorialFeatureVertical: {
    position: 'absolute',
    right: -68,
    top: 128,
    width: 175,
    color: 'rgba(255,255,255,0.25)',
    fontSize: 6,
    letterSpacing: 1.2,
    transform: [{ rotate: '90deg' }],
    fontFamily: 'Manrope_700Bold',
    zIndex: 3,
  },
  editorialFeatureCopy: {
    flex: 1,
    zIndex: 2,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  editorialFeatureTag: {
    color: '#c1a6ea',
    fontSize: 8,
    letterSpacing: 1.3,
    fontFamily: 'Manrope_700Bold',
  },
  editorialFeatureTitle: {
    maxWidth: 238,
    color: '#ffffff',
    fontSize: 21,
    lineHeight: 28,
    letterSpacing: -0.55,
    fontFamily: 'Manrope_700Bold',
  },
  editorialFeatureButton: {
    height: 40,
    borderRadius: 14,
    paddingLeft: 14,
    paddingRight: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#93f72b',
  },
  editorialFeatureButtonText: {
    color: '#0d1410',
    fontSize: 10,
    fontFamily: 'Manrope_700Bold',
  },
  editorialTicker: {
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 11,
    marginTop: 9,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  editorialTickerText: {
    color: '#74798a',
    fontSize: 6,
    letterSpacing: 0.75,
    fontFamily: 'Manrope_700Bold',
  },
  editorialTickerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#6f2bc4',
  },
  editorialQuickGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  editorialQuickPrimary: {
    flex: 1.12,
    minHeight: 204,
    borderRadius: 26,
    padding: 16,
    backgroundColor: '#93f72b',
  },
  editorialQuickIcon: {
    width: 39,
    height: 39,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(13,20,16,0.1)',
  },
  editorialQuickCount: {
    position: 'absolute',
    top: 17,
    right: 16,
    color: 'rgba(13,20,16,0.42)',
    fontSize: 12,
    fontFamily: 'Manrope_700Bold',
  },
  editorialQuickTitle: {
    color: '#0d1410',
    fontSize: 18,
    lineHeight: 23,
    marginTop: 28,
    fontFamily: 'Manrope_800ExtraBold',
  },
  editorialQuickLink: {
    color: '#24301f',
    fontSize: 9,
    marginTop: 'auto',
    fontFamily: 'Manrope_700Bold',
  },
  editorialQuickStack: {
    flex: 0.88,
    gap: 10,
  },
  editorialQuickSmall: {
    flex: 1,
    borderRadius: 23,
    padding: 14,
    backgroundColor: '#151520',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  editorialQuickSmallValue: {
    position: 'absolute',
    right: 14,
    top: 13,
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'Manrope_800ExtraBold',
  },
  editorialQuickSmallLabel: {
    color: '#9a9fb0',
    fontSize: 9,
    marginTop: 'auto',
    fontFamily: 'Manrope_600SemiBold',
  },
  editorialSection: {
    marginTop: 48,
  },
  editorialSectionIndex: {
    color: '#93f72b',
    fontSize: 8,
    letterSpacing: 1.2,
    marginBottom: 7,
    fontFamily: 'Manrope_700Bold',
  },
  editorialSectionHeadingRow: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 17,
  },
  editorialSectionTitle: {
    color: '#ffffff',
    fontSize: 20,
    letterSpacing: -0.5,
    fontFamily: 'Manrope_700Bold',
  },
  editorialSectionLine: {
    width: 76,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  editorialSectionLink: {
    color: '#9b75dc',
    fontSize: 9,
    fontFamily: 'Manrope_700Bold',
  },
  editorialActivityRow: {
    minHeight: 101,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  editorialActivityDate: {
    width: 58,
    alignItems: 'flex-start',
  },
  editorialActivityDay: {
    color: '#ffffff',
    fontSize: 25,
    lineHeight: 28,
    fontFamily: 'Manrope_800ExtraBold',
  },
  editorialActivityMonth: {
    color: '#717789',
    fontSize: 7,
    letterSpacing: 0.6,
    fontFamily: 'Manrope_700Bold',
  },
  editorialActivityBody: {
    flex: 1,
    paddingHorizontal: 12,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.09)',
  },
  editorialActivityType: {
    color: '#8a65ca',
    fontSize: 7,
    letterSpacing: 1,
    marginBottom: 4,
    fontFamily: 'Manrope_700Bold',
  },
  editorialActivityTitle: {
    color: '#f4f4f7',
    fontSize: 12,
    fontFamily: 'Manrope_700Bold',
  },
  editorialActivityMeta: {
    color: '#777d8f',
    fontSize: 9,
    marginTop: 4,
    textTransform: 'capitalize',
    fontFamily: 'Manrope_500Medium',
  },
  editorialLearningRow: {
    marginTop: 9,
    borderRadius: 21,
    padding: 15,
    backgroundColor: '#14151f',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.065)',
  },
  editorialLearningTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editorialLearningPercent: {
    color: '#93f72b',
    fontSize: 15,
    fontFamily: 'Manrope_800ExtraBold',
  },
  editorialLearningTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  editorialLearningFill: {
    height: '100%',
    borderRadius: 2,
  },
  editorialMentorFeature: {
    minHeight: 224,
    borderRadius: 27,
    flexDirection: 'row',
    overflow: 'hidden',
    backgroundColor: '#171721',
    borderWidth: 1,
    borderColor: 'rgba(112,0,255,0.2)',
  },
  editorialMentorImage: {
    width: '43%',
    height: 224,
  },
  editorialMentorCopy: {
    flex: 1,
    padding: 17,
  },
  editorialMentorRole: {
    color: '#8e68d0',
    fontSize: 7,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    fontFamily: 'Manrope_700Bold',
  },
  editorialMentorName: {
    color: '#ffffff',
    fontSize: 18,
    lineHeight: 23,
    marginTop: 6,
    fontFamily: 'Manrope_800ExtraBold',
  },
  editorialMentorBio: {
    color: '#878c9d',
    fontSize: 9,
    lineHeight: 15,
    marginTop: 9,
    fontFamily: 'Manrope_400Regular',
  },
  editorialMentorFooter: {
    marginTop: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  editorialMentorRating: {
    color: '#f2c96c',
    fontSize: 10,
    fontFamily: 'Manrope_700Bold',
  },
  editorialRoundArrow: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#93f72b',
  },
  editorialMentorRail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingLeft: 4,
  },
  editorialMentorThumb: {
    width: 34,
    height: 34,
    borderRadius: 13,
    marginLeft: -4,
    borderWidth: 2,
    borderColor: '#090514',
  },
  editorialMentorRailText: {
    color: '#6f7485',
    fontSize: 8,
    marginLeft: 9,
    fontFamily: 'Manrope_500Medium',
  },
  editorialCourseList: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.09)',
  },
  editorialCourseRow: {
    minHeight: 94,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.09)',
    paddingVertical: 12,
  },
  editorialCourseNumber: {
    width: 27,
    color: '#676c7d',
    fontSize: 8,
    fontFamily: 'Manrope_700Bold',
  },
  editorialCourseImage: {
    width: 66,
    height: 66,
    borderRadius: 17,
  },
  editorialCourseBody: {
    flex: 1,
    paddingHorizontal: 11,
  },
  editorialCourseTitle: {
    color: '#f2f3f6',
    fontSize: 11,
    lineHeight: 16,
    fontFamily: 'Manrope_700Bold',
  },
  editorialCourseMeta: {
    color: '#73798a',
    fontSize: 8,
    marginTop: 5,
    fontFamily: 'Manrope_500Medium',
  },
  editorialCoursePrice: {
    maxWidth: 65,
    color: '#93f72b',
    fontSize: 9,
    textAlign: 'right',
    fontFamily: 'Manrope_700Bold',
  },
  editorialFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 7,
    paddingTop: 55,
    paddingBottom: 12,
  },
  editorialFooterDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#93f72b',
  },
  editorialFooterText: {
    color: '#555a6b',
    fontSize: 7,
    letterSpacing: 1.2,
    fontFamily: 'Manrope_700Bold',
  },
  cleanHomeScroll: {
    paddingHorizontal: 18,
    paddingTop: Platform.OS === 'android' ? 42 : 20,
    paddingBottom: 116,
  },
  cleanHomeScrollFit: {
    paddingHorizontal: HOME_SIDE_PAD,
    flexGrow: 1,
  },
  cleanHomeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    marginTop: 4,
    minHeight: 48,
  },
  cleanHomeProfile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minWidth: 0,
    paddingRight: 8,
  },
  cleanHomeProfileText: {
    flex: 1,
    minWidth: 0,
  },
  cleanHomeAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 2.5,
    borderColor: '#93f72b',
  },
  cleanHomeAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 23,
  },
  cleanHomeHello: {
    color: '#8a7da8',
    fontSize: 11,
    fontFamily: 'Manrope_500Medium',
  },
  cleanHomeName: {
    color: '#2D1B69',
    fontSize: 16,
    marginTop: 1,
    fontFamily: 'Manrope_800ExtraBold',
  },
  cleanHomeHeaderActions: {
    flexDirection: 'row',
    gap: 8,
    flexShrink: 0,
  },
  cleanHomeHeaderIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(147, 247, 43, 0.35)',
    ...createShadow('#8037f4', 0, 4, 0.06, 10, 2),
  },
  cleanHomeRedDot: {
    position: 'absolute',
    right: 8,
    top: 8,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#ef4444',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  cleanHomeSearch: {
    height: 50,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
    paddingHorizontal: 8,
    paddingRight: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(147, 247, 43, 0.4)',
    ...createShadow('#8037f4', 0, 6, 0.06, 14, 2),
  },
  cleanHomeSearchIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#93f72b',
  },
  cleanHomeSearchInput: {
    flex: 1,
    color: '#2D1B69',
    fontSize: 13,
    fontFamily: 'Manrope_500Medium',
  },
  cleanNewsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    marginBottom: 10,
  },
  cleanNewsHeading: {
    color: '#2D1B69',
    fontSize: 16,
    letterSpacing: -0.3,
    fontFamily: 'Manrope_800ExtraBold',
  },
  cleanNewsCount: {
    color: '#8a7da8',
    fontSize: 10,
    letterSpacing: 0.4,
    fontFamily: 'Manrope_600SemiBold',
  },
  cleanNewsRail: {
    gap: 12,
    paddingRight: 10,
    paddingBottom: 2,
  },
  cleanNewsCard: {
    borderRadius: 26,
    overflow: 'hidden',
    backgroundColor: '#1a1530',
    borderWidth: 0,
    ...createShadow('#2D1B69', 0, 10, 0.18, 18, 5),
  },
  cleanNewsImage: {
    width: '100%',
    height: '100%',
  },
  cleanNewsShade: {
    ...StyleSheet.absoluteFillObject,
  },
  cleanNewsIndex: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(147, 247, 43, 0.45)',
  },
  cleanNewsIndexText: {
    color: '#ffffff',
    fontSize: 9,
    fontFamily: 'Manrope_700Bold',
  },
  cleanNewsContent: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 15,
  },
  cleanNewsTagPill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
    marginBottom: 7,
    backgroundColor: '#93f72b',
  },
  cleanNewsTag: {
    color: '#2D1B69',
    fontSize: 8,
    letterSpacing: 0.8,
    fontFamily: 'Manrope_800ExtraBold',
  },
  cleanNewsTitle: {
    color: '#ffffff',
    fontSize: 14,
    lineHeight: 19,
    fontFamily: 'Manrope_800ExtraBold',
  },
  cleanNewsSubtitle: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 10,
    marginTop: 5,
    fontFamily: 'Manrope_500Medium',
  },
  homeJourneyCard: {
    marginTop: 16,
    borderRadius: 28,
    padding: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(147, 247, 43, 0.28)',
    ...createShadow('#8037f4', 0, 10, 0.08, 20, 3),
  },
  homeJourneyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  homeJourneyEyebrow: {
    color: '#8a7da8',
    fontSize: 9,
    letterSpacing: 1.1,
    fontFamily: 'Manrope_700Bold',
  },
  homeJourneyTitle: {
    color: '#2D1B69',
    fontSize: 16,
    marginTop: 3,
    letterSpacing: -0.3,
    fontFamily: 'Manrope_800ExtraBold',
  },
  homeJourneySpark: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#93f72b',
    ...createShadow('#93f72b', 0, 4, 0.3, 8, 2),
  },
  homeJourneyStep: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginTop: 6,
    borderRadius: 18,
    backgroundColor: '#faf8ff',
  },
  homeJourneyStepLast: {
    marginBottom: 2,
  },
  homeJourneyNumber: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeJourneyNumberText: {
    fontSize: 10,
    fontFamily: 'Manrope_800ExtraBold',
  },
  homeJourneyIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeJourneyBody: {
    flex: 1,
    minWidth: 0,
  },
  homeJourneyStepTitle: {
    color: '#2D1B69',
    fontSize: 13,
    fontFamily: 'Manrope_700Bold',
  },
  homeJourneyStepDesc: {
    color: '#8a7da8',
    fontSize: 10,
    marginTop: 2,
    fontFamily: 'Manrope_500Medium',
  },
  homeJourneyChevron: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(147, 247, 43, 0.2)',
  },
  homeStatsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  homeStatPill: {
    flex: 1,
    minHeight: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(147, 247, 43, 0.28)',
    ...createShadow('#8037f4', 0, 4, 0.05, 10, 2),
  },
  homeStatValue: {
    color: '#2D1B69',
    fontSize: 18,
    fontFamily: 'Manrope_800ExtraBold',
  },
  homeStatLabel: {
    color: '#8a7da8',
    fontSize: 9,
    marginTop: 3,
    fontFamily: 'Manrope_600SemiBold',
  },
  homeToolsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  homeToolCard: {
    flex: 1,
    minHeight: 122,
    borderRadius: 24,
    padding: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(147, 247, 43, 0.26)',
    ...createShadow('#8037f4', 0, 6, 0.06, 14, 2),
  },
  homeToolIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f0fc',
    borderWidth: 1,
    borderColor: 'rgba(147, 247, 43, 0.35)',
    marginBottom: 12,
  },
  homeToolTitle: {
    color: '#2D1B69',
    fontSize: 13,
    fontFamily: 'Manrope_800ExtraBold',
  },
  homeToolDesc: {
    color: '#8a7da8',
    fontSize: 10,
    lineHeight: 14,
    marginTop: 5,
    fontFamily: 'Manrope_500Medium',
  },
  cleanHomeTitleBlock: {
    marginTop: 20,
    marginBottom: 2,
  },
  cleanHomeTitle: {
    color: '#2D1B69',
    fontSize: 17,
    letterSpacing: -0.4,
    fontFamily: 'Manrope_800ExtraBold',
  },
  cleanHomeTitleHint: {
    color: '#8a7da8',
    fontSize: 11,
    marginTop: 3,
    fontFamily: 'Manrope_500Medium',
  },
  cleanHomeChips: {
    gap: 8,
    paddingTop: 8,
    paddingBottom: 10,
    paddingRight: 8,
  },
  cleanHomeChip: {
    height: 34,
    borderRadius: 999,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(147, 247, 43, 0.32)',
  },
  cleanHomeChipActive: {
    backgroundColor: '#93f72b',
    borderColor: '#93f72b',
  },
  cleanHomeChipText: {
    color: '#5c4d7a',
    fontSize: 11,
    fontFamily: 'Manrope_600SemiBold',
  },
  cleanHomeChipTextActive: {
    color: '#2D1B69',
    fontSize: 11,
    fontFamily: 'Manrope_800ExtraBold',
  },
  cleanBookingStrip: {
    minHeight: 82,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 13,
    marginBottom: 25,
    backgroundColor: '#171522',
    borderWidth: 1,
    borderColor: 'rgba(112,0,255,0.2)',
  },
  cleanBookingIcon: {
    width: 42,
    height: 42,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(147,247,43,0.08)',
  },
  cleanBookingBody: {
    flex: 1,
    paddingHorizontal: 11,
  },
  cleanBookingLabel: {
    color: '#8f6bcc',
    fontSize: 7,
    letterSpacing: 0.9,
    fontFamily: 'Manrope_700Bold',
  },
  cleanBookingTitle: {
    color: '#f3f4f6',
    fontSize: 11,
    marginTop: 3,
    fontFamily: 'Manrope_700Bold',
  },
  cleanBookingMeta: {
    color: '#777d8e',
    fontSize: 8,
    marginTop: 3,
    fontFamily: 'Manrope_500Medium',
  },
  cleanSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  cleanSectionTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontFamily: 'Manrope_700Bold',
  },
  cleanSectionLink: {
    color: '#93f72b',
    fontSize: 9,
    fontFamily: 'Manrope_600SemiBold',
  },
  cleanCardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignContent: 'flex-start',
  },
  cleanMentorCard: {
    marginBottom: 0,
  },
  cleanMentorImageWrap: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#171821',
  },
  cleanMentorImage: {
    width: '100%',
    height: '100%',
  },
  cleanMentorImageFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '58%',
  },
  cleanMentorPriceChip: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(147, 247, 43, 0.92)',
  },
  cleanMentorPriceChipText: {
    color: '#0d1410',
    fontSize: 9,
    fontFamily: 'Manrope_800ExtraBold',
  },
  cleanMentorImageCaption: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 11,
  },
  cleanMentorRatingMini: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 3,
  },
  cleanMentorRatingMiniText: {
    color: '#d5d8e0',
    fontSize: 9,
    fontFamily: 'Manrope_600SemiBold',
  },
  cleanCardTitle: {
    color: '#ffffff',
    fontSize: 11,
    lineHeight: 15,
    fontFamily: 'Manrope_700Bold',
  },
  homeCoursePreviewCard: {
    borderRadius: 18,
    padding: 9,
    backgroundColor: 'rgba(255,255,255,0.86)',
    borderWidth: 1,
    borderColor: 'rgba(128, 55, 244, 0.12)',
  },
  homeCoursePreviewImage: {
    width: '100%',
    height: 88,
    borderRadius: 14,
    backgroundColor: '#efe6fa',
    marginBottom: 9,
  },
  homeCoursePreviewTitle: {
    color: '#2D1B69',
    fontSize: 11,
    lineHeight: 15,
    fontFamily: 'Manrope_800ExtraBold',
  },
  homeCoursePreviewMeta: {
    color: '#7b6f96',
    fontSize: 8,
    marginTop: 4,
    fontFamily: 'Manrope_500Medium',
  },
  homeCvPreviewWrap: {
    gap: 10,
  },
  homeCvPreviewCard: {
    minHeight: 76,
    borderRadius: 22,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(147, 247, 43, 0.28)',
    ...createShadow('#8037f4', 0, 4, 0.05, 10, 2),
  },
  homeCvPreviewIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f0fc',
    borderWidth: 1,
    borderColor: 'rgba(147, 247, 43, 0.35)',
  },
  homeCvPreviewTitle: {
    color: '#2D1B69',
    fontSize: 13,
    fontFamily: 'Manrope_800ExtraBold',
  },
  homeCvPreviewDesc: {
    color: '#8a7da8',
    fontSize: 10,
    lineHeight: 14,
    marginTop: 3,
    fontFamily: 'Manrope_500Medium',
  },
  homeCvPreviewCta: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 11,
    backgroundColor: '#93f72b',
    ...createShadow('#93f72b', 0, 4, 0.25, 8, 2),
  },
  homeCvPreviewCtaText: {
    color: '#2D1B69',
    fontSize: 12,
    fontFamily: 'Manrope_800ExtraBold',
  },
  cleanCvBanner: {
    minHeight: 92,
    borderRadius: 23,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 31,
    padding: 14,
    backgroundColor: '#21153a',
    borderWidth: 1,
    borderColor: 'rgba(139,82,224,0.25)',
  },
  cleanCvIcon: {
    width: 48,
    height: 48,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(147,247,43,0.08)',
  },
  cleanCvLabel: {
    color: '#9870da',
    fontSize: 7,
    letterSpacing: 1,
    fontFamily: 'Manrope_700Bold',
  },
  cleanCvTitle: {
    color: '#ffffff',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
    fontFamily: 'Manrope_700Bold',
  },
  cleanCvArrow: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6f2bc4',
  },
  cleanCourseCard: {
    width: '48%',
    marginBottom: 5,
  },
  cleanCourseImageWrap: {
    height: 118,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#171821',
    marginBottom: 10,
  },
  cleanCourseImage: {
    width: '100%',
    height: '100%',
  },

  // AUTH SCREEN (ProInterview style — light purple bg + purple card + mascot)
  authPageBg: {
    flex: 1,
    backgroundColor: '#f5f0fc',
    overflow: 'hidden',
  },
  authPageBleed: {
    ...StyleSheet.absoluteFillObject,
  },
  authKeyboardWrap: {
    flex: 1,
  },
  authBlobTop: {
    position: 'absolute',
    top: -100,
    left: -70,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(128, 55, 244, 0.12)',
  },
  authBlobBottom: {
    position: 'absolute',
    bottom: -80,
    right: -50,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(147, 247, 43, 0.08)',
  },
  authScrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  authTopBar: {
    width: '100%',
    maxWidth: AUTH_CARD_MAX_WIDTH,
    alignSelf: 'center',
    paddingBottom: 6,
  },
  authLogoImg: {
    width: Math.min(148, width * 0.38),
    height: 38,
  },
  authCardArea: {
    width: '100%',
    alignSelf: 'center',
    alignItems: 'center',
  },
  authMascot: {
    marginBottom: -18,
    zIndex: 2,
    alignSelf: 'flex-start',
    marginLeft: 4,
  },
  authMascotSmall: {
    marginBottom: -14,
    zIndex: 2,
    alignSelf: 'flex-start',
    marginLeft: 4,
  },
  authCard: {
    width: '100%',
    backgroundColor: '#8037f4',
    borderRadius: 28,
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    ...createShadow('#8037f4', 0, 12, 0.24, 32, 6),
    zIndex: 1,
  },
  authCardTitle: {
    fontSize: 20,
    fontWeight: '750',
    color: '#ffffff',
    letterSpacing: -0.5,
    fontFamily: 'Manrope_800ExtraBold',
    marginBottom: 4,
  },
  authCardSubtitle: {
    fontSize: 11,
    lineHeight: 16,
    color: 'rgba(255,255,255,0.78)',
    marginBottom: 16,
    fontFamily: 'Manrope_400Regular',
  },
  authLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 5,
    fontFamily: 'Manrope_600SemiBold',
  },
  authLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  authForgot: {
    fontSize: 12,
    fontWeight: '600',
    color: '#93f72b',
    fontFamily: 'Manrope_600SemiBold',
  },
  authSuccessIconWrap: {
    alignSelf: 'center',
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(128, 55, 244, 0.12)',
    marginBottom: 12,
  },
  authEmailChip: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '100%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(128, 55, 244, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(128, 55, 244, 0.2)',
    marginBottom: 14,
  },
  authEmailChipText: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#2D1B69',
    fontFamily: 'Manrope_600SemiBold',
  },
  authDevResetBox: {
    marginBottom: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(128, 55, 244, 0.35)',
    backgroundColor: 'rgba(128, 55, 244, 0.08)',
  },
  authDevResetTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6d28d9',
    marginBottom: 6,
    fontFamily: 'Manrope_600SemiBold',
  },
  authDevResetLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8037f4',
    fontFamily: 'Manrope_700Bold',
  },
  authInfoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(128, 55, 244, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(128, 55, 244, 0.14)',
  },
  authInfoText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    color: 'rgba(255,255,255,0.78)',
    fontFamily: 'Manrope_500Medium',
  },
  authWarnBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.28)',
  },
  authWarnText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    color: 'rgba(255,255,255,0.88)',
    fontFamily: 'Manrope_500Medium',
  },
  authInput: {
    width: '100%',
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 13,
    backgroundColor: '#ffffff',
    color: '#111827',
    fontSize: 13,
    fontFamily: 'Manrope_500Medium',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
    marginBottom: 12,
  },
  authInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
    marginBottom: 12,
    paddingRight: 10,
    height: 44,
    overflow: 'hidden',
  },
  authEyeBtn: {
    padding: 4,
  },
  authErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  authErrorText: {
    color: '#fca5a5',
    fontSize: 12,
    flex: 1,
    fontFamily: 'Manrope_500Medium',
  },
  authSubmitBtn: {
    backgroundColor: '#93f72b',
    borderRadius: 999,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    marginBottom: 2,
    ...createShadow('#93f72b', 0, 6, 0.28, 14, 3),
  },
  authSubmitBtnText: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'Manrope_700Bold',
  },
  authDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  authDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  authDividerText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    fontFamily: 'Manrope_500Medium',
    marginHorizontal: 10,
  },
  authFooterRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 14,
  },
  authFooterText: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 12,
    fontFamily: 'Manrope_500Medium',
  },
  authFooterLink: {
    color: '#93f72b',
    fontSize: 13,
    fontWeight: 'bold',
    fontFamily: 'Manrope_700Bold',
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
    flex: 1,
    marginRight: 10,
    gap: 2,
  },
  headerWelcomeText: {
    fontSize: 8,
    letterSpacing: 1.2,
    color: '#8d879b',
    fontFamily: 'Manrope_700Bold',
  },
  headerUserName: {
    fontSize: 16,
    color: '#ffffff',
    fontFamily: 'Manrope_700Bold',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    position: 'relative',
  },
  headerIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.055)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
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
    overflow: 'hidden',
  },
  avatarText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  avatarImageCompact: {
    width: '100%',
    height: '100%',
    borderRadius: 17,
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

  // MENTOR LIST
  mentorPageHeader: {
    marginBottom: 14,
  },
  mentorPageTitle: {
    color: '#0f172a',
    fontSize: 22,
    letterSpacing: -0.5,
    fontFamily: 'Manrope_800ExtraBold',
  },
  mentorCompactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(128, 55, 244, 0.12)',
    marginBottom: 10,
    ...createShadow('#8037f4', 0, 4, 0.06, 12, 2),
  },
  mentorCompactAvatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#1f2130',
  },
  mentorCompactBody: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  mentorCompactName: {
    color: '#0f172a',
    fontSize: 14,
    fontFamily: 'Manrope_700Bold',
  },
  mentorCompactRole: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2,
    fontFamily: 'Manrope_500Medium',
  },
  mentorCompactMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 5,
  },
  mentorCompactRating: {
    color: '#d5d8e0',
    fontSize: 11,
    fontFamily: 'Manrope_600SemiBold',
  },
  mentorCompactAction: {
    alignItems: 'flex-end',
    gap: 4,
  },
  mentorCompactPrice: {
    color: '#93f72b',
    fontSize: 12,
    fontFamily: 'Manrope_800ExtraBold',
  },
  mentorSearchIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(147, 247, 43, 0.1)',
    marginRight: 9,
  },
  mentorResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  mentorResultText: {
    color: '#aeb3c4',
    fontSize: 11,
    fontFamily: 'Manrope_600SemiBold',
  },
  mentorApiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  mentorApiDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#71d99d',
  },
  mentorApiText: {
    color: '#7e8497',
    fontSize: 10,
    fontFamily: 'Manrope_500Medium',
  },
  mentorPremiumCard: {
    borderRadius: 26,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(125, 48, 235, 0.34)',
    ...createShadow('#080510', 0, 12, 0.34, 24, 5),
  },
  mentorCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  mentorFullAvatar: {
    width: 60,
    height: 60,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(112, 0, 255, 0.72)',
  },
  mentorVerifiedDot: {
    position: 'absolute',
    right: -3,
    bottom: -3,
    width: 19,
    height: 19,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#93f72b',
    borderWidth: 3,
    borderColor: '#1c1e2b',
  },
  mentorMainDetails: {
    flex: 1,
    marginLeft: 15,
  },
  mentorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mentorFullName: {
    flexShrink: 1,
    fontSize: 15,
    color: '#f8f6f0',
    fontFamily: 'Manrope_700Bold',
  },
  mentorFullRole: {
    fontSize: 11,
    color: '#989eaf',
    marginTop: 3,
    marginBottom: 7,
    fontFamily: 'Manrope_500Medium',
  },
  ratingFullRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingFullText: {
    fontSize: 11,
    color: '#f0e8d6',
    fontFamily: 'Manrope_700Bold',
  },
  mentorReviewText: {
    color: '#777d90',
    fontSize: 10,
    fontFamily: 'Manrope_500Medium',
  },
  mentorCompanyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 36,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: 10,
    marginBottom: 12,
  },
  mentorCompanyIcon: {
    marginRight: 8,
  },
  mentorCompanyText: {
    flex: 1,
    color: '#d9dbe5',
    fontSize: 11,
    fontFamily: 'Manrope_600SemiBold',
  },
  mentorExperienceText: {
    color: '#93f72b',
    fontSize: 10,
    fontFamily: 'Manrope_600SemiBold',
  },
  mentorSkillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginBottom: 14,
  },
  mentorSkillPill: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 11,
    backgroundColor: 'rgba(112, 0, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(112, 0, 255, 0.2)',
  },
  mentorSkillText: {
    color: '#c9c3b6',
    fontSize: 9,
    fontFamily: 'Manrope_600SemiBold',
  },
  mentorCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.055)',
    paddingTop: 13,
  },
  mentorPriceLabel: {
    color: '#767c8e',
    fontSize: 9,
    marginBottom: 2,
    fontFamily: 'Manrope_500Medium',
  },
  mentorPriceValue: {
    color: '#ffffff',
    fontSize: 15,
    fontFamily: 'Manrope_700Bold',
  },
  mentorPriceUnit: {
    color: '#858b9c',
    fontSize: 9,
    fontFamily: 'Manrope_500Medium',
  },
  bookPremiumBtn: {
    borderRadius: 15,
    height: 42,
    paddingLeft: 15,
    paddingRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  bookPremiumBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontFamily: 'Manrope_700Bold',
  },
  bookPremiumArrow: {
    width: 27,
    height: 27,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#93f72b',
  },

  // COURSE LIGHT LIST (tab Khóa học)
  courseLightCard: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(128, 55, 244, 0.12)',
    marginBottom: 14,
    ...createShadow('#8037f4', 0, 6, 0.06, 14, 2),
  },
  courseLightImage: {
    width: '100%',
    height: 148,
    backgroundColor: '#efe6fa',
  },
  courseLightImageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  courseLightBody: {
    padding: 14,
  },
  courseLightTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  courseLightTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: '#2D1B69',
    lineHeight: 22,
  },
  courseLightOwnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(5,150,105,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  courseLightOwnedText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
  },
  courseLightMentor: {
    fontSize: 12,
    color: '#8a7fa2',
    marginBottom: 10,
    fontWeight: '600',
  },
  courseLightMetaRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 14,
  },
  courseMetaIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  courseLightMetaText: {
    fontSize: 12,
    color: '#6f6287',
    fontWeight: '600',
  },
  courseLightFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(45,27,105,0.08)',
    paddingTop: 12,
  },
  courseLightPrice: {
    fontSize: 18,
    fontWeight: '800',
    color: '#8037f4',
  },
  courseLightCta: {
    backgroundColor: '#93f72b',
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  courseLightCtaText: {
    color: '#1a3300',
    fontSize: 12,
    fontWeight: '800',
  },

  // COURSE PREMIUM LIST (legacy aliases)
  coursePremiumCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(128, 55, 244, 0.12)',
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
    color: '#2D1B69',
    lineHeight: 22,
    marginBottom: 8,
  },
  coursePremiumDetailsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  courseMetaText: {
    fontSize: 12,
    color: '#6f6287',
  },
  coursePremiumFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(45,27,105,0.08)',
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
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  courseActionRow: {
    flexDirection: 'row',
    gap: 8,
    flexShrink: 0,
  },
  courseOwnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  courseOwnedBadgeText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '700',
  },
  courseOwnedBtn: {
    backgroundColor: 'rgba(16,185,129,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.45)',
  },
  courseOwnedBtnText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: 'bold',
  },
  coursePendingBtn: {
    backgroundColor: '#f59e0b',
  },
  courseCartBtn: {
    backgroundColor: 'rgba(147,247,43,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(147,247,43,0.45)',
    paddingHorizontal: 12,
  },
  cartToast: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(15,23,42,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(147,247,43,0.4)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    zIndex: 9999,
  },
  cartToastText: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
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
  profilePageEyebrow: {
    color: 'rgba(45, 27, 105, 0.58)',
    fontSize: 8,
    fontFamily: 'Manrope_600SemiBold',
    letterSpacing: 1.3,
    marginBottom: 5,
  },
  profilePageTitle: {
    color: '#2D1B69',
    fontSize: 24,
    fontFamily: 'Manrope_700Bold',
    letterSpacing: -0.7,
    lineHeight: 30,
  },
  profilePageSubtitle: {
    color: '#9690a8',
    fontFamily: 'Manrope_400Regular',
    fontSize: 11,
    lineHeight: 17,
    marginTop: 2,
  },
  profilePageHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
    paddingTop: 4,
    paddingBottom: 10,
    zIndex: 2,
  },
  profileHeadingBack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  profileEditButton: {
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 14,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(128, 55, 244, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(128, 55, 244, 0.18)',
  },
  profileEditButtonText: {
    color: '#c4b5fd',
    fontSize: 9,
    fontFamily: 'Manrope_600SemiBold',
  },
  profileCard: {
    borderRadius: 30,
    padding: 19,
    borderWidth: 1,
    borderColor: 'rgba(196,181,253,0.16)',
    ...createShadow('#5b21b6', 0, 14, 0.18, 28, 5),
    marginBottom: 18,
    marginTop: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  profileHeroGlow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    top: -100,
    right: -45,
    backgroundColor: 'rgba(233,207,139,0.08)',
  },
  profileHeroTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
    paddingBottom: 11,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(233,207,139,0.12)',
  },
  profilePremiumMark: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  profilePremiumMarkText: {
    color: '#e9cf8b',
    fontSize: 9,
    fontFamily: 'Manrope_700Bold',
    letterSpacing: 0.5,
  },
  profileVerifiedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(147,247,43,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(147,247,43,0.14)',
  },
  profileVerifiedChipText: {
    color: '#b7ff68',
    fontSize: 8,
    fontFamily: 'Manrope_600SemiBold',
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
    marginBottom: 14,
  },
  profileAvatarLarge: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#7000ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#a3ff4f',
    position: 'relative',
  },
  profileAvatarLargeText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  profileInfoDetails: {
    marginLeft: 14,
    flex: 1,
    gap: 2,
  },
  profileIdentityTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 2,
  },
  profileOnlineDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#93f72b',
  },
  profileIdentityEyebrow: {
    color: '#a78bfa',
    fontSize: 9,
    fontFamily: 'Manrope_600SemiBold',
    letterSpacing: 0.2,
  },
  profileNameText: {
    fontSize: 19,
    fontFamily: 'Manrope_700Bold',
    color: '#ffffff',
    letterSpacing: -0.25,
  },
  profileEmailText: {
    fontSize: 11,
    color: '#94a3b8',
    fontFamily: 'Manrope_400Regular',
  },
  profileCompanyRoleText: {
    fontSize: 11,
    color: '#e2e8f0',
    fontFamily: 'Manrope_500Medium',
    marginTop: 3,
  },
  profileBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 7,
  },
  profileRoleBadge: {
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(147,247,43,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(147,247,43,0.2)',
  },
  profileRoleBadgeText: {
    color: '#b7ff68',
    fontSize: 8,
    fontFamily: 'Manrope_600SemiBold',
  },
  profilePlanBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(247,215,116,0.1)',
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(247,215,116,0.22)',
  },
  profilePlanBadgeText: {
    color: '#f7d774',
    fontSize: 8,
    fontFamily: 'Manrope_600SemiBold',
    letterSpacing: 0.5,
  },
 
  quotaBox: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    paddingTop: 12,
  },
  quotaHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  quotaTitle: {
    fontSize: 11,
    fontFamily: 'Manrope_600SemiBold',
    color: '#94a3b8',
  },
  quotaBody: {
    flexDirection: 'row',
    gap: 14,
  },
  quotaItem: {
    flex: 1,
    gap: 4,
  },
  quotaLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quotaLabel: {
    fontSize: 9,
    color: '#94a3b8',
    fontFamily: 'Manrope_400Regular',
  },
  quotaValue: {
    color: '#f8fafc',
    fontSize: 9,
    fontFamily: 'Manrope_700Bold',
  },
  quotaTrack: {
    height: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  quotaFill: {
    height: '100%',
    borderRadius: 2,
  },
  profileStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  profileStatItem: { flex: 1, alignItems: 'center', gap: 3 },
  profileStatValue: { color: '#fff', fontSize: 17, fontFamily: 'Manrope_700Bold' },
  profileStatLabel: { color: '#94a3b8', fontSize: 9, fontFamily: 'Manrope_500Medium' },
  profileStatDivider: {
    width: 1,
    height: 25,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
 
  subTabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: 23,
    padding: 5,
    borderWidth: 1,
    borderColor: 'rgba(128, 55, 244, 0.14)',
    marginBottom: 17,
    ...createShadow('#8037f4', 0, 8, 0.08, 16),
  },
  subTabBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 2,
  },
  subTabBtnActive: {
    backgroundColor: 'rgba(128, 55, 244, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(128, 55, 244, 0.22)',
    ...createShadow('#8037f4', 0, 4, 0.12, 10),
  },
  subTabBtnText: {
    fontSize: 8,
    fontFamily: 'Manrope_600SemiBold',
    color: '#64748b',
  },
  subTabBtnTextActive: {
    color: '#2D1B69',
  },

  subTabContentCard: {
    backgroundColor: 'rgba(22,17,41,0.72)',
    borderRadius: 24,
    padding: 17,
    borderWidth: 1,
    borderColor: 'rgba(196,181,253,0.12)',
    gap: 14,
  },
  profileInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderRadius: 0,
    padding: 0,
    gap: 12,
  },
  infoFieldRow: {
    width: '48%',
    minHeight: 86,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: 'rgba(196,181,253,0.09)',
    borderRadius: 28,
    backgroundColor: 'rgba(25,19,44,0.76)',
    ...createShadow('#000', 0, 7, 0.12, 14),
  },
  profileInfoIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderWidth: 1,
    borderColor: 'rgba(233,207,139,0.10)',
  },
  infoFieldRight: {
    flex: 1,
    gap: 2,
  },
  infoFieldLabel: {
    fontSize: 8,
    color: '#94a3b8',
    fontFamily: 'Manrope_500Medium',
  },
  infoFieldValue: {
    fontSize: 11,
    color: '#ffffff',
    fontFamily: 'Manrope_600SemiBold',
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

  profileSettingsWrap: {
    gap: 12,
  },
  profileSettingsBack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  profileSettingsBackText: {
    color: '#8037f4',
    fontSize: 13,
    fontWeight: '600',
  },
  profileOptionsList: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(128, 55, 244, 0.18)',
    overflow: 'hidden',
    marginBottom: 32,
    ...createShadow('#8037f4', 0, 8, 0.08, 16),
  },
  profileOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 52,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128, 55, 244, 0.08)',
  },
  profileOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profileOptionLabel: {
    fontSize: 14,
    color: '#2D1B69',
    fontWeight: '500',
  },

  learningTab: { gap: 12 },
  learningOverview: {
    minHeight: 104,
    borderRadius: 26,
    padding: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(128, 55, 244, 0.14)',
  },
  learningOverviewEyebrow: {
    color: '#7c3aed',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  learningOverviewTitle: { color: '#1e1b4b', fontSize: 17, fontWeight: '900', marginTop: 5 },
  learningOverviewSub: { color: '#64748b', fontSize: 10, marginTop: 4 },
  learningRing: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 5,
    borderColor: '#93f72b',
  },
  learningRingValue: { color: '#1e1b4b', fontSize: 13, fontWeight: '900' },
  ownedCourseCard: {
    borderRadius: 26,
    padding: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(128, 55, 244, 0.1)',
    ...createShadow('#8037f4', 0, 6, 0.08, 16, 3),
  },
  ownedCourseTop: { flexDirection: 'row', gap: 12 },
  ownedCourseImage: { width: 82, height: 70, borderRadius: 18, backgroundColor: '#21183b' },
  ownedCourseImageFallback: {
    width: 82,
    height: 70,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ownedCourseInfo: { flex: 1, minWidth: 0 },
  ownedCourseBadgeRow: { flexDirection: 'row', marginBottom: 5 },
  ownedCourseStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: 999,
  },
  ownedCourseStatusDot: { width: 5, height: 5, borderRadius: 3 },
  ownedCourseStatusText: { fontSize: 7, fontWeight: '900', letterSpacing: 0.5 },
  ownedCourseTitle: { color: '#0f172a', fontSize: 13, lineHeight: 17, fontWeight: '900' },
  ownedCourseMeta: { color: '#64748b', fontSize: 9, marginTop: 4 },
  ownedCourseProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 13,
    marginBottom: 5,
  },
  ownedCourseProgressLabel: { color: '#64748b', fontSize: 9, fontWeight: '600' },
  ownedCourseProgressValue: { color: '#65a30d', fontSize: 9, fontWeight: '900' },
  ownedCourseProgressTrack: {
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: 'rgba(128, 55, 244, 0.08)',
  },
  ownedCourseProgressFill: { height: '100%', borderRadius: 3 },
  ownedCourseFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 13,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128, 55, 244, 0.08)',
  },
  ownedCoursePurchaseLabel: { color: '#64748b', fontSize: 8, fontWeight: '600' },
  ownedCoursePurchaseValue: { color: '#334155', fontSize: 9, fontWeight: '700', marginTop: 2 },
  continueLearningButton: {
    minHeight: 34,
    paddingHorizontal: 13,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#93f72b',
  },
  continueLearningButtonDisabled: { opacity: 0.4 },
  continueLearningText: { color: '#0c081e', fontSize: 10, fontWeight: '900' },
  learningEmpty: {
    minHeight: 230,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(128, 55, 244, 0.1)',
  },
  learningEmptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(112,0,255,0.1)',
    marginBottom: 14,
  },
  learningEmptyTitle: { color: '#1e1b4b', fontSize: 16, fontWeight: '900' },
  learningEmptyText: { color: '#64748b', fontSize: 11, textAlign: 'center', marginTop: 6 },
  learningExploreButton: {
    marginTop: 18,
    minHeight: 38,
    paddingHorizontal: 18,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7000ff',
  },
  learningExploreText: { color: '#fff', fontSize: 11, fontWeight: '800' },

  profileHistoryContent: { gap: 12 },
  historySummaryCard: {
    minHeight: 82,
    borderRadius: 25,
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(147,247,43,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(147,247,43,0.22)',
  },
  historySummaryLabel: { color: '#64748b', fontSize: 11, fontWeight: '600' },
  historySummaryValue: { color: '#1e1b4b', fontSize: 22, fontWeight: '900', marginTop: 3 },
  historySummaryIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(147,247,43,0.18)',
  },
  historySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  historyCount: {
    minWidth: 25,
    height: 22,
    borderRadius: 11,
    textAlign: 'center',
    textAlignVertical: 'center',
    paddingTop: Platform.OS === 'web' ? 3 : 0,
    color: '#6d28d9',
    backgroundColor: 'rgba(112,0,255,0.1)',
    fontSize: 11,
    fontWeight: '800',
  },
  historySection: { marginTop: 8 },
  paymentHistoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: 12,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(128,55,244,0.1)',
    marginBottom: 9,
  },
  historyItemIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(112,0,255,0.1)',
  },
  paymentHistoryMain: { flex: 1, minWidth: 0 },
  paymentHistoryTitle: { color: '#0f172a', fontSize: 12, fontWeight: '800' },
  paymentHistoryMeta: { color: '#64748b', fontSize: 9, marginTop: 3 },
  paymentHistoryRight: { alignItems: 'flex-end' },
  paymentHistoryAmount: { color: '#0f172a', fontSize: 12, fontWeight: '900' },
  paymentHistoryStatus: { fontSize: 9, fontWeight: '800', marginTop: 3 },
  historyEmpty: {
    minHeight: 100,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(128,55,244,0.1)',
  },
  historyEmptyText: { color: '#64748b', fontSize: 12 },

  // BOOKING HISTORY CARDS
  bookingHistoryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 21,
    padding: 13,
    borderWidth: 1,
    borderColor: 'rgba(128, 55, 244, 0.1)',
    marginBottom: 9,
    ...createShadow('#8037f4', 0, 4, 0.06, 12, 2),
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
    color: '#0f172a',
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
    color: '#475569',
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
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(128, 55, 244, 0.1)',
    marginBottom: 12,
  },
  cvHistoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cvHistoryName: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: 'bold',
    maxWidth: width * 0.5,
  },
  cvHistoryDate: {
    color: '#64748b',
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

  // NOTIFICATION DROPDOWN (FROM BELL ICON)
  notifDropdownOverlay: {
    flex: 1,
  },
  notifDropdownBackdrop: {
    backgroundColor: 'rgba(45, 27, 105, 0.18)',
  },
  notifDropdownAnchor: {
    position: 'absolute',
    maxHeight: height * 0.52,
    zIndex: 20,
  },
  notifDropdownCaret: {
    position: 'absolute',
    top: -5,
    width: 10,
    height: 10,
    backgroundColor: PI_SHELL_BG,
    transform: [{ rotate: '45deg' }],
    borderLeftWidth: 1,
    borderTopWidth: 1,
    borderColor: 'rgba(128, 55, 244, 0.18)',
    zIndex: 2,
  },
  notifDropdownPanel: {
    backgroundColor: PI_SHELL_BG,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(128, 55, 244, 0.16)',
    overflow: 'hidden',
    maxHeight: height * 0.52,
    shadowColor: '#2D1B69',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 12,
  },
  notifDropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(45, 27, 105, 0.08)',
  },
  notifDropdownTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2D1B69',
  },
  notifDropdownSubtitle: {
    marginTop: 2,
    fontSize: 10,
    color: '#8037f4',
    fontWeight: '600',
  },
  notifDropdownHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notifMarkAllBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(128, 55, 244, 0.1)',
  },
  notifDropdownCloseBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(45, 27, 105, 0.06)',
  },
  notifDropdownScroll: {
    width: '100%',
  },

  settingsDropdownPanel: {
    backgroundColor: PI_SHELL_BG,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(128, 55, 244, 0.16)',
    overflow: 'hidden',
    maxHeight: height * 0.72,
    shadowColor: '#2D1B69',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 12,
  },
  settingsDropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(45, 27, 105, 0.08)',
  },
  settingsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
  },
  settingsBackBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(45, 27, 105, 0.06)',
  },
  settingsDropdownEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: 'rgba(45, 27, 105, 0.45)',
    fontFamily: 'Manrope_700Bold',
  },
  settingsDropdownTitle: {
    marginTop: 2,
    fontSize: 16,
    fontWeight: '800',
    color: '#2D1B69',
    fontFamily: 'Manrope_800ExtraBold',
  },
  settingsDropdownScroll: {
    width: '100%',
    maxHeight: height * 0.62,
  },
  settingsDropdownScrollContent: {
    padding: 14,
    paddingBottom: 18,
    gap: 12,
  },
  settingsInfoSection: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(128, 55, 244, 0.12)',
    padding: 14,
  },
  settingsInfoHeading: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: '#2D1B69',
    fontFamily: 'Manrope_800ExtraBold',
  },
  settingsInfoAccent: {
    width: 36,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#93f72b',
    marginTop: 6,
    marginBottom: 12,
  },
  settingsInfoError: {
    color: '#dc2626',
    fontSize: 12,
    marginBottom: 8,
    fontFamily: 'Manrope_500Medium',
  },
  settingsFieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: '#64748b',
    marginBottom: 6,
    fontFamily: 'Manrope_700Bold',
  },
  settingsFieldInput: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.45)',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#2D1B69',
    marginBottom: 12,
    fontFamily: 'Manrope_500Medium',
  },
  settingsSaveBtn: {
    marginTop: 2,
    height: 42,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8037f4',
  },
  settingsSaveBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Manrope_700Bold',
  },
  settingsOptionsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(128, 55, 244, 0.12)',
    overflow: 'hidden',
  },

  // NOTIFICATION SHEET STYLES (legacy helpers)
  notifSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(45, 27, 105, 0.08)',
    paddingBottom: 16,
    marginBottom: 16,
  },
  notifSheetTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D1B69',
  },
  markAllReadText: {
    color: '#8037f4',
    fontSize: 12,
    fontWeight: 'bold',
  },
  notifsScrollList: {
    paddingVertical: 4,
  },
  emptyNotifs: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 6,
  },
  emptyNotifsTxt: {
    color: '#64748b',
    fontSize: 13,
  },
  notifItemRow: {
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  notifItemDivider: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(45, 27, 105, 0.08)',
  },
  notifUnreadRow: {
    backgroundColor: 'rgba(128, 55, 244, 0.06)',
  },
  notifTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  notifUnreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#8037f4',
    flexShrink: 0,
  },
  notifUnreadBg: {
    backgroundColor: 'rgba(128, 55, 244, 0.06)',
  },
  notifBodyTitleUnread: {
    color: '#2D1B69',
  },
  notifIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(128, 55, 244, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notifBodyTextWrapper: {
    flex: 1,
    gap: 2,
  },
  notifBodyTitle: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#2D1B69',
  },
  notifBodyMsg: {
    fontSize: 11,
    color: '#64748b',
    lineHeight: 15,
    marginTop: 2,
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
    gap: 16,
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
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 60,
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
    width: '100%',
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
    width: '100%',
    borderRadius: 20,
    padding: 20,
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
    backgroundColor: 'rgba(255, 255, 255, 0.035)',
    borderRadius: 18,
    paddingHorizontal: 10,
    height: 52,
    borderWidth: 1,
    borderColor: 'rgba(112, 0, 255, 0.2)',
    marginBottom: 16,
    ...createShadow('#000000', 0, 8, 0.2, 16),
  },
  searchTextInput: {
    flex: 1,
    color: '#f6f2e9',
    fontSize: 12,
    fontFamily: 'Manrope_500Medium',
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
    marginHorizontal: Math.max(12, Math.round(width * 0.04)),
    marginBottom: Platform.OS === 'ios' ? 22 : 12,
    height: 62,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    overflow: 'visible',
    paddingHorizontal: 11,
  },
  bottomNavBackgroundClip: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 31,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(128, 55, 244, 0.12)',
    backgroundColor: PI_SHELL_BG,
    ...createShadow('#8037f4', 0, 10, 0.12, 22, 8),
  },
  bottomNavShellFill: {
    ...StyleSheet.absoluteFillObject,
  },
  bottomNavBlur: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 31,
  },
  bottomNavGlassWeb: Platform.select({
    web: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: 31,
      backgroundColor: 'rgba(245, 240, 252, 0.96)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
    },
    default: StyleSheet.absoluteFillObject,
  }),
  bottomNavGlassTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
  },
  navItemFloating: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    height: '100%',
    zIndex: 2,
  },
  navItemCenter: {
    zIndex: 3,
  },
  navIconWrap: {
    width: 34,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navIconWrapActive: {
    backgroundColor: 'rgba(128, 55, 244, 0.1)',
  },
  navCenterOuter: {
    width: 56,
    height: 56,
    borderRadius: 28,
    padding: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderWidth: 3,
    borderColor: PI_SHELL_BG,
    transform: [{ translateY: -12 }],
    ...createShadow('#000000', 0, 6, 0.08, 14, 6),
  },
  navCenterOuterActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderColor: PI_SHELL_BG,
  },
  navCenterInner: {
    flex: 1,
    width: '100%',
    borderRadius: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTextFloating: {
    color: '#7b6f96',
    fontSize: width < 380 ? 8 : 9,
    fontFamily: 'Manrope_600SemiBold',
    marginTop: 2,
  },
  navTextFloatingActive: {
    color: '#93f72b',
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
    minHeight: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: 20,
    paddingTop: 0,
    overflow: 'hidden',
  },
  cvTabContainer: {
    paddingHorizontal: 16,
  },
  tabTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  tabSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 14,
    lineHeight: 17,
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
    paddingTop: 14,
    paddingBottom: HOME_NAV_CLEARANCE + 16,
  },

  // COURSES TAB
  coursesVerticalScroll: {
    gap: 14,
    paddingBottom: HOME_NAV_CLEARANCE + 16,
  },
  coursesTabContainer: {
    backgroundColor: '#f5f0fc',
  },
  coursesSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 18,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: 'rgba(128, 55, 244, 0.12)',
    marginBottom: 14,
  },
  coursesSearchInput: {
    flex: 1,
    color: '#1e1b2e',
    fontSize: 13,
    fontFamily: 'Manrope_500Medium',
  },
  coursesFilterPill: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(128, 55, 244, 0.14)',
    height: 32,
    justifyContent: 'center',
  },
  coursesFilterPillActive: {
    backgroundColor: '#8037f4',
    borderColor: '#8037f4',
  },
  coursesFilterPillText: {
    color: '#6f6287',
    fontSize: 12,
    fontWeight: '700',
  },
  coursesFilterPillTextActive: {
    color: '#ffffff',
  },
  piCourseCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(128,55,244,0.12)',
    shadowColor: '#8037f4',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  piCourseImageWrap: {
    height: 168,
    backgroundColor: '#ede9fe',
    position: 'relative',
  },
  piCourseImage: {
    width: '100%',
    height: '100%',
  },
  piCourseImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.18)',
  },
  piCourseLevelBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  piCourseLevelText: {
    fontSize: 10,
    fontWeight: '800',
  },
  piCoursePriceBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#93f72b',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  piCoursePriceBadgeText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#2e1065',
  },
  piCourseMentorRow: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  piCourseMentorAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  piCourseMentorAvatarFallback: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#ffffff',
    backgroundColor: '#ede9fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  piCourseMentorInitial: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6d28d9',
  },
  piCourseMentorName: {
    flex: 1,
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  piCourseBody: {
    padding: 14,
  },
  piCourseTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
    lineHeight: 21,
    marginBottom: 6,
  },
  piCourseDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: '#64748b',
    marginBottom: 8,
  },
  piCourseOwnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  piCourseOwnedText: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '700',
  },
  piCourseMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  piCourseMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  piCourseMetaText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  piCourseMentorTitle: {
    flex: 1,
    minWidth: '40%',
    fontSize: 11,
    color: '#94a3b8',
  },
  piCourseCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#a3e635',
    borderRadius: 16,
    paddingVertical: 11,
  },
  piCourseCtaText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#1a3300',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
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
  },

  // Elegant light dialogs / sheets (settings)
  elegantModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(45, 27, 105, 0.28)',
    justifyContent: 'flex-end',
  },
  elegantSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 22,
    borderWidth: 1,
    borderColor: 'rgba(245, 240, 252, 0.95)',
    ...createShadow('#8037f4', 0, -8, 0.1, 24, 12),
  },
  elegantSheetHandle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(128, 55, 244, 0.16)',
    marginBottom: 14,
  },
  elegantSheetHeader: {
    alignItems: 'center',
    marginBottom: 18,
  },
  elegantIconBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#f5f0fc',
    borderWidth: 2,
    borderColor: 'rgba(147, 247, 43, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  elegantSheetTitle: {
    fontSize: 18,
    fontFamily: 'Manrope_800ExtraBold',
    color: '#2D1B69',
  },
  elegantSheetSubtitle: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    color: '#7b6f96',
    fontFamily: 'Manrope_500Medium',
    paddingHorizontal: 8,
  },
  elegantErrorText: {
    color: '#dc2626',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 12,
    fontFamily: 'Manrope_700Bold',
  },
  elegantFieldGroup: {
    gap: 12,
    marginBottom: 18,
  },
  elegantFieldLabel: {
    fontSize: 11,
    fontFamily: 'Manrope_700Bold',
    color: '#7b6f96',
    marginBottom: 6,
  },
  elegantInput: {
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(128, 55, 244, 0.14)',
    backgroundColor: '#faf8ff',
    paddingHorizontal: 14,
    color: '#2D1B69',
    fontSize: 14,
    fontFamily: 'Manrope_500Medium',
  },
  elegantBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  elegantBtnGhost: {
    flex: 1,
    height: 46,
    borderRadius: 999,
    backgroundColor: '#f5f0fc',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(128, 55, 244, 0.12)',
  },
  elegantBtnGhostText: {
    fontSize: 13,
    fontFamily: 'Manrope_700Bold',
    color: '#5c4d7a',
  },
  elegantBtnPrimary: {
    flex: 1,
    height: 46,
    borderRadius: 999,
    backgroundColor: '#93f72b',
    alignItems: 'center',
    justifyContent: 'center',
    ...createShadow('#93f72b', 0, 6, 0.28, 12, 3),
  },
  elegantBtnPrimaryText: {
    fontSize: 13,
    fontFamily: 'Manrope_800ExtraBold',
    color: '#2D1B69',
  },
  elegantConfirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(45, 27, 105, 0.32)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  elegantConfirmCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(245, 240, 252, 0.98)',
    ...createShadow('#8037f4', 0, 16, 0.14, 28, 10),
  },
  elegantConfirmIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f5f0fc',
    borderWidth: 2,
    borderColor: 'rgba(147, 247, 43, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  elegantConfirmIconWrapDanger: {
    backgroundColor: 'rgba(220, 38, 38, 0.08)',
    borderColor: 'rgba(220, 38, 38, 0.28)',
  },
  elegantConfirmTitle: {
    fontSize: 17,
    fontFamily: 'Manrope_800ExtraBold',
    color: '#2D1B69',
    textAlign: 'center',
    marginBottom: 8,
  },
  elegantConfirmMessage: {
    fontSize: 13,
    lineHeight: 19,
    color: '#7b6f96',
    textAlign: 'center',
    fontFamily: 'Manrope_500Medium',
    marginBottom: 18,
  },
  elegantConfirmBtnRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  elegantConfirmBtnCancel: {
    flex: 1,
    height: 44,
    borderRadius: 999,
    backgroundColor: '#f5f0fc',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(128, 55, 244, 0.1)',
  },
  elegantConfirmBtnCancelText: {
    fontSize: 13,
    fontFamily: 'Manrope_700Bold',
    color: '#5c4d7a',
  },
  elegantConfirmBtnOk: {
    flex: 1,
    height: 44,
    borderRadius: 999,
    backgroundColor: '#93f72b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  elegantConfirmBtnOkText: {
    fontSize: 13,
    fontFamily: 'Manrope_800ExtraBold',
    color: '#2D1B69',
  },
  elegantConfirmBtnDanger: {
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.35)',
  },
  elegantConfirmBtnDangerText: {
    color: '#dc2626',
  },

  fontLoadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f0fc',
  },
});

export default function App() {
  const [fontsLoaded] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.fontLoadingScreen}>
        <ActivityIndicator size="small" color="#c4b5fd" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppInner />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
