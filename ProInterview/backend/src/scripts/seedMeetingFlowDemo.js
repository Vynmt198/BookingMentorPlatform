/**
 * Seed 7 booking demo, mỗi cái đóng băng ở đúng một bước trong trình tự phòng họp thật:
 * 1) pending (vừa đặt, chưa thanh toán)
 * 2) confirmed + paid (đã xác nhận, chưa tới giờ)
 * 3) confirmed + paid + mentor đã check-in webcam (sắp tới giờ, sẵn sàng vào phòng)
 * 4) in_progress (đang họp, mentor đang ghi chú live)
 * 5) completed, mentor CHƯA gửi tổng kết (trong hạn 3 ngày nhắc nhở)
 * 6) completed + mentorSummary đã gửi — trạng thái học viên thấy card "Nhận xét từ chuyên gia"
 * 7) no_show — mentor không tham gia, hoàn ưu tiên 100%, HV chưa điền STK nhận hoàn
 *
 * Row 7 kèm theo: tăng Mentor.stats.noShowCount + tạo 2 thông báo (HV + mentor), giống hệt
 * side-effect thật của `processBookingNoShow` trong bookingsService.js.
 *
 * Chạy: npm run seed:meeting-flow (từ backend/), yêu cầu đã `npm run seed:users` trước.
 */
import mongoose from "mongoose";
import "../config/loadEnv.js";
import { connectDatabase } from "../db/connect.js";
import "../models/index.js";
import { User } from "../models/User.js";
import { Mentor } from "../models/Mentor.js";
import { Booking } from "../models/Booking.js";
import { Notification } from "../models/Notification.js";
import { createMentorProfileForUser } from "../services/mentorProfileService.js";

const MARK = "MEETING_FLOW_DEMO";

function ddmmyyyy(d) {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

function hhmm(d) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Mốc thời gian tương đối so với hiện tại — dùng để mô phỏng "sắp tới giờ" / "đang diễn ra" / "đã xong". */
function at({ days = 0, hours = 0, minutes = 0 } = {}) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(d.getHours() + hours, d.getMinutes() + minutes, 0, 0);
  return d;
}

async function ensureDevUsers() {
  const [customer, mentorUser] = await Promise.all([
    User.findOne({ email: "customer@dev.local" }),
    User.findOne({ email: "mentor@dev.local" }),
  ]);
  if (!customer || !mentorUser) {
    throw new Error("Thiếu user dev mặc định. Hãy chạy `npm run seed:users` trước.");
  }
  return { customer, mentorUser };
}

async function ensureMentorProfile(mentorUser) {
  let mentor = await Mentor.findOne({ userId: mentorUser._id });
  if (!mentor) {
    await createMentorProfileForUser(mentorUser);
    mentor = await Mentor.findOne({ userId: mentorUser._id });
  }
  if (!mentor) throw new Error("Không thể tạo hồ sơ mentor dev.");
  return mentor;
}

function baseFields({ customerId, mentorId, start, sessionType = "mock_interview" }) {
  const price = 450000;
  const platformFee = Math.round(price * 0.2);
  const vat = Math.round(price * 0.1);
  return {
    userId: customerId,
    mentorId,
    date: ddmmyyyy(start),
    timeSlot: hhmm(start),
    durationMinutes: 60,
    timezone: "Asia/Ho_Chi_Minh",
    sessionType,
    notes: MARK,
    price,
    platformFee,
    vat,
    totalAmount: price + vat,
    paymentMethod: "transfer",
  };
}

