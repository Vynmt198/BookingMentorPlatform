import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Alert,
  StyleSheet,
  Image,
  Modal,
  Pressable,
  Platform,
  Linking,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { adminApi, mentorApi } from '../services/roleApi';
import { resolveMediaUrl } from '../utils/mediaUrl';
import MentorScheduleScreen from './MentorScheduleScreen';

function formatVnd(n) {
  return `${(Number(n) || 0).toLocaleString('vi-VN')}đ`;
}

/** Web-safe message (Alert.alert trên web thường im lặng). */
function showMsg(title, message) {
  const text = [title, message].filter(Boolean).join('\n');
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.alert(text);
    return;
  }
  Alert.alert(title || 'Thông báo', message || '');
}

function askConfirm(title, message, { confirmText = 'OK', destructive = false } = {}) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return Promise.resolve(window.confirm([title, message].filter(Boolean).join('\n')));
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Hủy', style: 'cancel', onPress: () => resolve(false) },
      {
        text: confirmText,
        style: destructive ? 'destructive' : 'default',
        onPress: () => resolve(true),
      },
    ]);
  });
}

async function runApi(action, { successMsg, onDone } = {}) {
  const r = await action();
  if (!r?.success) {
    showMsg('Không thành công', r?.error || 'API trả lỗi. Thử lại.');
    return false;
  }
  if (successMsg) showMsg('Thành công', successMsg);
  onDone?.();
  return true;
}

function firstName(name) {
  const parts = String(name || '').trim().split(/\s+/);
  return parts[parts.length - 1] || name || 'bạn';
}

function statusLabel(status) {
  const map = {
    pending: 'Chờ xử lý',
    reviewing: 'Đang xem',
    resolved: 'Đã xử lý',
    dismissed: 'Bác bỏ',
    confirmed: 'Đã xác nhận',
    in_progress: 'Đang diễn ra',
    completed: 'Hoàn thành',
    cancelled: 'Đã hủy',
    no_show: 'Vắng mặt',
    paid: 'Đã thanh toán',
    approved: 'Đã duyệt',
    rejected: 'Từ chối',
    published: 'Đã xuất bản',
    draft: 'Nháp',
    archived: 'Đã lưu trữ',
    pending_review: 'Chờ duyệt',
    pending_update: 'Chờ cập nhật',
  };
  return map[status] || status || '—';
}

