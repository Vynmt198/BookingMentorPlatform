import { Check } from "lucide-react";

const STEPS = [
  { key: "extracting_cv",        label: "Đọc CV",                           duration: 3 },
  { key: "analyzing_role",       label: "Phân tích vai trò & competencies", duration: 5 },
  { key: "generating_questions", label: "Tạo câu hỏi phỏng vấn",           duration: 30 },
  { key: "creating_session",     label: "Chuẩn bị phiên phỏng vấn",        duration: 3 },
  { key: "pregenerating_videos", label: "Tạo video HR lipsync",             duration: 70 },
];

// Map real loadingStep values to visual positions.
// "analyzing_role" is never set by Interview.jsx, it completes "instantly"
// when transitioning from extracting_cv → generating_questions.
const STEP_INDEX = {
  extracting_cv:        0,
  extracting_jd:        0,
  generating_questions: 2,
  creating_session:     3,
  pregenerating_videos: 4,
};

export function InterviewLoadingState({ currentStep }) {
  const currentIdx = STEP_INDEX[currentStep] ?? 0;

  return (
    <div className="flex flex-col gap-4">
      {STEPS.map((step, i) => {
        const isDone    = i < currentIdx;
        const isActive  = i === currentIdx;

        return (
          <div key={step.key} className="flex items-center gap-3">
            <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
              {isDone && (
                <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Check className="w-3.5 h-3.5 text-emerald-600" strokeWidth={2.5} />
                </div>
              )}
              {isActive && (
                <span className="w-6 h-6 rounded-full border-2 border-violet-200 border-t-violet-600 animate-spin block" />
              )}
              {!isDone && !isActive && (
                <div className="w-6 h-6 rounded-full border-2 border-slate-200" />
              )}
            </div>

            <div className="flex-1 flex items-center gap-2 min-w-0">
              <span
                className={`text-sm ${
                  isDone
                    ? "text-slate-400 line-through"
                    : isActive
                      ? "text-slate-800 font-semibold"
                      : "text-slate-400"
                }`}
              >
                {step.label}
              </span>
              {isActive && (
                <span className="text-xs text-slate-400 flex-shrink-0">~{step.duration}s</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
