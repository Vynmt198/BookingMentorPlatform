/**
 * CV analyses — Express `/api/cv/*`
 */
import { authFetch, hasAuthCredentials } from "./auth.js";
import {
  mapAnalysisDocToHistoryItem,
  mapAnalysisDocToUiResult,
} from "./cvMappers.js";

export {
  mapAnalysisDocToHistoryItem,
  mapAnalysisDocToUiResult,
  buildCvAnalysisSavePayload,
  mapPythonCvPipelineToAnalysis,
  filterHighlightKeywords,
  computeCvRemainingFromQuota,
} from "./cvMappers.js";

const jsonHeaders = {
  Accept: "application/json",
  "Content-Type": "application/json",
};

export async function fetchCvQuota() {
  if (!hasAuthCredentials()) return { success: false, quota: null };
  try {
    const res = await authFetch("/api/cv/quota", { method: "GET", headers: { Accept: "application/json" } });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, error: body.error, quota: null };
    return { success: true, quota: body.quota };
  } catch {
    return { success: false, quota: null };
  }
}

export async function fetchCvAnalyses() {
  if (!hasAuthCredentials()) {
    return { success: false, error: "Chưa đăng nhập.", analyses: [] };
  }
  try {
    const res = await authFetch("/api/cv/analyses", { method: "GET", headers: { Accept: "application/json" } });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: body.error || `Lỗi ${res.status}`, analyses: [] };
    }
    const raw = body.list || body.analyses || [];
    return {
      success: true,
      analyses: raw.map(mapAnalysisDocToHistoryItem).filter(Boolean),
    };
  } catch {
    return { success: false, error: "Không kết nối được server.", analyses: [] };
  }
}

export async function fetchCvAnalysisById(id) {
  if (!hasAuthCredentials()) {
    return { success: false, error: "Chưa đăng nhập." };
  }
  try {
    const res = await authFetch(`/api/cv/analyses/${encodeURIComponent(id)}`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: body.error || `Lỗi ${res.status}` };
    }
    const doc = body.analysis;
    return {
      success: true,
      historyItem: mapAnalysisDocToHistoryItem(doc),
      analysis: mapAnalysisDocToUiResult(doc),
      analysisId: String(doc?._id || id),
    };
  } catch {
    return { success: false, error: "Không kết nối được server." };
  }
}

export async function saveCvAnalysis(payload) {
  if (!hasAuthCredentials()) {
    return { success: false, error: "Chưa đăng nhập." };
  }
  try {
    const res = await authFetch("/api/cv/analyses", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const code = body.error || `http_${res.status}`;
      const detailMsg = Array.isArray(body.details)
        ? body.details.map((d) => d.message || d.field).filter(Boolean).join("; ")
        : body.message || "";
      return {
        success: false,
        error: code,
        message: detailMsg || body.error || `Lỗi ${res.status}`,
      };
    }
    const doc = body.analysis;
    return {
      success: true,
      analysisId: String(doc?._id || ""),
      historyItem: mapAnalysisDocToHistoryItem(doc),
    };
  } catch {
    return { success: false, error: "network_error", message: "Không kết nối được server." };
  }
}

/** Thông báo user-facing khi POST /api/cv/analyses thất bại */
export function formatCvSaveError(saveRes) {
  if (!saveRes || saveRes.success) return null;
  if (saveRes.error === "quota_exceeded") {
    return "Đã hết lượt phân tích CV — kết quả hiển thị nhưng không lưu được vào lịch sử. Nâng cấp gói để tiếp tục.";
  }
  if (saveRes.error === "schema_invalid" || saveRes.error === "business_rule_violation") {
    const hint = saveRes.message ? ` (${saveRes.message})` : "";
    return `Kết quả hiển thị nhưng không lưu được lịch sử (lỗi dữ liệu)${hint}. Thử phân tích lại hoặc liên hệ hỗ trợ.`;
  }
  if (saveRes.error === "network_error") {
    return "Kết quả hiển thị nhưng không lưu lịch sử — không kết nối được server.";
  }
  return `Kết quả hiển thị nhưng chưa lưu lịch sử${saveRes.message ? `: ${saveRes.message}` : ""}.`;
}

export async function deleteCvAnalysis(id) {
  if (!hasAuthCredentials()) {
    return { success: false, error: "Chưa đăng nhập." };
  }
  try {
    const res = await authFetch(`/api/cv/analyses/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { Accept: "application/json" },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: body.error || `Lỗi ${res.status}` };
    }
    return { success: true };
  } catch {
    return { success: false, error: "Không kết nối được server." };
  }
}
