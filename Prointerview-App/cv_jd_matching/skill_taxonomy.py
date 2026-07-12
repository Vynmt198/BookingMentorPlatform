"""
skill_taxonomy.py — Knowledge base kỹ năng lấy cảm hứng từ ESCO + O*NET.

ESCO (European Skills/Competences/Qualifications/Occupations):
  → Đồ thị quan hệ kỹ năng: biết A thì ngầm hiểu B, A và C có thể chuyển đổi nhau

O*NET OnLine (US Dept. of Labor):
  → Ánh xạ vai trò → kỹ năng yêu cầu (required/preferred) + mức độ ưu tiên

Mục đích: Làm giàu context cho LLM trước khi sinh suggestions,
giúp gợi ý cụ thể hơn thay vì chỉ "tham gia khóa học X".
"""

from __future__ import annotations


# ══════════════════════════════════════════════════════════════════════════════
# PHẦN 1 — ĐỒ THỊ KỸ NĂNG (ESCO-inspired)
# Cấu trúc: { "skill": { "implies": [...], "related": [...], "parent": str } }
#
# implies  = biết skill này thì ngầm có skill kia
# related  = kỹ năng tương tự / cùng hệ sinh thái (có thể chuyển đổi)
# parent   = danh mục cha
# ══════════════════════════════════════════════════════════════════════════════

