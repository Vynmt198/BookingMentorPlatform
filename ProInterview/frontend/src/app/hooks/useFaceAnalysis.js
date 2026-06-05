/**
 * useFaceAnalysis — MediaPipe FaceMesh (CDN) hook
 *
 * Chạy face landmark detection in-browser, 500 ms/frame khi isActive=true.
 * Không gửi ảnh ra ngoài — toàn bộ xử lý ở client.
 *
 * Metrics tích lũy per-question:
 *   eyeContactScore     (0–1): mũi hướng vào camera ↔ nhìn sang hướng khác
 *   headStabilityScore  (0–1): ít dao động đầu = ổn định
 *   facePresenceRatio   (0–1): % frame detect được mặt
 *   distractionEvents   (int): số lần eyeContact giảm dưới ngưỡng 0.35
 */

import { useRef, useEffect, useCallback } from "react";

const CDN_BASE = "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/";
let _loadPromise = null;

function loadFaceMeshCDN() {
  if (_loadPromise) return _loadPromise;
  if (typeof window !== "undefined" && window.FaceMesh) {
    return (_loadPromise = Promise.resolve());
  }
  _loadPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = CDN_BASE + "face_mesh.js";
    s.crossOrigin = "anonymous";
    s.onload  = resolve;
    s.onerror = () => { _loadPromise = null; reject(new Error("FaceMesh CDN unavailable")); };
    document.head.appendChild(s);
  });
  return _loadPromise;
}

// ── Landmark indices (MediaPipe FaceMesh 468-point model) ─────────────────────
const LM_LEFT_EYE_OUTER  = 33;
const LM_RIGHT_EYE_OUTER = 263;
const LM_FACE_LEFT_EDGE  = 234;
const LM_FACE_RIGHT_EDGE = 454;
const LM_NOSE_TIP        = 1;

/**
 * Eye-contact score: 1 = nose centred between eye outer corners (camera-facing),
 * 0 = nose shifted far to one side (looking away).
 */
function calcEyeContact(lm) {
  if (!lm || lm.length < 468) return 0.5;
  const cx = (lm[LM_LEFT_EYE_OUTER].x + lm[LM_RIGHT_EYE_OUTER].x) / 2;
  const fw = Math.abs(lm[LM_FACE_RIGHT_EDGE].x - lm[LM_FACE_LEFT_EDGE].x);
  if (fw < 0.05) return 0.5; // face too small / edge case
  const offset = Math.abs(lm[LM_NOSE_TIP].x - cx) / fw;
  return Math.max(0, Math.min(1, 1 - offset * 2.5));
}

function calcFaceCenter(lm) {
  if (!lm || lm.length < 468) return null;
  return {
    x: (lm[LM_LEFT_EYE_OUTER].x + lm[LM_RIGHT_EYE_OUTER].x) / 2,
    y: (lm[LM_LEFT_EYE_OUTER].y + lm[LM_RIGHT_EYE_OUTER].y) / 2,
  };
}

/** Head stability from recent position history: high variance → low score */
function calcHeadStability(history) {
  if (history.length < 3) return 1;
  const mx = history.reduce((s, p) => s + p.x, 0) / history.length;
  const my = history.reduce((s, p) => s + p.y, 0) / history.length;
  const variance = history.reduce(
    (s, p) => s + (p.x - mx) ** 2 + (p.y - my) ** 2, 0
  ) / history.length;
  return Math.max(0, Math.min(1, 1 - variance * 150));
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useFaceAnalysis({ videoRef, isActive }) {
  const meshRef      = useRef(null);
  const canvasRef    = useRef(null);
  const intervalRef  = useRef(null);
  const loadedRef    = useRef(false);
  const loadingRef   = useRef(false);

  // Per-question accumulators
  const framesRef    = useRef(0);
  const detectedRef  = useRef(0);
  const eyeSumRef    = useRef(0);
  const poseHistRef  = useRef([]); // ring buffer of face-center positions
  const distractRef  = useRef(0);
  const prevEyeRef   = useRef(0.5);

  // ── Public: reset accumulators at the start of each question ──────────────
  const resetMetrics = useCallback(() => {
    framesRef.current   = 0;
    detectedRef.current = 0;
    eyeSumRef.current   = 0;
    poseHistRef.current = [];
    distractRef.current = 0;
    prevEyeRef.current  = 0.5;
  }, []);

  // ── Public: snapshot current accumulated metrics ───────────────────────────
  const getMetrics = useCallback(() => {
    const total    = framesRef.current   || 1;
    const detected = detectedRef.current || 0;
    return {
      eyeContactScore:    detected > 0 ? Math.round((eyeSumRef.current / detected) * 100) / 100 : 0,
      headStabilityScore: Math.round(calcHeadStability(poseHistRef.current) * 100) / 100,
      facePresenceRatio:  Math.round((detected / total) * 100) / 100,
      distractionEvents:  distractRef.current,
    };
  }, []);

  // ── Init FaceMesh once on mount ────────────────────────────────────────────
  useEffect(() => {
    if (loadedRef.current || loadingRef.current) return;
    loadingRef.current = true;

    loadFaceMeshCDN()
      .then(() => {
        if (!window.FaceMesh) throw new Error("window.FaceMesh not found after CDN load");

        const mesh = new window.FaceMesh({
          locateFile: (f) => CDN_BASE + f,
        });
        mesh.setOptions({
          maxNumFaces:            1,
          refineLandmarks:        false,
          minDetectionConfidence: 0.5,
          minTrackingConfidence:  0.5,
        });
        mesh.onResults((results) => {
          framesRef.current += 1;
          const faces = results.multiFaceLandmarks;
          if (!faces || faces.length === 0) return;

          detectedRef.current += 1;
          const lm  = faces[0];
          const ec  = calcEyeContact(lm);
          const pos = calcFaceCenter(lm);

          eyeSumRef.current += ec;

          if (pos) {
            poseHistRef.current.push(pos);
            if (poseHistRef.current.length > 20) poseHistRef.current.shift();
          }

          // Distraction event: eye contact crosses below 0.35 threshold
          if (ec < 0.35 && prevEyeRef.current >= 0.35) distractRef.current += 1;
          prevEyeRef.current = ec;
        });

        canvasRef.current = document.createElement("canvas");
        meshRef.current   = mesh;
        loadedRef.current = true;
        loadingRef.current = false;
      })
      .catch(() => {
        // Silent fail — face analysis is optional
        loadingRef.current = false;
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sampling interval — starts/stops with isActive ────────────────────────
  useEffect(() => {
    clearInterval(intervalRef.current);
    if (!isActive) return;

    intervalRef.current = setInterval(async () => {
      const video  = videoRef?.current;
      const mesh   = meshRef.current;
      const canvas = canvasRef.current;
      if (!video || !mesh || !canvas || video.videoWidth === 0 || !loadedRef.current) return;

      canvas.width  = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d")?.drawImage(video, 0, 0);

      try { await mesh.send({ image: canvas }); } catch { /* network / WASM error — skip frame */ }
    }, 500);

    return () => clearInterval(intervalRef.current);
  }, [isActive, videoRef]);

  // Cleanup on unmount — close WASM instance to prevent memory leak
  useEffect(() => {
    return () => {
      clearInterval(intervalRef.current);
      try { meshRef.current?.close(); } catch (_) {}
      meshRef.current   = null;
      loadedRef.current = false;
      _loadPromise      = null; // allow re-init on next mount
    };
  }, []);

  return { resetMetrics, getMetrics };
}
