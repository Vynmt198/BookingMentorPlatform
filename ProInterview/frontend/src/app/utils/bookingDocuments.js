/**
 * CV/JD dùng lại cho booking — lấy từ lịch sử phân tích CV (`/api/cv/analyses`).
 * Chỉ nhận bản phân tích đã lưu kèm file trên server (có `cvFileUrl`/`jdFileUrl`),
 * vì booking cần URL thật để mentor mở được file.
 */
import { fetchCvAnalyses } from "./cvApi.js";

/** Khóa dedupe theo đường dẫn `/uploads/...` (bỏ host để không lệch dev/prod). */
function uploadKey(url) {
  const raw = String(url || "").trim();
  const idx = raw.indexOf("/uploads/");
  return idx >= 0 ? raw.slice(idx) : raw;
}

function pushOption(list, seen, option) {
  if (!option.url) return;
  const key = uploadKey(option.url);
  if (!key || seen.has(key)) return;
  seen.add(key);
  list.push(option);
}

/** analyses (đã map qua `mapAnalysisDocToHistoryItem`) → options CV/JD, mới nhất trước. */
export function buildReusableDocOptions(analyses = []) {
  const cvOptions = [];
  const jdOptions = [];
  const cvSeen = new Set();
  const jdSeen = new Set();

  for (const item of analyses) {
    if (!item) continue;
    const context = item.position || item.field || "";
    pushOption(cvOptions, cvSeen, {
      id: `cv-${item.analysisId}`,
      analysisId: item.analysisId,
      name: item.cvFileName || "cv.pdf",
      url: item.cvFileUrl || "",
      position: item.position || "",
      context,
      matchScore: Number.isFinite(item.matchScore) ? item.matchScore : null,
      createdAt: item.createdAt || null,
    });
    pushOption(jdOptions, jdSeen, {
      id: `jd-${item.analysisId}`,
      analysisId: item.analysisId,
      name: item.jdFileName || "jd.pdf",
      url: item.jdFileUrl || "",
      position: item.position || "",
      context,
      matchScore: Number.isFinite(item.matchScore) ? item.matchScore : null,
      createdAt: item.createdAt || null,
    });
  }

  return { cvOptions, jdOptions };
}

export async function fetchReusableBookingDocs() {
  const res = await fetchCvAnalyses();
  if (!res.success) {
    return { success: false, error: res.error, cvOptions: [], jdOptions: [] };
  }
  return { success: true, ...buildReusableDocOptions(res.analyses) };
}
