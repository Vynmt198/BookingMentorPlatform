import { useCallback, useEffect, useRef, useState } from "react";
import { saveMentorSessionCapture } from "../utils/bookingsApi.js";
import {
  emptyLiveCapture,
  extractLastUtterance,
  inferDictationNoteType,
  isReasonableNote,
  liveCaptureHasContent,
  normalizeLiveCapture,
  readLiveCaptureFromStorage,
  splitDictationChunks,
  writeLiveCaptureToStorage,
} from "../utils/liveCapture.js";

const SAVE_DEBOUNCE_MS = 2500;

function appendUnique(list, value) {
  const v = String(value || "").trim();
  if (!v || list.includes(v)) return list;
  return [...list, v].slice(-40);
}

function appendTagged(listMap, type, value) {
  const line = String(value || "").trim();
  if (!line || !isReasonableNote(line)) return listMap;
  if (type === "question") {
    return { ...listMap, questionsAsked: appendUnique(listMap.questionsAsked, line) };
  }
  if (type === "mistake") {
    return { ...listMap, commonMistakes: appendUnique(listMap.commonMistakes, line) };
  }
  return { ...listMap, keyInsights: appendUnique(listMap.keyInsights, line) };
}

function mergeDictationIntoCapture(prev, finalText, { tagType = "auto" } = {}) {
  const trimmed = String(finalText || "").trim();
  if (!trimmed) return prev;

  const chunks = splitDictationChunks(trimmed);
  let lists = {
    questionsAsked: prev.questionsAsked,
    commonMistakes: prev.commonMistakes,
    keyInsights: prev.keyInsights,
  };

  for (const chunk of chunks) {
    const type =
      tagType === "auto" ? inferDictationNoteType(chunk) : tagType;
    lists = appendTagged(lists, type, chunk);
  }

  return {
    ...prev,
    ...lists,
    transcript: prev.transcript ? `${prev.transcript} ${trimmed}`.trim() : trimmed,
  };
}

/**
 * Ghi chú live trong buổi mentor — STT + gắn tag nhanh, tự lưu draft.
 */