SKILL_GRAPH: dict[str, dict] = {

    # ── JavaScript ecosystem ────────────────────────────────────────────────
    "javascript": {
        "implies":  ["html", "css", "dom", "json", "es6", "npm"],
        "related":  ["typescript", "node.js", "react", "vue", "angular"],
        "parent":   "frontend",
    },
    "typescript": {
        "implies":  ["javascript"],
        "related":  ["react", "angular", "node.js", "nestjs"],
        "parent":   "frontend",
    },
    "react": {
        "implies":  ["javascript", "html", "css", "component-based ui", "state management"],
        "related":  ["vue", "angular", "next.js", "react native", "redux", "zustand"],
        "parent":   "frontend",
    },
    "vue": {
        "implies":  ["javascript", "html", "css", "component-based ui"],
        "related":  ["react", "angular", "nuxt.js"],
        "parent":   "frontend",
    },
    "angular": {
        "implies":  ["typescript", "javascript", "html", "css", "rxjs", "component-based ui"],
        "related":  ["react", "vue", "nest.js"],
        "parent":   "frontend",
    },
    "next.js": {
        "implies":  ["react", "javascript", "ssr", "seo optimization"],
        "related":  ["nuxt.js", "remix", "gatsby"],
        "parent":   "frontend",
    },
    "react native": {
        "implies":  ["react", "javascript", "mobile development"],
        "related":  ["flutter", "expo", "ios", "android"],
        "parent":   "mobile",
    },

    # ── Node.js / Backend JS ────────────────────────────────────────────────
    "node.js": {
        "implies":  ["javascript", "npm", "rest api", "async programming"],
        "related":  ["express", "nestjs", "fastify", "bun"],
        "parent":   "backend",
    },
    "express": {
        "implies":  ["node.js", "rest api", "middleware", "routing"],
        "related":  ["fastify", "nestjs", "koa"],
        "parent":   "backend",
    },
    "nestjs": {
        "implies":  ["node.js", "typescript", "dependency injection", "rest api"],
        "related":  ["express", "spring boot", "django rest framework"],
        "parent":   "backend",
    },

    # ── Python ecosystem ────────────────────────────────────────────────────
    "python": {
        "implies":  ["scripting", "oop", "data structures", "pip"],
        "related":  ["django", "fastapi", "flask", "data science", "machine learning"],
        "parent":   "backend",
    },
    "django": {
        "implies":  ["python", "orm", "rest api", "mvc pattern", "sql"],
        "related":  ["fastapi", "flask", "rails", "laravel"],
        "parent":   "backend",
    },
    "fastapi": {
        "implies":  ["python", "rest api", "async programming", "pydantic", "openapi"],
        "related":  ["django", "flask", "express", "spring boot"],
        "parent":   "backend",
    },
    "flask": {
        "implies":  ["python", "rest api", "routing", "wsgi"],
        "related":  ["fastapi", "django", "express"],
        "parent":   "backend",
    },

    # ── Java / JVM ──────────────────────────────────────────────────────────
    "java": {
        "implies":  ["oop", "jvm", "maven", "multithreading", "design patterns"],
        "related":  ["kotlin", "spring boot", "scala"],
        "parent":   "backend",
    },
    "spring boot": {
        "implies":  ["java", "rest api", "dependency injection", "microservices", "sql"],
        "related":  ["nestjs", "django rest framework", "laravel"],
        "parent":   "backend",
    },
    "kotlin": {
        "implies":  ["java", "jvm", "oop"],
        "related":  ["java", "android", "spring boot"],
        "parent":   "mobile",
    },

    # ── PHP ─────────────────────────────────────────────────────────────────
    "php": {
        "implies":  ["html", "sql", "scripting", "server-side rendering"],
        "related":  ["laravel", "symfony", "wordpress"],
        "parent":   "backend",
    },
    "laravel": {
        "implies":  ["php", "orm", "rest api", "mvc pattern", "sql", "composer"],
        "related":  ["django", "rails", "fastapi"],
        "parent":   "backend",
    },

    # ── DevOps / Cloud ──────────────────────────────────────────────────────
    "docker": {
        "implies":  ["linux", "containerization", "microservices", "networking basics"],
        "related":  ["kubernetes", "podman", "docker compose"],
        "parent":   "devops",
    },
    "kubernetes": {
        "implies":  ["docker", "containerization", "orchestration", "yaml", "helm"],
        "related":  ["docker swarm", "ecs", "openshift"],
        "parent":   "devops",
    },
    "ci/cd": {
        "implies":  ["git", "automation", "testing", "deployment"],
        "related":  ["github actions", "jenkins", "gitlab ci", "circle ci"],
        "parent":   "devops",
    },
    "github actions": {
        "implies":  ["git", "ci/cd", "yaml", "automation"],
        "related":  ["jenkins", "gitlab ci", "circle ci"],
        "parent":   "devops",
    },
    "aws": {
        "implies":  ["cloud computing", "networking basics", "iam", "s3", "ec2"],
        "related":  ["gcp", "azure", "cloud infrastructure"],
        "parent":   "cloud",
    },
    "gcp": {
        "implies":  ["cloud computing", "networking basics"],
        "related":  ["aws", "azure"],
        "parent":   "cloud",
    },
    "azure": {
        "implies":  ["cloud computing", "networking basics", "active directory"],
        "related":  ["aws", "gcp"],
        "parent":   "cloud",
    },
    "terraform": {
        "implies":  ["infrastructure as code", "cloud computing", "hcl"],
        "related":  ["ansible", "pulumi", "cloudformation"],
        "parent":   "devops",
    },
    "linux": {
        "implies":  ["bash scripting", "file system", "process management", "networking basics"],
        "related":  ["unix", "ubuntu", "centos"],
        "parent":   "devops",
    },

    # ── Database ────────────────────────────────────────────────────────────
    "postgresql": {
        "implies":  ["sql", "relational database", "indexing", "transactions"],
        "related":  ["mysql", "sql server", "oracle"],
        "parent":   "database",
    },
    "mysql": {
        "implies":  ["sql", "relational database"],
        "related":  ["postgresql", "mariadb", "sql server"],
        "parent":   "database",
    },
    "mongodb": {
        "implies":  ["nosql", "json", "document database", "aggregation pipeline"],
        "related":  ["couchdb", "firestore", "dynamodb"],
        "parent":   "database",
    },
    "redis": {
        "implies":  ["caching", "in-memory database", "key-value store"],
        "related":  ["memcached", "elasticache"],
        "parent":   "database",
    },
    "elasticsearch": {
        "implies":  ["full-text search", "inverted index", "log analytics"],
        "related":  ["opensearch", "solr", "algolia"],
        "parent":   "database",
    },

    # ── Data Science / ML ───────────────────────────────────────────────────
    "machine learning": {
        "implies":  ["python", "statistics", "linear algebra", "pandas", "numpy", "scikit-learn"],
        "related":  ["deep learning", "data science", "nlp", "computer vision"],
        "parent":   "data",
    },
    "deep learning": {
        "implies":  ["machine learning", "neural networks", "python", "tensorflow or pytorch"],
        "related":  ["nlp", "computer vision", "generative ai"],
        "parent":   "data",
    },
    "tensorflow": {
        "implies":  ["python", "machine learning", "deep learning", "keras"],
        "related":  ["pytorch", "jax", "mxnet"],
        "parent":   "data",
    },
    "pytorch": {
        "implies":  ["python", "machine learning", "deep learning", "autograd"],
        "related":  ["tensorflow", "jax"],
        "parent":   "data",
    },
    "pandas": {
        "implies":  ["python", "data manipulation", "dataframes", "data cleaning"],
        "related":  ["numpy", "polars", "spark"],
        "parent":   "data",
    },
    "sql": {
        "implies":  ["relational database", "data querying", "joins", "aggregations"],
        "related":  ["postgresql", "mysql", "bigquery", "redshift"],
        "parent":   "database",
    },
    "spark": {
        "implies":  ["big data", "distributed computing", "scala or python", "hdfs"],
        "related":  ["hadoop", "flink", "databricks"],
        "parent":   "data",
    },

    # ── Mobile ──────────────────────────────────────────────────────────────
    "flutter": {
        "implies":  ["dart", "mobile development", "cross-platform", "widget-based ui"],
        "related":  ["react native", "ios", "android"],
        "parent":   "mobile",
    },
    "swift": {
        "implies":  ["ios development", "xcode", "uikit or swiftui", "objective-c basics"],
        "related":  ["kotlin", "react native", "flutter"],
        "parent":   "mobile",
    },

    # ── Quality / Testing ───────────────────────────────────────────────────
    "testing": {
        "implies":  ["unit testing", "test automation", "quality assurance"],
        "related":  ["jest", "pytest", "selenium", "cypress", "tdd"],
        "parent":   "quality",
    },
    "jest": {
        "implies":  ["javascript", "unit testing", "mocking"],
        "related":  ["vitest", "mocha", "jasmine", "react testing library"],
        "parent":   "quality",
    },

    # ── Soft skills / Agile ─────────────────────────────────────────────────
    "agile": {
        "implies":  ["scrum or kanban", "sprint planning", "retrospective", "jira or trello"],
        "related":  ["scrum", "kanban", "lean", "xp"],
        "parent":   "methodology",
    },
    "scrum": {
        "implies":  ["agile", "sprint", "backlog", "daily standup", "retrospective"],
        "related":  ["kanban", "safe", "xp"],
        "parent":   "methodology",
    },
    "git": {
        "implies":  ["version control", "branch management", "pull request", "merge conflict"],
        "related":  ["github", "gitlab", "bitbucket"],
        "parent":   "tooling",
    },
}


