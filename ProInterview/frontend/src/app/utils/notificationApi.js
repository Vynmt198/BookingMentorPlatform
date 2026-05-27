import { authFetch, hasAuthCredentials } from "./auth.js";

const jsonHeaders = {
  Accept: "application/json",
  "Content-Type": "application/json",
};

export async function fetchNotifications() {
  if (!hasAuthCredentials()) return { success: false, notifications: [] };
  try {
    const res = await authFetch("/api/notifications", {
      method: "GET",
      headers: { ...jsonHeaders },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        success: false,
        notifications: [],
        error: body.error || `Lỗi ${res.status}`,
      };
    }
    return { success: true, notifications: body.notifications || [] };
  } catch {
    return { success: false, notifications: [], error: "Lỗi kết nối khi tải thông báo." };
  }
}

export async function markNotificationAsRead(id) {
  if (!hasAuthCredentials()) return { success: false, error: "Chưa đăng nhập." };
  try {
    const res = await authFetch(`/api/notifications/${id}/read`, {
      method: "PATCH",
      headers: { ...jsonHeaders },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, error: body.error || `Lỗi ${res.status}` };
    return { success: true };
  } catch {
    return { success: false, error: "Lỗi kết nối khi đánh dấu đã đọc." };
  }
}

export async function markAllNotificationsRead() {
  if (!hasAuthCredentials()) return { success: false, error: "Chưa đăng nhập." };
  try {
    const res = await authFetch("/api/notifications/read-all", {
      method: "POST",
      headers: { ...jsonHeaders },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, error: body.error || `Lỗi ${res.status}` };
    return { success: true };
  } catch {
    return { success: false, error: "Lỗi kết nối khi đánh dấu đã đọc tất cả." };
  }
}
