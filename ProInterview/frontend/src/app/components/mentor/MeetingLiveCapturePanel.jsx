import { useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  MessageCircleQuestion,
  Mic,
  MicOff,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { BRAND_CTA_LIME_STYLE, BRAND_PURPLE } from "../../constants/brandColors.js";
import { countStructuredNotes } from "../../utils/liveCapture.js";
import { toastApiError, toastApiSuccess } from "../../utils/apiToast.js";

const IS = { strokeWidth: 1.75, strokeLinecap: "round", strokeLinejoin: "round" };

const NOTE_SECTIONS = [
  {
    type: "question",
    label: "Câu hỏi",
    key: "questionsAsked",
    icon: MessageCircleQuestion,
    tone: "text-[#8037f4]",
    dot: "bg-[#8037f4]",
    bg: "bg-violet-50 border-violet-100",
  },
  {
    type: "mistake",
    label: "Lỗi học viên",
    key: "commonMistakes",
    icon: AlertTriangle,
    tone: "text-amber-800",
    dot: "bg-amber-500",
    bg: "bg-amber-50 border-amber-100",
  },
  {
    type: "insight",
    label: "Insight",
    key: "keyInsights",
    icon: Lightbulb,
    tone: "text-emerald-800",
    dot: "bg-emerald-500",
    bg: "bg-emerald-50 border-emerald-100",
  },
];

const DICTATION_TARGETS = [
  { value: "auto", label: "Tự phân loại" },
  { value: "question", label: "Câu hỏi" },
  { value: "mistake", label: "Lỗi HV" },
  { value: "insight", label: "Insight" },
];

function NoteList({ items, dotClass, onRemove }) {
  if (!items.length) {
    return <p className="text-[11px] text-slate-400 italic">Chưa có mục nào.</p>;
  }
  return (
    <ul className="space-y-1.5">
      {items.map((item, index) => (
        <li
          key={`${item}-${index}`}
          className="group flex items-start gap-2 rounded-lg border border-slate-100 bg-white px-2.5 py-2 text-xs leading-relaxed text-slate-700"
        >
          <span className={`mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full ${dotClass}`} />
          <span className="flex-1">{item}</span>
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="shrink-0 rounded p-1 text-slate-300 opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
            aria-label="Xóa ghi chú"
          >
            <Trash2 className="h-3.5 w-3.5" {...IS} />
          </button>
        </li>
      ))}
    </ul>
  );
}

export function MeetingLiveCapturePanel({
  capture,
  interimTranscript,
  isListening,
  sttSupported,
  sttError,
  saveState,
  dictationNoteType = "auto",
  onDictationNoteTypeChange,
  onToggleListening,
  onFinishDictation,
  onAddTagged,
  onRemoveTagged,
  onUpdateQuickAssessment,
  onDismiss,
  className = "",
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [manualDraft, setManualDraft] = useState("");
  const [showDictationHint, setShowDictationHint] = useState(true);
  const [showQuickAssessment, setShowQuickAssessment] = useState(true);
  const totalNotes = countStructuredNotes(capture);

  const resolveDraft = () => manualDraft.trim();

  const handleAdd = (type) => {
    const line = resolveDraft();
    if (!line) {
      toastApiError("Gõ nội dung ghi chú trước.");
      return;
    }
    const ok = onAddTagged(type, line);
    if (!ok) {
      toastApiError("Nội dung quá ngắn hoặc không hợp lệ — hãy ghi câu rõ nghĩa.");
      return;
    }
    setManualDraft("");
  };

  const handleFinishDictation = () => {
    const ok = onFinishDictation?.();
    if (ok) {
      toastApiSuccess("Đã lưu câu vừa nói.");
      return;
    }
    toastApiError("Chưa nghe được câu nào — nói rõ hơn rồi bấm Xong.");
  };

  const saveLabel =
    saveState === "saving"
      ? "Đang lưu…"
      : saveState === "saved"
        ? "Đã lưu"
        : saveState === "error"
          ? "Lưu tạm"
          : "";

  if (collapsed) {
    return (
      <div className={`shrink-0 ${className}`}>
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="flex w-full items-center justify-between gap-2 rounded-2xl border border-violet-200 bg-white px-4 py-3 text-left shadow-sm hover:border-violet-300 lg:w-80"
        >
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#8037f4]">Ghi chú buổi học</p>
            <p className="mt-0.5 text-xs text-slate-600">
              {totalNotes > 0 ? `${totalNotes} ghi chú đã lưu` : "Chưa có ghi chú"}
            </p>
          </div>
          <ChevronUp className="h-4 w-4 text-slate-400" {...IS} />
        </button>
      </div>
    );
  }

  return (
    <aside
      className={`flex w-full shrink-0 flex-col overflow-hidden rounded-2xl border border-violet-200/80 bg-white shadow-[0_12px_40px_rgba(128,55,244,0.08)] lg:w-[min(100%,340px)] lg:max-h-full ${className}`}
    >
      <div className="flex items-start justify-between gap-2 border-b border-violet-100 bg-gradient-to-r from-[#faf8ff] to-white px-4 py-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-[#8037f4]">Ghi chú buổi học</p>
          <p className="mt-0.5 text-xs text-slate-500">
            Gõ ngắn gọn → chọn loại. {saveLabel ? `· ${saveLabel}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => (onDismiss ? onDismiss() : setCollapsed(true))}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
          aria-label="Đóng ghi chú"
        >
          <X className="h-4 w-4" {...IS} />
        </button>
      </div>

      <div className="border-b border-slate-100 px-4 py-3">
        <button
          type="button"
          onClick={() => setShowQuickAssessment((v) => !v)}
          className="flex w-full items-center justify-between text-[10px] font-black uppercase tracking-widest text-[#8037f4]"
        >
          Đánh giá nhanh
          <ChevronDown className={`h-3.5 w-3.5 transition ${showQuickAssessment ? "rotate-180" : ""}`} {...IS} />
        </button>
        {showQuickAssessment ? (
          <div className="mt-2.5 space-y-2.5">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => onUpdateQuickAssessment?.({ rating: value })}
                  className="rounded p-0.5 transition hover:scale-110"
                  aria-label={`Đánh giá ${value} sao`}
                >
                  <Star
                    className={`h-4 w-4 ${value <= (capture.rating || 0) ? "fill-amber-400 text-amber-400" : "text-slate-200"}`}
                    {...IS}
                  />
                </button>
              ))}
            </div>
            <textarea
              value={capture.strengths || ""}
              onChange={(e) => onUpdateQuickAssessment?.({ strengths: e.target.value })}
              placeholder="Điểm mạnh..."
              className="w-full min-h-[52px] resize-none rounded-lg border border-emerald-100 bg-emerald-50/40 px-2.5 py-2 text-xs text-slate-700 outline-none focus:border-emerald-300 focus:bg-white"
            />
            <textarea
              value={capture.improvements || ""}
              onChange={(e) => onUpdateQuickAssessment?.({ improvements: e.target.value })}
              placeholder="Cần cải thiện..."
              className="w-full min-h-[52px] resize-none rounded-lg border border-rose-100 bg-rose-50/40 px-2.5 py-2 text-xs text-slate-700 outline-none focus:border-rose-300 focus:bg-white"
            />
            <textarea
              value={capture.recommendation || ""}
              onChange={(e) => onUpdateQuickAssessment?.({ recommendation: e.target.value })}
              placeholder="Lời khuyên phát triển..."
              className="w-full min-h-[52px] resize-none rounded-lg border border-amber-100 bg-amber-50/40 px-2.5 py-2 text-xs text-slate-700 outline-none focus:border-amber-300 focus:bg-white"
            />
          </div>
        ) : null}
      </div>

      <div className="border-b border-slate-100 px-4 py-3">
        <input
          value={manualDraft}
          onChange={(e) => setManualDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd("insight");
            }
          }}
          placeholder="vd. HV trả lời chung chung, thiếu số liệu…"
          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-violet-400 focus:outline-none"
        />
        <div className="mt-2 grid grid-cols-3 gap-2">
          {NOTE_SECTIONS.map(({ type, label, icon: Icon, tone, bg }) => (
            <button
              key={type}
              type="button"
              onClick={() => handleAdd(type)}
              className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-2 text-[10px] font-bold ${bg} ${tone} hover:brightness-95`}
            >
              <Icon className="h-4 w-4" {...IS} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-[160px] overflow-y-auto px-4 py-3 space-y-4">
        {totalNotes === 0 ? (
          <div className="rounded-xl border border-dashed border-violet-200 bg-violet-50/40 px-4 py-6 text-center">
            <p className="text-sm font-semibold text-[#8037f4]">Chưa có ghi chú</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Gõ 1–2 câu ngắn khi nghe điểm quan trọng, rồi chọn <strong>Câu hỏi</strong>,{" "}
              <strong>Lỗi HV</strong> hoặc <strong>Insight</strong>.
            </p>
          </div>
        ) : (
          NOTE_SECTIONS.map(({ type, label, key, tone, dot }) => (
            <section key={type}>
              <p className={`mb-1.5 text-[10px] font-black uppercase tracking-wider ${tone}`}>
                {label} ({capture[key]?.length || 0})
              </p>
              <NoteList
                items={capture[key] || []}
                dotClass={dot}
                onRemove={(index) => onRemoveTagged(type, index)}
              />
            </section>
          ))
        )}
      </div>

      <div className="border-t border-slate-100 px-4 py-2">
        <button
          type="button"
          onClick={() => setShowDictationHint((v) => !v)}
          className="flex w-full items-center justify-between text-[10px] font-semibold text-slate-400 hover:text-slate-600"
        >
          Dictation (tùy chọn, không khuyến khích khi bật mic Jitsi)
          <ChevronDown className={`h-3.5 w-3.5 transition ${showDictationHint ? "rotate-180" : ""}`} {...IS} />
        </button>
        {showDictationHint ? (
          <div className="mt-2 space-y-2 pb-2">
            <p className="text-[10px] font-semibold text-slate-500">Dictation lưu vào:</p>
            <div className="flex flex-wrap gap-1.5">
              {DICTATION_TARGETS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => onDictationNoteTypeChange?.(value)}
                  className={`rounded-full border px-2.5 py-1 text-[10px] font-bold transition ${
                    dictationNoteType === value
                      ? "border-[#8037f4] bg-[#8037f4] text-white"
                      : "border-violet-200 bg-white text-[#8037f4] hover:bg-violet-50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {isListening ? (
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <button
                  type="button"
                  onClick={onToggleListening}
                  className="inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-[10px] font-black uppercase tracking-wider text-white transition hover:brightness-110"
                  style={{ background: BRAND_PURPLE }}
                  title="Bấm để tắt dictation"
                >
                  <Mic className="h-3.5 w-3.5" {...IS} />
                  Đang nghe…
                </button>
                <button
                  type="button"
                  onClick={handleFinishDictation}
                  style={BRAND_CTA_LIME_STYLE}
                  className="inline-flex min-w-[72px] items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-[10px] font-black uppercase tracking-wider shadow-[0_4px_16px_rgba(147,247,43,0.35)] hover:brightness-105"
                >
                  <Check className="h-3.5 w-3.5" {...IS} />
                  Xong
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onToggleListening}
                disabled={!sttSupported}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-[#8037f4] disabled:opacity-50"
              >
                <MicOff className="h-3.5 w-3.5" {...IS} />
                Bật dictation
              </button>
            )}
            {isListening && interimTranscript ? (
              <p className="text-[10px] italic text-slate-400 line-clamp-3">
                Đang nghe: {interimTranscript}
              </p>
            ) : null}
            {sttError ? <p className="text-[10px] text-amber-700">{sttError}</p> : null}
          </div>
        ) : null}
      </div>
    </aside>
  );
}
