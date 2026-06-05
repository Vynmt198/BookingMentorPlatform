import React from "react";
import { LegalDocumentLayout, LegalSection, LegalDef } from "../../components/legal/LegalDocumentLayout";

const PLATFORM_SUBTITLE = "CHÍNH SÁCH BẢO MẬT DỮ LIỆU CÁ NHÂN PROINTERVIEW";

export function Privacy() {
  return (
    <LegalDocumentLayout
      title="Chính sách bảo mật"
      subtitle={PLATFORM_SUBTITLE}
      intro="Chính sách Bảo mật Dữ liệu Cá nhân này (sau đây gọi là “Chính sách”) quy định việc thu thập, xử lý, lưu trữ, sử dụng, chia sẻ và bảo vệ dữ liệu cá nhân của người dùng khi truy cập, đăng ký hoặc sử dụng nền tảng Prolnterview. Chính sách này được xây dựng trên cơ sở Nghị định số 13/2023/NĐ-CP về Bảo vệ Dữ liệu Cá nhân và các quy định pháp luật Việt Nam có liên quan."
    >
      <LegalSection title="Điều 1. Đối tượng và phạm vi áp dụng">
        <h4 className="font-semibold text-slate-900 mt-4 mb-2">1.1 Đối tượng áp dụng</h4>
        <p>Chính sách này áp dụng đối với:</p>
        <ul className="list-disc pl-5 space-y-1 mb-4">
          <li>Cá nhân đăng ký và sử dụng nền tảng ProInterview;</li>
          <li>Cá nhân tải lên hoặc cung cấp thông tin nghề nghiệp trên nền tảng;</li>
          <li>Cá nhân tham gia các phiên phỏng vấn AI;</li>
          <li>Cá nhân liên hệ hoặc tương tác với ProInterview thông qua website, ứng dụng hoặc các kênh hỗ trợ khách hàng.</li>
        </ul>
        <h4 className="font-semibold text-slate-900 mb-2">1.2 Phạm vi áp dụng</h4>
        <p>Chính sách này điều chỉnh toàn bộ hoạt động xử lý dữ liệu cá nhân phát sinh trong quá trình người dùng sử dụng sản phẩm và dịch vụ do Prolnterview cung cấp.</p>
      </LegalSection>

      <LegalSection title="Điều 2. Giải thích từ ngữ">
        <LegalDef term="2.1. ProInterview:">
          Là nền tảng ứng dụng trí tuệ nhân tạo hỗ trợ người dùng luyện tập phỏng vấn, đánh giá năng lực, phân tích CV và chuẩn bị cho quá trình tuyển dụng.
        </LegalDef>
        <LegalDef term="2.2. Người dùng:">
          Là cá nhân truy cập, đăng ký, sử dụng hoặc tương tác với Prolnterview.
        </LegalDef>
        <LegalDef term="2.3. Dữ liệu cá nhân:">
          Là thông tin dưới dạng ký hiệu, chữ viết, chữ số, hình ảnh, âm thanh hoặc dạng điện tử khác có khả năng xác định một cá nhân cụ thể theo quy định pháp luật.
        </LegalDef>
        <LegalDef term="2.4. Dữ liệu nghề nghiệp:">
          Bao gồm: CV; Resume; Cover Letter; Portfolio; Chứng chỉ; Thông tin học vấn; Kinh nghiệm làm việc; Kỹ năng nghề nghiệp.
        </LegalDef>
        <LegalDef term="2.5. Dữ liệu phỏng vấn:">
          Bao gồm: a) Câu hỏi phỏng vấn; b) Nội dung trả lời; c) Điểm đánh giá; d) Báo cáo phân tích; e) Lịch sử luyện tập; f) Báo cáo tiến bộ.
        </LegalDef>
        <LegalDef term="2.6. Dữ liệu âm thanh:">
          Bao gồm: a) Giọng nói của người dùng; b) File ghi âm; c) Dữ liệu chuyển đổi giọng nói thành văn bản.
        </LegalDef>
        <LegalDef term="2.7. Xử lý dữ liệu cá nhân:">
          Bao gồm một hoặc nhiều hoạt động: a) Thu thập; b) Ghi nhận; c) Lưu trữ; d) Chỉnh sửa; e) Phân tích; f) Mã hóa; g) Chia sẻ; h) Xóa bỏ; hoặc các hoạt động khác liên quan đến dữ liệu cá nhân.
        </LegalDef>
        <LegalDef term="2.8. Bên thứ ba:">
          Là tổ chức hoặc cá nhân không phải ProInterview và không phải chủ thể dữ liệu.
        </LegalDef>
      </LegalSection>

      <LegalSection title="Điều 3. Mục đích xử lý dữ liệu cá nhân">
        <p>ProInterview thu thập và xử lý dữ liệu cá nhân nhằm các mục đích sau:</p>
        <h4 className="font-semibold text-slate-900 mt-4 mb-2">3.1. Cung cấp dịch vụ</h4>
        <ul className="list-none space-y-1 mb-4">
          <li>a) Tạo và quản lý tài khoản;</li>
          <li>b) Xác thực người dùng;</li>
          <li>c) Cung cấp các phiên AI Interview;</li>
          <li>d) Phân tích CV; e) Phân tích JD; f) So khớp CV và JD;</li>
          <li>g) Đánh giá năng lực ứng tuyển.</li>
        </ul>
        <h4 className="font-semibold text-slate-900 mb-2">3.2. Cá nhân hóa trải nghiệm</h4>
        <ul className="list-none space-y-1 mb-4">
          <li>a) Xây dựng bộ câu hỏi phù hợp;</li>
          <li>b) Điều chỉnh độ khó của phiên phỏng vấn;</li>
          <li>c) Đề xuất nội dung luyện tập;</li>
          <li>d) Đề xuất kỹ năng cần cải thiện.</li>
        </ul>
        <h4 className="font-semibold text-slate-900 mb-2">3.3. Đánh giá và phản hồi</h4>
        <ul className="list-none space-y-1 mb-4">
          <li>a) Chấm điểm câu trả lời; b) Đánh giá kỹ năng giao tiếp; c) Đánh giá tính logic;</li>
          <li>d) Đánh giá khả năng trình bày; e) Đánh giá mức độ phù hợp với vị trí tuyển dụng.</li>
        </ul>
        <h4 className="font-semibold text-slate-900 mb-2">3.4. Nghiên cứu và cải tiến sản phẩm</h4>
        <ul className="list-none space-y-1 mb-4">
          <li>a) Nâng cao chất lượng mô hình AI; b) Phát triển tính năng mới;</li>
          <li>c) Kiểm tra hiệu suất hệ thống; d) Tối ưu hóa trải nghiệm người dùng.</li>
        </ul>
        <h4 className="font-semibold text-slate-900 mb-2">3.5. Hỗ trợ khách hàng</h4>
        <ul className="list-none space-y-1 mb-4">
          <li>a) Giải đáp thắc mắc; b) Xử lý sự cố kỹ thuật;</li>
          <li>c) Tiếp nhận phản hồi; d) Giải quyết khiếu nại.</li>
        </ul>
        <h4 className="font-semibold text-slate-900 mb-2">3.6. Bảo mật hệ thống</h4>
        <ul className="list-none space-y-1 mb-4">
          <li>a) Ngăn chặn hành vi gian lận; b) Phát hiện truy cập trái phép;</li>
          <li>c) Bảo vệ nền tảng khỏi tấn công mạng.</li>
        </ul>
        <h4 className="font-semibold text-slate-900 mb-2">3.7. Tuân thủ pháp luật</h4>
        <ul className="list-none space-y-1 mb-4">
          <li>a) Thực hiện nghĩa vụ pháp lý; b) Hợp tác với cơ quan có thẩm quyền theo quy định của pháp luật.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Điều 4. Nguyên tắc bảo vệ dữ liệu cá nhân">
        <p>ProInterview cam kết:</p>
        <ul className="list-disc pl-5 space-y-1 mb-4">
          <li>4.1. Thu thập dữ liệu đúng mục đích đã thông báo.</li>
          <li>4.2. Chỉ thu thập dữ liệu cần thiết cho việc cung cấp dịch vụ.</li>
          <li>4.3. Không bán dữ liệu cá nhân của người dùng dưới bất kỳ hình thức nào.</li>
          <li>4.4. Không tiết lộ dữ liệu cá nhân cho bên thứ ba nếu không có căn cứ pháp lý hoặc sự đồng ý của người dùng.</li>
          <li>4.5. Áp dụng các biện pháp kỹ thuật và tổ chức nhằm bảo vệ dữ liệu cá nhân.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Điều 5. Các loại dữ liệu cá nhân được thu thập">
        <h4 className="font-semibold text-slate-900 mb-2">5.1. Dữ liệu cá nhân cơ bản</h4>
        <p>a) Họ và tên; b) Email; c) Số điện thoại; d) Ngày sinh; e) Giới tính; f) Trường học hoặc tổ chức công tác; g) Quốc gia hoặc khu vực sinh sống.</p>
        
        <h4 className="font-semibold text-slate-900 mt-4 mb-2">5.2. Dữ liệu nghề nghiệp</h4>
        <p>a) CV; b) Resume; c) Cover Letter; d) Portfolio; e) Hồ sơ nghề nghiệp; f) Kỹ năng chuyên môn; g) Kinh nghiệm làm việc; h) Thành tích học tập; i) Chứng chỉ nghề nghiệp.</p>

        <h4 className="font-semibold text-slate-900 mt-4 mb-2">5.3. Dữ liệu phỏng vấn</h4>
        <p>a) Câu trả lời của người dùng; b) Điểm số đánh giá; c) Báo cáo phản hồi AI; d) Kết quả luyện tập; e) Tiến độ phát triển kỹ năng.</p>

        <h4 className="font-semibold text-slate-900 mt-4 mb-2">5.4. Dữ liệu âm thanh</h4>
        <p>a) File ghi âm giọng nói; b) Dữ liệu nhận diện giọng nói; c) Văn bản được chuyển đổi từ giọng nói.</p>

        <h4 className="font-semibold text-slate-900 mt-4 mb-2">5.5. Dữ liệu kỹ thuật</h4>
        <p>a) Địa chỉ IP; b) Thiết bị sử dụng; c) Hệ điều hành; d) Trình duyệt; e) Nhật ký hoạt động; f) Cookie; g) Dữ liệu hiệu năng hệ thống.</p>
      </LegalSection>

      <LegalSection title="Điều 6. Cách thức thu thập dữ liệu">
        <p>ProInterview thu thập dữ liệu thông qua:</p>
        <ul className="list-disc pl-5 space-y-1 mb-4">
          <li>6.1. Thông tin do người dùng trực tiếp cung cấp khi đăng ký tài khoản.</li>
          <li>6.2. Thông tin do người dùng tải lên trong quá trình sử dụng dịch vụ.</li>
          <li>6.3. Dữ liệu phát sinh từ quá trình tham gia AI Interview.</li>
          <li>6.4. Dữ liệu ghi nhận tự động thông qua website hoặc ứng dụng.</li>
          <li>6.5. Thông tin được người dùng cung cấp thông qua email, biểu mẫu hỗ trợ hoặc khảo sát.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Điều 7. Cách thức xử lý dữ liệu cá nhân">
        <h4 className="font-semibold text-slate-900 mb-2">7.1. Hoạt động xử lý dữ liệu</h4>
        <p>ProInterview có thể thực hiện một hoặc nhiều hoạt động xử lý dữ liệu cá nhân sau đây: a) Thu thập; b) Ghi nhận; c) Lưu trữ; d) Phân loại; e) Trích xuất; f) Phân tích; g) Đánh giá; h) So sánh; i) Tổng hợp; j) Mã hóa; k) Sao lưu; l) Truy xuất; m) Chỉnh sửa; n) Chia sẻ trong phạm vi được phép; o) Xóa bỏ hoặc hủy dữ liệu; p) Các hoạt động khác cần thiết để cung cấp dịch vụ.</p>
        
        <h4 className="font-semibold text-slate-900 mt-4 mb-2">7.2. Xử lý dữ liệu bằng công nghệ AI</h4>
        <p>Người dùng hiểu và đồng ý rằng ProInterview sử dụng các mô hình trí tuệ nhân tạo để: a) Đánh giá nội dung câu trả lời phỏng vấn; b) Đánh giá kỹ năng giao tiếp; c) Phân tích mức độ phù hợp giữa CV và JD; d) Đề xuất nội dung cải thiện; e) Tạo phản hồi tự động; f) Tạo báo cáo phát triển kỹ năng. Các kết quả đánh giá từ AI chỉ mang tính chất tham khảo và hỗ trợ học tập, không được xem là kết luận chính thức về năng lực nghề nghiệp của người dùng.</p>

        <h4 className="font-semibold text-slate-900 mt-4 mb-2">7.3. Xử lý dữ liệu phục vụ nghiên cứu</h4>
        <p>ProInterview có thể sử dụng dữ liệu đã được ẩn danh hoặc loại bỏ yếu tố nhận diện cá nhân nhằm: a) Đánh giá hiệu quả sản phẩm; b) Nghiên cứu hành vi người dùng; c) Cải thiện thuật toán AI; d) Phát triển tính năng mới.</p>
      </LegalSection>

      <LegalSection title="Điều 8. Tổ chức được xử lý dữ liệu cá nhân">
        <h4 className="font-semibold text-slate-900 mb-2">8.1. Đơn vị vận hành</h4>
        <p>Dữ liệu cá nhân được xử lý bởi đơn vị sở hữu và vận hành ProInterview.</p>

        <h4 className="font-semibold text-slate-900 mt-4 mb-2">8.2. Nhà cung cấp dịch vụ công nghệ</h4>
        <p>ProInterview có thể chia sẻ dữ liệu trong phạm vi cần thiết với: a) Nhà cung cấp hạ tầng máy chủ; b) Nhà cung cấp dịch vụ điện toán đám mây; c) Nhà cung cấp dịch vụ lưu trữ dữ liệu; d) Nhà cung cấp dịch vụ email; e) Nhà cung cấp công nghệ AI; f) Nhà cung cấp dịch vụ phân tích hệ thống.</p>

        <h4 className="font-semibold text-slate-900 mt-4 mb-2">8.3. Cơ quan nhà nước</h4>
        <p>Dữ liệu có thể được cung cấp cho cơ quan nhà nước có thẩm quyền khi: a) Có yêu cầu bằng văn bản; b) Có quyết định của cơ quan có thẩm quyền; c) Pháp luật quy định phải cung cấp.</p>

        <h4 className="font-semibold text-slate-900 mt-4 mb-2">8.4. Nguyên tắc chia sẻ dữ liệu</h4>
        <p>ProInterview chỉ chia sẻ dữ liệu: a) Khi cần thiết cho việc cung cấp dịch vụ; b) Khi có sự đồng ý của người dùng; c) Khi có căn cứ pháp lý hợp lệ.</p>
      </LegalSection>

      <LegalSection title="Điều 9. Quyền của người dùng">
        <p>Người dùng có các quyền sau:</p>
        <ul className="list-none space-y-2 my-4">
          <li><strong>9.1. Quyền được biết:</strong> Được biết dữ liệu cá nhân nào đang được ProInterview thu thập và xử lý.</li>
          <li><strong>9.2. Quyền truy cập:</strong> Được yêu cầu truy cập dữ liệu cá nhân của mình.</li>
          <li><strong>9.3. Quyền chỉnh sửa:</strong> Được yêu cầu cập nhật hoặc chỉnh sửa dữ liệu không chính xác.</li>
          <li><strong>9.4. Quyền rút lại sự đồng ý:</strong> Người dùng có quyền rút lại sự đồng ý đối với việc xử lý dữ liệu cá nhân. Việc rút lại sự đồng ý không làm ảnh hưởng đến tính hợp pháp của các hoạt động xử lý đã thực hiện trước đó.</li>
          <li><strong>9.5. Quyền yêu cầu xóa dữ liệu:</strong> Người dùng có quyền yêu cầu xóa dữ liệu cá nhân theo quy định pháp luật.</li>
          <li><strong>9.6. Quyền phản đối xử lý dữ liệu:</strong> Người dùng có quyền phản đối việc sử dụng dữ liệu cho các hoạt động tiếp thị hoặc mục đích khác ngoài việc cung cấp dịch vụ.</li>
          <li><strong>9.7. Quyền khiếu nại:</strong> Người dùng có quyền: a) Khiếu nại; b) Tố cáo; c) Khởi kiện; theo quy định pháp luật hiện hành.</li>
          <li><strong>9.8. Thời gian phản hồi:</strong> ProInterview sẽ phản hồi yêu cầu hợp lệ của người dùng trong thời hạn tối đa 72 giờ làm việc kể từ thời điểm tiếp nhận yêu cầu.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Điều 11. Lưu trữ dữ liệu cá nhân">
        <h4 className="font-semibold text-slate-900 mb-2">11.1. Nguyên tắc lưu trữ</h4>
        <p>Prolnterview chỉ lưu trữ dữ liệu trong thời gian cần thiết để thực hiện các mục đích được nêu trong Chính sách này.</p>

        <h4 className="font-semibold text-slate-900 mt-4 mb-2">11.2. Thời hạn lưu trữ</h4>
        <p>Trừ khi pháp luật quy định khác:</p>
        <ul className="list-disc pl-5 space-y-1 mb-4">
          <li>a) Dữ liệu tài khoản: tối đa 05 năm kể từ lần đăng nhập cuối cùng;</li>
          <li>b) CV và tài liệu nghề nghiệp: tối đa 05 năm kể từ ngày tải lên;</li>
          <li>c) Kết quả AI Interview: tối đa 05 năm;</li>
          <li>d) Nhật ký hệ thống: tối đa 24 tháng;</li>
          <li>e) Dữ liệu âm thanh: tối đa 12 tháng kể từ ngày ghi nhận.</li>
        </ul>

        <h4 className="font-semibold text-slate-900 mb-2">11.3. Xóa dữ liệu</h4>
        <p>Sau khi hết thời hạn lưu trữ hoặc khi có yêu cầu hợp lệ từ người dùng, dữ liệu sẽ được: a) Xóa; b) Hủy; c) Ẩn danh hóa; theo quy trình nội bộ của Prolnterview.</p>
      </LegalSection>
    </LegalDocumentLayout>
  );
}
