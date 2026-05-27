/**
 * competencyFramework.js
 * SHRM / DDI Competency Knowledge Base cho ProInterview AI.
 *
 * Nguồn tham chiếu:
 *  - SHRM Behavioral Competency Model (shrm.org/resourcesandtools/hr-topics/behavioral-competencies)
 *  - DDI Targeted Selection® / Leadership Frameworks (ddiworld.com)
 *
 * Kiến trúc:
 *  Layer 1 — Định nghĩa tĩnh (file này): SHRM definitions + DDI Key Actions + STAR rubric
 *  Layer 2 — Detect động từ CV/JD text: detectCompetenciesFromText()
 *  Layer 3 — Accumulation từ MongoDB: getFewShotContext() (gọi từ controller)
 */

// ── HELPER: Text normalization for diacritic-insensitive matching ─────────────

function normalizeForDetection(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ── 1. COMPETENCY LIBRARY ─────────────────────────────────────────────────────

export const COMPETENCY_LIBRARY = {

  problem_solving: {
    id: "problem_solving",
    nameVi: "Giải quyết vấn đề & Tư duy phản biện",
    nameEn: "Problem Solving & Critical Thinking",
    shrm: "SHRM Critical Evaluation Competency",
    ddi:  "DDI Problem Analysis & Decision Making",
    definition:
      "Phân tích tình huống phức tạp, xác định nguyên nhân gốc rễ, so sánh các giải pháp thay thế và đưa ra quyết định có cơ sở dữ liệu.",
    behavioralIndicators: [
      "Thu thập đủ dữ liệu và thông tin liên quan trước khi kết luận",
      "Xác định nguyên nhân gốc rễ thay vì xử lý triệu chứng bề mặt",
      "Đề xuất và so sánh ít nhất 2 giải pháp thay thế",
      "Đánh giá rủi ro và đánh đổi (trade-off) của từng phương án",
      "Theo dõi kết quả sau triển khai và điều chỉnh khi cần",
    ],
    ddiKeyActions: [
      "Seek Information — Chủ động thu thập dữ liệu từ nhiều nguồn đáng tin cậy",
      "Identify Patterns — Nhận ra xu hướng và mối liên hệ trong dữ liệu",
      "Generate Alternatives — Đề xuất nhiều phương án, không chỉ giải pháp đầu tiên",
      "Weigh Trade-offs — Đánh giá ưu/nhược điểm một cách hệ thống",
      "Take Decisive Action — Ra quyết định kịp thời với thông tin sẵn có",
      "Review & Learn — Đánh giá kết quả và rút bài học kinh nghiệm",
    ],
    starRubric: {
      excellent:   "Mô tả vấn đề phức tạp với nhiều biến số; tự chủ phân tích nguyên nhân; đề xuất ≥2 giải pháp có lý do rõ ràng; kết quả đo lường được (%, thời gian, chi phí).",
      proficient:  "Phân tích vấn đề đúng hướng; đề xuất giải pháp khả thi; thực hiện thành công trong phạm vi được giao.",
      developing:  "Chủ yếu mô tả hành động thực hiện theo chỉ dẫn; thiếu phân tích nguyên nhân hoặc đánh giá kết quả.",
    },
    keywords: [
      "bug", "lỗi", "vấn đề", "issue", "giải quyết", "phân tích",
      "debug", "optimize", "tối ưu", "incident", "sự cố", "root cause",
      "performance", "bottleneck", "diagnose", "troubleshoot",
    ],
    synonyms: [
      "xử lý", "critical thinking", "logic", "reasoning", "phán đoán",
      "decision making", "5 whys", "fishbone", "hypothesis", "infer",
    ],
    relevantLayers: ["theory", "project", "behavior"],
  },

  communication: {
    id: "communication",
    nameVi: "Giao tiếp & Trình bày",
    nameEn: "Communication",
    shrm: "SHRM Communication Competency",
    ddi:  "DDI Communication",
    definition:
      "Truyền đạt thông tin rõ ràng và có tổ chức; lắng nghe chủ động; điều chỉnh phong cách giao tiếp phù hợp với đối tượng và bối cảnh.",
    behavioralIndicators: [
      "Trình bày ý kiến mạch lạc với cấu trúc logic",
      "Lắng nghe đầy đủ và đặt câu hỏi làm rõ trước khi phản hồi",
      "Điều chỉnh ngôn ngữ kỹ thuật phù hợp với người nghe",
      "Chủ động chia sẻ thông tin liên quan với team và stakeholders",
      "Tiếp nhận phản hồi trái chiều và xử lý bất đồng một cách xây dựng",
    ],
    ddiKeyActions: [
      "Listen Actively — Lắng nghe đầy đủ, không ngắt lời, ghi nhận ý kiến đối phương",
      "Organize Thoughts — Sắp xếp ý tưởng theo cấu trúc trước khi trình bày",
      "Speak Clearly — Dùng ngôn ngữ phù hợp, tránh thuật ngữ không cần thiết",
      "Seek Understanding — Kiểm tra xem người nghe đã hiểu đúng chưa",
      "Share Proactively — Cập nhật thông tin liên quan mà không đợi được hỏi",
      "Handle Disagreement — Xử lý bất đồng trực tiếp và tôn trọng",
    ],
    starRubric: {
      excellent:   "Mô tả cụ thể cách điều chỉnh phong cách giao tiếp với đối tượng khác nhau; xử lý hiểu nhầm hoặc xung đột quan điểm hiệu quả; kết quả đạt được sự đồng thuận rõ ràng.",
      proficient:  "Giao tiếp rõ ràng trong tình huống mô tả; đạt mục tiêu truyền đạt thông tin.",
      developing:  "Chỉ mô tả nội dung truyền đạt, không cho thấy sự điều chỉnh phong cách hay đo lường hiệu quả.",
    },
    keywords: [
      "trình bày", "thuyết phục", "stakeholder", "báo cáo", "report",
      "document", "meeting", "họp", "giải thích", "communicate",
      "present", "explain", "feedback", "email", "slack",
    ],
    synonyms: [
      "verbal", "written", "lắng nghe", "active listening", "briefing",
      "narrative", "articulate", "pitch", "update", "announcement",
    ],
    relevantLayers: ["behavior"],
  },

  teamwork: {
    id: "teamwork",
    nameVi: "Làm việc nhóm & Cộng tác",
    nameEn: "Teamwork & Collaboration",
    shrm: "SHRM Relationship Management Competency",
    ddi:  "DDI Collaboration",
    definition:
      "Xây dựng và duy trì quan hệ làm việc hiệu quả; đặt mục tiêu chung lên trên lợi ích cá nhân; tôn trọng quan điểm đa dạng trong nhóm.",
    behavioralIndicators: [
      "Đặt mục tiêu nhóm lên trên lợi ích cá nhân",
      "Tôn trọng và tích hợp quan điểm đa dạng trong team",
      "Chủ động hỗ trợ đồng nghiệp khi gặp khó khăn",
      "Xây dựng lòng tin qua hành động nhất quán và minh bạch",
      "Giải quyết xung đột trực tiếp và mang tính xây dựng",
    ],
    ddiKeyActions: [
      "Contribute Actively — Đóng góp vào nỗ lực chung, không chờ được giao",
      "Support Others — Hỗ trợ đồng nghiệp đạt mục tiêu của họ",
      "Respect Diversity — Trân trọng góc nhìn và kinh nghiệm khác biệt",
      "Build Trust — Hành động nhất quán để tạo dựng uy tín",
      "Address Conflict — Xử lý bất đồng trực tiếp, không để âm ỉ",
      "Share Credit — Ghi nhận đóng góp của người khác một cách công bằng",
    ],
    starRubric: {
      excellent:   "Đóng vai trò chủ động trong việc hỗ trợ team; xử lý xung đột khéo léo; kết quả team cải thiện rõ ràng và ứng viên là người tạo điều kiện cho sự thành công đó.",
      proficient:  "Hợp tác tốt với team; đóng góp đều đặn vào kết quả chung.",
      developing:  "Thực hiện tốt phần việc cá nhân nhưng ít tương tác hoặc hỗ trợ đồng đội.",
    },
    keywords: [
      "team", "nhóm", "đồng nghiệp", "phối hợp", "cộng tác",
      "sprint", "scrum", "agile", "collaborate", "pair programming",
      "code review", "pull request", "cross-functional",
    ],
    synonyms: [
      "squad", "collective", "hỗ trợ nhau", "đoàn kết", "synergy",
      "partnership", "peer", "ensemble", "joint effort", "cooperative",
    ],
    relevantLayers: ["behavior"],
  },

  leadership: {
    id: "leadership",
    nameVi: "Lãnh đạo & Tạo ảnh hưởng",
    nameEn: "Leadership & Influence",
    shrm: "SHRM Leadership & Navigation Competency",
    ddi:  "DDI Coaching + Driving Execution",
    definition:
      "Định hướng, tạo động lực và dẫn dắt người khác hướng đến mục tiêu; phát triển năng lực của người khác qua coaching — kể cả khi không có quyền hạn chính thức.",
    behavioralIndicators: [
      "Thiết lập tầm nhìn và ưu tiên rõ ràng cho nhóm",
      "Truyền cảm hứng bằng cách kết nối công việc với mục đích lớn hơn",
      "Đưa ra quyết định khó trong tình huống mơ hồ hoặc áp lực cao",
      "Phát triển năng lực người khác qua phản hồi và coaching",
      "Dẫn dắt thay đổi một cách tự tin và nhất quán",
    ],
    ddiKeyActions: [
      "Set Direction — Xác định mục tiêu rõ ràng và truyền đạt đến team",
      "Inspire Commitment — Kết nối hành động với mục đích và giá trị chung",
      "Develop People — Cung cấp phản hồi kịp thời và cơ hội phát triển",
      "Drive Results — Đảm bảo cam kết và trách nhiệm giải trình",
      "Navigate Ambiguity — Dẫn dắt team qua giai đoạn không chắc chắn",
      "Model Integrity — Hành xử nhất quán với giá trị đã tuyên bố",
    ],
    starRubric: {
      excellent:   "Dẫn dắt thành công trong tình huống mơ hồ hoặc khó khăn; motivate người khác đạt kết quả vượt kỳ vọng; ảnh hưởng lan rộng ra ngoài phạm vi trực tiếp.",
      proficient:  "Dẫn dắt được team đạt mục tiêu đã cam kết; xử lý được các thách thức trong quá trình.",
      developing:  "Thực hiện tốt nhiệm vụ cá nhân; ít thể hiện hành vi ảnh hưởng hoặc phát triển người khác.",
    },
    keywords: [
      "lead", "mentor", "coach", "team lead", "tech lead", "dẫn dắt",
      "quản lý", "hướng dẫn", "senior", "manage", "ownership",
      "initiative", "junior", "onboard", "delegate",
    ],
    synonyms: [
      "inspire", "empower", "truyền cảm hứng", "vision", "tầm nhìn",
      "direction", "captain", "head of", "trưởng nhóm", "chief",
    ],
    relevantLayers: ["behavior", "project"],
  },

  adaptability: {
    id: "adaptability",
    nameVi: "Thích nghi & Phục hồi",
    nameEn: "Adaptability & Resilience",
    shrm: "SHRM Global & Cultural Effectiveness + Adaptability",
    ddi:  "DDI Adaptability",
    definition:
      "Duy trì hiệu quả và thái độ tích cực trong môi trường thay đổi; học nhanh từ thất bại; điều chỉnh hành vi linh hoạt theo hoàn cảnh mới.",
    behavioralIndicators: [
      "Tiếp cận thay đổi với thái độ cởi mở thay vì kháng cự",
      "Học nhanh kỹ năng hoặc công nghệ mới khi yêu cầu",
      "Phục hồi hiệu quả sau thất bại hoặc setback",
      "Điều chỉnh kế hoạch linh hoạt khi hoàn cảnh thay đổi",
      "Tìm cơ hội và học hỏi trong thách thức",
    ],
    ddiKeyActions: [
      "Embrace Change — Tiếp nhận thay đổi thay vì tìm cách tránh né",
      "Learn Quickly — Tiếp thu kiến thức và kỹ năng mới một cách chủ động",
      "Stay Positive — Duy trì tinh thần tích cực dưới áp lực",
      "Adjust Approach — Thay đổi phương pháp làm việc khi phương án cũ không hiệu quả",
      "Recover & Grow — Học từ thất bại và tiếp tục tiến lên mạnh mẽ hơn",
    ],
    starRubric: {
      excellent:   "Mô tả thay đổi lớn và bất ngờ (công nghệ, tổ chức, yêu cầu); chủ động thích nghi với kế hoạch cụ thể; kết quả sau thích nghi tốt hơn trước thay đổi.",
      proficient:  "Thích nghi được với thay đổi; duy trì hiệu quả công việc trong quá trình chuyển đổi.",
      developing:  "Phản ứng thụ động với thay đổi; cần nhiều thời gian và hỗ trợ để điều chỉnh.",
    },
    keywords: [
      "thay đổi", "change", "mới", "học", "adapt", "flexible",
      "pivot", "yêu cầu thay đổi", "deadline thay đổi", "startup",
      "uncertainty", "ambiguity", "pressure", "áp lực", "restructure",
    ],
    synonyms: [
      "resilience", "linh hoạt", "agile mindset", "growth mindset", "rebound",
      "bounce back", "cởi mở", "open-minded", "versatile", "dynamic",
    ],
    relevantLayers: ["behavior"],
  },

  technical_learning: {
    id: "technical_learning",
    nameVi: "Học hỏi kỹ thuật & Tự phát triển",
    nameEn: "Technical Learning Agility",
    shrm: "SHRM Business Acumen + Continuous Learning",
    ddi:  "DDI Learning Agility",
    definition:
      "Nắm vững kiến thức kỹ thuật chuyên sâu; chủ động học công nghệ mới; áp dụng kiến thức vào bài toán thực tế và chia sẻ với đồng đội.",
    behavioralIndicators: [
      "Nghiên cứu độc lập khi gặp bài toán kỹ thuật mới",
      "Áp dụng kiến thức lý thuyết vào bài toán thực tế hiệu quả",
      "Chia sẻ kiến thức kỹ thuật chủ động với đồng đội",
      "Theo dõi xu hướng công nghệ trong lĩnh vực",
      "Có dự án cá nhân hoặc đóng góp open source thể hiện năng lực",
    ],
    ddiKeyActions: [
      "Seek Knowledge — Chủ động tìm kiếm hiểu biết mới, không chỉ khi được yêu cầu",
      "Apply Learning — Áp dụng kiến thức mới vào công việc ngay lập tức",
      "Share Expertise — Chia sẻ kiến thức với team qua doc, talk, code review",
      "Stay Current — Cập nhật công nghệ và best practice liên tục",
      "Build Mastery — Đầu tư sâu vào lĩnh vực cốt lõi để trở thành chuyên gia",
    ],
    starRubric: {
      excellent:   "Tự học công nghệ mới ngoài yêu cầu công việc; áp dụng thành công vào dự án thực tế; kết quả đo được; chia sẻ kiến thức trở lại cho team.",
      proficient:  "Học được công nghệ mới khi công việc yêu cầu; áp dụng hiệu quả trong phạm vi dự án.",
      developing:  "Chủ yếu dùng kiến thức đã có; ít chủ động học thêm ngoài yêu cầu tối thiểu.",
    },
    keywords: [
      "học", "nghiên cứu", "tự học", "công nghệ mới", "course",
      "certification", "open source", "side project", "docs",
      "stackoverflow", "github", "blog", "paper", "research",
    ],
    synonyms: [
      "upskill", "reskill", "continuous learning", "lifelong learning", "knowledge",
      "workshop", "hackathon", "conference", "tự nghiên cứu", "deep dive",
    ],
    relevantLayers: ["theory", "project"],
  },

  planning_execution: {
    id: "planning_execution",
    nameVi: "Lập kế hoạch & Thực thi",
    nameEn: "Planning & Execution",
    shrm: "SHRM Business Acumen",
    ddi:  "DDI Planning & Organizing + Driving Execution",
    definition:
      "Xác định ưu tiên; lập kế hoạch chi tiết; phân bổ nguồn lực hợp lý; đảm bảo các cam kết được thực hiện đúng chất lượng và đúng hạn.",
    behavioralIndicators: [
      "Phân tích scope và chia nhỏ công việc phức tạp thành task quản lý được",
      "Xác định ưu tiên dựa trên impact và urgency",
      "Theo dõi tiến độ và phát hiện rủi ro sớm",
      "Quản lý nhiều nhiệm vụ song song mà không mất chất lượng",
      "Chủ động giao tiếp khi có thay đổi kế hoạch",
    ],
    ddiKeyActions: [
      "Set Priorities — Xác định và tập trung vào việc quan trọng nhất trước",
      "Create Plan — Lập kế hoạch chi tiết với milestone và owner rõ ràng",
      "Allocate Resources — Phân bổ thời gian và nguồn lực một cách thực tế",
      "Monitor Progress — Theo dõi tiến độ và điều chỉnh chủ động",
      "Communicate Changes — Thông báo thay đổi kế hoạch kịp thời",
      "Deliver Quality — Đảm bảo kết quả đạt tiêu chuẩn chất lượng đã cam kết",
    ],
    starRubric: {
      excellent:   "Dự án phức tạp với nhiều ràng buộc; tự lập kế hoạch từ đầu; phát hiện và xử lý rủi ro chủ động; giao đúng hạn với chất lượng cao và team hài lòng.",
      proficient:  "Lập kế hoạch và thực thi tốt trong phạm vi được giao; hoàn thành đúng deadline.",
      developing:  "Hoàn thành công việc nhưng cần nhiều hỗ trợ về lập kế hoạch hoặc bị trễ hạn.",
    },
    keywords: [
      "deadline", "sprint", "timeline", "milestone", "kế hoạch",
      "deliver", "project", "scope", "priority", "quản lý",
      "roadmap", "backlog", "estimate", "resource", "planning",
    ],
    synonyms: [
      "task management", "quản lý dự án", "work breakdown", "gantt", "schedule",
      "organize", "execution", "implementation", "phân công", "tiến độ",
    ],
    relevantLayers: ["project", "behavior"],
  },

  innovation: {
    id: "innovation",
    nameVi: "Đổi mới & Sáng tạo",
    nameEn: "Innovation & Creativity",
    shrm: "SHRM Critical Evaluation + Business Acumen",
    ddi:  "DDI Innovation",
    definition:
      "Đề xuất ý tưởng mới; thách thức hiện trạng một cách xây dựng; thử nghiệm nhanh và học từ kết quả để cải thiện sản phẩm, quy trình hoặc dịch vụ.",
    behavioralIndicators: [
      "Đặt câu hỏi về cách làm hiện tại khi thấy cơ hội cải tiến",
      "Đề xuất ý tưởng mới ngay cả khi chưa hoàn hảo",
      "Thử nghiệm nhanh (prototype/MVP) để kiểm chứng giả thuyết",
      "Tổng hợp ý tưởng từ nhiều nguồn và lĩnh vực khác nhau",
      "Kiên trì theo đuổi ý tưởng tốt dù gặp trở ngại ban đầu",
    ],
    ddiKeyActions: [
      "Challenge Assumptions — Đặt câu hỏi về cách tiếp cận hiện tại một cách xây dựng",
      "Generate Ideas — Đề xuất nhiều giải pháp sáng tạo không bị giới hạn bởi lối mòn",
      "Experiment Fast — Thử nghiệm nhanh để kiểm chứng giả thuyết với chi phí thấp",
      "Synthesize Sources — Kết hợp ý tưởng từ các lĩnh vực khác nhau",
      "Persist Through Resistance — Kiên trì phát triển ý tưởng có giá trị qua phản đối",
    ],
    starRubric: {
      excellent:   "Sáng kiến xuất phát từ quan sát thực tế; thử nghiệm có phương pháp; kết quả cải tiến đo lường được (%, thời gian, chi phí, UX); được áp dụng rộng rãi.",
      proficient:  "Đề xuất và thực hiện cải tiến cụ thể trong phạm vi công việc; kết quả tích cực.",
      developing:  "Thực hiện tốt theo hướng dẫn nhưng ít chủ động đổi mới hoặc đề xuất cải tiến.",
    },
    keywords: [
      "cải tiến", "sáng kiến", "tối ưu", "automation", "refactor",
      "idea", "optimize", "đề xuất", "initiative", "prototype",
      "mvp", "experiment", "a/b test", "proof of concept", "poc",
    ],
    synonyms: [
      "creative", "sáng tạo", "brainstorm", "disruptive", "hack",
      "design thinking", "lean startup", "iterate", "pilot", "novel",
    ],
    relevantLayers: ["project", "theory"],
  },

  // ── NEW COMPETENCIES (12 additions) ─────────────────────────────────────────

  customer_focus: {
    id: "customer_focus",
    nameVi: "Định hướng khách hàng",
    nameEn: "Customer Focus",
    shrm: "SHRM Service Orientation",
    ddi:  "DDI Customer Focus",
    definition:
      "Hiểu và đáp ứng nhu cầu khách hàng; đặt trải nghiệm khách hàng làm trung tâm quyết định; chủ động cải thiện dựa trên feedback.",
    behavioralIndicators: [
      "Chủ động tìm hiểu pain point và nhu cầu thực của khách hàng",
      "Ra quyết định sản phẩm dựa trên insight từ người dùng",
      "Đặt trải nghiệm khách hàng lên trên sự tiện lợi nội bộ",
      "Thu thập và hành động dựa trên phản hồi của khách hàng",
      "Đo lường và cải thiện mức độ hài lòng liên tục",
    ],
    ddiKeyActions: [
      "Seek Customer Input — Chủ động hỏi và lắng nghe khách hàng",
      "Understand Needs — Phân biệt nhu cầu thực sự và yêu cầu bề mặt",
      "Set High Standards — Đặt tiêu chuẩn chất lượng dịch vụ cao",
      "Act on Feedback — Biến phản hồi thành hành động cải tiến cụ thể",
      "Measure Satisfaction — Đo lường NPS, CSAT hoặc chỉ số tương đương",
    ],
    starRubric: {
      excellent:   "Xác định pain point cụ thể của khách hàng; đề xuất và triển khai cải tiến có đo lường; kết quả tăng satisfaction hoặc giảm complaint cụ thể.",
      proficient:  "Lắng nghe và phản hồi nhu cầu khách hàng hiệu quả; cải thiện trải nghiệm trong phạm vi công việc.",
      developing:  "Hoàn thành nhiệm vụ nhưng ít quan tâm chủ động đến phản hồi từ người dùng.",
    },
    keywords: [
      "khách hàng", "customer", "user", "người dùng", "ux", "trải nghiệm",
      "feedback", "satisfaction", "nps", "churn", "retention",
      "support", "service", "client", "requirement",
    ],
    synonyms: [
      "user research", "customer success", "người dùng cuối", "end user",
      "voice of customer", "voc", "empathy map", "journey map", "cx", "helpdesk",
    ],
    relevantLayers: ["behavior", "project"],
  },

  integrity: {
    id: "integrity",
    nameVi: "Chính trực & Đạo đức",
    nameEn: "Integrity & Ethics",
    shrm: "SHRM Ethical Practice",
    ddi:  "DDI Integrity & Trust",
    definition:
      "Hành xử trung thực và nhất quán với cam kết; chịu trách nhiệm về sai lầm; giữ bí mật thông tin; không đánh đổi giá trị vì lợi ích ngắn hạn.",
    behavioralIndicators: [
      "Nói thật ngay cả khi sự thật không thuận lợi",
      "Giữ đúng cam kết hoặc thông báo sớm khi không thể",
      "Thừa nhận sai lầm và chịu trách nhiệm cá nhân",
      "Bảo vệ thông tin bí mật của công ty và khách hàng",
      "Hành xử nhất quán giữa khi có và không có sự giám sát",
    ],
    ddiKeyActions: [
      "Be Honest — Truyền đạt thông tin chính xác, không tô vẽ hay che giấu",
      "Keep Commitments — Thực hiện đúng những gì đã hứa",
      "Admit Mistakes — Thừa nhận sai sót chủ động và kịp thời",
      "Protect Confidentiality — Bảo vệ dữ liệu và thông tin nhạy cảm",
      "Act Consistently — Hành xử theo cùng tiêu chuẩn trong mọi tình huống",
    ],
    starRubric: {
      excellent:   "Mô tả tình huống có áp lực vi phạm nguyên tắc; chủ động chọn con đường đúng dù khó; kết quả xây dựng được lòng tin dài hạn.",
      proficient:  "Hành xử trung thực và nhất quán trong tình huống mô tả; không vi phạm cam kết.",
      developing:  "Không có ví dụ cụ thể về tình huống thử thách đạo đức; câu trả lời chung chung.",
    },
    keywords: [
      "trung thực", "integrity", "đạo đức", "ethics", "minh bạch",
      "transparent", "tin tưởng", "trust", "cam kết", "commitment",
      "bảo mật", "confidential", "nguyên tắc", "principle", "honest",
    ],
    synonyms: [
      "fairness", "accountability", "moral", "value", "giá trị cốt lõi",
      "code of conduct", "compliance", "quy tắc", "uy tín", "credibility",
    ],
    relevantLayers: ["behavior"],
  },

  accountability: {
    id: "accountability",
    nameVi: "Trách nhiệm & Chủ động",
    nameEn: "Accountability & Ownership",
    shrm: "SHRM Accountability",
    ddi:  "DDI Taking Ownership",
    definition:
      "Chủ động chịu trách nhiệm về kết quả — cả thành công lẫn thất bại; không đổ lỗi; theo đuổi cam kết đến cùng dù gặp trở ngại.",
    behavioralIndicators: [
      "Nhận trách nhiệm về kết quả mà không đổ lỗi cho hoàn cảnh",
      "Chủ động tìm và đề xuất giải pháp thay vì chờ chỉ đạo",
      "Theo dõi tiến độ công việc đến khi hoàn thành thực sự",
      "Thừa nhận sai lầm và sửa chữa nhanh chóng",
      "Tự đặt ra tiêu chuẩn cao hơn mức tối thiểu yêu cầu",
    ],
    ddiKeyActions: [
      "Own Results — Nhận trách nhiệm đầy đủ về kết quả công việc",
      "Follow Through — Theo đuổi công việc đến khi hoàn thành",
      "Acknowledge Mistakes — Thừa nhận sai lầm không cần che giấu",
      "Take Initiative — Hành động proactive mà không đợi được giao",
      "Deliver Commitments — Giữ đúng mọi cam kết đã đưa ra",
    ],
    starRubric: {
      excellent:   "Nhận trách nhiệm khi dự án gặp vấn đề; tự chủ tìm giải pháp không chờ được giao; phục hồi và vượt mục tiêu ban đầu.",
      proficient:  "Chịu trách nhiệm rõ ràng về phần việc của mình; hoàn thành cam kết đúng hạn.",
      developing:  "Đổ lỗi cho hoàn cảnh hoặc người khác; cần nhắc nhở để theo dõi công việc.",
    },
    keywords: [
      "trách nhiệm", "ownership", "accountability", "chịu", "tự chủ",
      "initiative", "cam kết", "deadline", "giao hàng", "deliver",
      "follow-up", "theo dõi", "kết quả", "outcome",
    ],
    synonyms: [
      "proactive", "tự giác", "responsible", "dependable", "reliable",
      "commit", "self-driven", "chủ động", "tự quản", "owner mindset",
    ],
    relevantLayers: ["behavior", "project"],
  },

  data_driven_decision: {
    id: "data_driven_decision",
    nameVi: "Ra quyết định dựa trên dữ liệu",
    nameEn: "Data-Driven Decision Making",
    shrm: "SHRM Critical Evaluation",
    ddi:  "DDI Analytical Thinking",
    definition:
      "Sử dụng dữ liệu định lượng để ra quyết định; đặt câu hỏi về giả định bằng evidence; thiết lập metrics; đo lường kết quả và rút bài học.",
    behavioralIndicators: [
      "Thu thập và phân tích dữ liệu trước khi ra quyết định quan trọng",
      "Xác định metrics rõ ràng trước khi bắt đầu dự án",
      "Đặt câu hỏi về giả định với bằng chứng cụ thể",
      "Sử dụng A/B test hoặc thử nghiệm có kiểm soát",
      "Đánh giá kết quả dựa trên số liệu đo lường được",
    ],
    ddiKeyActions: [
      "Gather Data — Thu thập dữ liệu từ nhiều nguồn đáng tin cậy",
      "Analyze Trends — Phân tích xu hướng và pattern trong dữ liệu",
      "Challenge Assumptions — Kiểm chứng giả định bằng evidence",
      "Define Metrics — Xác định KPI rõ ràng trước khi triển khai",
      "Draw Conclusions — Rút kết luận từ phân tích và trình bày rõ ràng",
    ],
    starRubric: {
      excellent:   "Quyết định quan trọng dựa trên phân tích data cụ thể; xác định metrics rõ ràng trước; kết quả đo lường được sau quyết định.",
      proficient:  "Sử dụng dữ liệu để hỗ trợ phần lớn quyết định; có tracking cơ bản.",
      developing:  "Ra quyết định chủ yếu theo cảm tính; thiếu dữ liệu hỗ trợ hoặc không đo lường kết quả.",
    },
    keywords: [
      "data", "dữ liệu", "analytics", "metrics", "kpi", "dashboard",
      "sql", "excel", "bi", "tableau", "a/b test", "thống kê",
      "phân tích", "số liệu", "evidence", "measurement", "log", "query",
    ],
    synonyms: [
      "data analysis", "insight", "power bi", "looker", "google analytics",
      "quantitative", "report", "visualization", "chart", "business intelligence",
    ],
    relevantLayers: ["theory", "project", "behavior"],
  },

  stakeholder_management: {
    id: "stakeholder_management",
    nameVi: "Quản lý kỳ vọng & Đàm phán",
    nameEn: "Stakeholder Management",
    shrm: "SHRM Relationship Management",
    ddi:  "DDI Influencing Others",
    definition:
      "Xác định và quản lý kỳ vọng của các bên liên quan; xây dựng đồng thuận; navigate organizational politics; align diverse interests hướng đến mục tiêu chung.",
    behavioralIndicators: [
      "Xác định và ưu tiên các bên liên quan chủ chốt từ đầu dự án",
      "Chủ động quản lý kỳ vọng qua giao tiếp thường xuyên",
      "Xây dựng sự đồng thuận giữa các bên có lợi ích khác nhau",
      "Điều hướng áp lực chính trị tổ chức một cách khéo léo",
      "Đạt alignment mà không gây mất lòng các bên",
    ],
    ddiKeyActions: [
      "Identify Stakeholders — Xác định và phân loại các bên liên quan",
      "Align Expectations — Thiết lập kỳ vọng rõ ràng từ sớm",
      "Build Buy-In — Xây dựng sự ủng hộ từ các bên liên quan",
      "Navigate Politics — Điều hướng khéo léo qua các mối quan hệ tổ chức",
      "Communicate Progress — Cập nhật tiến độ định kỳ với các bên",
    ],
    starRubric: {
      excellent:   "Quản lý được stakeholder có lợi ích xung đột; xây dựng alignment mà không mất thời gian quá dài; kết quả được tất cả bên chấp thuận.",
      proficient:  "Quản lý kỳ vọng tốt với stakeholder chính; dự án được approve đúng hạn.",
      developing:  "Ít chú ý đến stakeholder cho đến khi phát sinh vấn đề; thiếu chủ động cập nhật.",
    },
    keywords: [
      "stakeholder", "bên liên quan", "quản lý kỳ vọng", "alignment",
      "buy-in", "sponsor", "pm", "product", "business", "yêu cầu",
      "requirement", "negotiate", "đàm phán", "approve", "sign-off",
    ],
    synonyms: [
      "executive sponsor", "key stakeholder", "business owner", "quản lý cấp trên",
      "phê duyệt", "expectation", "relationship", "influence", "persuade", "lobby",
    ],
    relevantLayers: ["behavior", "project"],
  },

  conflict_resolution: {
    id: "conflict_resolution",
    nameVi: "Giải quyết xung đột",
    nameEn: "Conflict Resolution",
    shrm: "SHRM Consultation",
    ddi:  "DDI Resolving Conflict",
    definition:
      "Nhận diện xung đột sớm; đối mặt trực tiếp và xây dựng; tìm giải pháp win-win; duy trì mối quan hệ tích cực sau khi giải quyết.",
    behavioralIndicators: [
      "Nhận diện dấu hiệu xung đột trước khi leo thang",
      "Tiếp cận xung đột trực tiếp thay vì tránh né",
      "Lắng nghe tất cả các bên trước khi đưa ra giải pháp",
      "Tìm kiếm giải pháp win-win thay vì bên thắng bên thua",
      "Duy trì quan hệ làm việc tốt sau khi giải quyết",
    ],
    ddiKeyActions: [
      "Address Directly — Đối mặt với xung đột trực tiếp và kịp thời",
      "Listen to All Sides — Lắng nghe góc nhìn của tất cả các bên",
      "Find Common Ground — Tìm điểm chung và lợi ích chia sẻ",
      "Negotiate Solutions — Đàm phán giải pháp cả hai bên chấp nhận",
      "Restore Relationships — Khôi phục quan hệ tích cực sau xung đột",
    ],
    starRubric: {
      excellent:   "Xung đột phức tạp nhiều bên; tiếp cận chủ động và trung lập; giải pháp đạt đồng thuận; quan hệ sau đó tốt hơn trước.",
      proficient:  "Giải quyết xung đột hiệu quả giữa hai bên; quan hệ được duy trì tốt.",
      developing:  "Tránh né xung đột hoặc chỉ đưa ra giải pháp tạm thời; ít chú ý đến mối quan hệ lâu dài.",
    },
    keywords: [
      "xung đột", "conflict", "bất đồng", "disagree", "mâu thuẫn",
      "căng thẳng", "tension", "dispute", "giải quyết", "resolution",
      "đồng thuận", "compromise", "thương lượng", "mediate",
    ],
    synonyms: [
      "disagreement", "friction", "hòa giải", "arbitrate", "negotiate",
      "de-escalate", "trung gian", "facilitation", "dialogue", "reconcile",
    ],
    relevantLayers: ["behavior"],
  },

  coaching_development: {
    id: "coaching_development",
    nameVi: "Phát triển & Coaching người khác",
    nameEn: "Coaching & Developing Others",
    shrm: "SHRM Leadership & Navigation",
    ddi:  "DDI Developing Others",
    definition:
      "Phát triển năng lực người khác qua feedback kịp thời, coaching 1-1, mentoring; tạo cơ hội stretch assignment; tin tưởng giao việc thách thức.",
    behavioralIndicators: [
      "Xác định điểm mạnh và điểm cần phát triển của từng cá nhân",
      "Cung cấp feedback cụ thể, kịp thời và có tính xây dựng",
      "Tạo cơ hội thách thức để người khác phát triển",
      "Coaching để người khác tự tìm ra giải pháp thay vì chỉ dạy",
      "Theo dõi sự tiến bộ và ghi nhận thành quả",
    ],
    ddiKeyActions: [
      "Identify Development Needs — Xác định nhu cầu phát triển của từng cá nhân",
      "Provide Feedback — Đưa ra feedback kịp thời, cụ thể và xây dựng",
      "Create Growth Opportunities — Tạo cơ hội để người khác thử thách bản thân",
      "Coach for Performance — Đặt câu hỏi thay vì chỉ cho đáp án",
      "Recognize Progress — Ghi nhận và khích lệ tiến bộ",
    ],
    starRubric: {
      excellent:   "Phát triển một cá nhân cụ thể từ mức kém đến tốt; feedback có cấu trúc; kết quả người đó đạt được mục tiêu mới rõ ràng.",
      proficient:  "Cung cấp feedback hữu ích và hỗ trợ đồng nghiệp phát triển trong phạm vi công việc.",
      developing:  "Chia sẻ kiến thức khi được hỏi nhưng ít chủ động phát triển người khác.",
    },
    keywords: [
      "mentor", "coach", "hướng dẫn", "đào tạo", "training",
      "feedback", "junior", "onboard", "1-1", "one-on-one",
      "phát triển", "develop", "teach", "tutoring", "knowledge transfer", "share",
    ],
    synonyms: [
      "buddy", "apprentice", "upskill team", "staff development", "performance review",
      "career growth", "succession", "talent development", "workshop", "facilitating",
    ],
    relevantLayers: ["behavior"],
  },

  strategic_thinking: {
    id: "strategic_thinking",
    nameVi: "Tư duy chiến lược",
    nameEn: "Strategic Thinking",
    shrm: "SHRM Business Acumen",
    ddi:  "DDI Strategic Thinking",
    definition:
      "Nhìn toàn cảnh và dài hạn; kết nối công việc hàng ngày với mục tiêu chiến lược; dự đoán xu hướng; đặt câu hỏi về 'tại sao' và 'mục đích gì'.",
    behavioralIndicators: [
      "Kết nối công việc hàng ngày với mục tiêu chiến lược dài hạn",
      "Nhận ra cơ hội và thách thức trước khi chúng hiện hữu rõ ràng",
      "Đặt câu hỏi về tại sao và mục đích trước khi làm",
      "Dự đoán tác động dài hạn của quyết định hiện tại",
      "Đề xuất hướng đi mới dựa trên xu hướng thị trường",
    ],
    ddiKeyActions: [
      "See Big Picture — Nhìn nhận tình huống trong bức tranh tổng thể",
      "Connect to Strategy — Kết nối hành động với chiến lược tổ chức",
      "Anticipate Trends — Dự đoán xu hướng và cơ hội tương lai",
      "Think Long-term — Cân nhắc tác động dài hạn trong quyết định",
      "Align Resources — Phân bổ nguồn lực theo ưu tiên chiến lược",
    ],
    starRubric: {
      excellent:   "Nhận ra cơ hội chiến lược mà người khác bỏ qua; đề xuất hướng đi dài hạn với lý luận rõ ràng; kết quả tạo impact lớn hơn phạm vi công việc.",
      proficient:  "Hiểu và đóng góp vào mục tiêu chiến lược; ra quyết định có tính đến dài hạn.",
      developing:  "Tập trung vào nhiệm vụ ngắn hạn; ít kết nối với định hướng chiến lược.",
    },
    keywords: [
      "chiến lược", "strategy", "roadmap", "vision", "dài hạn",
      "long-term", "mục tiêu", "goal", "okr", "kpi", "business",
      "thị trường", "market", "cạnh tranh", "competitive", "ecosystem", "platform",
    ],
    synonyms: [
      "north star", "mission", "sứ mệnh", "tầm nhìn", "future",
      "trend", "landscape", "positioning", "differentiation", "growth strategy",
    ],
    relevantLayers: ["behavior", "theory"],
  },

  emotional_intelligence: {
    id: "emotional_intelligence",
    nameVi: "Trí tuệ cảm xúc",
    nameEn: "Emotional Intelligence",
    shrm: "SHRM Global Effectiveness",
    ddi:  "DDI Emotional Intelligence",
    definition:
      "Nhận thức và điều chỉnh cảm xúc cá nhân; thể hiện đồng cảm với người khác; duy trì bình tĩnh dưới áp lực; đọc được không khí trong nhóm.",
    behavioralIndicators: [
      "Nhận thức được cảm xúc cá nhân và tác động của chúng",
      "Điều chỉnh phản ứng cảm xúc trước khi hành động",
      "Thể hiện sự đồng cảm với khó khăn của đồng nghiệp",
      "Duy trì bình tĩnh và hiệu quả dưới áp lực cao",
      "Đọc được tâm trạng nhóm và phản hồi phù hợp",
    ],
    ddiKeyActions: [
      "Self-Awareness — Nhận thức rõ ràng cảm xúc và điểm mạnh/yếu của bản thân",
      "Manage Emotions — Điều chỉnh phản ứng cảm xúc một cách có chủ đích",
      "Show Empathy — Đặt mình vào vị trí người khác để hiểu góc nhìn của họ",
      "Read the Room — Nhận biết tâm trạng và động lực của nhóm",
      "Stay Composed — Giữ bình tĩnh trong tình huống căng thẳng",
    ],
    starRubric: {
      excellent:   "Tình huống cảm xúc cao (deadline, conflict, failure); nhận ra và điều chỉnh phản ứng của mình; kết quả giữ được team focus và tích cực.",
      proficient:  "Giữ bình tĩnh trong phần lớn tình huống căng thẳng; thể hiện đồng cảm rõ ràng.",
      developing:  "Phản ứng cảm xúc ảnh hưởng tiêu cực đến giao tiếp; ít thể hiện đồng cảm.",
    },
    keywords: [
      "cảm xúc", "emotion", "áp lực", "pressure", "stress", "bình tĩnh",
      "calm", "đồng cảm", "empathy", "tâm lý", "tinh thần", "morale",
      "động lực", "motivation", "thấu hiểu", "lắng nghe",
    ],
    synonyms: [
      "eq", "self-awareness", "tự nhận thức", "composure", "emotional regulation",
      "social awareness", "rapport", "mindfulness", "patience", "kiên nhẫn",
    ],
    relevantLayers: ["behavior"],
  },

  results_orientation: {
    id: "results_orientation",
    nameVi: "Định hướng kết quả",
    nameEn: "Results Orientation",
    shrm: "SHRM Business Acumen",
    ddi:  "DDI Driving Execution",
    definition:
      "Đặt tiêu chuẩn cao; tập trung vào kết quả đo lường được; không dừng lại đến khi đạt mục tiêu; liên tục cải tiến hiệu suất cá nhân và nhóm.",
    behavioralIndicators: [
      "Đặt mục tiêu tham vọng và cam kết đạt được",
      "Tập trung vào kết quả cuối cùng hơn là quy trình",
      "Chủ động loại bỏ trở ngại để đạt mục tiêu",
      "Theo dõi hiệu suất liên tục và điều chỉnh sớm",
      "Vượt qua kỳ vọng ban đầu với nỗ lực bổ sung",
    ],
    ddiKeyActions: [
      "Set High Standards — Đặt tiêu chuẩn cao cho bản thân và người khác",
      "Focus on Outcomes — Tập trung vào kết quả, không chỉ hoạt động",
      "Remove Obstacles — Chủ động giải quyết trở ngại đang chặn tiến độ",
      "Drive Urgency — Tạo cảm giác cấp bách phù hợp để thúc đẩy hành động",
      "Measure Progress — Theo dõi tiến độ qua số liệu cụ thể",
    ],
    starRubric: {
      excellent:   "Mục tiêu tham vọng tự đặt ra; vượt qua trở ngại chủ động; kết quả vượt kỳ vọng ban đầu với số liệu cụ thể.",
      proficient:  "Đạt được mục tiêu đã cam kết; duy trì hiệu suất cao trong phần lớn tình huống.",
      developing:  "Hoàn thành công việc ở mức tối thiểu; ít chủ động cải thiện kết quả.",
    },
    keywords: [
      "kết quả", "result", "target", "mục tiêu", "goal", "hiệu suất",
      "performance", "vượt", "exceed", "achieve", "hoàn thành", "complete",
      "impact", "output", "kpi", "okr", "deliver", "ship",
    ],
    synonyms: [
      "outcome", "achievement", "high performance", "kết quả xuất sắc",
      "vượt chỉ tiêu", "overachieve", "winner", "champion", "excellence", "standard",
    ],
    relevantLayers: ["behavior", "project"],
  },

  risk_management: {
    id: "risk_management",
    nameVi: "Quản lý rủi ro",
    nameEn: "Risk Management",
    shrm: "SHRM Critical Evaluation",
    ddi:  "DDI Decision Making under Uncertainty",
    definition:
      "Nhận diện rủi ro sớm trong dự án và quyết định; đánh giá xác suất và tác động; lập kế hoạch mitigation; đưa ra quyết định có cân nhắc rủi ro.",
    behavioralIndicators: [
      "Xác định rủi ro tiềm ẩn trước khi bắt đầu dự án",
      "Đánh giá xác suất và mức độ tác động của từng rủi ro",
      "Lập kế hoạch mitigation và contingency cụ thể",
      "Theo dõi các tín hiệu cảnh báo sớm",
      "Escalate vấn đề kịp thời trước khi leo thang",
    ],
    ddiKeyActions: [
      "Identify Risks — Nhận diện rủi ro tiềm ẩn trong dự án và quyết định",
      "Assess Impact — Đánh giá xác suất và mức độ tác động",
      "Plan Mitigation — Lập kế hoạch giảm thiểu rủi ro chủ động",
      "Monitor Signals — Theo dõi dấu hiệu cảnh báo liên tục",
      "Escalate Early — Báo cáo vấn đề sớm thay vì chờ đến khi quá muộn",
    ],
    starRubric: {
      excellent:   "Phát hiện rủi ro trước khi xảy ra; lập kế hoạch mitigation cụ thể; rủi ro được kiểm soát hoặc giảm thiểu đáng kể.",
      proficient:  "Nhận diện và xử lý rủi ro chính trong dự án; có kế hoạch dự phòng cơ bản.",
      developing:  "Chủ yếu phản ứng sau khi rủi ro xảy ra; ít chú ý đến phòng ngừa.",
    },
    keywords: [
      "rủi ro", "risk", "an toàn", "security", "bảo mật", "backup",
      "contingency", "incident", "sự cố", "phòng ngừa", "mitigation",
      "monitor", "alert", "rollback", "disaster", "recovery",
    ],
    synonyms: [
      "risk assessment", "vulnerability", "threat", "safeguard", "prevention",
      "issue tracking", "escalation", "risk register", "dự phòng", "phòng thủ",
    ],
    relevantLayers: ["project", "theory", "behavior"],
  },

  cross_functional_influence: {
    id: "cross_functional_influence",
    nameVi: "Tạo ảnh hưởng liên phòng ban",
    nameEn: "Cross-Functional Influence",
    shrm: "SHRM Relationship Management",
    ddi:  "DDI Influencing Without Authority",
    definition:
      "Tạo ảnh hưởng và đạt kết quả thông qua người không báo cáo trực tiếp; xây dựng liên minh; align priorities giữa các team; navigate ma trận tổ chức.",
    behavioralIndicators: [
      "Xây dựng quan hệ tốt với các team không cùng phòng ban",
      "Thuyết phục người khác cộng tác mà không dùng quyền hạn",
      "Tìm lợi ích chung để tạo sự đồng thuận",
      "Điều phối hiệu quả các team có ưu tiên khác nhau",
      "Duy trì quan hệ liên phòng ban dài hạn",
    ],
    ddiKeyActions: [
      "Build Alliances — Xây dựng quan hệ chiến lược với các team liên quan",
      "Find Common Interests — Xác định lợi ích chung để tạo cơ sở hợp tác",
      "Communicate Value — Truyền đạt giá trị của sự hợp tác cho tất cả bên",
      "Gain Commitment — Đạt cam kết thực sự từ các team không trực thuộc",
      "Navigate Structure — Điều hướng trong cấu trúc tổ chức phức tạp",
    ],
    starRubric: {
      excellent:   "Dự án cross-team phức tạp; không có quyền hạn chính thức; xây dựng được đồng thuận và cam kết từ nhiều team; kết quả đạt được.",
      proficient:  "Phối hợp hiệu quả với các team khác; dự án cross-functional hoàn thành đúng hạn.",
      developing:  "Hạn chế giao tiếp ngoài team; cần hỗ trợ của cấp trên để làm việc với phòng ban khác.",
    },
    keywords: [
      "cross-team", "cross-functional", "phối hợp", "collaborate", "liên phòng ban",
      "align", "đồng bộ", "integrate", "api", "dependency", "release",
      "coordination", "multi-team", "squad", "chapter", "tribe",
    ],
    synonyms: [
      "matrix organization", "lateral influence", "without authority", "coalition",
      "networking", "liên kết", "phối hợp liên bộ phận", "horizontal collaboration", "guild", "chapter",
    ],
    relevantLayers: ["behavior", "project"],
  },

};

// ── 2. ROLE → COMPETENCY PRIORITY MAP ────────────────────────────────────────
// Thứ tự = ưu tiên: index 0 = quan trọng nhất cho role này

export const ROLE_COMPETENCY_MAP = {
  frontend:         ["technical_learning", "problem_solving", "communication", "results_orientation", "adaptability", "teamwork"],
  backend:          ["technical_learning", "problem_solving", "planning_execution", "risk_management", "innovation", "results_orientation"],
  fullstack:        ["technical_learning", "problem_solving", "adaptability", "planning_execution", "results_orientation", "teamwork"],
  devops:           ["technical_learning", "problem_solving", "risk_management", "planning_execution", "adaptability", "results_orientation"],
  mobile:           ["technical_learning", "problem_solving", "adaptability", "customer_focus", "teamwork", "results_orientation"],
  data:             ["technical_learning", "data_driven_decision", "problem_solving", "communication", "strategic_thinking", "results_orientation"],
  ai_ml:            ["technical_learning", "problem_solving", "innovation", "data_driven_decision", "communication", "strategic_thinking"],
  manager:          ["leadership", "communication", "coaching_development", "strategic_thinking", "stakeholder_management", "accountability", "planning_execution"],
  product:          ["communication", "strategic_thinking", "customer_focus", "stakeholder_management", "data_driven_decision", "leadership"],
  design:           ["customer_focus", "communication", "innovation", "adaptability", "emotional_intelligence", "teamwork"],
  marketing:        ["communication", "data_driven_decision", "customer_focus", "innovation", "strategic_thinking", "results_orientation"],
  sales:            ["communication", "customer_focus", "results_orientation", "adaptability", "stakeholder_management", "emotional_intelligence"],
  hr:               ["communication", "coaching_development", "emotional_intelligence", "integrity", "teamwork", "leadership"],
  developer:        ["technical_learning", "problem_solving", "accountability", "teamwork", "communication", "planning_execution"],
  default:          ["problem_solving", "communication", "teamwork", "accountability", "adaptability", "results_orientation"],
};

// ── 3. ROLE DETECTION ─────────────────────────────────────────────────────────

export function detectRoleCategory(position = "", field = "") {
  const t = `${position} ${field}`.toLowerCase();
  if (/frontend|react|vue|angular|next\.?js|nuxt/.test(t))            return "frontend";
  if (/backend|node|java|spring|django|rails|laravel|golang|rust/.test(t)) return "backend";
  if (/fullstack|full.?stack/.test(t))                                 return "fullstack";
  if (/devops|cloud|aws|gcp|azure|infra|sre|platform|k8s|docker/.test(t)) return "devops";
  if (/mobile|android|ios|flutter|react native|swift|kotlin/.test(t)) return "mobile";
  if (/data|analyst|bi |etl|warehouse|tableau|power bi/.test(t))       return "data";
  if (/\bai\b|ml\b|machine learning|deep learning|nlp|llm/.test(t))   return "ai_ml";
  if (/manager|director|head|cto|ceo|vp |lead/.test(t))               return "manager";
  if (/product|pm\b|po\b|product owner/.test(t))                       return "product";
  if (/design|ux|ui designer|figma/.test(t))                          return "design";
  if (/marketing|seo|content|growth/.test(t))                         return "marketing";
  if (/sales|business dev|account exec/.test(t))                      return "sales";
  if (/hr|human resource|talent|recruit/.test(t))                     return "hr";
  if (/developer|engineer|programmer|software/.test(t))               return "developer";
  return "default";
}

// ── 4. COMPETENCY DETECTION FROM CV/JD TEXT ──────────────────────────────────
// Weighted keyword scoring — không tốn LLM token, chạy O(n) trên text
// - Exact keyword match in original text: score += 3
// - Synonym match in original text: score += 2
// - Normalized (diacritic-stripped) keyword match: score += 3
// - Normalized synonym match: score += 2

export function detectCompetenciesFromText(cvText = "", jdText = "") {
  const combined = `${cvText} ${jdText}`;
  const combinedNorm = normalizeForDetection(combined);
  const scores = {};

  for (const [id, comp] of Object.entries(COMPETENCY_LIBRARY)) {
    let score = 0;
    const combinedLower = combined.toLowerCase();

    // Keyword matching — weight 3
    for (const kw of comp.keywords) {
      const kwLower = kw.toLowerCase();
      if (combinedLower.includes(kwLower)) {
        score += 3;
      } else {
        // Normalized fallback for diacritic-insensitive match
        const kwNorm = normalizeForDetection(kw);
        if (kwNorm.length > 1 && combinedNorm.includes(kwNorm)) {
          score += 3;
        }
      }
    }

    // Synonym matching — weight 2
    if (Array.isArray(comp.synonyms)) {
      for (const syn of comp.synonyms) {
        const synLower = syn.toLowerCase();
        if (combinedLower.includes(synLower)) {
          score += 2;
        } else {
          const synNorm = normalizeForDetection(syn);
          if (synNorm.length > 1 && combinedNorm.includes(synNorm)) {
            score += 2;
          }
        }
      }
    }

    scores[id] = score;
  }

  return Object.entries(scores)
    .sort(([, a], [, b]) => b - a)
    .map(([id]) => id);
}

// ── 5. MERGE: ROLE MAP + TEXT DETECTION ──────────────────────────────────────
// Kết hợp role priority + keyword evidence → top N competency ids

export function resolveTopCompetencies(position, field, cvText, jdText, topN = 4) {
  const roleCategory = detectRoleCategory(position, field);
  const rolePriority = ROLE_COMPETENCY_MAP[roleCategory] ?? ROLE_COMPETENCY_MAP.default;
  const textDetected = detectCompetenciesFromText(cvText, jdText);

  // Score: role map vị trí cao hơn (weight 3), text detection weight 1
  const scoreMap = {};
  rolePriority.forEach((id, idx) => {
    scoreMap[id] = (scoreMap[id] ?? 0) + (rolePriority.length - idx) * 3;
  });
  textDetected.forEach((id, idx) => {
    scoreMap[id] = (scoreMap[id] ?? 0) + Math.max(0, textDetected.length - idx);
  });

  return {
    roleCategory,
    competencyIds: Object.entries(scoreMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, topN)
      .map(([id]) => id),
  };
}

// ── 6. BUILD PROMPT CONTEXT ───────────────────────────────────────────────────
// Inject chỉ các competency được detect vào system prompt (tiết kiệm token)

export function buildCompetencyPromptBlock(competencyIds) {
  const blocks = competencyIds
    .map(id => COMPETENCY_LIBRARY[id])
    .filter(Boolean)
    .map(c => `### ${c.nameVi}  [${c.shrm} | ${c.ddi}]
Định nghĩa: ${c.definition}

DDI Key Actions (những hành vi cần tìm trong câu trả lời):
${c.ddiKeyActions.map(a => `  • ${a}`).join("\n")}

STAR Rubric — Câu trả lời xuất sắc:
  "${c.starRubric.excellent}"`);

  return blocks.join("\n\n");
}

// ── 7. COMPETENCY DISTRIBUTION GUIDE FOR QUESTION GENERATION ─────────────────
// Hướng dẫn LLM phân phối câu hỏi theo competency và layer

export function buildDistributionGuide(competencyIds) {
  const comps = competencyIds.map(id => COMPETENCY_LIBRARY[id]).filter(Boolean);
  const lines = comps.map((c, i) => {
    const preferredLayer = c.relevantLayers[0];
    return `  Q${i + 1}: nhắm vào "${c.nameVi}" — layer ưu tiên: ${preferredLayer}`;
  });
  // Đảm bảo luôn có ít nhất 2 behavior trong 5 câu
  return lines.join("\n");
}
