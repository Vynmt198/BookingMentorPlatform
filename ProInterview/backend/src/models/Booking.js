import mongoose from "mongoose";

const { Schema } = mongoose;

const rescheduleEntrySchema = new Schema(
  {
    oldDate: { type: String },
    oldTimeSlot: { type: String },
    newDate: { type: String },
    newTimeSlot: { type: String },
    reason: { type: String },
    changedBy: { type: String, enum: ["user", "mentor"] },
    changedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const bookingSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    mentorId: { type: Schema.Types.ObjectId, ref: "Mentor", required: true },

    date: { type: String, required: true },
    timeSlot: { type: String, required: true },
    durationMinutes: { type: Number, required: true },
    timezone: { type: String, default: "Asia/Ho_Chi_Minh" },

    sessionType: {
      type: String,
      enum: ["mock_interview", "cv_review", "career_consulting", "custom"],
      required: true,
    },
    notes: { type: String, default: "" },
    cvFileName: { type: String, default: "" },
    jdFileName: { type: String, default: "" },
    cvFileUrl: { type: String, default: "" },
    jdFileUrl: { type: String, default: "" },
    meetingLink: { type: String, default: "" },

    status: {
      type: String,
      enum: ["pending", "confirmed", "in_progress", "completed", "cancelled", "rescheduled", "no_show"],
      default: "pending",
    },

    price: { type: Number, required: true },
    platformFeeRate: { type: Number, default: 0.3 },
    platformFee: { type: Number, required: true },
    vat: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "refund_pending", "refunded", "partial_refund", "failed"],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      enum: ["momo", "zalopay", "vnpay", "card", "transfer", "plan_quota", ""],
      default: "",
    },
    paymentRef: { type: String, default: "" },
    /** Hết hạn cửa sổ CK SePay (mặc định 15 phút từ lúc tạo đơn). */
    paymentExpiresAt: { type: Date },
    /** Khách đã bấm “đã chuyển” và gửi mã tham chiếu CK (chờ admin xác nhận). */
    transferSubmittedAt: { type: Date },
    /** Audit admin xác nhận CK (để UI hiển thị truy vết, không cần join payments). */
    transferConfirmedAt: { type: Date },
    transferConfirmedBy: { type: Schema.Types.ObjectId, ref: "User" },
    transferForceConfirm: { type: Boolean, default: false },
    transferForceNote: { type: String, default: "" },
    paidAt: { type: Date },

    rescheduleHistory: [rescheduleEntrySchema],

    cancelledBy: { type: String, enum: ["user", "mentor", "system", ""], default: "" },
    cancelReason: { type: String, default: "" },
    cancelledAt: { type: Date },
    /** Bên vắng mặt buổi hẹn — khác nhau về hệ quả tài chính/vi phạm. */
    noShowBy: { type: String, enum: ["mentor", "customer", ""], default: "" },
    /** Sau mentor hủy (đã thanh toán): HV chọn đổi lịch / đổi mentor / hoàn tiền. */
    mentorCancelResolution: {
      type: String,
      enum: [
        "",
        "awaiting_user",
        "late_cancel_refund",
        "no_show_refund",
        "reschedule",
        "change_mentor",
        "refund",
      ],
      default: "",
    },
    mentorCancelResolutionAt: { type: Date },
    /** Credit đổi mentor sau mentor hủy (VND, từ số tiền đã thu). */
    rebookCreditVnd: { type: Number },
    rebookCreditStatus: {
      type: String,
      enum: ["", "available", "consumed"],
      default: "",
    },
    rebookCreditUsedOnBookingId: { type: Schema.Types.ObjectId, ref: "Booking" },
    /** Phần credit chưa dùng hết (mentor mới rẻ hơn) — chờ hoàn CK. */
    rebookCreditRemainderVnd: { type: Number },
    /** Booking mới dùng credit từ booking nguồn (đổi mentor). */
    creditSourceBookingId: { type: Schema.Types.ObjectId, ref: "Booking" },
    /** Snapshot khi user hủy (VND): số hoàn cho HV / số giữ lại / % hoàn (0–100). CK: admin chuyển hoàn theo `cancelRefundAmountVnd`. */
    cancelRefundAmountVnd: { type: Number },
    cancelRetainedAmountVnd: { type: Number },
    cancelRefundPercent: { type: Number },
    /** TK nhận hoàn — do HV khai báo khi hủy (CK công ty không lưu STK nguồn của khách). */
    refundReceiveBankName: { type: String, trim: true, default: "" },
    refundReceiveAccountNumber: { type: String, trim: true, default: "" },
    refundReceiveAccountHolder: { type: String, trim: true, default: "" },
    /** Admin xác nhận đã CK hoàn cho HV (sau `refund_pending`). */
    refundCompletedAt: { type: Date },
    refundCompletedBy: { type: Schema.Types.ObjectId, ref: "User" },

    mentorNotes: { type: String, default: "" },
    /** Tổng kết buổi học có cấu trúc, mentor gửi sau khi booking đã completed. */
    mentorSummary: {
      rating: { type: Number, min: 1, max: 5 },
      strengths: { type: String, default: "", trim: true },
      improvements: { type: String, default: "", trim: true },
      recommendation: { type: String, default: "", trim: true },
      generalNotes: { type: String, default: "", trim: true },
      submittedAt: { type: Date },
      /** True nếu mentor gửi sau khi đã quá hạn FEEDBACK_REMINDER_DAYS kể từ completedAt. */
      submittedLate: { type: Boolean, default: false },
    },
    /** Đã nhắc mentor 1 lần khi quá hạn 3 ngày chưa gửi mentorSummary (tránh nhắc lặp lại mỗi lần load). */
    feedbackReminderSentAt: { type: Date },
    reviewId: { type: Schema.Types.ObjectId, ref: "Review" },
    completedAt: { type: Date },
    /** Đã ghi có thu nhập vào ví mentor (tránh cộng trùng). */
    mentorEarningsCreditedAt: { type: Date },
    /** Ngày tiền đủ điều kiện chuyển từ "đang giữ" sang "khả dụng" (completedAt + 3 ngày). */
    earningsClearAt: { type: Date },
    /** Đã thực sự release từ clearingBalance sang availableBalance. */
    earningsClearedAt: { type: Date },
    /**
     * Chốt số tiền mentor được nhận TẠI THỜI ĐIỂM ghi vào clearingBalance.
     * Lúc release phải trừ đúng số này, không tính lại từ `totalAmount`/`platformFee` — nếu
     * booking bị hoàn tiền một phần ở giữa, số tính lại sẽ lệch với số đã cộng vào.
     */
    earningsNetAmount: { type: Number },
    /** Release thất bại (mentor không tồn tại / số dư giữ không đủ) — cần admin xử lý tay. */
    earningsClearFailedAt: { type: Date },
    /** Ảnh check-in webcam mentor trước khi vào phòng họp. */
    mentorCheckInImageUrl: { type: String, default: "" },
    mentorCheckInAt: { type: Date },
    mentorCheckInUserId: { type: Schema.Types.ObjectId, ref: "User" },
    /** Ghi chú live mentor trong buổi (STT / tag nhanh). */
    mentorSessionCapture: {
      transcript: { type: String, default: "" },
      questionsAsked: [{ type: String, trim: true }],
      commonMistakes: [{ type: String, trim: true }],
      keyInsights: [{ type: String, trim: true }],
      updatedAt: { type: Date },
    },
  },
  { collection: "bookings", timestamps: true }
);

bookingSchema.index({ userId: 1, status: 1 });
bookingSchema.index({ mentorId: 1, date: 1 });
bookingSchema.index({ status: 1 });
/** Chặn double-booking cùng khung giờ ở tầng DB (không chỉ check ở code — tránh race condition). */
bookingSchema.index(
  { mentorId: 1, date: 1, timeSlot: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ["pending", "confirmed", "in_progress"] } } },
);

export const Booking = mongoose.models.Booking ?? mongoose.model("Booking", bookingSchema);