/** Modal nhập lý do / text — dùng chung từ chối, hủy, commission… */
function TextPromptModal({
  visible,
  title,
  subtitle,
  placeholder = 'Nhập nội dung…',
  confirmLabel = 'Xác nhận',
  initialValue = '',
  multiline = true,
  onCancel,
  onConfirm,
}) {
  const [value, setValue] = useState(initialValue);
  React.useEffect(() => {
    if (visible) setValue(initialValue || '');
  }, [visible, initialValue]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={s.promptBackdrop} onPress={onCancel}>
        <Pressable style={s.promptCard} onPress={(e) => e.stopPropagation?.()}>
          <Text style={s.promptTitle}>{title}</Text>
          {subtitle ? <Text style={s.promptSub}>{subtitle}</Text> : null}
          <TextInput
            style={[s.input, multiline && { minHeight: 88, textAlignVertical: 'top' }]}
            value={value}
            onChangeText={setValue}
            placeholder={placeholder}
            placeholderTextColor="#94a3b8"
            multiline={multiline}
            autoFocus
          />
          <View style={s.btnRow}>
            <ActionBtn label="Hủy" tone="ghost" onPress={onCancel} />
            <ActionBtn
              label={confirmLabel}
              onPress={() => onConfirm?.(String(value || '').trim())}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** Modal 2 ô % phí platform (booking / course) → gửi rate 0–1 */
function CommissionModal({ visible, mentor, onCancel, onSaved }) {
  const bookingPct = mentor?.pricing?.platformFeeRate != null
    ? String(Math.round(Number(mentor.pricing.platformFeeRate) * 100))
    : '';
  const coursePct = mentor?.pricing?.coursePlatformFeeRate != null
    ? String(Math.round(Number(mentor.pricing.coursePlatformFeeRate) * 100))
    : '';
  const [booking, setBooking] = useState(bookingPct);
  const [course, setCourse] = useState(coursePct);
  const [busy, setBusy] = useState(false);

  React.useEffect(() => {
    if (visible) {
      setBooking(bookingPct);
      setCourse(coursePct);
    }
  }, [visible, mentor?._id || mentor?.id]);

  const toRate = (pctStr) => {
    const t = String(pctStr || '').trim();
    if (!t) return null;
    const n = Number(t);
    if (!Number.isFinite(n) || n <= 0 || n > 100) return NaN;
    return Math.round(n) / 100;
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={s.promptBackdrop} onPress={onCancel}>
        <Pressable style={s.promptCard} onPress={(e) => e.stopPropagation?.()}>
          <Text style={s.promptTitle}>Phí nền tảng</Text>
          <Text style={s.promptSub}>
            {mentor?.name || mentor?.userId?.name || 'Mentor'} — nhập % (1–100), để trống = bỏ override
          </Text>
          <Text style={s.fieldLabel}>Phí booking (%)</Text>
          <TextInput
            style={s.input}
            value={booking}
            onChangeText={(v) => setBooking(v.replace(/[^\d]/g, ''))}
            placeholder="VD: 30"
            placeholderTextColor="#94a3b8"
            keyboardType="number-pad"
          />
          <Text style={s.fieldLabel}>Phí khóa học (%)</Text>
          <TextInput
            style={s.input}
            value={course}
            onChangeText={(v) => setCourse(v.replace(/[^\d]/g, ''))}
            placeholder="VD: 20"
            placeholderTextColor="#94a3b8"
            keyboardType="number-pad"
          />
          <View style={s.btnRow}>
            <ActionBtn label="Hủy" tone="ghost" onPress={onCancel} disabled={busy} />
            <ActionBtn
              label="Lưu"
              busy={busy}
              onPress={async () => {
                const bookingPlatformFeeRate = toRate(booking);
                const coursePlatformFeeRate = toRate(course);
                if (Number.isNaN(bookingPlatformFeeRate) || Number.isNaN(coursePlatformFeeRate)) {
                  showMsg('Lỗi', 'Phí phải từ 1–100%, hoặc để trống.');
                  return;
                }
                if (bookingPlatformFeeRate == null && coursePlatformFeeRate == null) {
                  showMsg('Lỗi', 'Nhập ít nhất một mức phí.');
                  return;
                }
                setBusy(true);
                const body = {};
                if (booking.trim() !== '') body.bookingPlatformFeeRate = bookingPlatformFeeRate;
                if (course.trim() !== '') body.coursePlatformFeeRate = coursePlatformFeeRate;
                const r = await adminApi.updateMentorCommission(mentor._id || mentor.id, body);
                setBusy(false);
                if (!r.success) {
                  showMsg('Lỗi', r.error || 'Không lưu được');
                  return;
                }
                onSaved?.();
              }}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function ChipRow({ options, value, onChange }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={s.chipScroll}
      contentContainerStyle={s.chipRow}
      nestedScrollEnabled
      keyboardShouldPersistTaps="handled"
    >
      {options.map((opt) => {
        const active = value === opt.id;
        return (
          <Pressable
            key={opt.id}
            style={[s.chip, active && s.chipActive]}
            onPress={() => onChange(opt.id)}
            hitSlop={6}
          >
            <Text style={[s.chipText, active && s.chipTextActive]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function Hero({ eyebrow, title, accent, subtitle }) {
  return (
    <View style={s.hero}>
      <LinearGradient colors={['#ffffff', '#f3ebff']} style={StyleSheet.absoluteFill} />
      <Text style={s.eyebrow}>{eyebrow}</Text>
      <Text style={s.heroTitle}>
        {title}
        {accent ? <Text style={s.heroAccent}> {accent}</Text> : null}
      </Text>
      {subtitle ? <Text style={s.heroSub}>{subtitle}</Text> : null}
    </View>
  );
}

/** Home: Xin chào + tên. Tab con: eyebrow + tiêu đề giống trang Cá nhân. */
function WelcomeHeader({ user, title, subtitle, eyebrow, onProfilePress }) {
  const uri = resolveMediaUrl(user?.avatar);

  if (title) {
    return (
      <View style={s.welcomeBlock}>
        {eyebrow ? <Text style={s.welcomeEyebrow}>{eyebrow}</Text> : null}
        <Text style={s.welcomePageTitle}>{title}</Text>
        {subtitle ? <Text style={s.welcomePageSub}>{subtitle}</Text> : null}
      </View>
    );
  }

  return (
    <View style={s.welcomeBlock}>
      <TouchableOpacity
        style={s.welcomeRow}
        activeOpacity={onProfilePress ? 0.85 : 1}
        onPress={onProfilePress}
        disabled={!onProfilePress}
      >
        <View style={s.welcomeAvatar}>
          {uri ? (
            <Image source={{ uri }} style={s.welcomeAvatarImg} />
          ) : (
            <Ionicons name="person" size={20} color="#8037f4" />
          )}
        </View>
        <View style={s.welcomeTextCol}>
          <Text style={s.welcomeHello}>Xin chào</Text>
          <Text style={s.welcomeName} numberOfLines={1}>
            {user?.name || 'Bạn'}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

function StatCard({ icon, label, value, tone = 'purple', onPress }) {
  const iconBg = tone === 'lime' ? 'rgba(147,247,43,0.18)' : tone === 'amber' ? 'rgba(245,158,11,0.15)' : 'rgba(128,55,244,0.12)';
  const iconColor = tone === 'lime' ? '#3f7d00' : tone === 'amber' ? '#b45309' : '#8037f4';
  const Inner = (
    <>
      <View style={[s.statIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <Text style={s.statValue} numberOfLines={1}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </>
  );
  if (onPress) {
    return (
      <TouchableOpacity style={s.statCard} onPress={onPress} activeOpacity={0.85}>
        {Inner}
      </TouchableOpacity>
    );
  }
  return <View style={s.statCard}>{Inner}</View>;
}

function Section({ title, actionLabel, onAction, children }) {
  return (
    <View style={s.section}>
      <View style={s.sectionHead}>
        <Text style={s.sectionTitle}>{title}</Text>
        {actionLabel ? (
          <TouchableOpacity onPress={onAction}>
            <Text style={s.sectionAction}>{actionLabel}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function Card({ children, onPress }) {
  if (onPress) {
    return (
      <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.88}>
        {children}
      </TouchableOpacity>
    );
  }
  return <View style={s.card}>{children}</View>;
}

function Badge({ label, tone = 'neutral' }) {
  const bg =
    tone === 'ok' ? 'rgba(147,247,43,0.22)' :
    tone === 'warn' ? 'rgba(251,191,36,0.22)' :
    tone === 'bad' ? 'rgba(239,68,68,0.14)' :
    'rgba(128,55,244,0.1)';
  const color =
    tone === 'ok' ? '#3f7d00' :
    tone === 'warn' ? '#b45309' :
    tone === 'bad' ? '#dc2626' :
    '#8037f4';
  return (
    <View style={[s.badge, { backgroundColor: bg }]}>
      <Text style={[s.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

function ActionBtn({ label, onPress, tone = 'primary', busy = false, disabled = false }) {
  return (
    <Pressable
      style={({ pressed }) => [
        s.btn,
        tone === 'success' && s.btnSuccess,
        tone === 'danger' && s.btnDanger,
        tone === 'ghost' && s.btnGhost,
        (busy || disabled) && { opacity: 0.55 },
        pressed && !busy && !disabled && { opacity: 0.75, transform: [{ scale: 0.98 }] },
      ]}
      onPress={() => {
        if (busy || disabled) return;
        try {
          onPress?.();
        } catch (e) {
          console.warn('ActionBtn onPress', e);
        }
      }}
      disabled={busy || disabled}
      hitSlop={10}
      android_ripple={{ color: 'rgba(45,27,105,0.12)' }}
    >
      {busy ? (
        <ActivityIndicator size="small" color={tone === 'ghost' ? '#8037f4' : '#fff'} />
      ) : (
        <Text style={[s.btnText, tone === 'ghost' && s.btnGhostText]}>{label}</Text>
      )}
    </Pressable>
  );
}

function InfoModal({ visible, title, message, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.promptBackdrop} onPress={onClose}>
        <Pressable style={s.promptCard} onPress={(e) => e.stopPropagation?.()}>
          <Text style={s.promptTitle}>{title}</Text>
          {message ? <Text style={[s.promptSub, { marginTop: 10, marginBottom: 12 }]}>{message}</Text> : null}
          <ActionBtn label="Đóng" onPress={onClose} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function ConfirmModal({ visible, title, message, confirmLabel = 'Xác nhận', danger = false, onCancel, onConfirm }) {
  const [busy, setBusy] = useState(false);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={s.promptBackdrop} onPress={onCancel}>
        <Pressable style={s.promptCard} onPress={(e) => e.stopPropagation?.()}>
          <Text style={s.promptTitle}>{title}</Text>
          {message ? <Text style={[s.promptSub, { marginTop: 10, marginBottom: 12 }]}>{message}</Text> : null}
          <View style={s.btnRow}>
            <ActionBtn label="Hủy" tone="ghost" onPress={onCancel} disabled={busy} />
            <ActionBtn
              label={confirmLabel}
              tone={danger ? 'danger' : 'primary'}
              busy={busy}
              onPress={async () => {
                setBusy(true);
                try {
                  await onConfirm?.();
                } finally {
                  setBusy(false);
                }
              }}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function QueueTile({ icon, title, count, desc, onPress }) {
  return (
    <TouchableOpacity style={s.queueTile} onPress={onPress} activeOpacity={0.88}>
      <View style={s.queueIcon}>
        <Ionicons name={icon} size={18} color="#8037f4" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.queueTitle}>{title}</Text>
        <Text style={s.queueDesc}>{desc}</Text>
      </View>
      <View style={s.queueCountWrap}>
        <Text style={s.queueCount}>{count}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
    </TouchableOpacity>
  );
}

function EmptyState({ icon = 'file-tray-outline', text }) {
  return (
    <View style={s.empty}>
      <Ionicons name={icon} size={34} color="#b6a8cf" />
      <Text style={s.emptyText}>{text}</Text>
    </View>
  );
}

function LoadingBlock() {
  return (
    <View style={s.empty}>
      <ActivityIndicator color="#8037f4" size="large" />
      <Text style={s.emptyText}>Đang tải dữ liệu ProInterview…</Text>
    </View>
  );
}

function PersonRow({ name, meta, right, avatar }) {
  const uri = resolveMediaUrl(avatar);
  return (
    <View style={s.personRow}>
      {uri ? (
        <Image source={{ uri }} style={s.avatar} />
      ) : (
        <View style={s.avatarFallback}>
          <Text style={s.avatarText}>{(name || 'U').slice(0, 1).toUpperCase()}</Text>
        </View>
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.cardTitle} numberOfLines={1}>{name}</Text>
        {meta ? <Text style={s.cardSub} numberOfLines={2}>{meta}</Text> : null}
      </View>
      {right}
    </View>
  );
}

/* ───────── Admin ───────── */

function AdminHome({ data, user, onNavigate }) {
  const stats = data?.stats || {};
  const finance = data?.finance?.totals || {};
  const queues = data?.queues || {};
  const content = data?.content || null;
  const metrics = data?.interviewMetrics || null;
  const system = data?.system || null;
  const recent = stats.recentBookings || [];
  const plans = stats.plans || {};

  const journey = [
    {
      id: 'ops',
      number: '01',
      icon: 'construct-outline',
      title: 'Vận hành',
      desc: 'Booking · CK khóa · CK gói SePay.',
      color: '#8037f4',
      tab: 'admin_ops',
    },
    {
      id: 'mentors',
      number: '02',
      icon: 'school-outline',
      title: 'Mentor',
      desc: 'Duyệt hồ sơ cố vấn chờ phê duyệt.',
      color: '#93f72b',
      tab: 'admin_mentors',
    },
    {
      id: 'manage',
      number: '03',
      icon: 'documents-outline',
      title: 'Quản lý',
      desc: 'Users · khóa chờ · reviews · báo cáo.',
      color: '#f59e0b',
      tab: 'admin_content',
    },
  ];

  return (
    <View>
      <WelcomeHeader user={user} onProfilePress={() => onNavigate?.('profile')} />

      <View style={s.homeStatsRow}>
        <View style={s.homeStatPill}>
          <Text style={s.homeStatValue}>{stats.users ?? 0}</Text>
          <Text style={s.homeStatLabel}>Người dùng</Text>
        </View>
        <View style={s.homeStatPill}>
          <Text style={s.homeStatValue}>{stats.mentors ?? 0}</Text>
          <Text style={s.homeStatLabel}>Cố vấn</Text>
        </View>
        <View style={s.homeStatPill}>
          <Text style={s.homeStatValue}>{stats.bookings ?? 0}</Text>
          <Text style={s.homeStatLabel}>Lịch hẹn</Text>
        </View>
      </View>

      <View style={s.journeyCard}>
        <View style={s.journeyHead}>
          <View>
            <Text style={s.journeyEyebrow}>LỘ TRÌNH GỢI Ý</Text>
            <Text style={s.journeyTitle}>Luồng được khuyên dùng</Text>
          </View>
          <View style={s.journeySpark}>
            <Ionicons name="flash" size={16} color="#2D1B69" />
          </View>
        </View>
        {journey.map((step) => (
          <TouchableOpacity
            key={step.id}
            style={s.journeyStep}
            onPress={() => onNavigate?.(step.tab)}
            activeOpacity={0.86}
          >
            <View style={[s.journeyNumber, { backgroundColor: `${step.color}22` }]}>
              <Text style={[s.journeyNumberText, { color: step.color }]}>{step.number}</Text>
            </View>
            <View style={[s.journeyIcon, { borderColor: `${step.color}55` }]}>
              <Ionicons name={step.icon} size={17} color={step.color} />
            </View>
            <View style={s.journeyBody}>
              <Text style={s.journeyStepTitle}>{step.title}</Text>
              <Text style={s.journeyStepDesc} numberOfLines={1}>{step.desc}</Text>
            </View>
            <Ionicons name="chevron-forward" size={15} color="rgba(45,27,105,0.26)" />
          </TouchableOpacity>
        ))}
      </View>

      <View style={s.homeToolsRow}>
        <TouchableOpacity style={s.homeToolCard} onPress={() => onNavigate?.('admin_finance')} activeOpacity={0.88}>
          <View style={s.homeToolIcon}>
            <Ionicons name="wallet-outline" size={20} color="#8037f4" />
          </View>
          <Text style={s.homeToolTitle}>Tài chính</Text>
          <Text style={s.homeToolDesc} numberOfLines={2}>
            Tổng thu {formatVnd(finance.grossCollected)}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.homeToolCard} onPress={() => onNavigate?.('admin_ops')} activeOpacity={0.88}>
          <View style={s.homeToolIcon}>
            <Ionicons name="card-outline" size={20} color="#8037f4" />
          </View>
          <Text style={s.homeToolTitle}>Vận hành</Text>
          <Text style={s.homeToolDesc} numberOfLines={2}>
            {(queues.coursePayments || 0) + (queues.subscriptionPayments || 0)} CK chờ xử lý
          </Text>
        </TouchableOpacity>
      </View>

      <Section title="Hàng chờ">
        <QueueTile icon="person-add" title="Duyệt cố vấn" count={queues.pendingMentors || 0} desc="Hồ sơ mentor chờ phê duyệt" onPress={() => onNavigate?.('admin_mentors')} />
        <QueueTile icon="cash-outline" title="Rút tiền mentor" count={queues.payoutsPending || 0} desc="Payout chờ duyệt / chi" onPress={() => onNavigate?.('admin_finance')} />
        <QueueTile icon="documents" title="Khóa chờ duyệt" count={queues.coursesPending || 0} desc="Nội dung khóa học" onPress={() => onNavigate?.('admin_content')} />
        <QueueTile icon="alert-circle" title="Báo cáo mở" count={queues.reportsOpen || 0} desc="Hỗ trợ & khiếu nại" onPress={() => onNavigate?.('admin_content')} />
      </Section>

      <Section title="Phân bố gói">
        <View style={s.planRow}>
          {['free', 'student', 'professional', 'premium'].map((key) => (
            <View key={key} style={s.planChip}>
              <Text style={s.planNum}>{plans[key] ?? 0}</Text>
              <Text style={s.planLbl}>{key}</Text>
            </View>
          ))}
        </View>
      </Section>

      {content ? (
        <Section title="Nội dung & phỏng vấn">
          <View style={s.statGrid}>
            <StatCard icon="mic" label="Sessions" value={content.interviewSessions ?? 0} />
            <StatCard icon="checkmark-done" label="Hoàn thành" value={content.completedInterviews ?? 0} tone="lime" />
            <StatCard icon="document-text" label="CV phân tích" value={content.cvAnalyses ?? 0} tone="amber" />
            <StatCard icon="school" label="Khóa published" value={content.publishedCourses ?? 0} />
          </View>
          {content.interviewOps ? (
            <Card>
              <Text style={s.cardTitle}>7 ngày gần đây</Text>
              <Text style={s.cardSub}>
                Sessions: {content.interviewOps.sessions7d ?? 0} · Hoàn thành: {content.interviewOps.completed7d ?? 0}
                {content.interviewOps.avgScore7d != null
                  ? ` · Điểm TB: ${content.interviewOps.avgScore7d}`
                  : ''}
              </Text>
              <Text style={s.cardSub}>Few-shot sẵn: {content.interviewOps.fewShotReadyCount ?? 0}</Text>
            </Card>
          ) : null}
        </Section>
      ) : null}

      {metrics ? (
        <Section title="Interview metrics (7d)">
          <Card>
            <Text style={s.cardSub}>
              Tổng all-time: {metrics.totalAllTime ?? 0} · Few-shot: {metrics.fewShotReadyCount ?? 0}
            </Text>
            <Text style={s.cardSub}>
              Điểm TB: {metrics.scoreStats?.avgScore != null ? Number(metrics.scoreStats.avgScore).toFixed(1) : '—'}
              {metrics.evalDuration?.avgMs != null
                ? ` · Eval ~${Math.round(metrics.evalDuration.avgMs / 1000)}s`
                : ''}
            </Text>
            {(metrics.topRoles || []).slice(0, 4).map((r) => (
              <Text key={r._id || r.id} style={s.cardSub}>
                {r._id || 'role'}: {r.count ?? 0}
              </Text>
            ))}
          </Card>
        </Section>
      ) : null}

      {system ? (
        <Section title="Hệ thống">
          <Card>
            <Text style={s.cardTitle}>Mongo / dịch vụ</Text>
            <Text style={s.cardSub}>
              Topology: {system.mongo?.topology || '—'}
              {system.mongo?.transactionSupported ? ' · TX OK' : ' · TX hạn chế'}
            </Text>
            <Text style={s.cardSub}>
              CV: {system.services?.cvAnalyzer || '—'} · LLM: {system.services?.llm || '—'}
            </Text>
            <Text style={s.cardSub}>
              JWT: {system.auth?.accessTokenTtl || '—'} · Refresh {system.auth?.refreshTokenDays ?? '—'}d
            </Text>
          </Card>
        </Section>
      ) : null}

      <Section title="Lịch hẹn gần đây" actionLabel="Tất cả" onAction={() => onNavigate?.('admin_ops')}>
        {recent.length === 0 ? (
          <EmptyState icon="calendar-outline" text="Chưa có booking gần đây." />
        ) : (
          recent.slice(0, 6).map((b) => (
            <Card key={b.id || b._id}>
              <PersonRow
                name={`${b.customerName || b.userId?.name || 'Khách'} → ${b.mentorName || b.mentorId?.userId?.name || 'Mentor'}`}
                meta={`${b.date || '—'} · ${b.timeSlot || b.time || ''} · ${formatVnd(b.totalAmount || b.price || 0)}`}
                right={<Badge label={statusLabel(b.status)} tone={b.status === 'completed' ? 'ok' : b.status === 'pending' ? 'warn' : 'neutral'} />}
              />
            </Card>
          ))
        )}
      </Section>
    </View>
  );
}

function AdminMentors({ data, onRefresh, user, onNavigate }) {
  const [filter, setFilter] = useState('pending');
  const [prompt, setPrompt] = useState(null);
  const [commissionMentor, setCommissionMentor] = useState(null);
  const mentors = data?.mentors || [];
  const list = useMemo(() => {
    if (filter === 'pending') {
      return mentors.filter((m) => m.isActive !== true || m.adminReview?.status === 'pending' || m.isVerified !== true);
    }
    if (filter === 'active') return mentors.filter((m) => m.isActive === true);
    return mentors;
  }, [mentors, filter]);

  const showDetail = async (m) => {
    const id = m._id || m.id;
    const r = await adminApi.getMentorById(id);
    if (!r.success) {
      showMsg('Lỗi', r.error || 'Không tải được chi tiết');
      return;
    }
    const d = r.mentor || r;
    showMsg(
      d.name || d.userId?.name || 'Mentor',
      [
        d.title || d.headline || '',
        d.company ? `Công ty: ${d.company}` : '',
        d.bio ? `Bio: ${String(d.bio).slice(0, 280)}` : '',
        `Phí booking: ${d.pricing?.platformFeeRate != null ? `${Math.round(d.pricing.platformFeeRate * 100)}%` : 'mặc định'}`,
        `Phí khóa: ${d.pricing?.coursePlatformFeeRate != null ? `${Math.round(d.pricing.coursePlatformFeeRate * 100)}%` : 'mặc định'}`,
        `Verified: ${d.isVerified ? 'yes' : 'no'} · Active: ${d.isActive ? 'yes' : 'no'}`,
      ].filter(Boolean).join('\n'),
    );
  };

  return (
    <View>
      <WelcomeHeader
        user={user}
        eyebrow="QUẢN TRỊ"
        title="Cố vấn"
        subtitle={`${list.length} hồ sơ · duyệt / phí / từ chối`}
        onProfilePress={() => onNavigate?.('profile')}
      />
      <ChipRow
        value={filter}
        onChange={setFilter}
        options={[
          { id: 'pending', label: `Chờ duyệt (${(data?.pendingMentors || []).length})` },
          { id: 'active', label: 'Đang hoạt động' },
          { id: 'all', label: 'Tất cả' },
        ]}
      />
      {list.length === 0 ? <EmptyState text="Không có mentor trong bộ lọc." /> : null}
      {list.slice(0, 50).map((m) => {
        const active = m.isActive === true;
        const pending = !active || m.adminReview?.status === 'pending';
        const name = m.name || m.userId?.name || 'Mentor';
        return (
          <Card key={m._id || m.id}>
            <PersonRow
              name={name}
              avatar={m.avatar || m.userId?.avatar}
              meta={`${m.title || m.headline || 'Chuyên gia'}${m.company ? ` · ${m.company}` : ''} · ${formatVnd(m.pricePerHour || m.hourlyRate || 0)}/giờ`}
              right={<Badge label={active ? 'Đã duyệt' : pending ? 'Chờ duyệt' : 'Ẩn'} tone={active ? 'ok' : pending ? 'warn' : 'bad'} />}
            />
            <Text style={s.cardSub}>
              Review: {m.adminReview?.status || '—'} · Verified: {m.isVerified ? 'yes' : 'no'} · Rating: {m.rating ?? m.averageRating ?? '—'}
              {m.pricing?.platformFeeRate != null
                ? ` · Fee ${Math.round(m.pricing.platformFeeRate * 100)}%`
                : ''}
            </Text>
            <View style={s.btnRow}>
              <ActionBtn label="Chi tiết" tone="ghost" onPress={() => showDetail(m)} />
              <ActionBtn label="Phí %" tone="ghost" onPress={() => setCommissionMentor(m)} />
              {!active ? (
                <ActionBtn
                  label="Duyệt"
                  tone="success"
                  onPress={async () => {
                    const r = await adminApi.updateMentorStatus(m._id || m.id, true);
                    if (!r.success) showMsg('Lỗi', r.error || 'Không duyệt được');
                    onRefresh?.();
                  }}
                />
              ) : (
                <ActionBtn
                  label="Ẩn"
                  tone="ghost"
                  onPress={async () => {
                    const r = await adminApi.updateMentorStatus(m._id || m.id, false);
                    if (!r.success) showMsg('Lỗi', r.error || 'Không cập nhật được');
                    onRefresh?.();
                  }}
                />
              )}
              {pending ? (
                <ActionBtn
                  label="Từ chối"
                  tone="danger"
                  onPress={() => setPrompt({
                    title: 'Từ chối mentor',
                    placeholder: 'Lý do từ chối…',
                    onConfirm: async (reason) => {
                      setPrompt(null);
                      if (!reason) {
                        showMsg('Thiếu lý do', 'Vui lòng nhập lý do từ chối.');
                        return;
                      }
                      const r = await adminApi.rejectMentor(m._id || m.id, reason);
                      if (!r.success) showMsg('Lỗi', r.error || 'Không từ chối được');
                      onRefresh?.();
                    },
                  })}
                />
              ) : null}
            </View>
          </Card>
        );
      })}

      <TextPromptModal
        visible={!!prompt}
        title={prompt?.title || ''}
        placeholder={prompt?.placeholder}
        onCancel={() => setPrompt(null)}
        onConfirm={(v) => prompt?.onConfirm?.(v)}
      />
      <CommissionModal
        visible={!!commissionMentor}
        mentor={commissionMentor}
        onCancel={() => setCommissionMentor(null)}
        onSaved={() => {
          setCommissionMentor(null);
          showMsg('Thành công', 'Đã cập nhật phí mentor');
          onRefresh?.();
        }}
      />
    </View>
  );
}

function AdminOps({ data, onRefresh, user, onNavigate }) {
  const [tab, setTab] = useState('bookings');
  const [prompt, setPrompt] = useState(null);
  const [normalizing, setNormalizing] = useState(false);
  const bookings = data?.bookings || [];
  const coursePayments = data?.coursePayments || [];
  const pendingTransfers = data?.pendingEnrollmentTransfers || [];
  const courseList = tab === 'courses_pending'
    ? (pendingTransfers.length ? pendingTransfers : coursePayments.filter((e) => e.paymentStatus === 'pending'))
    : coursePayments;
  const subPayments = data?.subscriptionPayments || [];

  return (
    <View>
      <WelcomeHeader
        user={user}
        eyebrow="QUẢN TRỊ"
        title="Vận hành"
        subtitle="Booking · chuyển khoản · SePay"
        onProfilePress={() => onNavigate?.('profile')}
      />
      <Card>
        <Text style={s.cardTitle}>Chuẩn hóa mã CK</Text>
        <Text style={s.cardSub}>Đồng bộ paymentRef / transferRef trên ledger (dry-run trước khi ghi).</Text>
        <View style={s.btnRow}>
          <ActionBtn
            label="Dry-run"
            tone="ghost"
            busy={normalizing}
            onPress={async () => {
              setNormalizing(true);
              const r = await adminApi.normalizeTransferRefs(true);
              setNormalizing(false);
              if (!r.success) showMsg('Lỗi', r.error || 'Thất bại');
              else showMsg('Dry-run', JSON.stringify(r.result || r.summary || r, null, 0).slice(0, 400));
            }}
          />
          <ActionBtn
            label="Chạy normalize"
            tone="success"
            busy={normalizing}
            onPress={async () => {
              const ok = await askConfirm('Xác nhận', 'Ghi chuẩn hóa mã CK lên DB?', { confirmText: 'Chạy' });
              if (!ok) return;
              setNormalizing(true);
              const r = await adminApi.normalizeTransferRefs(false);
              setNormalizing(false);
              if (!r.success) showMsg('Lỗi', r.error || 'Thất bại');
              else {
                showMsg('Xong', 'Đã normalize transfer refs.');
                onRefresh?.();
              }
            }}
          />
        </View>
      </Card>
      <ChipRow
        value={tab}
        onChange={setTab}
        options={[
          { id: 'bookings', label: `Booking (${bookings.length})` },
          { id: 'courses_pending', label: `CK chờ (${pendingTransfers.length || coursePayments.filter((e) => e.paymentStatus === 'pending').length})` },
          { id: 'courses', label: `CK khóa (${coursePayments.length})` },
          { id: 'subs', label: `CK gói (${subPayments.length})` },
        ]}
      />

      {tab === 'bookings' && (bookings.length === 0 ? <EmptyState icon="calendar-outline" text="Chưa có booking." /> : bookings.slice(0, 50).map((b) => (
        <Card key={b._id || b.id}>
          <PersonRow
            name={`${b.userId?.name || 'Khách'} → ${b.mentorId?.name || b.mentorId?.userId?.name || 'Mentor'}`}
            meta={`${b.date || '—'} · ${b.timeSlot || b.time || ''} · ${formatVnd(b.totalAmount || b.price || 0)}`}
            right={<Badge label={statusLabel(b.status)} tone={b.status === 'completed' ? 'ok' : b.status === 'pending' ? 'warn' : 'neutral'} />}
          />
          <Text style={s.cardSub}>
            Pay: {statusLabel(b.paymentStatus)} · Method: {b.paymentMethod || '—'} · Ref: {b.paymentRef || b.transferRef || '—'}
          </Text>
          <View style={s.btnRow}>
            <ActionBtn
              label="Chi tiết"
              tone="ghost"
              onPress={async () => {
                const r = await adminApi.getBookingById(b._id || b.id);
                if (!r.success) showMsg('Lỗi', r.error || 'Không tải được');
                else {
                  const d = r.booking || r;
                  showMsg('Booking', `${d.status} · pay ${d.paymentStatus}\n${d.date || ''} ${d.timeSlot || ''}\nRef: ${d.paymentRef || d.transferRef || '—'}`,);
                }
              }}
            />
            {b.status === 'pending' ? (
              <ActionBtn label="Xác nhận lịch" onPress={async () => {
                const r = await adminApi.updateBookingStatus(b._id || b.id, 'confirmed');
                if (!r.success) showMsg('Lỗi', r.error || 'Thất bại');
                onRefresh?.();
              }} />
            ) : null}
            {b.status === 'confirmed' || b.status === 'in_progress' ? (
              <ActionBtn label="Hoàn thành" tone="success" onPress={async () => {
                const r = await adminApi.updateBookingStatus(b._id || b.id, 'completed');
                if (!r.success) showMsg('Lỗi', r.error || 'Thất bại');
                onRefresh?.();
              }} />
            ) : null}
            {(b.paymentStatus === 'pending' || b.paymentMethod === 'transfer') && b.status !== 'cancelled' ? (
              <ActionBtn label="Xác nhận CK" tone="success" onPress={async () => {
                const r = await adminApi.confirmBookingTransfer(b._id || b.id, { force: true });
                if (!r.success) showMsg('Lỗi', r.error || 'Thất bại');
                onRefresh?.();
              }} />
            ) : null}
            {(b.status === 'refund_pending' || b.refundStatus === 'pending') ? (
              <ActionBtn label="Xác nhận hoàn" tone="danger" onPress={async () => {
                const r = await adminApi.confirmBookingRefund(b._id || b.id);
                if (!r.success) showMsg('Lỗi', r.error || 'Thất bại');
                onRefresh?.();
              }} />
            ) : null}
            {b.status !== 'cancelled' && b.status !== 'completed' ? (
              <ActionBtn
                label="Hủy"
                tone="danger"
                onPress={() => setPrompt({
                  title: 'Hủy booking',
                  placeholder: 'Lý do hủy…',
                  onConfirm: async (reason) => {
                    setPrompt(null);
                    const r = await adminApi.updateBookingStatus(
                      b._id || b.id,
                      'cancelled',
                      reason || 'Admin hủy lịch.',
                    );
                    if (!r.success) showMsg('Lỗi', r.error || 'Thất bại');
                    onRefresh?.();
                  },
                })}
              />
            ) : null}
            {b.status === 'confirmed' || b.status === 'in_progress' ? (
              <ActionBtn
                label="No-show"
                tone="ghost"
                onPress={() => setPrompt({
                  title: 'Đánh dấu no-show',
                  placeholder: 'Ghi chú (tuỳ chọn)…',
                  onConfirm: async (reason) => {
                    setPrompt(null);
                    const r = await adminApi.updateBookingStatus(b._id || b.id, 'no_show', reason);
                    if (!r.success) showMsg('Lỗi', r.error || 'Thất bại');
                    onRefresh?.();
                  },
                })}
              />
            ) : null}
          </View>
        </Card>
      )))}

      {(tab === 'courses' || tab === 'courses_pending') && (courseList.length === 0 ? <EmptyState text="Không có CK khóa." /> : courseList.slice(0, 40).map((e) => (
        <Card key={e._id || e.id}>
          <Text style={s.cardTitle}>{e.courseId?.title || e.courseTitle || 'Khóa học'}</Text>
          <Text style={s.cardSub}>
            {e.userId?.name || e.userId?.email || 'Học viên'} · {formatVnd(e.pricePaid || e.amount || 0)} · {statusLabel(e.paymentStatus)}
          </Text>
          <Text style={s.cardSub}>Ref: {e.paymentRef || e.transferRef || '—'}</Text>
          {e.paymentStatus === 'pending' ? (
            <ActionBtn label="Xác nhận đã nhận tiền" tone="success" onPress={async () => {
              const r = await adminApi.confirmEnrollmentTransfer(e._id || e.id, { force: true });
              if (!r.success) showMsg('Lỗi', r.error || 'Thất bại');
              onRefresh?.();
            }} />
          ) : null}
        </Card>
      )))}

      {tab === 'subs' && (subPayments.length === 0 ? <EmptyState text="Không có CK gói chờ xử lý." /> : subPayments.slice(0, 30).map((p) => (
        <Card key={p._id || p.id}>
          <Text style={s.cardTitle}>{p.userId?.email || p.userEmail || 'User'}</Text>
          <Text style={s.cardSub}>
            Gói {p.providerResponse?.plan || p.plan || '—'} · {formatVnd(p.amount || 0)} · {statusLabel(p.status)}
          </Text>
          <ActionBtn label="Xác nhận CK gói" tone="success" onPress={async () => {
            const r = await adminApi.confirmSubscriptionTransfer(p._id || p.id, { force: true });
            if (!r.success) showMsg('Lỗi', r.error || 'Thất bại');
            onRefresh?.();
          }} />
        </Card>
      )))}

      <TextPromptModal
        visible={!!prompt}
        title={prompt?.title || ''}
        placeholder={prompt?.placeholder}
        onCancel={() => setPrompt(null)}
        onConfirm={(v) => prompt?.onConfirm?.(v)}
      />
    </View>
  );
}

function AdminFinance({ data, onRefresh, user, onNavigate }) {
  const [prompt, setPrompt] = useState(null);
  const payouts = data?.payouts || [];
  const totals = data?.finance?.totals || {};
  const booking = data?.finance?.booking || {};
  const course = data?.finance?.course || {};
  const cf = data?.courseFinance || {};

  return (
    <View>
      <WelcomeHeader
        user={user}
        eyebrow="QUẢN TRỊ"
        title="Tài chính"
        subtitle="Tổng quan GMV & payout mentor"
        onProfilePress={() => onNavigate?.('profile')}
      />
      <View style={s.statGrid}>
        <StatCard icon="cash" label="Tổng thu" value={formatVnd(totals.grossCollected)} />
        <StatCard icon="people" label="Chia mentor" value={formatVnd(totals.mentorNet)} tone="lime" />
        <StatCard icon="business" label="Lợi nhuận PI" value={formatVnd(totals.platformRevenue)} tone="amber" />
        <StatCard icon="swap-horizontal" label="Booking paid" value={booking.count ?? 0} />
      </View>
      <Card>
        <Text style={s.cardTitle}>Chi tiết nguồn thu</Text>
        <Text style={s.cardSub}>Booking: {formatVnd(booking.grossCollected)} · phí {formatVnd(booking.platformRevenue)} · mentor {formatVnd(booking.mentorNet)}</Text>
        <Text style={s.cardSub}>Khóa học: {formatVnd(course.grossCollected)} · phí {formatVnd(course.platformRevenue)} · mentor {formatVnd(course.mentorNet)} ({course.count ?? 0} đơn)</Text>
      </Card>

      {cf && (cf.pendingTransferCount != null || cf.paidCollectedCount != null) ? (
        <Section title="Học phí khóa (CK)">
          <View style={s.statGrid}>
            <StatCard icon="time" label="CK chờ" value={`${cf.pendingTransferCount ?? 0}`} tone="amber" />
            <StatCard icon="cash" label="Chờ (₫)" value={formatVnd(cf.pendingTransferAmount)} tone="amber" />
            <StatCard icon="checkmark-circle" label="Đã thu" value={`${cf.paidCollectedCount ?? 0}`} tone="lime" />
            <StatCard icon="wallet" label="Thu (₫)" value={formatVnd(cf.paidCollectedAmount)} tone="lime" />
          </View>
          {(cf.pendingList || []).slice(0, 8).map((e) => (
            <Card key={e._id || e.id}>
              <Text style={s.cardTitle}>{e.courseId?.title || 'Khóa'}</Text>
              <Text style={s.cardSub}>
                {e.userId?.name || e.userId?.email || 'HV'} · {formatVnd(e.pricePaid)} · chờ CK
              </Text>
              <ActionBtn
                label="Xác nhận CK"
                tone="success"
                onPress={async () => {
                  const r = await adminApi.confirmEnrollmentTransfer(e._id || e.id, { force: true });
                  if (!r.success) showMsg('Lỗi', r.error || 'Thất bại');
                  onRefresh?.();
                }}
              />
            </Card>
          ))}
        </Section>
      ) : null}

      <Section title={`Yêu cầu rút tiền (${payouts.length})`}>
        {payouts.length === 0 ? <EmptyState icon="wallet-outline" text="Chưa có yêu cầu rút tiền." /> : null}
        {payouts.slice(0, 40).map((p) => (
          <Card key={p._id || p.id}>
            <PersonRow
              name={p.mentorId?.name || p.mentorId?.userId?.name || p.mentorName || 'Mentor'}
              meta={`${formatVnd(p.amount)} · ${p.bankAccount?.bankName || p.bankName || '—'} · ${p.bankAccount?.accountNumber || p.accountNumber || ''}`}
              right={<Badge label={statusLabel(p.status)} tone={p.status === 'paid' || p.status === 'approved' ? 'ok' : p.status === 'pending' ? 'warn' : 'bad'} />}
            />
            <View style={s.btnRow}>
              {p.status === 'pending' ? (
                <>
                  <ActionBtn label="Duyệt" tone="success" onPress={async () => {
                    const r = await adminApi.approvePayout(p._id || p.id);
                    if (!r.success) showMsg('Lỗi', r.error || 'Thất bại');
                    onRefresh?.();
                  }} />
                  <ActionBtn
                    label="Từ chối"
                    tone="danger"
                    onPress={() => setPrompt({
                      title: 'Từ chối payout',
                      placeholder: 'Lý do…',
                      onConfirm: async (reason) => {
                        setPrompt(null);
                        const r = await adminApi.rejectPayout(p._id || p.id, reason || 'Từ chối bởi admin');
                        if (!r.success) showMsg('Lỗi', r.error || 'Thất bại');
                        onRefresh?.();
                      },
                    })}
                  />
                </>
              ) : null}
              {p.status === 'approved' ? (
                <ActionBtn label="Đánh dấu đã CK" onPress={async () => {
                  const r = await adminApi.markPayoutPaid(p._id || p.id);
                  if (!r.success) showMsg('Lỗi', r.error || 'Thất bại');
                  onRefresh?.();
                }} />
              ) : null}
            </View>
          </Card>
        ))}
      </Section>

      <TextPromptModal
        visible={!!prompt}
        title={prompt?.title || ''}
        placeholder={prompt?.placeholder}
        onCancel={() => setPrompt(null)}
        onConfirm={(v) => prompt?.onConfirm?.(v)}
      />
    </View>
  );
}

function AdminManage({ data, onRefresh, user, onNavigate }) {
  const [tab, setTab] = useState('users');
  const pendingCourses = data?.pendingCourses || [];
  const publishedCourses = data?.publishedCourses || [];
  const [courseScope, setCourseScope] = useState(() =>
    (data?.pendingCourses || []).length > 0 ? 'pending' : 'published',
  );
  const [prompt, setPrompt] = useState(null);
  const [info, setInfo] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [busyUserId, setBusyUserId] = useState('');
  const users = data?.users || [];
  const courses = courseScope === 'published' ? publishedCourses : pendingCourses;
  const reviews = data?.reviews || [];
  const reports = data?.reports || [];
  const loadErrors = data?.loadErrors || {};
  const coursesTotal = pendingCourses.length + publishedCourses.length;

  React.useEffect(() => {
    if (courseScope === 'pending' && pendingCourses.length === 0 && publishedCourses.length > 0) {
      setCourseScope('published');
    }
  }, [courseScope, pendingCourses.length, publishedCourses.length]);

  const userIdOf = (u) => String(u?._id || u?.id || '');

  return (
    <View>
      <WelcomeHeader
        user={user}
        eyebrow="QUẢN TRỊ"
        title="Quản lý"
        subtitle="Users · khóa học · reviews · reports"
        onProfilePress={() => onNavigate?.('profile')}
      />
      {loadErrors.users || loadErrors.courses || loadErrors.reviews || loadErrors.reports ? (
        <Card>
          <Text style={s.cardTitle}>Lỗi tải API</Text>
          {loadErrors.users ? <Text style={s.cardSub}>Users: {loadErrors.users}</Text> : null}
          {loadErrors.courses ? <Text style={s.cardSub}>Khóa: {loadErrors.courses}</Text> : null}
          {loadErrors.reviews ? <Text style={s.cardSub}>Reviews: {loadErrors.reviews}</Text> : null}
          {loadErrors.reports ? <Text style={s.cardSub}>Reports: {loadErrors.reports}</Text> : null}
          <ActionBtn label="Thử lại" onPress={() => onRefresh?.()} />
        </Card>
      ) : null}
      <ChipRow
        value={tab}
        onChange={setTab}
        options={[
          { id: 'users', label: `Users (${users.length})` },
          {
            id: 'courses',
            label:
              pendingCourses.length > 0
                ? `Khóa (${pendingCourses.length} chờ · ${coursesTotal})`
                : `Khóa (${coursesTotal})`,
          },
          { id: 'reviews', label: `Reviews (${reviews.length})` },
          { id: 'reports', label: `Reports (${reports.length})` },
        ]}
      />

      {tab === 'users' && users.slice(0, 50).map((u) => {
        const active = u.isActive !== false;
        const role = u.role || 'customer';
        const uid = userIdOf(u);
        return (
          <Card key={uid || u.email}>
            <PersonRow
              name={u.name || u.email}
              avatar={u.avatar}
              meta={`${u.email} · ${role} · gói ${u.plan || 'free'}`}
              right={<Badge label={active ? 'Hoạt động' : 'Khóa'} tone={active ? 'ok' : 'bad'} />}
            />
            <View style={s.btnRow}>
              <ActionBtn
                label="Chi tiết"
                tone="ghost"
                busy={busyUserId === `d-${uid}`}
                onPress={async () => {
                  setBusyUserId(`d-${uid}`);
                  const r = await adminApi.getUserById(uid);
                  setBusyUserId('');
                  if (!r.success) {
                    setInfo({ title: 'Lỗi', message: r.error || 'Không tải được chi tiết' });
                    return;
                  }
                  const d = r.user || r;
                  setInfo({
                    title: d.name || d.email || 'User',
                    message: [
                      `Email: ${d.email || '—'}`,
                      `Role: ${d.role || '—'}`,
                      `Plan: ${d.plan || 'free'}`,
                      `Active: ${d.isActive !== false ? 'yes' : 'no'}`,
                      d.stats
                        ? `Booking: ${d.stats.bookingsCount ?? 0} · Enrollment: ${d.stats.enrollmentsCount ?? 0}`
                        : '',
                    ].filter(Boolean).join('\n'),
                  });
                }}
              />
              {role !== 'admin' ? (
                <ActionBtn
                  label={role === 'mentor' ? '→ Customer' : '→ Mentor'}
                  tone="ghost"
                  onPress={() => {
                    const next = role === 'mentor' ? 'customer' : 'mentor';
                    setConfirm({
                      title: 'Đổi role',
                      message: `Đặt ${u.email} thành ${next}?`,
                      confirmLabel: 'Đổi role',
                      onConfirm: async () => {
                        const r = await adminApi.updateUserRole(uid, next);
                        setConfirm(null);
                        if (!r.success) {
                          setInfo({ title: 'Lỗi', message: r.error || 'Không đổi được role' });
                          return;
                        }
                        setInfo({ title: 'Thành công', message: `Đã đổi role thành ${next}.` });
                        onRefresh?.();
                      },
                    });
                  }}
                />
              ) : null}
              <ActionBtn
                label={active ? 'Khóa' : 'Mở khóa'}
                tone={active ? 'danger' : 'success'}
                onPress={() => {
                  setConfirm({
                    title: active ? 'Khóa tài khoản' : 'Mở khóa',
                    message: active
                      ? `Khóa ${u.email}? User sẽ bị đăng xuất.`
                      : `Mở lại ${u.email}?`,
                    confirmLabel: active ? 'Khóa' : 'Mở khóa',
                    danger: active,
                    onConfirm: async () => {
                      const r = await adminApi.updateUserStatus(uid, !active);
                      setConfirm(null);
                      if (!r.success) {
                        setInfo({ title: 'Lỗi', message: r.error || 'Không cập nhật được' });
                        return;
                      }
                      setInfo({
                        title: 'Thành công',
                        message: active ? 'Đã khóa tài khoản.' : 'Đã mở khóa tài khoản.',
                      });
                      onRefresh?.();
                    },
                  });
                }}
              />
            </View>
          </Card>
        );
      })}

      {tab === 'courses' ? (
        <>
          <ChipRow
            value={courseScope}
            onChange={setCourseScope}
            options={[
              { id: 'pending', label: `Chờ duyệt (${pendingCourses.length})` },
              { id: 'published', label: `Published (${publishedCourses.length})` },
            ]}
          />
          {courses.length === 0 ? (
            <EmptyState text={courseScope === 'published' ? 'Chưa có khóa published.' : 'Không có khóa chờ duyệt.'} />
          ) : courses.slice(0, 40).map((c) => (
            <Card key={c._id || c.id}>
              <Text style={s.cardTitle}>{c.title}</Text>
              <Text style={s.cardSub}>
                {c.mentorId?.userId?.name || c.mentorId?.name || c.instructorName || 'Mentor'} · {formatVnd(c.price || 0)} · {statusLabel(c.status)}
                {c.paidEnrollmentCount != null ? ` · ${c.paidEnrollmentCount} HV` : ''}
              </Text>
              <View style={s.btnRow}>
                {courseScope === 'pending' ? (
                  <>
                    <ActionBtn label="Duyệt" tone="success" onPress={async () => {
                      const r = await adminApi.approveCourse(c._id || c.id);
                      if (!r.success) showMsg('Lỗi', r.error || 'Thất bại');
                      onRefresh?.();
                    }} />
                    <ActionBtn
                      label="Từ chối"
                      tone="danger"
                      onPress={() => setPrompt({
                        title: 'Từ chối khóa học',
                        placeholder: 'Lý do…',
                        onConfirm: async (reason) => {
                          setPrompt(null);
                          const r = await adminApi.rejectCourse(c._id || c.id, reason || 'Chưa đạt chuẩn');
                          if (!r.success) showMsg('Lỗi', r.error || 'Thất bại');
                          onRefresh?.();
                        },
                      })}
                    />
                  </>
                ) : (
                  <ActionBtn
                    label="Archive / gỡ"
                    tone="danger"
                    onPress={() => setPrompt({
                      title: 'Gỡ khóa khỏi marketplace',
                      placeholder: 'Lý do…',
                      onConfirm: async (reason) => {
                        setPrompt(null);
                        const r = await adminApi.archiveCourse(c._id || c.id, reason);
                        if (!r.success) showMsg('Lỗi', r.error || 'Thất bại');
                        else {
                          showMsg('Đã gỡ', 'Khóa đã archived.');
                          onRefresh?.();
                        }
                      },
                    })}
                  />
                )}
              </View>
            </Card>
          ))}
        </>
      ) : null}

      {tab === 'reviews' && (reviews.length === 0 ? <EmptyState text="Chưa có đánh giá." /> : reviews.slice(0, 40).map((r) => {
        const visible = r.isVisible !== false;
        return (
          <Card key={r._id || r.id}>
            <Text style={s.cardTitle}>{r.userId?.name || 'User'} · {r.rating || 0}★</Text>
            <Text style={s.cardSub} numberOfLines={3}>{r.comment || r.content || '—'}</Text>
            <Badge label={visible ? 'Hiển thị' : 'Đã ẩn'} tone={visible ? 'ok' : 'bad'} />
            <ActionBtn
              label={visible ? 'Ẩn review' : 'Hiện review'}
              tone={visible ? 'ghost' : 'success'}
              onPress={async () => {
                const res = await adminApi.setReviewVisibility(r._id || r.id, !visible);
                if (!res.success) showMsg('Lỗi', res.error || 'Thất bại');
                onRefresh?.();
              }}
            />
          </Card>
        );
      }))}

      {tab === 'reports' && (reports.length === 0 ? <EmptyState text="Không có báo cáo mở." /> : reports.slice(0, 40).map((r) => (
        <Card key={r._id || r.id}>
          <Text style={s.cardTitle}>{r.reason || r.type || 'Báo cáo'}</Text>
          <Text style={s.cardSub} numberOfLines={3}>{r.description || r.note || '—'}</Text>
          <Text style={s.cardSub}>Trạng thái: {statusLabel(r.status || 'pending')}</Text>
          <View style={s.btnRow}>
            {r.status === 'pending' ? (
              <ActionBtn
                label="Đang xem"
                tone="ghost"
                onPress={async () => {
                  const res = await adminApi.updateReportStatus(r._id || r.id, { status: 'reviewing' });
                  if (!res.success) showMsg('Lỗi', res.error || 'Thất bại');
                  onRefresh?.();
                }}
              />
            ) : null}
            <ActionBtn
              label="Đã xử lý"
              tone="success"
              onPress={() => setPrompt({
                title: 'Ghi chú xử lý',
                placeholder: 'Resolution (tuỳ chọn)…',
                onConfirm: async (resolution) => {
                  setPrompt(null);
                  const res = await adminApi.updateReportStatus(r._id || r.id, {
                    status: 'resolved',
                    resolution: resolution || undefined,
                  });
                  if (!res.success) showMsg('Lỗi', res.error || 'Thất bại');
                  onRefresh?.();
                },
              })}
            />
            <ActionBtn
              label="Bác bỏ"
              tone="danger"
              onPress={() => setPrompt({
                title: 'Bác bỏ báo cáo',
                placeholder: 'Lý do (tuỳ chọn)…',
                onConfirm: async (resolution) => {
                  setPrompt(null);
                  const res = await adminApi.updateReportStatus(r._id || r.id, {
                    status: 'dismissed',
                    resolution: resolution || undefined,
                  });
                  if (!res.success) showMsg('Lỗi', res.error || 'Thất bại');
                  onRefresh?.();
                },
              })}
            />
          </View>
        </Card>
      )))}

      <TextPromptModal
        visible={!!prompt}
        title={prompt?.title || ''}
        placeholder={prompt?.placeholder}
        onCancel={() => setPrompt(null)}
        onConfirm={(v) => prompt?.onConfirm?.(v)}
      />
      <InfoModal
        visible={!!info}
        title={info?.title || ''}
        message={info?.message || ''}
        onClose={() => setInfo(null)}
      />
      <ConfirmModal
        visible={!!confirm}
        title={confirm?.title || ''}
        message={confirm?.message || ''}
        confirmLabel={confirm?.confirmLabel}
        danger={!!confirm?.danger}
        onCancel={() => setConfirm(null)}
        onConfirm={confirm?.onConfirm}
      />
    </View>
  );
}

function MentorHome({ data, user, onNavigate }) {
  const d = data?.dashboard || {};
  const f = d.finance || data?.finance || {};
  const upcoming = d.upcomingBookings || [];
  const profile = data?.profile || {};
  const analytics = data?.analytics || null;
  const scheduleDaysOn = Array.isArray(profile.recurringSchedule)
    ? profile.recurringSchedule.filter((row) => (row.slots || []).length > 0).length
    : 0;

  const journey = [
    {
      id: 'sessions',
      number: '01',
      icon: 'calendar-outline',
      title: 'Lịch hẹn',
      desc: 'Xác nhận và quản lý buổi với mentee.',
      color: '#8037f4',
      tab: 'mentor_sessions',
    },
    {
      id: 'schedule',
      number: '02',
      icon: 'time-outline',
      title: 'Lịch trống',
      desc: 'Khung giờ rảnh nhận booking.',
      color: '#93f72b',
      tab: 'mentor_schedule',
    },
    {
      id: 'courses',
      number: '03',
      icon: 'school-outline',
      title: 'Khóa học',
      desc: 'Tạo, publish và xem đánh giá.',
      color: '#f59e0b',
      tab: 'mentor_courses',
    },
  ];

  return (
    <View>
      <WelcomeHeader
        user={{ ...user, name: user?.name || profile.name, avatar: user?.avatar || profile.avatar }}
        onProfilePress={() => onNavigate?.('profile')}
      />

      <View style={s.homeStatsRow}>
        <View style={s.homeStatPill}>
          <Text style={s.homeStatValue}>{d.upcomingWithin7Days ?? upcoming.length}</Text>
          <Text style={s.homeStatLabel}>Sắp tới</Text>
        </View>
        <View style={s.homeStatPill}>
          <Text style={s.homeStatValue}>{d.completedSessions ?? 0}</Text>
          <Text style={s.homeStatLabel}>Hoàn thành</Text>
        </View>
        <View style={s.homeStatPill}>
          <Text style={s.homeStatValue}>{d.avgRating ? `${d.avgRating}` : '—'}</Text>
          <Text style={s.homeStatLabel}>Rating</Text>
        </View>
      </View>

      {analytics ? (
        <Card>
          <Text style={s.cardTitle}>Phân tích nhanh</Text>
          <Text style={s.cardSub}>
            Buổi tháng này: {analytics.sessionsThisMonth ?? d.sessionsThisMonth ?? 0}
            {analytics.completionRate != null ? ` · Tỉ lệ HT: ${Math.round(Number(analytics.completionRate) * 100)}%` : ''}
            {analytics.avgRating != null ? ` · Rating TB: ${analytics.avgRating}` : ''}
          </Text>
          {analytics.revenueThisMonth != null ? (
            <Text style={s.cardSub}>Doanh thu tháng: {formatVnd(analytics.revenueThisMonth)}</Text>
          ) : null}
        </Card>
      ) : null}

      <View style={s.journeyCard}>
        <View style={s.journeyHead}>
          <View>
            <Text style={s.journeyEyebrow}>LỘ TRÌNH GỢI Ý</Text>
            <Text style={s.journeyTitle}>Luồng được khuyên dùng</Text>
          </View>
          <View style={s.journeySpark}>
            <Ionicons name="flash" size={16} color="#2D1B69" />
          </View>
        </View>
        {journey.map((step) => (
          <TouchableOpacity
            key={step.id}
            style={s.journeyStep}
            onPress={() => onNavigate?.(step.tab)}
            activeOpacity={0.86}
          >
            <View style={[s.journeyNumber, { backgroundColor: `${step.color}22` }]}>
              <Text style={[s.journeyNumberText, { color: step.color }]}>{step.number}</Text>
            </View>
            <View style={[s.journeyIcon, { borderColor: `${step.color}55` }]}>
              <Ionicons name={step.icon} size={17} color={step.color} />
            </View>
            <View style={s.journeyBody}>
              <Text style={s.journeyStepTitle}>{step.title}</Text>
              <Text style={s.journeyStepDesc} numberOfLines={1}>{step.desc}</Text>
            </View>
            <Ionicons name="chevron-forward" size={15} color="rgba(45,27,105,0.26)" />
          </TouchableOpacity>
        ))}
      </View>

      <View style={s.homeToolsRow}>
        <TouchableOpacity style={s.homeToolCard} onPress={() => onNavigate?.('mentor_finance')} activeOpacity={0.88}>
          <View style={s.homeToolIcon}>
            <Ionicons name="wallet-outline" size={20} color="#8037f4" />
          </View>
          <Text style={s.homeToolTitle}>Tài chính</Text>
          <Text style={s.homeToolDesc} numberOfLines={2}>
            Khả dụng {formatVnd(f.availableBalance)}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.homeToolCard} onPress={() => onNavigate?.('mentor_schedule')} activeOpacity={0.88}>
          <View style={s.homeToolIcon}>
            <Ionicons name="time-outline" size={20} color="#8037f4" />
          </View>
          <Text style={s.homeToolTitle}>Lịch trống</Text>
          <Text style={s.homeToolDesc} numberOfLines={2}>
            {scheduleDaysOn} ngày đang nhận lịch
          </Text>
        </TouchableOpacity>
      </View>

      <Section title="Buổi sắp tới" actionLabel="Tất cả" onAction={() => onNavigate?.('mentor_sessions')}>
        {upcoming.length === 0 ? (
          <EmptyState icon="calendar-outline" text="Không có buổi trong 7 ngày tới." />
        ) : (
          upcoming.slice(0, 6).map((b) => (
            <Card key={b.id || b._id} onPress={() => onNavigate?.('mentor_sessions')}>
              <PersonRow
                name={b.customerName || b.userId?.name || 'Mentee'}
                avatar={b.customerAvatar || b.userId?.avatar}
                meta={`${b.date || '—'} · ${b.timeSlot || ''} · ${statusLabel(b.sessionType || b.status)} · ${formatVnd(b.price || b.totalAmount || 0)}`}
                right={<Badge label={statusLabel(b.status)} tone={b.status === 'confirmed' ? 'ok' : 'warn'} />}
              />
            </Card>
          ))
        )}
      </Section>
    </View>
  );
}

function MentorSessions({ data, onRefresh, user, onNavigate }) {
  const bookings = data?.bookings || [];
  const [selected, setSelected] = useState(null);
  const [busyKey, setBusyKey] = useState('');
  const [notes, setNotes] = useState('');

  const openDetail = async (b) => {
    const id = b._id || b.id;
    setSelected(b);
    setNotes(b.mentorNotes || '');
    const detail = await mentorApi.getBookingDetail(id);
    if (detail.success && (detail.booking || detail)) {
      const full = detail.booking || detail;
      if (full && (full._id || full.id || full.date)) {
        setSelected({ ...b, ...full });
        setNotes(full.mentorNotes || b.mentorNotes || '');
      }
    }
  };

  const act = async (key, fn, successMsg) => {
    setBusyKey(key);
    const ok = await runApi(fn, { successMsg, onDone: onRefresh });
    setBusyKey('');
    if (ok && selected) {
      const id = selected._id || selected.id;
      const detail = await mentorApi.getBookingDetail(id);
      if (detail.success && detail.booking) setSelected({ ...selected, ...detail.booking });
      else setSelected(null);
    }
  };

  return (
    <View>
      <WelcomeHeader
        user={user}
        eyebrow="CỐ VẤN"
        title="Lịch mentoring"
        subtitle={`${bookings.length} buổi · chạm thẻ để xác nhận / hoàn thành`}
        onProfilePress={() => onNavigate?.('profile')}
      />
      {bookings.length === 0 ? <EmptyState icon="calendar-outline" text="Chưa có lịch hẹn." /> : null}
      {bookings.map((b) => {
        const id = b._id || b.id;
        return (
          <Card key={id} onPress={() => openDetail(b)}>
            <PersonRow
              name={b.userId?.name || b.customerName || 'Mentee'}
              avatar={b.userId?.avatar || b.customerAvatar}
              meta={`${b.date || '—'} · ${b.timeSlot || b.time || ''} · ${b.sessionType || 'session'} · ${formatVnd(b.price || b.totalAmount || 0)}`}
              right={<Badge label={statusLabel(b.status)} tone={b.status === 'completed' ? 'ok' : b.status === 'pending' ? 'warn' : 'neutral'} />}
            />
            <Text style={s.cardSub}>Pay: {statusLabel(b.paymentStatus)} · Email: {b.userId?.email || b.customerEmail || '—'}</Text>
            <View style={s.btnRow}>
              {b.status === 'pending' ? (
                <ActionBtn
                  label="Xác nhận"
                  busy={busyKey === `c-${id}`}
                  onPress={() => act(`c-${id}`, () => mentorApi.confirmBooking(id), 'Đã xác nhận buổi')}
                />
              ) : null}
              {b.status === 'confirmed' ? (
                <ActionBtn
                  label="Bắt đầu"
                  busy={busyKey === `s-${id}`}
                  onPress={() => act(`s-${id}`, () => mentorApi.startBooking(id), 'Đã bắt đầu buổi')}
                />
              ) : null}
              {(b.status === 'confirmed' || b.status === 'in_progress') ? (
                <ActionBtn
                  label="Hoàn thành"
                  tone="success"
                  busy={busyKey === `d-${id}`}
                  onPress={() => act(`d-${id}`, () => mentorApi.completeBooking(id), 'Đã hoàn thành buổi')}
                />
              ) : null}
              <ActionBtn label="Chi tiết" tone="ghost" onPress={() => openDetail(b)} />
            </View>
          </Card>
        );
      })}

      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <Pressable style={s.modalBackdrop} onPress={() => setSelected(null)} />
        <View style={s.modalSheet}>
          {selected ? (
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={s.eyebrow}>CHI TIẾT BUỔI HẸN</Text>
              <Text style={s.heroTitle}>{selected.userId?.name || selected.customerName || 'Mentee'}</Text>
              <Text style={s.cardSub}>
                {selected.date} · {selected.timeSlot || selected.time} · {statusLabel(selected.status)} · {formatVnd(selected.price || selected.totalAmount || 0)}
              </Text>
              <Text style={s.cardSub}>Thanh toán: {statusLabel(selected.paymentStatus)} · {selected.paymentMethod || '—'}</Text>
              <Text style={s.cardSub}>Email: {selected.userId?.email || selected.customerEmail || '—'}</Text>
              {selected.meetingLink ? (
                <View style={[s.btnRow, { marginTop: 8 }]}>
                  <ActionBtn
                    label="Vào meeting"
                    tone="success"
                    onPress={() => {
                      const url = String(selected.meetingLink || '').trim();
                      if (!url) {
                        showMsg('Phòng họp', 'Chưa có link meeting.');
                        return;
                      }
                      Linking.openURL(url).catch(() => showMsg('Lỗi', 'Không mở được link meeting.'));
                    }}
                  />
                </View>
              ) : null}
              <Text style={[s.cardTitle, { marginTop: 14 }]}>Ghi chú mentor</Text>
              <TextInput
                style={[s.input, { minHeight: 80, textAlignVertical: 'top' }]}
                multiline
                value={notes}
                onChangeText={setNotes}
                placeholder="Nhập ghi chú buổi học…"
                placeholderTextColor="#94a3b8"
              />
              <View style={s.btnRow}>
                <ActionBtn
                  label="Lưu ghi chú"
                  busy={busyKey === 'notes'}
                  onPress={() => act('notes', () => mentorApi.updateNotes(selected._id || selected.id, notes), 'Đã lưu ghi chú')}
                />
                {selected.status === 'pending' ? (
                  <ActionBtn label="Xác nhận" busy={busyKey === 'confirm'} onPress={() => act('confirm', () => mentorApi.confirmBooking(selected._id || selected.id), 'Đã xác nhận')} />
                ) : null}
                {selected.status === 'confirmed' ? (
                  <ActionBtn label="Bắt đầu" busy={busyKey === 'start'} onPress={() => act('start', () => mentorApi.startBooking(selected._id || selected.id), 'Đã bắt đầu')} />
                ) : null}
                {(selected.status === 'confirmed' || selected.status === 'in_progress') ? (
                  <ActionBtn label="Hoàn thành" tone="success" busy={busyKey === 'done'} onPress={() => act('done', () => mentorApi.completeBooking(selected._id || selected.id), 'Đã hoàn thành')} />
                ) : null}
                {selected.status !== 'completed' && selected.status !== 'cancelled' ? (
                  <ActionBtn
                    label="Hủy buổi"
                    tone="danger"
                    busy={busyKey === 'cancel'}
                    onPress={async () => {
                      const ok = await askConfirm('Hủy buổi?', 'Thao tác gọi API hủy thật.', {
                        confirmText: 'Hủy buổi',
                        destructive: true,
                      });
                      if (!ok) return;
                      act('cancel', () => mentorApi.cancelBooking(selected._id || selected.id, 'Mentor hủy từ app'), 'Đã hủy buổi');
                    }}
                  />
                ) : null}
                <ActionBtn label="Đóng" tone="ghost" onPress={() => setSelected(null)} />
              </View>
            </ScrollView>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

function MentorSchedule({ data, onRefresh, user, onNavigate }) {
  return (
    <MentorScheduleScreen
      profile={data?.profile}
      bookings={data?.bookings || []}
      onRefreshParent={onRefresh}
      user={user}
      onNavigate={onNavigate}
    />
  );
}

function MentorFinance({ data, onRefresh, user, onNavigate }) {
  const f = data?.finance || data?.dashboard?.finance || {};
  const payouts = data?.payouts || [];
  const paidOut = payouts
    .filter((p) => p.status === 'paid' || p.status === 'approved')
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const account = f.payoutAccount || {};
  const [amount, setAmount] = useState('');
  const [bankName, setBankName] = useState(account.bankName || '');
  const [accountNumber, setAccountNumber] = useState(account.accountNumber || '');
  const [accountOwner, setAccountOwner] = useState(account.accountOwner || account.accountName || '');

  return (
    <View>
      <WelcomeHeader
        user={user}
        eyebrow="CỐ VẤN"
        title="Tài chính"
        subtitle="Số dư, tài khoản nhận tiền & yêu cầu rút"
        onProfilePress={() => onNavigate?.('profile')}
      />
      <View style={s.statGrid}>
        <StatCard icon="wallet" label="Khả dụng" value={formatVnd(f.availableBalance)} tone="lime" />
        <StatCard icon="time" label="Đang chờ" value={formatVnd(f.pendingBalance)} tone="amber" />
        <StatCard icon="arrow-up" label="Đã rút / duyệt" value={formatVnd(f.totalWithdrawn ?? paidOut)} />
        <StatCard icon="trending-up" label="Tổng thu" value={formatVnd(f.totalEarned ?? f.totalEarnings)} />
      </View>
      {f.incomeBreakdown ? (
        <Card>
          <Text style={s.cardTitle}>Nguồn thu</Text>
          <Text style={s.cardSub}>Booking: {formatVnd(f.incomeBreakdown.booking)} · Khóa học: {formatVnd(f.incomeBreakdown.course)}</Text>
          {f.commissionPolicy ? (
            <Text style={s.cardSub}>
              Phí nền tảng: booking {(Number(f.commissionPolicy.bookingRate || 0) * 100).toFixed(0)}% · khóa {(Number(f.commissionPolicy.courseRate || 0) * 100).toFixed(0)}%
            </Text>
          ) : null}
        </Card>
      ) : null}

      <Card>
        <Text style={s.cardTitle}>Tài khoản nhận tiền</Text>
        <TextInput style={s.input} placeholder="Ngân hàng" placeholderTextColor="#94a3b8" value={bankName} onChangeText={setBankName} />
        <TextInput style={s.input} placeholder="Số tài khoản" placeholderTextColor="#94a3b8" value={accountNumber} onChangeText={setAccountNumber} keyboardType="number-pad" />
        <TextInput style={s.input} placeholder="Chủ tài khoản" placeholderTextColor="#94a3b8" value={accountOwner} onChangeText={setAccountOwner} />
        <ActionBtn label="Lưu tài khoản" onPress={async () => {
          await runApi(
            () => mentorApi.updatePayoutAccount({ bankName, accountNumber, accountName: accountOwner }),
            { successMsg: 'Đã lưu tài khoản nhận tiền', onDone: onRefresh },
          );
        }} />
      </Card>

      <Card>
        <Text style={s.cardTitle}>Yêu cầu rút tiền</Text>
        <TextInput style={s.input} placeholder="Số tiền (VND)" placeholderTextColor="#94a3b8" value={amount} onChangeText={setAmount} keyboardType="number-pad" />
        <ActionBtn label="Gửi yêu cầu payout" tone="success" onPress={async () => {
          const ok = await runApi(
            () => mentorApi.requestPayout(amount),
            { successMsg: 'Đã gửi yêu cầu rút tiền', onDone: onRefresh },
          );
          if (ok) setAmount('');
        }} />
      </Card>

      <Section title="Lịch sử payout">
        {payouts.length === 0 ? <EmptyState text="Chưa có yêu cầu rút." /> : payouts.slice(0, 20).map((p) => (
          <Card key={p._id || p.id}>
            <View style={s.rowBetween}>
              <Text style={s.cardTitle}>{formatVnd(p.amount)}</Text>
              <Badge label={statusLabel(p.status)} tone={p.status === 'paid' ? 'ok' : p.status === 'pending' ? 'warn' : 'neutral'} />
            </View>
            <Text style={s.cardSub}>{p.createdAt ? new Date(p.createdAt).toLocaleString('vi-VN') : '—'}</Text>
          </Card>
        ))}
      </Section>
    </View>
  );
}

function MentorCourses({ data, onRefresh, user, onNavigate }) {
  const courses = data?.courses || [];
  const reviews = data?.reviews || [];
  const [tab, setTab] = useState('courses');
  const [busyId, setBusyId] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [replyDrafts, setReplyDrafts] = useState({});

  return (
    <View>
      <WelcomeHeader
        user={user}
        eyebrow="CỐ VẤN"
        title="Khóa & đánh giá"
        subtitle={`${courses.length} khóa · ${reviews.length} reviews`}
        onProfilePress={() => onNavigate?.('profile')}
      />
      <ChipRow
        value={tab}
        onChange={setTab}
        options={[
          { id: 'courses', label: `Khóa học (${courses.length})` },
          { id: 'reviews', label: `Reviews (${reviews.length})` },
        ]}
      />
      {tab === 'courses' ? (
        <ActionBtn
          label="Tạo khóa học mới"
          tone="success"
          onPress={() => {
            setTitle('');
            setPrice('');
            setDescription('');
            setCreateOpen(true);
          }}
        />
      ) : null}
      {tab === 'courses' && (courses.length === 0 ? <EmptyState text="Chưa có khóa học. Tạo khóa mới để gửi duyệt." /> : courses.map((c) => {
        const id = c._id || c.id;
        return (
          <Card key={id}>
            <Text style={s.cardTitle}>{c.title}</Text>
            <Text style={s.cardSub}>{statusLabel(c.status || c.publishStatus || 'draft')} · {formatVnd(c.price || 0)} · {c.enrollmentCount ?? c.studentsCount ?? 0} HV</Text>
            <View style={s.btnRow}>
              {(c.status !== 'published' && c.publishStatus !== 'published') ? (
                <ActionBtn
                  label="Gửi duyệt / Publish"
                  tone="success"
                  busy={busyId === `p-${id}`}
                  onPress={async () => {
                    setBusyId(`p-${id}`);
                    await runApi(() => mentorApi.publishCourse(id), { successMsg: 'Đã gửi publish', onDone: onRefresh });
                    setBusyId('');
                  }}
                />
              ) : null}
              <ActionBtn
                label="Lưu trữ"
                tone="ghost"
                busy={busyId === `a-${id}`}
                onPress={async () => {
                  const ok = await askConfirm('Lưu trữ khóa?', 'Khóa sẽ không còn hiển thị công khai.', {
                    confirmText: 'Lưu trữ',
                    destructive: true,
                  });
                  if (!ok) return;
                  setBusyId(`a-${id}`);
                  await runApi(() => mentorApi.archiveCourse(id), { successMsg: 'Đã lưu trữ khóa', onDone: onRefresh });
                  setBusyId('');
                }}
              />
            </View>
          </Card>
        );
      }))}
      {tab === 'reviews' && (reviews.length === 0 ? <EmptyState text="Chưa có đánh giá." /> : reviews.map((r) => {
        const rid = r._id || r.id;
        const existing = r.mentorReply || r.reply || '';
        return (
          <Card key={rid}>
            <Text style={s.cardTitle}>{r.userId?.name || r.reviewerName || 'Mentee'} · {r.rating || 0}★</Text>
            <Text style={s.cardSub}>{r.comment || r.content || '—'}</Text>
            {existing ? <Text style={[s.cardSub, { marginTop: 6 }]}>Trả lời: {existing}</Text> : null}
            <TextInput
              style={[s.input, { marginTop: 8, minHeight: 64, textAlignVertical: 'top' }]}
              multiline
              placeholder="Trả lời đánh giá…"
              placeholderTextColor="#94a3b8"
              value={replyDrafts[rid] ?? ''}
              onChangeText={(v) => setReplyDrafts((prev) => ({ ...prev, [rid]: v }))}
            />
            <View style={s.btnRow}>
              <ActionBtn
                label={existing ? 'Cập nhật trả lời' : 'Gửi trả lời'}
                busy={busyId === `r-${rid}`}
                onPress={async () => {
                  const reply = String(replyDrafts[rid] || '').trim();
                  if (!reply) {
                    showMsg('Thiếu nội dung', 'Nhập nội dung trả lời.');
                    return;
                  }
                  setBusyId(`r-${rid}`);
                  await runApi(() => mentorApi.replyToReview(rid, reply), {
                    successMsg: 'Đã gửi trả lời',
                    onDone: onRefresh,
                  });
                  setBusyId('');
                }}
              />
            </View>
          </Card>
        );
      }))}

      <Modal visible={createOpen} transparent animationType="fade" onRequestClose={() => setCreateOpen(false)}>
        <Pressable style={s.promptBackdrop} onPress={() => setCreateOpen(false)}>
          <Pressable style={s.promptCard} onPress={(e) => e.stopPropagation?.()}>
            <Text style={s.promptTitle}>Tạo khóa học</Text>
            <Text style={s.promptSub}>Tạo nháp rồi gửi duyệt khi sẵn sàng.</Text>
            <Text style={s.fieldLabel}>Tiêu đề *</Text>
            <TextInput
              style={s.input}
              value={title}
              onChangeText={setTitle}
              placeholder="VD: System Design từ cơ bản"
              placeholderTextColor="#94a3b8"
            />
            <Text style={s.fieldLabel}>Giá (VNĐ)</Text>
            <TextInput
              style={s.input}
              value={price}
              onChangeText={(v) => setPrice(v.replace(/\D/g, ''))}
              placeholder="VD: 499000"
              placeholderTextColor="#94a3b8"
              keyboardType="number-pad"
            />
            <Text style={s.fieldLabel}>Mô tả ngắn</Text>
            <TextInput
              style={[s.input, { minHeight: 80, textAlignVertical: 'top' }]}
              value={description}
              onChangeText={setDescription}
              placeholder="Giới thiệu khóa học…"
              placeholderTextColor="#94a3b8"
              multiline
            />
            <View style={s.btnRow}>
              <ActionBtn label="Hủy" tone="ghost" onPress={() => setCreateOpen(false)} disabled={creating} />
              <ActionBtn
                label="Tạo nháp"
                tone="success"
                busy={creating}
                onPress={async () => {
                  if (!String(title || '').trim()) {
                    showMsg('Thiếu tiêu đề', 'Nhập tiêu đề khóa học.');
                    return;
                  }
                  setCreating(true);
                  const r = await mentorApi.createCourse({
                    title: String(title).trim(),
                    price: Number(price) || 0,
                    description: String(description || '').trim(),
                  });
                  setCreating(false);
                  if (!r.success) {
                    showMsg('Lỗi', r.error || 'Không tạo được khóa');
                    return;
                  }
                  setCreateOpen(false);
                  showMsg('Thành công', 'Đã tạo khóa nháp. Bạn có thể gửi duyệt.');
                  onRefresh?.();
                }}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

export default function RolePortal({ role, activeTab, data, loading, onRefresh, user, onNavigate }) {
  const insets = useSafeAreaInsets();

  if (loading && !data) {
    return (
      <View style={s.wrap}>
        <LoadingBlock />
      </View>
    );
  }

  // Màn lịch có ScrollView riêng (copy web) — không bọc thêm
  if (role === 'mentor' && activeTab === 'mentor_schedule') {
    return (
      <View style={s.wrap}>
        <MentorSchedule data={data} onRefresh={onRefresh} user={user} onNavigate={onNavigate} />
      </View>
    );
  }

  let content = null;
  if (role === 'admin') {
    if (activeTab === 'admin_home') content = <AdminHome data={data} user={user} onNavigate={onNavigate} />;
    else if (activeTab === 'admin_mentors') content = <AdminMentors data={data} onRefresh={onRefresh} user={user} onNavigate={onNavigate} />;
    else if (activeTab === 'admin_ops' || activeTab === 'admin_bookings') content = <AdminOps data={data} onRefresh={onRefresh} user={user} onNavigate={onNavigate} />;
    else if (activeTab === 'admin_finance') content = <AdminFinance data={data} onRefresh={onRefresh} user={user} onNavigate={onNavigate} />;
    else if (activeTab === 'admin_content' || activeTab === 'admin_users') content = <AdminManage data={data} onRefresh={onRefresh} user={user} onNavigate={onNavigate} />;
  } else if (role === 'mentor') {
    if (activeTab === 'mentor_home') content = <MentorHome data={data} user={user} onNavigate={onNavigate} />;
    else if (activeTab === 'mentor_sessions') content = <MentorSessions data={data} onRefresh={onRefresh} user={user} onNavigate={onNavigate} />;
    else if (activeTab === 'mentor_finance') content = <MentorFinance data={data} onRefresh={onRefresh} user={user} onNavigate={onNavigate} />;
    else if (activeTab === 'mentor_courses' || activeTab === 'mentor_reviews') content = <MentorCourses data={data} onRefresh={onRefresh} user={user} onNavigate={onNavigate} />;
  }

  if (!content) return null;

  return (
    <View style={s.wrap}>
      <ScrollView
        style={s.bodyScroll}
        contentContainerStyle={[s.scroll, { paddingTop: Math.max(insets.top, 10) + 6 }]}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={!!loading} onRefresh={onRefresh} tintColor="#8037f4" />}
      >
        {content}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, minHeight: 0, backgroundColor: '#f5f0fc' },
  bodyScroll: { flex: 1, minHeight: 0 },
  scroll: { paddingHorizontal: 16, paddingBottom: 120 },

  welcomeBlock: { marginBottom: 14 },
  welcomeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  welcomeAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#efe6fa',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  welcomeAvatarImg: { width: 44, height: 44 },
  welcomeTextCol: { flex: 1, minWidth: 0 },
  welcomeHello: { color: '#8a7fa2', fontSize: 12, fontWeight: '600' },
  welcomeName: { color: '#2D1B69', fontSize: 18, fontWeight: '800', marginTop: 1 },
  welcomeEyebrow: {
    color: 'rgba(45, 27, 105, 0.58)',
    fontSize: 8,
    fontWeight: '600',
    letterSpacing: 1.3,
    marginBottom: 5,
    textTransform: 'uppercase',
  },
  welcomePageTitle: {
    color: '#2D1B69',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.7,
    lineHeight: 30,
  },
  welcomePageSub: { color: '#6f6287', fontSize: 13, marginTop: 6, lineHeight: 18 },

  homeStatsRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  homeStatPill: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(128,55,244,0.1)',
  },
  homeStatValue: { color: '#2D1B69', fontSize: 18, fontWeight: '800' },
  homeStatLabel: { color: '#8a7fa2', fontSize: 11, marginTop: 3, fontWeight: '600' },

  journeyCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(128,55,244,0.1)',
  },
  journeyHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  journeyEyebrow: { color: '#8037f4', fontSize: 10, fontWeight: '800', letterSpacing: 1.1 },
  journeyTitle: { color: '#2D1B69', fontSize: 16, fontWeight: '800', marginTop: 2 },
  journeySpark: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: 'rgba(147,247,43,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  journeyStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(45,27,105,0.08)',
  },
  journeyNumber: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  journeyNumberText: { fontSize: 11, fontWeight: '800' },
  journeyIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#faf7ff',
  },
  journeyBody: { flex: 1, minWidth: 0 },
  journeyStepTitle: { color: '#2D1B69', fontSize: 14, fontWeight: '700' },
  journeyStepDesc: { color: '#8a7fa2', fontSize: 12, marginTop: 2 },

  homeToolsRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  homeToolCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(128,55,244,0.1)',
  },
  homeToolIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(128,55,244,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  homeToolTitle: { color: '#2D1B69', fontSize: 14, fontWeight: '800' },
  homeToolDesc: { color: '#8a7fa2', fontSize: 12, marginTop: 4, lineHeight: 17 },

  hero: {
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(128,55,244,0.12)',
  },
  eyebrow: {
    color: '#8037f4',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
    marginBottom: 8,
  },
  heroTitle: { color: '#2D1B69', fontSize: 26, fontWeight: '800', lineHeight: 32 },
  heroAccent: { color: '#8037f4' },
  heroSub: { color: '#6f6287', fontSize: 13, marginTop: 8, lineHeight: 19 },

  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  statCard: {
    width: '47.5%',
    flexGrow: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(128,55,244,0.1)',
  },
  statIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statValue: { color: '#2D1B69', fontSize: 18, fontWeight: '800' },
  statLabel: { color: '#8a7fa2', fontSize: 11, marginTop: 3, fontWeight: '600' },

  section: { marginTop: 10, marginBottom: 6 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { color: '#2D1B69', fontSize: 16, fontWeight: '800' },
  sectionAction: { color: '#8037f4', fontSize: 12, fontWeight: '700' },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(128,55,244,0.1)',
  },
  cardTitle: { color: '#2D1B69', fontSize: 14, fontWeight: '700' },
  cardSub: { color: '#8a7fa2', fontSize: 12, marginTop: 4, lineHeight: 17 },

  personRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#efe6fa' },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(128,55,244,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#8037f4', fontWeight: '800' },

  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  badgeText: { fontSize: 10, fontWeight: '800' },

  btn: {
    marginTop: 0,
    alignSelf: 'flex-start',
    backgroundColor: '#8037f4',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#8037f4',
    minHeight: 36,
    justifyContent: 'center',
    zIndex: 2,
  },
  btnSuccess: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  btnDanger: { backgroundColor: '#dc2626', borderColor: '#dc2626' },
  btnGhost: {
    backgroundColor: '#ffffff',
    borderColor: '#8037f4',
  },
  btnText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  btnGhostText: { color: '#2D1B69' },
  btnRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10, zIndex: 2 },

  queueTile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(128,55,244,0.1)',
  },
  queueIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(128,55,244,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  queueTitle: { color: '#2D1B69', fontSize: 13, fontWeight: '800' },
  queueDesc: { color: '#8a7fa2', fontSize: 11, marginTop: 2 },
  queueCountWrap: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(147,247,43,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  queueCount: { color: '#3f7d00', fontWeight: '800', fontSize: 12 },

  chipScroll: { flexGrow: 0, marginBottom: 4 },
  chipRow: { gap: 8, paddingBottom: 12, alignItems: 'center' },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(128,55,244,0.12)',
  },
  chipActive: { backgroundColor: '#8037f4', borderColor: '#8037f4' },
  chipText: { color: '#6f6287', fontSize: 12, fontWeight: '700' },
  chipTextActive: { color: '#fff' },

  planRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  planChip: {
    flex: 1,
    minWidth: '22%',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(128,55,244,0.1)',
  },
  planNum: { color: '#8037f4', fontWeight: '800', fontSize: 16 },
  planLbl: { color: '#8a7fa2', fontSize: 10, marginTop: 2, fontWeight: '600' },

  input: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(128,55,244,0.14)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: '#2D1B69',
    backgroundColor: '#faf7ff',
  },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  empty: { alignItems: 'center', paddingVertical: 36 },
  emptyText: { color: '#a394bc', marginTop: 8, textAlign: 'center', fontSize: 13 },

  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,10,30,0.45)',
  },
  promptBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,10,30,0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  promptCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(128,55,244,0.12)',
  },
  promptTitle: {
    color: '#2D1B69',
    fontSize: 17,
    fontWeight: '800',
  },
  promptSub: {
    color: '#6f6287',
    fontSize: 12,
    marginTop: 6,
    marginBottom: 4,
    lineHeight: 17,
  },
  fieldLabel: {
    color: '#2D1B69',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 10,
  },
  modalSheet: {
    marginTop: 'auto',
    maxHeight: '78%',
    backgroundColor: '#f5f0fc',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 18,
    paddingBottom: 28,
    borderWidth: 1,
    borderColor: 'rgba(128,55,244,0.12)',
  },
});
