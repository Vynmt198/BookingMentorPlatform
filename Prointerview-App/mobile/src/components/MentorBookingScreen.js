import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { resolveMediaUrl, mentorAvatarFallback } from '../utils/mediaUrl';
import { fetchMentor, fetchMentorAvailability } from '../services/proInterviewApi';
import { buildAvailableBookingDays, toBookingDate } from '../utils/bookingSchedule';
import {
  mentorDisplayTitle,
  mentorFieldTags,
  mentorIsVerified,
  mentorLocationLabel,
  mergeMentorProfile,
  resolveMentorSessionOffer,
} from '../utils/mentorDisplay';

function InfoRow({ icon, label, value }) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={14} color="#8037f4" style={styles.infoIcon} />
      <Text style={styles.infoText}>
        <Text style={styles.infoLabel}>{label}: </Text>
        <Text style={styles.infoValue}>{value}</Text>
      </Text>
    </View>
  );
}

function StarRating({ rating }) {
  const value = Number(rating) || 0;
  const filled = Math.round(value);
  return (
    <View style={styles.ratingRow}>
      <Text style={styles.ratingValue}>{value > 0 ? value.toFixed(1) : '—'}</Text>
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((index) => (
          <Ionicons
            key={index}
            name="star"
            size={12}
            color={index <= filled ? '#fbbf24' : '#e2e8f0'}
          />
        ))}
      </View>
    </View>
  );
}

