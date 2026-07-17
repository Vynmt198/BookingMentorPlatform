"""
cv_parser.py — Parse CV thành JSON có cấu trúc bằng 1 LLM call duy nhất.

Output: { skills, experience, education, projects, languages, certifications }
Fallback về skill_extractor nếu LLM lỗi.
"""

from __future__ import annotations
from llm_client import call_llm, extract_json
from skill_extractor import extract_skills_llm

_SYSTEM = """Bạn là chuyên gia phân tích CV. Trả lời CHỈ bằng JSON hợp lệ duy nhất.
Không giải thích, không markdown, không code fence."""

_FALLBACK: dict = {
    "skills": [],
    "by_category": {},
    "experience": [],
    "education": [],
    "projects": [],
    "languages": [],
    "certifications": [],
    "raw_matches": [],
    "total": 0,
}


def parse_cv_structured(cv_text: str, model: str = None) -> dict:
    """
    1 LLM call → toàn bộ CV có cấu trúc.
    Tương thích ngược: vẫn trả về field 'skills' dạng list để matcher dùng.
    """
    prompt = f"""Phân tích CV sau và trả về JSON có cấu trúc đầy đủ.

=== CV ===
{cv_text[:7000]}

Trả về JSON với đúng schema này (tất cả text bằng tiếng Việt nếu CV tiếng Việt, giữ nguyên nếu tiếng Anh):
{{
  "skills": ["python", "react", "docker"],
  "by_category": {{
    "programming_languages": [],
    "frameworks_libraries": [],
    "databases": [],
    "cloud_devops": [],
    "ai_ml": [],
    "tools": [],
    "soft_skills": [],
    "other": []
  }},
  "experience": [
    {{
      "company": "Tên công ty",
      "title": "Vị trí",
      "duration": "01/2021 - 12/2023",
      "years": 3.0,
      "bullets": ["Mô tả công việc 1", "Mô tả công việc 2"]
    }}
  ],
  "education": [
    {{
      "institution": "Tên trường",
      "degree": "Bằng cấp / Chuyên ngành",
      "year": "2018 - 2022",
      "gpa": "3.5"
    }}
  ],
  "projects": [
    {{
      "name": "Tên dự án",
      "description": "Mô tả ngắn",
      "tech_stack": ["react", "nodejs"]
    }}
  ],
  "languages": [
    {{"language": "Tiếng Anh", "level": "B2 / Intermediate"}}
  ],
  "certifications": [
    {{"name": "AWS Solutions Architect", "issuer": "Amazon", "year": "2023"}}
  ]
}}

Quy tắc:
- skills[]: chỉ kỹ năng cấp độ chính, tối đa 30, lowercase
- experience[].years: số năm làm tại công ty đó (float, ví dụ 2.5)
- Nếu không có thông tin → trả mảng rỗng []
- Không bịa thông tin không có trong CV"""

    try:
        raw = call_llm(_SYSTEM, prompt, max_tokens=2000, temperature=0.05, ollama_model=model)
        parsed = extract_json(raw, {})

        if parsed and not parsed.get("_parse_error"):
            skills = [s.lower().strip() for s in (parsed.get("skills") or []) if s]
            unique_skills = sorted(set(skills))

            by_category = {
                cat: [s.lower().strip() for s in lst if s]
                for cat, lst in (parsed.get("by_category") or {}).items()
            }

            return {
                "skills":         unique_skills,
                "by_category":    by_category,
                "experience":     parsed.get("experience")     or [],
                "education":      parsed.get("education")      or [],
                "projects":       parsed.get("projects")       or [],
                "languages":      parsed.get("languages")      or [],
                "certifications": parsed.get("certifications") or [],
                "raw_matches":    [{"skill": s, "method": "llm", "score": 100} for s in unique_skills],
                "total":          len(unique_skills),
            }
    except (ConnectionError, TimeoutError, RuntimeError):
        pass

    # Fallback: dùng skill_extractor (chỉ có skills, không có structure)
    skill_result = extract_skills_llm(cv_text, model=model)
    return {**_FALLBACK, **skill_result}