# ══════════════════════════════════════════════════════════════════════════════
# PHẦN 2 — YÊU CẦU VAI TRÒ (O*NET-inspired)
# Cấu trúc: { "role_key": { "required": [...], "preferred": [...], "context": str } }
#
# required  = kỹ năng bắt buộc theo chuẩn ngành
# preferred = nice-to-have
# context   = mô tả ngắn về vai trò
# ══════════════════════════════════════════════════════════════════════════════

ROLE_REQUIREMENTS: dict[str, dict] = {
    "frontend developer": {
        "required":  ["html", "css", "javascript", "responsive design", "git", "rest api"],
        "preferred": ["typescript", "react or vue or angular", "testing", "webpack or vite", "ux/ui basics"],
        "context":   "Xây dựng giao diện web tương tác, tối ưu trải nghiệm người dùng và hiệu năng tải trang.",
    },
    "backend developer": {
        "required":  ["ít nhất 1 ngôn ngữ server-side", "rest api", "sql", "git", "authentication"],
        "preferred": ["docker", "microservices", "caching (redis)", "message queue", "ci/cd"],
        "context":   "Thiết kế API, xử lý business logic, quản lý cơ sở dữ liệu và tích hợp dịch vụ bên ngoài.",
    },
    "fullstack developer": {
        "required":  ["html", "css", "javascript", "ít nhất 1 backend framework", "sql", "git", "rest api"],
        "preferred": ["typescript", "docker", "cloud basics", "testing", "ci/cd"],
        "context":   "Phát triển cả frontend lẫn backend, thường làm việc độc lập hoặc trong team nhỏ.",
    },
    "data engineer": {
        "required":  ["python or scala", "sql", "etl pipeline", "data warehousing", "git"],
        "preferred": ["spark", "airflow", "kafka", "cloud data services (bigquery/redshift/s3)", "docker"],
        "context":   "Xây dựng và vận hành pipeline dữ liệu, đảm bảo dữ liệu sạch và sẵn sàng cho phân tích.",
    },
    "data scientist": {
        "required":  ["python", "sql", "statistics", "machine learning", "pandas", "data visualization"],
        "preferred": ["deep learning", "spark", "a/b testing", "feature engineering", "mlops"],
        "context":   "Phân tích dữ liệu, xây dựng model dự đoán, trích xuất insight phục vụ quyết định kinh doanh.",
    },
    "machine learning engineer": {
        "required":  ["python", "machine learning", "deep learning", "sql", "git", "model deployment"],
        "preferred": ["mlops", "docker", "kubernetes", "tensorflow or pytorch", "cloud ml services", "feature store"],
        "context":   "Đưa model ML vào production, tối ưu hiệu năng và xây dựng hệ thống inference.",
    },
    "devops engineer": {
        "required":  ["linux", "docker", "ci/cd", "git", "scripting (bash or python)", "networking basics"],
        "preferred": ["kubernetes", "terraform", "monitoring (prometheus/grafana)", "cloud", "security"],
        "context":   "Tự động hóa quy trình triển khai, quản lý hạ tầng và đảm bảo uptime hệ thống.",
    },
    "mobile developer": {
        "required":  ["ít nhất 1 nền tảng (iOS/Android/React Native/Flutter)", "api integration", "git", "state management"],
        "preferred": ["cross-platform", "push notifications", "performance optimization", "app store deployment", "testing"],
        "context":   "Phát triển ứng dụng di động, tối ưu UX trên màn hình nhỏ và quản lý vòng đời app.",
    },
    "qa engineer": {
        "required":  ["test planning", "manual testing", "bug tracking", "api testing", "git"],
        "preferred": ["test automation (selenium/cypress)", "performance testing", "ci/cd integration", "security testing"],
        "context":   "Đảm bảo chất lượng phần mềm qua kiểm thử có hệ thống, giảm thiểu bug lên production.",
    },
    "product manager": {
        "required":  ["product roadmap", "user research", "stakeholder management", "agile/scrum", "data analysis basics"],
        "preferred": ["sql basics", "figma/prototyping", "a/b testing", "okr framework", "technical background"],
        "context":   "Định hướng sản phẩm, cân bằng nhu cầu khách hàng với khả năng kỹ thuật và mục tiêu kinh doanh.",
    },
    "ui/ux designer": {
        "required":  ["figma or adobe xd", "user research", "wireframing", "prototyping", "design system"],
        "preferred": ["html/css basics", "motion design", "accessibility", "usability testing", "design thinking"],
        "context":   "Tạo ra trải nghiệm người dùng trực quan, đẹp và dễ sử dụng từ nghiên cứu đến prototype.",
    },
}


