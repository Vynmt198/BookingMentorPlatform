import mongoose from "mongoose";
import { Course } from "../models/Course.js";
import { Enrollment } from "../models/Enrollment.js";

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
