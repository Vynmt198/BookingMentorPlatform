/**
 * Seed dữ liệu demo để test luồng: khóa mentor → buổi hẹn đã trả tiền bị hủy + hoàn tiền.
 *
 * Tạo 1 mentor, 2 học viên và 6 buổi hẹn phủ đủ các nhánh của
 * `mentorSuspensionRefundService` — gồm cả những buổi PHẢI KHÔNG bị đụng tới, để phát hiện
 * trường hợp hủy nhầm.
 *
 * Chạy:  npm run seed:suspend-demo
 *        npm run seed:suspend-demo -- --clean    (xóa sạch dữ liệu demo)
 *
 * Idempotent: chạy nhiều lần không nhân bản (xóa demo cũ trước khi tạo mới).
 */
import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcrypt";

import { User } from "../models/User.js";
import { Mentor } from "../models/Mentor.js";
import { Booking } from "../models/Booking.js";
import { Payment } from "../models/Payment.js";
import { Notification } from "../models/Notification.js";

const PASSWORD = "Dev123456";
const MENTOR_EMAIL = "mentor.suspend@dev.local";
const STUDENT_EMAILS = ["student.refund@dev.local", "student.refund2@dev.local"];
const DEMO_REF_PREFIX = "SUSPDEMO";

const isClean = process.argv.includes("--clean");

const iso = (offsetDays) => new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);

/** Buổi hẹn demo. `shouldRefund` = kỳ vọng sau khi khóa mentor. */
const BOOKINGS = [
  { key: "mai",        date: iso(1),  timeSlot: "09:00", amount: 1_000_000, status: "confirmed",   paymentStatus: "paid",    shouldRefund: true,  note: "Đã trả tiền, ngày mai" },
  { key: "homnay",     date: iso(0),  timeSlot: "14:00", amount: 1_500_000, status: "confirmed",   paymentStatus: "paid",    shouldRefund: true,  note: "Đã trả tiền, HÔM NAY (dễ bị bỏ sót)" },
  { key: "tuansau",    date: iso(7),  timeSlot: "10:00", amount:   800_000, status: "pending",     paymentStatus: "paid",    shouldRefund: true,  note: "Đã trả tiền, chờ mentor xác nhận" },
  { key: "chuatra",    date: iso(3),  timeSlot: "16:00", amount: 1_200_000, status: "pending",     paymentStatus: "pending", shouldRefund: false, note: "CHƯA thanh toán → không hoàn" },
  { key: "daqua",      date: iso(-5), timeSlot: "09:00", amount: 1_000_000, status: "confirmed",   paymentStatus: "paid",    shouldRefund: false, note: "Đã qua → không đụng" },
  { key: "hoanthanh",  date: iso(-9), timeSlot: "11:00", amount: 2_000_000, status: "completed",   paymentStatus: "paid",    shouldRefund: false, note: "Đã hoàn thành → không đụng" },
];

async function cleanDemo() {
  const users = await User.find({ email: { $in: [MENTOR_EMAIL, ...STUDENT_EMAILS] } }).select("_id").lean();
  const userIds = users.map((u) => u._id);
  const mentors = await Mentor.find({ userId: { $in: userIds } }).select("_id").lean();
  const mentorIds = mentors.map((m) => m._id);

  const bookings = await Booking.find({ mentorId: { $in: mentorIds } }).select("_id").lean();
  const bookingIds = bookings.map((b) => b._id);

  const r = {
    payments: (await Payment.deleteMany({ $or: [{ referenceId: { $in: bookingIds } }, { providerRef: new RegExp(`^${DEMO_REF_PREFIX}`) }] })).deletedCount,
    bookings: (await Booking.deleteMany({ _id: { $in: bookingIds } })).deletedCount,
    notifications: (await Notification.deleteMany({ userId: { $in: userIds } })).deletedCount,
    mentors: (await Mentor.deleteMany({ _id: { $in: mentorIds } })).deletedCount,
    users: (await User.deleteMany({ _id: { $in: userIds } })).deletedCount,
  };
  return r;
}

