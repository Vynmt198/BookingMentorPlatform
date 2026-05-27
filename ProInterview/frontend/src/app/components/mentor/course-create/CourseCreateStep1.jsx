import { useLayoutEffect, useRef, useState } from "react";
import { BookOpen, GraduationCap, ListChecks, Plus, Sparkles } from "lucide-react";
import {
  mentorGhostBtnClass,
  mentorInputClass,
  mentorLabelClass,
  mentorPrimaryBtnClass,
  mentorSectionCardClass,
  mentorValidationShakeClass,
} from "./mentorCourseCreateTheme";

const CATEGORY_OPTIONS = [
  { value: "", label: "Chọn danh mục" },
  { value: "behavioral-interview", label: "Behavioral Interview" },
  { value: "technical-interview", label: "Technical Interview" },
  { value: "career-development", label: "Career Development" },
];

const LEVEL_OPTIONS = [
  { value: "basic", label: "Cơ bản" },
  { value: "intermediate", label: "Trung cấp" },
  { value: "advanced", label: "Nâng cao" },
];

const DESC_MIN_HEIGHT_PX = 88;
const DESC_MAX_AUTO_HEIGHT_PX = 480;

function AutoResizeTextarea({ id, value, onChange, placeholder, className = "" }) {
  const ref = useRef(null);

  const syncHeight = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    const content = el.scrollHeight;
    const next = Math.min(
      DESC_MAX_AUTO_HEIGHT_PX,
      Math.max(DESC_MIN_HEIGHT_PX, content),
    );
    if (next >= DESC_MAX_AUTO_HEIGHT_PX) {
      el.style.height = `${DESC_MAX_AUTO_HEIGHT_PX}px`;
      el.style.overflowY = "auto";
    } else {
      el.style.height = `${next}px`;
      el.style.overflowY = "hidden";
    }
  };

  useLayoutEffect(() => {
    syncHeight();
  }, [value]);

  return (
    <textarea
      ref={ref}
      id={id}
      rows={1}
      value={value}
      onChange={(e) => {
        onChange(e);
        requestAnimationFrame(syncHeight);
      }}
      placeholder={placeholder}
      className={`${className} resize-none`}
      style={{ minHeight: DESC_MIN_HEIGHT_PX }}
    />
  );
}

function SectionHeader({ icon: Icon, title }) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-violet-100 text-violet-700">
        <Icon className="h-4 w-4" />
      </span>
      <h2 className="text-base font-bold text-slate-900">{title}</h2>
    </div>
  );
}