# ── Alias mapping (để nhận diện vai trò từ JD text) ──────────────────────────

_ROLE_ALIASES: dict[str, str] = {
    "front-end":          "frontend developer",
    "front end":          "frontend developer",
    "fe developer":       "frontend developer",
    "fe engineer":        "frontend developer",
    "back-end":           "backend developer",
    "back end":           "backend developer",
    "be developer":       "backend developer",
    "be engineer":        "backend developer",
    "full-stack":         "fullstack developer",
    "full stack":         "fullstack developer",
    "fullstack":          "fullstack developer",
    "data eng":           "data engineer",
    "data engineering":   "data engineer",
    "data scientist":     "data scientist",
    "ds":                 "data scientist",
    "ml engineer":        "machine learning engineer",
    "machine learning":   "machine learning engineer",
    "mlops":              "machine learning engineer",
    "ai engineer":        "machine learning engineer",
    "devops":             "devops engineer",
    "sre":                "devops engineer",
    "platform engineer":  "devops engineer",
    "cloud engineer":     "devops engineer",
    "ios":                "mobile developer",
    "android":            "mobile developer",
    "react native":       "mobile developer",
    "flutter":            "mobile developer",
    "mobile":             "mobile developer",
    "qa":                 "qa engineer",
    "tester":             "qa engineer",
    "quality assurance":  "qa engineer",
    "product manager":    "product manager",
    "pm ":                "product manager",
    "ux":                 "ui/ux designer",
    "ui designer":        "ui/ux designer",
    "ux designer":        "ui/ux designer",
    "designer":           "ui/ux designer",
}


