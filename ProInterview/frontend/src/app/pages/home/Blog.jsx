import React from "react";
import { LegalDocumentLayout, LegalSection } from "../../components/legal/LegalDocumentLayout";

const PLATFORM_SUBTITLE = "BLOG PROINTERVIEW";

export function Blog() {
  return (
    <LegalDocumentLayout
      title="Blog"
      subtitle={PLATFORM_SUBTITLE}
      intro="Trang blog đang được ProInterview hoàn thiện để chia sẻ kiến thức phỏng vấn, tối ưu CV và kinh nghiệm tuyển dụng từ góc nhìn thực tế."
    >
      <LegalSection title="Nội dung sắp có">
        <p>Chiến lược trả lời câu hỏi hành vi theo STAR.</p>
        <p>Cách tối ưu CV theo từng vị trí ứng tuyển.</p>
        <p>Kinh nghiệm phỏng vấn từ Mentor và nhà tuyển dụng.</p>
      </LegalSection>

      <LegalSection title="Cập nhật">
        <p>Chúng tôi sẽ cập nhật bài viết mới định kỳ để bạn có thể học và áp dụng ngay vào quá trình ứng tuyển.</p>
      </LegalSection>
    </LegalDocumentLayout>
  );
}

