import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import WebView from 'react-native-webview';
import {
  fetchCourseById,
  fetchReviewsForCourse,
  formatCourseDuration,
  formatCoursePrice,
} from '../services/courseApi';

function youtubeEmbedUrl(url) {
  if (!url) return null;
  const match = String(url).match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  return match ? `https://www.youtube.com/embed/${match[1]}` : null;
}

function StarRow({ rating, onDark = false }) {
  const value = rating != null ? Math.min(5, Math.max(0, Math.round(Number(rating)))) : 0;
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons
          key={i}
          name={i <= value ? 'star' : 'star-outline'}
          size={12}
          color={i <= value ? '#a3e635' : onDark ? 'rgba(255,255,255,0.35)' : '#e2e8f0'}
        />
      ))}
    </View>
  );
}

function CurriculumAccordion({ modules, enrolled, certificateEnabled }) {
  const [open, setOpen] = useState(() => {
    const init = {};
    modules.forEach((_, i) => {
      init[i] = i === 0;
    });
    return init;
  });

  if (!modules.length) {
    return (
      <View style={styles.emptyCurriculum}>
        <Text style={styles.emptyCurriculumText}>Chưa có nội dung bài học.</Text>
      </View>
    );
  }

  return (
    <View style={styles.curriculumCard}>
      {modules.map((mod, modIndex) => (
        <View key={mod.id} style={styles.moduleBlock}>
          <TouchableOpacity
            style={styles.moduleHeader}
            onPress={() => setOpen((prev) => ({ ...prev, [modIndex]: !prev[modIndex] }))}
            activeOpacity={0.85}
          >
            <Text style={styles.moduleTitle}>{mod.title || `Phần ${modIndex + 1}`}</Text>
            <Ionicons
              name={open[modIndex] ? 'chevron-up' : 'chevron-down'}
              size={16}
              color="#64748b"
            />
          </TouchableOpacity>
          {open[modIndex]
            ? mod.lessons.map((lesson) => {
                const unlocked = lesson.isPreview || enrolled;
                return (
                  <View key={lesson.id} style={styles.lessonRow}>
                    <Ionicons
                      name={
                        lesson.type === 'quiz'
                          ? 'help-circle-outline'
                          : lesson.type === 'document'
                            ? 'document-text-outline'
                            : 'play-circle-outline'
                      }
                      size={16}
                      color="#94a3b8"
                    />
                    <Text
                      style={[
                        styles.lessonTitle,
                        unlocked ? styles.lessonTitleUnlocked : null,
                      ]}
                      numberOfLines={2}
                    >
                      {lesson.title}
                    </Text>
                    {!unlocked ? (
                      <Ionicons name="lock-closed" size={14} color="#cbd5e1" />
                    ) : lesson.isPreview ? (
                      <Text style={styles.previewPill}>Học thử</Text>
                    ) : null}
                  </View>
                );
              })
            : null}
        </View>
      ))}
      {certificateEnabled ? (
        <View style={styles.certificateRow}>
          <Ionicons name="lock-closed" size={14} color="#94a3b8" />
          <Text style={styles.certificateText}>Chứng chỉ hoàn thành khóa học</Text>
        </View>
      ) : null}
    </View>
  );
}

