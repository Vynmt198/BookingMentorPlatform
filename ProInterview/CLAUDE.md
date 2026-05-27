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
npm run db:prune-fake-mentors  # Xóa Mentor docs không có User tương ứng
npm run sync:mentor-profiles   # Đồng bộ Mentor profiles với Users
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

Thực tế: auth, bookings, payments, plans, mentor dashboard, reviews, reports, dashboard stats, user role → có Service. Admin, notifications, courses, enrollments, CV CRUD, interviews, upload, mock courses → Controller gọi Model trực tiếp (không qua Service).

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
| `/api/interviews` | `interviews.js` | |
| `/api/upload` | `upload.js` | |
| `/api/mock` | `mockCourses.js` | Mock data cho dev/test |

### Services (`services/`)

`authService`, `bookingsService`, `dashboardStatsService`, `mentorDashboardService`, `mentorMeService`, `mentorProfileService`, `mentorsService`, `paymentsService`, `plansService`, `reportsService`, `reviewsService`, `userRoleService`

### Models (`models/`) — 17 Mongoose schemas

`User`, `Mentor`, `Booking`, `Payment`, `Course`, `Enrollment`, `Review`, `Notification`, `CVAnalysis`, `InterviewSession`, `Report`, `Subscription`, `Activity`, `CourseQA`, `MentorPeerReview`, `PayoutRequest`, `index.js`

Plan và quota được lưu trực tiếp trên **`User`** (field `plan`, `planExpiresAt`, `cvAnalysisUsed`, `interviewUsed`, v.v.).

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
  interview/     Interview, AIGenderSelection, InterviewRoom,
                 InterviewFeedback, AvatarDemo
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
  interview/     AILipSyncAvatar, AvatarInterviewer*, BehavioralCamera, HRVideoPlayer
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
  enrollmentApi.js, interviewsApi.js, mentorApi.js, notificationApi.js,
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

### Tất cả routes hiện có

| Path | Component |
|:-----|:---------|
| `/` | Home |
| `/login`, `/register` | Login, Register |
| `/forgot-password`, `/reset-password` | ForgotPassword, ResetPassword |
| `/pricing` | Pricing |
| `/checkout` | Checkout |
| `/payment-return`, `/payment-success`, `/payment-failure` | Payment pages |
| `/avatar-demo` | AvatarDemo |
| `/courses/:id/learn` | CourseLearning (full-screen) |
| `/admin/*` | Admin section (AdminLayout) |
| `/dashboard` | Dashboard |
| `/cv-analysis`, `/cv-analysis/history` | CVAnalysis, AnalysisHistory |
| `/interview`, `/interview/gender`, `/interview/room`, `/interview/feedback` | Interview flow |
| `/mentors`, `/mentors/:id` | Mentors, MentorProfile |
| `/booking/:id`, `/booking` | Booking |
| `/session/:id` | SessionDetail |
| `/review/:sessionId` | MentorReview |
| `/profile`, `/settings` | Profile, Settings |
| `/mentor/dashboard` | MentorDashboard |
| `/mentor/schedule` | MentorSchedule |
| `/mentor/finance` | MentorFinance |
| `/mentor/analytics` | MentorAnalytics |
| `/mentor/reviews` | MentorReviews |
| `/mentor/meeting/:sessionId` | MeetingRoom |
| `/mentor/meeting-detail/:sessionId` | MentorMeetingDetail |
| `/mentor/courses`, `/mentor/courses/:id/edit` | MentorCourseManagement, MentorCourseEdit |
| `/mentor/peer-review` | MentorPeerReview |
| `/courses`, `/courses/:id` | Courses, CourseDetail |

### Admin routes (placeholders — chưa implement đầy đủ)

`/admin/analytics`, `/admin/users/:id`, `/admin/mentors/:id`, `/admin/finance`, `/admin/transactions`, `/admin/payouts`, `/admin/bookings/:id`, `/admin/content/questions`, `/admin/content/courses` (video khóa gộp trong trang này), `/admin/settings`, `/admin/reviews`, `/admin/support`

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

---

## Khái niệm domain chính

### Plans & Quota

| Plan | |
|:-----|:-|
| `free` | Quota cơ bản |
| `starter_pro` | Quota mở rộng |
| `elite_pro` | Quota tối đa |

Fields trên `User`: `plan`, `planExpiresAt`, `cvAnalysisUsed`, `interviewUsed` (đối chiếu plan limits).

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

Toàn bộ 80+ endpoint Phase 1–4 đã implement và mount. Xem `ROADMAP.md` để biết status từng endpoint (✅/📋).

**Còn thiếu (📋):**
- `DELETE /api/auth/me` — xóa tài khoản
- `POST /api/bookings/:id/review` — alias route (dùng `POST /api/reviews` với `bookingId` thay thế)

### Frontend — trạng thái từng domain

| Domain | Trạng thái |
|:-------|:-----------|
| Auth (login/register/Google/reset) | ✅ kết nối API thật |
| Dashboard (`/dashboard`) | ✅ gọi `GET /api/users/dashboard-stats` |
| Mentors list + profile | ✅ kết nối API thật |
| Booking flow | ✅ phần lớn API thật; Checkout còn mock payment link |
| Session detail (`/session/:id`) | 🔧 một số trường dùng mock/demo |
| CV Analysis | 🔧 dùng Supabase Edge (chưa migrate sang Express) |
| Interview (AI avatar) | 🔧 D-ID stream; session CRUD qua API; một phần demo state |
| Courses | ✅ list/detail API thật; enrollment API thật |
| Mentor dashboard/schedule/finance | ✅ gọi `/api/mentor/*` API thật |
| Mentor meeting room | 🔧 một phần mock |
| Admin dashboard/users/mentors/bookings | ✅ API thật |
| Admin detail pages | 📋 Placeholders chưa implement |
| Notifications | 🔧 UI có; cần kiểm tra kết nối |
| Upload (avatar/CV/thumbnail) | 🔧 response trả mock URL |
| Payment return/success/failure | ✅ nhận redirect từ gateway |

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
| DB | MongoDB (collections: 17 schemas) |
| CV Analysis | Python FastAPI, pdf parsing, NLP skill extraction |
| Payments | MoMo, ZaloPay (sandbox), VNPay partial |
| External | Google Identity Services, Supabase Edge, D-ID API |

---

## Tài liệu liên quan

| File | Nội dung |
|:-----|:---------|
| `ROADMAP.md` | Endpoint theo Phase 1–4, trạng thái ✅/📋, gợi ý sprint |
| `API_INDEX.md` | Contract đầy đủ: Phần A (đang chạy), B (Supabase/D-ID), C (roadmap) |
| `backend/DATABASE.md` | Schema MongoDB chi tiết từng field |
| `POSTMAN_TESTING.md` | Hướng dẫn test API với Postman |
