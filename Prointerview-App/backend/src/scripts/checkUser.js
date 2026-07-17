import "../config/loadEnv.js";
import mongoose from "mongoose";
import { connectDatabase } from "../db/connect.js";
import "../models/index.js";
import { User } from "../models/User.js";

async function main() {
  const uri = process.env.MONGO_URI;
  await connectDatabase(uri);

  const emails = ["admin@dev.local", "mentor@dev.local", "customer@dev.local"];
  for (const email of emails) {
    const user = await User.findOne({ email });
    if (user) {
      console.log(`User ${email} exists with role ${user.role}`);
    } else {
      console.log(`User ${email} does NOT exist`);
    }
  }

  const allUsers = await User.find({}, 'email role').limit(20);
  console.log("Top 20 users in DB:");
  allUsers.forEach(u => console.log(` - ${u.email} (${u.role})`));

  await mongoose.disconnect();
}

main().catch(console.error);
