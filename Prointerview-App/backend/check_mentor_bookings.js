import mongoose from "mongoose";
import dotenv from "dotenv";
import { Booking } from "./src/models/Booking.js";
import { Mentor } from "./src/models/Mentor.js";
import { User } from "./src/models/User.js";

dotenv.config();

async function checkMentorBookings() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    const mentor = await Mentor.findOne({ name: /PHAN VIET VAN/i });
    if (!mentor) {
        console.log("Mentor not found");
        process.exit(0);
    }

    const bookings = await Booking.find({ mentorId: mentor._id }).populate("userId");
    console.log(`Found ${bookings.length} bookings for mentor ${mentor.name}`);

    for (const b of bookings) {
        console.log(`Booking ${b._id}:`);
        console.log(`  - Mentee ID: ${b.userId?._id}`);
        console.log(`  - Mentee Name: "${b.userId?.name}"`);
        console.log(`  - Mentee Email: "${b.userId?.email}"`);
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkMentorBookings();
