import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as DocumentPicker from 'expo-document-picker';

const FILE_FORMAT_HINT = 'Hỗ trợ .pdf, .doc, .docx, .txt · tối đa 10MB';

function pickCvOrJdDocument() {
  return DocumentPicker.getDocumentAsync({
    type: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ],
    copyToCacheDirectory: true,
  });
}

function UploadDropZone({ kind, file, onPick, onClear }) {
  const isCv = kind === 'cv';
  const zoneLabel = isCv ? 'CV CỦA BẠN' : 'JOB DESCRIPTION';
  const headline = isCv ? 'Tải lên CV từ máy tính' : 'Tải lên Job Description';
  const pickLabel = isCv ? 'Chọn CV' : 'Chọn JD';
  const fileSizeKb = file?.size != null ? Math.round(file.size / 1024) : null;

  return (
    <View style={styles.zoneWrap}>
      <Text style={styles.zoneLabel}>{zoneLabel}</Text>
      <TouchableOpacity
        style={styles.dropZone}
        onPress={file ? undefined : onPick}
        activeOpacity={file ? 1 : 0.85}
        disabled={!!file}
      >
        <View style={styles.dropZoneHeadRow}>
          <Ionicons name="cloud-upload-outline" size={22} color="#a78bfa" />
          <Text style={styles.dropZoneHeadline}>{headline}</Text>
        </View>

        <View style={styles.dropZoneMid}>
          {file ? (
            <>
              <Text style={styles.dropZoneFileName} numberOfLines={1}>
                {file.name}
              </Text>
              <Text style={styles.dropZoneFileMeta}>
                {fileSizeKb != null ? `${fileSizeKb} KB` : ' '}
              </Text>
            </>
          ) : (
            <Text style={styles.dropZoneHint}>{FILE_FORMAT_HINT}</Text>
          )}
        </View>

        <TouchableOpacity
          style={[styles.pickBtn, file && styles.pickBtnDone]}
          onPress={file ? onClear : onPick}
          activeOpacity={0.85}
        >
          <Text style={[styles.pickBtnText, file && styles.pickBtnTextDone]}>
            {file ? 'Chọn tệp khác' : pickLabel}
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </View>
  );
}

export default function CvJdUploadScreen({
  onBack,
  onSubmit,
  analyzingStatus,
  analysisProgress = 0,
}) {
  const insets = useSafeAreaInsets();
  const [cvPicked, setCvPicked] = useState(null);
  const [jdPicked, setJdPicked] = useState(null);

  const isLoading = analyzingStatus === 'loading';
  const canAnalyze = !!cvPicked && !!jdPicked && !isLoading;

  const handlePick = async (setter) => {
    try {
      const result = await pickCvOrJdDocument();
      if (result.canceled) return;
      setter(result.assets[0]);
    } catch (error) {
      console.error('Lỗi chọn file:', error);
    }
  };

  const handleAnalyze = () => {
    if (!canAnalyze) return;
    onSubmit?.(cvPicked, jdPicked);
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={isLoading ? undefined : onBack}
          activeOpacity={0.85}
          disabled={isLoading}
        >
          <Ionicons name="arrow-back" size={20} color="#334155" />
        </TouchableOpacity>
        <View style={styles.topBarMain}>
          <Text style={styles.topBarEyebrow}>PHÂN TÍCH CV</Text>
          <Text style={styles.topBarTitle} numberOfLines={1}>
            Tối ưu CV theo vị trí ứng tuyển
          </Text>
        </View>
        <View style={styles.topBarSpacer} />
      </View>

      <ScrollView
        style={styles.body}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.bodyContent,
          { paddingBottom: Math.max(insets.bottom, 20) + 24 },
        ]}
      >
        <Text style={styles.subtitle}>
          Tải CV và Job Description, phân tích khớp từ khóa, chấm điểm và gợi ý chỉnh sửa theo
          đúng vị trí tuyển dụng.
        </Text>

        <UploadDropZone
          kind="cv"
          file={cvPicked}
          onPick={() => handlePick(setCvPicked)}
          onClear={() => setCvPicked(null)}
        />
        <UploadDropZone
          kind="jd"
          file={jdPicked}
          onPick={() => handlePick(setJdPicked)}
          onClear={() => setJdPicked(null)}
        />

        {isLoading ? (
          <View style={styles.loadingBlock}>
            <ActivityIndicator color="#8037f4" />
            <Text style={styles.loadingText}>Đang phân tích… {Math.round(analysisProgress)}%</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.min(100, Math.max(0, analysisProgress))}%` }]} />
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.ctaPrimary}
            onPress={handleAnalyze}
            disabled={!canAnalyze}
            activeOpacity={0.88}
          >
            <LinearGradient
              colors={canAnalyze ? ['#630ed4', '#7c3aed'] : ['#ddd6fe', '#ddd6fe']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.ctaPrimaryGrad}
            >
              <Ionicons
                name="flash"
                size={17}
                color={canAnalyze ? '#ffffff' : '#a78bfa'}
                style={{ marginRight: 8 }}
              />
              <Text style={[styles.ctaPrimaryText, !canAnalyze && styles.ctaPrimaryTextDisabled]}>
                {!cvPicked
                  ? 'Tải CV để tiếp tục'
                  : !jdPicked
                    ? 'Tải JD để phân tích'
                    : 'Bắt đầu phân tích'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </ScrollView>
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
    fontWeight: '800',
  },
  topBarTitle: {
    color: '#1e1b4b',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  topBarSpacer: {
    width: 40,
  },
  body: {
    flex: 1,
    minHeight: 0,
  },
  bodyContent: {
    paddingHorizontal: 18,
    paddingTop: 4,
    gap: 16,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 20,
    color: 'rgba(71, 85, 105, 0.92)',
    fontWeight: '500',
    marginBottom: 2,
  },
  zoneWrap: {
    gap: 6,
  },
  zoneLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#7c3aed',
    letterSpacing: 0.6,
  },
  dropZone: {
    borderRadius: 20,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(167, 139, 250, 0.55)',
    backgroundColor: 'rgba(245, 243, 255, 0.55)',
    paddingHorizontal: 18,
    paddingVertical: 18,
    alignItems: 'center',
    gap: 12,
  },
  dropZoneHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dropZoneHeadline: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2e1065',
  },
  dropZoneMid: {
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 8,
  },
  dropZoneHint: {
    fontSize: 11,
    fontWeight: '500',
    color: '#8b7bb8',
    textAlign: 'center',
  },
  dropZoneFileName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#047857',
    maxWidth: '100%',
  },
  dropZoneFileMeta: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(4, 120, 87, 0.85)',
  },
  pickBtn: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.55)',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  pickBtnDone: {
    borderColor: 'rgba(52, 211, 153, 0.5)',
  },
  pickBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#630ed4',
  },
  pickBtnTextDone: {
    color: '#047857',
  },
  ctaPrimary: {
    borderRadius: 20,
    overflow: 'hidden',
    marginTop: 4,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 4,
  },
  ctaPrimaryGrad: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  ctaPrimaryText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  ctaPrimaryTextDisabled: {
    color: '#a78bfa',
  },
  loadingBlock: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 20,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#5b21b6',
  },
  progressTrack: {
    width: '100%',
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(167, 139, 250, 0.22)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#8037f4',
  },
});
