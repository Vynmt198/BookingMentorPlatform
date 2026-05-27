import "../config/loadEnv.js";
import { connectDatabase } from "../db/connect.js";
import { Course } from "../models/Course.js";
import mongoose from "mongoose";

async function main() {
  await connectDatabase(process.env.MONGO_URI);
  const courses = await Course.find({}, "title thumbnail status modules");
  console.log(JSON.stringify(courses, null, 2));
  await mongoose.disconnect();
}


main().catch(console.error);
