import { apiUrl } from './api';

/** Lưu DB dạng `/uploads/...` — tránh gắn cứng host/port. */
export function normalizeStoredUploadUrl(url) {
  const raw = String(url ?? '').trim();
  if (!raw) return '';
  const idx = raw.indexOf('/uploads/');
  if (idx >= 0) return raw.slice(idx);
  if (raw.startsWith('uploads/')) return `/${raw}`;
  return raw;
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
      return apiUrl(resolved.slice(uploadsIdx));
    }
    return resolved;
  }

  if (raw.startsWith('/uploads/') || raw.startsWith('uploads/')) {
    const rel = raw.startsWith('/') ? raw : `/${raw}`;
    return apiUrl(rel);
  }

  return raw;
}
