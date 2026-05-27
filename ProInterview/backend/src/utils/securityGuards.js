import crypto from "crypto";

export function sanitizeObjectKeys(input) {
  if (!input || typeof input !== "object") return;
  for (const key of Object.keys(input)) {
    if (key.startsWith("$") || key.includes(".")) {
      delete input[key];
      continue;
    }
    sanitizeObjectKeys(input[key]);
  }
}

function normalizeIp(ipRaw) {
  const ip = String(ipRaw || "").trim().toLowerCase();
  if (!ip) return "";
  if (ip === "::1") return "127.0.0.1";
  if (ip.startsWith("::ffff:")) return ip.slice(7);
  return ip;
}

export function buildSessionFingerprint(meta) {
  const ua = String(meta?.userAgent || "").trim().slice(0, 400);
  const ip = normalizeIp(meta?.ip);
  const raw = `${ua}|${ip}`;
  return crypto.createHash("sha256").update(raw, "utf8").digest("hex");
}

export function shortFingerprint(hash) {
  const h = String(hash || "");
  if (!h) return "";
  return `${h.slice(0, 8)}…${h.slice(-4)}`;
}

export function deviceLabelFromUserAgent(userAgent) {
  const ua = String(userAgent || "").trim();
  if (!ua) return "Thiết bị không xác định";
  if (/Edg\//i.test(ua)) return "Microsoft Edge";
  if (/Chrome\//i.test(ua) && !/Edg/i.test(ua)) return "Google Chrome";
  if (/Firefox\//i.test(ua)) return "Mozilla Firefox";
  if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) return "Safari";
  if (/Android/i.test(ua)) return "Android";
  if (/iPhone|iPad/i.test(ua)) return "iOS";
  return ua.length > 42 ? `${ua.slice(0, 42)}…` : ua;
}

export function shouldEnforceSessionFingerprint() {
  if (String(process.env.AUTH_STRICT_SESSION_FINGERPRINT || "").toLowerCase() === "true") return true;
  return String(process.env.NODE_ENV || "").toLowerCase() === "production";
}

export function isUploadSizeAllowed(bytes, maxBytes) {
  const n = Number(bytes);
  const m = Number(maxBytes);
  if (!Number.isFinite(n) || n < 0 || !Number.isFinite(m) || m <= 0) return false;
  return n <= m;
}
