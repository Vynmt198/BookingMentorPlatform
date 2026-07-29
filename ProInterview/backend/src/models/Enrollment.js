import mongoose from "mongoose";

const { Schema } = mongoose;

const enrollmentSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true },

    completedLessons: [{ type: Schema.Types.ObjectId }],
    lastLessonId: { type: Schema.Types.ObjectId },
    progressPercent: { type: Number, default: 0, min: 0, max: 100 },
    lastAccessedAt: { type: Date },

    /** Ghi chú học viên theo bài (CourseLearning). */
    lessonNotes: [
      {
        lessonId: { type: Schema.Types.ObjectId, required: true },
        content: { type: String, default: "" },
        updatedAt: { type: Date, default: Date.now },
      },
    ],

    isCompleted: { type: Boolean, default: false },
    completedAt: { type: Date },
    certificateUrl: { type: String, default: "" },
    certificateIssuedAt: { type: Date },

    pricePaid: { type: Number, default: 0 },
    platformFeeRate: { type: Number, default: null },
    /** null = chưa tính phí (phân biệt với 0đ phí thật) — xem resolveCourseFee trong mentorEarningsService.js. */
    platformFee: { type: Number, default: null },
    paymentRef: { type: String, default: "" },
    /** Hết hạn cửa sổ CK SePay (mặc định 15 phút từ lúc tạo ghi danh). */
    paymentExpiresAt: { type: Date },
    /**
     * pending = chờ CK; paid = đã học được (hoặc khóa miễn phí); expired = CK quá hạn, không xóa
     * document (giữ lại paymentRef để đối soát webhook trễ — xem sepayWebhookService.js). Bản ghi
     * cũ không có field → coi như paid.
     */
    paymentStatus: { type: String, enum: ["pending", "paid", "expired"], required: false },
    paymentMethod: { type: String, default: "" },
    transferSubmittedAt: { type: Date },
    /** Audit admin xác nhận CK */
    transferConfirmedAt: { type: Date },
    transferConfirmedBy: { type: Schema.Types.ObjectId, ref: "User" },
    transferForceConfirm: { type: Boolean, default: false },
    transferForceNote: { type: String, default: "" },
    paidAt: { type: Date },
    /** Đã ghi có thu nhập mentor + stats khóa (tránh cộng trùng). */
    mentorEarningsCreditedAt: { type: Date },
    /** Ngày tiền đủ điều kiện chuyển từ "đang giữ" sang "khả dụng" (paidAt + 3 ngày, tính từ lúc mua chứ không phải lúc học xong). */
    earningsClearAt: { type: Date },
    /** Đã thực sự release từ clearingBalance sang availableBalance. */
    earningsClearedAt: { type: Date },
    /**
     * Chốt số tiền mentor được nhận TẠI THỜI ĐIỂM ghi vào clearingBalance.
     * Lúc release phải trừ đúng số này, không tính lại từ `pricePaid`/`platformFee`.
     */
    earningsNetAmount: { type: Number },
    /** Release thất bại (mentor không tồn tại / số dư giữ không đủ) — cần admin xử lý tay. */
    earningsClearFailedAt: { type: Date },
  },
  { collection: "enrollments", timestamps: true }
);

/**
 * Unique theo cặp (userId, courseId) nhưng CHỈ áp dụng cho ghi danh còn "sống" (pending/paid) —
 * ghi danh "expired" không tính, để user ghi danh lại tạo được document mới (giống cách
 * Booking dùng partial unique index loại trừ status "cancelled"). MongoDB partial index không
 * hỗ trợ $ne — dùng $in liệt kê các trạng thái "sống".
 */
enrollmentSchema.index(
  { userId: 1, courseId: 1 },
  { unique: true, partialFilterExpression: { paymentStatus: { $in: ["pending", "paid"] } } },
);

export const Enrollment = mongoose.models.Enrollment ?? mongoose.model("Enrollment", enrollmentSchema);
