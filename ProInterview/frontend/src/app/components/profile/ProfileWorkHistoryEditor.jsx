import { Plus, Trash2 } from "lucide-react";
import { emptyWorkEntry, formatWorkEntryPeriod } from "../../utils/profileWorkHistory";

const fieldClass =
  "w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200/80 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";

const labelClass = "mb-1.5 block text-sm font-medium text-slate-700";

function PeriodSummary({ entry }) {
  const period = formatWorkEntryPeriod(entry);
  if (!period) return null;

  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 rounded-md border border-violet-100 bg-violet-50/80 px-3 py-2 text-sm">
      <span className="text-slate-500">Hiển thị trên hồ sơ:</span>
      <span className="font-semibold text-violet-900">{period}</span>
    </div>
  );
}

export function ProfileWorkHistoryEditor({ entries, onChange, disabled = false }) {
  const list = Array.isArray(entries) && entries.length ? entries : [emptyWorkEntry()];

  const updateEntry = (index, patch) => {
    const next = list.map((e, i) => (i === index ? { ...e, ...patch } : e));
    onChange(next);
  };

  const addEntry = () => {
    onChange([...list, emptyWorkEntry()]);
  };

  const removeEntry = (index) => {
    if (list.length <= 1) {
      onChange([emptyWorkEntry()]);
      return;
    }
    onChange(list.filter((_, i) => i !== index));
  };

  const setCurrentAt = (index, isCurrent) => {
    if (isCurrent) {
      onChange(
        list.map((item, i) => ({
          ...item,
          isCurrent: i === index,
          endMonth: i === index ? "" : item.endMonth,
        })),
      );
      return;
    }
    updateEntry(index, { isCurrent: false });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-slate-600">
        Thêm từng công việc (quá khứ hoặc hiện tại). Điền <strong>chức danh</strong> và{" "}
        <strong>công ty</strong>, chọn tháng bắt đầu / kết thúc. Nếu vẫn đang làm, tick &quot;Đang làm việc
        tại đây&quot;.
      </p>

      {list.map((entry, index) => (
        <div
          key={index}
          className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
        >
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <h4 className="text-sm font-semibold text-slate-900">
              {entry.isCurrent ? "Công việc hiện tại" : `Kinh nghiệm ${index + 1}`}
            </h4>
            {!disabled && list.length > 1 ? (
              <button
                type="button"
                onClick={() => removeEntry(index)}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
              >
                <Trash2 size={14} aria-hidden />
                Xóa
              </button>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor={`work-role-${index}`}>
                Chức danh
              </label>
              <input
                id={`work-role-${index}`}
                disabled={disabled}
                className={fieldClass}
                placeholder="VD: Nhân sự (HR)"
                value={entry.role}
                onChange={(e) => updateEntry(index, { role: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor={`work-company-${index}`}>
                Công ty / tổ chức
              </label>
              <input
                id={`work-company-${index}`}
                disabled={disabled}
                className={fieldClass}
                placeholder="VD: FPT Software"
                value={entry.company}
                onChange={(e) => updateEntry(index, { company: e.target.value })}
              />
            </div>
          </div>

          <label className="flex cursor-pointer items-start gap-2.5 rounded-md border border-slate-100 bg-slate-50/80 px-3 py-2.5">
            <input
              type="checkbox"
              disabled={disabled}
              checked={entry.isCurrent}
              className="mt-0.5 size-4 shrink-0 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
              onChange={(e) => setCurrentAt(index, e.target.checked)}
            />
            <span className="text-sm text-slate-700">
              <span className="font-medium text-slate-900">Đang làm việc tại đây</span>
              <span className="mt-0.5 block text-xs text-slate-500">
                Chỉ một mục được đánh dấu hiện tại. Khi bật, ô &quot;Đến&quot; sẽ tự ẩn.
              </span>
            </span>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor={`work-start-${index}`}>
                Tháng bắt đầu
              </label>
              <input
                id={`work-start-${index}`}
                type="month"
                disabled={disabled}
                className={`${fieldClass} [color-scheme:light]`}
                value={entry.startMonth}
                onChange={(e) => updateEntry(index, { startMonth: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor={`work-end-${index}`}>
                Tháng kết thúc
              </label>
              <input
                id={`work-end-${index}`}
                type="month"
                disabled={disabled || entry.isCurrent}
                className={`${fieldClass} [color-scheme:light]`}
                value={entry.isCurrent ? "" : entry.endMonth}
                onChange={(e) => updateEntry(index, { endMonth: e.target.value })}
              />
              {entry.isCurrent ? (
                <p className="mt-1.5 text-xs text-slate-500">Không cần điền khi vẫn đang làm việc.</p>
              ) : null}
            </div>
          </div>

          <PeriodSummary entry={entry} />

          <div>
            <label className={labelClass} htmlFor={`work-note-${index}`}>
              Mô tả ngắn <span className="font-normal text-slate-400">(tùy chọn)</span>
            </label>
            <textarea
              id={`work-note-${index}`}
              disabled={disabled}
              rows={3}
              className={`${fieldClass} min-h-[72px] resize-y`}
              placeholder="Nhiệm vụ chính, thành tích nổi bật..."
              value={entry.note}
              onChange={(e) => updateEntry(index, { note: e.target.value })}
            />
          </div>
        </div>
      ))}

      {!disabled ? (
        <button
          type="button"
          onClick={addEntry}
          className="inline-flex items-center gap-2 rounded-md border border-dashed border-violet-300 bg-violet-50/50 px-4 py-2.5 text-sm font-medium text-violet-800 hover:bg-violet-50"
        >
          <Plus size={16} aria-hidden />
          Thêm kinh nghiệm khác
        </button>
      ) : null}
    </div>
  );
}
