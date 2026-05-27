/** Banner lý do admin (từ chối duyệt / gỡ marketplace) trên khóa mentor. */
export function mapCourseAdminModerationNote(course) {
  const review = course?.adminReview;
  if (!review?.reason) return null;
  if (course.status === "draft" && review.lastAction === "reject") {
    return { title: "Admin từ chối lần trước", reason: review.reason, tone: "red" };
  }
  if (course.status === "archived" && review.lastAction === "archive") {
    return { title: "Admin đã gỡ khỏi marketplace", reason: review.reason, tone: "amber" };
  }
  return null;
}
