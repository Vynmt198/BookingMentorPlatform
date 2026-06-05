import { API_BASE_URL } from "./api.js";

export const DEFAULT_AVATAR = "https://api.dicebear.com/7.x/avataaars/svg?seed=ProInterview";

export const DEFAULT_COURSE_THUMB =
  "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80";

const LOCAL_BACKEND = /^https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?/i;

/** Lưu DB dạng `/uploads/...` — tránh gắn cứng host/port. */
export function normalizeStoredUploadUrl(url) {
  const raw = String(url ?? "").trim();
  if (!raw) return "";
  const idx = raw.indexOf("/uploads/");
  if (idx >= 0) return raw.slice(idx);
  if (raw.startsWith("uploads/")) return `/${raw}`;
  return raw;
}

/** Dev/prod: khi API host ≠ trang hiện tại → dùng `/uploads/...` cùng origin (Vite/Vercel proxy). */
function preferSameOriginUploadPath(path) {
  if (typeof window === "undefined") return null;
  const base = (API_BASE_URL || "").replace(/\/$/, "");
  if (!base) return path;
  try {
    if (new URL(base).origin !== window.location.origin) return path;
  } catch {
    return null;
  }
  return null;
}

function joinUploadPath(path) {
  const rel = path.startsWith("/") ? path : `/${path}`;
  const sameOrigin = preferSameOriginUploadPath(rel);
  if (sameOrigin) return sameOrigin;
  const base = (API_BASE_URL || "").replace(/\/$/, "");
  return `${base}${rel}`;
}

/**
 * Chuẩn hóa URL ảnh/upload từ API (full URL, /uploads/..., hoặc chỉ tên file).
 */
export function resolveMediaUrl(src) {
  const stored = normalizeStoredUploadUrl(src);
  const raw = stored || (typeof src === "string" ? src.trim() : "");
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) {
    // Nâng resolution Google avatar: =s96-c → =s400-c
    let resolved = raw;
    if (/lh\d+\.googleusercontent\.com/i.test(raw)) {
      resolved = raw.replace(/=s\d+(-c)?$/, "=s400-c");
    }
    const uploadsIdx = resolved.indexOf("/uploads/");
    if (uploadsIdx >= 0) {
      const rel = resolved.slice(uploadsIdx);
      const base = (API_BASE_URL || "").replace(/\/$/, "");
      if (base) {
        if (LOCAL_BACKEND.test(resolved)) return `${base}${rel}`;
        return rel.startsWith("/") ? `${base}${rel}` : `${base}/${rel}`;
      }
      return rel;
    }
    const base = (API_BASE_URL || "").replace(/\/$/, "");
    if (base && LOCAL_BACKEND.test(resolved)) {
      const normalized = resolved.replace(LOCAL_BACKEND, base);
      if (typeof window !== "undefined") {
        try {
          const path = new URL(normalized).pathname;
          if (path.startsWith("/uploads/")) {
            const sameOrigin = preferSameOriginUploadPath(path);
            if (sameOrigin) return sameOrigin;
          }
        } catch {
          /* keep normalized */
        }
      }
      return normalized;
    }
    if (typeof window !== "undefined") {
      try {
        const path = new URL(resolved).pathname;
        if (path.startsWith("/uploads/")) {
          const sameOrigin = preferSameOriginUploadPath(path);
          if (sameOrigin) return sameOrigin;
        }
      } catch {
        /* keep raw */
      }
    }
    return resolved;
  }
  if (raw.startsWith("/uploads/")) {
    return joinUploadPath(raw);
  }
  if (raw.startsWith("uploads/")) {
    return joinUploadPath(`/${raw}`);
  }
  if (/\.(png|jpe?g|gif|webp|mov|mp4)$/i.test(raw) || raw.startsWith("file-")) {
    return joinUploadPath(`/uploads/${raw.replace(/^\/+/, "")}`);
  }
  return raw;
}

/** Avatar an toàn: resolve URL + fallback khi rỗng. */
export function avatarSrc(src, fallback = DEFAULT_AVATAR) {
  const url = resolveMediaUrl(src);
  return url || fallback;
}

/** Ảnh/video khóa học — fallback placeholder khi rỗng. */
export function mediaSrc(src, fallback = "") {
  return resolveMediaUrl(src) || fallback;
}