export function CourseCreateStep1({
  form,
  updateField,
  updateOutcome,
  addOutcome,
  validationMessages,
  canContinue,
  onCancel,
  onNext,
}) {
  const [validationTouched, setValidationTouched] = useState(false);
  const [shakeValidation, setShakeValidation] = useState(false);

  const isPaid = Number(form.price) > 0;
  const showValidationPanel = validationTouched && !canContinue && validationMessages.length > 0;

  const handleNextClick = () => {
    if (!canContinue) {
      setValidationTouched(true);
      setShakeValidation(true);
      window.setTimeout(() => setShakeValidation(false), 520);
      return;
    }
    onNext();
  };

  return (
    <div className="space-y-5">
      <section className={mentorSectionCardClass}>
        <SectionHeader icon={BookOpen} title="Thông tin chung" />
        <div className="space-y-3">
          <div>
            <label htmlFor="course-title" className={mentorLabelClass}>
              Tiêu đề khóa học <span className="text-red-500">*</span>
            </label>
            <input
              id="course-title"
              value={form.title}
              onChange={(e) => updateField("title", e.target.value)}
              placeholder="VD: Làm chủ STAR Method trong phỏng vấn hành vi"
              className={mentorInputClass}
            />
          </div>
          <div>
            <label htmlFor="course-desc" className={mentorLabelClass}>
              Mô tả khóa học <span className="text-red-500">*</span>
            </label>
            <AutoResizeTextarea
              id="course-desc"
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder="Mô tả chi tiết nội dung, giá trị và những gì học viên sẽ đạt được..."
              className={mentorInputClass}
            />
          </div>
        </div>
      </section>

      <section className={mentorSectionCardClass}>
        <SectionHeader icon={GraduationCap} title="Phân loại & giá" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="course-category" className={mentorLabelClass}>
              Danh mục <span className="text-red-500">*</span>
            </label>
            <select
              id="course-category"
              value={form.category}
              onChange={(e) => updateField("category", e.target.value)}
              className={mentorInputClass}
            >
              {CATEGORY_OPTIONS.map((o) => (
                <option key={o.value || "empty"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="course-level" className={mentorLabelClass}>
              Cấp độ
            </label>
            <select
              id="course-level"
              value={form.level}
              onChange={(e) => updateField("level", e.target.value)}
              className={mentorInputClass}
            >
              {LEVEL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4">
          <label htmlFor="course-price" className={mentorLabelClass}>
            Giá khóa học
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex max-w-xs flex-1 items-stretch overflow-hidden rounded-[10px] border border-slate-300 bg-white focus-within:border-[#8037f4] focus-within:ring-1 focus-within:ring-[#8037f4]/25">
              <input
                id="course-price"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="0"
                value={form.price > 0 ? Number(form.price).toLocaleString("vi-VN") : ""}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "");
                  updateField("price", digits === "" ? 0 : Number(digits));
                }}
                className="min-w-0 flex-1 border-0 bg-transparent px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
              />
              <span className="flex items-center border-l border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-500">
                VND
              </span>
            </div>
            <span
              className={`inline-flex items-center rounded-[8px] px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                isPaid
                  ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                  : "bg-violet-50 text-violet-700 ring-1 ring-violet-200"
              }`}
            >
              {isPaid ? "Trả phí" : "Miễn phí"}
            </span>
          </div>
        </div>
      </section>

      <section className={mentorSectionCardClass}>
        <SectionHeader icon={ListChecks} title="Kết quả học tập" />
        <div className="space-y-2.5">
          {form.outcomes.map((outcome, idx) => (
            <div key={idx} className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-violet-50 text-xs font-bold text-violet-700">
                {idx + 1}
              </span>
              <input
                value={outcome}
                onChange={(e) => updateOutcome(idx, e.target.value)}
                placeholder={`Kết quả học tập ${idx + 1}...`}
                className={mentorInputClass}
              />
              {idx === form.outcomes.length - 1 ? (
                <button
                  type="button"
                  onClick={addOutcome}
                  title="Thêm mục"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] border border-dashed border-violet-300 text-violet-600 transition hover:bg-violet-50"
                >
                  <Plus className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      {showValidationPanel ? (
        <div
          className={`rounded-[10px] border px-4 py-3 text-sm transition-colors ${
            shakeValidation
              ? mentorValidationShakeClass
              : "border-amber-200 bg-amber-50/80 text-amber-900"
          }`}
          role="alert"
          aria-live="polite"
        >
          <p className="mb-1 flex items-center gap-2 font-semibold">
            <Sparkles className="h-4 w-4 shrink-0 text-red-500" />
            Cần hoàn thiện trước khi tiếp tục
          </p>
          <ul className="list-inside list-disc space-y-0.5">
            {validationMessages.map((msg) => (
              <li key={msg}>{msg}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <CourseCreateFooter onCancel={onCancel} onPrimary={handleNextClick} primaryLabel="Tiếp theo" />
    </div>
  );
}

export function CourseCreateFooter({
  onCancel,
  onBack,
  onPrimary,
  primaryLabel = "Tiếp theo",
  extra,
}) {
  return (
    <div className="sticky bottom-0 z-20 -mx-1 mt-2 border-t border-slate-200/80 bg-white/95 px-1 py-4 backdrop-blur-md sm:-mx-2 sm:px-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {onCancel ? (
            <button type="button" onClick={onCancel} className={mentorGhostBtnClass}>
              Hủy
            </button>
          ) : null}
          {onBack ? (
            <button type="button" onClick={onBack} className={mentorGhostBtnClass}>
              Quay lại
            </button>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {extra}
          {onPrimary ? (
            <button type="button" onClick={onPrimary} className={mentorPrimaryBtnClass}>
              {primaryLabel}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
