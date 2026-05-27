"""
Skill extraction KHÔNG dùng LLM.
Kết hợp 3 phương pháp:
  1. Exact match    — tìm kỹ năng trong skills_db
  2. Alias resolve  — "k8s" → "kubernetes"
  3. RapidFuzz      — fuzzy match bắt typo và biến thể
"""

from __future__ import annotations
import json
import re
from pathlib import Path
from rapidfuzz import fuzz, process

# ── Load skill database ──────────────────────────────────────
_DB_PATH = "skills_db.json"

def _load_db() -> dict:
    with open(_DB_PATH, "r", encoding="utf-8") as f:
        return json.load(f)

_DB = _load_db()

# Tạo flat list tất cả kỹ năng (bỏ aliases và soft_skills nếu muốn)
ALL_SKILLS: list[str] = []
SKILL_CATEGORY: dict[str, str] = {}  # skill → category

for category, skills in _DB.items():
    if category == "aliases":
        continue
    for skill in skills:
        ALL_SKILLS.append(skill.lower())
        SKILL_CATEGORY[skill.lower()] = category

ALIASES: dict[str, str] = {k.lower(): v.lower() for k, v in _DB["aliases"].items()}


# ── Preprocessing ────────────────────────────────────────────
def preprocess(text: str) -> str:
    """Lowercase + chuẩn hoá dấu phân cách."""
    text = text.lower()
    # Giữ dấu chấm trong "next.js", "ci/cd"
    text = re.sub(r'[^a-z0-9\s./#+-]', ' ', text)
    return text


def tokenize_ngrams(text: str, max_n: int = 3) -> list[str]:
    """
    Tạo n-gram (1, 2, 3 từ) để bắt cụm như "machine learning", "spring boot".
    """
    words = text.split()
    ngrams = []
    for n in range(1, max_n + 1):
        for i in range(len(words) - n + 1):
            ngrams.append(" ".join(words[i:i+n]))
    return ngrams


# ── Core extraction ──────────────────────────────────────────
def extract_skills(text: str, fuzzy_threshold: int = 85) -> dict:
    """
    Trích xuất kỹ năng từ text.
    
    Args:
        text: nội dung CV hoặc JD đã parse
        fuzzy_threshold: ngưỡng similarity (0–100). 85 là cân bằng tốt.
    
    Returns:
        {
            "skills": ["python", "docker", ...],      # danh sách unique
            "by_category": {"programming": [...], ...},
            "raw_matches": [{"skill": ..., "method": ..., "score": ...}]
        }
    """
    processed = preprocess(text)
    ngrams = tokenize_ngrams(processed, max_n=3)
    
    found: dict[str, dict] = {}  # skill → best match info

    for ngram in ngrams:
        # Bỏ token 1 ký tự — tránh khớp nhầm "r" (ngôn ngữ R) với mọi chữ "r" trong CV tiếng Việt
        if len(ngram) < 2:
            continue

        # 1. Alias resolution trước
        resolved = ALIASES.get(ngram, ngram)
        
        # 2. Exact match
        if resolved in ALL_SKILLS:
            if resolved not in found:
                found[resolved] = {"method": "exact", "score": 100}
            continue

        # 3. Fuzzy match — chỉ với ngram ngắn để tránh false positive
        if len(ngram) >= 3:  # bỏ qua cụm quá ngắn
            match = process.extractOne(
                resolved,
                ALL_SKILLS,
                scorer=fuzz.token_sort_ratio,
                score_cutoff=fuzzy_threshold
            )
            if match:
                skill_name, score, _ = match
                # Chỉ cập nhật nếu score cao hơn lần match trước
                if skill_name not in found or found[skill_name]["score"] < score:
                    found[skill_name] = {"method": "fuzzy", "score": score}

    # ── Nhóm theo category ──────────────────────────────────
    by_category: dict[str, list] = {}
    for skill in found:
        cat = SKILL_CATEGORY.get(skill, "other")
        by_category.setdefault(cat, []).append(skill)

    # ── Sort: exact match trước, rồi theo score ─────────────
    raw_matches = [
        {"skill": s, **info} for s, info in found.items()
    ]
    raw_matches.sort(key=lambda x: (-x["score"], x["skill"]))

    return {
        "skills": sorted(found.keys()),
        "by_category": by_category,
        "raw_matches": raw_matches,
        "total": len(found),
    }


# ── Test ─────────────────────────────────────────────────────
if __name__ == "__main__":
    sample_cv = """
    Software Engineer with 3 years of experience in Python and Django.
    Worked extensively with PostgreSQL, Redis, and Docker containers.
    Built ML pipelines using PyTorch and scikit-learn.
    Familiar with AWS (S3, EC2, Lambda) and Kubernetes (k8s).
    """

    sample_jd = """
    We are looking for a Backend Engineer proficient in Python, FastAPI or Django.
    Experience with MongoDB, Redis. Knowledge of Docker, CI/CD pipelines.
    Nice to have: Machine Learning, TensorFlow, cloud platforms (AWS/GCP).
    """

    print("=== CV Skills ===")
    cv_result = extract_skills(sample_cv)
    for cat, skills in cv_result["by_category"].items():
        print(f"  [{cat}]: {', '.join(skills)}")

    print(f"\nTotal: {cv_result['total']} skills found")

    print("\n=== JD Skills ===")
    jd_result = extract_skills(sample_jd)
    for cat, skills in jd_result["by_category"].items():
        print(f"  [{cat}]: {', '.join(skills)}")
