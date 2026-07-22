import {
  buildNativeDevApiUrl,
  DEV_API_PORTS,
  getConfiguredApiBase,
  getDevHostCandidates,
  isNativeRuntime,
  resolveConfiguredApiBase,
  resolveDevHost,
} from '../config/apiConfig';
import { Platform } from 'react-native';

let cachedApiBase = null;
let lastProbeAttempts = [];
let probeInFlight = null;

const PROBE_TIMEOUT_MS = Platform.OS === 'web' ? 1500 : 3500;
const ENSURE_BUDGET_MS = Platform.OS === 'web' ? 8000 : 6000;
const MAX_CANDIDATES = 12;

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
  const base =
    cachedApiBase ||
    resolveConfiguredApiBase() ||
    buildNativeDevApiUrl() ||
    getConfiguredApiBase() ||
    '';
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
    PROBE_TIMEOUT_MS + 300,
  );
}

function buildDevApiBases() {
  const hosts = new Set();
  for (const host of getDevHostCandidates()) {
    hosts.add(host);
  }

  const resolved = resolveDevHost();
  if (resolved && resolved !== 'localhost' && resolved !== '127.0.0.1') {
    hosts.add(resolved);
  }

  if (Platform.OS === 'android') {
    hosts.add('10.0.2.2');
  }

  if (Platform.OS === 'web') {
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
  const list = [];
  const configured = resolveConfiguredApiBase();
  if (configured) list.push(configured);

  const nativeGuess = isNativeRuntime() ? buildNativeDevApiUrl() : null;
  if (nativeGuess) list.push(nativeGuess);

  if (__DEV__) {
    list.push(...buildDevApiBases());
  }

  return [...new Set(list.filter(Boolean))].slice(0, MAX_CANDIDATES);
}

async function probeFirstAvailable(candidates, budgetMs = ENSURE_BUDGET_MS) {
  if (!candidates.length) return null;

  return new Promise((resolve) => {
    let settled = false;
    let pending = candidates.length;

    const finish = (base) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(base);
    };

    const timer = setTimeout(() => finish(null), budgetMs);

    candidates.forEach((base) => {
      probeHealth(base)
        .then((ok) => {
          if (ok) finish(base);
        })
        .finally(() => {
          pending -= 1;
          if (pending <= 0 && !settled) finish(null);
        });
    });
  });
}

function getNativeOptimisticBase() {
  if (!isNativeRuntime() || !__DEV__) return null;
  return resolveConfiguredApiBase() || buildNativeDevApiUrl();
}

async function runProbe() {
  const started = Date.now();
  const candidates = buildCandidates();
  lastProbeAttempts = candidates;

  const found = await probeFirstAvailable(candidates, ENSURE_BUDGET_MS);
  if (found) {
    cachedApiBase = found;
    if (__DEV__) {
      console.log('[API] backend OK:', found);
    }
    return found;
  }

  if (Date.now() - started > ENSURE_BUDGET_MS && isNativeRuntime()) {
    const optimistic = getNativeOptimisticBase();
    if (optimistic) {
      cachedApiBase = optimistic;
      if (__DEV__) {
        console.warn('[API] probe timeout — dùng URL cấu hình:', optimistic);
      }
      return optimistic;
    }
  }

  if (!isNativeRuntime()) {
    const fallback = resolveConfiguredApiBase() || getConfiguredApiBase();
    if (fallback) {
      cachedApiBase = fallback;
      return fallback;
    }
  }

  return null;
}

function verifyInBackground(preferred) {
  void (async () => {
    const ok = await probeHealth(preferred);
    if (ok) {
      cachedApiBase = preferred;
      if (__DEV__) console.log('[API] verified:', preferred);
      return;
    }

    const found = await probeFirstAvailable(
      buildCandidates().filter((base) => base !== preferred),
      ENSURE_BUDGET_MS,
    );
    if (found) {
      cachedApiBase = found;
      if (__DEV__) console.log('[API] switched to:', found);
    }
  })();
}

/**
 * Tìm backend đang chạy. Cache kết quả.
 * Trên điện thoại: trả URL LAN ngay, probe song song ở nền.
 */
export async function ensureApiBase() {
  if (cachedApiBase) return cachedApiBase;
  if (probeInFlight) return probeInFlight;

  const optimistic = getNativeOptimisticBase();
  if (optimistic) {
    cachedApiBase = optimistic;
    verifyInBackground(optimistic);
    return optimistic;
  }

  probeInFlight = runProbe().finally(() => {
    probeInFlight = null;
  });

  return probeInFlight;
}

export function resetApiBaseCache() {
  cachedApiBase = null;
  lastProbeAttempts = [];
  probeInFlight = null;
}
