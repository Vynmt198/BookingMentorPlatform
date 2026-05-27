import "./src/config/loadEnv.js";
import mongoose from "mongoose";
import { User } from "./src/models/User.js";
import { Booking } from "./src/models/Booking.js";
import { Mentor } from "./src/models/Mentor.js";

async function recreateBooking() {
  try {
    const MONGO_URI = process.env.MONGO_URI;
    await mongoose.connect(MONGO_URI);
    
    const email = "vietvanphan04@gmail.com";
    const user = await User.findOne({ email });
    if (!user) {
      console.error(`User with email ${email} not found.`);
      process.exit(1);
    }

    // Find a mentor to assign to
    const mentor = await Mentor.findOne({ isActive: true, isVerified: true });
    if (!mentor) {
      console.error("No active/verified mentor found to assign the booking to.");
      process.exit(1);
    }

    const bookingData = {
      userId: user._id,
      mentorId: mentor._id,
      date: "Thứ Hai, 18/05",
      timeSlot: "09:00",
      durationMinutes: 60,
      timezone: "Asia/Ho_Chi_Minh",
      sessionType: "mock_interview",
      position: "Frontend Developer",
      notes: "Test lại luồng đánh giá sau khi reset DB",
      status: "pending", 
      price: 350000,
      platformFee: 35000,
      vat: 38500,
      totalAmount: 423500,
      paymentStatus: "pending",
      paymentMethod: "transfer", // Corrected
      createdAt: new Date()
    };

    const booking = await Booking.create(bookingData);
    console.log(`Successfully recreated pending booking for ${email}. ID: ${booking._id}`);
    
    process.exit(0);
  } catch (err) {
    console.error("Failed to recreate booking:", err);
    process.exit(1);
  }
}

recreateBooking();
