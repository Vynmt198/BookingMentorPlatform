import mongoose from "mongoose";
import dotenv from "dotenv";
import { User } from "./src/models/User.js";
import { Mentor } from "./src/models/Mentor.js";
import { Booking } from "./src/models/Booking.js";

dotenv.config();

async function debugBookings() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    const menteeEmail = "vietvanphan04@gmail.com";
    const mentee = await User.findOne({ email: menteeEmail });
    if (!mentee) {
        console.log(`Mentee ${menteeEmail} not found`);
        process.exit(0);
    }

    const bookings = await Booking.find({ userId: mentee._id }).sort({ createdAt: -1 });
    console.log(`Found ${bookings.length} bookings for ${menteeEmail}`);

    for (const b of bookings) {
        const mentor = await Mentor.findById(b.mentorId);
        if (mentor) {
            console.log(`Booking ${b._id}: Mentor Name="${mentor.name}", userId="${mentor.userId}"`);
            
            // Nếu chưa có userId, chúng ta tìm User có email vanpvse182018@fpt.edu.vn và gán vào
            if (!mentor.userId) {
                const mentorUser = await User.findOne({ email: "vanpvse182018@fpt.edu.vn" });
                if (mentorUser) {
                    mentor.userId = mentorUser._id;
                    await mentor.save();
                    console.log(`  -> FIXED: Assigned userId ${mentorUser._id} to Mentor ${mentor.name}`);
                }
            }
        } else {
            console.log(`Booking ${b._id}: Mentor NOT FOUND for mentorId ${b.mentorId}`);
        }
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

debugBookings();
