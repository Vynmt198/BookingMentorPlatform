# CLAUDE.md

Tài liệu hướng dẫn cho Claude Code khi làm việc trong repo này. Viết bằng tiếng Anh để tương thích tối đa, tài liệu sản phẩm (README, ROADMAP, API_INDEX, DATABASE) bằng **tiếng Việt**.

---

## Tổng quan dự án

**ProInterview** — SaaS luyện phỏng vấn xin việc, kiến trúc monorepo:

| Thư mục | Stack | Port dev |
|:--------|:------|:---------|
| `frontend/` | Vite + React 18 + Tailwind CSS + shadcn/ui | 5173 |
| `backend/` | Express 5 + MongoDB (Mongoose 9) + JWT | 5000 |
| `cv_jd_matching/` | Python FastAPI + Uvicorn | 8000 |

**Ngôn ngữ sản phẩm:** Tiếng Việt (giao diện user-facing, tài liệu nội bộ).  
**Tài liệu contract API:** `ROADMAP.md` + `API_INDEX.md` — cập nhật cả hai khi thêm/sửa route.

---

## Lệnh phát triển

### Backend (`backend/`)

```bash
npm run dev                    # nodemon → src/server.js (port 5000)
npm start                      # node src/server.js (production)
npm run seed:users             # Seed users dev (chỉ khi collection rỗng)
npm run seed:all               # Seed toàn bộ dữ liệu mock
npm run seed:ui-mock           # Seed mock cho UI
npm run seed:reviews / seed:reports / seed:mentor-samples / seed:course-samples
npm run seed:mentor-bios / seed:commission / seed:mentor-courses-ui
npm run db:prune-fake-mentors  # Xóa Mentor docs không có User tương ứng
npm run sync:mentor-profiles   # Đồng bộ Mentor profiles với Users
npm run db:normalize-transfer-refs / db:migrate-cv-analysis[:dry]
npm run verify:jaas              # Kiểm tra cấu hình JaaS (JWT signing, key, appId)
npm run encode:jaas-key           # Encode JaaS private key PEM → base64 cho env var
npm test                         # Toàn bộ test (Node test runner + Jest)
npm run test:node / test:payments / test:python-cv / test:dto
```

**Node:** `>=20` (xem `backend/package.json` → `engines`).

### Frontend (`frontend/`)

```bash
npm run dev       # Vite dev server (5173); proxy /api → http://localhost:5000
npm run build     # Production build → dist/
npm run dev:full  # Chạy cả frontend + backend song song
```

### CV/JD Matcher (`cv_jd_matching/`)

```bash
cd cv_jd_matching
python -m pip install -r requirements.txt
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

API docs khi chạy local: `http://127.0.0.1:8000/docs`

### Tài khoản dev (sau `seed:users`)

Mật khẩu mặc định tất cả: **`Dev123456`**

| Email | Role / Plan |
|:------|:-----------|
| `customer@dev.local` | customer, plan: free |
| `mentor@dev.local` | mentor |
| `admin@dev.local` | admin |

---

## Cấu hình môi trường

### Backend `backend/.env`

```env
MONGO_URI=mongodb://127.0.0.1:27017/prointerview
JWT_SECRET=<chuỗi dài ngẫu nhiên>
CORS_ORIGIN=http://localhost:5173
JWT_EXPIRES_IN=7d
GOOGLE_CLIENT_ID=<từ GCP>
ADMIN_INVITE_CODE=<optional>
CV_ANALYZER_URL=https://your-cv-analyzer.example.com   # Python FastAPI URL (prod)
# LLM — AI question generation (OpenAI-compatible)
LLM_API_KEY=<your-key>
LLM_BASE_URL=https://api.openai.com/v1   # hoặc DS2API / GLM / DeepSeek endpoint
LLM_MODEL=gpt-4o-mini
```

Xem `backend/.env.example` để biết đầy đủ biến.

### Frontend `frontend/.env.local`

```env
VITE_GOOGLE_CLIENT_ID=<giống backend>
VITE_API_URL=https://your-api.example.com   # Chỉ cần khi prod SPA ≠ API host
```