# ══════════════════════════════════════════════════════════════════════════════
# PHẦN 3 — HÀM TIỆN ÍCH
# ══════════════════════════════════════════════════════════════════════════════

def normalize(s: str) -> str:
    return s.lower().strip()


def get_implied_skills(skill: str) -> list[str]:
    """Trả về danh sách kỹ năng được ngầm hiểu nếu biết skill này."""
    return SKILL_GRAPH.get(normalize(skill), {}).get("implies", [])


def get_related_skills(skill: str) -> list[str]:
    """Trả về danh sách kỹ năng tương tự / có thể chuyển đổi."""
    return SKILL_GRAPH.get(normalize(skill), {}).get("related", [])


def infer_role_from_text(jd_text: str) -> str | None:
    """
    Đoán vai trò từ JD text bằng keyword matching.
    Trả về role key hoặc None nếu không xác định được.
    """
    lower = jd_text.lower()
    for alias, role in _ROLE_ALIASES.items():
        if alias in lower:
            return role
    return None


def get_transfer_context(candidate_skills: list[str], missing_skill: str) -> dict:
    """
    ESCO-style: Tìm kỹ năng ứng viên có thể chuyển đổi sang kỹ năng còn thiếu.

    Returns:
        {
          "has_related":    ["react"],           # kỹ năng ứng viên đang có mà liên quan
          "has_implied_by": ["javascript"],      # kỹ năng ứng viên có mà ngầm bao gồm 1 phần missing
          "transfer_note":  "Biết React → component-based UI có thể áp dụng cho Vue",
          "difficulty":     "easy|medium|hard",
        }
    """
    missing_key = normalize(missing_skill)
    candidate_set = {normalize(s) for s in candidate_skills}

    # Kỹ năng ứng viên có mà LIÊN QUAN đến missing
    missing_related = set(get_related_skills(missing_key))
    has_related = sorted(candidate_set & missing_related)

    # Kỹ năng ứng viên có mà NGẦM HIỂU 1 phần missing
    # (i.e. missing_skill nằm trong implies của skill mà ứng viên biết)
    has_implied_by = []
    for csk in candidate_set:
        if missing_key in [normalize(x) for x in get_implied_skills(csk)]:
            has_implied_by.append(csk)

    # Xây dựng transfer note
    transfer_note = ""
    if has_related:
        rel_display = ", ".join(has_related[:3])
        missing_info = SKILL_GRAPH.get(missing_key, {})
        parent = missing_info.get("parent", "lĩnh vực tương tự")
        transfer_note = (
            f"Ứng viên đã có {rel_display} — đây là kỹ năng cùng hệ sinh thái {parent}, "
            f"kinh nghiệm có thể tái diễn đạt để thể hiện nền tảng liên quan."
        )
    elif has_implied_by:
        imp_display = ", ".join(has_implied_by[:2])
        transfer_note = (
            f"Ứng viên đã có {imp_display} — kỹ năng này bao gồm một số khái niệm nền tảng "
            f"của {missing_skill}, có thể làm bàn đạp để học nhanh hơn."
        )

    # Ước tính độ khó chuyển đổi
    if has_related:
        difficulty = "easy"
    elif has_implied_by:
        difficulty = "medium"
    else:
        difficulty = "hard"

    return {
        "has_related":    has_related,
        "has_implied_by": has_implied_by,
        "transfer_note":  transfer_note,
        "difficulty":     difficulty,
    }


