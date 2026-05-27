/**
 * Mock pipeline phân tích CV theo ngành — khớp shape Python field_analyzer / mapPythonCvPipelineToAnalysis.
 * Dùng khi /api/cv/analyze/field không khả dụng hoặc dev không chạy cv_jd_matching.
 */

const FIELD_PRESETS = {
  "IT / Công nghệ": {
    matched: ["JavaScript", "React", "Node.js", "Git", "REST API", "Agile"],
    missing: ["Docker", "AWS", "TypeScript", "CI/CD", "PostgreSQL"],
    matchScore: 58,
    scores: { clarity: 7.2, structure: 6.5, relevance: 7.8, credibility: 5.5, overall: 6.8 },
    position: "Software Engineer",
  },
  Marketing: {
    matched: ["SEO", "Google Analytics", "Content Marketing", "Social Media"],
    missing: ["Facebook Ads", "Copywriting", "CRM", "Email Marketing", "Branding"],
    matchScore: 52,
    scores: { clarity: 7.5, structure: 6.8, relevance: 6.2, credibility: 6.0, overall: 6.6 },
    position: "Marketing Executive",
  },
  "Tài chính / Kế toán": {
    matched: ["Excel", "Financial Analysis", "Accounting"],
    missing: ["SAP", "Power BI", "IFRS", "Budgeting", "Audit"],
    matchScore: 48,
    scores: { clarity: 7.0, structure: 7.2, relevance: 5.8, credibility: 6.5, overall: 6.4 },
    position: "Financial Analyst",
  },
  "Nhân sự": {
    matched: ["Recruitment", "Onboarding", "HR Policies"],
    missing: ["Payroll", "Labor Law", "Performance Management", "HRIS", "Training"],
    matchScore: 45,
    scores: { clarity: 7.8, structure: 6.0, relevance: 5.5, credibility: 5.8, overall: 6.3 },
    position: "HR Specialist",
  },
  "Quản lý sản phẩm": {
    matched: ["Agile", "Scrum", "Jira", "User Research"],
    missing: ["Product Roadmap", "SQL", "A/B Testing", "OKRs", "Figma"],
    matchScore: 55,
    scores: { clarity: 7.4, structure: 6.9, relevance: 6.8, credibility: 6.2, overall: 6.8 },
    position: "Product Owner",
  },
  "Thiết kế / UX": {
    matched: ["Figma", "UI Design", "Wireframing", "Prototyping"],
    missing: ["UX Research", "Design Systems", "Usability Testing", "Adobe XD"],
    matchScore: 62,
    scores: { clarity: 8.0, structure: 7.0, relevance: 7.2, credibility: 6.0, overall: 7.0 },
    position: "UI/UX Designer",
  },
  "Kinh doanh": {
    matched: ["Sales", "CRM", "Negotiation", "B2B"],
    missing: ["Lead Generation", "Pipeline", "Customer Success", "KPI"],
    matchScore: 50,
    scores: { clarity: 7.2, structure: 6.4, relevance: 6.0, credibility: 7.0, overall: 6.5 },
    position: "Business Development",
  },
  "Vận hành": {
    matched: ["Process Improvement", "KPI", "Logistics"],
    missing: ["Supply Chain", "Lean", "Six Sigma", "Inventory", "Vendor Management"],
    matchScore: 44,
    scores: { clarity: 6.8, structure: 6.5, relevance: 5.2, credibility: 5.5, overall: 6.0 },
    position: "Operations Coordinator",
  },
};

const DEFAULT_FIELD = "IT / Công nghệ";

function presetForField(field) {
  return FIELD_PRESETS[field] ?? FIELD_PRESETS[DEFAULT_FIELD];
}

/** @returns {object} Raw body giống FastAPI /analyze/field */
export function buildFieldAnalysisMockPipeline(field) {
  const f = (field || DEFAULT_FIELD).trim();
  const p = presetForField(f);
  const jdTotal = p.matched.length + p.missing.length;

  return {
    match: {
      matching: p.matched,
      missing: p.missing,
      match_score: p.matchScore,
      summary: { cv_total: p.matched.length + 2, jd_total: jdTotal },
    },
    scores: {
      clarity: {
        score: p.scores.clarity,
        reason: "CV trình bày khá rõ; có thể bổ sung số liệu KPI cho từng vai trò.",
      },
      structure: {
        score: p.scores.structure,
        reason: "Kinh nghiệm nên theo STAR để nhà tuyển dụng đọc nhanh hơn.",
      },
      relevance: {
        score: p.scores.relevance,
        reason: `So với bộ kỹ năng tham chiếu phổ biến trong ngành «${f}».`,
      },
      credibility: {
        score: p.scores.credibility,
        reason: "Thiếu số liệu định lượng (%, doanh thu, quy mô dự án) ở một số bullet.",
      },
      overall: p.scores.overall,
      summary: `CV thể hiện khoảng ${p.matchScore}% kỹ năng thường gặp trong ngành ${f} (dữ liệu demo).`,
    },
    suggestions: {
      executive_summary: `CV phù hợp mức trung bình–khá với ngành ${f}. Nên bổ sung ${p.missing.slice(0, 3).join(", ")} và làm rõ kết quả đo lường được.`,
      rewritten_bullets: [
        {
          original: "Tham gia phát triển sản phẩm và hỗ trợ team",
          rewritten: `Đồng phát triển tính năng lõi (${f}), phối hợp 4 người, rút ngắn 2 sprint release cycle.`,
          changes_made: ["Thêm quy mô team", "Gắn với ngành"],
          confidence: "medium",
        },
      ],
      missing_skill_suggestions: p.missing.slice(0, 5).map((skill, i) => ({
        skill,
        priority: i < 2 ? "high" : "medium",
        reframe_tip: `Thể hiện ${skill} qua dự án, chứng chỉ hoặc bullet có số liệu.`,
        acquisition_path: `Khóa học / side project 1–2 tháng tập trung ${skill}.`,
        estimated_effort: "1–3 tháng",
      })),
    },
    resume_text: "CV mẫu — phân tích theo ngành (demo ProInterview).",
    jd_text: "",
    field: f,
    position: p.position,
    analysis_mode: "field",
    _fallback: true,
    _mock: true,
  };
}
