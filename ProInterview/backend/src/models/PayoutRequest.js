import mongoose from "mongoose";

const { Schema } = mongoose;

const payoutRequestSchema = new Schema(
  {
    mentorId: { type: Schema.Types.ObjectId, ref: "Mentor", required: true, index: true },
    amount: { type: Number, required: true, min: 1000 },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "processing", "paid"],
      default: "pending",
      index: true,
    },
    payoutAccount: {
      bankName: { type: String, required: true },
      accountNumber: { type: String, required: true },
      accountName: { type: String, required: true },
    },
    requestedAt: { type: Date, default: Date.now, index: true },
    reviewedAt: { type: Date, default: null },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    rejectReason: { type: String, default: "" },
    paidAt: { type: Date, default: null },
    transferRef: { type: String, default: "" },
    provider: { type: String, default: "manual" },
    providerRef: { type: String, default: "" },
    note: { type: String, default: "" },
  },
  { collection: "payout_requests", timestamps: true },
);

payoutRequestSchema.index({ mentorId: 1, status: 1, createdAt: -1 });

export const PayoutRequest =
  mongoose.models.PayoutRequest ?? mongoose.model("PayoutRequest", payoutRequestSchema);

