import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
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
import {
  BANK_TRANSFER,
  buildVietQrImageUrl,
  formatVnd,
  generateOrderNum,
  inferVietQrBankId,
} from '../config/paymentConfig';
import { checkoutCart } from '../services/cartApi';
import { enrollCourse, fetchTransferStatus } from '../services/paymentApi';

const C = {
  bg: '#f8f7ff',
  surface: '#ffffff',
  ink: '#2D1B69',
  muted: '#8a7fa2',
  purple: '#8037f4',
  lime: '#93f72b',
  border: 'rgba(45,27,105,0.08)',
};

/**
 * @param {'course'|'cart'} mode
 * @param {{ id, title, priceNum, image? }} [course]
 * @param {number} [cartTotal]
 */
export default function CheckoutModal({
  visible,
  onClose,
  mode = 'course',
  course,
  cartTotal = 0,
  onSuccess,
}) {
  const [step, setStep] = useState('loading');
  const [orderNum, setOrderNum] = useState(() => generateOrderNum());
  const [error, setError] = useState('');
  const [statusText, setStatusText] = useState('Đang chờ chuyển khoản…');
  const pollRef = useRef(null);
  const paidRef = useRef(false);

  const amount = mode === 'cart' ? cartTotal : (course?.priceNum || 0);
  const vietQrBankId = useMemo(() => inferVietQrBankId(), []);
  const vietQrUrl = useMemo(
    () => buildVietQrImageUrl(vietQrBankId, BANK_TRANSFER.accountNumber, amount, orderNum),
    [vietQrBankId, amount, orderNum],
  );

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
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
        setStep('success');
        setStatusText('Thanh toán thành công!');
        setTimeout(() => {
          onSuccess?.();
          onClose?.();
        }, 1500);
      } else if (r.status === 'expired') {
        stopPolling();
        setError('Đơn hàng đã hết hạn. Vui lòng tạo đơn mới.');
        setStep('error');
      }
    };
    setTimeout(poll, 2000);
    pollRef.current = setInterval(poll, 3000);
  };

  const createOrder = async () => {
    setStep('loading');
    setError('');
    paidRef.current = false;
    const newOrder = generateOrderNum();
    setOrderNum(newOrder);

    if (mode === 'cart') {
      const res = await checkoutCart({ paymentMethod: 'transfer', orderNum: newOrder });
      if (!res.success) {
        setError(res.error || 'Không tạo được đơn giỏ hàng.');
        setStep('error');
        return;
      }
      const ref = res.orderNum || newOrder;
      setOrderNum(ref);
      setStep('awaiting');
      startPolling(ref);
      return;
    }

    if (!course?.id) {
      setError('Thiếu thông tin khóa học.');
      setStep('error');
      return;
    }

    if (!course.priceNum || course.priceNum <= 0) {
      const freeRes = await enrollCourse(course.id);
      if (freeRes.success) {
        setStep('success');
        setTimeout(() => {
          onSuccess?.();
          onClose?.();
        }, 1200);
        return;
      }
      setError(freeRes.error || 'Ghi danh miễn phí thất bại.');
      setStep('error');
      return;
    }

    const res = await enrollCourse(course.id, { paymentMethod: 'transfer', orderNum: newOrder });
    if (!res.success) {
      setError(res.error || 'Không tạo được đơn ghi danh.');
      setStep('error');
      return;
    }
    const ref = res.orderNum || res.enrollment?.paymentRef || newOrder;
    setOrderNum(ref);
    setStep('awaiting');
    startPolling(ref);
  };

  useEffect(() => {
    if (visible) {
      createOrder();
    } else {
      stopPolling();
      setStep('loading');
      setError('');
    }
    return stopPolling;
  }, [visible, mode, course?.id, cartTotal]);

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

  const title =
    mode === 'cart'
      ? 'Thanh toán giỏ hàng'
      : course?.title
        ? course.title
        : 'Thanh toán khóa học';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={styles.headerLabel}>Thanh toán</Text>
              <Text style={styles.title} numberOfLines={2}>{title}</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={22} color={C.ink} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            {step === 'loading' && (
              <View style={styles.centerBox}>
                <ActivityIndicator color={C.purple} size="large" />
                <Text style={styles.muted}>Đang tạo đơn hàng…</Text>
              </View>
            )}

            {step === 'error' && (
              <View style={styles.centerBox}>
                <Ionicons name="alert-circle" size={44} color="#ef4444" />
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={createOrder}>
                  <Text style={styles.retryBtnText}>Thử lại</Text>
                </TouchableOpacity>
              </View>
            )}

            {step === 'success' && (
              <View style={styles.centerBox}>
                <Ionicons name="checkmark-circle" size={52} color={C.lime} />
                <Text style={styles.successText}>Thanh toán thành công!</Text>
              </View>
            )}

            {step === 'awaiting' && (
              <>
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
                  <Text style={styles.sectionTitle}>Thông tin chuyển khoản</Text>
                  <BankRow label="Ngân hàng" value={BANK_TRANSFER.bankName || '—'} onCopy={() => copyText(BANK_TRANSFER.bankName, 'tên ngân hàng')} />
                  <BankRow label="Số TK" value={BANK_TRANSFER.accountNumber || 'Chưa cấu hình'} onCopy={() => copyText(BANK_TRANSFER.accountNumber, 'số tài khoản')} />
                  <BankRow label="Chủ TK" value={BANK_TRANSFER.accountOwner || '—'} onCopy={() => copyText(BANK_TRANSFER.accountOwner, 'chủ tài khoản')} />
                  <BankRow label="Nội dung CK" value={orderNum} highlight onCopy={() => copyText(orderNum, 'nội dung chuyển khoản')} />
                </View>

                <View style={styles.statusBox}>
                  <ActivityIndicator color={C.lime} size="small" />
                  <Text style={styles.statusText}>{statusText}</Text>
                </View>
                <Text style={styles.note}>
                  Hệ thống tự xác nhận khi tiền vào (SePay). Giữ nguyên nội dung {orderNum}.
                </Text>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
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
        <Ionicons name="copy-outline" size={16} color={C.lime} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(45,27,105,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: C.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    borderWidth: 1,
    borderColor: C.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,55,244,0.12)',
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  headerLabel: {
    color: C.purple,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  title: { color: C.ink, fontSize: 16, fontWeight: '800', marginTop: 2 },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(128,55,244,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { padding: 20, paddingBottom: 36 },
  centerBox: { alignItems: 'center', paddingVertical: 32, gap: 12 },
  muted: { color: C.muted },
  errorText: { color: '#ef4444', textAlign: 'center', lineHeight: 22 },
  successText: { color: C.lime, fontSize: 18, fontWeight: '700' },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: C.purple,
  },
  retryBtnText: { color: '#fff', fontWeight: '700' },
  amountBox: {
    alignItems: 'center',
    marginBottom: 20,
    padding: 18,
    borderRadius: 16,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: 'rgba(128,55,244,0.18)',
  },
  amountLabel: { color: C.muted, fontSize: 13 },
  amountValue: { color: C.lime, fontSize: 28, fontWeight: '800', marginTop: 4 },
  qrBox: { alignItems: 'center', marginBottom: 20 },
  qrImage: { width: 220, height: 220, borderRadius: 16, backgroundColor: '#fff' },
  qrHint: { color: C.muted, fontSize: 12, marginTop: 8 },
  bankBox: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
    gap: 12,
  },
  sectionTitle: { color: C.ink, fontWeight: '800', marginBottom: 4 },
  bankRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bankLabel: { color: C.muted, fontSize: 11 },
  bankValue: { color: C.ink, fontSize: 14, fontWeight: '600', marginTop: 2 },
  bankHighlight: { color: C.purple, fontSize: 16, fontWeight: '800' },
  copyBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(147,247,43,0.12)',
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
  },
  statusText: { color: C.muted, fontSize: 13 },
  note: { color: C.muted, fontSize: 12, textAlign: 'center', marginTop: 12, lineHeight: 18 },
});
