import { useRef, useState } from "react";
import { Check, ChevronDown, FileText, History } from "lucide-react";

const FILE_ACCEPT = ".pdf,.doc,.docx,application/pdf,application/msword";
const COLLAPSED_COUNT = 3;

function formatShortDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

/**
 * Ô chọn CV/JD khi đặt lịch — tải file mới hoặc dùng lại file đã phân tích trước đó.
 */
export function BookingDocumentField({
  label,
  hint,
  icon: Icon = FileText,
  emptyTitle,
  emptySubtitle,
  fileName = "",
  fileUrl = "",
  fromHistory = false,
  uploading = false,
  uploadingText,
  options = [],
  optionsLoading = false,
  reuseLabel,
  selectedText,
  onFileSelect,
  onPickOption,
  onClear,
}) {
  const inputRef = useRef(null);
  const [showAll, setShowAll] = useState(false);

  const openPicker = () => inputRef.current?.click();

  const handleChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) onFileSelect(file);
  };

  const hasFile = Boolean(fileName) && !uploading;
  const visibleOptions = showAll ? options : options.slice(0, COLLAPSED_COUNT);
  const selectedKey = fileUrl || "";

  return (
    <div>
      <label className="mb-2 block text-[10px] font-black uppercase tracking-wide text-slate-500">
        {label} {hint ? <span className="font-normal normal-case text-slate-600">({hint})</span> : null}
      </label>

      <input
        ref={inputRef}
        type="file"
        accept={FILE_ACCEPT}
        className="hidden"
        onChange={handleChange}
      />

      {uploading ? (
        <div className="rounded-xl border-2 border-dashed border-violet-300 bg-violet-50/50 p-4 text-center">
          <p className="text-sm font-medium text-violet-700">{uploadingText}</p>
        </div>
      ) : hasFile ? (
        <div className="rounded-xl border-2 border-lime-400 bg-lime-50 p-4">
          <div className="flex flex-col items-center gap-1 text-center">
            <div className="flex items-center justify-center gap-2 text-sm font-bold text-[#2f4200]">
              <Check className="h-4 w-4 shrink-0" strokeWidth={2.5} />
              <span className="max-w-[280px] truncate" title={fileName}>
                {fileName}
              </span>
            </div>
            {fromHistory ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-semibold text-[#4d6600]">
                <History className="h-3 w-3" />
                Dùng lại từ lịch sử phân tích
              </span>
            ) : null}
            {fileUrl ? <p className="text-xs text-slate-500">{selectedText}</p> : null}
          </div>
          <div className="mt-3 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={openPicker}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-violet-300 hover:text-violet-700"
            >
              Đổi file khác
            </button>
            <button
              type="button"
              onClick={onClear}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-white hover:text-slate-800"
            >
              Bỏ chọn
            </button>
          </div>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={openPicker}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") openPicker();
          }}
          className="cursor-pointer rounded-xl border-2 border-dashed border-slate-300 p-4 text-center transition-all hover:border-violet-300 hover:bg-violet-50/40"
        >
          <div className="flex items-center justify-center gap-3">
            <Icon className="h-6 w-6 text-slate-400" />
            <div className="text-left">
              <p className="text-sm font-semibold text-slate-800">{emptyTitle}</p>
              <p className="text-xs text-slate-500">{emptySubtitle}</p>
            </div>
          </div>
        </div>
      )}

      {optionsLoading && options.length === 0 ? (
        <p className="mt-2 text-[11px] text-slate-400">Đang tải file đã phân tích trước đó…</p>
      ) : null}

      {options.length > 0 ? (
        <div className="mt-3 rounded-xl border border-violet-100 bg-violet-50/40 p-3">
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-violet-800">
            <History className="h-3.5 w-3.5" />
            {reuseLabel}
          </div>
          <div className="space-y-1.5">
            {visibleOptions.map((opt) => {
              const active = selectedKey && selectedKey === opt.url;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onPickOption(opt)}
                  className={`flex w-full items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-left transition-all ${
                    active
                      ? "border-lime-400 bg-lime-50"
                      : "border-transparent bg-white hover:border-violet-300 hover:bg-white"
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <FileText className={`h-4 w-4 shrink-0 ${active ? "text-[#4d6600]" : "text-slate-400"}`} />
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-semibold text-slate-800" title={opt.name}>
                        {opt.name}
                      </span>
                      <span className="block truncate text-[11px] text-slate-500">
                        {[opt.context, formatShortDate(opt.createdAt)].filter(Boolean).join(" · ") ||
                          "Đã phân tích trước đó"}
                      </span>
                    </span>
                  </span>
                  {active ? (
                    <Check className="h-4 w-4 shrink-0 text-[#4d6600]" strokeWidth={2.5} />
                  ) : (
                    <span className="shrink-0 text-[11px] font-bold text-violet-700">Dùng lại</span>
                  )}
                </button>
              );
            })}
          </div>
          {options.length > COLLAPSED_COUNT ? (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-violet-700 hover:text-violet-900"
            >
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showAll ? "rotate-180" : ""}`} />
              {showAll ? "Thu gọn" : `Xem thêm ${options.length - COLLAPSED_COUNT} file`}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
