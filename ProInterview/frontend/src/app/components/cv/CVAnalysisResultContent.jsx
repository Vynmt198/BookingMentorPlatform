import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Zap,
  AlertTriangle as Warning,
  Info,
  Mic,
  Users,
  PlusCircle,
  RotateCcw as History,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import { CVDocumentPreview } from "./CVDocumentPreview";
import { formatSuggestionDisplayReason } from "../../utils/cvMappers.js";
import {
  CV_FIELD_ANALYSIS_PATH,
  CV_FIELD_HISTORY_PATH,
  CV_JD_ANALYSIS_PATH,
  CV_JD_HISTORY_PATH,
} from "./CvJdAnalysisTabs";

const DEMO_MATCHED = ["React", "TypeScript", "Node.js", "REST API", "Agile", "Git"];
const DEMO_JD_KWS = [
  "React",
  "TypeScript",
  "Node.js",
  "Docker",
  "AWS",
  "CI/CD",
  "REST API",
  "PostgreSQL",
  "Agile",
  "Git",
];
const DEMO_SCORES = [
  {
    criteria: "Clarity (Rõ ràng)",
    score: 7,
    max: 10,
    status: "good",
    note: "CV có cấu trúc khá rõ, các mục được trình bày logic.",
  },
  {
    criteria: "Structure (STAR)",
    score: 6,
    max: 10,
    status: "ok",
    note: "Phần kinh nghiệm chưa theo format STAR đầy đủ.",
  },
  {
    criteria: "Relevance (Liên quan JD)",
    score: 8,
    max: 10,
    status: "good",
    note: "6/10 từ khóa kỹ thuật trong JD có trong CV.",
  },
  {
    criteria: "Credibility (Thuyết phục)",
    score: 5,
    max: 10,
    status: "warn",
    note: "Thiếu số liệu KPI cụ thể.",
  },
];
const DEMO_SUGGESTIONS = [
  {
    type: "fix",
    priority: "high",
    title: 'Cải thiện bullet: "Tối ưu hiệu năng React…"',
    reason: "STAR + KPI",
    before: "• Tối ưu hiệu năng React",
    after: "• Phân tích bottleneck…",
    keywordsAdded: ["lazy loading"],
    starCheck: { situation: true, action: true, result: true },
    confidence: "high",
  },
];

