# ProInterview — Tài liệu API & tích hợp (đầy đủ)

File trong repo: `API_INDEX.md`. Cập nhật khi thêm route, đổi FE hoặc đổi provider (Supabase / thanh toán).

| Phần | Nội dung |
|:-----|:---------|
| **A** | Backend Express — entrypoint `backend/src/server.js` |
| **B** | Supabase Edge (CV), D-ID — FE gọi trực tiếp |
| **C** | Tham chiếu contract (method/path); **trạng thái triển khai** xem cột trong [`ROADMAP.md`](./ROADMAP.md) |

---

## Mục lục

1. [Chú giải trạng thái](#chú-giải-trạng-thái)
2. [Biến môi trường liên quan](#biến-môi-trường-liên-quan)
3. [Base URL & xác thực](#base-url--xác-thực)
4. [Phần A — Backend Express](#phần-a--backend-express-đã-có-trong-repo)
5. [Phần B — Tích hợp ngoài](#phần-b--tích-hợp-ngoài-fe-gọi-trực-tiếp)
6. [Phần C — Roadmap API (tham chiếu)](#phần-c--roadmap-api-tham-chiếu)
7. [Query params chuẩn (dự kiến)](#query-params-chuẩn-dự-kiến)
8. [Định dạng response](#định-dạng-response)
9. [Mã lỗi gợi ý](#mã-lỗi-gợi-ý)
10. [Roadmap triển khai (gợi ý sprint)](#roadmap-triển-khai-gợi-ý-sprint)
11. [Model MongoDB](#model-mongodb)
12. [Bản đồ file trong repo](#bản-đồ-file-trong-repo)

---

## Chú giải trạng thái

| Ký hiệu | Ý nghĩa |
|:--------|:--------|
| ✅ | Đã có backend Express và đang dùng / có thể gọi từ FE. |
| 🔧 | Đã có backend nhưng FE chưa nối, hoặc chỉ một phía. |
| 📋 | Chưa có route trong Express — đặt tên theo kế hoạch / spec. |
| 🌐 | API bên thứ ba (không phải server trong repo). |
| `[AUTH]` | Cần `Authorization: Bearer <token>`. |
| `[MENTOR]` | Cần role `mentor`. |
| `[ADMIN]` | Cần role `admin`. |

---

## Biến môi trường liên quan

| Biến | Vai trò |
|:-----|:--------|
| `MONGO_URI`    | Kết nối MongoDB (backend). |
| `JWT_SECRET`   | Ký / verify JWT cho `/api/auth`. |
| `JWT_EXPIRES_IN` | Thời hạn token (mặc định `7d`). |
| `GOOGLE_CLIENT_ID` | Xác thực Google (`POST /api/auth/google`). |
| `PORT` | Cổng backend (mặc định `5000`). |
| `CORS_ORIGIN` | Danh sách origin CORS (tùy chọn). |
| `VITE_API_URL` | FE: base URL backend production (`frontend/src/app/utils/api.js`). |
| D-ID API key | FE phỏng vấn AI — `useDIDStream` / cấu hình trang Interview. |

---

## Base URL & xác thực

| Nguồn | Base URL |
|:------|:---------|
| **Express** | Dev: cùng origin, Vite proxy `/api` → `http://localhost:5000`. Prod: `VITE_API_URL` (bỏ `/` cuối) hoặc `http://localhost:5000`. |
| **Supabase Edge** | `https://<projectId>.supabase.co/functions/v1/make-server-64a0c849/` — `projectId` từ `/utils/supabase/info.js`. |
| **D-ID** | `https://api.d-id.com` |

| Nguồn | Header / auth |
|:------|:--------------|
| **Express** | `Authorization: Bearer <access_token>` từ `POST /api/auth/login` hoặc `/google`. **Không** dùng JWT Supabase cho `/api/*`. |
| **Supabase Edge** | `Authorization: Bearer <token>` khi có. Edge có thể từ chối JWT backend — FE có fallback demo. **Không** gửi `apikey` (CORS). |
| **D-ID** | `Authorization: Basic base64(<API_KEY> + ":")` và `Content-Type: application/json`. |

---

## Phần A — Backend Express (đã có trong repo)

**Entrypoint:** `backend/src/server.js`  
`app.use("/api/auth", authRouter)` · `app.use("/api/mentors", mentorsRouter)`

### A.1. `GET /`

| | |
|:--|:--|
| **Auth** | Không |
| **Response** | JSON giới thiệu service; gợi ý `/api/health`, `/api/auth`, `/api/mentors`. |

### A.2. `GET /api/health`

| | |
|:--|:--|
| **Auth** | Không |
| **Response** | `ok`, `service`, `database` (`connected` / `disconnected`), `timestamp` |

```json
{
  "ok": true,
  "service": "backend",
  "database": "connected",
  "timestamp": "2026-04-12T12:00:00.000Z"
}
```

`database` = `connected` khi `mongoose.connection.readyState === 1`.

---

### A.3. Module Auth — `/api/auth`

**File:** `backend/src/routes/auth.js`  
**Lưu ý:** Toàn bộ route auth cần MongoDB; nếu không → `503` `{ success: false, error: ... }`.

| Method | Path | Auth | Mô tả |
|:-------|:-----|:-----|:------|
| POST | `/api/auth/register` | — | Đăng ký (rate limit theo IP) |
| POST | `/api/auth/login` | — | Email + mật khẩu → access + **refresh token** |
| POST | `/api/auth/google` | — | Google ID token (GIS) → access + refresh |
| POST | `/api/auth/refresh` | — (tuỳ chọn Bearer access cũ) | Body `{ refreshToken }` → access + refresh mới; **blacklist jti** access cũ nếu gửi Bearer |
| GET | `/api/auth/me` | Bearer | Profile hiện tại |
| POST | `/api/auth/logout` | Bearer | Blacklist **jti** access hiện tại + `tokenVersion++` + xóa refresh sessions |
| GET | `/api/auth/sessions` | Bearer | `?currentSessionId=` (id từ refresh token) → phiên + `security` |
| DELETE | `/api/auth/sessions/:sessionId` | Bearer | Thu hồi phiên; nếu là phiên hiện tại → blacklist jti access |
| PATCH | `/api/auth/me` | Bearer | Profile + **đặt/đổi mật khẩu** |

#### Chi tiết từng endpoint

| Endpoint | Body / header | Response thành công | Lỗi thường gặp |
|:---------|:--------------|:---------------------|:---------------|
| `POST /register` | `name`, `email`, `password`, `role?` (`admin` cần `adminInviteCode`) | `201` `{ success: true }` — **không** có `token` | `400`, `403`, `409` |
| `POST /login` | `email`, `password` | `{ success, token, refreshToken, expiresIn, user }` | `401`, `429`, `503` |
| `POST /google` | `credential` | `{ success, token, refreshToken, expiresIn, user }` | `400`–`503` |
| `POST /refresh` | `{ refreshToken }` + header `Authorization: Bearer` (access cũ, khuyến nghị) | `{ success, token, refreshToken, expiresIn, user }` — access cũ bị blacklist theo **jti** | `400`, `401` |
| `GET /me` | `Authorization: Bearer` | `{ success, user }` | `401` nếu token hết hạn, `tv` lệch, hoặc **jti** đã thu hồi |
| `GET /sessions` | Bearer; query `?currentSessionId=<sessionId từ refresh>` | `{ success, sessions: [{ id, createdAt, lastUsedAt, expiresAt, userAgent, ip, fingerprint, fingerprintShort, deviceLabel, isCurrent, isSuspicious, matchesCurrentDevice }], security: { suspiciousCount, majorityFingerprintShort, currentSessionId } }` | `401` |
| `DELETE /sessions/:sessionId` | Bearer | `{ success: true }` — thu hồi refresh; phiên hiện tại → blacklist access **jti** | `400`, `401`, `404` |
| `POST /logout` | `Authorization: Bearer` | `{ success: true }` — blacklist **jti** access + `tokenVersion++` + xóa mọi refresh | `401` |
| `PATCH /me` | JSON: mật khẩu +/ hoặc profile | `{ success, user }`; **đổi mật khẩu** thêm `token`, `refreshToken`, `expiresIn` | `400`, `401`, `409` |

**Đổi mật khẩu (`PATCH /me`):** gửi `newPassword` hoặc `password`. Chưa liên kết Google → bắt buộc `currentPassword`. Đã liên kết Google → `currentPassword` tùy chọn. Đổi mật khẩu → `tokenVersion++`, xóa mọi refresh cũ, trả **access + refresh mới**.  
**Không** dùng `POST /api/auth/change-password` — gộp trong `PATCH /me`.

**Token:** Access JWT có claim `tv` khớp `User.tokenVersion` và **`jti`** (UUID). Blacklist jti lưu trên `User.revokedAccessJtis` (tự prune theo `expAt`) khi logout, refresh (xoay token), thu hồi phiên hiện tại, đổi mật khẩu. **Refresh** dạng `sessionObjectId:secret` (opaque), lưu hash trong `authSessions` (tối đa 10 phiên/user). FE gửi `Authorization: Bearer` kèm `POST /refresh` để vô hiệu access cũ ngay. Env gợi ý: `JWT_ACCESS_EXPIRES_IN` hoặc `JWT_EXPIRES_IN` (mặc định access **15m** nếu không set), `REFRESH_TOKEN_DAYS` (mặc định 30), `REFRESH_TOKEN_PEPPER` (tuỳ chọn, mặc định dùng `JWT_SECRET`), `AUTH_STRICT_SESSION_FINGERPRINT=true` (prod).

**Khóa tài khoản (admin):** `PATCH /api/admin/users/:id/status` với `isActive: false` → tăng `tokenVersion`, xóa `authSessions`, user không dùng được access/refresh.

**Profile (`PATCH /me` — một phần):** `name`, `phone`, `position`, `school`, `field`, `avatar`, `expertise`, `experience`, `hourlyRate`, `bio`, `email` (check trùng). **Không** tự đổi `role` lên mentor qua `/me` — chỉ **admin** gán qua `PATCH /api/users/:id/role` (Bearer admin).

#### `user` public (`toPublicUser`)

| Field | Mô tả |
|:------|:------|
| `id` | `_id` string |
| `email`, `name`, `role`, `avatar` | |
| `phone` | Mặc định `""` |
| `position` | `desiredPosition` / `position` |
| `school` | |
| `field` | Skill đầu (alias) |
| `expertise` | Mảng skills |
| `experience` | Chuỗi |
| `hourlyRate`, `bio` | |
| `plan`, `planExpiresAt` | |
| `hasGoogleLogin` | `true` nếu có `googleId` / `googleSub` (không rỗng) |

**FE:** `frontend/src/app/utils/auth.js`, `Settings.jsx`, …

**Logout:** `POST /api/auth/logout` (Bearer) — blacklist jti + tăng `tokenVersion`; FE `logout()` gọi API rồi xóa `localStorage` (`prointerview_auth`, `prointerview_access_token`, `prointerview_refresh_token`).

---

### A.4. Module Mentors — `/api/mentors`

**File:** `backend/src/routes/mentors.js` — cần MongoDB; danh sách chỉ gồm mentor có `userId` (tài khoản thật).

| Method | Path | Auth | Mô tả |
|:-------|:-----|:-----|:------|
| GET | `/api/mentors` | — | Danh sách |
| GET | `/api/mentors/:id` | — | Chi tiết — `id` = `publicId` hoặc `_id` |

---

### A.5. Module Courses — `/api/courses`

**File:** `backend/src/routes/courses.js`

| Method | Path | Auth | Mô tả |
|:-------|:-----|:-----|:------|
| GET | `/api/courses` | — | Danh sách khóa học (published) |
| GET | `/api/courses/:id` | — | Chi tiết khóa học |
| GET | `/api/courses/:id/lessons/:lessonId` | Bearer | Nội dung bài học (có kiểm tra ghi danh) |
| GET | `/api/courses/:id/lessons/:lessonId/qa` | Bearer | Danh sách Q&A theo bài (học viên đã ghi danh / bài preview) |
| POST | `/api/courses/:id/lessons/:lessonId/qa` | Bearer | Gửi câu hỏi `{ question }` — lưu `CourseQA` |
| GET | `/api/courses/:id/lessons/:lessonId/notes` | Bearer | Ghi chú bài học (học viên đã ghi danh) |
| PUT | `/api/courses/:id/lessons/:lessonId/notes` | Bearer | Lưu ghi chú `{ content }` trên `Enrollment` |
| POST | `/api/courses` | Bearer + Mentor | Tạo khóa học mới |
| PUT | `/api/courses/:id` | Bearer + Mentor | Cập nhật khóa học |
| PATCH | `/api/courses/:id/publish` | Bearer + Mentor | Xuất bản khóa học |
| DELETE | `/api/courses/:id` | Bearer + Mentor | Lưu trữ / xóa mềm khóa học |

---

### A.6. Module Enrollments — `/api/enrollments`

**File:** `backend/src/routes/enrollments.js`

| Method | Path | Auth | Mô tả |
|:-------|:-----|:-----|:------|
| GET | `/api/enrollments/my` | Bearer | Khóa học tôi đã ghi danh |
| POST | `/api/courses/:id/enroll` | Bearer | Ghi danh khóa học (nằm trong `courses.js`) |
| PATCH | `/api/enrollments/:id/progress` | Bearer | Cập nhật tiến độ học tập |
| GET | `/api/enrollments/:id/certificate` | Bearer | Lấy hoặc tạo chứng chỉ hoàn thành |

---

### A.7. Module CV — `/api/cv`

**File:** `backend/src/routes/cv.js`

| Method | Path | Auth | Mô tả |
|:-------|:-----|:-----|:------|
| GET | `/api/cv/quota` | Bearer | Kiểm tra quota phân tích CV |
| POST | `/api/cv/analyses` | Bearer | Lưu kết quả phân tích (sau khi chạy Python) |
| GET | `/api/cv/analyses` | Bearer | Danh sách lịch sử phân tích |
| GET | `/api/cv/analyses/:id` | Bearer | Chi tiết bản phân tích |
| DELETE | `/api/cv/analyses/:id` | Bearer | Xóa bản phân tích |

**Proxy Python** (`backend/src/routes/cvMatch.js`, cần `CV_ANALYZER_URL`):

| Method | Path | Mô tả |
|:-------|:-----|:------|
| POST | `/api/cv/analyze` | Khớp từ khóa CV+JD (không LLM) |
| POST | `/api/cv/analyze/full` | Khớp + chấm điểm (LLM/Ollama) |
| POST | `/api/cv/analyze/suggestions` | Pipeline đầy đủ + gợi ý (JD) |
| POST | `/api/cv/analyze/field` | Phân tích theo ngành (`field` form field) |

**FE:** `frontend/src/app/utils/cvApi.js`, `cvMappers.js` — `CVAnalysis.jsx`, `AnalysisHistory.jsx`. Cần đăng nhập; không còn Supabase Edge cho CV.

---

### A.8. Module Interviews — `/api/interviews`

**File:** `backend/src/routes/interviews.js`

| Method | Path | Auth | Mô tả |
|:-------|:-----|:-----|:------|
| POST | `/api/interviews/sessions` | Bearer | Tạo phiên phỏng vấn thử |
| PATCH | `/api/interviews/sessions/:id` | Bearer | Cập nhật câu trả lời |
| POST | `/api/interviews/sessions/:id/complete` | Bearer | Hoàn thành và nhận feedback |
| GET | `/api/interviews/sessions` | Bearer | Lịch sử phỏng vấn |
| GET | `/api/interviews/sessions/:id` | Bearer | Chi tiết phiên phỏng vấn |

---

### A.9. Module Upload — `/api/upload`

**File:** `backend/src/routes/upload.js`

| Method | Path | Auth | Mô tả |
|:-------|:-----|:-----|:------|
| POST | `/api/upload/avatar` | Bearer | Tải lên ảnh đại diện |
| POST | `/api/upload/cv` | Bearer | Tải lên CV |
| POST | `/api/upload/course-thumbnail` | Bearer + Mentor | Tải lên ảnh bìa khóa học |

### A.10. Module Admin — `/api/admin`

**File:** `backend/src/routes/admin.js` · **Auth:** `[ADMIN]`

| Method | Path | Mô tả |
|:-------|:-----|:------|
| GET | `/api/admin/stats` | Thống kê tổng quan: users, mentors, bookings, `plans`, `enrollmentsPaid`, `courses`, `reportsOpen`, `bookingsByStatus`, `recentBookings` |
| GET | `/api/admin/users` | Danh sách user |
| GET | `/api/admin/users/:id` | Chi tiết user + `stats.bookingsCount`, `stats.enrollmentsCount` |
| PATCH | `/api/admin/users/:id/status` | Khóa / mở — body `{ isActive: boolean }` |
| GET | `/api/admin/mentors` | Danh sách mentor |
| GET | `/api/admin/mentors/:id` | Chi tiết mentor + `stats.sessionsCount` |
| PATCH | `/api/admin/mentors/:id/status` | Bật / tắt mentor |
| GET | `/api/admin/bookings` | Tất cả booking |
| GET | `/api/admin/bookings/:id` | Chi tiết booking (populate user/mentor) |
| GET | `/api/admin/reports` | Danh sách báo cáo (`?status`, `?targetType`, `?page`, `?limit`) → `counts`, `pagination` |
| PATCH | `/api/admin/reports/:id` | Cập nhật trạng thái — `{ status, resolution? }` (`reviewing` / `resolved` / `dismissed`); đóng ticket → thông báo người gửi |
| GET | `/api/admin/reviews` | Tất cả đánh giá (`?page=1`, `?limit=50` max 100, `?targetType`, `?visible`) → `reviews`, `counts`, `pagination` |
| PATCH | `/api/admin/reviews/:id/visibility` | Ẩn/hiện — body `{ isVisible: boolean }`, cập nhật lại stats mentor/khóa |
| GET | `/api/reviews/mine` | `[AUTH]` Đánh giá của user cho `targetType` + `targetId` → `{ hasReview, review? }` |
| GET | `/api/admin/system/overview` | Auth, gói, dịch vụ, Mongo topology |
| GET | `/api/admin/system/transaction-support` | Kiểm tra MongoDB transactions |
| GET | `/api/admin/content/stats` | Thống kê phiên AI, CV, khóa + `interviewOps` (7 ngày, few-shot) |
| GET | `/api/admin/content/interview-sessions` | Phiên phỏng vấn AI gần đây + câu hỏi đã lưu (`?limit=30`) |
| GET | `/api/admin/content/course-media` | Danh sách khóa + số bài video (`?scope=all\|published\|pending`) |
| GET | `/api/admin/courses/pending` | Khóa chờ duyệt (`pending_review`, `pending_update`) + `stats.enrollmentCount` (đếm ghi danh `paid`) |
| GET | `/api/admin/courses/published` | Khóa đã xuất bản (`?limit=50`, tối đa 100) + `stats` |
| PATCH | `/api/admin/courses/:id/approve` | Duyệt → `status: published`, xóa `adminReview` |
| PATCH | `/api/admin/courses/:id/reject` | Từ chối — body `{ reason }` (bắt buộc) → `draft`, lưu `adminReview`, thông báo mentor |
| PATCH | `/api/admin/courses/:id/archive` | Gỡ marketplace — body `{ reason? }` → `archived`, lưu `adminReview`, thông báo mentor |

**FE:** `frontend/src/app/utils/adminApi.js` — `AdminUsers`, `AdminMentors`, `AdminBookings`, `AdminContentCourses`, `AdminPlaceholders` (detail + support).

---
| Trường hợp | Response |
|:-----------|:---------|
| `GET /api/mentors` | `{ success: true, mentors: [...] }` |
| `GET /api/mentors/:id` | `{ success: true, mentor: {...} }` |
| Không tìm thấy | `404` `{ success: false, error: "Not found" }` |
| MongoDB lỗi | `503` |

**FE:** `frontend/src/app/utils/mentorApi.js` — dùng tại `Mentors.jsx`, `MentorProfile.jsx`, `Booking.jsx`, `Checkout.jsx`.

---

## Phần B — Tích hợp ngoài (FE gọi trực tiếp)

### B.1. ~~Supabase Edge — phân tích CV~~ (đã migrate)

CV đã chuyển sang **Phần A.7** (`/api/cv` + proxy Python). Không dùng Supabase Edge cho luồng CV production.

---

### B.2. D-ID — streaming avatar

| | |
|:--|:--|
| **File** | `frontend/src/app/hooks/useDIDStream.js` |
| **Host** | `https://api.d-id.com` |
| **Auth** | `Authorization: Basic base64(<API_KEY> + ":")` |

| # | Method | Path | Mô tả |
|--:|:-------|:-----|:------|
| 1 | POST | `/talks/streams` | Tạo stream — ví dụ `{ "source_url": "..." }` |
| 2 | POST | `/talks/streams/{id}/ice` | ICE |
| 3 | POST | `/talks/streams/{id}/sdp` | SDP answer |
| 4 | POST | `/talks/streams/{id}` | Script (audio / text) |
| 5 | DELETE | `/talks/streams/{id}` | Đóng stream |

---

## Phần C — Roadmap API (tham chiếu)

Danh sách phẳng method/path (C.1–C.13) để tra cứu nhanh. **Đã có route Express hay chưa:** xem cột **Trạng thái** trong [`ROADMAP.md`](./ROADMAP.md) (Phase 1–4). Entrypoint: `backend/src/server.js`.

**Đồng bộ với [`ROADMAP.md`](./ROADMAP.md):** cùng method + path; `ROADMAP.md` gom theo **phase** (1–4) + mục *Bổ sung auth*. Khi đổi contract, sửa **cả hai** file.

### C.1. Auth bổ sung

| Method | Path | Ghi chú |
|:-------|:-----|:--------|
| POST | `/api/auth/logout` | Bearer — `tokenVersion++`, xóa refresh sessions |
| POST | `/api/auth/refresh` | Body `refreshToken` — access ngắn + refresh xoay vòng |
| GET | `/api/auth/sessions` | Bearer — danh sách phiên |
| DELETE | `/api/auth/sessions/:id` | Bearer — thu hồi một phiên |
| POST | `/api/auth/change-password` | **Không cần** — đã gộp `PATCH /api/auth/me` |
| DELETE | `/api/auth/me` | Xóa tài khoản |

### C.2. Mentors mở rộng

| Method | Path | Ghi chú |
|:-------|:-----|:--------|
| GET | `/api/mentors/:id/availability` | Lịch rảnh |
| GET | `/api/mentors/:id/reviews` | Review |
| PATCH | `/api/mentors/me` | `[AUTH][MENTOR]` Profile mentor |
| PATCH | `/api/mentors/me/availability` | `[AUTH][MENTOR]` Lịch rảnh |
| PATCH | `/api/mentors/me/availability/block` | `[AUTH][MENTOR]` Chặn ngày |

### C.3. Bookings — `/api/bookings`

**POST `/api/bookings` `[AUTH]`** — tạo lịch mentor. Body (JSON) tối thiểu:

| Field | Bắt buộc | Ghi chú |
|:------|:---------|:--------|
| `mentorId` | ✓ | `publicId` hoặc `_id` Mongo |
| `date` | ✓ | Chuỗi như Booking.jsx (vd. `Thứ 4, 01/03`) |
| `timeSlot` hoặc `time` | ✓ | `HH:mm` |
| `sessionType` | | Mặc định `mock_interview` |
| `notes` | | Hoặc gửi `position`, `note`, `cvFile`, `jdFile` để ghép `notes` |
| `price` | | So khớp giá mentor (lệch quá 5% so với giá server → 400) |
| `durationMinutes` | | Mặc định 60 |
| `meetingLink`, `orderNum`, `paymentMethod` | | Checkout mock: `paymentStatus: "paid"` → `status: confirmed` |
| `timezone` | | Mặc định `Asia/Ho_Chi_Minh` |

| Method | Path |
|:-------|:-----|
| POST | `/api/bookings` |
| GET | `/api/bookings` |
| GET | `/api/bookings/:id` |
| DELETE | `/api/bookings/:id` |
| PATCH | `/api/bookings/:id/reschedule` |
| POST | `/api/bookings/:id/review` |
| GET | `/api/bookings/mentor/list` |
| PATCH | `/api/bookings/:id/confirm` |
| PATCH | `/api/bookings/:id/complete` |
| PATCH | `/api/bookings/:id/notes` |

*Hủy booking:* chỉ dùng **`DELETE /api/bookings/:id`** (cập nhật trạng thái, vd. `cancelled` — không dùng `PATCH .../cancel` để tránh trùng contract).

### C.4. CV trên Express — `/api/cv`

| Method | Path |
|:-------|:-----|
| POST | `/api/cv/analyses` |
| GET | `/api/cv/analyses` |
| GET | `/api/cv/analyses/:id` |
| DELETE | `/api/cv/analyses/:id` |
| GET | `/api/cv/quota` |

### C.5. Interview — `/api/interviews`

| Method | Path |
|:-------|:-----|
| POST | `/api/interviews/sessions` |
| PATCH | `/api/interviews/sessions/:id` |
| POST | `/api/interviews/sessions/:id/complete` |
| GET | `/api/interviews/sessions` |
| GET | `/api/interviews/sessions/:id` |

### C.6. Courses — `/api/courses`

| Method | Path |
|:-------|:-----|
| GET | `/api/courses` |
| GET | `/api/courses/:id` |
| POST | `/api/courses/:id/enroll` |
| GET | `/api/courses/:id/lessons/:lessonId` |
| GET | `/api/courses/:id/lessons/:lessonId/qa` |
| POST | `/api/courses/:id/lessons/:lessonId/qa` |
| GET | `/api/courses/:id/lessons/:lessonId/notes` |
| PUT | `/api/courses/:id/lessons/:lessonId/notes` |
| POST | `/api/courses` |
| PUT | `/api/courses/:id` |
| PATCH | `/api/courses/:id/publish` |
| DELETE | `/api/courses/:id` |

### C.7. Enrollments — `/api/enrollments`

| Method | Path |
|:-------|:-----|
| GET | `/api/enrollments/my` |
| PATCH | `/api/enrollments/:id/progress` |
| GET | `/api/enrollments/:id/certificate` |

### C.8. Reviews — `/api/reviews`

| Method | Path |
|:-------|:-----|
| POST | `/api/reviews` |
| GET | `/api/reviews?targetType=mentor&targetId=:id` |
| PATCH | `/api/reviews/:id/reply` |
| DELETE | `/api/reviews/:id` |

### C.9. Notifications — `/api/notifications`

| Method | Path |
|:-------|:-----|
| GET | `/api/notifications` |
| PATCH | `/api/notifications/:id/read` |
| POST | `/api/notifications/read-all` |
| DELETE | `/api/notifications/:id` |
| GET | `/api/notifications/unread-count` |

### C.10. Payments — `/api/payments`

| Method | Path |
|:-------|:-----|
| POST | `/api/payments/initiate` |
| POST | `/api/payments/webhook/momo` |
| POST | `/api/payments/webhook/zalopay` |
| POST | `/api/payments/webhook/sepay` — header `Authorization: Apikey <SEPAY_WEBHOOK_API_KEY>`; body JSON SePay (`transferType: in`, `transferAmount`, `content` chứa mã `PI…`); trả `{ success: true }` |
| GET | `/api/payments/transfer-status?orderRef=PI…` — Bearer JWT; poll checkout (`status`: `pending` \| `submitted` \| `paid` \| `not_found`) |
| GET | `/api/payments/history` |

### C.11. Plans — `/api/plans`

| Method | Path |
|:-------|:-----|
| GET | `/api/plans/current` |
| POST | `/api/plans/activate` |
| POST | `/api/plans/cancel` |

*Plan hiện có field trên `User` (Mongo) — có thể đồng bộ sau.*

### C.12. Dashboard

| Method | Path |
|:-------|:-----|
| GET | `/api/users/dashboard-stats` |
| PATCH | `/api/users/:id/role` `[ADMIN]` — JSON `{ "role": "mentor" }` hoặc `"customer"` |
| GET | `/api/mentor/dashboard` |
| GET | `/api/mentor/finance` |
| GET | `/api/mentor/analytics` |
| POST | `/api/mentor/payout` |

### C.13. Reports & upload

| Method | Path |
|:-------|:-----|
| POST | `/api/reports` |
| GET | `/api/admin/reports` |
| PATCH | `/api/admin/reports/:id` |
| POST | `/api/upload/avatar` |
| POST | `/api/upload/cv` |
| POST | `/api/upload/course-thumbnail` |

### C.14. Admin — `/api/admin`

| Method | Path |
|:-------|:-----|
| GET | `/api/admin/stats` |
| GET | `/api/admin/users` |
| GET | `/api/admin/users/:id` |
| PATCH | `/api/admin/users/:id/status` |
| GET | `/api/admin/mentors` |
| GET | `/api/admin/mentors/:id` |
| PATCH | `/api/admin/mentors/:id/status` |
| GET | `/api/admin/bookings` |
| GET | `/api/admin/bookings/:id` |
| PATCH | `/api/admin/bookings/:id/status` |
| PATCH | `/api/admin/bookings/:id/confirm-transfer-payment` |
| PATCH | `/api/admin/bookings/:id/confirm-refund` |

---

## Query params chuẩn (dự kiến)

| Mục đích | Ví dụ |
|:---------|:------|
| Phân trang | `?page=1&limit=10` |
| Sắp xếp | `?sortBy=createdAt&order=desc` |
| Khoảng ngày | `?from=2026-01-01&to=2026-02-01` |
| Lọc | `?status=confirmed&field=IT` |

---

## Định dạng response

### Thực tế (Express auth & mentors)

- Thành công: `{ "success": true, ... }` — key trực tiếp `user`, `token`, `mentors`, `mentor` (không bắt buộc bọc `data`).
- Lỗi: `{ "success": false, "error": "..." }`.

### Chuẩn dự kiến (thống nhất sau này)

**Một object:**

```json
{ "success": true, "data": { } }
```

**Danh sách + phân trang:**

```json
{
  "success": true,
  "data": {
    "items": [],
    "pagination": { "total": 100, "page": 1, "limit": 10, "totalPages": 10 }
  }
}
```

**Lỗi:**

```json
{
  "success": false,
  "error": {
    "code": "QUOTA_EXCEEDED",
    "message": "Bạn đã hết lượt phân tích CV.",
    "statusCode": 403
  }
}
```

---

## Mã lỗi gợi ý

| Code | HTTP | Ý nghĩa |
|:-----|:-----|:--------|
| `UNAUTHORIZED` | 401 | Token hết hạn / không hợp lệ |
| `FORBIDDEN` | 403 | Không đủ quyền |
| `QUOTA_EXCEEDED` | 403 | Hết quota theo plan |
| `NOT_FOUND` | 404 | Không tìm thấy |
| `VALIDATION_ERROR` | 422 | Dữ liệu không hợp lệ |
| `BOOKING_CONFLICT` | 409 | Trùng slot |
| `PAYMENT_REQUIRED` / `PAYMENT_FAILED` | 402 | Thanh toán |
| `AI_SERVICE_ERROR` | 503 | Lỗi dịch vụ AI |
| `UPLOAD_FAILED` | 500 | Lỗi upload |

---

## Roadmap triển khai (gợi ý sprint)

Chi tiết endpoint theo phase và màn FE: **[`ROADMAP.md`](./ROADMAP.md)** (Phase 1–4 + *Bổ sung auth*).

| Sprint | Nội dung gợi ý *(khớp phase trong `ROADMAP.md`)* |
|:-------|:---------------|
| **1** | Phase 1 — booking + payments + plans + `dashboard-stats` |
| **2** | Phase 2 — mentor vận hành, reviews, reports, availability mentor |
| **3** | Phase 3 — courses, enrollments, certificate |
| **4** | Phase 4 — CV Express, interview sessions, notifications, upload |

*(Điều chỉnh theo ưu tiên sản phẩm.)*

---

## Model MongoDB

Chi tiết collection và field: [`backend/DATABASE.md`](./backend/DATABASE.md).

---

## Bản đồ file trong repo

| Nội dung | Đường dẫn |
|:---------|:----------|
| `apiUrl`, proxy dev | `frontend/src/app/utils/api.js` |
| Auth client | `frontend/src/app/utils/auth.js` |
| Mentor client | `frontend/src/app/utils/mentorApi.js` |
| CV (Express + Python) | `frontend/src/app/utils/cvApi.js`, `pages/cv/CVAnalysis.jsx` |
| D-ID stream | `frontend/src/app/hooks/useDIDStream.js` |
| Entry server | `backend/src/server.js` |
| Auth controller | `backend/src/controllers/authController.js` |
| Mentors controller | `backend/src/controllers/mentorsController.js` |
| Auth service (logic) | `backend/src/services/authService.js` |
| Mentors service (logic) | `backend/src/services/mentorsService.js` |
| Auth routes | `backend/src/routes/auth.js` |
| Mentors routes | `backend/src/routes/mentors.js` |
| JWT middleware | `backend/src/middleware/authJwt.js` |
| User public JSON | `backend/src/models/User.js` |

---

*Tài liệu gồm: (1) API Express đang chạy, (2) Supabase & D-ID mà FE dùng, (3) roadmap endpoint.*