function buildRows({ customerId, mentorId }) {
  return [
    {
      label: "1) Vừa đặt lịch — chờ thanh toán",
      doc: {
        ...baseFields({ customerId, mentorId, start: at({ days: 4, hours: 3 }) }),
        status: "pending",
        paymentStatus: "pending",
        paymentRef: "MEETING-FLOW-DEMO-1",
      },
    },
    {
      label: "2) Đã thanh toán, mentor xác nhận — chưa tới giờ",
      doc: {
        ...baseFields({ customerId, mentorId, start: at({ days: 2, hours: 1 }) }),
        status: "confirmed",
        paymentStatus: "paid",
        paymentRef: "MEETING-FLOW-DEMO-2",
        paidAt: at({ days: -1 }),
      },
    },
    {
      label: "3) Sắp tới giờ — mentor đã check-in webcam, sẵn sàng vào phòng",
      doc: {
        ...baseFields({ customerId, mentorId, start: at({ minutes: 10 }) }),
        status: "confirmed",
        paymentStatus: "paid",
        paymentRef: "MEETING-FLOW-DEMO-3",
        paidAt: at({ days: -1 }),
        mentorCheckInAt: at({ minutes: -1 }),
      },
    },
    {
      label: "4) Đang diễn ra (in_progress) — mentor đang ghi chú live trong phòng",
      doc: {
        ...baseFields({ customerId, mentorId, start: at({ minutes: -15 }) }),
        status: "in_progress",
        paymentStatus: "paid",
        paymentRef: "MEETING-FLOW-DEMO-4",
        paidAt: at({ days: -1 }),
        mentorCheckInAt: at({ minutes: -16 }),
        mentorSessionCapture: {
          transcript: "Ứng viên giới thiệu bản thân, 3 năm kinh nghiệm Backend Node.js...",
          questionsAsked: [
            "Kể về 1 dự án bạn tự hào nhất",
            "Xử lý deadlock khi truy vấn DB đồng thời thế nào?",
          ],
          commonMistakes: ["Trả lời dài dòng, chưa đi thẳng vào cấu trúc STAR"],
          keyInsights: ["Nắm chắc kiến thức nền, cần luyện cách trình bày súc tích hơn"],
          updatedAt: at({ minutes: -2 }),
        },
      },
    },
    {
      label: "5) Đã hoàn thành — mentor CHƯA gửi tổng kết (học viên chỉ thấy ghi chú thô)",
      doc: {
        ...baseFields({ customerId, mentorId, start: at({ days: -1, hours: -2 }) }),
        status: "completed",
        paymentStatus: "paid",
        paymentRef: "MEETING-FLOW-DEMO-5",
        paidAt: at({ days: -2 }),
        mentorCheckInAt: at({ days: -1, hours: -2, minutes: -1 }),
        completedAt: at({ days: -1, hours: -1 }),
        mentorNotes: "Buổi phỏng vấn diễn ra tốt, ứng viên trả lời tự tin.",
      },
    },
    {
      label: "6) Đã hoàn thành + mentor đã gửi Tổng kết buổi học (đây là cái bạn hỏi)",
      doc: {
        ...baseFields({ customerId, mentorId, start: at({ days: -3 }) }),
        status: "completed",
        paymentStatus: "paid",
        paymentRef: "MEETING-FLOW-DEMO-6",
        paidAt: at({ days: -4 }),
        mentorCheckInAt: at({ days: -3, minutes: -1 }),
        completedAt: at({ days: -3, hours: 1 }),
        mentorSummary: {
          rating: 4,
          strengths: "Nền tảng kỹ thuật vững, trả lời rõ ràng các câu hỏi về hệ thống phân tán.",
          improvements: "Cần luyện cách trình bày theo cấu trúc STAR để câu trả lời súc tích hơn.",
          recommendation: "Nên thực hành thêm 2-3 buổi mock interview trước khi phỏng vấn thật ở vòng senior.",
          generalNotes: "Ứng viên tiềm năng, thái độ cầu thị. Đề xuất tập trung ôn lại system design.",
          submittedAt: at({ days: -2 }),
          submittedLate: false,
        },
      },
    },
    {
      label: "7) Mentor no-show — hoàn ưu tiên 100%, HỌC VIÊN CHƯA ĐIỀN STK nhận hoàn",
      doc: {
        ...baseFields({ customerId, mentorId, start: at({ days: -1, hours: -2 }) }),
        status: "no_show",
        paymentStatus: "refund_pending",
        paymentRef: "MEETING-FLOW-DEMO-7",
        paidAt: at({ days: -2 }),
        cancelledBy: "mentor",
        cancelReason: "Mentor không tham gia buổi hẹn (no-show).",
        cancelledAt: at({ days: -1, hours: -1, minutes: -45 }),
        noShowBy: "mentor",
        mentorCancelResolution: "no_show_refund",
        mentorCancelResolutionAt: at({ days: -1, hours: -1, minutes: -45 }),
        cancelRefundPercent: 100,
        cancelRefundAmountVnd: 495000,
        cancelRetainedAmountVnd: 0,
      },
    },
  ];
}

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("Thiếu MONGO_URI trong .env");
    process.exit(1);
  }
  await connectDatabase(uri);

  const { customer, mentorUser } = await ensureDevUsers();
  const mentor = await ensureMentorProfile(mentorUser);

  // Xoá thông báo cũ trỏ tới booking demo lần chạy trước — tránh để lại thông báo "mồ côi"
  // trỏ tới bookingId đã bị xoá (đúng bug từng gặp: notification còn, booking đã mất).
  const oldBookingIds = (await Booking.find({ notes: MARK }).select("_id").lean()).map((b) => b._id);
  if (oldBookingIds.length > 0) {
    await Notification.deleteMany({ "metadata.bookingId": { $in: oldBookingIds } });
  }
  await Booking.deleteMany({ notes: MARK });

  const rows = buildRows({ customerId: customer._id, mentorId: mentor._id });
  const inserted = await Booking.insertMany(rows.map((r) => r.doc));

  console.log(`Đã seed ${inserted.length} booking mô phỏng trình tự phòng họp:\n`);
  inserted.forEach((doc, idx) => {
    console.log(`${rows[idx].label}`);
    console.log(`  id: ${doc._id}`);
    console.log(`  http://localhost:5173/#/session/${doc._id}\n`);
  });

  // Row 7 (no_show) — dựng lại side-effect thật của processBookingNoShow: tăng vi phạm mentor
  // + thông báo cho cả học viên lẫn mentor, để test trọn vẹn luồng thay vì chỉ có booking trơ.
  const noShowIdx = rows.findIndex((r) => r.doc.status === "no_show");
  if (noShowIdx >= 0) {
    const noShowBooking = inserted[noShowIdx];
    await Mentor.findByIdAndUpdate(mentor._id, { $inc: { "stats.noShowCount": 1 } });
    await Notification.create({
      userId: customer._id,
      type: "booking_cancelled",
      title: "Mentor không tham gia (no-show)",
      body: `Bạn được hoàn ưu tiên 100% (${noShowBooking.cancelRefundAmountVnd.toLocaleString("vi-VN")}₫). Vui lòng điền STK nhận hoàn trên trang buổi hẹn.`,
      metadata: {
        bookingId: noShowBooking._id,
        actionUrl: `/session/${noShowBooking._id}`,
      },
    });
    await Notification.create({
      userId: mentorUser._id,
      type: "system",
      title: "Ghi nhận no-show",
      body: `No-show buổi ${noShowBooking.date} ${noShowBooking.timeSlot}.`,
      metadata: { bookingId: noShowBooking._id },
    });
    console.log("Đã tăng noShowCount mentor + tạo thông báo no-show cho HV và mentor.\n");
  }

  console.log("Đăng nhập học viên: customer@dev.local / Dev123456");
  console.log("Xem tất cả tại: http://localhost:5173/#/my-bookings");

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error("Seed meeting-flow-demo thất bại:", error?.message || error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
