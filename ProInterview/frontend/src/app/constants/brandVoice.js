/**
 * Copy & xưng hô ProInterview (brand guideline TONE & MOOD).
 * - Thương hiệu: ProInterview (hoặc Pio) + "bạn". Không xưng "Mình" cho ProInterview.
 * - Mentor (khu mentor): Em + anh/chị
 * Tone: thân thiện, khích lệ, thực tế, có định hướng, không hứa quá đà.
 */

export const HOME_COPY = {
  badge: "Bạn đồng hành luyện phỏng vấn",
  titleLine1: "Chuẩn bị",
  titleHighlight: "hồ sơ & kỹ năng",
  titleLine2: "cùng mentor thật",
  cta: "Phân tích CV ngay",
  ctaMentor: "Tìm mentor ngay",
  stats: [
    { value: "10,000+", label: "Lượt luyện trên ProInterview" },
    { value: "500+", label: "Mentor HR/Manager thật" },
    { value: "STAR", label: "Góp ý từng câu, áp dụng ngay" },
    { value: "4.8/5", label: "Mức hài lòng trung bình" },
  ],
};

/** Home: mọi section trừ hero (tiêu đề + badge + CTA hero giữ trong JSX). */
export const HOME_SECTION_COPY = {
  howItWorks: {
    titleLine1: "Chuẩn bị phỏng vấn",
    titleLine2: "tự tin hơn từng buổi",
  },
  steps: [
    {
      step: "01",
      title: "Phân tích CV với JD",
      desc: "ProInterview chỉ rõ chỗ khớp, chỗ thiếu. Bạn biết sửa đâu trước khi nộp hồ sơ.",
    },
    {
      step: "02",
      title: "Mentor 1:1",
      desc: "Gặp HR/Manager thật. Góp ý cụ thể, biết bước tiếp theo nên luyện gì.",
    },
    {
      step: "03",
      title: "Khóa học",
      desc: "Video và bài tập mentor duyệt. Học xong biết áp dụng vào CV và buổi phỏng vấn.",
    },
  ],
  features: [
    {
      title: "Phân tích CV với JD",
      desc: "Tải lên là thấy độ khớp, có gợi ý sửa từng vị trí, không đoán mò.",
      cta: "Phân tích ngay",
    },
    {
      title: "Mentor 1:1 thật",
      desc: "Đặt lịch HR/Manager. Kinh nghiệm thực chiến, không hứa quá đà.",
      cta: "Chọn mentor",
    },
    {
      title: "Theo dõi tiến độ",
      desc: "Lịch sử luyện và tiến bộ trên một chỗ. Bạn thấy rõ bạn đã tiến bộ đến đâu.",
      cta: "Xem lịch hẹn",
    },
  ],
  testimonials: {
    titleLine: "Bạn học viên nói gì\u00A0về",
    body: "ProInterview kết hợp luyện AI và mentor thật. Tiến bộ từng buổi, có feedback cụ thể.",
    socialProof: "bạn đã luyện và nhận offer",
    badge: "Đánh giá nổi bật",
    items: [
      {
        name: "Phạm Anh Tuấn",
        role: "Software Engineer @ Shopee",
        text: "Mình luyện AI vài buổi rồi mock với mentor Shopee, tự tin hơn rõ. Câu hỏi sát thực tế, góp ý đúng chỗ cần sửa.",
        tag: "Đã nhận việc",
      },
      {
        name: "Nguyễn Thị Hoa",
        role: "Marketing Executive @ Unilever",
        text: "Phân tích CV với JD xong mới thấy thiếu từ khóa quan trọng. Điểm STAR từ 2.4 lên 4.1 sau ba tuần, tiến bộ đo được.",
        tag: "STAR +70%",
      },
      {
        name: "Trần Minh Đức",
        role: "Business Analyst @ KPMG",
        text: "Phân tích CV với JD chỉ đúng điểm yếu. Mentor KPMG chia sẻ kinh nghiệm thật, khác hẳn đọc blog cho có.",
        tag: "Mentor 5 sao",
      },
    ],
  },
};

/** Copy ngắn — chi tiết bảng: `constants/bookingPolicy.js` + `BookingPolicySummary`. */
export const BOOKING_POLICY_COPY = {
  refundTitle: "Chính sách khi bạn hủy",
  refundDetail:
    "Từ 24 giờ trước buổi: hoàn 100%. 12–24 giờ: hoàn 50%. Dưới 12 giờ hoặc không tham gia: không hoàn.",
  mentorCancelTitle: "Chính sách khi Mentor hủy / no-show",
  mentorCancelRefund:
    "Mentor hủy từ 24 giờ trở lên: đổi lịch, đổi Mentor hoặc hoàn 100% · Dưới 24 giờ: hoàn 100% ưu tiên · No-show: hoàn 100% + vi phạm Mentor.",
  userChangeSlotNote: "Đổi giờ: hủy buổi rồi đặt lại.",
};

