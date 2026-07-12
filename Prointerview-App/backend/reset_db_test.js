import "./src/config/loadEnv.js";
import mongoose from "mongoose";
import { Booking } from "./src/models/Booking.js";
import { Review } from "./src/models/Review.js";
import { Notification } from "./src/models/Notification.js";
import { Payment } from "./src/models/Payment.js";

async function resetTestData() {
  try {
    const MONGO_URI = process.env.MONGO_URI;
    if (!MONGO_URI) {
      console.error("MONGO_URI is missing in .env");
      process.exit(1);
    }

    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB for reset...");

    // Delete bookings
    const bResult = await Booking.deleteMany({});
    console.log(`Deleted ${bResult.deletedCount} bookings.`);

    // Delete reviews
    const rResult = await Review.deleteMany({});
    console.log(`Deleted ${rResult.deletedCount} reviews.`);

    // Delete notifications
    const nResult = await Notification.deleteMany({});
    console.log(`Deleted ${nResult.deletedCount} notifications.`);

    // Delete payments
    const pResult = await Payment.deleteMany({});
    console.log(`Deleted ${pResult.deletedCount} payments.`);

    console.log("Database reset successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Reset failed:", err);
    process.exit(1);
  }
}

resetTestData();
