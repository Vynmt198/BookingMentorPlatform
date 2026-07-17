import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { formatVnd } from '../config/paymentConfig';

const CONFIG = {
  processing: {
    icon: 'time-outline',
    color: '#60a5fa',
    title: 'Đang xác nhận thanh toán',
    subtitle: 'Hệ thống đang kiểm tra kết quả với VNPay…',
  },
  success: {
    icon: 'checkmark-circle',
    color: '#93f72b',
    title: 'Thanh toán thành công',
    subtitle: 'Khóa học đã được mở và lưu vào tài khoản của bạn.',
  },
  failed: {
    icon: 'close-circle',
    color: '#fb7185',
    title: 'Thanh toán thất bại',
    subtitle: 'Giao dịch chưa hoàn tất hoặc đã bị hủy.',
  },
  error: {
    icon: 'alert-circle',
    color: '#fbbf24',
    title: 'Không thể xác nhận',
    subtitle: 'Có lỗi khi kiểm tra kết quả giao dịch.',
  },
};

function DetailRow({ label, value }) {
  if (!value) return null;
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function formatPayDate(value) {
  const raw = String(value || '');
  if (!/^\d{14}$/.test(raw)) return raw;
  return `${raw.slice(6, 8)}/${raw.slice(4, 6)}/${raw.slice(0, 4)} ${raw.slice(8, 10)}:${raw.slice(10, 12)}:${raw.slice(12, 14)}`;
}

export default function PaymentResultScreen({
  status = 'processing',
  message = '',
  details = {},
  paymentType = 'course',
  onContinue,
  onRetry,
}) {
  const config = CONFIG[status] || CONFIG.error;
  const amount = Number(details.amount);
  const isBooking = paymentType === 'booking';
  const subtitle =
    status === 'success' && isBooking
      ? 'Lịch hẹn đã được thanh toán và lưu vào tài khoản của bạn.'
      : config.subtitle;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={[styles.iconCircle, { backgroundColor: `${config.color}18` }]}>
        {status === 'processing' ? (
          <ActivityIndicator size="large" color={config.color} />
        ) : (
          <Ionicons name={config.icon} size={68} color={config.color} />
        )}
      </View>

      <Text style={[styles.title, { color: config.color }]}>{config.title}</Text>
      <Text style={styles.subtitle}>{message || subtitle}</Text>

      {status !== 'processing' ? (
        <View style={styles.card}>
          <DetailRow
            label="Số tiền"
            value={Number.isFinite(amount) && amount > 0 ? formatVnd(amount) : ''}
          />
          <DetailRow label="Mã giao dịch" value={details.transactionNo} />
          <DetailRow label="Mã đơn hàng" value={details.txnRef} />
          <DetailRow label="Ngân hàng" value={details.bankCode} />
          <DetailRow label="Thời gian" value={formatPayDate(details.payDate)} />
          <DetailRow label="Mã phản hồi" value={details.responseCode} />
        </View>
      ) : null}

      {status === 'success' ? (
        <TouchableOpacity style={styles.primaryButton} onPress={onContinue}>
          <Text style={styles.primaryText}>{isBooking ? 'Xem lịch hẹn của tôi' : 'Xem khóa học của tôi'}</Text>
          <Ionicons name="arrow-forward" size={18} color="#0c081e" />
        </TouchableOpacity>
      ) : null}

      {status === 'failed' ? (
        <>
          <TouchableOpacity style={styles.primaryButton} onPress={onRetry}>
            <Text style={styles.primaryText}>Thử thanh toán lại</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={onContinue}>
            <Text style={styles.secondaryText}>{isBooking ? 'Về trang Mentor' : 'Về trang khóa học'}</Text>
          </TouchableOpacity>
        </>
      ) : null}

      {status === 'error' ? (
        <>
          <TouchableOpacity style={styles.primaryButton} onPress={onRetry}>
            <Text style={styles.primaryText}>Kiểm tra lại</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={onContinue}>
            <Text style={styles.secondaryText}>Về trang chủ</Text>
          </TouchableOpacity>
        </>
      ) : null}

      <View style={styles.security}>
        <Ionicons name="shield-checkmark-outline" size={16} color="#94a3b8" />
        <Text style={styles.securityText}>Kết quả được xác thực bằng chữ ký VNPay</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0c081e' },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  iconCircle: {
    width: 124,
    height: 124,
    borderRadius: 62,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: { fontSize: 27, fontWeight: '900', textAlign: 'center' },
  subtitle: {
    color: '#cbd5e1',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 28,
    maxWidth: 360,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    padding: 18,
    borderRadius: 18,
    backgroundColor: '#17112d',
    borderWidth: 1,
    borderColor: 'rgba(147,247,43,0.14)',
    marginBottom: 24,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 18,
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  detailLabel: { color: '#94a3b8', fontSize: 13 },
  detailValue: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
    flexShrink: 1,
  },
  primaryButton: {
    width: '100%',
    maxWidth: 420,
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: '#93f72b',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
  },
  primaryText: { color: '#0c081e', fontSize: 15, fontWeight: '900' },
  secondaryButton: {
    width: '100%',
    maxWidth: 420,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  secondaryText: { color: '#c4b5fd', fontSize: 14, fontWeight: '700' },
  security: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 28,
  },
  securityText: { color: '#64748b', fontSize: 12 },
});
