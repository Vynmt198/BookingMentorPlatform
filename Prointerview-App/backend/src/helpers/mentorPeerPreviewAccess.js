import { Mentor } from "../models/Mentor.js";
import { User } from "../models/User.js";

const PEER_REVIEWABLE_STATUSES = new Set(["published", "pending_update"]);

/** Mentor (không phải chủ khóa) được xem read-only nội dung bài để đánh giá chéo. */
export async function mentorCanPeerPreviewCourse(userId, course) {
  if (!userId || !course?.mentorId) return false;

  const user = await User.findById(userId).select("role").lean();
  if (user?.role !== "mentor") return false;

  const reviewerMentor = await Mentor.findOne({ userId }).select("_id").lean();
  if (!reviewerMentor?._id) return false;
  if (String(course.mentorId) === String(reviewerMentor._id)) return false;
  if (!PEER_REVIEWABLE_STATUSES.has(String(course.status || ""))) return false;

  return true;
}
