import React, { useRef, useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Clipboard from 'expo-clipboard';
import * as WebBrowser from 'expo-web-browser';
import {
  BANK_TRANSFER,
  getAvailablePaymentMethods,
  getDefaultPaymentMethod,
  buildVietQrImageUrl,
  formatVnd,
  generateOrderNum,
  inferVietQrBankId,
} from '../config/paymentConfig';
import { checkoutCart, calcCartSummary } from '../services/cartApi';
import { createBooking } from '../services/proInterviewApi';
import {
  enrollCourse,
  fetchTransferStatus,
  fetchPaymentStatus,
  initiateBookingVnpay,
  initiateCourseVnpay,
} from '../services/paymentApi';

const STEPS = ['Đơn hàng', 'Phương thức', 'Thanh toán'];

/**
 * Checkout 3 bước: tóm tắt → chọn phương thức → thanh toán.
 */
export default function CheckoutScreen({
  mode = 'course',
  course,
  booking,
  cart,
  onBack,
  onSuccess,
}) {
  const cartItems = calcCartSummary(cart).items;
  const cartTotal = calcCartSummary(cart).total;
  const amount =
    mode === 'cart'
      ? cartTotal
      : mode === 'booking'
        ? Number(booking?.amount || booking?.mentor?.price) || 0
        : (course?.priceNum || 0);

  const paymentMethods = useMemo(() => getAvailablePaymentMethods(), []);
  const [stepIndex, setStepIndex] = useState(0);
  const [payStep, setPayStep] = useState('idle');
  const [selectedMethod, setSelectedMethod] = useState(getDefaultPaymentMethod);
  const [orderNum, setOrderNum] = useState(() => generateOrderNum());
  const [error, setError] = useState('');
  const [vnpayUrl, setVnpayUrl] = useState('');
  const [vnpayPaymentId, setVnpayPaymentId] = useState('');
  const [resolvedAmount, setResolvedAmount] = useState(null);
  const pollRef = useRef(null);
  const paidRef = useRef(false);
  const paymentAmount = resolvedAmount ?? amount;

  const vietQrBankId = useMemo(() => inferVietQrBankId(), []);
  const vietQrUrl = useMemo(
    () => buildVietQrImageUrl(vietQrBankId, BANK_TRANSFER.accountNumber, paymentAmount, orderNum),
    [vietQrBankId, paymentAmount, orderNum],
  );

  const title =
    mode === 'cart'
      ? 'Thanh toán giỏ hàng'
      : mode === 'booking'
        ? `Lịch hẹn với ${booking?.mentor?.name || 'Mentor'}`
        : course?.title || 'Thanh toán khóa học';

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const finishSuccess = () => {
    setPayStep('success');
    setTimeout(() => {
      onSuccess?.();
      onBack?.();
    }, 1500);
  };

  const startPolling = (ref) => {
    stopPolling();
    const poll = async () => {
      if (paidRef.current) return;
      const r = await fetchTransferStatus(ref);
      if (!r.success) return;
      if (r.status === 'paid') {
        paidRef.current = true;
        stopPolling();
        finishSuccess();
      } else if (r.status === 'expired') {
        stopPolling();
        setError('Đơn hàng đã hết hạn. Vui lòng tạo đơn mới.');
        setPayStep('error');
      }
    };
    setTimeout(poll, 2000);
    pollRef.current = setInterval(poll, 3000);
  };

  const startVnpayPolling = (paymentId) => {
    stopPolling();
    const poll = async () => {
      if (paidRef.current) return;
      const r = await fetchPaymentStatus(paymentId);
      if (!r.success || !r.payment) return;
      if (r.payment.status === 'success') {
        paidRef.current = true;
        stopPolling();
        finishSuccess();
      } else if (r.payment.status === 'failed') {
        stopPolling();
        setError('Thanh toán VNPay không thành công. Vui lòng thử lại.');
        setPayStep('error');
      }
    };
    setTimeout(poll, 2000);
    pollRef.current = setInterval(poll, 3000);
  };

  const openVnpayBrowser = async (url, paymentId) => {
    if (!url) return;
    if (paymentId) {
      try {
        if (Platform.OS === 'web' && typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem('vnpayPendingPaymentId', String(paymentId));
          sessionStorage.setItem('vnpayPendingType', mode);
        }
      } catch {
        /* ignore */
      }
    }
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.assign(url);
      return;
    }
    try {
      const result = await WebBrowser.openBrowserAsync(url);
      if (paymentId && (result.type === 'dismiss' || result.type === 'cancel')) {
        const status = await fetchPaymentStatus(paymentId);
        if (status.success && status.payment?.status === 'success') {
          paidRef.current = true;
          stopPolling();
          finishSuccess();
        }
      }
    } catch {
      if (typeof window !== 'undefined') {
        window.location.assign(url);
      }
    }
  };

  useEffect(() => () => stopPolling(), []);

  const createVnpayOrder = async () => {
    setPayStep('loading');
    setError('');
    paidRef.current = false;

    if (mode === 'cart') {
      setError('Thanh toán VNPay cho giỏ hàng chưa hỗ trợ. Vui lòng chọn chuyển khoản.');
      setPayStep('error');
      return;
    }

    if (mode === 'booking') {
      if (!booking?.mentorId) {
        setError('Thiếu thông tin mentor.');
        setPayStep('error');
        return;
      }
      const bookingRes = await createBooking({
        ...booking,
        paymentMethod: 'vnpay',
        paymentStatus: 'pending',
      });
      const createdBooking = bookingRes.body?.booking;
      if (!bookingRes.ok || !createdBooking?.id) {
        setError(bookingRes.body?.error || 'Không thể giữ lịch hẹn.');
        setPayStep('error');
        return;
      }
      if (createdBooking.paymentStatus === 'paid' || Number(createdBooking.totalAmount) <= 0) {
        finishSuccess();
        return;
      }
      const bookingAmount = Number(createdBooking.totalAmount || createdBooking.price || amount);
      setResolvedAmount(bookingAmount);
      const res = await initiateBookingVnpay(createdBooking.id, bookingAmount);
      if (!res.success || !res.payUrl) {
        setError(res.error || 'Không khởi tạo được VNPay cho lịch hẹn.');
        setPayStep('error');
        return;
      }
      if (res.mock) {
        setError('Backend chưa cấu hình VNPay. Kiểm tra VNP_TMN_CODE trong .env.');
        setPayStep('error');
        return;
      }
      setVnpayUrl(res.payUrl);
      setVnpayPaymentId(res.paymentId || '');
      setPayStep('awaiting');
      if (res.paymentId) startVnpayPolling(res.paymentId);
      await openVnpayBrowser(res.payUrl, res.paymentId);
      return;
    }

    if (!course?.id) {
      setError('Thiếu thông tin khóa học.');
      setPayStep('error');
      return;
    }

    if (!course.priceNum || course.priceNum <= 0) {
      const freeRes = await enrollCourse(course.id);
      if (freeRes.success) {
        finishSuccess();
        return;
      }
      setError(freeRes.error || 'Ghi danh miễn phí thất bại.');
      setPayStep('error');
      return;
    }

    const res = await initiateCourseVnpay(course.id, amount);
    if (!res.success || !res.payUrl) {
      const msg = res.error || res.message || 'Không khởi tạo được VNPay.';
      setError(msg.includes('ghi danh') ? `${msg} Kiểm tra tab Cá nhân → Khóa học của tôi.` : msg);
      setPayStep('error');
      return;
    }

    if (res.mock) {
      setError('Backend chưa cấu hình VNPay. Kiểm tra VNP_TMN_CODE trong .env.');
      setPayStep('error');
      return;
    }

    setVnpayUrl(res.payUrl);
    setVnpayPaymentId(res.paymentId || '');
    setPayStep('awaiting');
    if (res.paymentId) {
      startVnpayPolling(res.paymentId);
    }
    await openVnpayBrowser(res.payUrl, res.paymentId);
  };

  const createTransferOrder = async () => {
    setPayStep('loading');
    setError('');
    paidRef.current = false;
    const newOrder = generateOrderNum();
    setOrderNum(newOrder);

    if (mode === 'cart') {
      const res = await checkoutCart({ paymentMethod: 'transfer', orderNum: newOrder });
      if (!res.success) {
        setError(res.error || 'Không tạo được đơn giỏ hàng.');
        setPayStep('error');
        return;
      }
      const ref = res.orderNum || newOrder;
      setOrderNum(ref);
      setPayStep('awaiting');
      startPolling(ref);
      return;
    }

    if (mode === 'booking') {
      if (!booking?.mentorId) {
        setError('Thiếu thông tin mentor.');
        setPayStep('error');
        return;
      }
      const res = await createBooking({
        ...booking,
        paymentMethod: 'transfer',
        paymentStatus: 'pending',
        orderNum: newOrder,
      });
      const createdBooking = res.body?.booking;
      if (!res.ok || !createdBooking) {
        setError(res.body?.error || 'Không thể tạo lịch hẹn.');
        setPayStep('error');
        return;
      }
      if (createdBooking.paymentStatus === 'paid' || Number(createdBooking.totalAmount) <= 0) {
        finishSuccess();
        return;
      }
      const ref = createdBooking.paymentRef || newOrder;
      setResolvedAmount(Number(createdBooking.totalAmount || createdBooking.price || amount));
      setOrderNum(ref);
      setPayStep('awaiting');
      startPolling(ref);
      return;
    }

    if (!course?.id) {
      setError('Thiếu thông tin khóa học.');
      setPayStep('error');
      return;
    }

    if (!course.priceNum || course.priceNum <= 0) {
      const freeRes = await enrollCourse(course.id);
      if (freeRes.success) {
        finishSuccess();
        return;
      }
      setError(freeRes.error || 'Ghi danh miễn phí thất bại.');
      setPayStep('error');
      return;
    }

    const res = await enrollCourse(course.id, { paymentMethod: 'transfer', orderNum: newOrder });
    const enrollment = res.enrollment;

    if (enrollment?.paymentStatus === 'paid') {
      finishSuccess();
      return;
    }

    if (!res.success && !enrollment) {
      setError(res.error || res.message || 'Không tạo được đơn ghi danh.');
      setPayStep('error');
      return;
    }

    const ref = res.orderNum || enrollment?.paymentRef || newOrder;
    setOrderNum(ref);
    setPayStep('awaiting');
    startPolling(ref);
  };

  const startCheckoutPayment = () => {
    const method = paymentMethods.find((m) => m.id === selectedMethod);
    if (!method?.available) {
      Alert.alert(
        'Không khả dụng',
        `${method?.label || 'Phương thức này'} chưa sẵn sàng. Chọn VNPay để thanh toán.`,
      );
      return;
    }
    setStepIndex(2);
    if (selectedMethod === 'vnpay') {
      createVnpayOrder();
    } else {
      createTransferOrder();
    }
  };

  const handleConfirmPayment = () => startCheckoutPayment();

  const handlePayWithVnpayNow = () => {
    setSelectedMethod('vnpay');
    setStepIndex(2);
    createVnpayOrder();
  };

  const copyText = async (text, label) => {
    const value = String(text);
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(value);
      } else {
        await Clipboard.setStringAsync(value);
      }
      Alert.alert('Đã sao chép', label);
    } catch {
      Alert.alert(label, value);
    }
  };

  const goBackStep = () => {
    if (stepIndex === 2) {
      stopPolling();
      setPayStep('idle');
      setStepIndex(1);
      return;
    }
    if (stepIndex === 1) {
      setStepIndex(0);
      return;
    }
    onBack?.();
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={goBackStep}>
          <Ionicons name="arrow-back" size={22} color="#2D1B69" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerLabel}>Thanh toán</Text>
          <Text style={styles.headerTitle} numberOfLines={2}>{title}</Text>
        </View>
      </View>

      <StepBar current={stepIndex} />

      <ScrollView
        style={styles.bodyScroll}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
      >
        {stepIndex === 0 && (
          <SummaryStep
            mode={mode}
            course={course}
            booking={booking}
            cartItems={cartItems}
            amount={paymentAmount}
            onContinue={() => setStepIndex(1)}
            onPayVnpay={paymentAmount > 0 ? handlePayWithVnpayNow : undefined}
          />
        )}

        {stepIndex === 1 && (
          <MethodStep
            amount={paymentAmount}
            methods={paymentMethods}
            selectedMethod={selectedMethod}
            onSelect={setSelectedMethod}
            onConfirm={handleConfirmPayment}
          />
        )}

        {stepIndex === 2 && (
          <PaymentStep
            payStep={payStep}
            error={error}
            amount={paymentAmount}
            orderNum={orderNum}
            course={course}
            vietQrUrl={vietQrUrl}
            paymentMethod={selectedMethod}
            vnpayUrl={vnpayUrl}
            onRetry={selectedMethod === 'vnpay' ? createVnpayOrder : createTransferOrder}
            onOpenVnpay={createVnpayOrder}
            onCopy={copyText}
          />
        )}
      </ScrollView>
    </View>
  );
}

