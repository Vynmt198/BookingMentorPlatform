/**
 * cacheService.js
 * Cache abstraction — Upstash Redis REST API hoặc in-memory Map.
 *
 * Priority:
 *   1. Upstash Redis REST (UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN set)
 *   2. Standard Redis URL (REDIS_URL) — dùng chung format với ioredis nếu cần
 *      Note: Node 20 không có native Redis client; dùng Upstash REST nếu muốn cloud.
 *   3. In-memory Map fallback (ngon cho dev/MVP, mất khi restart)
 *
 * Env vars (cấu hình 1 trong 2):
 *   UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
 *   UPSTASH_REDIS_REST_TOKEN=AXXXyyy...
 *
 * Upstash REST API docs: https://upstash.com/docs/redis/features/restapi
 */

// ── In-memory fallback ────────────────────────────────────────────────────────
const memCache = new Map();   // key → { value, expiresAt }

function memGet(key) {
  const entry = memCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt && Date.now() > entry.expiresAt) {
    memCache.delete(key);
    return null;
  }
  return entry.value;
}

function memSet(key, value, ttlSeconds) {
  memCache.set(key, {
    value,
    expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
  });
}

function memDel(key) {
  memCache.delete(key);
}

// ── Upstash Redis REST API ────────────────────────────────────────────────────

function upstashCfg() {
  return {
    url:   process.env.UPSTASH_REDIS_REST_URL   ?? "",
    token: process.env.UPSTASH_REDIS_REST_TOKEN ?? "",
  };
}

export function isRedisEnabled() {
  const { url, token } = upstashCfg();
  return Boolean(url && token);
}

async function upstashCmd(args) {
  const { url, token } = upstashCfg();
  const res = await fetch(`${url.replace(/\/$/, "")}`, {
    method:  "POST",
    headers: {
      Authorization:  `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body:   JSON.stringify(args),
    signal: AbortSignal.timeout(5_000),
  });
  if (!res.ok) {
    throw new Error(`Upstash HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.result;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Lấy giá trị từ cache.
 * @param {string} key
 * @returns {Promise<string|null>}
 */
export async function cacheGet(key) {
  if (isRedisEnabled()) {
    try {
      const val = await upstashCmd(["GET", key]);
      return typeof val === "string" ? val : null;
    } catch {
      // fallback to memory on Redis error
    }
  }
  return memGet(key);
}

/**
 * Lưu giá trị vào cache với TTL.
 * @param {string} key
 * @param {string} value
 * @param {number} [ttlSeconds=86400] - Thời gian sống (giây)
 */
export async function cacheSet(key, value, ttlSeconds = 86400) {
  if (isRedisEnabled()) {
    try {
      await upstashCmd(["SET", key, String(value), "EX", ttlSeconds]);
      return;
    } catch {
      // fallback to memory on Redis error
    }
  }
  memSet(key, value, ttlSeconds);
}

/**
 * Xóa key khỏi cache.
 * @param {string} key
 */
export async function cacheDel(key) {
  if (isRedisEnabled()) {
    try {
      await upstashCmd(["DEL", key]);
      return;
    } catch {}
  }
  memDel(key);
}

/**
 * Kiểm tra key có tồn tại không.
 * @param {string} key
 * @returns {Promise<boolean>}
 */
export async function cacheExists(key) {
  const val = await cacheGet(key);
  return val !== null;
}

/**
 * Helper: lấy hoặc tính toán giá trị (lazy cache).
 * @param {string} key
 * @param {Function} compute - async function trả về string
 * @param {number} [ttlSeconds]
 * @returns {Promise<{value: string, fromCache: boolean}>}
 */
export async function cacheGetOrSet(key, compute, ttlSeconds = 86400) {
  const cached = await cacheGet(key);
  if (cached !== null) return { value: cached, fromCache: true };

  const value = await compute();
  await cacheSet(key, value, ttlSeconds);
  return { value, fromCache: false };
}
