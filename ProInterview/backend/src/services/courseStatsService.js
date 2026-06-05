import mongoose from "mongoose";
import { Course } from "../models/Course.js";
import { Enrollment } from "../models/Enrollment.js";
import { Review } from "../models/Review.js";

/** Tăng số ghi danh đã thanh toán trên khóa (gọi khi enrollment chuyển sang paid). */
export async function incrementCourseEnrollmentCount(courseId, session) {
  if (!courseId || !mongoose.isValidObjectId(String(courseId))) return;
  const opts = session ? { session } : {};
  await Course.updateOne({ _id: courseId }, { $inc: { "stats.enrollmentCount": 1 } }, opts);
}

/** Đếm ghi danh paid thực tế — dùng cho admin / đồng bộ số liệu cũ. */
export async function countPaidEnrollmentsByCourseIds(courseIds) {
  const ids = (courseIds || []).filter((id) => mongoose.isValidObjectId(String(id)));
  if (!ids.length) return new Map();

  const oids = ids.map((id) => new mongoose.Types.ObjectId(String(id)));
  const rows = await Enrollment.aggregate([
    { $match: { courseId: { $in: oids }, paymentStatus: "paid" } },
    { $group: { _id: "$courseId", count: { $sum: 1 } } },
  ]);

  const map = new Map();
  for (const row of rows) {
    map.set(String(row._id), Number(row.count) || 0);
  }
  return map;
}

export function applyPaidEnrollmentCountsToCourses(courses, countMap) {
  return (courses || []).map((course) => {
    const paid = countMap.get(String(course._id));
    const enrollmentCount =
      paid !== undefined ? paid : Number(course.stats?.enrollmentCount ?? 0);
    return {
      ...course,
      stats: {
        ...(course.stats || {}),
        enrollmentCount,
      },
    };
  });
}

export const applyPaidEnrollmentCountsToAdminCourses = applyPaidEnrollmentCountsToCourses;

/** Tổng hợp số liệu chỉ trên khóa học của mentor đang đăng nhập (không gộp mentor khác). */
export async function buildMentorCourseListSummary(courses) {
  const active = (courses || []).filter((c) => c.status !== "archived");
  const courseIds = active.map((c) => c._id).filter((id) => mongoose.isValidObjectId(String(id)));

  let totalStudents = 0;
  if (courseIds.length) {
    const oids = courseIds.map((id) => new mongoose.Types.ObjectId(String(id)));
    const uniqueRows = await Enrollment.aggregate([
      { $match: { courseId: { $in: oids }, paymentStatus: "paid" } },
      { $group: { _id: "$userId" } },
      { $count: "total" },
    ]);
    totalStudents = Number(uniqueRows[0]?.total) || 0;
  }

  let avgRating = null;
  let reviewCount = 0;
  if (courseIds.length) {
    const oids = courseIds.map((id) => new mongoose.Types.ObjectId(String(id)));
    const reviews = await Review.find({
      targetType: "course",
      targetId: { $in: oids },
      isVisible: { $ne: false },
    })
      .select("rating")
      .lean();
    reviewCount = reviews.length;
    if (reviewCount > 0) {
      avgRating = Number(
        (reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / reviewCount).toFixed(1),
      );
    } else {
      const ratedCourses = active.filter(
        (c) => Number(c.stats?.reviewCount) > 0 && Number(c.stats?.rating) > 0,
      );
      const totalWeightedReviews = ratedCourses.reduce(
        (sum, c) => sum + Number(c.stats.reviewCount),
        0,
      );
      if (totalWeightedReviews > 0) {
        const weightedSum = ratedCourses.reduce(
          (sum, c) => sum + Number(c.stats.rating) * Number(c.stats.reviewCount),
          0,
        );
        avgRating = Number((weightedSum / totalWeightedReviews).toFixed(1));
        reviewCount = totalWeightedReviews;
      }
    }
  }

  return {
    scope: "mentor",
    totalCourses: active.length,
    totalStudents,
    avgRating,
    reviewCount,
  };
}