async function main() {
  if (!process.env.MONGO_URI) {
    console.error("Thiếu MONGO_URI trong backend/.env");
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI);
  console.log(`DB: ${mongoose.connection.name}\n`);

  const removed = await cleanDemo();
  if (isClean) {
    console.log("Đã xóa dữ liệu demo:", JSON.stringify(removed));
    await mongoose.disconnect();
    return;
  }

  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  // User role mentor → hook post("save") tự tạo hồ sơ Mentor, nên upsert chứ không create.
  const mentorUser = await User.create({
    email: MENTOR_EMAIL, name: "Trần Bảo Long (demo khóa)", role: "mentor",
    isActive: true, isEmailVerified: true, passwordHash,
  });
  const mentor = await Mentor.findOneAndUpdate(
    { userId: mentorUser._id },
    {
      $set: {
        name: "Trần Bảo Long (demo khóa)",
        title: "Senior Backend Engineer",
        company: "Demo Corp",
        pricePerHour: 1_000_000,
        bio: "Hồ sơ demo để test luồng khóa mentor và hoàn tiền cho học viên.",
        status: "active", isActive: true, available: true, isVerified: true,
        verifiedAt: new Date(),
        "adminReview.status": "approved",
        finance: {
          availableBalance: 2_400_000,
          clearingBalance: 900_000,
          pendingBalance: 0,
          totalEarned: 3_300_000,
          bankAccounts: [
            { bankName: "TPBank", accountNumber: "0987654321", accountName: "TRAN BAO LONG", isDefault: true },
          ],
        },
      },
    },
    { new: true, upsert: true },
  );

  const students = [];
  for (const [i, email] of STUDENT_EMAILS.entries()) {
    students.push(
      await User.create({
        email, name: `Học viên Demo ${i + 1}`, role: "customer",
        isActive: true, isEmailVerified: true, passwordHash,
      }),
    );
  }

  const created = [];
  for (const [i, spec] of BOOKINGS.entries()) {
    const student = students[i % students.length];
    const booking = await Booking.create({
      userId: student._id,
      mentorId: mentor._id,
      date: spec.date,
      timeSlot: spec.timeSlot,
      durationMinutes: 60,
      timezone: "Asia/Ho_Chi_Minh",
      sessionType: "mock_interview",
      notes: `[DEMO] ${spec.note}`,
      status: spec.status,
      price: spec.amount,
      platformFee: Math.round(spec.amount * 0.3),
      vat: 0,
      totalAmount: spec.amount,
      paymentStatus: spec.paymentStatus,
      paymentMethod: "transfer",
      paymentRef: `PI${100000 + i}`,
      paidAt: spec.paymentStatus === "paid" ? new Date() : undefined,
      completedAt: spec.status === "completed" ? new Date() : undefined,
    });

    // Ledger chỉ tạo cho buổi đã thanh toán — luồng hoàn tiền đọc từ đây.
    if (spec.paymentStatus === "paid") {
      await Payment.create({
        userId: student._id,
        type: "booking",
        referenceId: booking._id,
        referenceModel: "Booking",
        amount: spec.amount,
        provider: "transfer",
        providerRef: `${DEMO_REF_PREFIX}-${i}-${booking._id}`,
        status: "success",
        paidAt: new Date(),
      });
    }
    created.push({ ...spec, id: booking._id, student: student.email });
  }

  const willRefund = created.filter((b) => b.shouldRefund);
  const totalRefund = willRefund.reduce((s, b) => s + b.amount, 0);

  console.log("╔══ ĐÃ TẠO DỮ LIỆU DEMO ══════════════════════════════════════════╗");
  console.log(`  Mentor  : ${MENTOR_EMAIL}  /  ${PASSWORD}`);
  console.log(`            mentorId = ${mentor._id}`);
  console.log(`            userId   = ${mentorUser._id}`);
  console.log(`  Học viên: ${STUDENT_EMAILS.join("  |  ")}   /  ${PASSWORD}`);
  console.log("╠══ BUỔI HẸN ═════════════════════════════════════════════════════╣");
  for (const b of created) {
    const mark = b.shouldRefund ? "→ SẼ HOÀN " : "   giữ nguyên";
    console.log(`  ${mark} ${b.date} ${b.timeSlot}  ${String(b.amount).padStart(9)}đ  ${b.status}/${b.paymentStatus}  — ${b.note}`);
  }
  console.log("╠═════════════════════════════════════════════════════════════════╣");
  console.log(`  Kỳ vọng khi khóa mentor: hủy ${willRefund.length} buổi, hoàn ${totalRefund.toLocaleString("vi-VN")}đ`);
  console.log("╚═════════════════════════════════════════════════════════════════╝\n");
  console.log("CÁCH TEST:");
  console.log("  1. Đăng nhập admin → /admin/mentors → tìm 'Trần Bảo Long (demo khóa)'");
  console.log("  2. Bấm Khóa → modal phải hiện: 3 buổi sẽ hủy, 3.300.000đ phải hoàn,");
  console.log("     cùng số dư cố vấn (khả dụng 2.400.000đ, đang giữ 900.000đ)");
  console.log("  3. Xác nhận → đăng nhập bằng học viên, xem thông báo hoàn tiền");
  console.log("  4. Quay lại admin → /admin/transactions để xác nhận đã chuyển khoản hoàn");
  console.log("  5. Đăng nhập mentor: vẫn vào được, xem/rút được tiền, nhưng không thêm được lịch rảnh\n");
  console.log("Xóa dữ liệu demo:  npm run seed:suspend-demo -- --clean");

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
