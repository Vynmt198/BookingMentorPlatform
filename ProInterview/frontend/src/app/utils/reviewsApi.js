import { authFetch } from "./auth";

const jsonHeaders = {
  Accept: "application/json",
  "Content-Type": "application/json",
};

export async function submitReview(payload) {
  try {
    const res = await authFetch("/api/reviews", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, error: data.error || `Lỗi ${res.status}` };
    return { success: true, review: data.review };
  } catch {
    return { success: false, error: "Lỗi kết nối máy chủ" };
  }
}

export async function fetchTargetReviews(targetType, targetId) {
  try {
    const res = await authFetch(
      `/api/reviews?targetType=${encodeURIComponent(targetType)}&targetId=${encodeURIComponent(targetId)}`,
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, error: data.error || `Lỗi ${res.status}` };
    return { success: true, reviews: data.reviews || [] };
  } catch {
    return { success: false, error: "Lỗi kết nối máy chủ" };
  }
}

export async function fetchMyReviewForTarget(targetType, targetId) {
  try {
    const q = new URLSearchParams({ targetType, targetId: String(targetId) });
    const res = await authFetch(`/api/reviews/mine?${q}`, {
      method: "GET",
      headers: jsonHeaders,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, error: data.error || `Lỗi ${res.status}`, hasReview: false };
    return { success: true, hasReview: Boolean(data.hasReview), review: data.review || null };
  } catch {
    return { success: false, error: "Lỗi kết nối máy chủ", hasReview: false };
  }
}

export async function replyToReview(reviewId, content) {
  try {
    const res = await authFetch(`/api/reviews/${encodeURIComponent(reviewId)}/reply`, {
      method: "PATCH",
      headers: jsonHeaders,
      body: JSON.stringify({ content }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, error: data.error || `Lỗi ${res.status}` };
    return { success: true, review: data.review };
  } catch {
    return { success: false, error: "Lỗi kết nối máy chủ" };
  }
}