`frontend/src/app/utils/api.js` resolve `API_BASE_URL`: ưu tiên `VITE_API_URL`, fallback `http://localhost:5000` (dev), rồi `""` (same-origin prod).

---

## Kiến trúc Backend (`backend/src/`)

### Entry points

- **`server.js`** — load env, kết nối MongoDB, gọi `createApp()`, listen `PORT` (default 5000).
- **`app.js`** — `createApp()`: middleware, `GET /api/health`, mount tất cả routers `/api/*`.

### Pattern chuẩn

```
Route → Controller → Service → Mongoose Model
```

Thực tế: auth, bookings, payments, plans, mentor dashboard, reviews, reports, dashboard stats, user role → có Service. Admin, notifications, courses, enrollments, CV CRUD, upload, mock courses → Controller gọi Model trực tiếp (không qua Service).

### Routers mounted trong `app.js`

| Prefix | File (`routes/`) | Ghi chú |
|:-------|:-----------------|:--------|
| `/api/auth` | `auth.js` | |
| `/api/mentors` | `mentors.js` | |
| `/api/bookings` | `bookings.js` | |
| `/api/plans` | `plans.js` | |
| `/api/payments` | `payments.js` | |
| `/api/users` | `users.js` | |
| `/api/courses` | `courses.js` | |
| `/api/reviews` | `reviews.js` | |
| `/api/reports` | `reports.js` | |
| `/api/mentor` | `mentor.js` | Dashboard/finance/analytics mentor |
| `/api/notifications` | `notifications.js` | |
| `/api/admin` | `admin.js` | |
| `/api/enrollments` | `enrollments.js` | |
| `/api/cv` | `cv.js` + `cvMatch.js` | cv.js: CRUD/quota; cvMatch.js: proxy sang Python |
| `/api/interviews` | `interviews.js` | Session lifecycle phỏng vấn AI: tạo, trả lời, complete, evaluate, analyze-face, generate-questions, extract-cv-text |
| `/api/ai` | `aiProviders.js` | STT (`/transcribe`), TTS (`/tts`), emotion (`/emotion`), D-ID avatar (`/avatar/*`), pre-generate câu hỏi (`/interview/pregenerate`, `/interview/pregen/*`) |
| `/api/analytics` | `analytics.js` | `POST /events` — ghi nhận sự kiện hành vi (page_view/action) vào `UserEvent`, dùng cho admin user-journey tracking |
| `/api/upload` | `upload.js` | |
| `/api/mock` | `mockCourses.js` | Mock data cho dev/test |

**Chưa mount:** `backend/src/routes/cart.js` + `cartController.js` đã viết đầy đủ (get/add/checkout/update/remove/clear, model `Cart` tồn tại) nhưng **không được import trong `app.js`** — dead code trên bản web hiện tại. (Bản mobile — `Prointerview-App/backend` — đã mount `/api/cart`.)

### Services (`services/`)

`authService`, `bookingsService` (tích hợp JaaS qua `buildJaasMeetingLaunch`), `dashboardStatsService`, `mentorDashboardService`, `mentorMeService`, `mentorProfileService`, `mentorsService`, `paymentsService`, `plansService`, `reportsService`, `reviewsService`, `userRoleService`, `analyticsService` (ghi/đọc `UserEvent`, `FUNNEL_STEPS`), `jaasService` (ký JWT phòng họp 8x8.vc), `interviewQuestionService`, `emotionService`, `sttService`, `ttsService`, `avatarService`, `videoPregenService`, `competencyFramework`, `courseMentorInsightsService`, `courseStatsService`, `mentorCommissionService`, `mentorEarningsService`, `sepayWebhookService`, `normalizeTransferRefsService`, `transferPaymentExpiryService`, `notificationDeliveryService`, `emailService`, `cacheService`, `accessTokenBlacklist`, `langfuseService`

### Models (`models/`) — 21 Mongoose schemas

