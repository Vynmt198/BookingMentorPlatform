/**
 * Seed dữ liệu DEMO cho site đã deploy — phủ đủ các nhánh cần bấm thử trên production.
 *
 * Khác `seed:all` (dựng dữ liệu nền chung), script này dựng các TRẠNG THÁI KHÓ TẠO BẰNG TAY:
 * booking đã hoàn tiền, thanh toán bị giữ, mentor đóng được vs mentor bị chặn đóng,
 * enrollment có platformFee null (chưa tính) vs 0 (miễn phí thật), payout chờ duyệt…
 *
 * Chạy (từ thư mục backend):
 *   node src/scripts/seedDemoShowcase.js            # tạo / làm mới dữ liệu demo
 *   node src/scripts/seedDemoShowcase.js --clean    # xóa sạch dữ liệu demo, không tạo lại
 *   node src/scripts/seedDemoShowcase.js --dry-run  # in kế hoạch, không ghi DB
 *
 * AN TOÀN:
 *  - Chỉ đụng tới document có email `@demo.local` hoặc `providerRef` bắt đầu bằng `DEMO-`.
 *    Dữ liệu thật và dữ liệu của `seed:all` không bị ảnh hưởng.
 *  - Idempotent: chạy lại nhiều lần không nhân bản (xóa demo cũ trước khi tạo mới).
 *  - Mọi ngày tháng đều tương đối so với lúc chạy → dữ liệu không bao giờ "cũ".
 */
import "../config/loadEnv.js";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { connectDatabase } from "../db/connect.js";
import "../models/index.js";

import { User } from "../models/User.js";
import { Mentor } from "../models/Mentor.js";
import { Booking } from "../models/Booking.js";
import { Payment } from "../models/Payment.js";
import { Course } from "../models/Course.js";
import { Enrollment } from "../models/Enrollment.js";
import { Review } from "../models/Review.js";
import { Report } from "../models/Report.js";
import { Notification } from "../models/Notification.js";
import { PayoutRequest } from "../models/PayoutRequest.js";
import { Subscription } from "../models/Subscription.js";
import { CVAnalysis } from "../models/CVAnalysis.js";

// ── Hằng số ───────────────────────────────────────────────────────────────────

const PASSWORD = "Demo123456";
const EMAIL_DOMAIN = "@demo.local";
const REF_PREFIX = "DEMO-";
const SALT_ROUNDS = 10;

const isClean = process.argv.includes("--clean");
const isDryRun = process.argv.includes("--dry-run");

/** Ngày dạng "YYYY-MM-DD", lệch `d` ngày so với hôm nay. `Booking.date` là chuỗi, không phải Date. */
const iso = (d) => new Date(Date.now() + d * 86_400_000).toISOString().slice(0, 10);
/** Date object lệch `d` ngày. */
const at = (d) => new Date(Date.now() + d * 86_400_000);

const VAT_RATE = 0.08;
const FEE_RATE = 0.3;

/** Tính bộ số tiền booking khớp cách backend tính (price → fee → vat → total). */
function money(price, feeRate = FEE_RATE) {
  const platformFee = Math.round(price * feeRate);
  const vat = Math.round(price * VAT_RATE);
  return { price, platformFeeRate: feeRate, platformFee, vat, totalAmount: price + vat };
}

/** Số mentor thực nhận — chốt lúc ghi có, khớp ý nghĩa `earningsNetAmount`. */
const netFor = (m) => m.price - m.platformFee;

function log(...args) {
  console.log(...args);
}

// ── Định nghĩa dữ liệu ────────────────────────────────────────────────────────

const USERS = [
  // Học viên
  { key: "free",    email: `hv.free${EMAIL_DOMAIN}`,    name: "Trần Minh Khoa",  role: "customer", plan: "free",
    quota: { cvAnalysisUsed: 2, cvAnalysisLimit: 3 },
    desc: "Học viên gói Free — đã dùng 2/3 lượt CV, test chặn quota ở lượt thứ 4" },

  { key: "student", email: `hv.student${EMAIL_DOMAIN}`, name: "Nguyễn Thu Hà",   role: "customer", plan: "student",
    planMonths: 5, billing: "monthly", quota: { cvAnalysisUsed: 7, cvAnalysisLimit: 50 },
    desc: "Học viên gói Student — có lịch sử thanh toán + hoá đơn, ưu đãi 5%" },

  { key: "pro",     email: `hv.pro${EMAIL_DOMAIN}`,     name: "Lê Quốc Bảo",     role: "customer", plan: "professional",
    planMonths: 11, billing: "yearly", quota: { cvAnalysisUsed: 23, cvAnalysisLimit: 999 },
    desc: "Học viên gói Professional — ưu đãi 10%, quota CV không giới hạn" },

  { key: "refund",  email: `hv.refund${EMAIL_DOMAIN}`,  name: "Phạm Hải Yến",    role: "customer", plan: "free",
    quota: { cvAnalysisUsed: 0, cvAnalysisLimit: 3 },
    desc: "Học viên đang chờ hoàn tiền — test luồng refund_pending + khai báo STK" },

  // Mentor
  { key: "senior",  email: `mt.senior${EMAIL_DOMAIN}`,  name: "Đặng Vũ Thành",   role: "mentor",
    desc: "Mentor chủ lực — có khoá học, booking đủ trạng thái, số dư rút được" },

  { key: "new",     email: `mt.new${EMAIL_DOMAIN}`,     name: "Vũ Ngọc Lan",     role: "mentor",
    desc: "Mentor mới đăng ký — chờ admin duyệt hồ sơ tại /admin/mentors/pending" },

  { key: "suspend", email: `mt.suspend${EMAIL_DOMAIN}`, name: "Hoàng Đức Trung", role: "mentor",
    desc: "Mentor bị nhiều report — test tạm ngưng + tự hoàn tiền học viên" },

  { key: "closable", email: `mt.closable${EMAIL_DOMAIN}`, name: "Bùi Thanh Mai", role: "mentor",
    desc: "Mentor sạch nợ (mọi số dư = 0) — ĐÓNG tài khoản phải THÀNH CÔNG" },

  { key: "blocked", email: `mt.blocked${EMAIL_DOMAIN}`, name: "Ngô Gia Huy",     role: "mentor",
    desc: "Mentor còn tiền treo + payout chờ duyệt — ĐÓNG tài khoản phải trả 409 kèm blockers" },
];

