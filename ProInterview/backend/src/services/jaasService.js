import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import jwt from "jsonwebtoken";
import { resolveStoredUploadUrl } from "../utils/resolveStoredUploadUrl.js";

const BACKEND_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

let cachedPrivateKey = null;

export function getJaasDomain() {
  return String(process.env.JAAS_DOMAIN || "8x8.vc").trim() || "8x8.vc";
}

function getJwtTtlSec() {
  const raw = Number(process.env.JAAS_JWT_TTL_SEC);
  if (Number.isFinite(raw) && raw >= 600 && raw <= 24 * 60 * 60) return Math.floor(raw);
  return 3 * 60 * 60;
}

function normalizePrivateKeyPem(raw) {
  const text = String(raw || "").trim();
  if (!text) return "";
  if (text.includes("\\n")) return text.replace(/\\n/g, "\n");
  return text;
}

function resolvePrivateKeyPath() {
  const envPath = String(process.env.JAAS_PRIVATE_KEY_PATH || "").trim();
  if (!envPath) return null;
  if (path.isAbsolute(envPath)) return envPath;
  return path.resolve(BACKEND_ROOT, envPath.replace(/^\.\//, ""));
}

function loadPrivateKey() {
  if (cachedPrivateKey) return cachedPrivateKey;

  const inline = normalizePrivateKeyPem(process.env.JAAS_PRIVATE_KEY);
  if (inline) {
    cachedPrivateKey = inline;
    return cachedPrivateKey;
  }

  const b64 = String(process.env.JAAS_PRIVATE_KEY_BASE64 || "").trim();
  if (b64) {
    try {
      cachedPrivateKey = normalizePrivateKeyPem(Buffer.from(b64, "base64").toString("utf8"));
      if (cachedPrivateKey) return cachedPrivateKey;
    } catch {
      return null;
    }
  }

  const keyPath = resolvePrivateKeyPath();
  if (!keyPath || !fs.existsSync(keyPath)) return null;

  cachedPrivateKey = normalizePrivateKeyPem(fs.readFileSync(keyPath, "utf8"));
  return cachedPrivateKey;
}

export function isJaasConfigured() {
  const appId = String(process.env.JAAS_APP_ID || "").trim();
  const kid = String(process.env.JAAS_API_KEY_ID || "").trim();
  return Boolean(appId && kid && loadPrivateKey());
}

/** Thông tin không nhạy cảm cho health check / log startup. */
export function getJaasPublicStatus() {
  const appId = String(process.env.JAAS_APP_ID || "").trim();
  const kid = String(process.env.JAAS_API_KEY_ID || "").trim();
  return {
    configured: isJaasConfigured(),
    domain: getJaasDomain(),
    appIdSuffix: appId ? appId.slice(-8) : null,
    kidSuffix: kid.includes("/") ? kid.split("/").pop() : null,
    keySource: loadPrivateKey()
      ? process.env.JAAS_PRIVATE_KEY
        ? "env"
        : process.env.JAAS_PRIVATE_KEY_BASE64
          ? "base64"
          : "file"
      : null,
  };
}

export function proInterviewJaasRoomSlug(bookingId) {
  const id = String(bookingId || "").trim();
  return `ProInterview-${id.replace(/[^a-zA-Z0-9-_]/g, "-").replace(/-+/g, "-").slice(0, 80)}`;
}

function resolveJaasAvatarUrl(avatar) {
  const resolved = resolveStoredUploadUrl(avatar);
  if (!resolved) return "";
  if (/^https?:\/\//i.test(resolved)) return resolved;
  return "";
}

/**
 * Ký JWT JaaS cho participant — mentor là moderator.
 * @see https://developer.8x8.com/jaas/docs/api-keys-jwt/
 */
export function signJaasMeetingJwt({
  appId,
  apiKeyId,
  roomSlug,
  userId,
  name,
  email,
  avatar = "",
  moderator = false,
}) {
  const privateKey = loadPrivateKey();
  if (!privateKey) {
    throw new Error("Thiếu JAAS private key.");
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const payload = {
    aud: "jitsi",
    iss: "chat",
    sub: appId,
    room: "*",
    exp: nowSec + getJwtTtlSec(),
    nbf: nowSec - 10,
    context: {
      user: {
        id: String(userId || crypto.randomUUID()),
        name: String(name || "User").slice(0, 120),
        email: String(email || "").slice(0, 200),
        avatar: resolveJaasAvatarUrl(avatar),
        moderator: moderator ? "true" : "false",
      },
      features: {
        livestreaming: false,
        recording: false,
        transcription: false,
        "outbound-call": false,
      },
      room: { regex: false },
    },
  };

  return jwt.sign(payload, privateKey, {
    algorithm: "RS256",
    keyid: apiKeyId,
  });
}

/** Cấu hình phòng JaaS cho client embed (8x8.vc + JWT). */
export function buildJaasMeetingLaunch({ bookingId, user, asMentor = false }) {
  if (!isJaasConfigured()) return null;

  const appId = String(process.env.JAAS_APP_ID || "").trim();
  const apiKeyId = String(process.env.JAAS_API_KEY_ID || "").trim();
  const domain = getJaasDomain();
  const roomSlug = proInterviewJaasRoomSlug(bookingId);
  const token = signJaasMeetingJwt({
    appId,
    apiKeyId,
    roomSlug,
    userId: user?.id || user?._id,
    name: user?.name || user?.email || "User",
    email: user?.email || "",
    avatar: user?.avatar || "",
    moderator: Boolean(asMentor),
  });

  return {
    provider: "jaas",
    domain,
    appId,
    roomName: roomSlug,
    fullRoomName: `${appId}/${roomSlug}`,
    jwt: token,
  };
}

/** Reset cache — dùng khi test hoặc hot-reload env. */
export function resetJaasPrivateKeyCache() {
  cachedPrivateKey = null;
}
