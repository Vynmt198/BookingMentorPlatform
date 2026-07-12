import mongoose from "mongoose";
import { Booking } from "../models/Booking.js";
import { Mentor } from "../models/Mentor.js";
import { Notification } from "../models/Notification.js";
import { deliverNotification } from "../services/notificationDeliveryService.js";
import { parseBookingStartMs } from "../utils/bookingSchedule.js";

const WINDOW_MS_MIN = 50 * 60 * 1000;
const WINDOW_MS_MAX = 70 * 60 * 1000;
const DEDUP_HOURS = 3;

let intervalHandle = null;

async function alreadyReminded(userId, bookingId) {
  const since = new Date(Date.now() - DEDUP_HOURS * 60 * 60 * 1000);
  const hit = await Notification.findOne({
    userId,
    type: "booking_reminder",
    "metadata.bookingId": new mongoose.Types.ObjectId(String(bookingId)),
    createdAt: { $gte: since },
  })
    .select("_id")
    .lean();
  return Boolean(hit);
}

async function runBookingReminders() {
  if (mongoose.connection.readyState !== 1) return;

  const bookings = await Booking.find({
    status: { $in: ["confirmed", "in_progress", "pending"] },
    paymentStatus: { $in: ["paid", "pending"] },
  })
    .select("_id userId mentorId date timeSlot status paymentStatus")
    .lean();

  const now = Date.now();
  for (const b of bookings) {
    const startMs = parseBookingStartMs(b.date, b.timeSlot);
    if (!Number.isFinite(startMs)) continue;
    const diff = startMs - now;
    if (diff < WINDOW_MS_MIN || diff > WINDOW_MS_MAX) continue;
    if (b.status === "pending" && b.paymentStatus !== "paid") continue;

    const mentor = await Mentor.findById(b.mentorId).select("userId").lean();
    const slotLabel = `${b.date} ${b.timeSlot}`;
    const meta = {
      bookingId: b._id,
      actionUrl: `/mentor/meeting-detail/${b._id}`,
    };

    if (mentor?.userId) {
      const mid = String(mentor.userId);
      if (!(await alreadyReminded(mid, b._id))) {
        await deliverNotification(mid, {
          mentorPrefKey: "session_reminder",
          type: "booking_reminder",
          title: "Buổi mentor sắp bắt đầu",
          body: `Nhắc: buổi hẹn lúc ${slotLabel} (khoảng 1 giờ nữa).`,
          metadata: { ...meta, actionUrl: `/mentor/meeting-detail/${b._id}` },
        });
      }
    }

    const cid = String(b.userId || "");
    if (cid && mongoose.isValidObjectId(cid)) {
      if (!(await alreadyReminded(cid, b._id))) {
        await deliverNotification(cid, {
          customerPrefKey: "interview_reminder",
          type: "booking_reminder",
          title: "Nhắc buổi mentor",
          body: `Buổi hẹn của bạn lúc ${slotLabel} sẽ bắt đầu trong khoảng 1 giờ.`,
          metadata: { bookingId: b._id, actionUrl: `/session/${b._id}` },
        });
      }
    }
  }
}

/** Chạy mỗi 5 phút khi server đã kết nối MongoDB */
export function startBookingReminderJob() {
  if (intervalHandle) return;
  const tick = () => {
    runBookingReminders().catch((e) =>
      console.error("[bookingReminderJob]", e?.message || e),
    );
  };
  tick();
  intervalHandle = setInterval(tick, 5 * 60 * 1000);
}
