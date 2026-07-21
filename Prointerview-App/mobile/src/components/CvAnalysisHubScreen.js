import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';

const EMPTY_MATCH = {
  percent: 0,
  matched: [],
  missing: [],
  summary: 'Chưa có phân tích. Tải CV và chạy phân tích để xem kết quả thật từ API.',
};

function buildScoreRows(latest) {
  const scores = latest?.scores || latest?.dimensions || {};
  const rows = [
    { key: 'clarity', label: 'Clarity (Rõ ràng)', color: '#93f72b' },
    { key: 'structure', label: 'Structure (STAR)', color: '#8037f4' },
    { key: 'relevance', label: 'Relevance (Liên quan JD)', color: '#8037f4' },
    { key: 'credibility', label: 'Credibility (Thuyết phục)', color: '#8037f4' },
  ];
  return rows.map((row) => ({
    ...row,
    score: Number(scores[row.key] ?? latest?.[row.key] ?? 0),
    max: 10,
  }));
}

function ScoreBar({ label, score, max, color }) {
  const pct = Math.min(100, Math.round((score / max) * 100));
  return (
    <View style={styles.scoreRow}>
      <View style={styles.scoreRowHead}>
        <Text style={styles.scoreRowLabel} numberOfLines={1}>{label}</Text>
        <Text style={styles.scoreRowValue}>{score}/{max}</Text>
      </View>
      <View style={styles.scoreTrack}>
        <View style={[styles.scoreFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function CvReportCard({ match, overallScore, loading, progress, scoreRows = [] }) {
  const { percent, matched, missing, summary } = match;

  return (
    <View style={styles.reportShell}>
      <LinearGradient
        colors={['#8037f4', '#6d28d9', '#7c3aed']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.reportHeader}
      >
        <View style={styles.reportHeaderGlow} pointerEvents="none" />
        <Text style={styles.reportHeaderLabel}>Mức độ phù hợp CV</Text>
        {loading ? (
          <View style={styles.reportLoading}>
            <ActivityIndicator color="#ffffff" />
            <Text style={styles.reportLoadingText}>Đang phân tích… {progress}%</Text>
          </View>
        ) : (
          <>
            <View style={styles.reportPercentRow}>
              <Text style={styles.reportPercent}>{percent}%</Text>
              <View style={styles.reportMatchCol}>
                <Text style={styles.reportMatchLabel}>keyword match</Text>
                <View style={styles.reportMatchTrack}>
                  <View style={[styles.reportMatchFill, { width: `${percent}%` }]} />
                </View>
              </View>
            </View>
            <Text style={styles.reportSummary}>{summary}</Text>
          </>
        )}
      </LinearGradient>

      <View style={styles.keywordRow}>
        <View style={styles.keywordCol}>
          <View style={styles.keywordHead}>
            <View style={styles.keywordIconLime}>
              <Ionicons name="document-text-outline" size={13} color="#3f6212" />
            </View>
            <Text style={styles.keywordTitle}>Từ khóa khớp</Text>
          </View>
          <View style={styles.keywordWrap}>
            {matched.length === 0 ? (
              <Text style={styles.keywordEmpty}>Chưa có dữ liệu</Text>
            ) : matched.map((kw) => (
              <View key={kw} style={styles.keywordPillLime}>
                <Text style={styles.keywordPillLimeText}>{kw} ✓</Text>
              </View>
            ))}
          </View>
        </View>
        <View style={styles.keywordDivider} />
        <View style={[styles.keywordCol, styles.keywordColRight]}>
          <View style={styles.keywordHead}>
            <View style={styles.keywordIconOrange}>
              <Ionicons name="briefcase-outline" size={13} color="#c2410c" />
            </View>
            <Text style={styles.keywordTitle}>Cần bổ sung</Text>
          </View>
          <View style={styles.keywordWrap}>
            {missing.length === 0 ? (
              <Text style={styles.keywordEmpty}>Chưa có dữ liệu</Text>
            ) : missing.map((kw) => (
              <View key={kw} style={styles.keywordPillOrange}>
                <Text style={styles.keywordPillOrangeText}>{kw}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.scoreSection}>
        <View style={styles.scoreRingCol}>
          <LinearGradient
            colors={['#8037f4', '#93f72b']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.scoreRingGradient}
          >
            <View style={styles.scoreRingInner}>
              <Text style={styles.scoreRingValue}>{overallScore}</Text>
              <Text style={styles.scoreRingSub}>/ 100</Text>
            </View>
          </LinearGradient>
          <Text style={styles.scoreRingTitle}>Điểm AI</Text>
          <Text style={styles.scoreRingHint}>Clarity · Structure · Relevance · Credibility</Text>
        </View>
        <View style={styles.scoreBarsCol}>
          {scoreRows.map((row) => (
            <ScoreBar
              key={row.key}
              label={row.label}
              score={row.score}
              max={row.max}
              color={row.color}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

export default function CvAnalysisHubScreen({
  analyzingStatus,
  analysisProgress = 0,
  cvFile,
  cvAnalyses = [],
  bottomPadding = 88,
  onAnalyzeJd,
  onAnalyzeField,
}) {
  const isLoading = analyzingStatus === 'loading';
  const isSuccess = analyzingStatus === 'success';

  const latestResult = cvAnalyses[0]?.result || cvAnalyses[0] || null;

  const match = useMemo(() => {
    if (!latestResult) return EMPTY_MATCH;
    return {
      percent: Number(latestResult.match?.score ?? latestResult.matchScore ?? latestResult.overallScore ?? 0),
      matched: latestResult.matchedKeywords || latestResult.skills?.matched || [],
      missing: latestResult.missingKeywords || latestResult.skills?.missing || [],
      summary:
        latestResult.summary ||
        latestResult.feedback ||
        (isSuccess ? 'Kết quả phân tích từ API.' : EMPTY_MATCH.summary),
    };
  }, [isSuccess, latestResult]);

  const scoreRows = useMemo(() => buildScoreRows(latestResult), [latestResult]);
  const overallScore = match.percent;

  return (
    <ScrollView
      style={styles.scroll}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}
    >
      <View style={styles.ambientOrbTop} pointerEvents="none" />
      <View style={styles.ambientOrbBottom} pointerEvents="none" />

      <View style={styles.hero}>
        <Text style={styles.pageEyebrow}>PHÂN TÍCH CV</Text>
        <Text style={styles.pageTitle}>Quét CV</Text>
        <Text style={styles.heroBody}>
          ProInterview giúp bạn kiểm tra, góp ý và cải thiện CV trước khi gửi đến nhà tuyển dụng.
        </Text>

        <TouchableOpacity
          style={styles.ctaPrimary}
          onPress={onAnalyzeJd}
          disabled={isLoading}
          activeOpacity={0.88}
        >
          <LinearGradient
            colors={['#630ed4', '#7c3aed']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ctaPrimaryGrad}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.ctaPrimaryText}>Tối ưu CV theo vị trí ứng tuyển</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.ctaSecondary}
          onPress={onAnalyzeField}
          disabled={isLoading}
          activeOpacity={0.88}
        >
          <Text style={styles.ctaSecondaryText}>Phân tích CV theo ngành nghề</Text>
        </TouchableOpacity>

        {isSuccess && cvFile ? (
          <View style={styles.uploadedHint}>
            <Ionicons name="checkmark-circle" size={15} color="#8037f4" />
            <Text style={styles.uploadedHintText} numberOfLines={1}>
              Đã phân tích: {cvFile.name}
            </Text>
          </View>
        ) : null}
      </View>

      <CvReportCard
        match={match}
        overallScore={overallScore}
        loading={isLoading}
        progress={analysisProgress}
        scoreRows={scoreRows}
      />

      {cvAnalyses.length > 0 ? (
        <View style={styles.historyBlock}>
          <Text style={styles.historyTitle}>Lịch sử CV đã phân tích</Text>
          {cvAnalyses.map((item, idx) => (
            <View key={item._id || idx} style={styles.historyCard}>
              <View style={styles.historyLeft}>
                <LinearGradient
                  colors={['rgba(128,55,244,0.14)', 'rgba(147,247,43,0.12)']}
                  style={styles.historyIcon}
                >
                  <Ionicons name="document-attach-outline" size={17} color="#8037f4" />
                </LinearGradient>
                <View style={styles.historyTextCol}>
                  <Text style={styles.historyName} numberOfLines={1}>{item.cvFileName || 'Hồ sơ CV'}</Text>
                  <Text style={styles.historyDate}>
                    {item.createdAt ? new Date(item.createdAt).toLocaleDateString('vi-VN') : '—'}
                  </Text>
                </View>
              </View>
              <View style={styles.historyScoreBadge}>
                <Text style={styles.historyScoreText}>
                  {item.result?.match?.score || item.result?.matchScore || 70}%
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    minHeight: 0,
  },
  scrollContent: {
    paddingHorizontal: 2,
    paddingTop: 6,
    gap: 20,
    position: 'relative',
  },
  ambientOrbTop: {
    position: 'absolute',
    top: -40,
    right: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(196, 181, 253, 0.35)',
  },
  ambientOrbBottom: {
    position: 'absolute',
    top: 280,
    left: -50,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(147, 247, 43, 0.12)',
  },
  hero: {
    marginTop: 4,
    gap: 8,
    zIndex: 1,
  },
  pageEyebrow: {
    color: 'rgba(45, 27, 105, 0.58)',
    fontSize: 8,
    fontFamily: 'Manrope_600SemiBold',
    letterSpacing: 1.3,
    marginBottom: 1,
  },
  pageTitle: {
    color: '#2D1B69',
    fontSize: 24,
    fontFamily: 'Manrope_700Bold',
    letterSpacing: -0.7,
    lineHeight: 30,
    marginBottom: 4,
  },
  heroBody: {
    fontSize: 13,
    lineHeight: 20,
    color: 'rgba(91, 33, 182, 0.82)',
    fontWeight: '500',
    marginTop: 2,
    marginBottom: 6,
  },
  ctaPrimary: {
    borderRadius: 20,
    overflow: 'hidden',
    marginTop: 2,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 5,
  },
  ctaPrimaryGrad: {
    minHeight: 48,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaPrimaryText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  ctaSecondary: {
    minHeight: 48,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(167, 139, 250, 0.55)',
    backgroundColor: 'rgba(255,255,255,0.78)',
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8037f4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 1,
  },
  ctaSecondaryText: {
    color: '#630ed4',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  uploadedHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(128, 55, 244, 0.08)',
  },
  uploadedHintText: {
    flex: 1,
    fontSize: 11,
    color: '#5b21b6',
    fontWeight: '600',
  },
  reportShell: {
    borderRadius: 26,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: 1,
    borderColor: 'rgba(128, 55, 244, 0.14)',
    shadowColor: '#8037f4',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.14,
    shadowRadius: 28,
    elevation: 7,
    zIndex: 1,
  },
  reportHeader: {
    paddingHorizontal: 18,
    paddingVertical: 18,
    overflow: 'hidden',
  },
  reportHeaderGlow: {
    position: 'absolute',
    right: -24,
    top: -24,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(147, 247, 43, 0.22)',
  },
  reportHeaderLabel: {
    fontSize: 11,
    color: 'rgba(237, 233, 254, 0.95)',
    fontWeight: '600',
    marginBottom: 10,
  },
  reportLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  reportLoadingText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  reportPercentRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 14,
  },
  reportPercent: {
    fontSize: 34,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -1,
  },
  reportMatchCol: {
    flex: 1,
    minWidth: 0,
    paddingBottom: 4,
    gap: 6,
  },
  reportMatchLabel: {
    fontSize: 11,
    color: 'rgba(237, 233, 254, 0.95)',
    fontWeight: '500',
  },
  reportMatchTrack: {
    height: 9,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.22)',
    overflow: 'hidden',
  },
  reportMatchFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#93f72b',
  },
  reportSummary: {
    marginTop: 12,
    fontSize: 11,
    lineHeight: 17,
    color: 'rgba(255,255,255,0.94)',
  },
  keywordRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(167, 139, 250, 0.28)',
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  keywordCol: {
    flex: 1.15,
    padding: 14,
  },
  keywordColRight: {
    flex: 0.85,
  },
  keywordDivider: {
    width: 1,
    backgroundColor: 'rgba(167, 139, 250, 0.28)',
  },
  keywordHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 10,
  },
  keywordIconLime: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: '#ecfccb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keywordIconOrange: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: '#ffedd5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keywordTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f172a',
  },
  keywordWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  keywordEmpty: { color: '#94a3b8', fontSize: 11, fontStyle: 'italic' },
  keywordPillLime: {
    borderRadius: 999,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: 'rgba(134, 239, 172, 0.65)',
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  keywordPillLimeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#3f6212',
  },
  keywordPillOrange: {
    borderRadius: 999,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: 'rgba(253, 186, 116, 0.55)',
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  keywordPillOrangeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9a3412',
  },
  scoreSection: {
    flexDirection: 'row',
    padding: 16,
    gap: 14,
    alignItems: 'flex-start',
    backgroundColor: 'rgba(250, 245, 255, 0.55)',
  },
  scoreRingCol: {
    width: 98,
    alignItems: 'center',
  },
  scoreRingGradient: {
    width: 82,
    height: 82,
    borderRadius: 41,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreRingInner: {
    width: '100%',
    height: '100%',
    borderRadius: 37,
    backgroundColor: '#faf5ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreRingValue: {
    fontSize: 21,
    fontWeight: '800',
    color: '#2D1B69',
    lineHeight: 23,
  },
  scoreRingSub: {
    fontSize: 9,
    color: '#64748b',
    fontWeight: '700',
  },
  scoreRingTitle: {
    marginTop: 9,
    fontSize: 11,
    fontWeight: '800',
    color: '#0f172a',
  },
  scoreRingHint: {
    marginTop: 3,
    fontSize: 8,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 11,
  },
  scoreBarsCol: {
    flex: 1,
    minWidth: 0,
    gap: 11,
    paddingTop: 4,
  },
  scoreRow: {
    gap: 5,
  },
  scoreRowHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 6,
  },
  scoreRowLabel: {
    flex: 1,
    fontSize: 9,
    fontWeight: '700',
    color: '#334155',
  },
  scoreRowValue: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748b',
  },
  scoreTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: '#e8edf5',
    overflow: 'hidden',
  },
  scoreFill: {
    height: '100%',
    borderRadius: 999,
  },
  historyBlock: {
    gap: 10,
    marginTop: 2,
    zIndex: 1,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1e1b2e',
    letterSpacing: -0.3,
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(128, 55, 244, 0.12)',
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: '#8037f4',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  historyLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    minWidth: 0,
  },
  historyIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyTextCol: {
    flex: 1,
    minWidth: 0,
  },
  historyName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e1b2e',
  },
  historyDate: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  historyScoreBadge: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(147, 247, 43, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(134, 239, 172, 0.45)',
  },
  historyScoreText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4d7c0f',
  },
});
