import { ChevronDown } from "lucide-react";

/** Tiêu đề mục — gạch chân ngắn dưới chữ (scoped `.profile-page`). */
export function ProfileSectionHeading({ children }) {
  return <span className="profile-cv-section-heading">{children}</span>;
}

/** Mục luôn mở — không có mũi tên (vd. Liên hệ tài khoản). */
export function ProfileCvStaticSection({ title, showDividerBelow = false, children }) {
  return (
    <section
      className={`profile-cv-static-section${showDividerBelow ? " profile-cv-accordion-item--split" : ""}`}
    >
      <ProfileSectionHeading>{title}</ProfileSectionHeading>
      <div className="profile-cv-static-body">{children}</div>
    </section>
  );
}

/** Hàng mục CV: tiêu đề + mũi tên; bấm để mở/đóng ô nhập. */
export function ProfileCvAccordionSection({
  title,
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
        <ProfileSectionHeading>{title}</ProfileSectionHeading>
        <ChevronDown
          size={18}
          strokeWidth={2.5}
          className={`profile-cv-accordion-chevron shrink-0${isOpen ? " is-open" : ""}`}
          aria-hidden
        />
      </button>
      {isOpen ? <div className="profile-cv-accordion-panel">{children}</div> : null}
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

const hintEmphasis = "font-bold text-[#2D1B69]";

/** Gợi ý điều kiện đăng ký mentor — các mục bắt buộc in đậm. */
export function ProfileCvMentorHint() {
  return (
    <p className="profile-muted mt-2 text-sm leading-relaxed">
      Hoàn thành đầy đủ ở các mục{" "}
      <strong className={hintEmphasis}>Giới thiệu bản thân</strong>,{" "}
      <strong className={hintEmphasis}>Quá trình học tập</strong>,{" "}
      <strong className={hintEmphasis}>Thông tin đăng ký làm mentor</strong> và 1 trong 2 mục{" "}
      <strong className={hintEmphasis}>Kinh nghiệm làm việc</strong> hoặc{" "}
      <strong className={hintEmphasis}>Hoạt động ngoại khóa</strong>.
    </p>
  );
}
