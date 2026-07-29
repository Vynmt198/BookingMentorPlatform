import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { mentorApi } from '../services/roleApi';
import { authFetch } from '../utils/mobileAuth';

function ScreenShell({ title, onBack, children }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrap, { paddingTop: Math.max(insets.top, 8) }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#2D1B69" />
        </TouchableOpacity>
        <Text style={styles.title}>{title}</Text>
        <View style={{ width: 36 }} />
      </View>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </View>
  );
}

export function MentorAnalyticsScreen({ data, onBack }) {
  const analytics = data?.analytics || {};
  const stats = analytics.stats || analytics;
  const weekly = analytics.weeklyStats || [];
  const mentees = analytics.mentees || [];

  return (
    <ScreenShell title="Phân tích mentor" onBack={onBack}>
      <View style={styles.grid}>
        {[
          ['Buổi học', stats.totalSessions ?? stats.sessions ?? '—'],
          ['Học viên', stats.totalMentees ?? stats.mentees ?? '—'],
          ['Đánh giá TB', stats.avgRating ?? '—'],
          ['Cải thiện', stats.improvingRate ?? stats.improving ?? '—'],
        ].map(([label, value]) => (
          <View key={label} style={styles.statCard}>
            <Text style={styles.statValue}>{String(value)}</Text>
            <Text style={styles.statLabel}>{label}</Text>
          </View>
        ))}
      </View>
      {weekly.length ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Theo tuần</Text>
          {weekly.slice(0, 8).map((row, i) => (
            <Text key={i} style={styles.rowText}>
              {row.label || row.week || `Tuần ${i + 1}`}: {row.sessions ?? row.count ?? 0} buổi
            </Text>
          ))}
        </View>
      ) : null}
      {mentees.length ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Học viên nổi bật</Text>
          {mentees.slice(0, 10).map((m, i) => (
            <Text key={m.id || i} style={styles.rowText}>
              {m.name || 'Học viên'} · điểm {m.score ?? m.avgScore ?? '—'}
            </Text>
          ))}
        </View>
      ) : (
        <Text style={styles.muted}>Chưa có đủ dữ liệu phân tích.</Text>
      )}
    </ScreenShell>
  );
}

export function MentorPeerReviewScreen({ onBack, onRefresh }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [drafts, setDrafts] = useState({});

  const load = async () => {
    setLoading(true);
    const res = await mentorApi.getPeerReviews();
    setLoading(false);
    if (!res.success) {
      setError(res.error || 'Không tải được hàng chờ.');
      return;
    }
    setItems(res.items || res.courses || res.queue || []);
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (courseId) => {
    const d = drafts[courseId] || {};
    setBusyId(courseId);
    const res = await mentorApi.submitPeerReview(courseId, {
      contentRating: Number(d.contentRating) || 4,
      qualityRating: Number(d.qualityRating) || 4,
      priceValueRating: Number(d.priceValueRating) || 4,
      feedback: String(d.feedback || '').trim(),
    });
    setBusyId('');
    if (!res.success) {
      setError(res.error || 'Gửi review thất bại.');
      return;
    }
    onRefresh?.();
    await load();
  };

  return (
    <ScreenShell title="Peer review khóa học" onBack={onBack}>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading ? <ActivityIndicator color="#8037f4" /> : null}
      {!loading && !items.length ? <Text style={styles.muted}>Không còn khóa cần peer-review.</Text> : null}
      {items.map((item) => {
        const id = item.courseId || item._id || item.id;
        const d = drafts[id] || {};
        return (
          <View key={id} style={styles.card}>
            <Text style={styles.cardTitle}>{item.title || item.courseTitle || 'Khóa học'}</Text>
            <Text style={styles.muted}>{item.mentorName || item.authorName || ''}</Text>
            <TextInput
              style={styles.input}
              placeholder="Nhận xét ngắn..."
              placeholderTextColor="#94a3b8"
              value={d.feedback || ''}
              onChangeText={(v) => setDrafts((p) => ({ ...p, [id]: { ...d, feedback: v } }))}
            />
            <TouchableOpacity style={styles.primaryBtn} onPress={() => submit(id)} disabled={busyId === id}>
              {busyId === id ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>Gửi peer review</Text>
              )}
            </TouchableOpacity>
          </View>
        );
      })}
    </ScreenShell>
  );
}

