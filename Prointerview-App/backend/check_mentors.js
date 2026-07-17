import mongoose from "mongoose";
import dotenv from "dotenv";
import { Mentor } from "./src/models/Mentor.js";

dotenv.config();

async function checkMentors() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    const mentors = await Mentor.find({});
    console.log(`Found ${mentors.length} mentors:`);

    for (const m of mentors) {
        console.log(`- ID: ${m._id}, Name: "${m.name}", Title: "${m.title}", UserId: ${m.userId}`);
        
        // Sửa nếu tên là "Học viên" hoặc rỗng
        if (m.name === "Học viên" || !m.name) {
            console.log(`  -> Detected incorrect name. Attempting to fix...`);
            // Ở đây bạn có thể cập nhật tên đúng nếu biết, hoặc tôi sẽ tạm sửa thành tên từ User
            const { User } = await import("./src/models/User.js");
            const user = await User.findById(m.userId);
            if (user) {
                m.name = user.name;
                await m.save();
                console.log(`  -> FIXED: Updated name to "${user.name}"`);
            }
        }
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkMentors();
