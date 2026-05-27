/**
 * Chuẩn hóa rating/reviewCount từ API khóa học.
 * Không dùng điểm mặc định (vd. 4.8): khi chưa có đánh giá thì rating = null.
 */
export function normalizeCourseStats(stats) {
  const reviewsCount = Math.max(0, Number(stats?.reviewCount) || 0);
  if (reviewsCount <= 0) {
    return { rating: null, reviewsCount: 0 };
  }
  const raw = stats?.rating;
  const num = typeof raw === "number" ? raw : Number.parseFloat(String(raw ?? ""));
  if (!Number.isFinite(num)) {
    return { rating: null, reviewsCount };
  }
  return { rating: Math.min(5, Math.max(0, num)), reviewsCount };
}
