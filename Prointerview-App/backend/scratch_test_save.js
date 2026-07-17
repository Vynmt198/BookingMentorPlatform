import mongoose from "mongoose";
import dotenv from "dotenv";
import { User } from "./src/models/User.js";
import bcrypt from "bcrypt";

dotenv.config();

async function testSave() {
  const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/prointerview";
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to", MONGO_URI);

    const testEmail = `test_${Date.now()}@example.com`;
    const passwordHash = await bcrypt.hash("password123", 10);
    
    const newUser = await User.create({
      name: "Test User",
      email: testEmail,
      passwordHash: passwordHash,
      role: "customer"
    });

    console.log("User created successfully:", newUser._id);
    
    const found = await User.findById(newUser._id);
    console.log("Verified in DB:", found ? "Found" : "NOT FOUND");

    await mongoose.disconnect();
  } catch (err) {
    console.error("Error during test:", err);
  }
}

testSave();
