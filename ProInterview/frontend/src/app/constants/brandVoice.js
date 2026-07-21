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
  titleLine2Suffix: "cùng",
  titleExtraLines: ["Mentor thật"],
  cta: "Phân tích CV ngay",
  ctaMentor: "Tìm Mentor ngay",
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
    titleLine1: "Luyện phỏng vấn hôm nay,",
    titleLine2: "tự tin chinh phục job ngày\u00a0mai.",
  },
  steps: [
    {
      step: "01",
      title: "Phân tích CV với JD",
      desc: "ProInterview chỉ rõ chỗ khớp, chỗ thiếu. Bạn biết sửa đâu trước khi nộp hồ sơ.",
    },
    {
      step: "02",
      title: "Kết nối Mentor 1:1",
      desc: "Kết nối với Mentor để được góp ý cụ thể và có chiến lược chuẩn bị phù hợp.",
    },
    {
      step: "03",
      title: "Khóa học",
      desc: "Video và bài tập mentor duyệt. Học xong biết áp dụng vào CV và buổi phỏng vấn.",
    },
  ],
  /** Bản gốc sếp — tham chiếu, không xóa. */
  stepsBossOriginal: [
    {
      step: "01",
      title: "Tối ưu CV theo vị trí ứng tuyển",
      desc: "ProInterview giúp bạn đối chiếu CV với vị trí ứng tuyển, chỉ ra điểm khớp, điểm thiếu và những phần nên cải thiện trước khi nộp hồ sơ.",
    },
    {
      step: "02",
      title: "Luyện phỏng vấn với AI",
      desc: "Phỏng vấn với AI theo vị trí ứng tuyển, nhận góp ý sau từng câu trả lời và biết mình cần sửa gì để trả lời rõ ràng hơn.",
    },
    {
      step: "03",
      title: "Kết nối Mentor 1:1",
      desc: "Kết nối với Mentor để được góp ý cụ thể và có chiến lược chuẩn bị phù hợp.",
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
      title: "Phỏng vấn thử với AI",
      desc: "Câu hỏi sát JD, góp ý STAR từng câu. Bạn biết chỗ cần chỉnh sau mỗi lượt.",
      cta: "Vào phòng luyện",
    },
    {
      title: "Mentor 1:1 thật",
      desc: "Đặt lịch HR/Manager. Kinh nghiệm thực chiến, không hứa quá đà.",
      cta: "Chọn Mentor",
    },
    {
      title: "Theo dõi tiến độ",
      desc: "Lịch sử luyện và tiến bộ trên một chỗ. Bạn thấy rõ bạn đã tiến bộ đến đâu.",
      cta: "Xem lịch hẹn",
    },
  ],
  testimonials: {
    titleLine: "Phản hồi từ người dùng",
    body: "Luyện với AI, nhận góp ý từ Mentor và cải thiện rõ hơn sau từng buổi.",
    socialProof: "Bạn đã luyện và nhận offer.",
    badge: "Đánh giá nổi bật.",
    items: [
      {
        name: "Phạm Anh Tuấn",
        role: "Software Engineer @ Shopee",
        text: "Mình luyện AI vài buổi rồi mock với Mentor Shopee, tự tin hơn rõ. Câu hỏi sát thực tế, góp ý đúng chỗ cần sửa.",
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
  badge: "Tối ưu CV theo vị trí ứng tuyển",
  titleAccent: "Làm sao để CV ấn tượng",
  titleRest: "trong mắt nhà tuyển dụng?",
  body: "ProInterview giúp bạn kiểm tra, góp ý và cải thiện CV trước khi gửi đến nhà tuyển dụng.",
  cta: "Tối ưu CV theo vị trí ứng tuyển ngay",
};

/** Hub `/cv-analysis` — hero trái (khác section Home). */
export const CV_HUB_HERO_COPY = {
  titleAccent: "Làm sao để CV ấn tượng",
  titleRest: "trong mắt nhà tuyển dụng?",
  bodyLine1: "ProInterview giúp bạn kiểm tra, góp ý và cải thiện CV",
  bodyLine2: "trước khi gửi đến nhà tuyển dụng.",
  ctaJd: "Tối ưu CV theo vị trí ứng tuyển",
  ctaField: "Phân tích CV theo ngành nghề",
};

export const MENTOR_SHOWCASE_COPY = {
  badge: "Mentor 1:1 thật",
  titleLine1: "Đã phân tích CV,",
  titleLine2: "hẹn mentor, biết ôn gì tiếp",
  steps: [
    {
      title: "Chọn Mentor phù hợp",
      description:
        "Chọn Mentor theo ngành, kinh nghiệm và mục tiêu luyện phỏng vấn của bạn.",
    },
    {
      title: "Đặt lịch luyện tập 1:1",
      description:
        "Chọn thời gian phù hợp và bắt đầu buổi luyện phỏng vấn cùng Mentor.",
    },
    {
      title: "Nhận góp ý cụ thể",
      description: "Nhận góp ý về CV, cách trả lời và hướng luyện tiếp theo.",
    },
  ],
  afterMockLead: "Sau buổi mock, bạn nhận được.",
  afterMockPoints: [
    { title: "Góp ý dễ hiểu", detail: "Mentor chỉ rõ điểm mạnh và phần cần chỉnh." },
    { title: "Tự tin hơn", detail: "Biết cách trả lời khi vào vòng phỏng vấn thật." },
    { title: "Lưu trên ProInterview", detail: "Báo cáo buổi mock, xem lại bất cứ lúc nào." },
    { title: "Biết bước tiếp", detail: "Rõ nên ôn gì và luyện tiếp phần nào." },
  ],
};

/** Sidebar đặt lịch / thẻ giá mentor (không dùng “Mock interview”). */
export const MENTOR_BOOKING_COPY = {
  sessionTitle: "Buổi Mentor 1:1",
  sessionVia: "Buổi 1:1 qua Zoom / Google Meet",
  flexibleSchedule: "Tự chọn khung giờ linh hoạt.",
  feedbackAfter: "Góp ý sau buổi Mentor.",
};

export const COURSES_SHOWCASE_COPY = {
  sectionTitle: "Nâng Tầm Bản Thân, Chinh Phục Mọi Cuộc Phỏng Vấn",
  sectionTitleLine1: "Nâng Tầm Bản Thân,",
  sectionTitleLine2: "Chinh Phục Mọi Cuộc Phỏng Vấn",
  badge: "Khóa học từ Mentor",
  titleLine1: "Luyện phỏng vấn",
  titleLine2: "qua khóa học thực tế",
  panelTitle: "Luyện phỏng vấn",
  body: "Tham gia các khóa học chuyên sâu được thiết kế để trang bị cho bạn những kiến thức và kỹ năng cần thiết để chinh phục mọi buổi phỏng vấn.",
  bodyLine1:
    "Tham gia các khóa học chuyên sâu được thiết kế để trang bị cho bạn",
  bodyLine2: "những kiến thức và kỹ năng cần thiết để chinh phục mọi buổi phỏng vấn.",
  bullets: [
    "Chuyên gia dày dặn kinh nghiệm đến từ các tập đoàn lớn.",
    "Phản hồi chi tiết, cá nhân hóa để giúp bạn cải thiện từng ngày.",
    "Lịch học linh hoạt, phù hợp với mọi thời gian biểu.",
    "Cam kết hiệu quả, giúp bạn tự tin hơn trong các buổi phỏng vấn thật.",
  ],
  cta: "Xem khóa luyện phỏng vấn",
  panelVideoTitle: "Video từng bài",
  panelVideoBody: "Ghi danh xong, mở hết bài trong khóa.",
  panelVideoNote: "Ghi chú theo bài, học tiếp đúng chỗ.",
};

export const FOOTER_TAGLINE =
  "ProInterview là nền tảng luyện phỏng vấn với AI và hỗ trợ kết nối Mentor.";

export const AUTH_COPY = {
  loginSubtitle: "Chào bạn trở lại! Tiếp tục luyện cùng ProInterview nhé.",
  loginRegisteredTitle: "Đăng ký thành công!",
  loginRegisteredBody: "Bạn đăng nhập để tiếp tục luyện nhé.",
  registerSubtitle: "Tạo tài khoản, bắt đầu phỏng vấn với AI.",
  registerPerks: [
    "3 buổi phỏng vấn AI để làm quen và luyện tập.",
    "Phân tích CV/JD, biết chỗ cần chỉnh trước.",
    "Câu hỏi theo ngành và vị trí bạn chọn.",
    "Lịch Mentor và lịch sử luyện, theo dõi tiến bộ.",
  ],
  registerFreeBadge: "Bắt đầu luyện miễn phí",
  registerFreeCta: "Tạo tài khoản và luyện nhé",
  registerSocialProof: "Bạn đang luyện cùng ProInterview.",
  verifyEmailLead:
    "ProInterview đã gửi link xác thực đến email của bạn. Bạn mở email, nhấn link để kích hoạt tài khoản, rồi đăng nhập nhé.",
  googleErrorLocked:
    "Tài khoản của bạn đang bị khóa. Bạn liên hệ prointerview.ai@gmail.com hoặc thử đăng nhập bằng email và mật khẩu.",
  googleErrorForbidden:
    "Không đăng nhập được bằng Google (403). Thường do tài khoản bị khóa, hoặc frontend chưa trỏ đúng API. Kiểm tra VITE_API_URL và GOOGLE_CLIENT_ID khớp giữa Vercel/Render.",
  googleErrorUnauthorized:
    "Google chưa xác thực được. Kiểm tra GOOGLE_CLIENT_ID giống nhau ở frontend (.env.local) và backend (.env), và thêm localhost:5173 vào Authorized JavaScript origins trong Google Cloud.",
  forgotPasswordSubtitle:
    "Nhập email đã đăng ký. Nếu tài khoản có mật khẩu, ProInterview sẽ gửi link đặt lại qua email.",
  forgotPasswordSentTitle: "Kiểm tra hộp thư",
  forgotPasswordSentBody:
    "Nếu email tồn tại và tài khoản có mật khẩu, bạn sẽ nhận hướng dẫn đặt lại trong vài phút. Nhớ kiểm tra cả hộp thư spam.",
  resetPasswordSubtitle: "Nhập mật khẩu mới cho tài khoản ProInterview của bạn.",
  resetPasswordDoneTitle: "Mật khẩu đã được cập nhật",
  resetPasswordDoneBody: "Bạn có thể đăng nhập ngay bằng mật khẩu mới.",
};

export const DASHBOARD_GREETING_SUB =
  "Hôm nay bạn muốn luyện bước nào tiếp theo?";

export const PRICING_SUBTITLE =
  "Lựa chọn gói luyện tập, nhận góp ý và cải thiện kỹ năng qua từng buổi.";

/** Email hỗ trợ khách hàng — hiển thị SupportContact, footer, v.v. */
export const SUPPORT_EMAIL = "supportprointerview@gmail.com";