function MentorProfileCard({ mentor }) {
  const tags = mentorFieldTags(mentor);
  const verified = mentorIsVerified(mentor);
  const subtitle = mentorDisplayTitle(mentor);
  const location = mentorLocationLabel(mentor.timezone);
  const experienceYears = Number(mentor.experience) || 0;
  const company =
    mentor.company && mentor.company !== 'Đang cập nhật' && mentor.company !== '—'
      ? mentor.company
      : null;
  const reviewCount = Number(mentor.reviews) || 0;

  return (
    <View style={styles.profileCard}>
      <View style={styles.profileTop}>
        <View style={styles.avatarCol}>
          <Image
            source={{ uri: resolveMediaUrl(mentor?.avatar) || mentorAvatarFallback(mentor?.name) }}
            style={styles.avatar}
          />
          {mentor.available !== false ? (
            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Sẵn sàng nhận lịch</Text>
            </View>
          ) : (
            <View style={[styles.statusBadge, styles.statusBadgeMuted]}>
              <Text style={styles.statusTextMuted}>Đang bận</Text>
            </View>
          )}
        </View>

        <View style={styles.profileBody}>
          <View style={styles.nameRow}>
            <Text style={styles.profileName} numberOfLines={2}>
              {mentor?.name}
            </Text>
            {verified ? (
              <Ionicons name="checkmark-circle" size={18} color="#f59e0b" />
            ) : null}
          </View>

          {tags.length ? (
            <View style={styles.tagsRow}>
              {tags.map((tag) => (
                <View key={tag} style={styles.tagPill}>
                  <Text style={styles.tagText} numberOfLines={1}>
                    {tag}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          <Text style={styles.profileRole}>{subtitle}</Text>

          <View style={styles.ratingWrap}>
            <StarRating rating={mentor.rating} />
            <Text style={styles.reviewCount}>
              ({reviewCount} {reviewCount === 1 ? 'đánh giá' : 'đánh giá'})
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.infoGrid}>
        <InfoRow icon="briefcase-outline" label="Chức vụ" value={subtitle} />
        <InfoRow
          icon="time-outline"
          label="Kinh nghiệm"
          value={experienceYears > 0 ? `${experienceYears} năm` : null}
        />
        <InfoRow icon="business-outline" label="Công ty" value={company} />
        <InfoRow icon="location-outline" label="Nơi ở" value={location} />
        {mentor.sessionsDone > 0 ? (
          <InfoRow
            icon="people-outline"
            label="Buổi mentor"
            value={`${mentor.sessionsDone} buổi`}
          />
        ) : null}
        {mentor.responseTime ? (
          <InfoRow icon="flash-outline" label="Phản hồi" value={mentor.responseTime} />
        ) : null}
      </View>

      {mentor.bio ? (
        <View style={styles.bioBlock}>
          <Text style={styles.bioTitle}>Giới thiệu</Text>
          <Text style={styles.bioText}>{mentor.bio}</Text>
        </View>
      ) : null}

      {mentor.profileEducation ? (
        <View style={styles.bioBlock}>
          <Text style={styles.bioTitle}>Học vấn</Text>
          <Text style={styles.bioText}>{mentor.profileEducation}</Text>
        </View>
      ) : null}

      {mentor.profileAwards ? (
        <View style={styles.bioBlock}>
          <Text style={styles.bioTitle}>Giải thưởng</Text>
          <Text style={styles.bioText}>{mentor.profileAwards}</Text>
        </View>
      ) : null}
    </View>
  );
}

export default function MentorBookingScreen({ mentor, onBack, onConfirm }) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState(mentor);
  const [days, setDays] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    setDays([]);
    setSelectedDate('');
    setSelectedTime('');
    setProfile(mentor);

    (async () => {
      const [profileRes, availabilityRes] = await Promise.all([
        fetchMentor(mentor?.id),
        fetchMentorAvailability(mentor?.id),
      ]);
      if (cancelled) return;

      const merged = mergeMentorProfile(mentor, profileRes.success ? profileRes.mentor : null);
      setProfile(merged || mentor);

      const availableDays = buildAvailableBookingDays(availabilityRes.availability);
      setDays(availableDays);
      if (availableDays.length) {
        setSelectedDate(availableDays[0].key);
        setSelectedTime(availableDays[0].slots[0] || '');
      } else {
        setError(
          availabilityRes.error || 'Mentor chưa mở lịch trống trong thời gian tới.',
        );
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [mentor]);

  const activeSlots = useMemo(
    () => days.find((day) => day.key === selectedDate)?.slots || [],
    [days, selectedDate],
  );

  const sessionOffer = useMemo(() => resolveMentorSessionOffer(profile), [profile]);
  const priceLabel =
    sessionOffer.price > 0
      ? `${Number(sessionOffer.price).toLocaleString('vi-VN')}đ`
      : 'Liên hệ';

  const handleConfirm = async () => {
    if (!selectedDate || !selectedTime) {
      setError('Vui lòng chọn ngày và khung giờ.');
      return;
    }
    setError('');
    setSubmitting(true);
    const bookingDraft = {
      mentorId: profile.id,
      mentor: profile,
      timeSlot: selectedTime,
      date: toBookingDate(selectedDate),
      sessionType: 'mock_interview',
      durationMinutes: sessionOffer.minutes,
      amount: Number(sessionOffer.price) || 0,
      notes: `Luyện tập phỏng vấn 1-1 về chuyên môn với ${profile.name}`,
    };
    await Promise.resolve(onConfirm?.(bookingDraft));
    setSubmitting(false);
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.85}>
          <Ionicons name="arrow-back" size={20} color="#334155" />
        </TouchableOpacity>
        <View style={styles.topBarMain}>
          <Text style={styles.topBarEyebrow}>ĐẶT LỊCH 1-1</Text>
          <Text style={styles.topBarTitle} numberOfLines={1}>
            {profile?.name || 'Mentor'}
          </Text>
        </View>
        <View style={styles.topBarSpacer} />
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color="#7000ff" size="large" />
          <Text style={styles.loadingText}>Đang tải hồ sơ và lịch trống...</Text>
        </View>
      ) : (
        <>
          <ScrollView
            style={styles.body}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.bodyContent}
          >
            <MentorProfileCard mentor={profile} />

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Chọn ngày</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.dateRow}
              >
                {days.map((day) => {
                  const active = selectedDate === day.key;
                  return (
                    <TouchableOpacity
                      key={day.key}
                      style={[styles.datePill, active && styles.datePillActive]}
                      onPress={() => {
                        setSelectedDate(day.key);
                        setSelectedTime(day.slots[0] || '');
                        setError('');
                      }}
                    >
                      <Text style={[styles.dateText, active && styles.dateTextActive]}>
                        {day.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Khung giờ khả dụng</Text>
              <View style={styles.timeGrid}>
                {activeSlots.map((slot) => {
                  const active = selectedTime === slot;
                  return (
                    <TouchableOpacity
                      key={slot}
                      style={[styles.timePill, active && styles.timePillActive]}
                      onPress={() => {
                        setSelectedTime(slot);
                        setError('');
                      }}
                    >
                      <Ionicons
                        name="time-outline"
                        size={14}
                        color={active ? '#10131e' : '#94a3b8'}
                      />
                      <Text style={[styles.timeText, active && styles.timeTextActive]}>{slot}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.summaryCard}>
              <View>
                <Text style={styles.summaryLabel}>Chi phí buổi học</Text>
                <Text style={styles.summaryPrice}>{priceLabel}</Text>
              </View>
              <Text style={styles.summaryDuration}>{sessionOffer.minutes} phút</Text>
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <TouchableOpacity
              activeOpacity={0.85}
              disabled={submitting || !selectedTime}
              onPress={handleConfirm}
            >
              <LinearGradient
                colors={selectedTime ? ['#a7ff4f', '#83ed20'] : ['#e2e8f0', '#cbd5e1']}
                style={styles.submitBtn}
              >
                {submitting ? (
                  <ActivityIndicator color="#10131e" />
                ) : (
                  <>
                    <Text style={styles.submitText}>Xác nhận lịch hẹn</Text>
                    <Ionicons name="arrow-forward" size={17} color="#10131e" />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    minHeight: 0,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(128, 55, 244, 0.1)',
  },
  topBarMain: {
    flex: 1,
    marginHorizontal: 12,
  },
  topBarEyebrow: {
    color: '#65a30d',
    fontSize: 9,
    letterSpacing: 1.2,
    fontFamily: 'Manrope_700Bold',
  },
  topBarTitle: {
    color: '#1e1b4b',
    fontSize: 18,
    fontFamily: 'Manrope_800ExtraBold',
  },
  topBarSpacer: {
    width: 40,
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#64748b',
    fontSize: 14,
    fontFamily: 'Manrope_500Medium',
  },
  body: {
    flex: 1,
    minHeight: 0,
  },
  bodyContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 14,
  },
  profileCard: {
    padding: 16,
    borderRadius: 26,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(186, 165, 255, 0.38)',
    ...Platform.select({
      ios: {
        shadowColor: '#8037f4',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 14,
      },
      android: { elevation: 3 },
      default: {},
    }),
  },
  profileTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  avatarCol: {
    alignItems: 'center',
    width: 88,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: '#ede9fe',
    borderWidth: 3,
    borderColor: '#f5f3ff',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#ecfdf5',
  },
  statusBadgeMuted: {
    backgroundColor: '#f1f5f9',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  statusText: {
    color: '#047857',
    fontSize: 9,
    fontFamily: 'Manrope_600SemiBold',
  },
  statusTextMuted: {
    color: '#64748b',
    fontSize: 9,
    fontFamily: 'Manrope_600SemiBold',
  },
  profileBody: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  profileName: {
    flex: 1,
    color: '#0f172a',
    fontSize: 18,
    fontFamily: 'Manrope_800ExtraBold',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  tagPill: {
    maxWidth: '100%',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: '#f5f3ff',
    borderWidth: 1,
    borderColor: 'rgba(128, 55, 244, 0.14)',
  },
  tagText: {
    color: '#6d28d9',
    fontSize: 10,
    fontFamily: 'Manrope_600SemiBold',
  },
  profileRole: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 8,
    fontFamily: 'Manrope_500Medium',
  },
  ratingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingValue: {
    color: '#0f172a',
    fontSize: 14,
    fontFamily: 'Manrope_700Bold',
  },
  starsRow: {
    flexDirection: 'row',
    gap: 1,
  },
  reviewCount: {
    color: '#94a3b8',
    fontSize: 11,
    fontFamily: 'Manrope_500Medium',
  },
  infoGrid: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128, 55, 244, 0.08)',
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  infoIcon: {
    marginTop: 1,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: 'Manrope_500Medium',
  },
  infoLabel: {
    color: '#64748b',
  },
  infoValue: {
    color: '#0f172a',
    fontFamily: 'Manrope_600SemiBold',
  },
  bioBlock: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128, 55, 244, 0.08)',
  },
  bioTitle: {
    color: '#334155',
    fontSize: 12,
    marginBottom: 6,
    fontFamily: 'Manrope_700Bold',
  },
  bioText: {
    color: '#475569',
    fontSize: 12,
    lineHeight: 19,
    fontFamily: 'Manrope_500Medium',
  },
  sectionCard: {
    padding: 16,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(186, 165, 255, 0.28)',
  },
  sectionTitle: {
    color: '#334155',
    fontSize: 13,
    marginBottom: 12,
    fontFamily: 'Manrope_700Bold',
  },
  dateRow: {
    gap: 10,
    paddingRight: 8,
  },
  datePill: {
    minWidth: 96,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#faf8ff',
    borderWidth: 1,
    borderColor: 'rgba(128, 55, 244, 0.12)',
  },
  datePillActive: {
    backgroundColor: 'rgba(112, 0, 255, 0.08)',
    borderColor: '#7000ff',
  },
  dateText: {
    color: '#64748b',
    fontSize: 11,
    textTransform: 'capitalize',
    fontFamily: 'Manrope_600SemiBold',
  },
  dateTextActive: {
    color: '#7000ff',
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  timePill: {
    minWidth: 88,
    height: 40,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#faf8ff',
    borderWidth: 1,
    borderColor: 'rgba(128, 55, 244, 0.12)',
  },
  timePillActive: {
    backgroundColor: '#93f72b',
    borderColor: '#93f72b',
  },
  timeText: {
    color: '#64748b',
    fontSize: 12,
    fontFamily: 'Manrope_600SemiBold',
  },
  timeTextActive: {
    color: '#10131e',
  },
  summaryCard: {
    minHeight: 68,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#f5f0fc',
    borderWidth: 1,
    borderColor: 'rgba(128, 55, 244, 0.1)',
  },
  summaryLabel: {
    color: '#64748b',
    fontSize: 11,
    marginBottom: 2,
    fontFamily: 'Manrope_500Medium',
  },
  summaryPrice: {
    color: '#0f172a',
    fontSize: 18,
    fontFamily: 'Manrope_800ExtraBold',
  },
  summaryDuration: {
    color: '#65a30d',
    fontSize: 12,
    fontFamily: 'Manrope_700Bold',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 12,
    lineHeight: 18,
    fontFamily: 'Manrope_500Medium',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128, 55, 244, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
  },
  submitBtn: {
    height: 54,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitText: {
    color: '#10131e',
    fontSize: 14,
    fontFamily: 'Manrope_700Bold',
  },
});
