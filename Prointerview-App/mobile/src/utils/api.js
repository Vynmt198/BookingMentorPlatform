import {
  DEV_API_PORTS,
  getConfiguredApiBase,
  getDevHostCandidates,
  resolveConfiguredApiBase,
  resolveDevHost,
} from '../config/apiConfig';
import { Platform } from 'react-native';

let cachedApiBase = null;
let lastProbeAttempts = [];
let probeInFlight = null;

const PROBE_TIMEOUT_MS = 1200;
const ENSURE_BUDGET_MS = 4500;
const MAX_CANDIDATES = 6;

export function getApiBaseUrl() {
  return cachedApiBase;
}

export function setApiBaseUrl(base) {
  if (base) cachedApiBase = String(base).replace(/\/$/, '');
}

export function getLastApiProbeAttempts() {
  return lastProbeAttempts.slice();
}

export function apiUrl(path) {
  const base = cachedApiBase || resolveConfiguredApiBase() || getConfiguredApiBase() || '';
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}

function withTimeout(promise, ms) {
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(false);
      }
    }, ms);
    promise
      .then((value) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(value);
        }
      })
      .catch(() => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(false);
        }
      });
  });
}

async function probeHealth(base) {
  return withTimeout(
    (async () => {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const abortTimer = controller
        ? setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS)
        : null;
      try {
        const res = await fetch(`${base}/api/health`, {
          headers: { Accept: 'application/json' },
          signal: controller?.signal,
        });
        return Boolean(res?.ok);
      } finally {
        if (abortTimer) clearTimeout(abortTimer);
      }
    })(),
    PROBE_TIMEOUT_MS + 150,
  );
}

function buildDevApiBases() {
  const hosts = new Set();
  for (const host of getDevHostCandidates()) {
    hosts.add(host);
  }
  hosts.add(resolveDevHost());
  if (Platform.OS === 'android') {
    hosts.add('10.0.2.2');
  }
  // localhost chỉ hữu ích trên simulator/web — để cuối để khỏi treo máy thật
  if (Platform.OS === 'web' || Platform.OS === 'ios') {
    hosts.add('localhost');
    hosts.add('127.0.0.1');
  }

  const bases = [];
  for (const host of hosts) {
    if (!host) continue;
    for (const port of DEV_API_PORTS) {
      bases.push(`http://${host}:${port}`);
    }
  }
  return bases;
}

function buildCandidates() {
  const configured = resolveConfiguredApiBase();
  const list = [];
  if (configured) list.push(configured);
  if (__DEV__) list.push(...buildDevApiBases());
  return [...new Set(list.filter(Boolean))].slice(0, MAX_CANDIDATES);
}

/**
 * Tìm backend đang chạy. Cache kết quả.
 * Có ngân sách thời gian — không probe vô hạn.
 */
export async function ensureApiBase() {
  if (cachedApiBase) return cachedApiBase;
  if (probeInFlight) return probeInFlight;

  probeInFlight = (async () => {
    const started = Date.now();
    try {
      const candidates = buildCandidates();
      lastProbeAttempts = candidates;

      for (const base of candidates) {
        if (Date.now() - started > ENSURE_BUDGET_MS) break;
        try {
          if (await probeHealth(base)) {
            cachedApiBase = base;
            return base;
          }
        } catch {
          // next
        }
      }

      // Dev: nếu có URL cấu hình, dùng luôn (login sẽ báo lỗi nếu sai)
      const fallback = resolveConfiguredApiBase();
      if (fallback) {
        cachedApiBase = fallback;
        return fallback;
      }
      return null;
    } finally {
      probeInFlight = null;
    }
  })();

  return probeInFlight;
}

export function resetApiBaseCache() {
  cachedApiBase = null;
  lastProbeAttempts = [];
  probeInFlight = null;
}
