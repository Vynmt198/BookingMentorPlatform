# CV/JD Matching — Danh sách tối ưu

## ❗ Cần fix ngay

- [x] **[field_analyzer.py:235]** CV limit còn 2,500 ký tự → tăng lên 7,000
- [x] **[field_analyzer.py:252]** `max_tokens=2000` cho field analysis → tăng lên 3,000

## ⚠️ Nên làm

- [x] **[llm_client.py:45]** `timeout=120s` → tăng lên 180s
- [x] **[skill_extractor.py]** Giới hạn 20 kỹ năng → tăng lên 30
- [x] **[CVAnalysis.jsx]** Khi Python service 503 → thêm thông báo "Dịch vụ tạm gián đoạn, thử lại sau 1–2 phút"

## 🔧 Dọn dẹp

- [x] **[main.py:123, 167]** Default `model="mistral:7b"` → đổi thành `None` (dùng `LLM_MODEL` từ env)
- [x] **[CVAnalysis.jsx]** Xoá Supabase legacy: import `projectId/publicAnonKey`, `EDGE_FN`, `SUPABASE_CONFIGURED`, `API_BASE`, `apiHeaders()`, `supabaseApiUrl()`

## 💡 Tính năng còn thiếu

- [ ] **Hỗ trợ DOCX** — nhiều CV Việt Nam gửi .docx, hiện chỉ nhận PDF
- [x] **Caching theo hash nội dung** — `cache.py` lưu kết quả vào `.cache/`, TTL 7 ngày, keyed by SHA256(cv_text + jd_text)

## ✅ Đã làm (3A.1)

- [x] **[cv_parser.py]** Tạo module mới — 1 LLM call parse full CV: skills + experience + education + projects + languages + certifications
- [x] **[cache.py]** Thêm `md5_of_bytes()` — cache key theo MD5(file bytes) thay vì text hash
- [x] **[main.py]** Tích hợp `parse_cv_structured` + cache MD5 vào `_process_upload()`
- [x] Tương thích ngược: `result["skills"]["skills"]` vẫn hoạt động cho matcher

## ✅ Đã làm (trước đó)

- [x] **[skill_extractor.py]** Tăng CV limit 3,000 → 6,000 ký tự
- [x] **[scorer.py]** Tăng CV limit 4,000 → 7,000, JD limit 3,000 → 4,000
- [x] **[suggester.py]** Tăng CV limit 3,500 → 7,000, JD limit 1,500 → 4,000 (cả 2 prompt)
- [x] **[suggester.py]** Fix comment sai "1600 ký tự" → "7000 ký tự"
- [x] **[skill_extractor.py]** LLM-based skill extraction (không bị giới hạn skills_db 124 kỹ năng)
- [x] **[scorer.py]** Scoring prompt chi tiết hơn: 4 dimension rõ ràng, yêu cầu trích dẫn cụ thể từ CV
- [x] **[suggester.py]** Mở rộng token limit: bullets 1,500→2,500, missing skills 1,400→2,000