export function useMeetingLiveCapture(bookingId, { enabled = false, initialCapture = null } = {}) {
  const [capture, setCapture] = useState(() => {
    const stored = readLiveCaptureFromStorage(bookingId);
    return normalizeLiveCapture(initialCapture || stored);
  });
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [sttSupported, setSttSupported] = useState(true);
  const [sttError, setSttError] = useState("");
  const [saveState, setSaveState] = useState("idle");
  const [dictationNoteType, setDictationNoteType] = useState("auto");

  const captureRef = useRef(capture);
  const isListeningRef = useRef(false);
  const interimRef = useRef("");
  const dictationNoteTypeRef = useRef(dictationNoteType);
  const recognitionRef = useRef(null);
  const saveTimerRef = useRef(null);
  const lastSavedRef = useRef("");

  captureRef.current = capture;
  dictationNoteTypeRef.current = dictationNoteType;

  useEffect(() => {
    if (!bookingId || !initialCapture) return;
    setCapture((prev) => {
      const merged = normalizeLiveCapture({
        ...emptyLiveCapture(),
        ...initialCapture,
        ...prev,
      });
      captureRef.current = merged;
      return merged;
    });
  }, [bookingId, initialCapture]);

  const scheduleSave = useCallback(
    (nextCapture) => {
      if (!bookingId || !enabled) return;
      writeLiveCaptureToStorage(bookingId, nextCapture);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        const payload = normalizeLiveCapture(nextCapture);
        const serialized = JSON.stringify(payload);
        if (serialized === lastSavedRef.current) return;
        setSaveState("saving");
        const res = await saveMentorSessionCapture(bookingId, payload);
        if (res.success) {
          lastSavedRef.current = serialized;
          setSaveState("saved");
        } else {
          setSaveState("error");
        }
      }, SAVE_DEBOUNCE_MS);
    },
    [bookingId, enabled],
  );

  const updateCapture = useCallback(
    (updater) => {
      setCapture((prev) => {
        const next = typeof updater === "function" ? updater(prev) : normalizeLiveCapture(updater);
        const normalized = normalizeLiveCapture(next);
        captureRef.current = normalized;
        scheduleSave(normalized);
        return normalized;
      });
    },
    [scheduleSave],
  );

  const commitInterimDictation = useCallback(() => {
    const line = String(interimRef.current || "").trim();
    interimRef.current = "";
    setInterimTranscript("");
    if (!line || !isReasonableNote(line)) return false;
    updateCapture((prev) =>
      mergeDictationIntoCapture(prev, line, { tagType: dictationNoteTypeRef.current }),
    );
    return true;
  }, [updateCapture]);

  /** Bấm Xong — lưu ngay câu đang nghe, giữ mic bật. */
  const finishDictationLine = useCallback(() => {
    const saved = commitInterimDictation();
    if (saved && isListeningRef.current) {
      try {
        recognitionRef.current?.stop();
      } catch {
        /* ignore */
      }
      window.setTimeout(() => {
        if (!isListeningRef.current) return;
        try {
          recognitionRef.current?.start();
        } catch {
          /* ignore restart race */
        }
      }, 150);
    }
    return saved;
  }, [commitInterimDictation]);

  const flushSave = useCallback(async () => {
    if (!bookingId) return { success: true };
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    const payload = normalizeLiveCapture(captureRef.current);
    writeLiveCaptureToStorage(bookingId, payload);
    if (!liveCaptureHasContent(payload)) return { success: true };
    setSaveState("saving");
    const res = await saveMentorSessionCapture(bookingId, payload);
    if (res.success) {
      lastSavedRef.current = JSON.stringify(payload);
      setSaveState("saved");
    } else {
      setSaveState("error");
    }
    return res;
  }, [bookingId]);

  useEffect(() => {
    if (!enabled) return undefined;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setSttSupported(false);
      return undefined;
    }

    const recognition = new SR();
    recognition.lang = "vi-VN";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        if (event.results[i].isFinal) finalText += event.results[i][0].transcript;
        else interimText += event.results[i][0].transcript;
      }
      if (finalText.trim()) {
        updateCapture((prev) =>
          mergeDictationIntoCapture(prev, finalText.trim(), {
            tagType: dictationNoteTypeRef.current,
          }),
        );
      }
      interimRef.current = interimText.trim();
      setInterimTranscript(interimText.trim());
    };
    recognition.onend = () => {
      if (isListeningRef.current) {
        try {
          recognition.start();
        } catch {
          /* ignore restart race */
        }
      } else {
        interimRef.current = "";
        setInterimTranscript("");
      }
    };
    recognition.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setSttSupported(false);
        setSttError("Trình duyệt chưa cấp quyền microphone.");
        isListeningRef.current = false;
        setIsListening(false);
      }
    };
    recognitionRef.current = recognition;

    return () => {
      isListeningRef.current = false;
      recognitionRef.current?.abort();
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [enabled, updateCapture]);

  const toggleListening = useCallback(() => {
    if (!sttSupported) return;
    if (isListeningRef.current) {
      isListeningRef.current = false;
      setIsListening(false);
      recognitionRef.current?.stop();
      commitInterimDictation();
      return;
    }
    setSttError("");
    isListeningRef.current = true;
    setIsListening(true);
    try {
      recognitionRef.current?.start();
    } catch {
      /* already started */
    }
  }, [sttSupported, commitInterimDictation]);

  const pinLastLine = useCallback(
    (type) => {
      const line = extractLastUtterance(captureRef.current.transcript, interimTranscript);
      if (!isReasonableNote(line)) return false;
      updateCapture((prev) => {
        if (type === "question") {
          return { ...prev, questionsAsked: appendUnique(prev.questionsAsked, line) };
        }
        if (type === "mistake") {
          return { ...prev, commonMistakes: appendUnique(prev.commonMistakes, line) };
        }
        return { ...prev, keyInsights: appendUnique(prev.keyInsights, line) };
      });
      return true;
    },
    [interimTranscript, updateCapture],
  );

  const addTaggedNote = useCallback(
    (type, text) => {
      const line = String(text || "").trim();
      if (!isReasonableNote(line)) return false;
      updateCapture((prev) => {
        if (type === "question") {
          return { ...prev, questionsAsked: appendUnique(prev.questionsAsked, line) };
        }
        if (type === "mistake") {
          return { ...prev, commonMistakes: appendUnique(prev.commonMistakes, line) };
        }
        return { ...prev, keyInsights: appendUnique(prev.keyInsights, line) };
      });
      return true;
    },
    [updateCapture],
  );

  const removeTaggedNote = useCallback(
    (type, index) => {
      updateCapture((prev) => {
        const drop = (list) => list.filter((_, i) => i !== index);
        if (type === "question") return { ...prev, questionsAsked: drop(prev.questionsAsked) };
        if (type === "mistake") return { ...prev, commonMistakes: drop(prev.commonMistakes) };
        return { ...prev, keyInsights: drop(prev.keyInsights) };
      });
    },
    [updateCapture],
  );

  const appendManualLine = useCallback(
    (text) => addTaggedNote("insight", text),
    [addTaggedNote],
  );

  /** Rating (1-5) + Điểm mạnh/Cần cải thiện/Lời khuyên — mentor điền ngay trong buổi, tự lưu như phần còn lại. */
  const updateQuickAssessment = useCallback(
    (patch) => {
      updateCapture((prev) => ({ ...prev, ...patch }));
    },
    [updateCapture],
  );

  return {
    capture,
    interimTranscript,
    isListening,
    sttSupported,
    sttError,
    saveState,
    dictationNoteType,
    setDictationNoteType,
    toggleListening,
    finishDictationLine,
    pinLastLine,
    addTaggedNote,
    removeTaggedNote,
    appendManualLine,
    updateQuickAssessment,
    flushSave,
    hasContent: liveCaptureHasContent(capture),
  };
}
