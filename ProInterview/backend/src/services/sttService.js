/**
 * sttService.js
 * Speech-to-Text provider: AssemblyAI (server-side, tiếng Việt chính xác hơn Web Speech API).
 * Khi ASSEMBLYAI_API_KEY không set → trả về null (frontend tự dùng Web Speech API).
 *
 * Env vars:
 *   ASSEMBLYAI_API_KEY=...
 *   STT_PROVIDER=browser | assemblyai  (mặc định: browser nếu không có key)
 *
 * REST flow:
 *   1. Upload audio → POST /v2/upload → upload_url
 *   2. Submit job   → POST /v2/transcript
 *   3. Poll         → GET  /v2/transcript/:id (mỗi 2s, timeout 120s)
 */

const ASSEMBLYAI_BASE = "https://api.assemblyai.com/v2";
const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS  = 120_000;

function getKey() {
  return process.env.ASSEMBLYAI_API_KEY ?? "";
}

export function isAssemblyAIEnabled() {
  return Boolean(getKey());
}

/**
 * Trả về provider STT đang active.
 * @returns {"assemblyai"|"browser"}
 */
export function getSTTProvider() {
  const explicit = process.env.STT_PROVIDER?.toLowerCase();
  if (explicit === "assemblyai" && isAssemblyAIEnabled()) return "assemblyai";
  if (explicit === "browser") return "browser";
  return isAssemblyAIEnabled() ? "assemblyai" : "browser";
}

function aaiHeaders() {
  return {
    authorization: getKey(),
    "Content-Type": "application/json",
  };
}

/**
 * Bước 1: Upload audio buffer lên AssemblyAI CDN.
 * @param {Buffer} audioBuffer
 * @param {string} [contentType="audio/webm"]
 * @returns {string} upload_url
 */
async function uploadAudio(audioBuffer, contentType = "audio/webm") {
  const res = await fetch(`${ASSEMBLYAI_BASE}/upload`, {
    method: "POST",
    headers: {
      authorization: getKey(),
      "Content-Type": contentType,
      "Transfer-Encoding": "chunked",
    },
    body: audioBuffer,
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`AssemblyAI upload failed (${res.status}): ${errText.slice(0, 200)}`);
  }

  const { upload_url } = await res.json();
  return upload_url;
}

/**
 * Bước 2: Tạo transcript job.
 * @param {string} audioUrl
 * @param {object} opts
 * @param {string} [opts.languageCode="vi"] - vi | en | auto
 * @param {boolean} [opts.speakerLabels=false]
 * @param {boolean} [opts.sentimentAnalysis=false]
 * @returns {string} transcriptId
 */
async function submitJob(audioUrl, { languageCode = "vi", speakerLabels = false, sentimentAnalysis = false } = {}) {
  const body = {
    audio_url:          audioUrl,
    language_code:      languageCode,
    speaker_labels:     speakerLabels,
    sentiment_analysis: sentimentAnalysis,
    speech_model:       "universal",
  };

  const res = await fetch(`${ASSEMBLYAI_BASE}/transcript`, {
    method:  "POST",
    headers: aaiHeaders(),
    body:    JSON.stringify(body),
    signal:  AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`AssemblyAI job submit failed (${res.status}): ${errText.slice(0, 200)}`);
  }

  const { id } = await res.json();
  return id;
}

/**
 * Bước 3: Poll đến khi job hoàn thành.
 * @param {string} transcriptId
 * @returns {object} transcript result
 */
async function pollJob(transcriptId) {
  const deadline = Date.now() + POLL_TIMEOUT_MS;

  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));

    const res = await fetch(`${ASSEMBLYAI_BASE}/transcript/${transcriptId}`, {
      headers: { authorization: getKey() },
      signal:  AbortSignal.timeout(10_000),
    });

    if (!res.ok) continue;
    const data = await res.json();

    if (data.status === "completed") return data;
    if (data.status === "error") {
      throw new Error(`AssemblyAI transcription error: ${data.error}`);
    }
    // status: "queued" | "processing" → tiếp tục poll
  }

  throw new Error("AssemblyAI transcription timed out after 120s");
}

/**
 * Transcribe audio buffer → text.
 * Nếu không có API key → trả về null (caller tự xử lý fallback).
 *
 * @param {Buffer} audioBuffer
 * @param {object} opts
 * @param {string} [opts.languageCode="vi"]
 * @param {boolean} [opts.speakerLabels=false]
 * @param {boolean} [opts.sentimentAnalysis=false]
 * @param {string} [opts.contentType="audio/webm"]
 * @returns {Promise<{text: string, words?: object[], utterances?: object[], sentiment?: object[]}|null>}
 */
export async function transcribeAudio(audioBuffer, opts = {}) {
  if (!isAssemblyAIEnabled()) return null;

  const { languageCode = "vi", speakerLabels = false, sentimentAnalysis = false, contentType = "audio/webm" } = opts;

  const uploadUrl    = await uploadAudio(audioBuffer, contentType);
  const transcriptId = await submitJob(uploadUrl, { languageCode, speakerLabels, sentimentAnalysis });
  const result       = await pollJob(transcriptId);

  return {
    text:        result.text ?? "",
    words:       result.words ?? [],
    utterances:  result.utterances ?? [],
    sentiment:   result.sentiment_analysis_results ?? [],
    confidence:  result.confidence ?? null,
    audioDurationMs: result.audio_duration ? Math.round(result.audio_duration * 1000) : null,
  };
}