`User`, `Mentor`, `Booking`, `Payment`, `Course`, `Enrollment`, `Review`, `Notification`, `CVAnalysis`, `Report`, `Subscription`, `Activity`, `CourseQA`, `MentorPeerReview`, `PayoutRequest`, `Cart` (chưa dùng — route chưa mount), `InterviewSession`, `MentorKnowledge`, `SecurityLog`, `SepayWebhookEvent`, `UserEvent`, `index.js`

Plan và quota được lưu trực tiếp trên **`User`** (field `plan`, `planExpiresAt`, `quota.cvAnalysisUsed/Limit`, `quota.mentorSessionUsed/Limit`).

### Middleware

- `authJwt` — verify Bearer JWT, set `req.user` / `req.userId`
- `requireMentor` — `role === "mentor"`
- `requireAdmin` — `role === "admin"`
- `rateLimiters.js` — rate limit login, register, …

### Response shape

```js
// Thành công
{ success: true, user: {...} }      // key: user, mentors, bookings, ...
// Lỗi
{ success: false, error: "message" }
```

### Auth & tokens

- **Access JWT:** claim `tv` phải khớp `User.tokenVersion`. Hết hạn (mặc định 15m, hoặc `JWT_EXPIRES_IN`).
- **Refresh token:** dạng `sessionObjectId:secret` (opaque), lưu hash trong `User.authSessions` (tối đa 10 phiên/user).
- Logout → `tokenVersion++`, xóa toàn bộ refresh sessions.
- Đổi mật khẩu → tương tự logout + trả token mới.

---

## Kiến trúc Frontend (`frontend/src/app/`)

### Cấu trúc thư mục

```
pages/
  auth/          Login, Register, ForgotPassword, ResetPassword
  home/          Home, Pricing
  account/       Dashboard, Profile, Settings
  booking/       Booking, Checkout, SessionDetail, MentorReview
  courses/       Courses, CourseDetail, CourseLearning, MyCourses
  cv/            CVAnalysis, AnalysisHistory
  mentor/        MentorDashboard, MentorSchedule, MentorAnalytics,
                 MentorMeetingDetail, MentorReviews, MeetingRoom,
                 MentorFinance, MentorCourseManagement, MentorCourseEdit,
                 MentorPeerReview, MentorArea
  mentors/       Mentors, MentorProfile
  payment/       PaymentReturn, SuccessPage, FailurePage
  admin/         AdminLayout, AdminDashboard, AdminMentors, AdminUsers,
                 AdminBookings, AdminMentorsPending, AdminPlaceholders,
                 adminLoader

components/
  ui/            40+ shadcn/ui primitives
  layout/        AppLayout, AdminSidebar, Navbar, Sidebar, Footer, TopNavShell
  auth/          AuthShell, GoogleSignInBlock
  mentor/        MentorPageShell
  cv/            CVDocumentPreview
  courses/       CourseRecommendations
  home/          RecommendedJourney
  modals/        ReportMentorModal, RescheduleModal
  shared/        HistoryPanel, PageHeader, SupportContact
  brand/         BrandLogo

hooks/
  useDIDStream.js   D-ID streaming avatar

utils/
  api.js            apiUrl(), API_BASE_URL
  auth.js           JWT lưu/đọc localStorage
  authGate.js       Route guard
  bookingMappers.js
  bookingsApi.js, courseApi.js, courseStats.js, dashboardApi.js,
  enrollmentApi.js, mentorApi.js, notificationApi.js,
  paymentsApi.js, plansApi.js
  bookings.js, meetings.js, history.js   (local/mock helpers — chưa migrate hết)
  aiDialogue.js
```

### Routing (`routes.js`)

- **Hash-based** (`createHashRouter`)
- `AppLayout` bọc hầu hết routes user
- `AdminLayout` (+ `adminLoader`) bọc `/admin/*`
- `CourseLearning` full-screen, không có sidebar
- Wildcard `*` redirect về `/`

**Auth state:** `localStorage` keys `prointerview_access_token`, `prointerview_auth`. Session khôi phục qua `GET /api/auth/me` khi app load.

### Tất cả routes hiện có (`frontend/src/app/routes.js`)

