/**
 * emotionService.js
 * Emotion analysis providers:
 *   - Hume AI  (audio + face, batch API) — khi HUME_API_KEY set
 *   - Google Cloud Vision (face snapshot) — đã có trong interviewsController.analyzeFace
 *   - none → trả null, frontend dùng client-side FaceMesh
 *
 * Env vars:
 *   HUME_API_KEY=...
 *   HUME_SECRET_KEY=...   (dùng để lấy access token nếu cần OAuth)
 *   EMOTION_PROVIDER=none | hume   (mặc định: hume nếu có key)
 *
 * Hume AI Batch API flow:
 *   1. POST /v0/batch/jobs   — multipart/form-data: file + json config
 *   2. Poll GET /v0/batch/jobs/:id  until status = completed | failed
 *   3. GET /v0/batch/jobs/:id/predictions   — lấy emotion scores
 */

const HUME_BASE = "https://api.hume.ai/v0";
const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS  = 90_000;

function cfg() {
  return {
    apiKey:    process.env.HUME_API_KEY     ?? "",
    secretKey: process.env.HUME_SECRET_KEY  ?? "",
  };
}

export function isHumeEnabled() {
  return Boolean(cfg().apiKey);
}

/**
 * Trả về emotion provider đang active.
 * @returns {"hume"|"google_vision"|"none"}
 */
export function getEmotionProvider() {
  const explicit = process.env.EMOTION_PROVIDER?.toLowerCase();
  if (explicit === "none") return "none";
  if (explicit === "hume" && isHumeEnabled()) return "hume";
  if (explicit === "google_vision") return "google_vision";
  // auto-detect
  if (isHumeEnabled()) return "hume";
  if (process.env.GOOGLE_VISION_API_KEY) return "google_vision";
  return "none";
}

/**
 * Submit audio file để Hume AI phân tích prosody (cảm xúc qua giọng nói).
 * @param {Buffer} audioBuffer
 * @param {string} [contentType="audio/webm"]
 * @returns {string} jobId
 */
