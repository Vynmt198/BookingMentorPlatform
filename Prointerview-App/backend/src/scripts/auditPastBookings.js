/**
 * Kiểm tra booking có ngày/giờ bắt đầu trong quá khứ (so với thời điểm chạy script).
 * Chạy: node src/scripts/auditPastBookings.js
 */
import dotenv from "dotenv";
import mongoose from "mongoose";
import { Booking } from "../models/Booking.js";
import { isBookingSlotInFuture, parseBookingStartMs } from "../utils/bookingSchedule.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/prointerview";

async function main() {
  await mongoose.connect(MONGO_URI);
  const now = Date.now();
  const rows = await Booking.find({})
    .select("date timeSlot status paymentStatus userId mentorId createdAt")
    .lean();

  const past = [];
  const invalid = [];

  for (const b of rows) {
    const ms = parseBookingStartMs(b.date, b.timeSlot);
    if (!Number.isFinite(ms)) {
      invalid.push(b);
      continue;
    }
    if (ms <= now) {
      past.push({ ...b, startMs: ms });
    }
  }

  past.sort((a, b) => b.startMs - a.startMs);

  console.log(`\n=== Audit đặt lịch quá khứ ===`);
  console.log(`Database: ${MONGO_URI.replace(/\/\/[^@]+@/, "//***@")}`);
  console.log(`Thời điểm kiểm tra: ${new Date(now).toLocaleString("vi-VN")}`);
  console.log(`Tổng booking: ${rows.length}`);
  console.log(`Không parse được ngày/giờ: ${invalid.length}`);
  console.log(`Buổi có giờ bắt đầu <= hiện tại: ${past.length}\n`);

  if (past.length > 0) {
    console.log("Chi tiết (tối đa 30 mới nhất trong quá khứ):");
    for (const b of past.slice(0, 30)) {
      const inFuture = isBookingSlotInFuture(b.date, b.timeSlot, now);
      console.log(
        `  - ${b._id} | ${b.date} ${b.timeSlot} | status=${b.status} | payment=${b.paymentStatus} | future=${inFuture}`,
      );
    }
    if (past.length > 30) console.log(`  ... và ${past.length - 30} buổi khác`);
  } else {
    console.log("Không có booking nào có slot bắt đầu trong quá khứ.");
  }

  const futureCount = rows.length - past.length - invalid.length;
  console.log(`\nBuổi slot trong tương lai: ${futureCount}`);
  console.log(
    "\nLưu ý: buổi completed/cancelled trong quá khứ là bình thường (đã diễn ra hoặc seed demo).",
  );
  console.log(
    "Cần xem kỹ buổi pending/confirmed/in_progress có date+timeSlot trong quá khứ — không nên tồn tại.\n",
  );

  const badActive = past.filter((b) =>
    ["pending", "confirmed", "in_progress"].includes(String(b.status || "")),
  );
  console.log(`Buổi ACTIVE (pending/confirmed/in_progress) trong quá khứ: ${badActive.length}`);
  for (const b of badActive.slice(0, 15)) {
    console.log(`  ! ${b._id} | ${b.date} ${b.timeSlot} | ${b.status}`);
  }

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
