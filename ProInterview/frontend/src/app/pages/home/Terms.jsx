import React from "react";
import { LegalDocumentLayout, LegalSection, LegalDef } from "../../components/legal/LegalDocumentLayout";

const PLATFORM_SUBTITLE = "ĐIỀU KHOẢN SỬ DỤNG DỊCH VỤ";

export function Terms() {
  return (
    <LegalDocumentLayout
      title="Điều khoản sử dụng dịch vụ"
      subtitle={PLATFORM_SUBTITLE}
    >
      <LegalSection title="Giới thiệu và Chấp thuận điều khoản">
        <p>
          ProInterview là nền tảng ứng dụng công nghệ Trí tuệ nhân tạo (Artificial Intelligence - AI) nhằm hỗ trợ người dùng luyện tập phỏng vấn, đánh giá kỹ năng, phân tích CV, so sánh CV với yêu cầu công việc (Job Description - JD), theo dõi tiến độ phát triển kỹ năng và nâng cao khả năng sẵn sàng tham gia thị trường lao động.
        </p>
        <p className="mt-4">
          Người dùng được xem là đã đọc, hiểu và đồng ý với toàn bộ nội dung Chính sách này khi thực hiện một trong các hành vi sau:
        </p>
        <ul className="list-disc pl-5 space-y-1 mt-2 mb-4">
          <li>a) Đăng ký tài khoản Prolnterview;</li>
          <li>b) Đăng nhập và sử dụng nền tảng;</li>
          <li>c) Tải lên CV, JD hoặc dữ liệu nghề nghiệp;</li>
          <li>d) Tham gia phiên AI Interview;</li>
          <li>e) Sử dụng các tính năng phân tích và đánh giá của ProInterview;</li>
          <li>f) Nhấn nút “Đồng ý”, “Chấp nhận” hoặc hành vi tương đương trên nền tảng.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Điều 10. Nghĩa vụ của người dùng">
        <p>Người dùng có trách nhiệm:</p>
        <ul className="list-none space-y-2 my-4">
          <li><strong>10.1.</strong> Cung cấp thông tin trung thực, chính xác và đầy đủ.</li>
          <li><strong>10.2.</strong> Cập nhật thông tin khi có thay đổi.</li>
          <li><strong>10.3.</strong> Bảo mật tài khoản và mật khẩu truy cập.</li>
          <li><strong>10.4.</strong> Không chia sẻ tài khoản cho người khác sử dụng.</li>
          <li>
            <strong>10.5. Không tải lên nội dung:</strong>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li>a) Vi phạm pháp luật;</li>
              <li>b) Xâm phạm quyền sở hữu trí tuệ;</li>
              <li>c) Chứa mã độc hoặc phần mềm độc hại;</li>
              <li>d) Có nội dung phân biệt đối xử hoặc kích động thù địch.</li>
            </ul>
          </li>
          <li>
            <strong>10.6. Không sử dụng nền tảng cho mục đích:</strong>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li>a) Gian lận;</li>
              <li>b) Lừa đảo;</li>
              <li>c) Tấn công hệ thống;</li>
              <li>d) Thu thập dữ liệu trái phép.</li>
            </ul>
          </li>
          <li><strong>10.7.</strong> Tự chịu trách nhiệm đối với các nội dung do mình tải lên hoặc cung cấp cho hệ thống.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Điều 12. Rủi ro và hậu quả không mong muốn">
        <p>Mặc dù ProInterview áp dụng các biện pháp bảo mật phù hợp, người dùng hiểu rằng vẫn có thể tổn tại các rủi ro như:</p>
        
        <h4 className="font-semibold text-slate-900 mt-4 mb-2">12.1. Rò rỉ dữ liệu do lỗi từ phía người dùng</h4>
        <p>a) Để lộ mật khẩu; b) Chia sẻ tài khoản; c) Truy cập các website độc hại; d) Bị lừa đảo trực tuyến.</p>

        <h4 className="font-semibold text-slate-900 mt-4 mb-2">12.2. Rủi ro kỹ thuật ngoài khả năng kiểm soát</h4>
        <p>a) Tấn công mạng; b) Virus hoặc mã độc; c) Sự cố phần cứng; d) Sự cố đường truyền; e) Thiên tai hoặc sự kiện bất khả kháng.</p>

        <h4 className="font-semibold text-slate-900 mt-4 mb-2">12.3. Sai lệch kết quả đánh giá AI</h4>
        <p>Người dùng hiểu rằng hệ thống AI có thể: a) Đưa ra khuyến nghị chưa hoàn toàn chính xác; b) Chưa phản ánh đầy đủ bối cảnh cá nhân; c) Có sai số trong việc đánh giá kỹ năng. Do đó, kết quả từ ProInterview chỉ được xem là công cụ hỗ trợ tham khảo.</p>
      </LegalSection>

      <LegalSection title="Điều 13. Điều khoản chung">
        <ul className="list-none space-y-2 my-4">
          <li><strong>13.1.</strong> Chính sách này có hiệu lực kể từ ngày được công bố trên nền tảng ProInterview.</li>
          <li><strong>13.2.</strong> Prolnterview có quyền sửa đổi hoặc bổ sung Chính sách này khi cần thiết.</li>
          <li><strong>13.3.</strong> Các thay đổi sẽ được thông báo trên website, ứng dụng hoặc qua email đã đăng ký.</li>
          <li><strong>13.4.</strong> Việc tiếp tục sử dụng dịch vụ sau khi Chính sách được cập nhật đồng nghĩa với việc người dùng chấp nhận các nội dung sửa đổi.</li>
          <li><strong>13.5.</strong> Trường hợp bất kỳ điều khoản nào của Chính sách này bị tuyên vô hiệu bởi cơ quan có thẩm quyền, các điều khoản còn lại vẫn giữ nguyên hiệu lực.</li>
          <li><strong>13.6.</strong> Mọi tranh chấp phát sinh liên quan đến Chính sách này sẽ được ưu tiên giải quyết thông qua thương lượng và hòa giải. Trường hợp không đạt được thỏa thuận, tranh chấp sẽ được giải quyết theo quy định của pháp luật Việt Nam.</li>
        </ul>
      </LegalSection>
    </LegalDocumentLayout>
  );
}