function StepBar({ current }) {
  return (
    <View style={styles.stepBar}>
      {STEPS.map((label, i) => {
        const active = i === current;
        const done = i < current;
        return (
          <View key={label} style={styles.stepItem}>
            <View style={[styles.stepDot, (done || active) && styles.stepDotActive]}>
              {done ? (
                <Ionicons name="checkmark" size={14} color="#0f172a" />
              ) : (
                <Text style={[styles.stepDotText, active && styles.stepDotTextActive]}>{i + 1}</Text>
              )}
            </View>
            <Text style={[styles.stepLabel, active && styles.stepLabelActive]}>{label}</Text>
            {i < STEPS.length - 1 ? (
              <View style={[styles.stepLine, done && styles.stepLineDone]} />
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

function SummaryStep({ mode, course, booking, cartItems, amount, onContinue, onPayVnpay }) {
  return (
    <View>
      <Text style={styles.sectionHeading}>Tóm tắt đơn hàng</Text>

      {mode === 'cart' ? (
        cartItems.map((item) => (
          <View key={item._id} style={styles.summaryRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.summaryTitle} numberOfLines={2}>{item.title}</Text>
              <Text style={styles.summaryMeta}>x{item.quantity || 1}</Text>
            </View>
            <Text style={styles.summaryPrice}>{formatVnd(item.price * (item.quantity || 1))}</Text>
          </View>
        ))
      ) : mode === 'booking' ? (
        <View style={styles.summaryCard}>
          {booking?.mentor?.avatar ? (
            <Image source={{ uri: booking.mentor.avatar }} style={styles.summaryImage} resizeMode="cover" />
          ) : null}
          <View style={{ flex: 1 }}>
            <Text style={styles.summaryTitle}>{booking?.mentor?.name || 'Mentor'}</Text>
            <Text style={styles.summaryMeta}>{booking?.mentor?.role || 'Phỏng vấn thử 1-1'}</Text>
            <View style={styles.bookingScheduleRow}>
              <Ionicons name="calendar-outline" size={13} color="#93f72b" />
              <Text style={styles.bookingScheduleText}>{booking?.date} · {booking?.timeSlot}</Text>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.summaryCard}>
          {course?.image ? (
            <Image source={{ uri: course.image }} style={styles.summaryImage} resizeMode="cover" />
          ) : null}
          <View style={{ flex: 1 }}>
            <Text style={styles.summaryTitle}>{course?.title}</Text>
            <Text style={styles.summaryMeta}>{course?.duration || 'Khóa học online'}</Text>
          </View>
        </View>
      )}

      <View style={styles.totalBox}>
        <Text style={styles.totalLabel}>Tổng thanh toán</Text>
        <Text style={styles.totalValue}>{formatVnd(amount)}</Text>
      </View>

      {onPayVnpay ? (
        <TouchableOpacity style={styles.vnpayPrimaryBtn} onPress={onPayVnpay}>
          <Ionicons name="card" size={20} color="#fff" />
          <Text style={styles.vnpayPrimaryBtnText}>Thanh toán VNPay</Text>
        </TouchableOpacity>
      ) : null}

      <TouchableOpacity style={[styles.primaryBtn, onPayVnpay && styles.secondaryOutlineBtn]} onPress={onContinue}>
        <Text style={[styles.primaryBtnText, onPayVnpay && styles.secondaryOutlineBtnText]}>
          {onPayVnpay ? 'Chọn phương thức khác' : 'Chọn phương thức thanh toán'}
        </Text>
        <Ionicons name="arrow-forward" size={18} color={onPayVnpay ? '#93f72b' : '#0f172a'} />
      </TouchableOpacity>
    </View>
  );
}

function MethodStep({ amount, methods, selectedMethod, onSelect, onConfirm }) {
  return (
    <View>
      <Text style={styles.sectionHeading}>Chọn phương thức thanh toán</Text>
      <Text style={styles.sectionSub}>Thanh toán {formatVnd(amount)}</Text>

      <View style={styles.methodList}>
        {methods.map((method) => {
          const selected = selectedMethod === method.id;
          return (
            <TouchableOpacity
              key={method.id}
              style={[
                styles.methodCard,
                selected && styles.methodCardSelected,
                !method.available && styles.methodCardDisabled,
              ]}
              onPress={() => method.available && onSelect(method.id)}
              activeOpacity={0.85}
              disabled={!method.available}
            >
              <View style={[styles.methodIconWrap, { backgroundColor: `${method.color}22` }]}>
                <Ionicons name={method.icon} size={22} color={method.color} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <Text style={styles.methodLabel}>{method.label}</Text>
                  {method.recommended ? (
                    <View style={styles.recommendedBadge}>
                      <Text style={styles.recommendedText}>Khuyên dùng</Text>
                    </View>
                  ) : null}
                  {method.badge ? (
                    <View style={styles.soonBadge}>
                      <Text style={styles.soonText}>{method.badge}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.methodSub}>{method.subtitle}</Text>
              </View>
              <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
                {selected ? <View style={styles.radioInner} /> : null}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity style={styles.primaryBtn} onPress={onConfirm}>
        <Text style={styles.primaryBtnText}>
          {selectedMethod === 'vnpay' ? 'Thanh toán qua VNPay' : 'Xác nhận thanh toán'}
        </Text>
        <Ionicons name={selectedMethod === 'vnpay' ? 'card' : 'lock-closed'} size={16} color="#0f172a" />
      </TouchableOpacity>

      <Text style={styles.secureNote}>
        <Ionicons name="shield-checkmark" size={13} color="#64748b" /> Giao dịch được bảo mật
      </Text>
    </View>
  );
}

function PaymentStep({ payStep, error, amount, orderNum, course, vietQrUrl, paymentMethod, vnpayUrl, onRetry, onOpenVnpay, onCopy }) {
  if (payStep === 'loading') {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator color="#7000ff" size="large" />
        <Text style={styles.muted}>Đang tạo đơn hàng…</Text>
      </View>
    );
  }

  if (payStep === 'error') {
    return (
      <View style={styles.centerBox}>
        <Ionicons name="alert-circle" size={44} color="#ef4444" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={onRetry}>
          <Text style={styles.retryBtnText}>Thử lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (payStep === 'success') {
    return (
      <View style={styles.centerBox}>
        <Ionicons name="checkmark-circle" size={52} color="#93f72b" />
        <Text style={styles.successText}>Thanh toán thành công!</Text>
      </View>
    );
  }

  return (
    <View>
      <Text style={styles.sectionHeading}>
        {paymentMethod === 'vnpay' ? 'Thanh toán VNPay' : 'Chuyển khoản ngân hàng'}
      </Text>

      {paymentMethod === 'vnpay' ? (
        <>
          <View style={styles.amountBox}>
            <Text style={styles.amountLabel}>Số tiền thanh toán</Text>
            <Text style={styles.amountValue}>{formatVnd(amount)}</Text>
          </View>
          <View style={styles.statusBox}>
            <ActivityIndicator color="#3b82f6" size="small" />
            <Text style={styles.statusText}>Đang chờ xác nhận từ VNPay…</Text>
          </View>
          <Text style={styles.note}>
            Hoàn tất thanh toán trên cổng VNPay Sandbox. Thẻ test: xem tài liệu VNPay.
          </Text>
          {vnpayUrl ? (
            <TouchableOpacity style={styles.primaryBtn} onPress={onOpenVnpay}>
              <Text style={styles.primaryBtnText}>Mở lại cổng VNPay</Text>
              <Ionicons name="open-outline" size={18} color="#0f172a" />
            </TouchableOpacity>
          ) : null}
        </>
      ) : (
        <>
      {course?.image ? (
        <Image source={{ uri: course.image }} style={styles.courseImage} resizeMode="cover" />
      ) : null}

      <View style={styles.amountBox}>
        <Text style={styles.amountLabel}>Số tiền cần chuyển</Text>
        <Text style={styles.amountValue}>{formatVnd(amount)}</Text>
      </View>

      {vietQrUrl ? (
        <View style={styles.qrBox}>
          <Image source={{ uri: vietQrUrl }} style={styles.qrImage} resizeMode="contain" />
          <Text style={styles.qrHint}>Quét QR bằng app ngân hàng</Text>
        </View>
      ) : null}

      <View style={styles.bankBox}>
        <Text style={styles.bankSectionTitle}>Thông tin chuyển khoản</Text>
        <BankRow label="Ngân hàng" value={BANK_TRANSFER.bankName || '—'} onCopy={() => onCopy(BANK_TRANSFER.bankName, 'tên ngân hàng')} />
        <BankRow label="Số TK" value={BANK_TRANSFER.accountNumber || 'Chưa cấu hình'} onCopy={() => onCopy(BANK_TRANSFER.accountNumber, 'số tài khoản')} />
        <BankRow label="Chủ TK" value={BANK_TRANSFER.accountOwner || '—'} onCopy={() => onCopy(BANK_TRANSFER.accountOwner, 'chủ tài khoản')} />
        <BankRow label="Nội dung CK" value={orderNum} highlight onCopy={() => onCopy(orderNum, 'nội dung chuyển khoản')} />
      </View>

      <View style={styles.statusBox}>
        <ActivityIndicator color="#93f72b" size="small" />
        <Text style={styles.statusText}>Đang chờ xác nhận chuyển khoản…</Text>
      </View>
      <Text style={styles.note}>
        Hệ thống tự xác nhận khi tiền vào. Chuyển đúng nội dung <Text style={{ color: '#93f72b', fontWeight: '700' }}>{orderNum}</Text>.
      </Text>
        </>
      )}
    </View>
  );
}

function BankRow({ label, value, onCopy, highlight }) {
  return (
    <View style={styles.bankRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.bankLabel}>{label}</Text>
        <Text style={[styles.bankValue, highlight && styles.bankHighlight]}>{value}</Text>
      </View>
      <TouchableOpacity style={styles.copyBtn} onPress={onCopy}>
        <Ionicons name="copy-outline" size={16} color="#93f72b" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, minHeight: 0, backgroundColor: '#f5f0fc', overflow: 'hidden' },
  bodyScroll: { flex: 1, minHeight: 0 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 22 : 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,55,244,0.1)',
    backgroundColor: 'rgba(255,255,255,0.88)',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(128,55,244,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLabel: { color: '#8037f4', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  headerTitle: { color: '#2D1B69', fontSize: 16, fontWeight: '800', marginTop: 2 },
  stepBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,55,244,0.08)',
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  stepItem: { flex: 1, alignItems: 'center', position: 'relative' },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(128,55,244,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  stepDotActive: { backgroundColor: '#93f72b', borderColor: '#93f72b' },
  stepDotText: { color: '#8a7fa2', fontSize: 12, fontWeight: '700' },
  stepDotTextActive: { color: '#0f172a' },
  stepLabel: { color: '#8a7fa2', fontSize: 10, marginTop: 6, fontWeight: '700' },
  stepLabelActive: { color: '#93f72b' },
  stepLine: {
    position: 'absolute',
    top: 14,
    left: '60%',
    width: '80%',
    height: 2,
    backgroundColor: 'rgba(128,55,244,0.1)',
    zIndex: -1,
  },
  stepLineDone: { backgroundColor: '#93f72b' },
  body: { padding: 16, paddingBottom: 90 },
  sectionHeading: { color: '#2D1B69', fontSize: 18, fontWeight: '800', marginBottom: 4 },
  sectionSub: { color: '#8a7fa2', fontSize: 13, marginBottom: 16 },
  summaryCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(128,55,244,0.2)',
  },
  summaryImage: { width: 72, height: 72, borderRadius: 10 },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  summaryTitle: { color: '#2D1B69', fontSize: 14, fontWeight: '700' },
  summaryMeta: { color: '#8a7fa2', fontSize: 12, marginTop: 2 },
  bookingScheduleRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  bookingScheduleText: { color: '#6f6287', fontSize: 11, fontWeight: '600' },
  summaryPrice: { color: '#93f72b', fontWeight: '700', fontSize: 14 },
  totalBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 24,
    padding: 16,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(112,0,255,0.25)',
  },
  totalLabel: { color: '#6f6287', fontSize: 15, fontWeight: '600' },
  totalValue: { color: '#93f72b', fontSize: 22, fontWeight: '800' },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#93f72b',
    borderRadius: 999,
    paddingVertical: 15,
    marginTop: 8,
  },
  primaryBtnText: { color: '#0f172a', fontSize: 16, fontWeight: '800' },
  vnpayPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#2563eb',
    borderRadius: 999,
    paddingVertical: 16,
    marginTop: 8,
    marginBottom: 4,
  },
  vnpayPrimaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  secondaryOutlineBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: 'rgba(147,247,43,0.45)',
  },
  secondaryOutlineBtnText: { color: '#93f72b' },
  methodList: { gap: 10, marginBottom: 8 },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: 'rgba(128,55,244,0.12)',
  },
  methodCardSelected: {
    borderColor: '#93f72b',
    backgroundColor: 'rgba(147,247,43,0.08)',
  },
  methodCardDisabled: { opacity: 0.72 },
  methodIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodLabel: { color: '#2D1B69', fontSize: 14, fontWeight: '700' },
  methodSub: { color: '#8a7fa2', fontSize: 11, marginTop: 2 },
  recommendedBadge: {
    backgroundColor: 'rgba(147,247,43,0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  recommendedText: { color: '#93f72b', fontSize: 9, fontWeight: '800' },
  soonBadge: {
    backgroundColor: 'rgba(148,163,184,0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  soonText: { color: '#94a3b8', fontSize: 9, fontWeight: '700' },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: 'rgba(128,55,244,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: { borderColor: '#93f72b' },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#93f72b',
  },
  secureNote: { color: '#8a7fa2', fontSize: 12, textAlign: 'center', marginTop: 12 },
  centerBox: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  muted: { color: '#8a7fa2' },
  errorText: { color: '#ef4444', textAlign: 'center', lineHeight: 22, paddingHorizontal: 12 },
  successText: { color: '#93f72b', fontSize: 18, fontWeight: '700' },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: '#7000ff',
  },
  retryBtnText: { color: '#fff', fontWeight: '700' },
  courseImage: {
    width: '100%',
    height: 120,
    borderRadius: 14,
    marginBottom: 16,
    backgroundColor: '#ffffff',
  },
  amountBox: {
    alignItems: 'center',
    marginBottom: 16,
    padding: 15,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(128,55,244,0.14)',
  },
  amountLabel: { color: '#8a7fa2', fontSize: 13 },
  amountValue: { color: '#2D1B69', fontSize: 26, fontWeight: '800', marginTop: 4 },
  qrBox: { alignItems: 'center', marginBottom: 18 },
  qrImage: { width: 200, height: 200, borderRadius: 12, backgroundColor: '#fff' },
  qrHint: { color: '#8a7fa2', fontSize: 12, marginTop: 8 },
  bankBox: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(128,55,244,0.12)',
    gap: 12,
  },
  bankSectionTitle: { color: '#2D1B69', fontWeight: '800', marginBottom: 4 },
  bankRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bankLabel: { color: '#8a7fa2', fontSize: 11 },
  bankValue: { color: '#2D1B69', fontSize: 14, fontWeight: '600', marginTop: 2 },
  bankHighlight: { color: '#8037f4', fontSize: 16, fontWeight: '800' },
  copyBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(147,247,43,0.1)',
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
  },
  statusText: { color: '#6f6287', fontSize: 13 },
  note: { color: '#8a7fa2', fontSize: 12, textAlign: 'center', marginTop: 12, lineHeight: 18 },
});