export default function CourseDetailScreen({
  courseId,
  enrollment,
  purchaseState = 'available',
  topInset = 0,
  bottomPadding = 90,
  onBack,
  onContinueLearn,
  onBuy,
  onAddToCart,
  onFreeEnroll,
  addingToCart = false,
}) {
  const [course, setCourse] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [enrolling, setEnrolling] = useState(false);

  const isOwned = purchaseState === 'owned';
  const isPending = purchaseState === 'pending';

  const load = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    setError('');
    const [courseRes, reviewRes] = await Promise.all([
      fetchCourseById(courseId),
      fetchReviewsForCourse(courseId),
    ]);
    if (courseRes.success && courseRes.course) {
      setCourse(courseRes.course);
    } else {
      setError(courseRes.error || 'Không tải được khóa học.');
    }
    if (reviewRes.success) setReviews(reviewRes.reviews || []);
    setLoading(false);
  }, [courseId]);

  useEffect(() => {
    void load();
  }, [load]);

  const previewEmbed = useMemo(
    () => youtubeEmbedUrl(course?.previewVideoUrl),
    [course?.previewVideoUrl],
  );

  const displayPrice = useMemo(() => {
    if (!course) return '';
    const price = Number(course.price) || 0;
    const discount = Number(course.discountPrice) || 0;
    if (discount > 0 && discount < price) return formatCoursePrice(discount);
    return formatCoursePrice(price);
  }, [course]);

  const handlePrimaryAction = async () => {
    if (!course) return;
    if (isOwned) {
      onContinueLearn?.(enrollment);
      return;
    }
    if (isPending) {
      onBuy?.(course);
      return;
    }
    if (course.isFree || course.priceNum <= 0) {
      setEnrolling(true);
      await onFreeEnroll?.(course);
      setEnrolling(false);
      return;
    }
    onBuy?.(course);
  };

  if (loading) {
    return (
      <View style={[styles.centered, { paddingTop: topInset }]}>
        <ActivityIndicator size="large" color="#8037f4" />
        <Text style={styles.loadingText}>Đang tải khóa học...</Text>
      </View>
    );
  }

  if (!course) {
    return (
      <View style={[styles.centered, { paddingTop: topInset }]}>
        <Ionicons name="book-outline" size={48} color="#cbd5e1" />
        <Text style={styles.errorTitle}>{error || 'Không tìm thấy khóa học'}</Text>
        <TouchableOpacity style={styles.backCta} onPress={onBack}>
          <Text style={styles.backCtaText}>Quay lại danh sách</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={[styles.topBar, { paddingTop: topInset }]}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.85}>
          <Ionicons name="arrow-back" size={20} color="#2D1B69" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle} numberOfLines={1}>
          Chi tiết khóa học
        </Text>
        <View style={styles.topBarSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPadding }}
      >
        <LinearGradient
          colors={['#8037f4', '#7230e8', '#630ed4']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          {course.category ? (
            <View style={styles.categoryPill}>
              <Text style={styles.categoryPillText}>{course.category}</Text>
            </View>
          ) : null}
          <Text style={styles.heroTitle}>{course.title}</Text>
          {course.description ? (
            <Text style={styles.heroDescription} numberOfLines={4}>
              {course.description}
            </Text>
          ) : null}
          <Text style={styles.heroMentor}>{course.mentorName}</Text>
          <View style={styles.heroMetaRow}>
            <View style={styles.heroMetaPill}>
              <Text style={styles.heroRatingValue}>
                {course.rating != null && course.rating > 0 ? Number(course.rating).toFixed(1) : '—'}
              </Text>
              <StarRow rating={course.rating} onDark />
            </View>
            <View style={styles.heroMetaPill}>
              <Text style={styles.heroMetaText}>
                {course.modulesCount} học phần · {course.lessonsCount} bài
              </Text>
            </View>
            <View style={styles.heroMetaPill}>
              <Text style={styles.heroMetaText}>{formatCourseDuration(course.duration)}</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.purchaseCard}>
          <View style={styles.previewWrap}>
            {previewEmbed && Platform.OS !== 'web' ? (
              <WebView
                source={{ uri: previewEmbed }}
                style={styles.previewMedia}
                allowsFullscreenVideo
                mediaPlaybackRequiresUserAction
              />
            ) : previewEmbed && Platform.OS === 'web' ? (
              React.createElement('iframe', {
                src: previewEmbed,
                title: 'Xem trước khóa học',
                style: { width: '100%', height: 190, border: 0, borderRadius: 16 },
                allow: 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture',
                allowFullScreen: true,
              })
            ) : course.thumbnail ? (
              <Image source={{ uri: course.thumbnail }} style={styles.previewImage} />
            ) : (
              <View style={[styles.previewImage, { backgroundColor: '#2D1B69', alignItems: 'center', justifyContent: 'center' }]}>
                <Ionicons name="book-outline" size={40} color="#c4b5e0" />
              </View>
            )}
            {!previewEmbed ? (
              <View style={styles.previewOverlay}>
                <Ionicons name="play-circle" size={42} color="#ffffff" />
              </View>
            ) : null}
          </View>

          <View style={styles.purchaseBody}>
            <Text style={styles.purchasePrice}>{displayPrice}</Text>

            <TouchableOpacity
              style={styles.primaryCta}
              onPress={() => { void handlePrimaryAction(); }}
              disabled={enrolling}
              activeOpacity={0.9}
            >
              {enrolling ? (
                <ActivityIndicator color="#1a3300" />
              ) : (
                <>
                  <Ionicons
                    name={isOwned ? 'play' : isPending ? 'cart' : course.isFree ? 'checkmark-circle' : 'cart'}
                    size={16}
                    color="#1a3300"
                  />
                  <Text style={styles.primaryCtaText}>
                    {isOwned
                      ? 'Tiếp tục học'
                      : isPending
                        ? 'Tiếp tục thanh toán'
                        : course.isFree
                          ? 'Đăng ký miễn phí'
                          : 'Mua khóa học'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {!isOwned && !course.isFree && onAddToCart ? (
              <TouchableOpacity
                style={styles.secondaryCta}
                onPress={() => onAddToCart(course)}
                disabled={addingToCart}
                activeOpacity={0.9}
              >
                {addingToCart ? (
                  <ActivityIndicator color="#8037f4" />
                ) : (
                  <>
                    <Ionicons name="cart-outline" size={16} color="#8037f4" />
                    <Text style={styles.secondaryCtaText}>Thêm vào giỏ</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : null}

            <View style={styles.includesBox}>
              <Text style={styles.includesTitle}>Khóa học này bao gồm</Text>
              {[
                course.modulesCount > 0 ? `${course.modulesCount} học phần` : null,
                course.lessonsCount > 0 ? `${course.lessonsCount} bài học` : null,
                course.duration > 0 ? `Thời lượng ${formatCourseDuration(course.duration)}` : null,
                'Video & tài liệu bài giảng',
                course.certificateEnabled ? 'Chứng chỉ hoàn thành khóa học' : null,
                'Truy cập khóa học không giới hạn',
              ]
                .filter(Boolean)
                .map((item) => (
                  <View key={item} style={styles.includeRow}>
                    <Ionicons name="checkmark-circle" size={16} color="#8037f4" />
                    <Text style={styles.includeText}>{item}</Text>
                  </View>
                ))}
            </View>

            {!isOwned ? (
              <Text style={styles.previewNote}>
                Bạn đang xem preview. Mua khóa học (hoặc đăng ký miễn phí) để truy cập đầy đủ nội dung.
              </Text>
            ) : null}
          </View>
        </View>

        {course.learningOutcomes.length > 0 ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Bạn sẽ học được gì</Text>
            {course.learningOutcomes.map((outcome, index) => (
              <View key={`${index}-${outcome}`} style={styles.outcomeRow}>
                <Ionicons name="checkmark" size={16} color="#059669" />
                <Text style={styles.outcomeText}>{outcome}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.sectionPlain}>
          <Text style={styles.sectionTitle}>Danh sách bài học</Text>
          <CurriculumAccordion
            modules={course.modules}
            enrolled={isOwned}
            certificateEnabled={course.certificateEnabled}
          />
        </View>

        <View style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, styles.instructorName]}>{course.mentorName}</Text>
          <Text style={styles.instructorRole}>{course.mentorTitle}</Text>
          <View style={styles.instructorRow}>
            {course.mentorAvatar ? (
              <Image source={{ uri: course.mentorAvatar }} style={styles.instructorAvatar} />
            ) : (
              <View style={styles.instructorAvatarFallback}>
                <Text style={styles.instructorInitials}>
                  {(course.mentorName || 'M').slice(0, 1).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.instructorInfo}>
              <Text style={styles.instructorLabel}>Mentor {course.mentorName}</Text>
              <Text style={styles.instructorCompany}>{course.mentorCompany}</Text>
              <Text style={styles.instructorStudents}>
                {Number(course.studentsCount || 0).toLocaleString('vi-VN')} học viên đã tham gia
              </Text>
            </View>
          </View>
        </View>

        {reviews.length > 0 ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Đánh giá học viên</Text>
            {reviews.slice(0, 3).map((review) => (
              <View key={review._id || review.id} style={styles.reviewRow}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewAuthor}>
                    {review.userId?.name || review.authorName || 'Học viên'}
                  </Text>
                  <StarRow rating={review.rating} />
                </View>
                {review.comment ? (
                  <Text style={styles.reviewComment}>{review.comment}</Text>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f5f0fc' },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f0fc',
    paddingHorizontal: 24,
  },
  loadingText: { marginTop: 12, color: '#64748b', fontSize: 14 },
  errorTitle: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'center',
  },
  backCta: {
    marginTop: 16,
    backgroundColor: '#a3e635',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  backCtaText: { fontWeight: '800', color: '#1a3300' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: '#f5f0fc',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(128,55,244,0.12)',
  },
  topBarTitle: {
    flex: 1,
    marginHorizontal: 10,
    fontSize: 15,
    fontWeight: '800',
    color: '#2D1B69',
  },
  topBarSpacer: { width: 38 },
  scroll: { flex: 1 },
  hero: {
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 20,
    padding: 18,
    overflow: 'hidden',
  },
  categoryPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 8,
  },
  categoryPillText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 28,
    marginBottom: 8,
  },
  heroDescription: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 10,
  },
  heroMentor: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  heroMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  heroMetaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  heroRatingValue: { color: '#ffffff', fontWeight: '800', fontSize: 13 },
  heroMetaText: { color: 'rgba(255,255,255,0.95)', fontSize: 12, fontWeight: '600' },
  starRow: { flexDirection: 'row', gap: 2 },
  purchaseCard: {
    marginHorizontal: 16,
    marginBottom: 14,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(128,55,244,0.15)',
    shadowColor: '#8037f4',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  previewWrap: {
    height: 190,
    backgroundColor: '#0f172a',
    position: 'relative',
  },
  previewMedia: { flex: 1, backgroundColor: '#0f172a' },
  previewImage: { width: '100%', height: '100%' },
  previewOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15,23,42,0.25)',
  },
  purchaseBody: { padding: 16, gap: 12 },
  purchasePrice: {
    fontSize: 28,
    fontWeight: '900',
    color: '#8037f4',
  },
  primaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#a3e635',
    borderRadius: 14,
    paddingVertical: 14,
  },
  primaryCtaText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1a3300',
  },
  secondaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(128,55,244,0.25)',
    backgroundColor: '#faf7ff',
  },
  secondaryCtaText: { fontSize: 14, fontWeight: '700', color: '#8037f4' },
  includesBox: {
    backgroundColor: 'rgba(128,55,244,0.06)',
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  includesTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  includeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  includeText: { flex: 1, fontSize: 13, color: '#475569', lineHeight: 18 },
  previewNote: {
    fontSize: 12,
    lineHeight: 18,
    color: '#64748b',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 10,
  },
  sectionCard: {
    marginHorizontal: 16,
    marginBottom: 14,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.25)',
  },
  sectionPlain: { marginHorizontal: 16, marginBottom: 14 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 12,
  },
  outcomeRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  outcomeText: { flex: 1, fontSize: 14, color: '#334155', lineHeight: 20 },
  curriculumCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.25)',
  },
  moduleBlock: { borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  moduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  moduleTitle: { flex: 1, fontSize: 14, fontWeight: '800', color: '#1e293b', paddingRight: 8 },
  lessonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  lessonTitle: { flex: 1, fontSize: 13, color: '#334155' },
  lessonTitleUnlocked: { color: '#2563eb', fontWeight: '600' },
  previewPill: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
    backgroundColor: '#ecfdf5',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  certificateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  certificateText: { fontSize: 13, color: '#64748b' },
  emptyCurriculum: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyCurriculumText: { textAlign: 'center', color: '#64748b', fontSize: 14 },
  instructorName: { color: '#8037f4', marginBottom: 4 },
  instructorRole: { fontSize: 13, color: '#64748b', marginBottom: 12 },
  instructorRow: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  instructorAvatar: { width: 72, height: 72, borderRadius: 10 },
  instructorAvatarFallback: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: '#ede9fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructorInitials: { fontSize: 24, fontWeight: '800', color: '#6d28d9' },
  instructorInfo: { flex: 1 },
  instructorLabel: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  instructorCompany: { fontSize: 13, color: '#64748b', marginTop: 4 },
  instructorStudents: { fontSize: 12, color: '#94a3b8', marginTop: 8 },
  reviewRow: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
    marginTop: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  reviewAuthor: { fontSize: 13, fontWeight: '700', color: '#1e293b' },
  reviewComment: { fontSize: 13, color: '#475569', lineHeight: 19 },
});