/** Hồ sơ mentor. `finance` được set thẳng để tạo đúng trạng thái cần test. */
const MENTOR_PROFILES = {
  senior: {
    title: "Senior Engineering Manager", company: "Shopee",
    fields: ["Technology", "Engineering"], specialties: ["System Design", "Phỏng vấn kỹ thuật", "Leadership"],
    companies: ["Shopee", "Grab", "VNG"], experienceYears: 11, pricePerHour: 900_000,
    bio: "11 năm xây dựng đội ngũ kỹ thuật tại Shopee và Grab. Đã phỏng vấn hơn 400 ứng viên backend/fullstack, chuyên luyện vòng system design và behavioral cho vị trí senior.",
    isVerified: true, status: "active",
    stats: { rating: 4.8, reviewCount: 42, sessionCount: 156, totalStudents: 98, completionRate: 97 },
    finance: { availableBalance: 4_200_000, clearingBalance: 1_260_000, pendingBalance: 0, totalEarned: 38_500_000,
      bankAccounts: [{ bankName: "TPBank", accountNumber: "0399112233", accountName: "DANG VU THANH", isDefault: true }] },
  },
  new: {
    title: "Product Designer", company: "Momo",
    fields: ["Design"], specialties: ["UI/UX Portfolio", "Design Critique"],
    companies: ["Momo"], experienceYears: 4, pricePerHour: 450_000,
    bio: "Product Designer tại Momo, tập trung vào fintech. Hỗ trợ review portfolio và chuẩn bị vòng design challenge.",
    isVerified: false, status: "active", adminReviewStatus: "pending",
    stats: { rating: 0, reviewCount: 0, sessionCount: 0 },
    finance: { availableBalance: 0, clearingBalance: 0, pendingBalance: 0, totalEarned: 0, bankAccounts: [] },
  },
  suspend: {
    title: "Data Analyst Lead", company: "Tiki",
    fields: ["Data"], specialties: ["SQL", "Case Interview"],
    companies: ["Tiki"], experienceYears: 6, pricePerHour: 700_000,
    bio: "Data Analyst Lead tại Tiki, hướng dẫn phỏng vấn phân tích dữ liệu và case study.",
    isVerified: true, status: "active",
    stats: { rating: 3.4, reviewCount: 9, sessionCount: 21, noShowCount: 2 },
    finance: { availableBalance: 800_000, clearingBalance: 0, pendingBalance: 0, totalEarned: 6_400_000,
      bankAccounts: [{ bankName: "Vietcombank", accountNumber: "1012345678", accountName: "HOANG DUC TRUNG", isDefault: true }] },
  },
  closable: {
    title: "QA Automation Engineer", company: "FPT Software",
    fields: ["Technology"], specialties: ["Testing", "Automation"],
    companies: ["FPT Software"], experienceYears: 5, pricePerHour: 500_000,
    bio: "QA Automation Engineer, hỗ trợ định hướng sự nghiệp mảng kiểm thử tự động.",
    isVerified: true, status: "active",
    // Mọi số dư = 0 và không có dòng treo → canCloseMentor phải trả ok: true
    stats: { rating: 4.5, reviewCount: 6, sessionCount: 12 },
    finance: { availableBalance: 0, clearingBalance: 0, pendingBalance: 0, totalEarned: 5_000_000, bankAccounts: [] },
  },
  blocked: {
    title: "Backend Engineer", company: "Zalo",
    fields: ["Technology"], specialties: ["Golang", "Microservices"],
    companies: ["Zalo"], experienceYears: 7, pricePerHour: 750_000,
    bio: "Backend Engineer tại Zalo, chuyên hệ thống phân tán và tối ưu hiệu năng.",
    isVerified: true, status: "active",
    // clearingBalance > 0 + payout pending + booking chưa clear → canCloseMentor phải trả blockers
    stats: { rating: 4.6, reviewCount: 14, sessionCount: 33 },
    finance: { availableBalance: 1_500_000, clearingBalance: 525_000, pendingBalance: 0, totalEarned: 12_000_000,
      bankAccounts: [{ bankName: "MB Bank", accountNumber: "0988776655", accountName: "NGO GIA HUY", isDefault: true }] },
  },
};

// ── Xóa dữ liệu demo cũ ───────────────────────────────────────────────────────

async function cleanDemo() {
  const demoUsers = await User.find({ email: { $regex: `${EMAIL_DOMAIN.replace(".", "\\.")}$` } }).select("_id").lean();
  const userIds = demoUsers.map((u) => u._id);
  const demoMentors = await Mentor.find({ userId: { $in: userIds } }).select("_id").lean();
  const mentorIds = demoMentors.map((m) => m._id);
  const demoCourses = await Course.find({ mentorId: { $in: mentorIds } }).select("_id").lean();
  const courseIds = demoCourses.map((c) => c._id);

  const results = await Promise.all([
    Booking.deleteMany({ $or: [{ userId: { $in: userIds } }, { mentorId: { $in: mentorIds } }] }),
    Payment.deleteMany({ $or: [{ userId: { $in: userIds } }, { providerRef: { $regex: `^${REF_PREFIX}` } }] }),
    Enrollment.deleteMany({ $or: [{ userId: { $in: userIds } }, { courseId: { $in: courseIds } }] }),
    Review.deleteMany({ userId: { $in: userIds } }),
    Report.deleteMany({ reportedBy: { $in: userIds } }),
    Notification.deleteMany({ userId: { $in: userIds } }),
    PayoutRequest.deleteMany({ mentorId: { $in: mentorIds } }),
    Subscription.deleteMany({ userId: { $in: userIds } }),
    CVAnalysis.deleteMany({ userId: { $in: userIds } }),
    Course.deleteMany({ _id: { $in: courseIds } }),
    Mentor.deleteMany({ _id: { $in: mentorIds } }),
    User.deleteMany({ _id: { $in: userIds } }),
  ]);

  const total = results.reduce((sum, r) => sum + (r?.deletedCount || 0), 0);
  log(`  Đã xóa ${total} document demo (${userIds.length} user).`);
}

