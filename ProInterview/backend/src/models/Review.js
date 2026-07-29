import mongoose from "mongoose";

const { Schema } = mongoose;

const reviewSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },

    targetType: { type: String, enum: ["mentor", "course"], required: true },
    targetId: { type: Schema.Types.ObjectId, required: true },
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking" },

    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: "" },
    tags: [{ type: String }],
    attachments: [{ name: String, url: String }],

    reply: {
      content: { type: String, default: "" },
      repliedAt: { type: Date },
    },

    isVerified: { type: Boolean, default: false },
    isVisible: { type: Boolean, default: true },
  },
  { collection: "reviews", timestamps: true }
);

reviewSchema.index({ targetType: 1, targetId: 1 });
// Course: 1 review/user/course (no booking). Mentor: 1 review/user/mentor/booking — mỗi buổi
// mentor hoàn thành được đánh giá riêng, không giới hạn 1 review/mentor suốt đời.
reviewSchema.index(
  { userId: 1, targetType: 1, targetId: 1 },
  { unique: true, partialFilterExpression: { targetType: "course" } }
);
reviewSchema.index(
  { userId: 1, targetType: 1, targetId: 1, bookingId: 1 },
  { unique: true, partialFilterExpression: { targetType: "mentor" } }
);

export const Review = mongoose.models.Review ?? mongoose.model("Review", reviewSchema);
