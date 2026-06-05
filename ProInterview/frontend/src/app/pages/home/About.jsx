import React from "react";
import { LegalDocumentLayout, LegalSection } from "../../components/legal/LegalDocumentLayout";

const PLATFORM_SUBTITLE = "PROINTERVIEW, NỀN TẢNG LUYỆN TẬP PHỎNG VẤN ỨNG DỤNG AI";

export function About() {
  return (
    <LegalDocumentLayout
      title="Về chúng tôi"
      subtitle={PLATFORM_SUBTITLE}
      intro="ProInterview được xây dựng để giúp ứng viên Việt Nam luyện phỏng vấn bài bản hơn, tự tin hơn và có chiến lược rõ ràng hơn trước các vòng tuyển dụng thực tế."
    >
      <LegalSection title="1. Sứ mệnh">
        <p>
          Chúng tôi muốn biến việc luyện phỏng vấn trở nên dễ tiếp cận, đo lường được tiến bộ và bám sát bối cảnh
          tuyển dụng thật.
        </p>
      </LegalSection>

      <LegalSection title="2. ProInterview làm gì">
        <p>
          ProInterview kết hợp phỏng vấn AI, phân tích CV theo JD, kết nối Mentor 1:1 và lộ trình học tập để giúp bạn
          cải thiện theo từng bước cụ thể.
        </p>
      </LegalSection>

      <LegalSection title="3. Giá trị cốt lõi">
        <p>Rõ ràng, thực tế, tập trung vào hành động và không hứa quá đà.</p>
      </LegalSection>
    </LegalDocumentLayout>
  );
}

