import { authFetch } from '../utils/mobileAuth';
import { ensureApiBase } from '../utils/api';
import { normalizeStoredUploadUrl } from '../utils/mediaUrl';

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

function guessFileName(asset) {
  if (asset.fileName) return asset.fileName;
  if (asset.name) return asset.name;
  const ext = String(asset.mimeType || asset.type || 'image/jpeg').split('/')[1] || 'jpg';
  return `avatar-${Date.now()}.${ext.replace('jpeg', 'jpg')}`;
}

/**
 * Upload ảnh đại diện — POST /api/upload/avatar (giống web Profile.jsx).
 * @returns {{ success: boolean, url?: string, absoluteUrl?: string, error?: string }}
 */
export async function uploadAvatarImage(asset) {
  if (!asset?.uri) {
    return { success: false, error: 'Không có file ảnh.' };
  }

  if (asset.fileSize && asset.fileSize > MAX_AVATAR_BYTES) {
    return { success: false, error: 'Ảnh tối đa 5MB.' };
  }

  const base = await ensureApiBase();
  if (!base) {
    return { success: false, error: 'Không kết nối được backend.' };
  }

  const formData = new FormData();
  formData.append('file', {
    uri: asset.uri,
    name: guessFileName(asset),
    type: asset.mimeType || asset.type || 'image/jpeg',
  });

  try {
    const res = await authFetch('/api/upload/avatar', {
      method: 'POST',
      body: formData,
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.success) {
      return { success: false, error: body.error || `Upload thất bại (${res.status})` };
    }
    return {
      success: true,
      url: normalizeStoredUploadUrl(body.url) || body.url,
      absoluteUrl: body.absoluteUrl || body.url,
    };
  } catch {
    return { success: false, error: 'Không upload được ảnh. Kiểm tra kết nối mạng.' };
  }
}

/** Upload ảnh check-in meeting — POST /api/upload/meeting-checkin */
export async function uploadMeetingCheckinImage(asset) {
  if (!asset?.uri) {
    return { success: false, error: 'Không có file ảnh.' };
  }

  const base = await ensureApiBase();
  if (!base) {
    return { success: false, error: 'Không kết nối được backend.' };
  }

  const formData = new FormData();
  formData.append('file', {
    uri: asset.uri,
    name: asset.fileName || `checkin-${Date.now()}.jpg`,
    type: asset.mimeType || asset.type || 'image/jpeg',
  });

  try {
    const res = await authFetch('/api/upload/meeting-checkin', {
      method: 'POST',
      body: formData,
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.success) {
      return { success: false, error: body.error || `Upload thất bại (${res.status})` };
    }
    return {
      success: true,
      url: normalizeStoredUploadUrl(body.url) || body.url,
      absoluteUrl: body.absoluteUrl || body.url,
    };
  } catch {
    return { success: false, error: 'Không upload được ảnh check-in.' };
  }
}
