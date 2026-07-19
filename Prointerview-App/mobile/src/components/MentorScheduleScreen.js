/**
 * Lịch mentor — port từ ProInterview web MentorSchedule.jsx
 * API: GET /api/bookings/mentor/list, GET /api/mentors/:id/availability,
 *      PATCH /api/mentors/me/availability { recurringSchedule }
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { mentorApi } from '../services/roleApi';
import { resolveMediaUrl } from '../utils/mediaUrl';

const DAY_ROWS = [
  { key: 0, label: 'Thứ 2' },
  { key: 1, label: 'Thứ 3' },
  { key: 2, label: 'Thứ 4' },
  { key: 3, label: 'Thứ 5' },
  { key: 4, label: 'Thứ 6' },
  { key: 5, label: 'Thứ 7' },
  { key: 6, label: 'Chủ nhật' },
];

const SLOT_OPTIONS = Array.from({ length: 16 }, (_, i) => {
  const hour = i + 7;
  return `${String(hour).padStart(2, '0')}:00`;
});

const STATUS_LABELS = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  in_progress: 'Đang diễn ra',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
  rescheduled: 'Đổi lịch',
  no_show: 'Không tham gia',
};

function toOneHourRange(start) {
  const [h, m] = String(start || '09:00').split(':').map(Number);
  const safeH = Number.isFinite(h) ? h : 9;
  const safeM = Number.isFinite(m) ? m : 0;
  const end = `${String(Math.min(safeH + 1, 23)).padStart(2, '0')}:${String(safeM).padStart(2, '0')}`;
  return `${String(safeH).padStart(2, '0')}:${String(safeM).padStart(2, '0')} - ${end}`;
}

function toRowSlots(slots = []) {
  return slots.filter(Boolean).map((s) => {
    const [h, m] = String(s).split(':').map(Number);
    const endHour = Math.min((Number.isFinite(h) ? h : 0) + 1, 23);
    const end = `${String(endHour).padStart(2, '0')}:${String(Number.isFinite(m) ? m : 0).padStart(2, '0')}`;
    return `${s} - ${end}`;
  });
}

function toStartSlots(rangeSlots = []) {
  return rangeSlots
    .map((s) => String(s).split('-')[0]?.trim())
    .filter((v) => /^\d{2}:\d{2}$/.test(v));
}

function bookingOnDate(bookingDate, selectedDate) {
  const normalized = String(bookingDate || '').trim();
  if (!normalized) return false;
  const parts = normalized.split('/');
  if (parts.length < 2) return false;
  const d = Number(parts[0]);
  const m = Number(parts[1]);
  const y = parts.length >= 3 ? Number(parts[2]) : null;
  if (!Number.isFinite(d) || !Number.isFinite(m)) return false;
  if (y && y !== selectedDate.getFullYear()) return false;
  return d === selectedDate.getDate() && m === selectedDate.getMonth() + 1;
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function AvailabilityEditor({ visible, onClose, availability, onSaved }) {
  const [workingHours, setWorkingHours] = useState([]);
  const [saving, setSaving] = useState(false);
  const [newSlotDay, setNewSlotDay] = useState(0);
  const [newSlotStart, setNewSlotStart] = useState('09:00');

  useEffect(() => {
    if (!visible) return;
    const recurring = Array.isArray(availability?.recurringSchedule) ? availability.recurringSchedule : [];
    const rows = recurring
      .filter((r) => Number.isFinite(Number(r?.dayOfWeek)))
      .map((r) => ({
        dayOfWeek: Number(r.dayOfWeek),
        day: DAY_ROWS.find((d) => d.key === Number(r.dayOfWeek))?.label || `Ngày ${r.dayOfWeek}`,
        slots: toRowSlots(Array.isArray(r.slots) ? r.slots : []),
      }))
      .sort((a, b) => a.dayOfWeek - b.dayOfWeek);
    setWorkingHours(rows);
  }, [visible, availability]);

  const addSlot = () => {
    const value = newSlotStart;
    const range = toOneHourRange(value);
    setWorkingHours((prev) => {
      const exists = prev.some((row) => row.dayOfWeek === newSlotDay);
      if (!exists) {
        return [
          ...prev,
          {
            dayOfWeek: newSlotDay,
            day: DAY_ROWS.find((d) => d.key === newSlotDay)?.label || 'Thứ',
            slots: [range],
          },
        ].sort((a, b) => a.dayOfWeek - b.dayOfWeek);
      }
      return prev
        .map((row) => {
          if (row.dayOfWeek !== newSlotDay) return row;
          if (row.slots.includes(range)) return row;
          return { ...row, slots: [...row.slots, range].sort((a, b) => a.localeCompare(b)) };
        })
        .sort((a, b) => a.dayOfWeek - b.dayOfWeek);
    });
  };

  const removeSlot = (dayOfWeek, slot) => {
    setWorkingHours((prev) =>
      prev
        .map((row) => (row.dayOfWeek === dayOfWeek ? { ...row, slots: row.slots.filter((s) => s !== slot) } : row))
        .filter((row) => row.slots.length > 0)
        .sort((a, b) => a.dayOfWeek - b.dayOfWeek),
    );
  };

  const handleSave = async () => {
    setSaving(true);
    const recurringSchedule = workingHours
      .map((row) => ({ dayOfWeek: row.dayOfWeek, slots: toStartSlots(row.slots) }))
      .filter((row) => row.slots.length > 0)
      .sort((a, b) => a.dayOfWeek - b.dayOfWeek);
    const result = await mentorApi.updateAvailability({ recurringSchedule });
    setSaving(false);
    if (!result.success) {
      Alert.alert('Không lưu được', result.error || 'API lịch trống lỗi.');
      return;
    }
    Alert.alert('Thành công', 'Đã lưu lịch rảnh lên server.');
    onSaved?.(result.availability || { recurringSchedule });
    onClose?.();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose} />
      <View style={styles.modalSheet}>
        <View style={styles.modalHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.modalTitle}>Cài đặt thời gian rảnh</Text>
            <Text style={styles.modalSub}>Lịch làm việc định kỳ · API PATCH /mentors/me/availability</Text>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={18} color="#6f6287" />
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
          <View style={styles.tzBox}>
            <Ionicons name="globe-outline" size={18} color="#8037f4" />
            <View>
              <Text style={styles.cardTitle}>Múi giờ hệ thống</Text>
              <Text style={styles.cardSub}>(GMT+07:00) Asia/Ho_Chi_Minh</Text>
            </View>
          </View>

          {workingHours.length === 0 ? (
            <Text style={[styles.cardSub, { marginBottom: 12 }]}>Chưa có khung giờ. Thêm bên dưới rồi Lưu.</Text>
          ) : null}

          {workingHours.map((row) => (
            <View key={row.dayOfWeek} style={styles.dayCard}>
              <Text style={styles.dayLabel}>{row.day}</Text>
              <View style={styles.slotWrap}>
                {row.slots.map((slot) => (
                  <View key={slot} style={styles.slotChip}>
                    <Text style={styles.slotText}>{slot}</Text>
                    <TouchableOpacity onPress={() => removeSlot(row.dayOfWeek, slot)} hitSlop={8}>
                      <Ionicons name="close" size={14} color="#dc2626" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          ))}

          <View style={styles.addBox}>
            <Text style={styles.addTitle}>Thêm khung giờ mới</Text>
            <Text style={styles.fieldLabel}>Ngày trong tuần</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {DAY_ROWS.map((d) => (
                <TouchableOpacity
                  key={d.key}
                  style={[styles.pickChip, newSlotDay === d.key && styles.pickChipActive]}
                  onPress={() => setNewSlotDay(d.key)}
                >
                  <Text style={[styles.pickChipText, newSlotDay === d.key && styles.pickChipTextActive]}>{d.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={styles.fieldLabel}>Bắt đầu từ</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {SLOT_OPTIONS.map((start) => (
                <TouchableOpacity
                  key={start}
                  style={[styles.pickChip, newSlotStart === start && styles.pickChipActive]}
                  onPress={() => setNewSlotStart(start)}
                >
                  <Text style={[styles.pickChipText, newSlotStart === start && styles.pickChipTextActive]}>
                    {toOneHourRange(start)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.addBtn} onPress={addSlot}>
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={styles.addBtnText}>Thêm vào lịch</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <View style={styles.modalFooter}>
          <Text style={styles.footerNote}>Thay đổi lưu ngay lên MongoDB qua API thật</Text>
          <View style={styles.footerActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#120B2E" /> : <Text style={styles.saveBtnText}>Lưu cấu hình</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function MentorScheduleScreen({ profile, bookings = [], onRefreshParent, user, onNavigate }) {
  const insets = useSafeAreaInsets();
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [showEditor, setShowEditor] = useState(false);
  const [availability, setAvailability] = useState(null);
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const mentorId = profile?.publicId || profile?.id || profile?._id || profile?.userId;

  const load = useCallback(async () => {
    const [bookRes, availRes, meRes] = await Promise.all([
      mentorApi.getBookings(),
      mentorId ? mentorApi.getAvailability(mentorId) : Promise.resolve({ success: false }),
      mentorApi.getMyProfile(),
    ]);

    if (bookRes.success) {
      setMeetings(bookRes.bookings || []);
    } else if (Array.isArray(bookings) && bookings.length) {
      setMeetings(bookings);
    } else {
      setMeetings([]);
    }

    if (availRes.success && availRes.availability) {
      setAvailability(availRes.availability);
    } else if (meRes.success && meRes.mentor) {
      setAvailability({
        recurringSchedule: meRes.mentor.recurringSchedule || [],
        availableSlots: meRes.mentor.availableSlots || {},
        blockedDates: meRes.mentor.blockedDates || [],
        timezone: meRes.mentor.timezone || 'Asia/Ho_Chi_Minh',
      });
    }
    setLoading(false);
  }, [mentorId, bookings]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    onRefreshParent?.();
    setRefreshing(false);
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIso = (new Date(year, month, 1).getDay() + 6) % 7;

  const calendarDays = useMemo(() => {
    const prev = Array.from({ length: firstDayIso }, (_, i) => {
      const d = new Date(year, month, -firstDayIso + i + 1);
      return { date: d, currentMonth: false };
    });
    const curr = Array.from({ length: daysInMonth }, (_, i) => ({
      date: new Date(year, month, i + 1),
      currentMonth: true,
    }));
    const merged = [...prev, ...curr];
    const total = Math.ceil(merged.length / 7) * 7;
    const pad = Array.from({ length: total - merged.length }, (_, i) => ({
      date: new Date(year, month + 1, i + 1),
      currentMonth: false,
    }));
    return [...merged, ...pad];
  }, [year, month, daysInMonth, firstDayIso]);

  const dayMeetings = meetings.filter((b) => bookingOnDate(b.date, selectedDate));
  const recurringCount = (availability?.recurringSchedule || []).filter((r) => (r.slots || []).length).length;

  if (loading) {
    return (
      <View style={[styles.wrap, styles.center]}>
        <ActivityIndicator color="#8037f4" size="large" />
        <Text style={styles.cardSub}>Đang tải lịch từ API…</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: Math.max(insets.top, 8) + 4 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8037f4" />}
      >
        <View style={styles.welcomeBlock}>
          <TouchableOpacity
            style={styles.welcomeRow}
            activeOpacity={onNavigate ? 0.85 : 1}
            onPress={() => onNavigate?.('profile')}
            disabled={!onNavigate}
          >
            <View style={styles.welcomeAvatar}>
              {(user?.avatar || profile?.avatar) ? (
                <Image
                  source={{ uri: resolveMediaUrl(user?.avatar || profile?.avatar) }}
                  style={styles.welcomeAvatarImg}
                />
              ) : (
                <Ionicons name="person" size={20} color="#8037f4" />
              )}
            </View>
            <View style={styles.welcomeTextCol}>
              <Text style={styles.welcomeHello}>Xin chào</Text>
              <Text style={styles.welcomeName} numberOfLines={1}>
                {user?.name || profile?.name || 'Bạn'}
              </Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.welcomePageTitle}>Lịch trống</Text>
          <Text style={styles.welcomePageSub}>Lịch hẹn + khung giờ rảnh nhận booking</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => setShowEditor(true)}>
            <Ionicons name="settings-outline" size={16} color="#fff" />
            <Text style={styles.primaryBtnText}>Cài đặt thời gian rảnh</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{meetings.length}</Text>
            <Text style={styles.statLbl}>Buổi hẹn</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{recurringCount}</Text>
            <Text style={styles.statLbl}>Ngày nhận lịch</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{dayMeetings.length}</Text>
            <Text style={styles.statLbl}>Ngày chọn</Text>
          </View>
        </View>

        <View style={styles.calCard}>
          <View style={styles.calHead}>
            <TouchableOpacity
              style={styles.navBtn}
              onPress={() => setCurrentDate(new Date(year, month - 1, 1))}
            >
              <Ionicons name="chevron-back" size={18} color="#2D1B69" />
            </TouchableOpacity>
            <Text style={styles.calMonth}>Tháng {month + 1} năm {year}</Text>
            <TouchableOpacity
              style={styles.navBtn}
              onPress={() => setCurrentDate(new Date(year, month + 1, 1))}
            >
              <Ionicons name="chevron-forward" size={18} color="#2D1B69" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.todayBtn}
            onPress={() => {
              const t = new Date();
              setCurrentDate(new Date(t.getFullYear(), t.getMonth(), 1));
              setSelectedDate(t);
            }}
          >
            <Text style={styles.todayBtnText}>Hôm nay</Text>
          </TouchableOpacity>

          <View style={styles.weekRow}>
            {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((d) => (
              <Text key={d} style={styles.weekLbl}>{d}</Text>
            ))}
          </View>

          <View style={styles.grid}>
            {calendarDays.map(({ date, currentMonth }, idx) => {
              const active = isSameDay(date, selectedDate);
              const today = isSameDay(date, new Date());
              const hasDot = meetings.some((b) => bookingOnDate(b.date, date));
              return (
                <TouchableOpacity
                  key={`${date.toISOString()}-${idx}`}
                  style={[
                    styles.cell,
                    !currentMonth && styles.cellMuted,
                    today && !active && styles.cellToday,
                    active && styles.cellActive,
                  ]}
                  onPress={() => setSelectedDate(date)}
                >
                  <Text style={[styles.cellText, active && styles.cellTextActive, !currentMonth && styles.cellTextMuted]}>
                    {date.getDate()}
                  </Text>
                  {hasDot ? <View style={[styles.dot, active && styles.dotActive]} /> : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <Text style={styles.sectionTitle}>
          Ngày {selectedDate.getDate()} · Tháng {selectedDate.getMonth() + 1}
        </Text>
        {dayMeetings.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={32} color="#b6a8cf" />
            <Text style={styles.cardSub}>Không có buổi hẹn trong ngày này.</Text>
          </View>
        ) : (
          dayMeetings.map((b) => {
            const uri = resolveMediaUrl(b.customerAvatar || b.userId?.avatar);
            return (
              <View key={b.id || b._id} style={styles.meetingCard}>
                {uri ? (
                  <Image source={{ uri }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarText}>{(b.customerName || 'M').slice(0, 1)}</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{b.customerName || b.userId?.name || 'Mentee'}</Text>
                  <Text style={styles.cardSub}>
                    {b.timeSlot || '--:--'} · {STATUS_LABELS[b.status] || b.status} · {b.sessionType || 'session'}
                  </Text>
                </View>
              </View>
            );
          })
        )}

        <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Khung giờ rảnh hàng tuần</Text>
        {(availability?.recurringSchedule || []).length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.cardSub}>Chưa cấu hình. Bấm “Cài đặt thời gian rảnh”.</Text>
          </View>
        ) : (
          (availability.recurringSchedule || [])
            .filter((r) => (r.slots || []).length)
            .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
            .map((r) => (
              <View key={r.dayOfWeek} style={styles.dayCard}>
                <Text style={styles.dayLabel}>{DAY_ROWS.find((d) => d.key === r.dayOfWeek)?.label || `Ngày ${r.dayOfWeek}`}</Text>
                <Text style={styles.cardSub}>{(r.slots || []).map((s) => toOneHourRange(s)).join(' · ')}</Text>
              </View>
            ))
        )}
      </ScrollView>

      <AvailabilityEditor
        visible={showEditor}
        onClose={() => setShowEditor(false)}
        availability={availability}
        onSaved={(next) => {
          setAvailability(next);
          onRefreshParent?.();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#f5f0fc' },
  center: { alignItems: 'center', justifyContent: 'center', gap: 8 },
  scroll: { paddingHorizontal: 16, paddingBottom: 120 },
  welcomeBlock: { marginBottom: 14 },
  welcomeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
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
  welcomePageTitle: { color: '#2D1B69', fontSize: 24, fontWeight: '800', lineHeight: 30 },
  welcomePageSub: { color: '#6f6287', fontSize: 13, marginTop: 6, marginBottom: 14, lineHeight: 18 },
  hero: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(128,55,244,0.12)',
  },
  eyebrow: { color: '#8037f4', fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginBottom: 6 },
  heroTitle: { color: '#2D1B69', fontSize: 24, fontWeight: '800' },
  heroSub: { color: '#6f6287', fontSize: 13, marginTop: 6, marginBottom: 14 },
  primaryBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#8037f4',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 999,
  },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  statRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statBox: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(128,55,244,0.1)',
  },
  statNum: { color: '#8037f4', fontSize: 18, fontWeight: '800' },
  statLbl: { color: '#8a7fa2', fontSize: 11, marginTop: 2, fontWeight: '600' },
  calCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(128,55,244,0.1)',
    marginBottom: 14,
  },
  calHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  calMonth: { color: '#2D1B69', fontWeight: '800', fontSize: 15 },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(128,55,244,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayBtn: { alignSelf: 'center', marginVertical: 8, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(147,247,43,0.25)' },
  todayBtnText: { color: '#3f7d00', fontWeight: '800', fontSize: 12 },
  weekRow: { flexDirection: 'row', marginBottom: 6 },
  weekLbl: { flex: 1, textAlign: 'center', color: '#8a7fa2', fontSize: 11, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    position: 'relative',
  },
  cellMuted: { opacity: 0.35 },
  cellToday: { borderWidth: 2, borderColor: 'rgba(147,247,43,0.85)' },
  cellActive: { backgroundColor: '#93f72b' },
  cellText: { color: '#2D1B69', fontWeight: '700', fontSize: 13 },
  cellTextActive: { color: '#0a0814' },
  cellTextMuted: { color: '#94a3b8' },
  dot: {
    position: 'absolute',
    bottom: 6,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#8037f4',
  },
  dotActive: { backgroundColor: '#630ed4' },
  sectionTitle: { color: '#2D1B69', fontSize: 16, fontWeight: '800', marginBottom: 10 },
  meetingCard: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(128,55,244,0.1)',
  },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(128,55,244,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#8037f4', fontWeight: '800' },
  cardTitle: { color: '#2D1B69', fontWeight: '700', fontSize: 14 },
  cardSub: { color: '#8a7fa2', fontSize: 12, marginTop: 3 },
  dayCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(128,55,244,0.1)',
  },
  dayLabel: { color: '#2D1B69', fontWeight: '800', marginBottom: 4 },
  empty: { alignItems: 'center', paddingVertical: 24, gap: 6 },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,10,30,0.45)' },
  modalSheet: {
    marginTop: '8%',
    flex: 1,
    backgroundColor: '#f5f0fc',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,55,244,0.1)',
    backgroundColor: '#fff',
  },
  modalTitle: { color: '#2D1B69', fontSize: 18, fontWeight: '800' },
  modalSub: { color: '#8a7fa2', fontSize: 12, marginTop: 3 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#f1eafb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tzBox: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(128,55,244,0.08)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  slotWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  slotChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#faf7ff',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(128,55,244,0.12)',
  },
  slotText: { color: '#2D1B69', fontSize: 12, fontWeight: '600' },
  addBox: {
    marginTop: 8,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(128,55,244,0.25)',
    borderRadius: 16,
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  addTitle: { textAlign: 'center', color: '#6f6287', marginBottom: 10, fontWeight: '600' },
  fieldLabel: { color: '#8037f4', fontSize: 11, fontWeight: '700', marginBottom: 6, marginTop: 8 },
  chipRow: { gap: 8, paddingBottom: 4 },
  pickChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(128,55,244,0.12)',
  },
  pickChipActive: { backgroundColor: '#8037f4', borderColor: '#8037f4' },
  pickChipText: { color: '#6f6287', fontSize: 12, fontWeight: '700' },
  pickChipTextActive: { color: '#fff' },
  addBtn: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#8037f4',
    borderRadius: 14,
    paddingVertical: 12,
  },
  addBtnText: { color: '#fff', fontWeight: '800' },
  modalFooter: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(128,55,244,0.1)',
    padding: 14,
    backgroundColor: '#fff',
  },
  footerNote: { color: '#8a7fa2', fontSize: 11, marginBottom: 10 },
  footerActions: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },
  cancelBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(128,55,244,0.15)',
  },
  cancelBtnText: { color: '#6f6287', fontWeight: '700' },
  saveBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#93f72b',
    minWidth: 120,
    alignItems: 'center',
  },
  saveBtnText: { color: '#120B2E', fontWeight: '800' },
});