export function MentorSessionFeedbackScreen({ bookingId, booking, onBack, onDone }) {
  const [rating, setRating] = useState(5);
  const [strengths, setStrengths] = useState('');
  const [improvements, setImprovements] = useState('');
  const [recommendation, setRecommendation] = useState('');
  const [generalNotes, setGeneralNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const existing = booking?.mentorSummary;

  useEffect(() => {
    if (!existing) return;
    setRating(existing.rating || 5);
    setStrengths(existing.strengths || '');
    setImprovements(existing.improvements || '');
    setRecommendation(existing.recommendation || '');
    setGeneralNotes(existing.generalNotes || '');
  }, [existing]);

  const submit = async () => {
    setBusy(true);
    setError('');
    const res = await mentorApi.submitSummary(bookingId, {
      rating,
      strengths,
      improvements,
      recommendation,
      generalNotes,
    });
    setBusy(false);
    if (!res.success) {
      setError(res.error || 'Không gửi được tổng kết.');
      return;
    }
    onDone?.(res.booking);
  };

  return (
    <ScreenShell title="Tổng kết buổi học" onBack={onBack}>
      <Text style={styles.muted}>
        {booking?.customerName || 'Học viên'} · {booking?.date} {booking?.timeSlot}
      </Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Text style={styles.label}>Đánh giá (1–5)</Text>
      <View style={styles.ratingRow}>
        {[1, 2, 3, 4, 5].map((n) => (
          <TouchableOpacity key={n} onPress={() => setRating(n)} style={[styles.star, rating >= n && styles.starOn]}>
            <Text style={styles.starText}>{n}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {[
        ['Điểm mạnh', strengths, setStrengths],
        ['Cần cải thiện', improvements, setImprovements],
        ['Lời khuyên', recommendation, setRecommendation],
        ['Ghi chú chung', generalNotes, setGeneralNotes],
      ].map(([label, value, setter]) => (
        <View key={label}>
          <Text style={styles.label}>{label}</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            multiline
            value={value}
            onChangeText={setter}
            placeholderTextColor="#94a3b8"
            placeholder={`Nhập ${label.toLowerCase()}...`}
          />
        </View>
      ))}
      <TouchableOpacity style={styles.primaryBtn} onPress={submit} disabled={busy || !!existing?.submittedAt}>
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryBtnText}>{existing?.submittedAt ? 'Đã gửi tổng kết' : 'Gửi tổng kết'}</Text>
        )}
      </TouchableOpacity>
    </ScreenShell>
  );
}

export function InfoContentScreen({ pageKey, onBack, onOpenPricingCheckout }) {
  const [plans, setPlans] = useState(null);
  const [verifyMsg, setVerifyMsg] = useState('');

  useEffect(() => {
    if (pageKey !== 'pricing') return;
    (async () => {
      try {
        const res = await authFetch('/api/plans/current', { headers: { Accept: 'application/json' } });
        const body = await res.json().catch(() => ({}));
        if (body.success) setPlans(body);
      } catch {
        /* ignore */
      }
    })();
  }, [pageKey]);

  useEffect(() => {
    if (pageKey !== 'verify_email') return;
    setVerifyMsg('Mở link xác thực từ email để kích hoạt tài khoản. Nếu đã xác thực, bạn có thể đăng nhập bình thường.');
  }, [pageKey]);

  const content = useMemo(() => {
    switch (pageKey) {
      case 'about':
        return {
          title: 'Về chúng tôi',
          sections: [
            ['Sứ mệnh', 'Giúp ứng viên Việt Nam luyện phỏng vấn bài bản, đo được tiến bộ và tự tin hơn trước vòng tuyển dụng thật.'],
            ['ProInterview làm gì', 'Kết hợp phỏng vấn AI, phân tích CV theo JD, mentor 1:1 và lộ trình học để cải thiện từng bước.'],
            ['Giá trị cốt lõi', 'Rõ ràng, thực tế, tập trung hành động — không hứa quá đà.'],
          ],
        };
      case 'blog':
        return {
          title: 'Blog',
          sections: [
            ['Sắp ra mắt', 'Các bài viết về phỏng vấn, CV và lộ trình nghề nghiệp sẽ xuất hiện tại đây.'],
          ],
        };
      case 'terms':
        return {
          title: 'Điều khoản sử dụng',
          sections: [
            ['Chấp nhận điều khoản', 'Khi dùng ProInterview, bạn đồng ý tuân thủ các điều khoản và chính sách của nền tảng.'],
            ['Tài khoản', 'Bạn chịu trách nhiệm bảo mật thông tin đăng nhập và hoạt động trên tài khoản của mình.'],
            ['Dịch vụ', 'Chúng tôi cung cấp công cụ luyện phỏng vấn, kết nối mentor và nội dung học — không đảm bảo kết quả tuyển dụng.'],
          ],
        };
      case 'privacy':
        return {
          title: 'Chính sách bảo mật',
          sections: [
            ['Dữ liệu thu thập', 'Thông tin tài khoản, hồ sơ, lịch sử booking/khóa học và dữ liệu kỹ thuật cần thiết để vận hành dịch vụ.'],
            ['Mục đích', 'Cung cấp dịch vụ, cải thiện trải nghiệm, hỗ trợ thanh toán và bảo mật hệ thống.'],
            ['Liên hệ', 'Nếu cần chỉnh sửa hoặc xóa dữ liệu cá nhân, hãy liên hệ đội ngũ ProInterview qua email hỗ trợ.'],
          ],
        };
      case 'pricing':
        return {
          title: 'Bảng giá',
          sections: [],
        };
      case 'verify_email':
        return {
          title: 'Xác thực email',
          sections: [['Trạng thái', verifyMsg]],
        };
      case 'dashboard':
        return {
          title: 'Tổng quan',
          sections: [
            ['Dashboard', 'Trên mobile, hãy dùng tab Trang chủ / Cá nhân. Mentor dùng cổng cố vấn ở thanh điều hướng dưới.'],
          ],
        };
      default:
        return { title: 'Thông tin', sections: [] };
    }
  }, [pageKey, verifyMsg]);

  return (
    <ScreenShell title={content.title} onBack={onBack}>
      {content.sections.map(([h, body]) => (
        <View key={h} style={styles.card}>
          <Text style={styles.cardTitle}>{h}</Text>
          <Text style={styles.rowText}>{body}</Text>
        </View>
      ))}
      {pageKey === 'pricing' ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Gói hiện tại</Text>
          <Text style={styles.rowText}>
            {plans?.plan || plans?.currentPlan || 'free'}
            {plans?.planExpiresAt ? ` · hết hạn ${String(plans.planExpiresAt).slice(0, 10)}` : ''}
          </Text>
          <Text style={styles.muted}>Student 150.000đ/tháng · Professional 500.000đ/tháng</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => onOpenPricingCheckout?.('student')}>
            <Text style={styles.primaryBtnText}>Nâng cấp Student</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: '#2D1B69', marginTop: 8 }]}
            onPress={() => onOpenPricingCheckout?.('professional')}
          >
            <Text style={styles.primaryBtnText}>Nâng cấp Professional</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#f6f3ff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  title: { fontSize: 17, fontWeight: '800', color: '#2D1B69' },
  body: { padding: 16, paddingBottom: 40, gap: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
  },
  statValue: { fontSize: 20, fontWeight: '800', color: '#8037f4' },
  statLabel: { marginTop: 4, fontSize: 12, color: 'rgba(45,27,105,0.6)', fontWeight: '600' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 14, gap: 8 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#2D1B69' },
  rowText: { fontSize: 13, color: 'rgba(45,27,105,0.78)', lineHeight: 19 },
  muted: { fontSize: 13, color: 'rgba(45,27,105,0.55)' },
  error: { color: '#b91c1c', fontWeight: '600' },
  label: { fontSize: 12, fontWeight: '700', color: '#2D1B69', marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(45,27,105,0.12)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    color: '#2D1B69',
  },
  textarea: { minHeight: 80, textAlignVertical: 'top' },
  primaryBtn: {
    backgroundColor: '#8037f4',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryBtnText: { color: '#fff', fontWeight: '800' },
  ratingRow: { flexDirection: 'row', gap: 8 },
  star: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#eee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  starOn: { backgroundColor: '#8037f4' },
  starText: { fontWeight: '800', color: '#fff' },
});
