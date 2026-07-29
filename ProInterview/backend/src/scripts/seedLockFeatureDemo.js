/**
 * Dựng môi trường test đầy đủ cho chức năng KHÓA NGƯỜI DÙNG.
 *
 * Ghi vào một database RIÊNG (mặc định `prointerview_locktest`) và xóa sạch nó trước khi tạo lại,
 * nên không đụng tới dữ liệu dev thật trong `prointerview`.
 *
 * Chạy:  npm run seed:lock-test
 *        LOCKTEST_DB=tên_khác npm run seed:lock-test
 *
 * Sau khi chạy, đổi MONGO_URI trong backend/.env sang DB test rồi khởi động lại backend.
 */
import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcrypt";

const PASSWORD = "Dev123456";
const DB_NAME = process.env.LOCKTEST_DB || "prointerview_locktest";

const iso = (d) => new Date(Date.now() + d * 86_400_000).toISOString().slice(0, 10);
const dt = (d) => new Date(Date.now() + d * 86_400_000);

function baseUri() {
  const raw = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/prointerview";
  return raw.replace(/\/[^/?]*(\?|$)/, `/${DB_NAME}$1`);
}

async function main() {
  const uri = baseUri();
  await mongoose.connect(uri);
  console.log(`DB test: ${mongoose.connection.name}`);

  // DB riêng nên xóa sạch là an toàn — mỗi lần chạy có môi trường tinh khôi.
  await mongoose.connection.dropDatabase();
  console.log("Đã xóa sạch DB test.\n");

  const { User } = await import("../models/User.js");
  const { Mentor } = await import("../models/Mentor.js");
  const { Booking } = await import("../models/Booking.js");
  const { Course } = await import("../models/Course.js");
  const { Enrollment } = await import("../models/Enrollment.js");
  const { Payment } = await import("../models/Payment.js");
  const { PayoutRequest } = await import("../models/PayoutRequest.js");

  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const mkUser = (email, name, role, extra = {}) =>
    User.create({ email, name, role, isActive: true, isEmailVerified: true, passwordHash, ...extra });

  // ── Tài khoản chính ───────────────────────────────────────────────────────
  const admin = await mkUser("admin@lock.test", "Quản trị viên", "admin");
  const admin2 = await mkUser("admin2@lock.test", "Quản trị viên 2", "admin");

  const plainUser = await mkUser("customer.plain@lock.test", "Khách hàng thường", "customer");

  const studentPro = await mkUser("student.pro@lock.test", "Học viên gói Pro", "customer", {
    plan: "professional",
    planExpiresAt: dt(60),
    quota: { cvAnalysisUsed: 4, cvAnalysisLimit: 999 },
  });
  const student2 = await mkUser("student2@lock.test", "Học viên 2", "customer");

  // ── Mentor "đầy đủ": có tiền, có buổi hẹn, có khóa học, có yêu cầu rút ────
  const mentorFullUser = await mkUser("mentor.full@lock.test", "Lê Minh Quân", "mentor");
  const mentorFull = await Mentor.findOneAndUpdate(
    { userId: mentorFullUser._id },
    {
      $set: {
        name: "Lê Minh Quân", title: "Senior Backend Engineer", company: "Tech Corp",
        pricePerHour: 1_000_000, bio: "Mentor có đầy đủ tiền và lịch hẹn để test khóa tài khoản.",
        status: "active", isActive: true, available: true, isVerified: true, verifiedAt: new Date(),
        "adminReview.status": "approved",
        finance: {
          availableBalance: 2_000_000,
          clearingBalance: 1_400_000,
          pendingBalance: 500_000,
          totalEarned: 3_900_000,
          bankAccounts: [
            { bankName: "TPBank", accountNumber: "0987654321", accountName: "LE MINH QUAN", isDefault: true },
            { bankName: "Vietcombank", accountNumber: "1023456789", accountName: "LE MINH QUAN", isDefault: false },
          ],
        },
      },
    },
    { new: true, upsert: true },
  );

  // ── Mentor "sạch nợ": số dư 0, không buổi hẹn → đóng tài khoản được ───────
  const mentorCleanUser = await mkUser("mentor.clean@lock.test", "Phạm Thu Hà", "mentor");
  const mentorClean = await Mentor.findOneAndUpdate(
    { userId: mentorCleanUser._id },
    {
      $set: {
        name: "Phạm Thu Hà", title: "Product Designer", company: "Studio X",
        pricePerHour: 700_000, bio: "Mentor sạch nợ — dùng để test đóng tài khoản thành công.",
        status: "active", isActive: true, available: true, isVerified: true, verifiedAt: new Date(),
        "adminReview.status": "approved",
        finance: { availableBalance: 0, clearingBalance: 0, pendingBalance: 0, totalEarned: 0, bankAccounts: [] },
      },
    },
    { new: true, upsert: true },
  );

  // ── Khóa học của mentorFull ───────────────────────────────────────────────
  const course = await Course.create({
    mentorId: mentorFull._id, title: "Node.js từ cơ bản đến nâng cao",
    description: "Khóa học demo để test chặn ghi danh khi mentor bị tạm ngưng.",
    level: "intermediate", price: 600_000, isPublished: true, status: "published",
  });

  // ── Buổi hẹn ──────────────────────────────────────────────────────────────
  let slot = 7;
  const mkBooking = async (student, spec) => {
    slot += 1;
    const b = await Booking.create({
      userId: student._id, mentorId: mentorFull._id,
      date: spec.date, timeSlot: `${String(slot).padStart(2, "0")}:00`,
      durationMinutes: 60, timezone: "Asia/Ho_Chi_Minh", sessionType: "mock_interview",
      notes: `[TEST] ${spec.note}`,
      status: spec.status, price: spec.amount, platformFee: Math.round(spec.amount * 0.3),
      vat: 0, totalAmount: spec.amount, paymentStatus: spec.paymentStatus,
      paymentMethod: "transfer", paymentRef: `PI${200000 + slot}`,
      paidAt: spec.paymentStatus === "paid" ? new Date() : undefined,
      completedAt: spec.status === "completed" ? dt(-4) : undefined,
      ...(spec.earnings || {}),
    });
    if (spec.paymentStatus === "paid") {
      await Payment.create({
        userId: student._id, type: "booking", referenceId: b._id, referenceModel: "Booking",
        amount: spec.amount, provider: "transfer", providerRef: `LOCKTEST-${b._id}`,
        status: "success", paidAt: new Date(),
      });
    }
    return b;
  };

  const bookings = [];
  bookings.push(await mkBooking(studentPro, { date: iso(2), amount: 1_000_000, status: "confirmed", paymentStatus: "paid", note: "Đã trả tiền, sắp diễn ra → SẼ HOÀN" }));
  bookings.push(await mkBooking(studentPro, { date: iso(0), amount: 1_200_000, status: "confirmed", paymentStatus: "paid", note: "Đã trả tiền, HÔM NAY → SẼ HOÀN" }));
  bookings.push(await mkBooking(student2,   { date: iso(5), amount:   800_000, status: "pending",   paymentStatus: "paid", note: "Đã trả tiền, chờ xác nhận → SẼ HOÀN" }));
  bookings.push(await mkBooking(student2,   { date: iso(3), amount:   900_000, status: "pending",   paymentStatus: "pending", note: "CHƯA trả tiền → không hoàn" }));
  bookings.push(await mkBooking(studentPro, { date: iso(-6), amount: 1_000_000, status: "completed", paymentStatus: "paid",
    note: "Đã xong, tiền ĐÃ tới hạn giải phóng",
    earnings: { mentorEarningsCreditedAt: dt(-4), earningsClearAt: dt(-1), earningsNetAmount: 700_000 } }));
  bookings.push(await mkBooking(studentPro, { date: iso(-1), amount: 1_000_000, status: "completed", paymentStatus: "paid",
    note: "Đã xong, tiền CÒN trong thời gian giữ",
    earnings: { mentorEarningsCreditedAt: dt(-1), earningsClearAt: dt(2), earningsNetAmount: 700_000 } }));

  // ── Ghi danh khóa học ─────────────────────────────────────────────────────
  await Enrollment.create({
    userId: studentPro._id, courseId: course._id, pricePaid: 600_000,
    paymentStatus: "paid", paymentMethod: "transfer", paidAt: new Date(), lastAccessedAt: new Date(),
  });

  // ── Yêu cầu rút tiền đang mở (chặn đóng tài khoản) ───────────────────────
  await PayoutRequest.create({
    mentorId: mentorFull._id, amount: 500_000, status: "pending",
    payoutAccount: { bankName: "TPBank", accountNumber: "0987654321", accountName: "LE MINH QUAN" },
    requestedAt: dt(-1),
  });

  // ── 30 user lấp đầy để test phân trang + tìm kiếm ────────────────────────
  const filler = [];
  for (let i = 1; i <= 30; i++) {
    filler.push({
      email: `filler${String(i).padStart(2, "0")}@lock.test`,
      name: `Người dùng lấp đầy ${i}`,
      role: "customer", isActive: i % 7 !== 0, isEmailVerified: true, passwordHash,
    });
  }
  await User.insertMany(filler);

  const totalUsers = await User.countDocuments();

  console.log("╔═══ TÀI KHOẢN (mật khẩu tất cả: " + PASSWORD + ") ═══════════════════╗");
  console.log("  admin@lock.test           Quản trị viên  ← đăng nhập bằng tài khoản này");
  console.log("  admin2@lock.test          Quản trị viên 2 (để test không khóa được admin khác)");
  console.log("  mentor.full@lock.test     Lê Minh Quân — CÓ tiền, buổi hẹn, khóa học, yêu cầu rút");
  console.log("  mentor.clean@lock.test    Phạm Thu Hà — sạch nợ, đóng tài khoản được");
  console.log("  student.pro@lock.test     Học viên gói Pro (còn hạn 60 ngày) + 3 buổi + 1 khóa học");
  console.log("  student2@lock.test        Học viên 2 — 2 buổi hẹn");
  console.log("  customer.plain@lock.test  Khách thường, không tiền không lịch");
  console.log(`  filler01..30@lock.test    ${filler.length} user lấp đầy (4 tài khoản bị khóa sẵn)`);
  console.log("╠═══ SỐ LIỆU MENTOR 'LÊ MINH QUÂN' ══════════════════════════════════╣");
  console.log("  Khả dụng      2.000.000đ   |  Đang giữ 1.400.000đ  |  Chờ chi 500.000đ");
  console.log("  Tổng ví       3.900.000đ");
  console.log("  Buổi sẽ hoàn  3 buổi = 3.000.000đ  (2 buổi khác KHÔNG được đụng)");
  console.log("  Yêu cầu rút   1 đang chờ duyệt (500.000đ)");
  console.log("  Tiền đến hạn  1 khoản 700.000đ đã tới hạn giải phóng, 1 khoản 700.000đ còn giữ");
  console.log("╠════════════════════════════════════════════════════════════════════╣");
  console.log(`  Tổng user trong DB: ${totalUsers}`);
  console.log("╚════════════════════════════════════════════════════════════════════╝");
  console.log(`\nĐổi backend/.env:\n  MONGO_URI=${baseUri()}\nrồi khởi động lại backend.\n`);

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
