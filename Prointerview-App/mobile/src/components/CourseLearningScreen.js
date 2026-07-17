import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import WebView from 'react-native-webview';
import { fetchLessonContent, updateLearningProgress } from '../services/courseLearningApi';
import { getCourseDisplayTitle } from '../utils/courseDisplay';

const MEDIA_HEIGHT = Math.min(220, Math.round((Dimensions.get('window').width - 40) * 9 / 16));

function lessonIdOf(lesson) {
  return String(lesson?._id || lesson?.id || '');
}

function isDirectVideo(url) {
  return /\.(mp4|webm|ogg|m3u8)(\?|$)/i.test(String(url || ''));
}

function toEmbedUrl(url) {
  const raw = String(url || '').trim();
  if (!raw) return '';
  const yt = raw.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?rel=0&modestbranding=1&playsinline=1`;
  const vimeo = raw.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return raw;
}

function DirectVideoPlayer({ uri }) {
  try {
    const { Video, ResizeMode } = require('expo-av');
    return (
      <Video
        source={{ uri }}
        style={styles.mediaPlayer}
        useNativeControls
        resizeMode={ResizeMode.CONTAIN}
        shouldPlay={false}
      />
    );
  } catch {
    return (
      <TouchableOpacity style={styles.mediaFallback} onPress={() => Linking.openURL(uri)}>
        <Ionicons name="play-circle" size={42} color="#8037f4" />
        <Text style={styles.mediaFallbackText}>Mở video</Text>
      </TouchableOpacity>
    );
  }
}

function LessonMedia({ lesson }) {
  const rawUrl = String(lesson?.videoUrl || '').trim();
  const embedUrl = toEmbedUrl(rawUrl);

  if (!embedUrl) {
    return (
      <LinearGradient colors={['#efe6fa', '#e8ddf5']} style={styles.mediaFallback}>
        <View style={styles.mediaIcon}>
          <Ionicons
            name={lesson?.type === 'document' ? 'document-text' : lesson?.type === 'quiz' ? 'help-circle' : 'play'}
            size={28}
            color="#8037f4"
          />
        </View>
        <Text style={styles.mediaFallbackTitle}>
          {lesson?.type === 'quiz' ? 'Bài kiểm tra kiến thức' : lesson?.type === 'document' ? 'Tài liệu bài học' : 'Chưa có video'}
        </Text>
      </LinearGradient>
    );
  }

  if (isDirectVideo(rawUrl)) {
    if (Platform.OS === 'web') {
      return React.createElement('video', {
        src: rawUrl,
        controls: true,
        playsInline: true,
        style: {
          width: '100%',
          height: MEDIA_HEIGHT,
          border: 0,
          borderRadius: 18,
          backgroundColor: '#0f0a1a',
        },
      });
    }
    return <DirectVideoPlayer uri={rawUrl} />;
  }

  if (Platform.OS === 'web') {
    return React.createElement('iframe', {
      src: embedUrl,
      allow: 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen',
      allowFullScreen: true,
      style: {
        width: '100%',
        height: MEDIA_HEIGHT,
        border: 0,
        borderRadius: 18,
        backgroundColor: '#0f0a1a',
      },
    });
  }

  return (
    <WebView
      source={{ uri: embedUrl }}
      style={styles.mediaPlayer}
      allowsFullscreenVideo
      allowsInlineMediaPlayback
      mediaPlaybackRequiresUserAction={false}
      javaScriptEnabled
      domStorageEnabled
      startInLoadingState
      renderLoading={() => (
        <View style={styles.mediaLoadingOverlay}>
          <ActivityIndicator color="#8037f4" />
        </View>
      )}
    />
  );
}

export default function CourseLearningScreen({ enrollment, onBack, onProgressUpdated }) {
  const insets = useSafeAreaInsets();
  const course = enrollment?.courseId || {};
  const modules = Array.isArray(course.modules) ? course.modules : [];
  const lessons = useMemo(
    () => modules.flatMap((module, moduleIndex) =>
      (module.lessons || []).map((lesson, lessonIndex) => ({
        ...lesson,
        moduleTitle: module.title || `Chương ${moduleIndex + 1}`,
        position: lessonIndex + 1,
      })),
    ),
    [modules],
  );

  const completedInitial = (enrollment?.completedLessons || []).map(String);
  const initialId = String(enrollment?.lastLessonId || completedInitial[0] || lessonIdOf(lessons[0]));
  const [selectedId, setSelectedId] = useState(initialId);
  const [lesson, setLesson] = useState(() => lessons.find((item) => lessonIdOf(item) === initialId) || lessons[0] || null);
  const [completed, setCompleted] = useState(new Set(completedInitial));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [contentTab, setContentTab] = useState('overview');

  const selectedIndex = lessons.findIndex((item) => lessonIdOf(item) === selectedId);
  const progress = lessons.length ? Math.round((completed.size / lessons.length) * 100) : 0;

  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    setLoading(true);
    setError('');
    const outline = lessons.find((item) => lessonIdOf(item) === selectedId);
    if (outline) setLesson(outline);

    fetchLessonContent(course._id || course.id, selectedId).then((result) => {
      if (!active) return;
      if (result.success && result.lesson) {
        setLesson({ ...outline, ...result.lesson });
      } else if (!outline?.videoUrl) {
        setError(result.error || 'Không tải được bài học.');
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [course._id, course.id, lessons, selectedId]);

  const selectLesson = (item) => {
    setSelectedId(lessonIdOf(item));
    setContentTab('overview');
  };

  const toggleComplete = async () => {
    if (!selectedId || saving) return;
    const nextCompleted = !completed.has(selectedId);
    setSaving(true);
    const result = await updateLearningProgress(enrollment._id, selectedId, nextCompleted);
    setSaving(false);
    if (!result.success) {
      setError(result.error || 'Không lưu được tiến độ.');
      return;
    }
    const next = new Set(completed);
    if (nextCompleted) next.add(selectedId);
    else next.delete(selectedId);
    setCompleted(next);
    onProgressUpdated?.(result.enrollment);
  };

  const goNext = () => {
    if (selectedIndex >= 0 && selectedIndex < lessons.length - 1) {
      selectLesson(lessons[selectedIndex + 1]);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) + 6 }]}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={20} color="#2D1B69" />
        </TouchableOpacity>
        <View style={styles.headerMain}>
          <Text style={styles.headerEyebrow}>KHÔNG GIAN HỌC TẬP</Text>
          <Text style={styles.headerTitle} numberOfLines={1}>{getCourseDisplayTitle(course.title)}</Text>
        </View>
        <View style={styles.headerProgress}>
          <Text style={styles.headerProgressValue}>{progress}%</Text>
        </View>
      </View>

      <ScrollView
        style={styles.bodyScroll}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        {lesson ? (
          <>
            <View style={styles.mediaShell}>
              {loading && !lesson.videoUrl ? (
                <View style={styles.mediaLoadingBox}>
                  <ActivityIndicator color="#8037f4" />
                  <Text style={styles.loadingText}>Đang tải bài học…</Text>
                </View>
              ) : (
                <LessonMedia lesson={lesson} />
              )}
              {loading && lesson.videoUrl ? (
                <View style={styles.mediaLoadingOverlay}>
                  <ActivityIndicator color="#ffffff" />
                </View>
              ) : null}
              <View style={styles.mediaIndexPill}>
                <Ionicons name="play" size={10} color="#8037f4" />
                <Text style={styles.mediaIndexText}>Bài {selectedIndex + 1} / {lessons.length}</Text>
              </View>
            </View>

            <View style={styles.lessonHeading}>
              <View style={styles.lessonContextRow}>
                <View style={styles.lessonTypeBadge}>
                  <Ionicons
                    name={lesson.type === 'document' ? 'document-text-outline' : lesson.type === 'quiz' ? 'help-circle-outline' : 'play-circle-outline'}
                    size={13}
                    color="#8037f4"
                  />
                  <Text style={styles.lessonTypeText}>{lesson.type || 'Bài học'}</Text>
                </View>
                <Text style={styles.lessonModule}>{lesson.moduleTitle}</Text>
              </View>
              <Text style={styles.lessonTitle}>{lesson.title || 'Nội dung bài học'}</Text>
              <View style={styles.lessonMeta}>
                <Ionicons name="time-outline" size={13} color="#64748b" />
                <Text style={styles.lessonMetaText}>{lesson.durationMinutes || 0} phút</Text>
                <View style={styles.lessonMetaDot} />
                <Text style={styles.lessonMetaText}>{completed.has(selectedId) ? 'Đã hoàn thành' : 'Đang học'}</Text>
              </View>
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <View style={styles.contentTabs}>
              {[
                { id: 'overview', label: 'Tổng quan' },
                { id: 'transcript', label: 'Bản ghi' },
                { id: 'resources', label: 'Tài liệu' },
              ].map((tab) => (
                <TouchableOpacity
                  key={tab.id}
                  style={[styles.contentTab, contentTab === tab.id && styles.contentTabActive]}
                  onPress={() => setContentTab(tab.id)}
                >
                  <Text style={[styles.contentTabText, contentTab === tab.id && styles.contentTabTextActive]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.lessonBody}>
              {contentTab === 'overview' ? (
                <>
                  <Text style={styles.sectionLabel}>Bạn sẽ học gì?</Text>
                  <Text style={styles.lessonDescription}>
                    {lesson.description || 'Nội dung chi tiết đang được cập nhật.'}
                  </Text>
                </>
              ) : null}

              {contentTab === 'transcript' ? (
                <>
                  <Text style={styles.sectionLabel}>Bản ghi bài học</Text>
                  <Text style={styles.transcript}>
                    {lesson.transcript || 'Bài học này chưa có bản ghi nội dung.'}
                  </Text>
                </>
              ) : null}

              {contentTab === 'resources' ? (
                <>
                  <Text style={styles.sectionLabel}>Tài nguyên đính kèm</Text>
                  {lesson.documentUrl ? (
                    <TouchableOpacity style={styles.resourceButton} onPress={() => Linking.openURL(lesson.documentUrl)}>
                      <Ionicons name="document-text-outline" size={17} color="#8037f4" />
                      <Text style={styles.resourceButtonText}>Mở tài liệu bài học</Text>
                      <Ionicons name="open-outline" size={15} color="#94a3b8" />
                    </TouchableOpacity>
                  ) : null}
                  {(lesson.resources || []).map((resource, index) => (
                    <TouchableOpacity
                      key={`${resource.url}-${index}`}
                      style={styles.resourceButton}
                      onPress={() => Linking.openURL(resource.url)}
                    >
                      <Ionicons name="attach-outline" size={17} color="#8037f4" />
                      <Text style={styles.resourceButtonText}>{resource.name || 'Tài nguyên'}</Text>
                      <Ionicons name="open-outline" size={15} color="#94a3b8" />
                    </TouchableOpacity>
                  ))}
                  {!lesson.documentUrl && !(lesson.resources || []).length ? (
                    <View style={styles.resourceEmpty}>
                      <Ionicons name="folder-open-outline" size={24} color="#94a3b8" />
                      <Text style={styles.resourceEmptyText}>Bài học chưa có tài liệu đính kèm.</Text>
                    </View>
                  ) : null}
                </>
              ) : null}
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.completeButton, completed.has(selectedId) && styles.completedButton]}
                onPress={toggleComplete}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#2D1B69" />
                ) : (
                  <Ionicons
                    name={completed.has(selectedId) ? 'checkmark-circle' : 'checkmark-circle-outline'}
                    size={18}
                    color="#2D1B69"
                  />
                )}
                <Text style={styles.completeButtonText}>
                  {completed.has(selectedId) ? 'Đã hoàn thành' : 'Đánh dấu hoàn thành'}
                </Text>
              </TouchableOpacity>
              {selectedIndex < lessons.length - 1 ? (
                <TouchableOpacity style={styles.nextButton} onPress={goNext}>
                  <Ionicons name="arrow-forward" size={18} color="#ffffff" />
                </TouchableOpacity>
              ) : null}
            </View>
          </>
        ) : (
          <View style={styles.emptyBox}>
            <Ionicons name="file-tray-outline" size={38} color="#94a3b8" />
            <Text style={styles.emptyTitle}>Khóa học chưa có bài giảng</Text>
          </View>
        )}

        <View style={styles.curriculum}>
          <View style={styles.curriculumHeader}>
            <Text style={styles.curriculumTitle}>Nội dung khóa học</Text>
            <Text style={styles.curriculumCount}>{completed.size}/{lessons.length} bài</Text>
          </View>
          {modules.map((module, moduleIndex) => (
            <View key={module._id || moduleIndex} style={styles.moduleCard}>
              <View style={styles.moduleHeader}>
                <Text style={styles.moduleIndex}>{String(moduleIndex + 1).padStart(2, '0')}</Text>
                <Text style={styles.moduleTitle}>{module.title || `Chương ${moduleIndex + 1}`}</Text>
              </View>
              {(module.lessons || []).map((item, lessonIndex) => {
                const id = lessonIdOf(item);
                const isActive = id === selectedId;
                const isDone = completed.has(id);
                return (
                  <TouchableOpacity
                    key={id || lessonIndex}
                    style={[styles.lessonRow, isActive && styles.lessonRowActive]}
                    onPress={() => selectLesson({ ...item, moduleTitle: module.title })}
                  >
                    <View style={[styles.lessonNumber, isDone && styles.lessonNumberDone]}>
                      {isDone ? (
                        <Ionicons name="checkmark" size={13} color="#0c081e" />
                      ) : (
                        <Text style={styles.lessonNumberText}>{lessonIndex + 1}</Text>
                      )}
                    </View>
                    <View style={styles.lessonRowMain}>
                      <Text style={[styles.lessonRowTitle, isActive && styles.lessonRowTitleActive]} numberOfLines={2}>
                        {item.title || `Bài ${lessonIndex + 1}`}
                      </Text>
                      <Text style={styles.lessonRowMeta}>{item.durationMinutes || 0} phút · {item.type || 'video'}</Text>
                    </View>
                    <Ionicons name={isActive ? 'play-circle' : 'chevron-forward'} size={18} color={isActive ? '#8037f4' : '#94a3b8'} />
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, minHeight: 0, backgroundColor: '#f5f0fc', overflow: 'hidden' },
  bodyScroll: { flex: 1, minHeight: 0 },
  header: {
    minHeight: 74,
    paddingHorizontal: 16,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128, 55, 244, 0.12)',
    backgroundColor: 'rgba(255,255,255,0.88)',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(128, 55, 244, 0.08)',
  },
  headerMain: { flex: 1, minWidth: 0 },
  headerEyebrow: {
    color: '#8037f4',
    fontSize: 8,
    letterSpacing: 1.1,
    fontFamily: 'Manrope_700Bold',
  },
  headerTitle: {
    color: '#2D1B69',
    fontSize: 13,
    fontFamily: 'Manrope_700Bold',
    marginTop: 3,
  },
  headerProgress: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#93f72b',
    backgroundColor: 'rgba(147,247,43,0.12)',
  },
  headerProgressValue: { color: '#2D1B69', fontSize: 9, fontFamily: 'Manrope_700Bold' },
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 50 },
  mediaShell: {
    position: 'relative',
    borderRadius: 21,
    padding: 4,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(128, 55, 244, 0.14)',
    overflow: 'hidden',
    shadowColor: '#8037f4',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 4,
  },
  mediaPlayer: {
    width: '100%',
    height: MEDIA_HEIGHT,
    borderRadius: 18,
    backgroundColor: '#0f0a1a',
  },
  mediaLoadingBox: {
    height: MEDIA_HEIGHT,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#efe6fa',
  },
  mediaLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15,10,26,0.35)',
    borderRadius: 18,
  },
  loadingText: { color: '#64748b', fontSize: 12, fontFamily: 'Manrope_500Medium' },
  mediaIndexPill: {
    position: 'absolute',
    left: 14,
    top: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  mediaIndexText: { color: '#2D1B69', fontSize: 9, fontFamily: 'Manrope_600SemiBold' },
  mediaFallback: {
    height: MEDIA_HEIGHT,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaIcon: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(128, 55, 244, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(128, 55, 244, 0.18)',
  },
  mediaFallbackTitle: {
    color: '#2D1B69',
    fontSize: 13,
    fontFamily: 'Manrope_600SemiBold',
    marginTop: 12,
  },
  mediaFallbackText: {
    color: '#8037f4',
    fontSize: 12,
    fontFamily: 'Manrope_600SemiBold',
    marginTop: 8,
  },
  lessonHeading: { paddingTop: 18, paddingBottom: 14 },
  lessonContextRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  lessonTypeBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(128, 55, 244, 0.08)',
  },
  lessonTypeText: {
    color: '#8037f4',
    fontSize: 9,
    fontFamily: 'Manrope_600SemiBold',
    textTransform: 'capitalize',
  },
  lessonModule: { color: '#7b6f96', fontSize: 10, fontFamily: 'Manrope_500Medium' },
  lessonTitle: {
    color: '#2D1B69',
    fontSize: 20,
    lineHeight: 27,
    fontFamily: 'Manrope_700Bold',
    marginTop: 10,
    letterSpacing: -0.4,
  },
  lessonMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  lessonMetaText: { color: '#64748b', fontSize: 11, fontFamily: 'Manrope_400Regular' },
  lessonMetaDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: '#cbd5e1', marginHorizontal: 3 },
  errorText: { color: '#dc2626', fontSize: 11, fontFamily: 'Manrope_500Medium', marginBottom: 10 },
  contentTabs: {
    flexDirection: 'row',
    padding: 4,
    marginBottom: 10,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(128, 55, 244, 0.1)',
  },
  contentTab: { flex: 1, minHeight: 35, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  contentTabActive: {
    backgroundColor: 'rgba(128, 55, 244, 0.1)',
  },
  contentTabText: { color: '#64748b', fontSize: 10, fontFamily: 'Manrope_500Medium' },
  contentTabTextActive: { color: '#2D1B69', fontFamily: 'Manrope_700Bold' },
  lessonBody: {
    minHeight: 116,
    padding: 16,
    borderRadius: 17,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(128, 55, 244, 0.12)',
  },
  sectionLabel: {
    color: '#8037f4',
    fontSize: 10,
    letterSpacing: 0.6,
    fontFamily: 'Manrope_700Bold',
  },
  lessonDescription: {
    color: 'rgba(45, 27, 105, 0.72)',
    fontSize: 13,
    lineHeight: 20,
    fontFamily: 'Manrope_400Regular',
    marginTop: 9,
  },
  transcript: {
    color: 'rgba(45, 27, 105, 0.62)',
    fontSize: 12,
    lineHeight: 19,
    fontFamily: 'Manrope_400Regular',
    marginTop: 9,
  },
  resourceButton: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginTop: 10,
    paddingHorizontal: 12,
    borderRadius: 13,
    backgroundColor: 'rgba(128, 55, 244, 0.05)',
  },
  resourceButtonText: { color: '#2D1B69', fontSize: 11, fontFamily: 'Manrope_600SemiBold', flex: 1 },
  resourceEmpty: { flex: 1, minHeight: 75, alignItems: 'center', justifyContent: 'center', gap: 6 },
  resourceEmptyText: { color: '#64748b', fontSize: 10, fontFamily: 'Manrope_400Regular' },
  actionRow: { flexDirection: 'row', gap: 9, marginTop: 14 },
  completeButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 15,
    backgroundColor: '#93f72b',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  completedButton: { backgroundColor: 'rgba(147,247,43,0.55)' },
  completeButtonText: { color: '#2D1B69', fontSize: 12, fontFamily: 'Manrope_700Bold' },
  nextButton: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8037f4',
  },
  emptyBox: { height: 220, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyTitle: { color: '#64748b', fontSize: 13, fontFamily: 'Manrope_600SemiBold' },
  curriculum: { marginTop: 24 },
  curriculumHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  curriculumTitle: { color: '#2D1B69', fontSize: 17, fontFamily: 'Manrope_700Bold' },
  curriculumCount: { color: '#7b6f96', fontSize: 11, fontFamily: 'Manrope_500Medium' },
  moduleCard: {
    borderRadius: 18,
    padding: 12,
    marginBottom: 11,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(128, 55, 244, 0.12)',
  },
  moduleHeader: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingBottom: 9 },
  moduleIndex: { color: '#8037f4', fontSize: 10, fontFamily: 'Manrope_700Bold' },
  moduleTitle: { color: '#2D1B69', fontSize: 13, fontFamily: 'Manrope_600SemiBold', flex: 1 },
  lessonRow: {
    minHeight: 55,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128, 55, 244, 0.08)',
  },
  lessonRowActive: {
    backgroundColor: 'rgba(128, 55, 244, 0.07)',
    borderRadius: 12,
  },
  lessonNumber: {
    width: 26,
    height: 26,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(128, 55, 244, 0.08)',
  },
  lessonNumberDone: { backgroundColor: '#93f72b' },
  lessonNumberText: { color: '#7b6f96', fontSize: 10, fontFamily: 'Manrope_600SemiBold' },
  lessonRowMain: { flex: 1, minWidth: 0 },
  lessonRowTitle: {
    color: 'rgba(45, 27, 105, 0.78)',
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'Manrope_500Medium',
  },
  lessonRowTitleActive: { color: '#2D1B69', fontFamily: 'Manrope_700Bold' },
  lessonRowMeta: {
    color: '#94a3b8',
    fontSize: 9,
    fontFamily: 'Manrope_400Regular',
    marginTop: 3,
  },
});
