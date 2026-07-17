import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * MentorKnowledge — lưu insights mentor chia sẻ sau mỗi buổi coaching thật.
 * Dùng làm few-shot corpus cho AI question generation (Layer 3 — Mentor Loop).
 * Mỗi booking completed có tối đa 1 bản ghi (unique index bookingId).
 */
const mentorKnowledgeSchema = new Schema(
  {
    bookingId:    { type: Schema.Types.ObjectId, ref: "Booking", required: true, unique: true },
    mentorId:     { type: Schema.Types.ObjectId, ref: "Mentor",  required: true },
    mentorUserId: { type: Schema.Types.ObjectId, ref: "User",    required: true },

    // Context từ session — dùng để match few-shot khi generate câu hỏi
    menteeRole: { type: String, default: "", trim: true },
    field:      { type: String, default: "", trim: true },

    // Câu hỏi mentor thực sự hỏi trong buổi (few-shot gold standard)
    questionsAsked: [{ type: String, trim: true }],

    // Lỗi phổ biến ứng viên hay mắc cho role này
    commonMistakes: [{ type: String, trim: true }],

    // Điểm mạnh / insight ngắn (bullet points)
    keyInsights: [{ type: String, trim: true }],

    // Lời khuyên tổng quát dạng free-text (optional)
    fullAdvice: { type: String, default: "", trim: true },
  },
  { collection: "mentor_knowledge", timestamps: true }
);

mentorKnowledgeSchema.index({ mentorId: 1, createdAt: -1 });
// Few-shot lookup: tìm insights cùng field / role
mentorKnowledgeSchema.index({ field: 1 });
mentorKnowledgeSchema.index({ menteeRole: 1 });

export const MentorKnowledge =
  mongoose.models.MentorKnowledge ??
  mongoose.model("MentorKnowledge", mentorKnowledgeSchema);