async function submitHumeAudioJob(audioBuffer, contentType = "audio/webm") {
  const { apiKey } = cfg();
  const ext = contentType.includes("mp3") ? "mp3" : contentType.includes("wav") ? "wav" : "webm";

  const formData = new FormData();
  const blob = new Blob([audioBuffer], { type: contentType });
  formData.append("file", blob, `audio.${ext}`);

  // Config: phân tích prosody (giọng nói) + face (nếu có video)
  const jobConfig = {
    models: {
      prosody: {
        granularity: "sentence",
        identify_speakers: false,
      },
    },
  };
  formData.append("json", JSON.stringify(jobConfig));

  const res = await fetch(`${HUME_BASE}/batch/jobs`, {
    method:  "POST",
    headers: { "X-Hume-Api-Key": apiKey },
    body:    formData,
    signal:  AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Hume AI job submit failed (${res.status}): ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  return data.job_id ?? data.id;
}

/**
 * Submit image buffer để Hume AI phân tích facial expression.
 * @param {Buffer} imageBuffer
 * @param {string} [contentType="image/jpeg"]
 * @returns {string} jobId
 */
async function submitHumeFaceJob(imageBuffer, contentType = "image/jpeg") {
  const { apiKey } = cfg();

  const formData = new FormData();
  const blob = new Blob([imageBuffer], { type: contentType });
  formData.append("file", blob, "face.jpg");

  const jobConfig = {
    models: {
      face: {
        fps_pred: 1,
        min_face_size: 60,
      },
    },
  };
  formData.append("json", JSON.stringify(jobConfig));

  const res = await fetch(`${HUME_BASE}/batch/jobs`, {
    method:  "POST",
    headers: { "X-Hume-Api-Key": apiKey },
    body:    formData,
    signal:  AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Hume AI face job submit failed (${res.status}): ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  return data.job_id ?? data.id;
}

/**
 * Poll Hume AI job đến khi completed.
 * @param {string} jobId
 * @returns {object} job details
 */
async function pollHumeJob(jobId) {
  const { apiKey } = cfg();
  const deadline = Date.now() + POLL_TIMEOUT_MS;

  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));

    const res = await fetch(`${HUME_BASE}/batch/jobs/${jobId}`, {
      headers: { "X-Hume-Api-Key": apiKey },
      signal:  AbortSignal.timeout(10_000),
    });

    if (!res.ok) continue;
    const data = await res.json();
    const status = data.state?.status ?? data.status;

    if (status === "COMPLETED" || status === "completed") return data;
    if (status === "FAILED" || status === "failed") {
      throw new Error(`Hume AI job ${jobId} failed`);
    }
  }

  throw new Error("Hume AI job timed out after 90s");
}

/**
 * Lấy predictions từ job đã completed.
 * @param {string} jobId
 * @returns {object[]} predictions
 */
async function getHumePredictions(jobId) {
  const { apiKey } = cfg();
  const res = await fetch(`${HUME_BASE}/batch/jobs/${jobId}/predictions`, {
    headers: { "X-Hume-Api-Key": apiKey },
    signal:  AbortSignal.timeout(10_000),
  });
  if (!res.ok) return [];
  return res.json();
}

/**
 * Normalize Hume predictions → ProInterview emotion format.
 * Tập trung vào top 5 emotions + compute confidence/stress/engagement.
 */
function normalizeHumeProsody(predictions) {
  const allEmotions = predictions
    .flatMap(p =>
      (p.results?.predictions ?? [])
        .flatMap(fp => fp.models?.prosody?.grouped_predictions ?? [])
        .flatMap(gp => gp.predictions ?? [])
        .flatMap(pred => pred.emotions ?? [])
    );

  if (!allEmotions.length) return null;

  // Tính average score mỗi emotion
  const emotionMap = {};
  for (const e of allEmotions) {
    if (!emotionMap[e.name]) emotionMap[e.name] = { total: 0, count: 0 };
    emotionMap[e.name].total += e.score;
    emotionMap[e.name].count += 1;
  }

  const averages = Object.entries(emotionMap)
    .map(([name, { total, count }]) => ({ name, score: total / count }))
    .sort((a, b) => b.score - a.score);

  const top5 = averages.slice(0, 5);
  const scoreOf = (name) => averages.find(e => e.name === name)?.score ?? 0;

  // Derived behavioral metrics for ProInterview
  const confidence  = Math.max(scoreOf("Confidence"), scoreOf("Interest"), scoreOf("Concentration")) ;
  const stress      = Math.max(scoreOf("Anxiety"), scoreOf("Fear"), scoreOf("Nervousness"), scoreOf("Distress"));
  const engagement  = Math.max(scoreOf("Excitement"), scoreOf("Interest"), scoreOf("Enthusiasm"));
  const authenticity = 1 - Math.max(scoreOf("Awkwardness"), scoreOf("Doubt"), scoreOf("Confusion"));

  return {
    top5,
    confidence:   Math.min(1, confidence),
    stress_level: Math.min(1, stress),
    engagement:   Math.min(1, engagement),
    authenticity: Math.max(0, Math.min(1, authenticity)),
    provider:     "hume",
  };
}

function normalizeHumeFace(predictions) {
  const allEmotions = predictions
    .flatMap(p =>
      (p.results?.predictions ?? [])
        .flatMap(fp => fp.models?.face?.grouped_predictions ?? [])
        .flatMap(gp => gp.predictions ?? [])
        .flatMap(pred => pred.emotions ?? [])
    );

  if (!allEmotions.length) return null;

  const emotionMap = {};
  for (const e of allEmotions) {
    if (!emotionMap[e.name]) emotionMap[e.name] = { total: 0, count: 0 };
    emotionMap[e.name].total += e.score;
    emotionMap[e.name].count += 1;
  }

  const averages = Object.entries(emotionMap)
    .map(([name, { total, count }]) => ({ name, score: total / count }))
    .sort((a, b) => b.score - a.score);

  return {
    top5:     averages.slice(0, 5),
    provider: "hume_face",
  };
}

/**
 * Phân tích cảm xúc từ audio buffer qua Hume AI prosody model.
 * @param {Buffer} audioBuffer
 * @param {string} [contentType="audio/webm"]
 * @returns {Promise<object|null>} emotion scores hoặc null nếu Hume không enabled
 */
export async function analyzeAudioEmotion(audioBuffer, contentType = "audio/webm") {
  if (!isHumeEnabled()) return null;

  const jobId      = await submitHumeAudioJob(audioBuffer, contentType);
  await pollHumeJob(jobId);
  const predictions = await getHumePredictions(jobId);
  return normalizeHumeProsody(predictions);
}

/**
 * Phân tích cảm xúc từ image buffer qua Hume AI face model.
 * @param {Buffer} imageBuffer
 * @param {string} [contentType="image/jpeg"]
 * @returns {Promise<object|null>}
 */
export async function analyzeFaceEmotion(imageBuffer, contentType = "image/jpeg") {
  if (!isHumeEnabled()) return null;

  const jobId      = await submitHumeFaceJob(imageBuffer, contentType);
  await pollHumeJob(jobId);
  const predictions = await getHumePredictions(jobId);
  return normalizeHumeFace(predictions);
}