| Path | Component |
|:-----|:---------|
| `/` | Home (redirect theo role nếu đã login: mentor→`/mentor/dashboard`, admin→`/admin`) |
| `/landing` | CinematicHeroPage |
| `/login`, `/register` | Login, Register |
| `/forgot-password`, `/reset-password`, `/verify-email` | ForgotPassword, ResetPassword, VerifyEmail |
| `/pricing`, `/about`, `/achievements`, `/blog`, `/terms`, `/privacy` | Trang tĩnh/marketing |
| `/checkout` | Checkout (yêu cầu login) |
| `/payment-return`, `/payment-success`, `/payment-failure` | Payment pages |
| `/courses/:id/learn` | CourseLearning (full-screen, yêu cầu login) |
| `/meeting/:sessionId` | MeetingRoom (yêu cầu login; route cũ `/mentor/meeting/:sessionId` redirect sang đây) |
| `/mentors`, `/mentors/:id` | Mentors, MentorProfile |
| `/courses`, `/courses/:id` | Courses, CourseDetail |
| `/cv-analysis` | CVAnalysisHub — chọn mode JD hoặc Field |
| `/cv-analysis/jd`, `/cv-analysis/jd/result[/:analysisId]`, `/cv-analysis/jd/history` | Luồng phân tích theo JD |
| `/cv-analysis/field`, `/cv-analysis/field/result[/:analysisId]`, `/cv-analysis/field/history` | Luồng phân tích theo lĩnh vực |
| `/my-bookings`, `/my-courses` | MyBookings, MyCourses (yêu cầu login) |
| `/booking/:id`, `/booking` | Booking (yêu cầu login) |
| `/session/:id` | SessionDetail (yêu cầu login) |
| `/review/:sessionId` | MentorReview (yêu cầu login) |
| `/profile`, `/settings` | Profile, Settings (yêu cầu login) |
| `/mentor/dashboard`, `/mentor/schedule`, `/mentor/finance`, `/mentor/analytics`, `/mentor/reviews` | Mentor area (nested dưới `MentorArea`, yêu cầu login) |
| `/mentor/meeting-detail/:sessionId` | MentorMeetingDetail |
| `/mentor/courses`, `/mentor/courses/:id/edit` | MentorCourseManagement, MentorCourseEdit |
| `/mentor/peer-review` | MentorPeerReview |
| `/mentor/session-feedback/:sessionId` | MentorSessionFeedback |
| `/admin/*` | Admin section (AdminLayout + `adminLoader`) |

**Route đã xoá/redirect:** `/interview`, `/interview/gender`, `/interview/room`, `/interview/feedback`, `/avatar-demo` → tất cả redirect `/`. `/cv-analysis/history` redirect theo query `mode` sang route mới.

### Admin routes (`/admin/*`)

| Path | Component |
|:-----|:---------|
| `/admin` (index) | AdminDashboard |
| `/admin/analytics` | AdminAnalytics — dashboard hành vi người dùng (đọc `UserEvent`) |
| `/admin/users`, `/admin/users/:id` | AdminUsers, AdminUserDetail |
| `/admin/mentors`, `/admin/mentors/pending`, `/admin/mentors/:id` | AdminMentors, AdminMentorsPending, AdminMentorDetail |
| `/admin/finance`, `/admin/transactions`, `/admin/payouts` | AdminFinance, AdminTransactions, AdminPayouts |
| `/admin/bookings`, `/admin/bookings/:id`, `/admin/bookings/check-ins` | AdminBookings, AdminBookingDetail, AdminBookingCheckIns |
| `/admin/course-payments`, `/admin/subscription-payments` | AdminCoursePayments, AdminSubscriptionPayments |
| `/admin/content/questions`, `/admin/content/courses` | AdminContentQuestions, AdminContentCourses |
| `/admin/settings`, `/admin/reviews`, `/admin/support`, `/admin/achievements` | AdminSystemSettings, AdminReviews, AdminSupport, AdminAchievements |

