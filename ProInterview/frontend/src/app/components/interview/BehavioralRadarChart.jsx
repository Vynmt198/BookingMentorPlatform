/**
 * BehavioralRadarChart, spider chart hiển thị 6 chiều hành vi phỏng vấn.
 * Sử dụng Recharts RadarChart. Tất cả scores trên thang 0–5.
 */

import React from "react";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

const DIMS = [
  { key: "eyeContact",     label: "Giao tiếp mắt" },
  { key: "headStability",  label: "Tư thế đầu" },
  { key: "voiceConf",      label: "Tự tin giọng" },
  { key: "fluency",        label: "Sự lưu loát" },
  { key: "vocabulary",     label: "Vốn từ" },
  { key: "responsiveness", label: "Phản xạ" },
];

function dimScore(key, s) {
  if (!s) return 0;
  switch (key) {
    case "eyeContact":
      return Math.round((s.avgEyeContactScore ?? 0) * 5 * 10) / 10;
    case "headStability":
      return Math.round((s.avgHeadStabilityScore ?? 0) * 5 * 10) / 10;
    case "voiceConf": {
      const v = s.avgAmplitudeVariance ?? 0;
      return v > 0.07 ? 5 : v > 0.04 ? 3.5 : v > 0.01 ? 2 : 0;
    }
    case "fluency": {
      const r = s.avgSilenceRatio ?? 0;
      return r < 0.10 ? 5 : r < 0.20 ? 4 : r < 0.30 ? 2.5 : 1;
    }
    case "vocabulary":
      return Math.round((s.avgVocabularyDiversity ?? 0) * 5 * 10) / 10;
    case "responsiveness": {
      const ms = s.avgResponseLatencyMs ?? 0;
      return ms === 0 ? 0 : ms < 2000 ? 5 : ms < 4000 ? 4 : ms < 7000 ? 2.5 : 1;
    }
    default:
      return 0;
  }
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const { subject, score } = payload[0].payload;
  return (
    <div
      className="rounded-lg px-3 py-2 text-xs shadow-md"
      style={{
        background: "rgba(243,240,255,0.97)",
        border: "1px solid rgba(196,181,253,0.7)",
      }}
    >
      <p className="font-semibold text-violet-900">{subject}</p>
      <p className="text-violet-600">{Number(score).toFixed(1)} / 5</p>
    </div>
  );
};

export function BehavioralRadarChart({ summary }) {
  const data = DIMS.map(({ key, label }) => ({
    subject: label,
    score:   dimScore(key, summary),
    fullMark: 5,
  }));

  return (
    <ResponsiveContainer width="100%" height={230}>
      <RadarChart cx="50%" cy="50%" outerRadius="72%" data={data}>
        <PolarGrid stroke="rgba(110,53,232,0.12)" />
        <PolarAngleAxis
          dataKey="subject"
          tick={{ fill: "#5b21b6", fontSize: 11, fontWeight: 500 }}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 5]}
          tickCount={4}
          tick={{ fill: "#a78bde", fontSize: 9 }}
        />
        <Radar
          name="Hành vi"
          dataKey="score"
          stroke="#6E35E8"
          fill="#6E35E8"
          fillOpacity={0.25}
          strokeWidth={2}
          dot={{ r: 3, fill: "#6E35E8", strokeWidth: 0 }}
        />
        <Tooltip content={<CustomTooltip />} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

/** Dải màu cho điểm số */
export function behaviorScoreColor(score) {
  if (score >= 4) return { bg: "bg-lime-50", text: "text-violet-900", ring: "ring-lime-200/80", label: "Tốt" };
  if (score >= 2.5) return { bg: "bg-violet-100", text: "text-violet-800", ring: "ring-violet-200", label: "Khá" };
  if (score > 0) return { bg: "bg-violet-50", text: "text-violet-700", ring: "ring-violet-100", label: "Cần cải thiện" };
  return { bg: "bg-gray-50", text: "text-gray-500", ring: "ring-gray-100", label: "Chưa có dữ liệu" };
}

/** Nhãn cảm xúc từ Google Vision (1–5 scale) */
export function emotionLabel(emotion) {
  if (!emotion) return null;
  const { joy = 1, sorrow = 1, anger = 1, surprise = 1 } = emotion;
  if (joy >= 4)     return { text: "Tự tin", cls: "bg-lime-50 text-violet-900 ring-1 ring-lime-200" };
  if (surprise >= 4) return { text: "Ngạc nhiên", cls: "bg-amber-50 text-amber-800 ring-1 ring-amber-200" };
  if (sorrow >= 4 || anger >= 3) return { text: "Lo lắng", cls: "bg-orange-50 text-orange-800 ring-1 ring-orange-200" };
  if (joy >= 3)     return { text: "Bình thản", cls: "bg-violet-50 text-violet-700 ring-1 ring-violet-200" };
  return { text: "Trung tính", cls: "bg-gray-50 text-gray-600 ring-1 ring-gray-200" };
}