// ── Tạo dữ liệu ───────────────────────────────────────────────────────────────

async function createUsers() {
  const passwordHash = await bcrypt.hash(PASSWORD, SALT_ROUNDS);
  const byKey = {};

  for (const u of USERS) {
    const doc = {
      email: u.email,
      name: u.name,
      role: u.role,
      passwordHash,
      isEmailVerified: true,
      isActive: true,
      lastLoginAt: at(-1),
      quota: u.quota ? { ...u.quota, mentorSessionUsed: 0, mentorSessionLimit: 0, resetAt: at(-10) } : undefined,
    };
    if (u.plan) doc.plan = u.plan;
    if (u.planMonths) {
      doc.planExpiresAt = at(u.planMonths * 30);
      doc.planBilling = u.billing || "monthly";
    }

    // insertMany bỏ qua post-save hook đồng bộ Mentor → tự tạo hồ sơ mentor bên dưới, kiểm soát được finance.
    const created = await User.create(doc);
    byKey[u.key] = created;
  }
  log(`  ✓ ${USERS.length} user (mật khẩu: ${PASSWORD})`);
  return byKey;
}

async function createMentors(users) {
  const byKey = {};
  for (const [key, p] of Object.entries(MENTOR_PROFILES)) {
    const user = users[key];
    // Hook `User.post("save")` đã tự tạo hồ sơ Mentor rồi → upsert đè lên thay vì create
    // (create sẽ vỡ vì unique index trên `userId`).
    const doc = await Mentor.findOneAndUpdate(
      { userId: user._id },
      { $set: {
      userId: user._id,
      publicId: `u${user._id}`,
      name: user.name,
      title: p.title,
      company: p.company,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=6d28d9&color=fff&size=256`,
      bio: p.bio,
      specialties: p.specialties,
      fields: p.fields,
      companies: p.companies,
      experienceYears: p.experienceYears,
      pricePerHour: p.pricePerHour,
      sessionTypes: [
        { type: "mock_interview",    durationMinutes: 60, price: p.pricePerHour },
        { type: "cv_review",         durationMinutes: 45, price: Math.round(p.pricePerHour * 0.7) },
        { type: "career_consulting", durationMinutes: 60, price: p.pricePerHour },
      ],
      available: true,
      // Lịch rảnh 14 ngày tới, bỏ cuối tuần — đủ để bấm đặt lịch thật trên UI
      availableSlots: buildAvailableSlots(),
      stats: { totalRevenue: 0, profileViews: 0, acceptanceRate: 100, rebookingRate: 0, ...p.stats },
      finance: { autoPayoutThreshold: 500_000, momoPhone: "", zalopayPhone: "", ...p.finance },
      isVerified: p.isVerified,
      isActive: p.status === "active",
      status: p.status,
      verifiedAt: p.isVerified ? at(-120) : undefined,
      adminReview: {
        status: p.adminReviewStatus || "approved",
        reason: "",
        reviewedAt: p.adminReviewStatus === "pending" ? null : at(-120),
      },
      pricing: { mentorActivatedAt: at(-150), platformFeeRate: null, coursePlatformFeeRate: null, isEarlyMentor: false },
      } },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    );
    byKey[key] = doc;
  }
  log(`  ✓ ${Object.keys(byKey).length} hồ sơ mentor`);
  return byKey;
}

/** Map<"YYYY-MM-DD", ["09:00", ...]> cho 14 ngày tới, bỏ T7/CN. */
function buildAvailableSlots() {
  const slots = new Map();
  for (let d = 1; d <= 14; d += 1) {
    const date = at(d);
    const day = date.getDay();
    if (day === 0 || day === 6) continue;
    slots.set(iso(d), ["09:00", "10:30", "14:00", "15:30", "20:00"]);
  }
  return slots;
}

async function createCourses(mentors) {
  const senior = mentors.senior;
  const lesson = (title, order, minutes, isFree = false) => ({
    title, type: "video", order, durationMinutes: minutes, isFree,
    videoUrl: "https://res.cloudinary.com/demo/video/upload/v1690000000/samples/sea-turtle.mp4",
    description: `Nội dung bài học: ${title}`,
  });

  const docs = await Course.create([
    {
      mentorId: senior._id,
      title: "Luyện phỏng vấn System Design cho Senior Backend",
      shortDescription: "Khoá học 8 bài về cách tiếp cận bài toán system design trong vòng phỏng vấn senior.",
      description: "Đi từ cách bóc tách yêu cầu, ước lượng dung lượng, chọn kiến trúc, tới cách trình bày trade-off trước hội đồng phỏng vấn. Mỗi bài đều có case thật đã dùng tại Shopee và Grab.",
      thumbnail: "https://images.unsplash.com/photo-1517180102446-f3ece451e9d8?w=800&q=80",
      level: "advanced",
      topics: ["Technical", "Behavioral"],
      tags: ["system design", "backend", "senior"],
      modules: [
        { title: "Nền tảng", order: 1, lessons: [lesson("Khung tư duy 4 bước", 1, 18, true), lesson("Ước lượng dung lượng", 2, 22)] },
        { title: "Thực chiến", order: 2, lessons: [lesson("Thiết kế URL shortener", 1, 35), lesson("Thiết kế news feed", 2, 40)] },
      ],
      isFree: false, price: 1_200_000, discountPrice: 890_000, discountEndsAt: at(20),
      status: "published", publishedAt: at(-60),
      stats: { enrollmentCount: 2, rating: 4.7, reviewCount: 2, completionRate: 45, totalRevenue: 1_780_000 },
      totalLessons: 4, totalDurationMinutes: 115,
      adminReview: { reason: "", reviewedAt: at(-60), lastAction: "" },
    },
    {
      mentorId: senior._id,
      title: "Viết CV kỹ thuật vượt qua vòng lọc ATS",
      shortDescription: "Khoá học miễn phí 3 bài về cách viết CV cho vị trí kỹ thuật.",
      description: "Cách chọn từ khoá, viết bullet theo công thức STAR có số liệu, và tránh các lỗi khiến CV bị hệ thống ATS loại sớm.",
      thumbnail: "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=800&q=80",
      level: "basic",
      topics: ["Resume"],
      tags: ["cv", "ats", "resume"],
      modules: [{ title: "Cơ bản", order: 1, lessons: [lesson("Bố cục CV kỹ thuật", 1, 15, true), lesson("Viết bullet có số liệu", 2, 20, true), lesson("Kiểm tra với ATS", 3, 12, true)] }],
      isFree: true, price: 0,
      status: "published", publishedAt: at(-45),
      stats: { enrollmentCount: 1, rating: 4.9, reviewCount: 1, completionRate: 80, totalRevenue: 0 },
      totalLessons: 3, totalDurationMinutes: 47,
      adminReview: { reason: "", reviewedAt: at(-45), lastAction: "" },
    },
    {
      mentorId: senior._id,
      title: "Đàm phán lương cho kỹ sư phần mềm",
      shortDescription: "Khoá học đang CHỜ ADMIN DUYỆT — dùng để test /admin/content/courses.",
      description: "Chiến thuật đàm phán offer: khi nào nên nói con số trước, cách phản hồi khi bị ép mức, và cách so sánh tổng thu nhập giữa các offer.",
      thumbnail: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&q=80",
      level: "intermediate",
      topics: ["Negotiation"],
      tags: ["salary", "negotiation"],
      modules: [{ title: "Chiến thuật", order: 1, lessons: [lesson("Định giá bản thân", 1, 25), lesson("Kịch bản đàm phán", 2, 30)] }],
      isFree: false, price: 750_000,
      status: "pending_review",
      stats: { enrollmentCount: 0, rating: 0, reviewCount: 0, completionRate: 0, totalRevenue: 0 },
      totalLessons: 2, totalDurationMinutes: 55,
      adminReview: { reason: "", lastAction: "" },
    },
  ]);

  log(`  ✓ ${docs.length} khoá học (1 published trả phí, 1 free, 1 chờ duyệt)`);
  return { paid: docs[0], free: docs[1], pending: docs[2] };
}

async function createBookings(users, mentors) {
  const senior = mentors.senior._id;
  const suspend = mentors.suspend._id;
  const blocked = mentors.blocked._id;
  const out = {};

  const base = {
    durationMinutes: 60, timezone: "Asia/Ho_Chi_Minh", sessionType: "mock_interview",
    paymentMethod: "transfer",
  };

  // 1) Đã hoàn thành & tiền ĐÃ giải phóng → mentor rút được
  const m1 = money(900_000);
  out.done = await Booking.create({
    ...base, ...m1, userId: users.student._id, mentorId: senior,
    date: iso(-12), timeSlot: "09:00", status: "completed", paymentStatus: "paid",
    paymentRef: `${REF_PREFIX}BK001`, paidAt: at(-14), completedAt: at(-12),
    notes: "Luyện vòng system design cho vị trí Senior Backend tại Shopee.",
    mentorEarningsCreditedAt: at(-12), earningsClearAt: at(-9), earningsClearedAt: at(-9),
    earningsNetAmount: netFor(m1),
    mentorCheckInAt: at(-12),
    mentorSummary: { rating: 4, strengths: "Tư duy bóc tách yêu cầu tốt, đặt câu hỏi làm rõ trước khi vẽ kiến trúc.", improvements: "Cần luyện phần ước lượng dung lượng, hay bỏ qua bước tính QPS.", recommendation: "Ôn lại chương caching và đọc thêm về consistent hashing.", submittedAt: at(-11), submittedLate: false },
  });

  // 2) Đã hoàn thành nhưng tiền CÒN TRONG THỜI GIAN GIỮ → clearingBalance, chưa rút được
  const m2 = money(900_000);
  out.clearing = await Booking.create({
    ...base, ...m2, userId: users.pro._id, mentorId: senior,
    date: iso(-1), timeSlot: "14:00", status: "completed", paymentStatus: "paid",
    paymentRef: `${REF_PREFIX}BK002`, paidAt: at(-3), completedAt: at(-1),
    sessionType: "career_consulting",
    notes: "Tư vấn lộ trình lên Engineering Manager.",
    mentorEarningsCreditedAt: at(-1), earningsClearAt: at(2), earningsClearedAt: null,
    earningsNetAmount: netFor(m2),
    mentorCheckInAt: at(-1),
  });

  // 3) Sắp diễn ra, đã trả tiền → test vào phòng họp
  const m3 = money(900_000);
  out.upcoming = await Booking.create({
    ...base, ...m3, userId: users.student._id, mentorId: senior,
    date: iso(1), timeSlot: "10:30", status: "confirmed", paymentStatus: "paid",
    paymentRef: `${REF_PREFIX}BK003`, paidAt: at(-1),
    notes: "Mock interview vòng behavioral.",
  });

  // 4) Chưa thanh toán, còn hạn CK → test màn chuyển khoản + admin xác nhận
  const m4 = money(630_000);
  out.awaitingPay = await Booking.create({
    ...base, ...m4, userId: users.free._id, mentorId: senior,
    date: iso(3), timeSlot: "15:30", status: "pending", paymentStatus: "pending",
    sessionType: "cv_review", durationMinutes: 45,
    paymentRef: `${REF_PREFIX}BK004`, paymentExpiresAt: at(0.01),
    transferSubmittedAt: at(-0.005),
    notes: "Nhờ review CV trước khi nộp đơn.",
  });

  // 5) Học viên hủy muộn → hoàn một phần
  const m5 = money(900_000);
  out.partialRefund = await Booking.create({
    ...base, ...m5, userId: users.pro._id, mentorId: senior,
    date: iso(-6), timeSlot: "20:00", status: "cancelled", paymentStatus: "partial_refund",
    paymentRef: `${REF_PREFIX}BK005`, paidAt: at(-8),
    cancelledBy: "user", cancelledAt: at(-7), cancelReason: "Trùng lịch phỏng vấn thật.",
    cancelRefundPercent: 50, cancelRefundAmountVnd: 486_000, cancelRetainedAmountVnd: 486_000,
    refundReceiveBankName: "Techcombank", refundReceiveAccountNumber: "19036999888", refundReceiveAccountHolder: "LE QUOC BAO",
    refundCompletedAt: at(-6),
  });

  // 6) Mentor vắng mặt → hoàn 100%, ĐANG CHỜ admin chuyển khoản
  const m6 = money(700_000);
  out.refundPending = await Booking.create({
    ...base, ...m6, userId: users.refund._id, mentorId: suspend,
    date: iso(-2), timeSlot: "09:00", status: "no_show", paymentStatus: "refund_pending",
    paymentRef: `${REF_PREFIX}BK006`, paidAt: at(-5),
    noShowBy: "mentor", cancelledBy: "mentor", cancelledAt: at(-2),
    cancelReason: "Mentor không tham gia buổi hẹn.",
    cancelRefundPercent: 100, cancelRefundAmountVnd: 756_000, cancelRetainedAmountVnd: 0,
    mentorCancelResolution: "no_show_refund", mentorCancelResolutionAt: at(-2),
  });

  // 7) Học viên vắng mặt → mentor vẫn nhận đủ tiền, học viên không được hoàn
  const m7 = money(700_000);
  out.customerNoShow = await Booking.create({
    ...base, ...m7, userId: users.free._id, mentorId: suspend,
    date: iso(-4), timeSlot: "14:00", status: "no_show", paymentStatus: "paid",
    paymentRef: `${REF_PREFIX}BK007`, paidAt: at(-6), completedAt: at(-4),
    noShowBy: "customer",
    mentorEarningsCreditedAt: at(-4), earningsClearAt: at(-1), earningsClearedAt: at(-1),
    earningsNetAmount: netFor(m7),
  });

  // 8) Buổi đã trả tiền CHƯA diễn ra của mentor sắp bị khóa → phải bị hủy + hoàn 100% khi admin tạm ngưng
  const m8 = money(700_000);
  out.willRefundOnSuspend = await Booking.create({
    ...base, ...m8, userId: users.refund._id, mentorId: suspend,
    date: iso(4), timeSlot: "10:30", status: "confirmed", paymentStatus: "paid",
    paymentRef: `${REF_PREFIX}BK008`, paidAt: at(-1),
    notes: "Buổi này PHẢI được hoàn 100% khi admin tạm ngưng mentor.",
  });

  // 9) Booking của mentor `blocked` — tiền chưa clear → chặn đóng tài khoản
  const m9 = money(750_000);
  out.blockerBooking = await Booking.create({
    ...base, ...m9, userId: users.student._id, mentorId: blocked,
    date: iso(-1), timeSlot: "15:30", status: "completed", paymentStatus: "paid",
    paymentRef: `${REF_PREFIX}BK009`, paidAt: at(-3), completedAt: at(-1),
    mentorEarningsCreditedAt: at(-1), earningsClearAt: at(2), earningsClearedAt: null,
    earningsNetAmount: netFor(m9),
  });

  log(`  ✓ 9 booking phủ đủ trạng thái (completed/clearing/upcoming/chờ CK/hoàn một phần/refund_pending/no-show ×2/blocker)`);
  return out;
}

async function createPayments(users, bookings, courses, enrollments) {
  const p = (o) => ({ currency: "VND", provider: "transfer", ...o });

  const docs = await Payment.create([
    // Booking đã thanh toán thành công
    p({ userId: users.student._id, type: "booking", referenceId: bookings.done._id, referenceModel: "Booking",
        amount: bookings.done.totalAmount, status: "success", providerRef: `${REF_PREFIX}PAY-BK001`, paidAt: at(-14),
        invoiceName: users.student.name, invoiceEmail: users.student.email }),
    p({ userId: users.pro._id, type: "booking", referenceId: bookings.clearing._id, referenceModel: "Booking",
        amount: bookings.clearing.totalAmount, status: "success", providerRef: `${REF_PREFIX}PAY-BK002`, paidAt: at(-3),
        invoiceName: users.pro.name, invoiceEmail: users.pro.email }),
    p({ userId: users.student._id, type: "booking", referenceId: bookings.upcoming._id, referenceModel: "Booking",
        amount: bookings.upcoming.totalAmount, status: "success", providerRef: `${REF_PREFIX}PAY-BK003`, paidAt: at(-1),
        invoiceName: users.student.name, invoiceEmail: users.student.email }),

    // Chờ xác nhận CK — hiện ở /admin/transactions
    p({ userId: users.free._id, type: "booking", referenceId: bookings.awaitingPay._id, referenceModel: "Booking",
        amount: bookings.awaitingPay.totalAmount, status: "pending", providerRef: `${REF_PREFIX}PAY-BK004`,
        paymentExpiresAt: at(0.01) }),

    // Hoàn một phần — finance overview PHẢI trừ phần này khỏi doanh thu
    p({ userId: users.pro._id, type: "booking", referenceId: bookings.partialRefund._id, referenceModel: "Booking",
        amount: bookings.partialRefund.totalAmount, status: "partial_refund", providerRef: `${REF_PREFIX}PAY-BK005`,
        paidAt: at(-8), refundedAt: at(-6), refundAmount: 486_000 }),

    // Hoàn toàn bộ, đang chờ admin chuyển tiền
    p({ userId: users.refund._id, type: "booking", referenceId: bookings.refundPending._id, referenceModel: "Booking",
        amount: bookings.refundPending.totalAmount, status: "refund_pending", providerRef: `${REF_PREFIX}PAY-BK006`,
        paidAt: at(-5), refundAmount: 756_000 }),

    // Học viên vắng mặt — tiền KHÔNG hoàn
    p({ userId: users.free._id, type: "booking", referenceId: bookings.customerNoShow._id, referenceModel: "Booking",
        amount: bookings.customerNoShow.totalAmount, status: "success", providerRef: `${REF_PREFIX}PAY-BK007`, paidAt: at(-6) }),

    p({ userId: users.refund._id, type: "booking", referenceId: bookings.willRefundOnSuspend._id, referenceModel: "Booking",
        amount: bookings.willRefundOnSuspend.totalAmount, status: "success", providerRef: `${REF_PREFIX}PAY-BK008`, paidAt: at(-1) }),

    p({ userId: users.student._id, type: "booking", referenceId: bookings.blockerBooking._id, referenceModel: "Booking",
        amount: bookings.blockerBooking.totalAmount, status: "success", providerRef: `${REF_PREFIX}PAY-BK009`, paidAt: at(-3) }),

    // Khoá học
    p({ userId: users.student._id, type: "course", referenceId: enrollments.paid._id, referenceModel: "Enrollment",
        amount: 890_000, status: "success", providerRef: `${REF_PREFIX}PAY-CS001`, paidAt: at(-20),
        invoiceName: users.student.name, invoiceEmail: users.student.email }),
    p({ userId: users.pro._id, type: "course", referenceId: enrollments.feeNull._id, referenceModel: "Enrollment",
        amount: 890_000, status: "success", providerRef: `${REF_PREFIX}PAY-CS002`, paidAt: at(-2) }),

    // Gói cước — doanh thu này TỪNG BỊ BỎ SÓT trong widget Dashboard
    p({ userId: users.student._id, type: "subscription", referenceId: users.student._id, referenceModel: "Subscription",
        amount: 150_000, status: "success", providerRef: `${REF_PREFIX}PAY-SUB001`, paidAt: at(-25),
        invoiceName: users.student.name, invoiceEmail: users.student.email }),
    p({ userId: users.pro._id, type: "subscription", referenceId: users.pro._id, referenceModel: "Subscription",
        amount: 4_800_000, status: "success", providerRef: `${REF_PREFIX}PAY-SUB002`, paidAt: at(-30),
        invoiceName: users.pro.name, invoiceEmail: users.pro.email }),

    // Tiền vào nhưng người trả đang bị khóa → hàng đợi /admin/payments/held
    // Lưu ý: với type=subscription, `referenceId` CHÍNH LÀ userId (xem paymentsService.js) và có
    // unique index {provider,type,referenceId} — nên mỗi user chỉ được 1 dòng CK gói cước.
    p({ userId: users.free._id, type: "subscription", referenceId: users.free._id, referenceModel: "Subscription",
        amount: 150_000, status: "held_inactive_account", providerRef: `${REF_PREFIX}PAY-SUB003`,
        heldAt: at(-1), heldReason: "Tài khoản người trả đang bị khóa tại thời điểm nhận webhook SePay." }),

    // Giao dịch thất bại — đặt trên user khác để không đụng unique index ở trên
    p({ userId: users.refund._id, type: "subscription", referenceId: users.refund._id, referenceModel: "Subscription",
        amount: 500_000, status: "failed", providerRef: `${REF_PREFIX}PAY-SUB004`,
        failureReason: "Quá hạn cửa sổ chuyển khoản 15 phút." }),
  ]);

  log(`  ✓ ${docs.length} giao dịch (success/pending/partial_refund/refund_pending/held/failed)`);
  return docs;
}

async function createEnrollments(users, courses) {
  const paidCourse = courses.paid;
  const freeCourse = courses.free;

  // platformFee ĐÃ TÍNH — 35% giá khoá học
  const paid = await Enrollment.create({
    userId: users.student._id, courseId: paidCourse._id,
    pricePaid: 890_000, platformFeeRate: 0.35, platformFee: Math.round(890_000 * 0.35),
    paymentStatus: "paid", paymentMethod: "transfer", paymentRef: `${REF_PREFIX}EN001`, paidAt: at(-20),
    progressPercent: 50, lastAccessedAt: at(-2),
    mentorEarningsCreditedAt: at(-20), earningsClearAt: at(-17), earningsClearedAt: at(-17),
    earningsNetAmount: 890_000 - Math.round(890_000 * 0.35),
  });

  // platformFee = NULL → "chưa tính", KHÁC 0. Đây là bug đã từng xảy ra, giữ để test hiển thị.
  const feeNull = await Enrollment.create({
    userId: users.pro._id, courseId: paidCourse._id,
    pricePaid: 890_000, platformFeeRate: null, platformFee: null,
    paymentStatus: "paid", paymentMethod: "transfer", paymentRef: `${REF_PREFIX}EN002`, paidAt: at(-2),
    progressPercent: 10, lastAccessedAt: at(-1),
  });

  // Khoá miễn phí → platformFee = 0 là ĐÚNG (miễn phí thật), không phải "chưa tính"
  const free = await Enrollment.create({
    userId: users.free._id, courseId: freeCourse._id,
    pricePaid: 0, platformFeeRate: 0, platformFee: 0,
    paymentStatus: "paid", paymentMethod: "", paidAt: at(-10),
    progressPercent: 100, isCompleted: true, completedAt: at(-4),
  });

  log(`  ✓ 3 ghi danh (platformFee đã tính / null=chưa tính / 0=miễn phí thật)`);
  return { paid, feeNull, free };
}

async function createSubscriptions(users) {
  const docs = await Subscription.create([
    { userId: users.student._id, plan: "student", billingCycle: "monthly",
      startedAt: at(-25), expiresAt: at(5), isAutoRenew: false,
      history: [{ plan: "student", billingCycle: "monthly", startedAt: at(-25), expiresAt: at(5), amount: 150_000, paymentRef: `${REF_PREFIX}PAY-SUB001` }] },
    { userId: users.pro._id, plan: "professional", billingCycle: "yearly",
      startedAt: at(-30), expiresAt: at(335), isAutoRenew: true,
      history: [{ plan: "professional", billingCycle: "yearly", startedAt: at(-30), expiresAt: at(335), amount: 4_800_000, paymentRef: `${REF_PREFIX}PAY-SUB002` }] },
  ]);
  log(`  ✓ ${docs.length} subscription (1 sắp hết hạn trong 5 ngày → test nhắc gia hạn)`);
  return docs;
}

async function createReviews(users, mentors, courses, bookings) {
  const docs = await Review.create([
    { userId: users.student._id, targetType: "mentor", targetId: mentors.senior._id, bookingId: bookings.done._id,
      rating: 5, comment: "Anh Thành chỉ rất rõ cách bóc tách yêu cầu trước khi vẽ kiến trúc. Buổi học đáng giá hơn nhiều tài liệu tôi đọc trước đó.",
      isVerified: true, isVisible: true,
      reply: { content: "Cảm ơn bạn. Nhớ luyện thêm phần ước lượng QPS như đã trao đổi nhé.", repliedAt: at(-10) } },
    { userId: users.pro._id, targetType: "mentor", targetId: mentors.senior._id,
      rating: 4, comment: "Nội dung tốt, nhưng buổi hơi ngắn so với lượng kiến thức muốn hỏi.", isVerified: true, isVisible: true },
    { userId: users.free._id, targetType: "mentor", targetId: mentors.suspend._id,
      rating: 2, comment: "Mentor tới muộn 15 phút và kết thúc sớm.", isVerified: true, isVisible: true },
    { userId: users.student._id, targetType: "course", targetId: courses.paid._id,
      rating: 5, comment: "Case study thực tế, không lý thuyết suông. Phần thiết kế news feed rất đáng tiền.", isVerified: true, isVisible: true },
    { userId: users.free._id, targetType: "course", targetId: courses.free._id,
      rating: 5, comment: "Khoá miễn phí mà chất lượng. CV của tôi qua được vòng lọc sau khi sửa theo hướng dẫn.", isVerified: true, isVisible: true },
  ]);
  log(`  ✓ ${docs.length} đánh giá (có 1 review 2 sao + 1 review đã được mentor phản hồi)`);
  return docs;
}

async function createReports(users, mentors, bookings) {
  const docs = await Report.create([
    { reportedBy: users.free._id, targetType: "mentor", targetId: mentors.suspend._id,
      reason: "late", description: "Mentor vào phòng họp muộn 15 phút và không báo trước.", status: "pending" },
    { reportedBy: users.refund._id, targetType: "booking", targetId: bookings.refundPending._id,
      reason: "no_show", description: "Mentor không tham gia buổi hẹn, tôi chờ 30 phút.", status: "pending" },
    { reportedBy: users.pro._id, targetType: "mentor", targetId: mentors.suspend._id,
      reason: "unprofessional", description: "Mentor trả lời qua loa, không chuẩn bị nội dung.", status: "reviewing" },
  ]);
  log(`  ✓ ${docs.length} báo cáo vào mentor "mt.suspend" (đủ để test gộp report + tạm ngưng)`);
  return docs;
}

async function createPayouts(mentors, users) {
  const docs = await PayoutRequest.create([
    { mentorId: mentors.senior._id, amount: 2_000_000, status: "pending",
      payoutAccount: { bankName: "TPBank", accountNumber: "0399112233", accountName: "DANG VU THANH" },
      requestedAt: at(-2), note: "Rút định kỳ tháng này." },
    { mentorId: mentors.senior._id, amount: 3_500_000, status: "paid",
      payoutAccount: { bankName: "TPBank", accountNumber: "0399112233", accountName: "DANG VU THANH" },
      requestedAt: at(-35), reviewedAt: at(-34), paidAt: at(-33), transferRef: `${REF_PREFIX}PO-OLD1` },
    // Payout treo của mentor `blocked` → là 1 trong các blockers khi đóng tài khoản
    { mentorId: mentors.blocked._id, amount: 1_500_000, status: "pending",
      payoutAccount: { bankName: "MB Bank", accountNumber: "0988776655", accountName: "NGO GIA HUY" },
      requestedAt: at(-1), note: "Yêu cầu này khiến canCloseMentor trả blockers." },
  ]);
  log(`  ✓ ${docs.length} yêu cầu rút tiền (1 chờ duyệt, 1 đã trả, 1 chặn đóng tài khoản)`);
  return docs;
}

async function createCvAnalyses(users) {
  const mk = (userId, mode, score, position, daysAgo, matched, missing) => ({
    userId, mode, tier: "suggestions", status: "completed",
    cvFileName: "CV_NguyenVanA.pdf", cvText: "Kinh nghiệm 3 năm phát triển backend với Node.js và MongoDB…",
    ...(mode === "jd"
      ? { jdFileName: "JD_BackendEngineer.pdf", jdText: "Tuyển Backend Engineer có kinh nghiệm Node.js, Docker, AWS…" }
      : { field: "Technology" }),
    position,
    planAtTime: "free",
    completedAt: at(-daysAgo),
    createdAt: at(-daysAgo),
    result: {
      match: { score, matchedKeywords: matched, missingKeywords: missing },
      skills: { cv: matched.map((n) => ({ name: n, confidence: 0.9 })), jd: [...matched, ...missing].map((n) => ({ name: n, confidence: 0.9 })), matched, missing },
      scores: { clarity: 4, structure: 3.5, relevance: 4, credibility: 3.5 },
      suggestions: {
        executiveSummary: `CV phù hợp ${score}% với vị trí ${position}. Điểm mạnh là kinh nghiệm backend rõ ràng; điểm cần bổ sung là các từ khoá về hạ tầng và triển khai.`,
        missingSkillSuggestions: missing.map((s) => ({ skill: s, priority: "high", reason: `JD nhắc tới ${s} nhưng CV chưa đề cập.`, resources: ["https://roadmap.sh"] })),
        rewrittenBullets: [{ original: "Làm việc với team backend", rewritten: "Dẫn dắt 3 kỹ sư xây dựng service thanh toán xử lý 12.000 giao dịch/ngày, giảm 35% thời gian phản hồi", reasoning: "Thêm số liệu và vai trò cụ thể theo công thức STAR.", starElements: { situation: true, task: true, action: true, result: true } }],
      },
    },
    meta: { llmProvider: "groq", fallbackTriggered: false, endpoint: "/analyze/suggestions" },
  });

  const docs = await CVAnalysis.create([
    mk(users.student._id, "jd", 78, "Backend Engineer", 3, ["Node.js", "MongoDB", "REST API"], ["Docker", "AWS", "Kubernetes"]),
    mk(users.student._id, "field", 65, "Fullstack Developer", 9, ["JavaScript", "React"], ["TypeScript", "CI/CD"]),
    mk(users.pro._id, "jd", 91, "Senior Backend Engineer", 1, ["Node.js", "Docker", "AWS", "System Design"], ["Terraform"]),
    mk(users.free._id, "jd", 54, "Junior Developer", 5, ["HTML", "CSS"], ["React", "Git", "SQL"]),
    mk(users.free._id, "field", 61, "QA Engineer", 12, ["Manual Testing"], ["Selenium", "Automation"]),
  ]);
  log(`  ✓ ${docs.length} kết quả phân tích CV (lịch sử để test trang /cv-analysis/*/history)`);
  return docs;
}

async function createNotifications(users, bookings, mentors) {
  const n = (userId, type, title, body, daysAgo, isRead = false, metadata = {}) => ({
    userId, type, title, body, isRead, metadata, createdAt: at(-daysAgo),
    ...(isRead ? { readAt: at(-daysAgo + 0.1) } : {}),
  });

  const docs = await Notification.create([
    n(users.student._id, "booking_reminder", "Buổi hẹn ngày mai", `Bạn có buổi mock interview với ${mentors.senior.name} lúc 10:30 ngày mai.`, 0, false, { bookingId: bookings.upcoming._id, actionUrl: `/session/${bookings.upcoming._id}` }),
    n(users.student._id, "booking_completed", "Buổi hẹn đã hoàn thành", "Mentor đã gửi bản tổng kết buổi học. Đừng quên đánh giá mentor.", 11, true, { bookingId: bookings.done._id }),
    n(users.student._id, "plan_expiring", "Gói Student sắp hết hạn", "Gói của bạn hết hạn sau 5 ngày. Gia hạn để giữ quota phân tích CV.", 1),
    n(users.refund._id, "booking_cancelled", "Buổi hẹn bị hủy — đang hoàn tiền", "Mentor không tham gia buổi hẹn. Chúng tôi sẽ hoàn 100% số tiền, vui lòng cung cấp thông tin tài khoản nhận.", 2, false, { bookingId: bookings.refundPending._id, refundAmountVnd: 756_000, needsRefundAccount: true }),
    n(users.free._id, "system", "Chào mừng đến với ProInterview", "Bắt đầu bằng việc tải CV lên và phân tích với một mô tả công việc bạn quan tâm.", 15, true, { kind: "welcome" }),
    n(users.pro._id, "payment_success", "Thanh toán thành công", "Gói Professional (1 năm) đã được kích hoạt.", 30, true),
    n(users.pro._id, "course_enrolled", "Đã ghi danh khoá học", "Bạn vừa ghi danh khoá 'Luyện phỏng vấn System Design cho Senior Backend'.", 2),
  ]);
  log(`  ✓ ${docs.length} thông báo (có 1 welcome, 1 nhắc lịch, 1 chờ khai báo STK hoàn tiền)`);
  return docs;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("✗ Thiếu MONGO_URI. Điền vào backend/.env hoặc truyền qua biến môi trường.");
    process.exit(1);
  }

  if (isDryRun) {
    log("\n=== DRY RUN — không ghi gì vào DB ===\n");
    log("Sẽ tạo:");
    USERS.forEach((u) => log(`  • ${u.email.padEnd(28)} ${u.desc}`));
    log("\n  + 3 khoá học, 9 booking, 15 giao dịch, 3 ghi danh, 2 subscription,");
    log("    5 đánh giá, 3 báo cáo, 3 payout, 5 phân tích CV, 7 thông báo.\n");
    return;
  }

  await connectDatabase(uri);
  log(`\n=== Seed demo showcase — DB: ${mongoose.connection.db?.databaseName} ===\n`);

  log("[1/2] Dọn dữ liệu demo cũ…");
  await cleanDemo();

  if (isClean) {
    log("\n✓ Đã xóa sạch dữ liệu demo. Kết thúc (--clean).\n");
    await mongoose.disconnect();
    return;
  }

  log("\n[2/2] Tạo dữ liệu mới…");
  const users = await createUsers();
  const mentors = await createMentors(users);
  const courses = await createCourses(mentors);
  const enrollments = await createEnrollments(users, courses);
  const bookings = await createBookings(users, mentors);
  await createPayments(users, bookings, courses, enrollments);
  await createSubscriptions(users);
  await createReviews(users, mentors, courses, bookings);
  await createReports(users, mentors, bookings);
  await createPayouts(mentors, users);
  await createCvAnalyses(users);
  await createNotifications(users, bookings, mentors);

  log(`
=== Hoàn tất ===

Mật khẩu chung: ${PASSWORD}

HỌC VIÊN
  hv.free${EMAIL_DOMAIN}       Gói Free, đã dùng 2/3 lượt CV
  hv.student${EMAIL_DOMAIN}    Gói Student, có hoá đơn + khoá học + booking
  hv.pro${EMAIL_DOMAIN}        Gói Professional (năm)
  hv.refund${EMAIL_DOMAIN}     Đang chờ hoàn tiền (mentor no-show)

MENTOR
  mt.senior${EMAIL_DOMAIN}     Đủ dữ liệu: khoá học, booking, số dư rút được
  mt.new${EMAIL_DOMAIN}        Chờ admin duyệt hồ sơ
  mt.suspend${EMAIL_DOMAIN}    3 report — test tạm ngưng + hoàn tiền học viên
  mt.closable${EMAIL_DOMAIN}   Số dư = 0 → ĐÓNG tài khoản phải THÀNH CÔNG
  mt.blocked${EMAIL_DOMAIN}    Còn tiền treo → ĐÓNG phải trả 409 kèm blockers

Xóa toàn bộ dữ liệu demo:
  node src/scripts/seedDemoShowcase.js --clean
`);

  await mongoose.disconnect();
}

main().catch(async (e) => {
  console.error("\n✗ Seed thất bại:", e?.message || e);
  if (e?.errors) console.error(e.errors);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