export function CVAnalysisResultContent({
  routeMode,
  analysisResult,
  historySaveWarning = null,
  cvFile = null,
  jdFile = null,
  cvFileUrl = null,
  jdFileUrl = null,
  cvFileName,
  jdFileName,
  analysisPath,
  historyPath,
}) {
  const navigate = useNavigate();
  const [feedbackState, setFeedbackState] = useState(null);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [showAllStrengths, setShowAllStrengths] = useState(false);
  const [showAllWeaknesses, setShowAllWeaknesses] = useState(false);
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);

  const handleFeedback = (rating) => {
    setFeedbackState(rating);
    setFeedbackSent(true);
  };

  const R = analysisResult;
  const derivedMode = routeMode === "field" ? "field" : routeMode === "jd" ? "jd" : "cv-only";
  const matchScore = Number(R?.matchScore ?? 72);
  const matchedKeywords = Array.isArray(R?.matchedKeywords) ? R.matchedKeywords : DEMO_MATCHED;
  const missingKeywords = Array.isArray(R?.missingKeywords)
    ? R.missingKeywords
    : DEMO_JD_KWS.filter((kw) => !DEMO_MATCHED.includes(kw));
  const cvDisplayKWs = matchedKeywords;
  const jdDisplayKWs =
    derivedMode === "jd" ? [...matchedKeywords, ...missingKeywords] : matchedKeywords;
  const matchedSet = useMemo(() => new Set(matchedKeywords), [matchedKeywords]);
  const sourceScores = R?.scores ?? {};
  const scoreNotes = R?.scoreNotes ?? {};
  const relevanceLabel =
    derivedMode === "field"
      ? "Relevance (Ngành)"
      : derivedMode === "jd"
        ? "Relevance (Liên quan JD)"
        : "Relevance (Vai trò)";
  const scoreTableData = R
    ? [
        {
          criteria: "Clarity (Rõ ràng)",
          score: Number(sourceScores.clarity ?? 0),
          max: 10,
          status:
            Number(sourceScores.clarity ?? 0) >= 8
              ? "good"
              : Number(sourceScores.clarity ?? 0) >= 6
                ? "ok"
                : "warn",
          note: scoreNotes.clarity ?? "",
        },
        {
          criteria: "Structure (STAR)",
          score: Number(sourceScores.structure ?? 0),
          max: 10,
          status:
            Number(sourceScores.structure ?? 0) >= 8
              ? "good"
              : Number(sourceScores.structure ?? 0) >= 6
                ? "ok"
                : "warn",
          note: scoreNotes.structure ?? "",
        },
        {
          criteria: relevanceLabel,
          score: Number(sourceScores.relevance ?? 0),
          max: 10,
          status:
            Number(sourceScores.relevance ?? 0) >= 8
              ? "good"
              : Number(sourceScores.relevance ?? 0) >= 6
                ? "ok"
                : "warn",
          note: scoreNotes.relevance ?? "",
        },
        {
          criteria: "Credibility (Thuyết phục)",
          score: Number(sourceScores.credibility ?? 0),
          max: 10,
          status:
            Number(sourceScores.credibility ?? 0) >= 8
              ? "good"
              : Number(sourceScores.credibility ?? 0) >= 6
                ? "ok"
                : "warn",
          note: scoreNotes.credibility ?? "",
        },
      ]
    : DEMO_SCORES;
  const suggestionDisplayMode = derivedMode === "field" ? "field" : "jd";
  const suggestionsData = Array.isArray(R?.suggestions) ? R.suggestions : DEMO_SUGGESTIONS;
  const strengthsData = Array.isArray(R?.strengths) ? R.strengths : [];
  const weaknessesData = Array.isArray(R?.weaknesses) ? R.weaknesses : [];
  const resolvedHistoryPath =
    historyPath ?? (routeMode === "field" ? CV_FIELD_HISTORY_PATH : CV_JD_HISTORY_PATH);
  const resolvedAnalysisPath =
    analysisPath ?? (routeMode === "field" ? CV_FIELD_ANALYSIS_PATH : CV_JD_ANALYSIS_PATH);
  const missingKws = jdDisplayKWs.filter((kw) => !matchedSet.has(kw));

  return (
    <div className="flex flex-col gap-6 px-4 py-6 sm:px-8 sm:py-8">
      {R?.fallbackTriggered && (
        <div
          className="flex items-start gap-3 rounded-sm border border-slate-200 bg-slate-50 px-5 py-4"
          role="status"
        >
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-800">Kết quả minh họa (demo)</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              Dịch vụ phân tích AI tạm thời không phản hồi nên hệ thống hiển thị dữ liệu mẫu thay
              vì kết quả phân tích thật. Vui lòng thử phân tích lại sau ít phút.
            </p>
          </div>
        </div>
      )}
      {historySaveWarning && (
        <div
          className="flex items-start gap-3 rounded-sm border border-amber-200/90 bg-amber-50 px-5 py-4"
          role="status"
        >
          <Warning className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-amber-950">Chưa lưu vào lịch sử</p>
            <p className="mt-1 text-xs leading-relaxed text-amber-900/90">{historySaveWarning}</p>
          </div>
        </div>
      )}

      <div className="flex flex-col items-center gap-4 rounded-full border border-slate-200/60 bg-[#faf9ff] p-2 pr-6 sm:flex-row">
        <div className="flex shrink-0 items-center justify-center rounded-full border border-slate-100 bg-white px-6 py-3 shadow-sm">
          <span className="text-[11px] font-black uppercase tracking-widest text-[#3e2b66]">
            {matchScore >= 80
              ? "ĐẠT YÊU CẦU TỐT"
              : matchScore >= 50
                ? "CẦN CẢI THIỆN THÊM"
                : "KHÔNG PHÙ HỢP"}
          </span>
        </div>
        <p className="text-center text-sm font-medium text-[#4a3b70] sm:text-left">
          {matchScore >= 80
            ? "CV của bạn rất ấn tượng và bám sát yêu cầu. Chỉ cần vài chỉnh sửa nhỏ để hồ sơ trở nên hoàn hảo."
            : matchScore >= 50
              ? "CV ở mức khá. Hãy xem kỹ các gợi ý bên dưới để bổ sung từ khóa và cấu trúc lại cách viết kinh nghiệm."
              : "CV hiện tại có vẻ chưa thực sự phù hợp với yêu cầu. Bạn có thể cân nhắc bổ sung thêm kinh nghiệm hoặc thử một vị trí phù hợp hơn với năng lực."}
        </p>
      </div>

      <div className="flex flex-col items-center gap-8 rounded-sm border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:p-8">
        <div className="flex flex-shrink-0 flex-col items-center">
          <div className="relative h-36 w-36">
            <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
              <path
                d="M 50,50 m -45,0 a 45,45 0 1,1 90,0 a 45,45 0 1,1 -90,0"
                fill="none"
                stroke="#f1f5f9"
                strokeWidth="8"
              />
              <path
                d="M 50,50 m -45,0 a 45,45 0 1,1 90,0 a 45,45 0 1,1 -90,0"
                fill="none"
                stroke="#8037f4"
                strokeWidth="8"
                strokeDasharray={`${matchScore * 2.827} 282.7`}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-black leading-none tracking-tight text-slate-900">
                {matchScore}
              </span>
              <span className="mt-1 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                /100
              </span>
            </div>
          </div>
          <p className="mt-5 text-[11px] font-bold uppercase tracking-widest text-slate-500">
            ĐỘ KHỚP TỔNG THỂ
          </p>
        </div>

        <div className="flex-1 border-t border-slate-100 pt-6 text-center sm:border-l sm:border-t-0 sm:pl-8 sm:pt-0 sm:text-left">
          <p className="text-sm leading-relaxed text-slate-600">
            {R?.summary
              ? String(R.summary).replace(/^[✨⭐]\s*/u, "").trim()
              : derivedMode === "jd"
                ? `CV của bạn đã khớp ${cvDisplayKWs.length}/${jdDisplayKWs.length} từ khóa quan trọng trong mô tả công việc. Cần tập trung cải thiện cách mô tả kinh nghiệm và bổ sung các từ khóa cốt lõi để gia tăng mức độ phù hợp với vị trí ứng tuyển.`
                : "CV của bạn đã có cấu trúc cơ bản, tuy nhiên cần cải thiện thêm về cách viết bullet point theo chuẩn STAR và bổ sung số liệu cụ thể để tạo sự thuyết phục."}
          </p>
        </div>
      </div>

      {derivedMode === "jd" && (
        <div className="overflow-hidden rounded-sm border border-slate-200">
          <CVDocumentPreview
            cvFile={cvFile}
            jdFile={jdFile}
            cvFileUrl={cvFileUrl}
            jdFileUrl={jdFileUrl}
            cvFileName={cvFile?.name ?? cvFileName}
            jdFileName={jdFile?.name ?? jdFileName}
            matchedKws={matchedKeywords}
            missingKws={missingKeywords}
          />
        </div>
      )}

      {derivedMode === "jd" && (
        <div className="overflow-hidden rounded-sm border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/50 px-5 py-3.5">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
              TỪ KHÓA THIẾU TRONG CV
            </h3>
          </div>
          <div className="p-5">
            {missingKws.length === 0 ? (
              <p className="text-sm font-medium text-slate-500">Không có</p>
            ) : (
              // Render dạng list thay vì chip pill — `kw` có thể là từ khóa ngắn hoặc nguyên
              // câu yêu cầu JD (semantic match), chip nhỏ sẽ vỡ layout với câu dài.
              <ul className="space-y-2">
                {missingKws.map((kw, i) => (
                  <li key={`${kw}-${i}`} className="flex items-start gap-2 text-sm font-medium text-slate-700">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-400" aria-hidden />
                    <span>{kw}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-sm border border-emerald-100 bg-white shadow-sm">
        <div className="flex items-center gap-2.5 border-b border-emerald-50 bg-emerald-50/30 px-5 py-3.5">
          <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-emerald-800">
            ĐIỂM MẠNH ĐÃ THỂ HIỆN
          </h3>
        </div>
        <div className="p-5">
          {cvDisplayKWs.length === 0 && strengthsData.length === 0 ? (
            <p className="text-sm font-medium text-slate-500">Không có</p>
          ) : strengthsData.length > 0 ? (
            <div className="flex flex-col gap-2.5">
              {strengthsData.slice(0, showAllStrengths ? undefined : 5).map((item, i) => (
                <div
                  key={`strength-${i}`}
                  className="flex items-start gap-2.5 rounded-md border border-emerald-100/50 bg-emerald-50/50 p-3 text-sm text-slate-700"
                >
                  <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
                  <span className="leading-relaxed">{item}</span>
                </div>
              ))}
              {strengthsData.length > 5 && (
                <button
                  type="button"
                  onClick={() => setShowAllStrengths((prev) => !prev)}
                  className="mt-1 flex self-start text-sm font-semibold text-emerald-600 transition hover:text-emerald-700"
                >
                  {showAllStrengths ? (
                    <span className="inline-flex items-center gap-1">
                      Thu gọn <ChevronUp className="h-4 w-4" />
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      Xem thêm {strengthsData.length - 5} mục <ChevronDown className="h-4 w-4" />
                    </span>
                  )}
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-2">
                {cvDisplayKWs.slice(0, showAllStrengths ? undefined : 5).map((kw, i) => (
                  <span
                    key={`matched-${kw}-${i}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm text-emerald-700"
                  >
                    <Check className="h-3.5 w-3.5" />
                    {kw}
                  </span>
                ))}
              </div>
              {cvDisplayKWs.length > 5 && (
                <button
                  type="button"
                  onClick={() => setShowAllStrengths((prev) => !prev)}
                  className="mt-2 flex self-start text-sm font-semibold text-emerald-600 transition hover:text-emerald-700"
                >
                  {showAllStrengths ? (
                    <span className="inline-flex items-center gap-1">
                      Thu gọn <ChevronUp className="h-4 w-4" />
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      Xem thêm {cvDisplayKWs.length - 5} mục <ChevronDown className="h-4 w-4" />
                    </span>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-sm border border-orange-100 bg-white shadow-sm">
        <div className="flex items-center gap-2.5 border-b border-orange-50 bg-orange-50/30 px-5 py-3.5">
          <div className="h-2 w-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]" />
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-orange-800">
            KHOẢNG TRỐNG CẦN KHẮC PHỤC
          </h3>
        </div>
        <div className="p-5">
          {weaknessesData.length === 0 && missingKws.length === 0 ? (
            <p className="text-sm font-medium text-slate-500">Không có</p>
          ) : weaknessesData.length > 0 ? (
            <div className="flex flex-col gap-2.5">
              {weaknessesData.slice(0, showAllWeaknesses ? undefined : 5).map((item, i) => (
                <div
                  key={`weakness-${i}`}
                  className="flex items-start gap-2.5 rounded-md border border-orange-100/50 bg-orange-50/50 p-3 text-sm text-slate-700"
                >
                  <Warning className="mt-0.5 h-4 w-4 flex-shrink-0 text-orange-600" />
                  <span className="leading-relaxed">{item}</span>
                </div>
              ))}
              {weaknessesData.length > 5 && (
                <button
                  type="button"
                  onClick={() => setShowAllWeaknesses((prev) => !prev)}
                  className="mt-1 flex self-start text-sm font-semibold text-orange-600 transition hover:text-orange-700"
                >
                  {showAllWeaknesses ? (
                    <span className="inline-flex items-center gap-1">
                      Thu gọn <ChevronUp className="h-4 w-4" />
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      Xem thêm {weaknessesData.length - 5} mục <ChevronDown className="h-4 w-4" />
                    </span>
                  )}
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-2">
                {missingKws.slice(0, showAllWeaknesses ? undefined : 5).map((kw, i) => (
                  <span
                    key={`missing-${kw}-${i}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-sm text-orange-700"
                  >
                    <Warning className="h-3.5 w-3.5" />
                    {kw}
                  </span>
                ))}
              </div>
              {missingKws.length > 5 && (
                <button
                  type="button"
                  onClick={() => setShowAllWeaknesses((prev) => !prev)}
                  className="mt-2 flex self-start text-sm font-semibold text-orange-600 transition hover:text-orange-700"
                >
                  {showAllWeaknesses ? (
                    <span className="inline-flex items-center gap-1">
                      Thu gọn <ChevronUp className="h-4 w-4" />
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      Xem thêm {missingKws.length - 5} mục <ChevronDown className="h-4 w-4" />
                    </span>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="relative overflow-hidden rounded-sm border border-violet-200 bg-white shadow-sm">
        <div className="flex items-center gap-2.5 border-b border-violet-100 bg-violet-50/50 px-5 py-3.5">
          <div className="h-2 w-2 rounded-full bg-violet-600 shadow-[0_0_8px_rgba(124,58,237,0.5)]" />
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-violet-900">
            ĐỀ XUẤT CHỈNH SỬA
          </h3>
        </div>
        <div className="p-5">
          {suggestionsData.length === 0 ? (
            <p className="text-sm font-medium text-slate-500">Không có</p>
          ) : (
            <div className="flex flex-col gap-3">
              {suggestionsData.slice(0, showAllSuggestions ? undefined : 5).map((item, i) => {
                const isAdd = item.type === "add";
                const title = isAdd
                  ? String(item.title ?? "")
                      .replace(/^Bổ sung kỹ năng\s*"?/, "")
                      .replace(/"$/, "")
                  : formatSuggestionDisplayReason(item, { mode: suggestionDisplayMode });
                return (
                  <div
                    key={`suggestion-${i}`}
                    className="flex flex-col gap-1 rounded-md border border-violet-100 bg-violet-50/30 p-3.5"
                  >
                    <div className="flex items-start gap-2.5">
                      <Zap className="mt-0.5 h-4 w-4 flex-shrink-0 text-violet-600" />
                      <span className="text-sm font-semibold text-slate-900">
                        {isAdd ? "Cần bổ sung: " : "Cần tinh chỉnh: "}
                        <span className="text-violet-800">{title}</span>
                      </span>
                    </div>
                    {item.reason && (
                      <div className="mt-1.5 ml-2 border-l-2 border-violet-100 py-0.5 pl-6 text-xs text-slate-600">
                        <span className="mr-1 font-bold text-slate-700">Gợi ý hướng dẫn:</span>
                        {item.reason}
                      </div>
                    )}
                    {item.before && item.after && !isAdd && (
                      <div className="mt-2 ml-2 flex flex-col gap-1.5 pl-6 text-xs">
                        <div className="flex items-start gap-2 rounded border border-rose-100/50 bg-rose-50/50 p-2 text-rose-700">
                          <span className="flex-shrink-0 font-bold">Trước:</span>
                          <span className="leading-relaxed">{item.before}</span>
                        </div>
                        <div className="flex items-start gap-2 rounded border border-emerald-100/50 bg-emerald-50/50 p-2 text-emerald-700">
                          <span className="flex-shrink-0 font-bold">Sau:</span>
                          <span className="leading-relaxed">{item.after}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {suggestionsData.length > 5 && (
                <button
                  type="button"
                  onClick={() => setShowAllSuggestions((prev) => !prev)}
                  className="mt-1 flex self-start text-sm font-semibold text-violet-600 transition hover:text-violet-700"
                >
                  {showAllSuggestions ? (
                    <span className="inline-flex items-center gap-1">
                      Thu gọn <ChevronUp className="h-4 w-4" />
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      Xem thêm {suggestionsData.length - 5} mục <ChevronDown className="h-4 w-4" />
                    </span>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 border-t border-slate-200 pt-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <h3 className="mb-2 text-base font-bold text-slate-900">
            {matchScore >= 80
              ? "Hồ sơ đã sẵn sàng!"
              : matchScore >= 50
                ? "Cần hoàn thiện thêm!"
                : "Đừng vội nản lòng!"}
          </h3>
          <p className="max-w-md text-sm text-slate-500">
            {matchScore >= 80
              ? "CV của bạn đã rất ấn tượng. Bước tiếp theo là rèn luyện phản xạ thực tế trong phòng phỏng vấn AI, hoặc kết nối với Mentor để được góp ý chuyên sâu trước khi ứng tuyển."
              : matchScore >= 50
                ? "Hãy chỉnh sửa lại CV theo các góp ý trên. Nếu gặp khó khăn, các Mentor luôn sẵn sàng hỗ trợ bạn."
                : "Bạn có thể kết nối với Mentor để định hướng lại lộ trình, hoặc thử phân tích với một JD khác phù hợp hơn."}
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-4">
          {matchScore >= 80 ? (
            <>
              <button
                type="button"
                onClick={() => navigate("/interview")}
                className="flex items-center justify-center gap-2 rounded-xl bg-[#a3e635] px-8 py-3.5 text-base font-bold text-slate-900 shadow-sm transition hover:bg-[#84cc16]"
              >
                <Mic className="h-5 w-5 shrink-0" /> Phỏng vấn AI
              </button>
              <button
                type="button"
                onClick={() => navigate("/mentors")}
                className="flex items-center justify-center gap-2 rounded-xl border border-violet-200 bg-white px-8 py-3.5 text-base font-bold text-violet-700 shadow-sm transition hover:bg-violet-50"
              >
                <Users className="h-5 w-5 shrink-0" /> Gặp Mentor
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => navigate("/mentors")}
              className="flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-8 py-3.5 text-base font-bold text-white shadow-sm transition hover:bg-violet-700"
            >
              <Users className="h-5 w-5 shrink-0" /> Gặp Mentor
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate(resolvedAnalysisPath)}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-8 py-3.5 text-base font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <PlusCircle className="h-5 w-5 shrink-0" /> Phân tích mới
          </button>
          <button
            type="button"
            onClick={() => navigate(resolvedHistoryPath)}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-8 py-3.5 text-base font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <History className="h-5 w-5 shrink-0" /> Lịch sử
          </button>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-center gap-3 rounded-sm border border-slate-200 bg-white py-3 shadow-sm">
        {feedbackSent ? (
          <p className="text-sm font-semibold text-violet-700">
            {feedbackState === "helpful" ? "Cảm ơn bạn!" : "Cảm ơn, chúng tôi sẽ cải thiện."}
          </p>
        ) : (
          <>
            <p className="text-xs font-medium text-slate-500">
              Kết quả phân tích này có hữu ích không?
            </p>
            <button
              type="button"
              onClick={() => handleFeedback("helpful")}
              className="flex items-center gap-1.5 rounded-sm border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700"
            >
              <ThumbsUp className="h-3.5 w-3.5" /> Hữu ích
            </button>
            <button
              type="button"
              onClick={() => handleFeedback("not_helpful")}
              className="flex items-center gap-1.5 rounded-sm border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
            >
              <ThumbsDown className="h-3.5 w-3.5" /> Chưa tốt
            </button>
          </>
        )}
      </div>
    </div>
  );
}
