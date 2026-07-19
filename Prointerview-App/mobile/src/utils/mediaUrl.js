import { apiUrl, getApiBaseUrl } from './api';
import { resolveConfiguredApiBase, getConfiguredApiBase } from '../config/apiConfig';

const LOCAL_BACKEND = /^https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?/i;

function mediaBase() {
  return (
    getApiBaseUrl() ||
    resolveConfiguredApiBase() ||
    getConfiguredApiBase() ||
    ''
  ).replace(/\/$/, '');
}

/** Lưu DB dạng `/uploads/...` — tránh gắn cứng host/port. */
export function normalizeStoredUploadUrl(url) {
  const raw = String(url ?? '').trim();
  if (!raw) return '';
  const idx = raw.indexOf('/uploads/');
  if (idx >= 0) return raw.slice(idx);
  if (raw.startsWith('uploads/')) return `/${raw}`;
  return raw;
}

function joinUploadPath(rel) {
  const path = rel.startsWith('/') ? rel : `/${rel}`;
  const base = mediaBase();
  if (base) return `${base}${path}`;
  return apiUrl(path);
}

/** Chuẩn hóa URL ảnh/upload từ API cho Image source. */
export function resolveMediaUrl(src) {
  const stored = normalizeStoredUploadUrl(src);
  const raw = stored || (typeof src === 'string' ? src.trim() : '');
  if (!raw) return '';

  if (/^https?:\/\//i.test(raw)) {
    let resolved = raw;
    if (/lh\d+\.googleusercontent\.com/i.test(raw)) {
      resolved = raw.replace(/=s\d+(-c)?$/, '=s400-c');
    }

    const uploadsIdx = resolved.indexOf('/uploads/');
    if (uploadsIdx >= 0) {
      return joinUploadPath(resolved.slice(uploadsIdx));
    }

    if (LOCAL_BACKEND.test(resolved)) {
      const base = mediaBase();
      if (base) return resolved.replace(LOCAL_BACKEND, base);
    }

    return resolved;
  }

  if (raw.startsWith('/uploads/') || raw.startsWith('uploads/')) {
    const rel = raw.startsWith('/') ? raw : `/${raw}`;
    return joinUploadPath(rel);
  }

  if (/\.(png|jpe?g|gif|webp|mov|mp4)$/i.test(raw) || raw.startsWith('file-')) {
    return joinUploadPath(`/uploads/${raw.replace(/^\/+/, '')}`);
  }

  return raw;
}

export function mentorAvatarFallback(name) {
  const seed = encodeURIComponent(String(name || 'Mentor').trim() || 'Mentor');
  return `https://ui-avatars.com/api/?name=${seed}&background=ede9fe&color=6d28d9&size=256`;
}

export const DEFAULT_COURSE_THUMB =
  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80';