**Không còn placeholder rỗng.** File `AdminPlaceholders.jsx` vẫn còn tên cũ nhưng mọi export (`AdminUserDetail`, `AdminFinance`, `AdminTransactions`, `AdminPayouts`, `AdminContentQuestions`, `AdminSystemSettings`) đều gọi API thật, có loading/error/filter. `AdminMentorDetail`, `AdminBookingDetail`, `AdminContentCourses`, `AdminSupport` đã tách thành file riêng và implement đầy đủ. Route cũ `/admin/content/videos` và `/admin/interview-metrics` chỉ còn redirect (gộp vào `/admin/content/courses` và `/admin/content/questions`).

---

## Tích hợp bên ngoài

### Supabase Edge Functions — CV Analysis

- File: `frontend/src/app/pages/cv/CVAnalysis.jsx`
- Base URL: `https://<projectId>.supabase.co/functions/v1/make-server-64a0c849/`
- Dùng JWT backend (không phải Supabase JWT) để auth
- Các endpoint: `GET cv/analyses`, `POST cv-analysis`, `GET cv/analyses/:id`, `DELETE cv/analyses/:id`
- FE có fallback demo nếu không có token hoặc 401
- **Kế hoạch:** migrate sang `POST /api/cv/analyses` trên Express

### Express → Python CV/JD Matcher

- FE gọi `/api/cv/analyze*` → backend `cvMatch.js` proxy sang `CV_ANALYZER_URL` (FastAPI)
- Python service: `cv_jd_matching/` (port 8000)
- Cần set `CV_ANALYZER_URL` trong prod; dev dùng `http://localhost:8000`

### D-ID Streaming API — Avatar phỏng vấn

- File: `frontend/src/app/hooks/useDIDStream.js`
- Host: `https://api.d-id.com`
- Auth: `Authorization: Basic base64(<API_KEY>:)`
- Luồng: tạo stream → ICE → SDP → script → đóng stream

### Google Identity Services

- ID token → `POST /api/auth/google` (backend verify qua `google-auth-library`)
- Frontend: `frontend/.env.local` → `VITE_GOOGLE_CLIENT_ID`
- Vercel header `Cross-Origin-Opener-Policy: same-origin-allow-popups` cần cho FedCM

### JaaS (8x8.vc) — Phòng họp mentor/booking

- File: `backend/src/services/jaasService.js` — ký JWT RS256 (`signJaasMeetingJwt`), `buildJaasMeetingLaunch()` trả object `meeting` cho FE khi bắt đầu booking
- Được gọi trực tiếp trong `bookingsService.js` (không có route/controller riêng); fallback `{ provider: "jitsi_public" }` nếu JaaS chưa cấu hình hoặc lỗi ký
- `GET /api/health` trả kèm `getJaasPublicStatus()` để kiểm tra nhanh cấu hình đã đúng chưa
- Script hỗ trợ: `npm run verify:jaas` (kiểm tra JWT/key/appId), `npm run encode:jaas-key` (encode PEM private key sang base64 cho env)

### AI Providers & Interview session (`/api/ai/*`, `/api/interviews/*`)

- `interviews.js` + `interviewsController.js` — vòng đời phiên phỏng vấn AI: tạo session, cập nhật câu trả lời, complete, evaluate, phân tích cảm xúc khuôn mặt (`analyze-face`, rate-limit riêng), sinh câu hỏi bằng LLM (`generate-questions`, có `injectionRateLimit` chống prompt injection), trích xuất text từ CV (`extract-cv-text`)
- `aiProviders.js` + `aiProvidersController.js` — lớp abstraction cho STT (`/transcribe`), TTS (`/tts` + `/tts/voices`), emotion analysis (`/emotion`), D-ID avatar (`/avatar/presenters`, `/avatar/usage`), và pre-generate nội dung phỏng vấn (sync `/interview/pregenerate` hoặc async job `/interview/pregen/start` + poll `/interview/pregen/:jobId`)

### Analytics / Admin user-journey tracking (`/api/analytics/*`)

- FE gọi `POST /api/analytics/events` (auth + rate limit `analyticsEventsLimiter`) để ghi sự kiện `page_view`/`action` vào model `UserEvent` (collection `user_events`)
- Admin đọc lại qua `GET /api/admin/analytics/user-behavior` và `GET /api/admin/analytics/users/:id/journey` (trong `adminController`/`adminRouter`), hiển thị ở trang `/admin/analytics` (`AdminAnalytics.jsx`)

