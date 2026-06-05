import { AlertTriangle } from "lucide-react";

export function checkSTTSupport() {
  return "webkitSpeechRecognition" in window || "SpeechRecognition" in window;
}

export function BrowserCompatibilityWarning({ onProceed, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-4 max-w-md rounded-2xl border border-amber-200/60 bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-100">
            <AlertTriangle className="h-5 w-5 text-amber-600" strokeWidth={2} />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            Trình duyệt không hỗ trợ nhận diện giọng nói
          </h3>
        </div>
        <p className="mb-4 text-sm leading-relaxed text-slate-600">
          Trình duyệt của bạn không hỗ trợ tính năng nhận diện giọng nói tiếng Việt.
          Để trả lời bằng mic, hãy dùng:
        </p>
        <ul className="mb-5 space-y-1.5 text-sm text-slate-700">
          {["Google Chrome (khuyến nghị)", "Microsoft Edge", "Brave Browser"].map((b) => (
            <li key={b} className="flex items-center gap-2">
              <span className="font-bold text-emerald-500">✓</span> {b}
            </li>
          ))}
        </ul>
        <p className="mb-5 text-xs text-slate-500">
          Bạn vẫn có thể tiếp tục và <strong>nhập câu trả lời bằng bàn phím</strong> trong phòng phỏng vấn.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onProceed}
            className="flex-1 rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-white transition-all hover:bg-amber-600"
          >
            Tiếp tục (nhập bàn phím)
          </button>
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-100"
          >
            Hủy
          </button>
        </div>
      </div>
    </div>
  );
}
