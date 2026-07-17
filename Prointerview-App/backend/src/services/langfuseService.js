/**
 * langfuseService.js
 * Langfuse observability — trace LLM calls (question gen + evaluation).
 * Fire-and-forget: tracing failures never block the main flow.
 *
 * Env vars required:
 *   LANGFUSE_PUBLIC_KEY=pk-lf-...
 *   LANGFUSE_SECRET_KEY=sk-lf-...
 *   LANGFUSE_HOST=https://cloud.langfuse.com   (optional, default shown)
 */

import { randomUUID } from "crypto";

function cfg() {
  return {
    publicKey: process.env.LANGFUSE_PUBLIC_KEY ?? "",
    secretKey:  process.env.LANGFUSE_SECRET_KEY  ?? "",
    host:       process.env.LANGFUSE_HOST         ?? "https://cloud.langfuse.com",
  };
}

export function isLangfuseEnabled() {
  const { publicKey, secretKey } = cfg();
  return Boolean(publicKey && secretKey);
}

/**
 * Gửi batch ingestion events đến Langfuse API.
 * Fire-and-forget — không await, không throw.
 */
function ingest(events) {
  if (!isLangfuseEnabled()) return;
  const { publicKey, secretKey, host } = cfg();
  const auth = Buffer.from(`${publicKey}:${secretKey}`).toString("base64");
  fetch(`${host}/api/public/ingestion`, {
    method:  "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization:  `Basic ${auth}`,
    },
    body: JSON.stringify({ batch: events }),
  }).catch(() => {}); // never let tracing break the main flow
}

/**
 * Tạo một Langfuse trace (session gốc cho 1 phỏng vấn hoặc 1 evaluation run).
 * Trả về traceId để dùng khi log generations.
 *
 * @param {object} opts
 * @param {string} opts.name       - Tên trace ("generate_questions" | "evaluate_session")
 * @param {string} [opts.userId]   - userId từ req.userId
 * @param {string} [opts.sessionId] - MongoDB sessionId nếu có
 * @param {object} [opts.metadata]
 * @returns {string} traceId
 */
export function createTrace({ name, userId, sessionId, metadata = {} }) {
  const traceId = randomUUID();
  ingest([{
    id:        randomUUID(),
    type:      "trace-create",
    timestamp: new Date().toISOString(),
    body: {
      id:        traceId,
      name,
      userId:    userId ? String(userId) : undefined,
      sessionId: sessionId ? String(sessionId) : undefined,
      metadata,
    },
  }]);
  return traceId;
}

/**
 * Log 1 LLM generation (1 lần gọi callLLM) vào trace đã tạo.
 *
 * @param {object} opts
 * @param {string} opts.traceId
 * @param {string} opts.name        - Tên generation ("question_gen" | "evaluation")
 * @param {string} opts.model       - Model name (LLM_MODEL)
 * @param {string} opts.systemPrompt
 * @param {string} opts.userPrompt
 * @param {string} opts.output      - Raw LLM output
 * @param {number} opts.latencyMs
 * @param {object} [opts.usage]     - { inputTokens, outputTokens } nếu có
 * @param {object} [opts.metadata]
 */
export function logGeneration({
  traceId,
  name,
  model,
  systemPrompt,
  userPrompt,
  output,
  latencyMs,
  usage = {},
  metadata = {},
}) {
  if (!traceId) return;
  const generationId = randomUUID();
  const endTime = new Date();
  const startTime = new Date(endTime - latencyMs);

  ingest([{
    id:        randomUUID(),
    type:      "generation-create",
    timestamp: startTime.toISOString(),
    body: {
      id:         generationId,
      traceId,
      name,
      model,
      startTime:  startTime.toISOString(),
      endTime:    endTime.toISOString(),
      input: {
        system: systemPrompt?.slice(0, 2000), // truncate for storage
        user:   userPrompt?.slice(0, 2000),
      },
      output:     output?.slice(0, 4000),
      usage: {
        input:  usage.inputTokens  ?? undefined,
        output: usage.outputTokens ?? undefined,
        total:  usage.totalTokens  ?? undefined,
      },
      metadata,
    },
  }]);
}

/**
 * Đánh dấu trace là completed hoặc error.
 * @param {string} traceId
 * @param {"success"|"error"} level
 * @param {string} [statusMessage]
 */
export function finalizeTrace(traceId, level = "success", statusMessage) {
  if (!traceId) return;
  ingest([{
    id:        randomUUID(),
    type:      "trace-create", // update existing trace
    timestamp: new Date().toISOString(),
    body: {
      id:     traceId,
      level,
      ...(statusMessage && { statusMessage }),
    },
  }]);
}