---

## Khái niệm domain chính

### Plans & Quota

| Plan | Giá/tháng | CV Analysis | Mentor Sessions |
|:-----|:----------|:------------|:----------------|
| `free` | 0đ | 2 | 0 |
| `student` | 150,000đ | Unlimited | 1 |
| `professional` | 500,000đ | Unlimited | 4 |
| `premium` | 2,000,000đ | Unlimited | Unlimited |

Fields trên `User`: `plan`, `planExpiresAt`, `quota` (cvAnalysisUsed/Limit, mentorSessionUsed/Limit).

Backward-compat: `starter_pro` → `student`, `elite_pro` → `professional` (xử lý trong `planKeys.js`).

### Mentor

- User có `role=mentor` phải có document **`Mentor`** (`userId`).
- Public URL dùng `publicId` (không dùng `_id`).
- Dùng `npm run sync:mentor-profiles` để đồng bộ nếu lệch.
- Cấp role mentor: Admin dùng `PATCH /api/users/:id/role` (không tự đổi qua `/me`).

### Bookings

Fields quan trọng: `price`, `platformFee`, `vat`, `totalAmount`, `paymentStatus`, `status`, `rescheduleHistory`.

Lifecycle status: `pending` → `confirmed` → `completed` / `cancelled`.

Hủy booking: `DELETE /api/bookings/:id` (không dùng `PATCH .../cancel`).

### Payments

- **Phạm vi sản phẩm:** Frontend production dùng **chuyển khoản ngân hàng** (checkout / ghi danh khóa + admin xác nhận qua ledger `payments`). **Không ưu tiên** MoMo, ZaloPay, thẻ làm kênh khách hàng trừ khi được yêu cầu rõ. Backend vẫn có stub initiate/webhook — coi là ngoài phạm vi mặc định.
- CK: `recordTransferPending` → user `submit-transfer` → admin `confirm-transfer-payment` → `recordAdminTransferSuccess`.
- MoMo, ZaloPay, VNPay: sandbox/stub trong `paymentsService` — kiểm tra trước khi bật prod.

---

## Trạng thái dự án hiện tại

### Backend ✅

Toàn bộ 80+ endpoint Phase 1–4 đã implement và mount, cộng thêm các module mới ngoài ROADMAP gốc: `/api/interviews`, `/api/ai`, `/api/analytics`, JaaS video meeting. Xem `ROADMAP.md` để biết status từng endpoint Phase 1–4 (✅/📋 — 77 ✅ / 4 📋).

**Ghi chú:**
- `/api/cart` (`routes/cart.js`, `cartController.js`, model `Cart`) đã viết xong nhưng **chưa mount** trong `app.js` — không hoạt động trên bản web.
- Có hạ tầng test thật: 14 file `*.test.js`/`*.integration.test.js`, dùng Node test runner + Jest + `mongodb-memory-server`.

### Frontend — trạng thái từng domain

| Domain | Trạng thái |
|:-------|:-----------|
| Auth (login/register/Google/reset/verify-email) | ✅ kết nối API thật |
| Dashboard (mentor/admin redirect từ `/`) | ✅ |
| Mentors list + profile | ✅ kết nối API thật |
| Booking flow (`/my-bookings`, `/booking/:id`, check-in) | ✅ phần lớn API thật |
| Session detail / feedback | ✅ |
| CV Analysis (hub tách JD/Field) | ✅ đã tách UI theo mode; kiểm tra lại phần Supabase Edge legacy nếu còn dùng |
| Courses (`/my-courses`, learning full-screen) | ✅ list/detail/enrollment API thật |
| Mentor dashboard/schedule/finance/analytics/peer-review | ✅ gọi `/api/mentor/*` API thật |
| Meeting room (`/meeting/:sessionId`) | ✅ JaaS thật, fallback Jitsi public |
| Admin: dashboard/users/mentors/bookings/finance/transactions/payouts/content/settings/reviews/support/achievements | ✅ tất cả gọi API thật — **không còn trang admin nào là placeholder rỗng** |
| Admin analytics (user-journey) | ✅ đọc `UserEvent` qua `/api/admin/analytics/*` |
| Notifications | 🔧 UI có; cần kiểm tra kết nối |
| Upload (avatar/CV/thumbnail) | 🔧 kiểm tra lại — trước đây trả mock URL |
| Payment return/success/failure (+ course/subscription payments admin) | ✅ |
| Giỏ hàng (mobile-only hiện tại) | 📋 route backend có sẵn nhưng chưa mount cho web; FE web chưa có UI cart |

