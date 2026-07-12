const STORAGE_PREFIX = "prointerview_live_capture_";

export function liveCaptureStorageKey(bookingId) {
  return `${STORAGE_PREFIX}${String(bookingId || "").trim()}`;
}

export function emptyLiveCapture() {
  return {
    transcript: "",
    questionsAsked: [],
    commonMistakes: [],
    keyInsights: [],
  };
}

/** Ghi chú có đủ chữ để lưu (lọc dictation rác / số vô nghĩa). */
export function isReasonableNote(text) {
  const t = String(text || "").trim();
  if (t.length < 4) return false;
  const letters = (t.match(/[\p{L}]/gu) || []).length;
  if (letters < 3) return false;
  const digitRatio = (t.match(/\d/g) || []).length / t.length;
  if (digitRatio > 0.55) return false;
  return true;
}

export function normalizeLiveCapture(raw) {
  const base = emptyLiveCapture();
  if (!raw || typeof raw !== "object") return base;
  const cleanList = (arr) =>
    Array.isArray(arr)
      ? arr
          .map((s) => String(s).trim())
          .filter((s) => s && isReasonableNote(s))
          .slice(0, 40)
      : [];
  return {
    transcript: String(raw.transcript || "").trim().slice(0, 12000),
    questionsAsked: cleanList(raw.questionsAsked),
    commonMistakes: cleanList(raw.commonMistakes),
    keyInsights: cleanList(raw.keyInsights),
  };
}

export function readLiveCaptureFromStorage(bookingId) {
  try {
    const raw = localStorage.getItem(liveCaptureStorageKey(bookingId));
    if (!raw) return emptyLiveCapture();
    return normalizeLiveCapture(JSON.parse(raw));
  } catch {
    return emptyLiveCapture();
  }
}

export function writeLiveCaptureToStorage(bookingId, capture) {
  try {
    localStorage.setItem(liveCaptureStorageKey(bookingId), JSON.stringify(normalizeLiveCapture(capture)));
  } catch {
    /* quota / private mode */
  }
}

export function clearLiveCaptureStorage(bookingId) {
  try {
    localStorage.removeItem(liveCaptureStorageKey(bookingId));
  } catch {
    /* ignore */
  }
}

/** Tách đoạn dictation thành các mẩu lưu riêng. */
export function splitDictationChunks(text) {
  const t = String(text || "").trim();
  if (!t) return [];
  const parts = t
    .split(/(?<=[.!?…])\s+|\n+|(?:,\s+)/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length) return parts.map((p) => p.slice(0, 500));
  return [t.slice(0, 500)];
}

/** Phân loại nhanh câu dictation → question | insight */
export function inferDictationNoteType(text) {
  const t = String(text || "").trim();
  if (!t) return "insight";
  if (t.includes("?")) return "question";
  if (/^(hãy|em|bạn|cho|kể|mô tả|nói|giải thích|tại sao|vì sao)/i.test(t)) return "question";
  if (/^(lỗi|sai|thiếu|chưa|nhầm|hv\s)/i.test(t)) return "mistake";
  return "insight";
}

/** Lấy câu cuối từ transcript (final + interim). */
export function extractLastUtterance(transcript, interim = "") {
  const combined = `${transcript || ""} ${interim || ""}`.trim();
  if (!combined) return "";
  const parts = combined.split(/(?<=[.!?…])\s+|\n+/).map((p) => p.trim()).filter(Boolean);
  return parts[parts.length - 1] || combined.slice(-280).trim();
}

/** Tự trích câu hỏi từ transcript khi mentor không gắn tag thủ công. */
export function extractQuestionsFromTranscript(transcript) {
  const text = String(transcript || "").trim();
  if (!text) return [];
  const sentences = text.split(/(?<=[.!?…])\s+|\n+/).map((s) => s.trim()).filter(Boolean);
  const questions = sentences.filter((s) => s.includes("?") || /^(hãy|em|bạn|cho|kể|mô tả|nói|giải thích)/i.test(s));
  return [...new Set(questions.map((s) => s.slice(0, 500)))].slice(0, 20);
}

export function liveCaptureHasContent(capture) {
  const c = normalizeLiveCapture(capture);
  return Boolean(
    c.transcript ||
      c.questionsAsked.length ||
      c.commonMistakes.length ||
      c.keyInsights.length,
  );
}

export function countStructuredNotes(capture) {
  const c = normalizeLiveCapture(capture);
  return c.questionsAsked.length + c.commonMistakes.length + c.keyInsights.length;
}

export function liveCaptureStats(capture) {
  const c = normalizeLiveCapture(capture);
  return {
    questionCount: c.questionsAsked.length,
    mistakeCount: c.commonMistakes.length,
    insightCount: c.keyInsights.length,
    noteCount: countStructuredNotes(capture),
    wordCount: c.transcript ? c.transcript.split(/\s+/).filter(Boolean).length : 0,
  };
}
