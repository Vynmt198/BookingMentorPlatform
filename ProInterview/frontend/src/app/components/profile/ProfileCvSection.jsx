import { ChevronDown } from "lucide-react";

/** Tiêu đề mục, gạch chân ngắn dưới chữ (scoped `.profile-page`). */
export function ProfileSectionHeading({ children, requiredMark = false }) {
  return (
    <span className="profile-cv-section-heading">
      {children}
      {requiredMark ? (
        <span className="ml-0.5 font-extrabold text-red-500" aria-hidden>
          *
        </span>
      ) : null}
    </span>
  );
}

/** Mục luôn mở, không có mũi tên (vd. Liên hệ tài khoản). */
export function ProfileCvStaticSection({
  title,
  requiredMark = false,
  showDividerBelow = false,
  children,
}) {
  return (
    <section
      className={`profile-cv-static-section${showDividerBelow ? " profile-cv-accordion-item--split" : ""}`}
    >
      <ProfileSectionHeading requiredMark={requiredMark}>{title}</ProfileSectionHeading>
      <div className="profile-cv-static-body">{children}</div>
    </section>
  );
}

/** Hàng mục CV: tiêu đề + mũi tên; bấm để mở/đóng ô nhập. */
export function ProfileCvAccordionSection({
  title,
  requiredMark = false,
  description,
  isOpen,
  onToggle,
  showDividerBelow = false,
  children,
}) {
  return (
    <div
      className={`profile-cv-accordion-item${showDividerBelow ? " profile-cv-accordion-item--split" : ""}`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="profile-cv-accordion-trigger"
      >
        <ProfileSectionHeading requiredMark={requiredMark}>{title}</ProfileSectionHeading>
        <ChevronDown
          size={18}
          strokeWidth={2.5}
          className={`profile-cv-accordion-chevron shrink-0${isOpen ? " is-open" : ""}`}
          aria-hidden
        />
      </button>
      {isOpen ? (
        <div className="profile-cv-accordion-panel">
          {description ? (
            <p className="profile-muted mb-4 text-sm leading-relaxed">{description}</p>
          ) : null}
          {children}
        </div>
      ) : null}
    </div>
  );
}

export function ProfileCvTextarea({
  value,
  onChange,
  placeholder,
  rows = 4,
  disabled = false,
}) {
  return (
    <textarea
      rows={rows}
      disabled={disabled}
      className="input-glass w-full resize-y min-h-[88px] disabled:cursor-not-allowed disabled:opacity-70"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
    />
  );
}

/** Dòng mô tả dưới tiêu đề «Hồ sơ cá nhân», không in đậm. */
export function ProfileCvMentorHint({ isMentor = false }) {
  return (
    <p className="profile-muted mt-2 text-sm font-normal leading-relaxed">
      {isMentor
        ? "Hoàn thiện hồ sơ để học viên hiểu rõ hơn về kinh nghiệm, chuyên môn và cách Mentor có thể đồng hành trong quá trình luyện tập."
        : "Hoàn thiện thông tin của bạn để ProInterview hiểu rõ hơn về học vấn, kinh nghiệm và mục tiêu nghề nghiệp, từ đó hỗ trợ luyện phỏng vấn phù hợp hơn."}
    </p>
  );
}
