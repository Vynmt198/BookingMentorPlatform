import "./src/config/loadEnv.js";
import mongoose from "mongoose";
import { User } from "./src/models/User.js";
import { Booking } from "./src/models/Booking.js";
import { Mentor } from "./src/models/Mentor.js";

async function createCompletedBooking() {
  try {
    const MONGO_URI = process.env.MONGO_URI;
    await mongoose.connect(MONGO_URI);
    
    const email = "vietvanphan04@gmail.com";
    const user = await User.findOne({ email });
    if (!user) {
      console.error(`User with email ${email} not found.`);
      process.exit(1);
    }

    const mentor = await Mentor.findOne({ isActive: true, isVerified: true });
    if (!mentor) {
      console.error("No active/verified mentor found.");
      process.exit(1);
    }

    const bookingData = {
      userId: user._id,
      mentorId: mentor._id,
      date: "Thứ Bảy, 16/05",
      timeSlot: "15:00",
      durationMinutes: 60,
      timezone: "Asia/Ho_Chi_Minh",
      sessionType: "mock_interview",
      position: "Senior Frontend Engineer",
      notes: "Buổi phỏng vấn mẫu để test feedback",
      status: "completed", // Set to COMPLETED
      price: 500000,
      platformFee: 50000,
      vat: 55000,
      totalAmount: 605000,
      paymentStatus: "paid",
      paymentMethod: "transfer",
      completedAt: new Date(),
      createdAt: new Date(Date.now() - 86400000)
    };

    const booking = await Booking.create(bookingData);
    console.log(`Successfully created COMPLETED booking for ${email}. ID: ${booking._id}`);
    
    process.exit(0);
  } catch (err) {
    console.error("Failed to create completed booking:", err);
    process.exit(1);
  }
}

createCompletedBooking();
