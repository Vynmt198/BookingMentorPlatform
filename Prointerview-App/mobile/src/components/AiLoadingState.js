import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Video, ResizeMode } from 'expo-av';

const MASCOT_VIDEO_SRC = require('../../assets/mascot-loading.mp4');

/** Xoay vòng 1 mảng tip theo chu kỳ `intervalMs`, trả về tip hiện tại. */
function useRotatingTip(tips, intervalMs = 6000) {
  const [tipIdx, setTipIdx] = useState(0);
  useEffect(() => {
    setTipIdx(0);
    const interval = setInterval(() => {
      setTipIdx((i) => (i + 1) % tips.length);
    }, intervalMs);
    return () => clearInterval(interval);
  }, [tips, intervalMs]);
  return tips[tipIdx];
}

export const CV_LOADING_STEPS = [
  { minProgress: 0, message: 'Đọc và xử lý file CV...' },
  { minProgress: 25, message: 'Đọc và xử lý file JD...' },
  { minProgress: 55, message: 'AI đang phân tích và so khớp...' },
  { minProgress: 85, message: 'Đang tạo gợi ý chi tiết...' },
];

export const CV_LOADING_TIPS = [
  'Mẹo nhỏ: CV nên ưu tiên số liệu cụ thể (vd "tăng 20% hiệu suất") thay vì mô tả chung chung.',
  'Đừng lo nếu điểm match chưa cao — đây là cơ hội để biết chính xác cần cải thiện điểm nào.',
  'Từ khóa trong JD rất quan trọng với hệ thống ATS — hãy để ý phần gợi ý kỹ năng còn thiếu.',
  'CV gọn trong 1-2 trang, tập trung vào kinh nghiệm liên quan nhất tới vị trí ứng tuyển.',
  'Sắp xong rồi — hệ thống đang tổng hợp gợi ý chi tiết dành riêng cho hồ sơ của bạn.',
];

function stepForProgress(steps, progress) {
  let current = steps[0];
  for (const step of steps) {
    if (progress >= step.minProgress) current = step;
  }
  return current;
}

/**
 * Màn hình chờ dùng chung cho các tác vụ AI chạy lâu trên mobile (phân tích CV/JD, ...):
 * mascot động + thông điệp theo bước (chọn theo `progress` thật từ server) + progress bar
 * + tip xoay vòng. Bản port từ `AiLoadingState.jsx` bên web sang React Native (expo-av).
 */
export default function AiLoadingState({
  progress = 0,
  steps = CV_LOADING_STEPS,
  tips = CV_LOADING_TIPS,
}) {
  const clamped = Math.min(100, Math.max(0, Number(progress) || 0));
  const step = stepForProgress(steps, clamped);
  const tip = useRotatingTip(tips);

  return (
    <View style={styles.wrap}>
      <View style={styles.videoBox}>
        <Video
          source={MASCOT_VIDEO_SRC}
          style={styles.video}
          resizeMode={ResizeMode.COVER}
          isLooping
          isMuted
          shouldPlay
        />
      </View>

      <Text style={styles.message}>{step.message}</Text>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${clamped}%` }]} />
      </View>
      <Text style={styles.percent}>{Math.round(clamped)}%</Text>

      <View style={styles.tipBox}>
        <Text style={styles.tipText}>{tip}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  videoBox: {
    width: 150,
    height: 150,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 14,
    backgroundColor: '#f5f0fc',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  message: {
    fontSize: 13,
    fontWeight: '700',
    color: '#5b21b6',
    textAlign: 'center',
    marginBottom: 14,
    paddingHorizontal: 12,
  },
  track: {
    width: '100%',
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(167, 139, 250, 0.22)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#8037f4',
  },
  percent: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '700',
    color: '#8037f4',
  },
  tipBox: {
    marginTop: 14,
    width: '100%',
    borderRadius: 12,
    backgroundColor: 'rgba(128, 55, 244, 0.06)',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  tipText: {
    fontSize: 12,
    lineHeight: 17,
    color: '#6d28d9',
    textAlign: 'center',
  },
});
