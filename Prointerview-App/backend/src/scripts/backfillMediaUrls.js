/**
 * Backfill ảnh trống trong DB để mobile/web hiển thị đúng từ API.
 * - Course.thumbnail trống → Unsplash mặc định
 * - Mentor.avatar trống → lấy User.avatar, nếu vẫn trống → ui-avatars theo tên
 */
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const DEFAULT_COURSE_THUMB =
  "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80";

function avatarForName(name) {
  const seed = encodeURIComponent(String(name || "Mentor").trim() || "Mentor");
  return `https://ui-avatars.com/api/?name=${seed}&background=ede9fe&color=6d28d9&size=256`;
}

await mongoose.connect(process.env.MONGO_URI);

const courses = mongoose.connection.collection("courses");
const mentors = mongoose.connection.collection("mentors");
const users = mongoose.connection.collection("users");

const emptyCourses = await courses
  .find({ $or: [{ thumbnail: "" }, { thumbnail: null }, { thumbnail: { $exists: false } }] })
  .toArray();

let courseUpdated = 0;
for (const course of emptyCourses) {
  await courses.updateOne({ _id: course._id }, { $set: { thumbnail: DEFAULT_COURSE_THUMB } });
  courseUpdated += 1;
}

const mentorDocs = await mentors.find({}).toArray();
let mentorUpdated = 0;
for (const mentor of mentorDocs) {
  if (mentor.avatar) continue;
  let nextAvatar = "";
  if (mentor.userId) {
    const user = await users.findOne(
      { _id: mentor.userId },
      { projection: { avatar: 1, name: 1 } },
    );
    if (user?.avatar) nextAvatar = user.avatar;
    else nextAvatar = avatarForName(mentor.name || user?.name);
  } else {
    nextAvatar = avatarForName(mentor.name);
  }
  await mentors.updateOne({ _id: mentor._id }, { $set: { avatar: nextAvatar } });
  mentorUpdated += 1;
}

console.log(`Updated ${courseUpdated} course thumbnails, ${mentorUpdated} mentor avatars.`);
await mongoose.disconnect();
