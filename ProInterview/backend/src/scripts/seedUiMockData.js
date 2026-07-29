import mongoose from "mongoose";
import "../config/loadEnv.js";
import { connectDatabase } from "../db/connect.js";
import "../models/index.js";
import { User } from "../models/User.js";
import { Mentor } from "../models/Mentor.js";
import { Booking } from "../models/Booking.js";
import { Review } from "../models/Review.js";
import { PayoutRequest } from "../models/PayoutRequest.js";
import { Course } from "../models/Course.js";
import { createMentorProfileForUser } from "../services/mentorProfileService.js";
import { recalcMentorReviewStats } from "../services/reviewsService.js";

function daysAgoIso(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function ymd(date) {
  const d = new Date(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

async function ensureDevUsers() {
  const [admin, customer, mentorUser] = await Promise.all([
    User.findOne({ email: "admin@dev.local" }),
    User.findOne({ email: "customer@dev.local" }),
    User.findOne({ email: "mentor@dev.local" }),
  ]);
  if (!admin || !customer || !mentorUser) {
    throw new Error("Thiếu user dev mặc định. Hãy chạy `npm run seed:users` trước.");
  }
  return { admin, customer, mentorUser };
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

async function seedBookings({ customerId, mentorId }) {
  await Booking.deleteMany({ notes: "UI_MOCK" });
  const basePrice = 450000;
  const rows = [
    { daysAgo: 1, status: "confirmed", paymentStatus: "paid", timeSlot: "09:00", sessionType: "mock_interview" },
    { daysAgo: 3, status: "completed", paymentStatus: "paid", timeSlot: "10:30", sessionType: "cv_review" },
    { daysAgo: 5, status: "completed", paymentStatus: "paid", timeSlot: "14:00", sessionType: "career_consulting" },
    { daysAgo: 7, status: "cancelled", paymentStatus: "refunded", timeSlot: "16:00", sessionType: "custom" },
    { daysAgo: 9, status: "pending", paymentStatus: "pending", timeSlot: "19:00", sessionType: "mock_interview" },
    { daysAgo: 12, status: "completed", paymentStatus: "paid", timeSlot: "08:30", sessionType: "mock_interview" },
  ];
  await Booking.insertMany(
    rows.map((row, idx) => {
      const price = basePrice + idx * 25000;
      const platformFee = Math.round(price * 0.2);
      const vat = Math.round(price * 0.1);
      const createdAt = daysAgoIso(row.daysAgo);
      return {
        userId: customerId,
        mentorId,
        date: ymd(createdAt),
        timeSlot: row.timeSlot,
        durationMinutes: 60,
        timezone: "Asia/Ho_Chi_Minh",
        sessionType: row.sessionType,
        notes: "UI_MOCK",
        meetingLink: "https://meet.google.com/ui-mock-room",
        status: row.status,
        price,
        platformFee,
        vat,
        totalAmount: price + vat,
        paymentStatus: row.paymentStatus,
        paymentMethod: "transfer",
        paymentRef: `UI-MOCK-BOOKING-${idx + 1}`,
        paidAt: row.paymentStatus === "paid" ? createdAt : null,
        completedAt: row.status === "completed" ? createdAt : null,
        createdAt,
        updatedAt: createdAt,
      };
    }),
  );
}

async function seedPayouts({ mentor, adminId }) {
  await PayoutRequest.deleteMany({ providerRef: /^UI-MOCK-/ });
  const account = mentor.finance?.bankAccounts?.[0] || {
    bankName: "Vietcombank",
    accountNumber: "1234567890",
    accountName: mentor.name || "Mentor Dev",
  };
  const rows = [
    { amount: 300000, status: "pending", requestedAt: daysAgoIso(1), reviewedAt: null, rejectReason: "", note: "" },
    {
      amount: 450000,
      status: "approved",
      requestedAt: daysAgoIso(4),
      reviewedAt: daysAgoIso(3),
      rejectReason: "",
      note: "Đã duyệt theo lịch thanh toán tuần.",
    },
    {
      amount: 250000,
      status: "rejected",
      requestedAt: daysAgoIso(8),
      reviewedAt: daysAgoIso(7),
      rejectReason: "Thông tin tài khoản nhận tiền không khớp hồ sơ. Ghi chú: Vui lòng cập nhật lại STK trùng thông tin xác minh.",
      note: "",
    },
  ];
  await PayoutRequest.insertMany(
    rows.map((row, idx) => ({
      mentorId: mentor._id,
      amount: row.amount,
      status: row.status,
      payoutAccount: {
        bankName: account.bankName || "Vietcombank",
        accountNumber: account.accountNumber || "1234567890",
        accountName: account.accountName || mentor.name || "Mentor Dev",
      },
      requestedAt: row.requestedAt,
      reviewedAt: row.reviewedAt,
      reviewedBy: row.reviewedAt ? adminId : null,
      rejectReason: row.rejectReason,
      note: row.note,
      provider: "manual",
      providerRef: `UI-MOCK-PAYOUT-${idx + 1}`,
      createdAt: row.requestedAt,
      updatedAt: row.reviewedAt || row.requestedAt,
    })),
  );
}

async function updateMentorFinanceSnapshot(mentorId) {
  await Mentor.updateOne(
    { _id: mentorId },
    {
      $set: {
        "finance.availableBalance": 1800000,
        "finance.pendingBalance": 300000,
        "finance.totalEarned": 5200000,
        "finance.bankAccounts": [
          {
            bankName: "Vietcombank",
            accountNumber: "1234567890",
            accountName: "Mentor Dev",
            isDefault: true,
            createdAt: new Date(),
          },
        ],
      },
    },
  );
}

function makeWorkJson() {
  const now = new Date();
  const start1 = new Date(now.getFullYear() - 4, now.getMonth(), 1);
  const sm1 = `${start1.getFullYear()}-${String(start1.getMonth() + 1).padStart(2, "0")}`;
  const start2 = new Date(now.getFullYear() - 7, now.getMonth(), 1);
  const sm2 = `${start2.getFullYear()}-${String(start2.getMonth() + 1).padStart(2, "0")}`;
  const end2 = `${start1.getFullYear()}-${String(start1.getMonth() + 1).padStart(2, "0")}`;
  return JSON.stringify({
    version: 1,
    entries: [
      {
        role: "Senior Software Engineer",
        company: "VNG Corporation",
        startMonth: sm1,
        endMonth: "",
        isCurrent: true,
        note: "- Thiết kế và xây dựng backend microservices cho hệ thống thanh toán ZaloPay.\n- Phụ trách API Gateway, xác thực JWT và rate limiting.\n- Mentor nội bộ: hỗ trợ junior engineer chuẩn bị phỏng vấn cấp Senior.",
      },
      {
        role: "Software Engineer",
        company: "FPT Software",
        startMonth: sm2,
        endMonth: end2,
        isCurrent: false,
        note: "- Phát triển module quản lý đơn hàng cho nền tảng thương mại điện tử xuất khẩu.\n- Tích hợp REST API với đối tác quốc tế (Nhật Bản, Hàn Quốc).",
      },
    ],
  });
}

async function patchMentorProfile(mentor) {
  await Mentor.updateOne(
    { _id: mentor._id },
    {
      $set: {
        title: "Senior Software Engineer",
        company: "VNG Corporation",
        companies: ["VNG Corporation", "FPT Software"],
        experienceYears: 7,
        bio: "7+ năm kinh nghiệm phát triển phần mềm tại VNG và FPT Software. Chuyên sâu backend Node.js, thiết kế hệ thống phân tán và API. Đã mock interview cho 40+ ứng viên vị trí Software Engineer, giúp nhiều bạn pass vòng technical tại top tech company Việt Nam.",
        profileWorkExperience: makeWorkJson(),
        profileEducation: "Đại học Bách Khoa TP.HCM — Khoa Khoa học và Kỹ thuật Máy tính (2013–2017)",
        profileAwards:
          "- Top 10 Hackathon VNG Innovation 2022\n- Chứng chỉ AWS Certified Solutions Architect – Associate\n- Giải Nhì cuộc thi lập trình sinh viên ICPC Việt Nam khu vực miền Nam 2016",
        specialties: [
          "Node.js",
          "JavaScript",
          "System Design",
          "REST API",
          "Microservices",
          "React",
          "PostgreSQL",
          "Docker",
        ],
        fields: ["IT", "Fullstack", "Backend"],
        recurringSchedule: [
          { dayOfWeek: 2, slots: ["19:00", "20:00"] },
          { dayOfWeek: 4, slots: ["19:00", "20:00"] },
          { dayOfWeek: 6, slots: ["09:00", "10:00", "14:00"] },
        ],
        isVerified: true,
        isActive: true,
        available: true,
        responseTime: "< 2 giờ",
      },
    },
  );
}

async function seedMentorReviews({ mentor, customers }) {
  const SEED_TAG = "seed-ui-mock-reviews";
  const rows = [
    {
      userId: customers[0]._id,
      rating: 5,
      comment:
        "Buổi mock interview cực kỳ thực tế. Mentor phân tích từng câu trả lời, chỉ rõ điểm yếu về STAR method và cách trình bày system design. Nhờ vậy mình pass vòng technical tại Tiki.",
      reply: {
        content: "Chúc mừng bạn pass! Tiếp tục ôn luyện distributed system và caching pattern nhé.",
        repliedAt: new Date(),
      },
      daysAgo: 5,
    },
    {
      userId: customers[1] ? customers[1]._id : customers[0]._id,
      rating: 5,
      comment:
        "Mentor rất nhiệt tình, đúng giờ và chuẩn bị câu hỏi sát với vị trí mình apply. Feedback chi tiết giúp mình tự tin hơn rất nhiều.",
      daysAgo: 12,
    },
    {
      userId: customers[2] ? customers[2]._id : customers[0]._id,
      rating: 4,
      comment:
        "Nội dung mock interview tốt, hỏi nhiều dạng câu hỏi behavioral và technical. Chỉ hơi nhanh ở phần system design, mình chưa kịp ghi chú hết. Nhưng nhìn chung rất hữu ích.",
      daysAgo: 20,
    },
    {
      userId: customers[3] ? customers[3]._id : customers[0]._id,
      rating: 5,
      comment:
        "Đặt 2 buổi, lần nào mentor cũng chuẩn bị câu hỏi phù hợp level và tech stack của mình. Recommend cho ai muốn apply Backend Engineer.",
      daysAgo: 30,
    },
    {
      userId: customers[4] ? customers[4]._id : customers[0]._id,
      rating: 4,
      comment:
        "Mentor giải thích các khái niệm system design rõ ràng, có ví dụ thực tế từ dự án của mentor. Mình học được cách organize câu trả lời tốt hơn nhiều.",
      daysAgo: 45,
    },
  ];

  for (const row of rows) {
    const createdAt = daysAgoIso(row.daysAgo);
    const payload = {
      userId: row.userId,
      targetType: "mentor",
      targetId: mentor._id,
      rating: row.rating,
      comment: row.comment,
      tags: [SEED_TAG],
      isVerified: true,
      isVisible: true,
      createdAt,
      updatedAt: createdAt,
    };
    if (row.reply) payload.reply = row.reply;
    await Review.findOneAndUpdate(
      { userId: row.userId, targetType: "mentor", targetId: mentor._id },
      { $set: payload },
      { upsert: true },
    );
  }

  await recalcMentorReviewStats(mentor._id);
}

const CLOUDINARY_VIDEOS = [
  "https://res.cloudinary.com/dee4bvivu/video/upload/v1774340828/FQ1vid_rdw1xo.mp4",
  "https://res.cloudinary.com/dee4bvivu/video/upload/v1774340833/FQ2vid_vmp7ae.mp4",
  "https://res.cloudinary.com/dee4bvivu/video/upload/v1774340829/FQ3vid_glpon5.mp4",
  "https://res.cloudinary.com/dee4bvivu/video/upload/v1774340828/MQ1vid_hngp8o.mp4",
  "https://res.cloudinary.com/dee4bvivu/video/upload/v1774340832/MQ2vid_xaioj6.mp4",
  "https://res.cloudinary.com/dee4bvivu/video/upload/v1774340829/MQ3vid_h7t02k.mp4",
  "https://res.cloudinary.com/dee4bvivu/video/upload/v1774336640/Female_delxmy.mp4",
  "https://res.cloudinary.com/dee4bvivu/video/upload/v1774336646/Male_jioqsx.mp4",
];

function buildCourseModules(prefix, v0, v1, v2) {
  return [
    {
      title: `${prefix} — Nền tảng`,
      order: 1,
      lessons: [
        { title: `Giới thiệu ${prefix}`, type: "video", videoUrl: v0, durationMinutes: 15, description: `Tổng quan lộ trình và kỳ vọng sau khóa ${prefix}`, transcript: "", resources: [], order: 1, isFree: true },
        { title: `Câu hỏi thường gặp — ${prefix}`, type: "video", videoUrl: v1, durationMinutes: 22, description: "Phân tích dạng câu hỏi phỏng vấn và cách trả lời có cấu trúc", transcript: "", resources: [], order: 2, isFree: false },
      ],
    },
    {
      title: `${prefix} — Thực hành`,
      order: 2,
      lessons: [
        { title: `Mock drill — ${prefix}`, type: "video", videoUrl: v2, durationMinutes: 28, description: "Buổi luyện tập mô phỏng phỏng vấn có hướng dẫn", transcript: "", resources: [], order: 1, isFree: false },
        { title: `Tự đánh giá — ${prefix}`, type: "quiz", durationMinutes: 8, description: "Bài kiểm tra nhanh sau phần thực hành", transcript: "", resources: [], order: 2, isFree: false },
      ],
    },
  ];
}

async function seedCourses(mentorId) {
  const SEED_TAG = "seed-ui-mock-courses";
  const today = new Date();
  const publishedAt = new Date(today);
  publishedAt.setDate(today.getDate() - 7);

  const courseDefs = [
    {
      title: "React & TypeScript — Chuẩn bị phỏng vấn Frontend",
      shortDescription: "Luyện React, TypeScript và system design UI cho vị trí Frontend mid–senior.",
      description: "Khóa học tập trung vào câu hỏi phỏng vấn Frontend thực tế: hooks, performance, state management, TypeScript patterns và cách trình bày case study UI.",
      level: "intermediate",
      tags: ["frontend", "react", "typescript", SEED_TAG],
      topics: ["Technical"],
      whatYoullLearn: ["Trả lời câu hỏi React/TypeScript có cấu trúc", "Giải thích trade-off performance và rendering", "Trình bày system design UI rõ ràng"],
      requirements: ["Biết JavaScript cơ bản", "Đã làm ít nhất 1 project React"],
      thumbnail: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&q=80",
      price: 490000,
      modules: buildCourseModules("Frontend Interview", CLOUDINARY_VIDEOS[0], CLOUDINARY_VIDEOS[1], CLOUDINARY_VIDEOS[2]),
      stats: { enrollmentCount: 24, rating: 4.8, reviewCount: 11, completionRate: 82 },
    },
    {
      title: "Phỏng vấn hành vi — STAR Method thực chiến",
      shortDescription: "Xây dựng câu trả lời behavioral sắc bén theo STAR, áp dụng cho mọi vị trí.",
      description: "Hướng dẫn toàn diện kỹ năng trả lời câu hỏi behavioral: STAR method, storytelling, cách xử lý câu hỏi khó và tạo ấn tượng với nhà tuyển dụng.",
      level: "basic",
      tags: ["behavioral", "soft-skills", "interview", SEED_TAG],
      topics: ["Behavioral"],
      whatYoullLearn: ["Áp dụng STAR method thành thạo", "Kể story thuyết phục và có cấu trúc", "Xử lý câu hỏi khó như 'điểm yếu', 'conflict', 'thất bại'"],
      requirements: ["Không yêu cầu kinh nghiệm trước"],
      thumbnail: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=80",
      price: 350000,
      modules: buildCourseModules("Behavioral Interview", CLOUDINARY_VIDEOS[6], CLOUDINARY_VIDEOS[7], CLOUDINARY_VIDEOS[3]),
      stats: { enrollmentCount: 41, rating: 4.9, reviewCount: 18, completionRate: 90 },
    },
    {
      title: "System Design — Thiết kế hệ thống cho Senior",
      shortDescription: "Luyện tư duy thiết kế hệ thống phân tán cho vị trí Senior/Staff Engineer.",
      description: "Khóa nâng cao cho kỹ sư Senior: scalability, distributed systems, database design, caching, load balancing và cách trình bày system design interview.",
      level: "advanced",
      tags: ["system-design", "backend", "architecture", SEED_TAG],
      topics: ["Technical"],
      whatYoullLearn: ["Thiết kế hệ thống scalable có cấu trúc", "Giải thích trade-off CAP theorem, consistency", "Trình bày diagram và justify quyết định kỹ thuật"],
      requirements: ["Có kinh nghiệm backend 3+ năm", "Hiểu cơ bản về database và API"],
      thumbnail: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&q=80",
      price: 690000,
      modules: buildCourseModules("System Design", CLOUDINARY_VIDEOS[3], CLOUDINARY_VIDEOS[4], CLOUDINARY_VIDEOS[5]),
      stats: { enrollmentCount: 15, rating: 4.7, reviewCount: 8, completionRate: 78 },
    },
    {
      title: "Fullstack Node.js + React — Từ Fresher đến Mid",
      shortDescription: "API design, React patterns và behavioral cho ứng viên fullstack startup.",
      description: "Lộ trình ngắn gọn cho fresher–mid: REST API, auth, React component design và cách kể project fullstack trong phỏng vấn.",
      level: "basic",
      tags: ["fullstack", "nodejs", "react", SEED_TAG],
      topics: ["Technical", "Behavioral"],
      whatYoullLearn: ["Thiết kế REST API rõ ràng", "Kể project fullstack theo STAR", "Trả lời câu hỏi React/Node phổ biến"],
      requirements: ["Biết HTML/CSS/JS", "Đã học qua Node hoặc React"],
      thumbnail: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&q=80",
      price: 390000,
      modules: buildCourseModules("Fullstack Interview", CLOUDINARY_VIDEOS[6], CLOUDINARY_VIDEOS[7], CLOUDINARY_VIDEOS[0]),
      stats: { enrollmentCount: 32, rating: 4.6, reviewCount: 14, completionRate: 85 },
    },
    {
      title: "Data Engineer — SQL, Spark & Pipeline Design",
      shortDescription: "Luyện phỏng vấn Data Engineer: SQL, Spark, modeling và pipeline thực tế.",
      description: "Khóa nâng cao cho data engineer: query optimization, batch/stream pipeline, data modeling và cách trình bày project data warehouse.",
      level: "advanced",
      tags: ["data", "sql", "spark", SEED_TAG],
      topics: ["Technical"],
      whatYoullLearn: ["Viết và tối ưu SQL cho interview", "Giải thích Spark và pipeline batch", "Trình bày data modeling và trade-off"],
      requirements: ["Biết SQL cơ bản", "Có project data hoặc analytics"],
      thumbnail: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80",
      price: 0,
      isFree: true,
      modules: buildCourseModules("Data Engineer Interview", CLOUDINARY_VIDEOS[3], CLOUDINARY_VIDEOS[5], CLOUDINARY_VIDEOS[7]),
      stats: { enrollmentCount: 12, rating: 5.0, reviewCount: 6, completionRate: 91 },
    },
    {
      title: "Negotiation & Offer — Đàm phán lương tự tin",
      shortDescription: "Kỹ năng đàm phán offer, counter-offer và chiến lược thương lượng lương hiệu quả.",
      description: "Hướng dẫn thực tế về đàm phán lương: cách nghiên cứu mức thị trường, kỹ thuật counter-offer, xử lý áp lực deadline và giữ quan hệ tốt với nhà tuyển dụng.",
      level: "intermediate",
      tags: ["negotiation", "salary", "career", SEED_TAG],
      topics: ["Behavioral"],
      whatYoullLearn: ["Nghiên cứu và định giá bản thân theo thị trường", "Script đàm phán và counter-offer thực tế", "Xử lý tình huống offer deadline và áp lực"],
      requirements: ["Đang trong quá trình tìm việc hoặc có offer"],
      thumbnail: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&q=80",
      price: 290000,
      modules: buildCourseModules("Salary Negotiation", CLOUDINARY_VIDEOS[7], CLOUDINARY_VIDEOS[6], CLOUDINARY_VIDEOS[1]),
      stats: { enrollmentCount: 28, rating: 4.8, reviewCount: 13, completionRate: 88 },
    },
  ];

  let created = 0;
  for (const def of courseDefs) {
    const totalLessons = def.modules.reduce((s, m) => s + m.lessons.length, 0);
    const totalDurationMinutes = def.modules.reduce(
      (s, m) => s + m.lessons.reduce((ls, l) => ls + (l.durationMinutes || 0), 0),
      0,
    );
    const courseData = {
      mentorId,
      title: def.title,
      shortDescription: def.shortDescription,
      description: def.description,
      thumbnail: def.thumbnail,
      level: def.level,
      tags: def.tags,
      topics: def.topics,
      whatYoullLearn: def.whatYoullLearn,
      requirements: def.requirements,
      modules: def.modules,
      settings: { autoEnroll: true, certificateEnabled: true, qaEnabled: true },
      isFree: def.isFree || false,
      price: def.price,
      discountPrice: 0,
      discountEndsAt: null,
      stats: def.stats,
      status: "published",
      publishedAt,
      totalLessons,
      totalDurationMinutes,
    };
    await Course.findOneAndUpdate({ title: def.title }, { $set: courseData }, { upsert: true });
    created += 1;
  }
  console.log(`  ✓ ${created} khóa học đã được seed/cập nhật`);
}

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("Thiếu MONGO_URI trong .env");
    process.exit(1);
  }
  await connectDatabase(uri);
  const { admin, customer, mentorUser } = await ensureDevUsers();
  const mentor = await ensureMentorProfile(mentorUser);

  await patchMentorProfile(mentor);

  const customers = await User.find({ role: "customer" }).limit(5).lean();
  if (customers.length) {
    await seedMentorReviews({ mentor, customers });
  }

  await seedBookings({ customerId: customer._id, mentorId: mentor._id });
  await seedPayouts({ mentor, adminId: admin._id });
  await updateMentorFinanceSnapshot(mentor._id);

  console.log("Seeding khóa học...");
  await seedCourses(mentor._id);

  console.log("Da seed du lieu UI mock thanh cong.");
  console.log("- Admin: admin@dev.local / Dev123456");
  console.log("- Mentor: mentor@dev.local / Dev123456");
  console.log("- Customer: customer@dev.local / Dev123456");

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error("Seed UI mock that bai:", error?.message || error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
