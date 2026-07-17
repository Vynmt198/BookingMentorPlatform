import "../config/loadEnv.js";
import mongoose from "mongoose";
import { connectDatabase } from "../db/connect.js";
import "../models/index.js";
import { Course } from "../models/Course.js";

async function main() {
  const uri = process.env.MONGO_URI;
  await connectDatabase(uri);

  const courses = await Course.find({ thumbnail: { $ne: "" } });
  const baseUrl = process.env.BACKEND_URL || "http://localhost:5000";

  for (const course of courses) {
    if (course.thumbnail && !course.thumbnail.startsWith("http")) {
      const oldThumbnail = course.thumbnail;
      course.thumbnail = `${baseUrl}/uploads/${oldThumbnail}`;
      await course.save();
      console.log(`Updated thumbnail for ${course.title}: ${oldThumbnail} -> ${course.thumbnail}`);
    } else if (!course.thumbnail) {
      course.thumbnail = "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80";
      await course.save();
      console.log(`Set default thumbnail for ${course.title}`);
    }
  }

  await mongoose.disconnect();
}

main().catch(console.error);
