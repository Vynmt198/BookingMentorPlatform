import "../config/loadEnv.js";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { connectDatabase } from "../db/connect.js";
import { User } from "../models/User.js";
import { Mentor } from "../models/Mentor.js";

const pwd = "Dev123456";

await connectDatabase(process.env.MONGO_URI);
const hash = await bcrypt.hash(pwd, 10);

for (const email of ["admin@dev.local", "mentor@dev.local", "customer@dev.local"]) {
  const u = await User.findOneAndUpdate(
    { email },
    { $set: { passwordHash: hash, isEmailVerified: true, isActive: true } },
    { new: true },
  );
  console.log(email, u ? `OK role=${u.role}` : "MISSING");
  if (u?.role === "mentor") {
    await Mentor.updateOne(
      { userId: u._id },
      {
        $set: {
          isActive: true,
          available: true,
          isVerified: true,
          "adminReview.status": "approved",
        },
      },
    );
  }
}

async function tryLogin(email) {
  try {
    const res = await fetch("http://127.0.0.1:5001/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: pwd }),
    });
    const body = await res.json().catch(() => ({}));
    console.log(`${email} login`, res.status, body.success, body.user?.role || body.error);
  } catch (e) {
    console.log(`${email} login FAILED`, e.message);
  }
}

await tryLogin("admin@dev.local");
await tryLogin("mentor@dev.local");
await mongoose.disconnect();
