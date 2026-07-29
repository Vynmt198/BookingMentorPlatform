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
import { mentorApi } from '../services/roleApi';
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

function EmptyState({ icon = 'file-tray-outline', text }) {
  return (
    <View style={s.empty}>
      <Ionicons name={icon} size={34} color="#b6a8cf" />
      <Text style={s.emptyText}>{text}</Text>
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

      <View style={s.homeToolsRow}>
        <TouchableOpacity style={s.homeToolCard} onPress={() => onNavigate?.('mentor_analytics')} activeOpacity={0.88}>
          <View style={s.homeToolIcon}>
            <Ionicons name="stats-chart-outline" size={20} color="#8037f4" />
          </View>
          <Text style={s.homeToolTitle}>Phân tích</Text>
          <Text style={s.homeToolDesc} numberOfLines={2}>KPI & học viên</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.homeToolCard} onPress={() => onNavigate?.('mentor_peer_review')} activeOpacity={0.88}>
          <View style={s.homeToolIcon}>
            <Ionicons name="people-outline" size={20} color="#8037f4" />
          </View>
          <Text style={s.homeToolTitle}>Peer review</Text>
          <Text style={s.homeToolDesc} numberOfLines={2}>Duyệt khóa đồng nghiệp</Text>
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

function MentorSessions({ data, onRefresh, user, onNavigate, onOpenMeeting, onOpenFeedback }) {
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
              <View style={[s.btnRow, { marginTop: 8 }]}>
                  <ActionBtn
                    label="Vào phòng họp"
                    tone="success"
                    onPress={() => {
                      setSelected(null);
                      onOpenMeeting?.(selected);
                    }}
                  />
                </View>
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
                  <ActionBtn
                    label="Vào phòng"
                    busy={busyKey === 'start'}
                    onPress={() => {
                      setSelected(null);
                      onOpenMeeting?.(selected);
                    }}
                  />
                ) : null}
                {(selected.status === 'confirmed' || selected.status === 'in_progress') ? (
                  <ActionBtn label="Hoàn thành" tone="success" busy={busyKey === 'done'} onPress={() => act('done', () => mentorApi.completeBooking(selected._id || selected.id), 'Đã hoàn thành')} />
                ) : null}
                {selected.status === 'completed' ? (
                  <ActionBtn
                    label={selected.mentorSummary?.submittedAt ? 'Xem tổng kết' : 'Gửi tổng kết'}
                    onPress={() => {
                      setSelected(null);
                      onOpenFeedback?.(selected);
                    }}
                  />
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
                {(selected.status === 'confirmed' || selected.status === 'in_progress') ? (
                  <ActionBtn
                    label="Báo HV no-show"
                    tone="danger"
                    busy={busyKey === 'noshow'}
                    onPress={async () => {
                      const ok = await askConfirm('Báo học viên không đến?', 'Buổi sẽ chuyển trạng thái no_show.', {
                        confirmText: 'Xác nhận',
                        destructive: true,
                      });
                      if (!ok) return;
                      act(
                        'noshow',
                        () => mentorApi.reportCustomerNoShow(selected._id || selected.id, 'Học viên không đến'),
                        'Đã báo no-show',
                      );
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

function LoadingBlock({ label = 'Đang tải…' }) {
  return (
    <View style={s.loadingBlock}>
      <ActivityIndicator color="#8037f4" size="large" />
      <Text style={s.loadingText}>{label}</Text>
    </View>
  );
}

export default function RolePortal({ role, activeTab, data, loading, onRefresh, user, onNavigate, onOpenMeeting, onOpenFeedback }) {
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
  if (role === 'mentor') {
    if (activeTab === 'mentor_home') content = <MentorHome data={data} user={user} onNavigate={onNavigate} />;
    else if (activeTab === 'mentor_sessions') content = <MentorSessions data={data} onRefresh={onRefresh} user={user} onNavigate={onNavigate} onOpenMeeting={onOpenMeeting} onOpenFeedback={onOpenFeedback} />;
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
  loadingBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 64,
  },
  loadingText: { color: '#8a7fa2', fontSize: 14, fontWeight: '600' },

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