def get_role_priority(missing_skill: str, role_key: str | None) -> str:
    """
    O*NET-style: Xác định mức độ ưu tiên của missing_skill với vai trò cụ thể.
    Returns "critical" | "important" | "nice-to-have" | "unknown"
    """
    if not role_key or role_key not in ROLE_REQUIREMENTS:
        return "unknown"

    req = ROLE_REQUIREMENTS[role_key]
    ms_lower = normalize(missing_skill)

    for r in req["required"]:
        if ms_lower in normalize(r) or normalize(r) in ms_lower:
            return "critical"
    for p in req["preferred"]:
        if ms_lower in normalize(p) or normalize(p) in ms_lower:
            return "important"
    return "nice-to-have"


def enrich_missing_skills(
    missing: list[str],
    candidate_skills: list[str],
    jd_text: str,
    inferred_role: str | None = None,
) -> list[dict]:
    """
    Entry point chính: làm giàu danh sách kỹ năng còn thiếu với context ESCO + O*NET.

    Mỗi item trả về:
    {
      "skill":          "kubernetes",
      "transfer":       { has_related, has_implied_by, transfer_note, difficulty },
      "role_priority":  "critical|important|nice-to-have|unknown",
      "implied_skills": ["docker", "containerization", ...],   # kỹ năng mà missing này ngầm yêu cầu
      "related_skills": ["docker swarm", "ecs", ...],
    }
    """
    role = inferred_role or infer_role_from_text(jd_text)

    enriched = []
    for skill in missing:
        sk = normalize(skill)
        transfer = get_transfer_context(candidate_skills, skill)
        role_priority = get_role_priority(skill, role)
        implied = get_implied_skills(skill)
        related = get_related_skills(skill)

        enriched.append({
            "skill":          skill,
            "transfer":       transfer,
            "role_priority":  role_priority,
            "implied_skills": implied[:5],
            "related_skills": related[:4],
        })

    # Sắp xếp: critical trước, hard transfer sau
    priority_order = {"critical": 0, "important": 1, "nice-to-have": 2, "unknown": 3}
    difficulty_order = {"hard": 0, "medium": 1, "easy": 2}
    enriched.sort(key=lambda x: (
        priority_order.get(x["role_priority"], 3),
        difficulty_order.get(x["transfer"]["difficulty"], 1),
    ))

    return enriched


def build_taxonomy_context_for_prompt(enriched_skills: list[dict]) -> str:
    """
    Chuyển đổi enriched skills thành chuỗi context để nhúng vào LLM prompt.
    Giúp LLM hiểu quan hệ kỹ năng để đưa ra gợi ý cụ thể hơn.
    """
    if not enriched_skills:
        return "Không có thông tin taxonomy."

    lines = []
    for item in enriched_skills[:8]:   # giới hạn để không vượt token
        skill = item["skill"]
        t = item["transfer"]
        rp = item["role_priority"]
        priority_vi = {
            "critical":     "BẮT BUỘC",
            "important":    "QUAN TRỌNG",
            "nice-to-have": "CÓ THÊM TỐT",
            "unknown":      "KHÔNG RÕ",
        }.get(rp, "KHÔNG RÕ")

        difficulty_vi = {
            "easy":   "Dễ chuyển đổi",
            "medium": "Tương đối dễ học",
            "hard":   "Cần học từ đầu",
        }.get(t["difficulty"], "Không rõ")

        line = f"• [{priority_vi}] {skill} ({difficulty_vi})"
        if t["transfer_note"]:
            line += f"\n  → {t['transfer_note']}"
        elif item["implied_skills"]:
            line += f"\n  → Kỹ năng nền tảng cần có: {', '.join(item['implied_skills'][:3])}"
        lines.append(line)

    return "\n".join(lines)
