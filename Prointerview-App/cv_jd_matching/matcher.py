"""
So sánh skills giữa CV và JD.
Tính matching skills, missing skills, và match score %.
"""

from __future__ import annotations
from rapidfuzz import fuzz


def compute_match(cv_skills: list[str], jd_skills: list[str]) -> dict:
    """
    So sánh skills CV vs JD với fuzzy matching để bắt biến thể.
    
    Returns:
        {
            "matching":       ["python", "docker", ...],
            "missing":        ["tensorflow", "mongodb", ...],
            "extra":          ["ruby", ...],  # CV có nhưng JD không yêu cầu
            "match_score":    72.5,           # % JD skills có trong CV
            "match_details":  [{"jd_skill": ..., "cv_match": ..., "score": ...}]
        }
    """
    cv_set  = [s.lower() for s in cv_skills]
    jd_set  = [s.lower() for s in jd_skills]

    matching      = []
    missing       = []
    match_details = []

    for jd_skill in jd_set:
        # Tìm best match trong CV skills
        best_match = None
        best_score = 0

        for cv_skill in cv_set:
            # Kết hợp 2 scorer: ratio (chính xác) + token_sort (linh hoạt thứ tự)
            score = max(
                fuzz.ratio(jd_skill, cv_skill),
                fuzz.token_sort_ratio(jd_skill, cv_skill)
            )
            if score > best_score:
                best_score = score
                best_match = cv_skill

        if best_score >= 80:  # ngưỡng coi là "match"
            matching.append(jd_skill)
            match_details.append({
                "jd_skill": jd_skill,
                "cv_match": best_match,
                "score": round(best_score, 1),
                "is_match": True
            })
        else:
            missing.append(jd_skill)
            match_details.append({
                "jd_skill": jd_skill,
                "cv_match": best_match,
                "score": round(best_score, 1),
                "is_match": False
            })

    # Skills CV có mà JD không đề cập
    matched_cv_skills = {d["cv_match"] for d in match_details if d["is_match"]}
    extra = [s for s in cv_set if s not in matched_cv_skills]

    match_score = (len(matching) / len(jd_set) * 100) if jd_set else 0

    return {
        "matching":      sorted(matching),
        "missing":       sorted(missing),
        "extra":         sorted(extra),
        "match_score":   round(match_score, 1),
        "match_details": match_details,
        "summary": {
            "jd_total":      len(jd_set),
            "matching_count": len(matching),
            "missing_count":  len(missing),
            "extra_count":    len(extra),
        }
    }


# ── Test ─────────────────────────────────────────────────────
if __name__ == "__main__":
    cv_skills  = ["python", "django", "postgresql", "docker", "redis", "pytorch", "aws"]
    jd_skills  = ["python", "fastapi", "mongodb", "docker", "tensorflow", "kubernetes", "aws", "ci/cd"]

    result = compute_match(cv_skills, jd_skills)

    print(f"Match score: {result['match_score']}%")
    print(f"\n✅ Matching ({result['summary']['matching_count']}):")
    for s in result["matching"]:
        print(f"   {s}")
    print(f"\n❌ Missing ({result['summary']['missing_count']}):")
    for s in result["missing"]:
        print(f"   {s}")
    print(f"\n➕ Extra in CV ({result['summary']['extra_count']}):")
    for s in result["extra"]:
        print(f"   {s}")
