import mongoose from "mongoose";

const sepayWebhookEventSchema = new mongoose.Schema(
  {
    sepayId: { type: String, required: true, unique: true, index: true },
    transferType: { type: String, default: "" },
    transferAmount: { type: Number, default: 0 },
    orderRef: { type: String, default: "" },
    status: {
      type: String,
      enum: ["received", "processed", "ignored", "unmatched", "failed"],
      default: "received",
    },
    entityType: { type: String, default: "" },
    entityId: { type: String, default: "" },
    resultMessage: { type: String, default: "" },
    rawPayload: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true },
);

export const SepayWebhookEvent = mongoose.model("SepayWebhookEvent", sepayWebhookEventSchema);
