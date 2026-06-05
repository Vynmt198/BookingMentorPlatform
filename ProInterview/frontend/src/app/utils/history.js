const CV_HISTORY_KEY = "prointerview_cv_history";
const INTERVIEW_HISTORY_KEY = "prointerview_interview_history";

function readJsonArray(key) {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getCVAnalysisHistory() {
  return readJsonArray(CV_HISTORY_KEY);
}

export function getStoredInterviewHistory() {
  return readJsonArray(INTERVIEW_HISTORY_KEY);
}

/** @deprecated Lịch sử CV lưu trên MongoDB qua `/api/cv/analyses`; không gọi sau khi đã lưu API. */
export function addCVAnalysisRecord(record) {
  try {
    const history = getCVAnalysisHistory();
    const updated = [record, ...history];
    localStorage.setItem(CV_HISTORY_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [record];
  }
}

export function addInterviewRecord(record) {
  try {
    const history = getStoredInterviewHistory();
    const updated = [record, ...history];
    localStorage.setItem(INTERVIEW_HISTORY_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [record];
  }
}

function mapApiAnalysisToLocal(doc) {
  if (!doc) return null;
  return {
    id: doc.analysisId || doc.id || doc._id,
    analysisId: doc.analysisId || doc.id || doc._id,
    position: doc.position || "",
    company: doc.company || null,
    cvFile: doc.cvFileName || doc.cvFile || "cv",
    jdFile: doc.jdFileName || doc.jdFile || null,
    matchScore: doc.matchScore ?? doc.score ?? null,
    matchedKeywords: doc.matchedKeywords || [],
    missingKeywords: doc.missingKeywords || [],
    date: doc.createdAt || doc.date || new Date().toISOString(),
    field: doc.field || null,
    mode: doc.mode || null,
  };
}

// Get latest CV analysis for reuse (localStorage; API nếu đã đăng nhập)
export function getLatestCVAnalysis() {
  const history = getCVAnalysisHistory();
  return history.length > 0 ? history[0] : null;
}

/** Ưu tiên MongoDB khi đã login, fallback localStorage. */
export async function getLatestCVAnalysisAsync() {
  try {
    const { hasAuthCredentials } = await import("./auth.js");
    if (hasAuthCredentials()) {
      const { fetchCvAnalyses } = await import("./cvApi.js");
      const res = await fetchCvAnalyses();
      if (res.success && res.analyses?.length) {
        return mapApiAnalysisToLocal(res.analyses[0]);
      }
    }
  } catch {
    /* local fallback */
  }
  return getLatestCVAnalysis();
}

/** Gợi ý đặt lịch mentor từ phân tích CV mới nhất (API nếu đã đăng nhập). */
export async function getSuggestedBookingDataAsync() {
  try {
    const { hasAuthCredentials } = await import("./auth.js");
    if (hasAuthCredentials()) {
      const { fetchCvAnalyses } = await import("./cvApi.js");
      const res = await fetchCvAnalyses();
      if (res.success && res.analyses?.length) {
        const latest = res.analyses[0];
        return {
          position: latest.position || "",
          cvFile: latest.cvFileName || latest.cvFile || null,
          jdFile: latest.jdFileName || latest.jdFile || null,
        };
      }
    }
  } catch {
    /* local fallback */
  }
  return getSuggestedBookingData();
}

// Get stored CV file
const CV_FILE_KEY = "prointerview_cv_file";
const JD_FILE_KEY = "prointerview_jd_file";
const CV_UPLOADS_KEY = "prointerview_cv_uploads";
const JD_UPLOADS_KEY = "prointerview_jd_uploads";

// ─── CV Uploads Management ─────────────────────────────────────────
export function saveUploadedCV(file) {
  const uploadedFile = {
    id: `cv-${Date.now()}`,
    name: file.name,
    size: file.size,
    type: file.type,
    uploadDate: new Date().toISOString(),
    position: file.position,
    company: file.company,
  };

  try {
    const uploads = getAllUploadedCVs();
    const updated = [uploadedFile, ...uploads];
    localStorage.setItem(CV_UPLOADS_KEY, JSON.stringify(updated));
    // Also save as latest for backward compatibility
    localStorage.setItem(CV_FILE_KEY, JSON.stringify(uploadedFile));
  } catch {
    localStorage.setItem(CV_FILE_KEY, JSON.stringify(uploadedFile));
  }
}

export function getAllUploadedCVs() {
  try {
    const raw = localStorage.getItem(CV_UPLOADS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getUploadedCV() {
  try {
    const raw = localStorage.getItem(CV_FILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function mapApiAnalysisToUploadedCv(item) {
  if (!item) return null;
  const name = item.cvFileName || item.cvFile;
  if (!name) return null;
  return {
    id: item.analysisId || item.id || `cv-${Date.now()}`,
    name,
    uploadDate: item.createdAt || item.date || new Date().toISOString(),
    position: item.position || null,
    company: item.company || null,
    url: item.cvFileUrl || null,
  };
}

/** Ưu tiên metadata CV từ phân tích MongoDB khi đã login, fallback localStorage. */
export async function getUploadedCVAsync() {
  try {
    const { hasAuthCredentials } = await import("./auth.js");
    if (hasAuthCredentials()) {
      const { fetchCvAnalyses } = await import("./cvApi.js");
      const res = await fetchCvAnalyses();
      if (res.success && res.analyses?.length) {
        const mapped = mapApiAnalysisToUploadedCv(res.analyses[0]);
        if (mapped) return mapped;
      }
    }
  } catch {
    /* local fallback */
  }
  return getUploadedCV();
}

export function saveUploadedJD(file) {
  const uploadedFile = {
    id: `jd-${Date.now()}`,
    name: file.name,
    size: file.size,
    type: file.type,
    uploadDate: new Date().toISOString(),
  };

  try {
    const uploads = getAllUploadedJDs();
    const updated = [uploadedFile, ...uploads];
    localStorage.setItem(JD_UPLOADS_KEY, JSON.stringify(updated));
    localStorage.setItem(JD_FILE_KEY, JSON.stringify(uploadedFile));
  } catch {
    localStorage.setItem(JD_FILE_KEY, JSON.stringify(uploadedFile));
  }
}

export function getAllUploadedJDs() {
  try {
    const raw = localStorage.getItem(JD_UPLOADS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getUploadedJD() {
  try {
    const raw = localStorage.getItem(JD_FILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getSuggestedBookingData() {
  const latestAnalysis = getLatestCVAnalysis();
  const latestCV = getUploadedCV();
  const latestJD = getUploadedJD();

  if (latestAnalysis) {
    return {
      position: latestAnalysis.position || "",
      cvFile: latestAnalysis.cvFile || latestCV?.name || null,
      jdFile: latestAnalysis.jdFile || latestJD?.name || null,
    };
  }

  if (latestCV) {
    return {
      position: latestCV.position || "",
      cvFile: latestCV.name || null,
      jdFile: latestJD?.name || null,
    };
  }

  return { position: "", cvFile: null, jdFile: null };
}