### CV/JD Production Checklist

Cần cả hai để hoạt động đúng:
1. `VITE_API_URL` set đúng host prod (FE gọi đúng `/api`)
2. `CV_ANALYZER_URL` set URL Python FastAPI reachable từ backend Node

Nếu thiếu → `404` (sai host) hoặc `503` (analyzer unreachable).

---

## Deployment

### Backend (Render)

```yaml
# render.yaml
service: prointerview-backend
runtime: node
rootDir: backend/
buildCommand: npm install
startCommand: npm start
healthCheckPath: /api/health
region: singapore
```

Env vars cần set trên Render: `NODE_ENV=production`, `MONGO_URI`, `JWT_SECRET`, `CORS_ORIGIN`, `GOOGLE_CLIENT_ID`, `CV_ANALYZER_URL`.

### Frontend (Vercel)

```json
// vercel.json
{ "headers": [{ "key": "Cross-Origin-Opener-Policy", "value": "same-origin-allow-popups" }] }
```

Build: `vite build` → `dist/`. Set `VITE_API_URL` và `VITE_GOOGLE_CLIENT_ID` trong Vercel env.

### Python CV Service

Có `Procfile` + `runtime.txt` — deploy được lên Heroku/Render. Sau deploy set `CV_ANALYZER_URL` vào backend env.

---

## Quy tắc phát triển

### Khi thêm API mới

1. Tạo route → controller (→ service nếu có business logic phức tạp) → model
2. Mount router trong `backend/src/app.js`
3. Cập nhật **`ROADMAP.md`** (đổi 📋 → ✅) và **`API_INDEX.md`** (thêm vào Phần A hoặc Phần C tương ứng)

### Khi nối FE với API

1. Thêm/sửa function trong `frontend/src/app/utils/*Api.js` tương ứng
2. Dùng `apiUrl(path)` từ `utils/api.js` (không hardcode URL)
3. Dùng `authFetch` (Bearer token) cho route cần auth

### Conventions

- Response: `{ success: true, <key>: data }` / `{ success: false, error: "msg" }`
- Auth middleware: `authJwt` (Bearer JWT), `requireMentor`, `requireAdmin`
- Mentor public URL: dùng `publicId`, không dùng `_id` trực tiếp
- Booking cancel: `DELETE /api/bookings/:id` (không tạo `PATCH .../cancel`)
- Change password: `PATCH /api/auth/me` (không cần route riêng)

### Tech stack tham chiếu nhanh

| | |
|:-|:-|
| Frontend | React 18, Vite, React Router v7 (hash), Tailwind CSS, shadcn/ui, Recharts, @react-three/* |
| Backend | Express 5 (ESM), Node 20+, Mongoose 9, JWT, bcrypt, multer, google-auth-library |
| DB | MongoDB (collections: 21 schemas) |
| CV Analysis | Python FastAPI, pdf parsing, NLP skill extraction |
| Payments | MoMo, ZaloPay (sandbox), VNPay partial |
| External | Google Identity Services, Supabase Edge, D-ID API, JaaS (8x8.vc), STT/TTS providers |

---

## Tài liệu liên quan

| File | Nội dung |
|:-----|:---------|
| `ROADMAP.md` | Endpoint theo Phase 1–4, trạng thái ✅/📋, gợi ý sprint |
| `API_INDEX.md` | Contract đầy đủ: Phần A (đang chạy), B (Supabase/D-ID), C (roadmap) |
| `backend/DATABASE.md` | Schema MongoDB chi tiết từng field |
| `POSTMAN_TESTING.md` | Hướng dẫn test API với Postman |
