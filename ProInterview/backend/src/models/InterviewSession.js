import mongoose from "mongoose";

const questionSchema = new mongoose.Schema({
  index: Number,
  layer: String,
  question: String,
  competencyName: String,
  source: String
}, { _id: false });

const answerSchema = new mongoose.Schema({
  questionText: String,
  questionIndex: Number,
  transcript: String,
  audioUrl: String,
  score: Number,
  feedback: String
}, { _id: false });

const competencyProfileSchema = new mongoose.Schema({
  roleCategory: String,
  level: String,
  skills: [String]
}, { _id: false });

const feedbackSchema = new mongoose.Schema({
  overallScore: Number,
  strengths: [String],
  weaknesses: [String],
  summary: String
}, { _id: false });

const interviewSessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    status: {
      type: String,
      enum: ["pending", "in_progress", "completed", "cancelled", "failed"],
      default: "pending",
      index: true
    },
    inferredRole: { type: String, default: "" },
    inferredSeniority: { type: String, default: "" },
    competencyProfile: { type: competencyProfileSchema },
    questions: { type: [questionSchema], default: [] },
    answers: { type: [answerSchema], default: [] },
    questionsAllowed: { type: Number, default: 5 },
    feedback: { type: feedbackSchema },
    completedAt: { type: Date }
  },
  {
    timestamps: true,
    collection: "interview_sessions"
  }
);

export const InterviewSession = mongoose.models.InterviewSession ?? mongoose.model("InterviewSession", interviewSessionSchema);
