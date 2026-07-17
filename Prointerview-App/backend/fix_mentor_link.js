import mongoose from "mongoose";
import dotenv from "dotenv";
import { User } from "./src/models/User.js";
import { Mentor } from "./src/models/Mentor.js";

dotenv.config();

async function fixMentorData() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    const email = "vanpvse182018@fpt.edu.vn";
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      console.log(`User with email ${email} not found.`);
      process.exit(0);
    }

    console.log(`Found User: ID=${user._id}, Role=${user.role}`);

    // Tìm mentor có cùng tên hoặc đã có userId này
    let mentor = await Mentor.findOne({ userId: user._id });
    
    if (!mentor) {
        console.log("Mentor record not linked to this userId. Searching by name...");
        mentor = await Mentor.findOne({ name: user.name });
    }

    if (mentor) {
      console.log(`Found Mentor record: ID=${mentor._id}, Name=${mentor.name}`);
      mentor.userId = user._id;
      await mentor.save();
      console.log("SUCCESS: Linked Mentor record to User account.");
    } else {
      console.log("No Mentor record found for this user name. Please make sure you have a mentor profile.");
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

fixMentorData();
