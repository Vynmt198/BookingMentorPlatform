import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  TextInput,
  StyleSheet,
  Platform,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

const MENTOR_CATEGORIES = ['Tất cả', 'Frontend', 'Backend', 'AI/ML', 'Product'];

const HOME_NAV_CLEARANCE = Platform.OS === 'ios' ? 84 : 72;

function formatMentorPrice(price) {
  const value = Number(price) || 0;
  if (value <= 0) return '—';
  if (value >= 1000) return `${Math.round(value / 1000)}K`;
  return `${value.toLocaleString('vi-VN')}đ`;
}

function displayMentorRole(mentor) {
  const role = String(mentor.role || mentor.title || '').trim();
  if (role && role.toLowerCase() !== 'mentor') return role;
  if (mentor.company && mentor.company !== 'Đang cập nhật') return mentor.company;
  return 'Mentor ProInterview';
}

function mentorMatchesSearch(mentor, query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    mentor.name,
    mentor.role,
    mentor.title,
    mentor.company,
    mentor.bio,
    ...(mentor.specialties || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
}

export default function MentorsScreen({
  mentors = [],
  loading = false,
  searchQuery = '',
  onSearchChange,
  selectedCategory = 'Tất cả',
  onCategoryChange,
  onMentorPress,
  topInset = 0,
}) {
  const filteredMentors = useMemo(
    () =>
      mentors.filter((mentor) => {
        const matchSearch = mentorMatchesSearch(mentor, searchQuery);
        const matchCategory =
          selectedCategory === 'Tất cả' || mentor.category === selectedCategory;
        return matchSearch && matchCategory;
      }),
    [mentors, searchQuery, selectedCategory],
  );

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Mentor</Text>
      </View>

      <View style={styles.searchBar}>
        <View style={styles.searchIconWrap}>
          <Ionicons name="search" size={17} color="#7cb518" />
        </View>
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm mentor..."
          placeholderTextColor="#94a3b8"
          value={searchQuery}
          onChangeText={onSearchChange}
          returnKeyType="search"
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => onSearchChange('')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color="#94a3b8" />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.pillsWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillsContent}
        >
          {MENTOR_CATEGORIES.map((cat) => {
            const active = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.pill, active && styles.pillActive]}
                onPress={() => onCategoryChange(cat)}
                activeOpacity={0.85}
              >
                <Text style={[styles.pillText, active && styles.pillTextActive]}>{cat}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color="#7000ff" size="large" />
          <Text style={styles.loadingText}>Đang tải danh sách mentor...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.listScroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
        >
          {filteredMentors.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="search-outline" size={44} color="#94a3b8" />
              <Text style={styles.emptyTitle}>Không tìm thấy mentor phù hợp</Text>
              <Text style={styles.emptyHint}>Thử đổi từ khóa hoặc bộ lọc lĩnh vực.</Text>
            </View>
          ) : (
            filteredMentors.map((mentor) => (
              <TouchableOpacity
                key={mentor.id}
                style={styles.card}
                activeOpacity={0.9}
                onPress={() => onMentorPress?.(mentor)}
              >
                {mentor.avatar ? (
                  <Image source={{ uri: mentor.avatar }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, { alignItems: 'center', justifyContent: 'center', backgroundColor: '#e9e0f7' }]}>
                    <Ionicons name="person" size={22} color="#7c6a9a" />
                  </View>
                )}
                <View style={styles.cardBody}>
                  <Text style={styles.name} numberOfLines={1}>
                    {mentor.name}
                  </Text>
                  <Text style={styles.role} numberOfLines={1}>
                    {displayMentorRole(mentor)}
                  </Text>
                  <View style={styles.ratingRow}>
                    <Ionicons name="star" size={11} color="#fbbf24" />
                    <Text style={styles.ratingText}>
                      {mentor.rating != null && Number(mentor.rating) > 0
                        ? Number(mentor.rating).toFixed(1)
                        : '—'}
                    </Text>
                  </View>
                </View>
                <View style={styles.cardAction}>
                  <Text style={styles.price}>{formatMentorPrice(mentor.price)}</Text>
                  <View style={styles.chevronWrap}>
                    <Ionicons name="chevron-forward" size={14} color="#a78bfa" />
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 0,
    paddingHorizontal: 20,
  },
  header: {
    marginBottom: 14,
  },
  title: {
    color: '#1e1b4b',
    fontSize: 24,
    letterSpacing: -0.5,
    fontFamily: 'Manrope_800ExtraBold',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderRadius: 999,
    paddingHorizontal: 14,
    height: 54,
    borderWidth: 1,
    borderColor: 'rgba(128, 55, 244, 0.08)',
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#8037f4',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
      },
      android: { elevation: 3 },
      default: {},
    }),
  },
  searchIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(163, 230, 53, 0.16)',
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: '#0f172a',
    fontSize: 14,
    fontFamily: 'Manrope_500Medium',
    paddingVertical: 0,
  },
  pillsWrap: {
    maxHeight: 44,
    marginBottom: 18,
  },
  pillsContent: {
    gap: 10,
    paddingRight: 10,
  },
  pill: {
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: 'rgba(128, 55, 244, 0.06)',
    minHeight: 36,
    justifyContent: 'center',
  },
  pillActive: {
    backgroundColor: '#7000ff',
    borderColor: '#7000ff',
  },
  pillText: {
    color: '#64748b',
    fontSize: 12,
    fontFamily: 'Manrope_600SemiBold',
  },
  pillTextActive: {
    color: '#ffffff',
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingBottom: HOME_NAV_CLEARANCE,
  },
  loadingText: {
    color: '#64748b',
    fontSize: 14,
    fontFamily: 'Manrope_500Medium',
  },
  listScroll: {
    flex: 1,
    minHeight: 0,
  },
  listContent: {
    gap: 12,
    paddingBottom: HOME_NAV_CLEARANCE + 16,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 26,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(128, 55, 244, 0.06)',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#8037f4',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 18,
      },
      android: { elevation: 4 },
      default: {},
    }),
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: '#ede9fe',
  },
  cardBody: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  name: {
    color: '#0f172a',
    fontSize: 14,
    fontFamily: 'Manrope_700Bold',
  },
  role: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2,
    fontFamily: 'Manrope_500Medium',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(251, 191, 36, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  ratingText: {
    color: '#94a3b8',
    fontSize: 11,
    fontFamily: 'Manrope_600SemiBold',
  },
  cardAction: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 8,
    minHeight: 56,
  },
  chevronWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(128, 55, 244, 0.06)',
  },
  price: {
    color: '#84cc16',
    fontSize: 13,
    fontFamily: 'Manrope_800ExtraBold',
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(128, 55, 244, 0.08)',
  },
  emptyTitle: {
    color: '#334155',
    fontSize: 15,
    fontFamily: 'Manrope_700Bold',
    marginTop: 4,
  },
  emptyHint: {
    color: '#94a3b8',
    fontSize: 13,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
  },
});