export const CV_SHOWCASE_COPY = {
  badge: "Phân tích CV",
  titleLine1: "Làm sao để CV ấn tượng",
  titleLine2: "trong mắt nhà tuyển dụng?",
  body: "Để ProInterview gợi ý tin và chỉnh CV nè.",
  cta: "Phân tích CV với JD ngay",
};

export const MENTOR_SHOWCASE_COPY = {
  badge: "Mentor 1:1 thật",
  titleLine1: "Đã phân tích CV,",
  titleLine2: "hẹn mentor, biết ôn gì tiếp",
  steps: [
    {
      title: "Tìm đúng mentor",
      description: "Lọc ngành, kinh nghiệm, giá, rating. Xem profile và review trước khi đặt lịch.",
    },
    {
      title: "Đặt buổi mock 1:1",
      description: "Chọn slot, thanh toán rõ ràng. Thao tác đơn giản trên ProInterview.",
    },
    {
      title: "Nhận góp ý cụ thể",
      description: "Mentor chỉ điểm mạnh và phần cần chỉnh. Báo cáo buổi mock lưu trên app.",
    },
  ],
  afterMockLead: "Sau buổi mock, bạn nhận được",
  afterMockPoints: [
    { title: "Góp ý dễ hiểu", detail: "Mentor chỉ rõ điểm mạnh và phần cần chỉnh" },
    { title: "Tự tin hơn", detail: "Biết cách trả lời khi vào vòng phỏng vấn thật" },
    { title: "Lưu trên ProInterview", detail: "Báo cáo buổi mock, xem lại bất cứ lúc nào" },
    { title: "Biết bước tiếp", detail: "Rõ nên ôn gì và luyện tiếp phần nào" },
  ],
};

export const COURSES_SHOWCASE_COPY = {
  badge: "Khóa học từ mentor",
  titleLine1: "Học từ mentor thật",
  titleLine2: "Sửa lỗi từng bài",
  body: "Khóa học do mentor soạn. Học video và xem tiến độ trên ProInterview.",
  bullets: [
    "Video từng bài, theo lộ trình mentor",
    "Theo dõi tiến độ % từng khóa",
    "Chọn khóa đúng kỹ năng cần luyện",
  ],
  cta: "Xem tất cả khóa học",
  panelVideoTitle: "Video từng bài",
  panelVideoBody: "Ghi danh xong, mở hết bài trong khóa",
  panelVideoNote: "Ghi chú theo bài, học tiếp đúng chỗ",
};

export const FOOTER_TAGLINE =
  "ProInterview đồng hành cùng bạn luyện phỏng vấn. Gần gũi như bạn bè, rõ ràng như mentor, thông minh như AI.";

export const AUTH_COPY = {
  loginSubtitle: "Chào bạn trở lại! Tiếp tục luyện cùng ProInterview nhé.",
  loginRegisteredTitle: "Đăng ký thành công!",
  loginRegisteredBody: "Bạn đăng nhập để tiếp tục luyện nhé.",
  registerSubtitle: "Tạo tài khoản, bắt đầu luyện, không cần thẻ tín dụng.",
  registerPerks: [
    "Phân tích CV/JD, biết chỗ cần chỉnh trước",
    "Đặt lịch mentor 1:1 với HR/Manager thật",
    "Theo dõi tiến bộ và lịch sử buổi học",
    "Khóa học từ mentor, học theo lộ trình rõ ràng",
  ],
  registerFreeBadge: "Bắt đầu luyện miễn phí",
  registerFreeCta: "Tạo tài khoản và luyện nhé",
  registerSocialProof: "bạn đang luyện cùng ProInterview",
  verifyEmailLead:
    "ProInterview đã gửi link xác thực đến email của bạn. Bạn mở email, nhấn link để kích hoạt tài khoản, rồi đăng nhập nhé.",
  googleErrorLocked:
    "Tài khoản của bạn đang bị khóa. Bạn liên hệ prointerview.ai@gmail.com hoặc thử đăng nhập bằng email và mật khẩu.",
  googleErrorForbidden:
    "Không đăng nhập được bằng Google (403). Thường do tài khoản bị khóa, hoặc frontend chưa trỏ đúng API. Kiểm tra VITE_API_URL và GOOGLE_CLIENT_ID khớp giữa Vercel/Render.",
  googleErrorUnauthorized:
    "Google chưa xác thực được. Kiểm tra GOOGLE_CLIENT_ID giống nhau ở frontend (.env.local) và backend (.env), và thêm localhost:5173 vào Authorized JavaScript origins trong Google Cloud.",
};

export const DASHBOARD_GREETING_SUB =
  "Hôm nay bạn muốn luyện bước nào tiếp theo?";

export const PRICING_SUBTITLE =
  "Chọn gói phù hợp. Luyện tập, nhận góp ý và tiến bộ từng buổi, không áp lực.";
