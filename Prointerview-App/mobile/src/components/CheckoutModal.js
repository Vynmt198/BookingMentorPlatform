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
        ? `Mua: ${course.title}`
        : 'Thanh toán khóa học';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            {step === 'loading' && (
              <View style={styles.centerBox}>
                <ActivityIndicator color="#7000ff" size="large" />
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
                <Ionicons name="checkmark-circle" size={52} color="#93f72b" />
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
                  <ActivityIndicator color="#93f72b" size="small" />
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
        <Ionicons name="copy-outline" size={16} color="#93f72b" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#0c081e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    borderWidth: 1,
    borderColor: 'rgba(147,247,43,0.12)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  title: { color: '#fff', fontSize: 17, fontWeight: '700', flex: 1, marginRight: 12 },
  body: { padding: 20, paddingBottom: 36 },
  centerBox: { alignItems: 'center', paddingVertical: 32, gap: 12 },
  muted: { color: '#94a3b8' },
  errorText: { color: '#fca5a5', textAlign: 'center', lineHeight: 22 },
  successText: { color: '#93f72b', fontSize: 18, fontWeight: '700' },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#7000ff',
  },
  retryBtnText: { color: '#fff', fontWeight: '700' },
  amountBox: {
    alignItems: 'center',
    marginBottom: 20,
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(112,0,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(112,0,255,0.3)',
  },
  amountLabel: { color: '#c4b5fd', fontSize: 13 },
  amountValue: { color: '#93f72b', fontSize: 28, fontWeight: '800', marginTop: 4 },
  qrBox: { alignItems: 'center', marginBottom: 20 },
  qrImage: { width: 220, height: 220, borderRadius: 12, backgroundColor: '#fff' },
  qrHint: { color: '#94a3b8', fontSize: 12, marginTop: 8 },
  bankBox: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(128,55,244,0.2)',
    gap: 12,
  },
  sectionTitle: { color: '#fff', fontWeight: '700', marginBottom: 4 },
  bankRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bankLabel: { color: '#64748b', fontSize: 11 },
  bankValue: { color: '#e2e8f0', fontSize: 14, fontWeight: '600', marginTop: 2 },
  bankHighlight: { color: '#93f72b', fontSize: 16, fontWeight: '800' },
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
  statusText: { color: '#94a3b8', fontSize: 13 },
  note: { color: '#64748b', fontSize: 11, textAlign: 'center', marginTop: 12, lineHeight: 16 },
});
