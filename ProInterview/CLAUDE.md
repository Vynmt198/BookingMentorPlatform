# CLAUDE.md

Tài liệu hướng dẫn cho Claude Code khi làm việc trong repo này. Tài liệu sản phẩm (README, ROADMAP, API_INDEX, DATABASE) bằng **tiếng Việt**.

---

## Tổng quan dự án

**ProInterview** — SaaS luyện phỏng vấn xin việc, kiến trúc monorepo:

| Thư mục | Stack | Port dev |
|:--------|:------|:---------|
| `frontend/` | Vite + React 18 + Tailwind CSS + shadcn/ui | 5173 |
| `backend/` | Express 5 + MongoDB (Mongoose 9) + JWT | 5000 (`.env.example` dùng 5001) |
| `cv_jd_matching/` | Python FastAPI + Uvicorn | 8000 |

**Ngôn ngữ sản phẩm:** Tiếng Việt (giao diện user-facing, tài liệu nội bộ).

> **⚠️ `ROADMAP.md` và `API_INDEX.md` đã lệch so với code hiện tại** (vẫn liệt kê `/api/interviews`, `/api/ai` đã bị gỡ). Đọc chúng để tham khảo contract chung, không phải nguồn chân lý — kiểm tra `backend/src/routes/` + `backend/src/app.js` trước khi kết luận endpoint nào tồn tại.

### Tính năng đã GỠ khỏi bản web

Commit `3c5a43d` xoá toàn bộ phỏng vấn AI + avatar. **Không còn** trong codebase này:

- Route `/api/interviews`, `/api/ai` — cùng `interviewsController.js`, `aiProvidersController.js`
- Model `InterviewSession`
- Service `interviewQuestionService`, `emotionService`, `avatarService`, `videoPregenService`, `competencyFramework`
- Hook FE `useDIDStream.js`, util `interviewsApi.js`, các trang `/interview/*`, `/avatar-demo` (chỉ còn redirect về `/`)
- Route admin `/admin/content/questions`, `/admin/interview-metrics` (redirect về `/admin`)

`sttService.js` / `ttsService.js` vẫn còn trong `services/` nhưng không có route nào mount chúng. Nếu task yêu cầu phỏng vấn AI, tham chiếu `Prointerview-App/backend` (bản mobile còn giữ đầy đủ) để port sang.

---

## Lệnh phát triển

### Backend (`backend/`)

```bash
npm run dev                    # nodemon → src/server.js
npm start                      # node src/server.js (production)
npm run seed:users             # Seed users dev (chỉ khi collection rỗng)
npm run seed:all               # Seed toàn bộ dữ liệu mock
npm run seed:ui-mock           # Seed mock cho UI
npm run seed:reviews / seed:reports / seed:mentor-samples / seed:course-samples
npm run seed:mentor-bios / seed:commission / seed:mentor-courses-ui / seed:endpoint
npm run seed:meeting-flow      # Seed demo luồng phòng họp mentor
npm run seed:suspend-demo      # Seed demo tạm ngưng mentor + hoàn tiền học viên
npm run seed:lock-test         # Seed demo khóa tài khoản (ghi vào DB RIÊNG `prointerview_locktest`)
npm run seed:demo              # Seed showcase cho site đã deploy — 9 user @demo.local, phủ đủ
                               #   trạng thái booking/payment/mentor. Idempotent, chỉ đụng @demo.local
npm run seed:demo:clean        # Xóa sạch dữ liệu @demo.local
npm run db:prune-fake-mentors  # Xóa Mentor docs không có User tương ứng
npm run sync:mentor-profiles   # Đồng bộ Mentor profiles với Users
npm run db:normalize-transfer-refs / db:migrate-cv-analysis[:dry]
npm run verify:jaas            # Kiểm tra cấu hình JaaS (JWT signing, key, appId)
npm run encode:jaas-key        # Encode JaaS private key PEM → base64 cho env var
npm test                       # test:node + test:dto + test:python-cv
npm run test:node / test:payments / test:python-cv / test:dto
```

**Node:** `>=20` (xem `backend/package.json` → `engines`).

### Frontend (`frontend/`)

```bash
npm run dev       # Vite dev server (5173); proxy /api → backend
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
NODE_ENV=development
PORT=5001
MONGO_URI=mongodb://127.0.0.1:27017/prointerview
JWT_SECRET=<chuỗi dài ngẫu nhiên ≥32 ký tự>
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:5001
GOOGLE_CLIENT_ID=<từ GCP>
CV_ANALYZER_URL=http://localhost:8000     # Python FastAPI URL
# LLM (dùng bởi cvMatch / gợi ý CV — OpenAI-compatible)
LLM_API_KEY=<your-key>
LLM_BASE_URL=https://api.groq.com/openai/v1
LLM_MODEL=llama-3.3-70b-versatile
# Optional
# ADMIN_INVITE_CODE=
# BOOKING_PLATFORM_FEE_RATE=0.30            # + _EARLY_MENTOR=0.20
# COURSE_PLATFORM_FEE_RATE=0.35             # + _EARLY_MENTOR=0.25
# EARLY_MENTOR_LIMIT=20 / EARLY_MENTOR_DURATION_YEARS=1
# JAAS_APP_ID= / JAAS_API_KEY_ID= / JAAS_DOMAIN=8x8.vc / JAAS_JWT_TTL_SEC=10800
# JAAS_PRIVATE_KEY= | JAAS_PRIVATE_KEY_BASE64= | JAAS_PRIVATE_KEY_PATH=
```

Xem `backend/.env.example` để biết đầy đủ biến. Không set JaaS → tự fallback `meet.jit.si` (giới hạn ~5' embed).

### Frontend `frontend/.env.local`

```env
VITE_GOOGLE_CLIENT_ID=<giống backend>
VITE_API_URL=https://your-api.example.com   # Chỉ cần khi prod SPA ≠ API host
VITE_FRONTEND_URL=<optional, dùng cho link tuyệt đối trong email/hoá đơn>
# Checkout CK — không set thì trang thanh toán báo "Chưa cấu hình STK ngân hàng"
VITE_BANK_TRANSFER_NAME=<tên ngân hàng>
VITE_BANK_TRANSFER_ACCOUNT=<số tài khoản>
VITE_BANK_TRANSFER_OWNER=<chủ tài khoản>
VITE_VIETQR_BANK_ID=<mã ngân hàng VietQR, vd TPB>
VITE_SUPABASE_PROJECT_ID=<chỉ cho nhánh CV Analysis legacy>
```

`frontend/src/app/utils/api.js` resolve `API_BASE_URL`: ưu tiên `VITE_API_URL`, fallback `http://localhost:5000` (dev), rồi `""` (same-origin prod).

`frontend/src/app/pages/booking/Checkout.jsx` đọc `VITE_BANK_TRANSFER_*` để hiển thị QR VietQR + thông tin chuyển khoản — thiếu biến này thì trang chỉ hiện thông báo lỗi cấu hình thay vì QR thật (Vite cần restart dev server sau khi đổi `.env`).

---

## Kiến trúc Backend (`backend/src/`)

### Entry points

- **`server.js`** — load env, kết nối MongoDB, gọi `createApp()`, listen `PORT`, và **khởi động 5 background job** (xem dưới).
- **`app.js`** — `createApp()`: middleware, `GET /api/health`, mount tất cả routers `/api/*`.

### Background jobs (`jobs/`, start trong `server.js`)

| Job | Vai trò |
|:----|:--------|
| `bookingReminderJob` | Nhắc trước buổi hẹn |
| `bookingStaleSweepJob` | Dọn booking treo (quá giờ mà chưa chốt trạng thái) |
| `streakReminderJob` | Nhắc streak học tập |
| `planExpiryReminderJob` | Nhắc gói cước sắp hết hạn |
| `earningsClearanceJob` | Giải phóng thu nhập mentor khi hết thời gian giữ (`releaseEligibleEarnings` — claim-first + transaction, chống cộng trùng) |

### Pattern chuẩn

```
Route → Controller → Service → Mongoose Model
```

Thực tế: auth, bookings, payments, plans, mentor dashboard, reviews, reports, dashboard stats, user role, analytics, invoice, account closure → có Service. Admin (phần lớn), notifications, courses, enrollments, CV CRUD, upload, cart, mock courses → Controller gọi Model trực tiếp.

### Routers mounted trong `app.js`

| Prefix | File (`routes/`) | Ghi chú |
|:-------|:-----------------|:--------|
| `/api/auth` | `auth.js` | |
| `/api/mentors` | `mentors.js` | |
| `/api/bookings` | `bookings.js` | gồm check-in mentor, no-show, refund destination |
| `/api/plans` | `plans.js` | |
| `/api/payments` | `payments.js` | gồm `GET /history`, `GET /:id/invoice` (PDF), webhook SePay/MoMo/ZaloPay/VNPay |
| `/api/users` | `users.js` | |
| `/api/courses` | `courses.js` | |
| `/api/reviews` | `reviews.js` | |
| `/api/reports` | `reports.js` | |
| `/api/mentor` | `mentor.js` | Dashboard/finance/analytics mentor + `payout-accounts` CRUD |
| `/api/notifications` | `notifications.js` | |
| `/api/admin` | `admin.js` | gồm audit log, account impact/close, finance overview |
| `/api/enrollments` | `enrollments.js` | |
| `/api/cart` | `cart.js` | **Đã mount** — get/add/checkout/update/remove/clear |
| `/api/cv` | `cv.js` + `cvMatch.js` | cv.js: CRUD/quota; cvMatch.js: proxy sang Python |
| `/api/analytics` | `analytics.js` | `POST /events` (auth + `analyticsEventsLimiter`) → `UserEvent` |
| `/api/upload` | `upload.js` | |
| `/api/mock` | `mockCourses.js` | Mock data cho dev/test |

`/api` toàn cục qua `apiLimiter`; thao tác **ghi** của admin có rate limit riêng (30/phút/admin).

### Services (`services/`)

`accessTokenBlacklist`, `accountClosureService`, `analyticsService`, `authService`, `bookingsService` (tích hợp JaaS qua `buildJaasMeetingLaunch`), `cacheService`, `courseMentorInsightsService`, `courseStatsService`, `dashboardStatsService`, `emailService`, `invoiceService`, `jaasService`, `langfuseService`, `mentorCommissionService`, `mentorDashboardService`, `mentorEarningsService`, `mentorMeService`, `mentorProfileService`, `mentorSuspensionRefundService`, `mentorsService`, `normalizeTransferRefsService`, `notificationDeliveryService`, `paymentsService`, `plansService`, `reportsService`, `reviewsService`, `sepayWebhookService`, `sttService`, `transferPaymentExpiryService`, `ttsService`, `userRoleService`

### Models (`models/`) — 20 Mongoose schemas

`User`, `Mentor`, `Booking`, `Payment`, `Course`, `Enrollment`, `Review`, `Notification`, `CVAnalysis`, `Report`, `Subscription`, `Activity`, `CourseQA`, `MentorPeerReview`, `PayoutRequest`, `Cart`, `MentorKnowledge`, `SecurityLog`, `SepayWebhookEvent`, `UserEvent` (+ `index.js`)

**Không có** `InterviewSession` (đã gỡ cùng tính năng phỏng vấn AI).

Plan và quota được lưu trực tiếp trên **`User`** (field `plan`, `planExpiresAt`, `quota.cvAnalysisUsed/Limit`, `quota.mentorSessionUsed/Limit`).

### Middleware

- `authJwt` — verify Bearer JWT, set `req.user` / `req.userId`
- `requireMentor` — `role === "mentor"`; `requireActiveMentor(action)` — chặn mentor đang tạm ngưng khỏi **hoạt động** (không chặn tiền)
- `requireAdmin` — dùng lại `req.userRole`, không query DB thêm
- `adminAuditLog` — ghi mọi thao tác **ghi** của admin vào `SecurityLog`, che field nhạy cảm
- `rateLimiters.js` — `apiLimiter`, login/register, `analyticsEventsLimiter`, admin-write limiter, …

### Response shape

```js
// Thành công
{ success: true, user: {...} }      // key: user, mentors, bookings, ...
// Lỗi
{ success: false, error: "message" }
```

### Auth & tokens

- **Access JWT:** claim `tv` phải khớp `User.tokenVersion`. Hết hạn (mặc định 15m, hoặc `JWT_EXPIRES_IN`).
- **Refresh token:** dạng `sessionObjectId:secret` (opaque), lưu hash trong `User.authSessions` (tối đa 10 phiên/user). `refreshAccessToken` kiểm `isActive` **độc lập** và dọn session khi tài khoản bị khóa.
- Logout → `tokenVersion++`, xóa toàn bộ refresh sessions. Đổi mật khẩu → tương tự + trả token mới.
- `PATCH /api/auth/me` **từ chối thẳng mọi `body.role`** (không blacklist từng cặp).

---

## Kiến trúc Frontend (`frontend/src/app/`)

### Cấu trúc thư mục

```
pages/
  auth/          Login, Register, ForgotPassword, ResetPassword, VerifyEmail
  home/          Home, Pricing, About, Blog, Terms, Privacy, Achievements, CinematicHeroPage
  account/       Dashboard, Profile, Settings, PaymentHistory
  booking/       Booking, Checkout, SessionDetail, MyBookings, MentorReview,
                 MentorCancelSessionPanel
  courses/       Courses, CourseDetail, CourseLearning, MyCourses
  cv/            CVAnalysisHub, CVAnalysis, CVAnalysisResult, AnalysisHistory
  mentor/        MentorDashboard, MentorSchedule, MentorAnalytics, MentorMeetingDetail,
                 MentorReviews, MeetingRoom, MentorFinance, MentorCourseManagement,
                 MentorCourseEdit, MentorPeerReview, MentorSessionFeedback, MentorArea
  mentors/       Mentors, MentorProfile
  payment/       PaymentReturn, SuccessPage, FailurePage
  admin/         AdminLayout, AdminDashboard, AdminAnalytics, AdminUsers, AdminMentors,
                 AdminMentorsPending, AdminMentorDetail, AdminBookings, AdminBookingDetail,
                 AdminBookingCheckIns, AdminFinanceOverview, AdminCoursePayments,
                 AdminSubscriptionPayments, AdminContentCourses, AdminReviews,
                 AdminSupport, AdminAchievements, AdminPlaceholders, adminLoader

components/
  ui/            40+ shadcn/ui primitives
  layout/        AppLayout, AdminSidebar, Navbar (chứa CartDrawer), Sidebar, Footer,
                 TopNavShell, CustomerPageHeader, SidebarMascot, SidebarBrandButton
  account/       AccountDangerZone, LoginSessionsSection
  admin/         PlatformFinanceSummary (dùng chung Dashboard + /admin/finance),
                 UserJourneyPanel, UserOnlineStatus, AdminMentorCheckInPanel,
                 AdminSepayOverrideAction, AdminListFilters, AdminStatusPill,
                 AdminPageShell, AdminLessonVideoPlayer
  auth/          AuthShell, GoogleSignInBlock, ProtectedOutlet, AuthPurpleBackdrop
  booking/       BookingPolicySummary, BookingStepBar, RefundBankFields, UserCancelPolicyBrief
  cv/            CVAnalysisResultContent, CVDocumentPreview, CvAnalysisHubSections,
                 CvAnalysisScoreBreakdown, CvJdAnalysisFrame, CvJdAnalysisTabs
  mentor/        MentorStatFrames, MeetingEndSessionPanel, MeetingLeaveConfirmPanel,
                 MeetingLiveCapturePanel, MentorMeetingCheckIn, KnowledgeCaptureModal,
                 MentorListCard, course-create/*, profile/*
  modals/        LockAccountModal, RefundAccountModal, ReportMentorModal, RescheduleModal
  shared/        AiLoadingState, CartDrawer, CustomerStatCards, ExploreFilterSidebar,
                 FlowStepBar, ListPagination, PageHeader, SupportContact
  courses/, home/, profile/, reviews/, legal/, brand/, decor/, figma/

hooks/
  useCart.jsx               State giỏ hàng (dùng bởi CartDrawer)
  usePageAnalytics.js       Gửi page_view lên /api/analytics/events
  useMeetingLiveCapture.js  Live capture trong phòng họp
  useMentorApplyStatus.js, useMentorListExpand.js

utils/
  api.js            apiUrl(), API_BASE_URL
  auth.js           JWT lưu/đọc localStorage
  requireAuthLoader.js, authGate.js   Route guard
  adminApi.js, bookingsApi.js, cartApi.js, courseApi.js, cvApi.js, dashboardApi.js,
  enrollmentApi.js, mentorApi.js, notificationApi.js, paymentsApi.js, plansApi.js,
  reportsApi.js, reviewsApi.js, uploadApi.js
  jaasMeeting.js, meetingLinks.js, liveCapture.js
  adminBookingMoney.js, adminPaymentUi.js, adminTransferConfirm.js, formatVnd.js,
  moneyDisplay.jsx, planPricing (BE), planSync.js
  analytics/        Helper gom sự kiện hành vi
```

### Routing (`routes.js`)

- **Hash-based** (`createHashRouter`)
- `AppLayout` bọc hầu hết routes user; `ProtectedOutlet` + `requireAuthLoader` bọc phần cần login
- `AdminLayout` (+ `adminLoader`) bọc `/admin/*` — `adminLoader` **xác thực role qua server**, không tin `localStorage`
- `CourseLearning` và `MeetingRoom` full-screen, không có sidebar
- Wildcard `*` redirect về `/`

**Auth state:** `localStorage` keys `prointerview_access_token`, `prointerview_auth`. Session khôi phục qua `GET /api/auth/me` khi app load.

### Routes user (`frontend/src/app/routes.js`)

| Path | Component |
|:-----|:---------|
| `/` | Home (redirect theo role nếu đã login: mentor→`/mentor/dashboard`, admin→`/admin`) |
| `/landing` | CinematicHeroPage |
| `/login`, `/register` | Login, Register |
| `/forgot-password`, `/reset-password`, `/verify-email` | ForgotPassword, ResetPassword, VerifyEmail |
| `/pricing`, `/about`, `/achievements`, `/blog`, `/terms`, `/privacy` | Trang tĩnh/marketing |
| `/checkout` | Checkout (yêu cầu login) |
| `/payment-return`, `/payment-success`, `/payment-failure` | Payment pages |
| `/payment-history` | PaymentHistory — lịch sử giao dịch + tải hoá đơn PDF (yêu cầu login) |
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
| `/mentor/dashboard`, `/mentor/schedule`, `/mentor/finance`, `/mentor/analytics`, `/mentor/reviews` | Mentor area (nested dưới `MentorArea`) |
| `/mentor/meeting-detail/:sessionId` | MentorMeetingDetail |
| `/mentor/courses`, `/mentor/courses/:id/edit` | MentorCourseManagement, MentorCourseEdit |
| `/mentor/peer-review` | MentorPeerReview |
| `/mentor/session-feedback/:sessionId` | MentorSessionFeedback |
| `/admin/*` | Admin section (AdminLayout + `adminLoader`) |

**Route chỉ còn redirect:** `/interview`, `/interview/gender`, `/interview/room`, `/interview/feedback`, `/avatar-demo` → `/`. `/cv-analysis/history` redirect theo query `mode`. `/admin/content/videos` → `/admin/content/courses`. `/admin/interview-metrics` → `/admin`.

### Admin routes (`/admin/*`)

| Path | Component |
|:-----|:---------|
| `/admin` (index) | AdminDashboard (dùng `PlatformFinanceSummary`) |
| `/admin/analytics` | AdminAnalytics — dashboard hành vi người dùng (đọc `UserEvent`) |
| `/admin/users`, `/admin/users/:id` | AdminUsers (phân trang + lọc server-side), AdminUserDetail |
| `/admin/mentors`, `/admin/mentors/pending`, `/admin/mentors/:id` | AdminMentors, AdminMentorsPending, AdminMentorDetail |
| `/admin/finance` | AdminFinance — doanh thu nền tảng (`PlatformFinanceSummary`) |
| `/admin/finance-overview` | **AdminFinanceOverview — trang "Thu · Chi · Lợi nhuận"** tổng hợp toàn hệ thống, có phép đối chiếu tự kiểm chứng |
| `/admin/transactions`, `/admin/payouts` | AdminTransactions, AdminPayouts |
| `/admin/bookings`, `/admin/bookings/:id`, `/admin/bookings/check-ins` | AdminBookings, AdminBookingDetail, AdminBookingCheckIns |
| `/admin/course-payments`, `/admin/subscription-payments` | AdminCoursePayments, AdminSubscriptionPayments (1 bảng lọc trạng thái + lịch sử người mua) |
| `/admin/content/courses` | AdminContentCourses |
| `/admin/settings`, `/admin/reviews`, `/admin/support`, `/admin/achievements` | AdminSystemSettings, AdminReviews, AdminSupport, AdminAchievements |

**Không còn placeholder rỗng.** File `AdminPlaceholders.jsx` vẫn giữ tên cũ nhưng mọi export (`AdminUserDetail`, `AdminFinance`, `AdminTransactions`, `AdminPayouts`, `AdminSystemSettings`) đều gọi API thật, có loading/error/filter.

---

## Tích hợp bên ngoài

### Express → Python CV/JD Matcher

- FE gọi `/api/cv/analyze*` → backend `cvMatch.js` proxy sang `CV_ANALYZER_URL` (FastAPI)
- Python service: `cv_jd_matching/` (port 8000)
- Cần set `CV_ANALYZER_URL` trong prod; dev dùng `http://localhost:8000`

### Google Identity Services

- ID token → `POST /api/auth/google` (backend verify qua `google-auth-library`)
- Frontend: `frontend/.env.local` → `VITE_GOOGLE_CLIENT_ID`
- Vercel header `Cross-Origin-Opener-Policy: same-origin-allow-popups` cần cho FedCM
- User đăng ký/đăng nhập Google lần đầu → backend gửi **email mật khẩu ban đầu** (`sendInitialPasswordEmail`) để họ có thể đăng nhập bằng email/password sau này

### JaaS (8x8.vc) — Phòng họp mentor/booking

- File: `backend/src/services/jaasService.js` — ký JWT RS256 (`signJaasMeetingJwt`), `buildJaasMeetingLaunch()` trả object `meeting` cho FE khi bắt đầu booking
- Được gọi trực tiếp trong `bookingsService.js` (không có route/controller riêng); fallback `{ provider: "jitsi_public" }` nếu JaaS chưa cấu hình hoặc lỗi ký
- `GET /api/health` trả kèm `getJaasPublicStatus()` để kiểm tra nhanh cấu hình
- FE: `pages/mentor/MeetingRoom.jsx` + `utils/jaasMeeting.js`; check-in mentor bằng ảnh webcam trước khi vào phòng (`MentorMeetingCheckIn`)
- Script hỗ trợ: `npm run verify:jaas`, `npm run encode:jaas-key`

### SePay — Webhook xác nhận chuyển khoản

- `POST /api/payments/webhook/sepay` → `sepayWebhookService`, dedupe qua model `SepayWebhookEvent`
- Giao dịch thuộc tài khoản **bị khóa** không tự xác nhận mà bị giữ với trạng thái `held_inactive_account`; admin xử lý qua `GET /api/admin/payments/held` + `AdminSepayOverrideAction`

### Analytics / Admin user-journey tracking (`/api/analytics/*`)

- FE gọi `POST /api/analytics/events` (auth + `analyticsEventsLimiter`) qua hook `usePageAnalytics.js` để ghi sự kiện `page_view`/`action` vào model `UserEvent` (collection `user_events`)
- Admin đọc lại qua `GET /api/admin/analytics/user-behavior` và `GET /api/admin/analytics/users/:id/journey`, hiển thị ở `/admin/analytics` (`AdminAnalytics.jsx` + `UserJourneyPanel`)

### Supabase Edge Functions — CV Analysis (legacy)

- Chỉ còn tham chiếu trong `frontend/src/app/pages/cv/CVAnalysis.jsx` (`VITE_SUPABASE_PROJECT_ID`)
- Luồng chính đã dùng Express + Python; coi nhánh Supabase là legacy, kiểm tra trước khi dựa vào nó

---

## Khái niệm domain chính

### Plans & Quota

| Plan | Giá/tháng | Giá/năm | CV/JD Analysis | Ưu đãi đặt Mentor | Ưu đãi mua khóa học |
|:-----|:----------|:--------|:----------------|:-------------------|:---------------------|
| `free` | 0đ | — | 3/tháng | 0% | 0% |
| `student` | 150,000đ | 1,440,000đ | 50/tháng | 5% | 5% |
| `professional` | 500,000đ | 4,800,000đ | 999 (không giới hạn) | 10% | 10% |

Nguồn chân lý: `backend/src/services/plansService.js` (quota) + `frontend/src/app/pages/home/Pricing.jsx` (giá).

Fields trên `User`: `plan`, `planExpiresAt`, `quota` (cvAnalysisUsed/Limit, mentorSessionUsed/Limit). `mentorSessionLimit` luôn set `0` — giữ trong schema để tương thích booking lịch sử (`paymentMethod: "plan_quota"`), không còn cấp buổi miễn phí. Buổi mentor luôn tự thanh toán với ưu đãi % theo gói (`resolveMentorBookingDiscountForUser` trong `planGuard.js`).

**Nâng cấp/đổi hạng giữa chừng:** quy đổi **giá trị ngày còn lại theo tiền** (`utils/planPricing.js`), không cộng dư ngày miễn phí khi đổi `student ↔ professional`. Còn hạn gói cũ thì cộng dồn thời gian, không mất phần đã trả.

Backward-compat: `starter_pro` → `student`, `elite_pro` / `premium` → `professional` (xử lý trong `planKeys.js`).

### Mentor & vòng đời tài khoản

- User có `role=mentor` phải có document **`Mentor`** (`userId`). Public URL dùng `publicId` (không dùng `_id`). Dùng `npm run sync:mentor-profiles` để đồng bộ nếu lệch.
- Cấp role mentor: Admin dùng `PATCH /api/users/:id/role` (không tự đổi qua `/me`).
- **`Mentor.status`** enum `active | suspended | closed`, `isActive` giữ đồng bộ (`isActive === status === "active"`) để code cũ đọc `isActive` không phải sửa.

**Nguyên tắc bất biến của vòng đời tài khoản: chặn HOẠT ĐỘNG ≠ chặn TIỀN.**

| Trạng thái | Hệ quả |
|:-----------|:-------|
| `suspended` | Mentor **vẫn đăng nhập và tự rút tiền được**. Chỉ chặn hoạt động: lịch rảnh, khóa học, upload, đánh giá chéo, đổi giá, sửa hồ sơ (`requireActiveMentor`). Ẩn khỏi tìm kiếm + không nhận booking/enrollment mới. |
| `closed` | **Soft-delete** — giữ nguyên document `Mentor` + toàn bộ lịch sử payout/booking/enrollment, chỉ ẩn danh PII trên `User` và giải phóng email. **Không có nhánh xóa cứng nào còn tồn tại.** |

- Cổng đóng tài khoản: `accountClosureService.canCloseMentor` / `canCloseUser` / `canCloseAccount` → `closeAccount`. `DELETE /api/auth/me` đi qua cổng này, trả **409 kèm `blockers` có mã máy đọc được** nếu chưa sạch nợ.
- Check dễ quên khi đóng mentor: `noUnclearedRows` (số dư 0 nhưng còn buổi/khóa chưa hết hạn giữ → sắp có tiền vào) và `noFailedRows` (dòng gắn cờ `earningsClearFailedAt` = tiền chưa rõ ràng, phải đối soát trước).
- `GET /api/admin/users/:id/impact` — xem trước tác động **trước khi** khóa. `POST /api/admin/users/:id/close` — đóng. `POST /api/admin/mentors/:id/payouts` — admin tạo yêu cầu rút thay mặt mentor bị khóa.
- `toggleUserStatus` chặn admin tự khóa mình và chặn khóa admin khác.
- **Auto-suspend do report** tách khỏi `isActive`: mentor bị nhiều report mở chỉ bị ẩn khỏi danh sách + chặn lịch mới, **không** bị chặn vào họp buổi cũ hay rút tiền đã kiếm. Tự mở lại khi admin xử lý hết report mở.
- **Khóa mentor → hoàn tiền học viên:** `mentorSuspensionRefundService.previewSuspensionRefunds` / `refundActiveBookingsForSuspendedMentor` tự hủy buổi đã trả tiền chưa diễn ra, chuyển `refund_pending`, hoàn 100% và thông báo học viên. FE: `LockAccountModal`, `RefundAccountModal` (hướng dẫn học viên gửi thông tin ngân hàng qua Gmail → `sendRefundAccountToAdmin`).

### Bookings

Fields quan trọng: `price`, `platformFee`, `vat`, `totalAmount`, `paymentStatus`, `status`, `rescheduleHistory`, `mentorCheckInImageUrl/At/UserId`, `earningsClearAt`, `earningsClearedAt`, `earningsClearFailedAt`, `earningsNetAmount`.

Lifecycle status: `pending` → `confirmed` → `in_progress` → `completed` / `cancelled` / `no_show`.

Hủy booking: `DELETE /api/bookings/:id` (không dùng `PATCH .../cancel`).

- **Double-booking bị chặn ở tầng DB** (unique index), không chỉ check ở code — tránh race condition.
- **No-show học viên:** mentor tự báo sau 15 phút (`POST /:id/report-customer-no-show`) → buổi tính như hoàn thành, mentor nhận đủ tiền, học viên không hoàn tiền, mentor không bị tính vi phạm.
- **Report mentor/booking** chỉ cho phép khi đã có buổi `completed`/`no_show` thật — không report được ngay sau khi vừa đặt lịch.
- `earningsNetAmount` được **chốt lúc ghi có**, không tính lại lúc release.

### Payments & tài chính

- **Phạm vi sản phẩm:** production dùng **chuyển khoản ngân hàng** (checkout / ghi danh khóa + admin xác nhận qua ledger `payments`, hoặc webhook SePay). **Không ưu tiên** MoMo, ZaloPay, thẻ trừ khi được yêu cầu rõ — backend vẫn có stub initiate/webhook, coi là ngoài phạm vi mặc định.
- CK: `recordTransferPending` → user `submit-transfer` → admin `confirm-transfer-payment` → `recordAdminTransferSuccess`.
- **Hoá đơn PDF:** `invoiceService.resolveInvoiceContext` + `buildInvoicePdfBuffer` → `GET /api/payments/:id/invoice`. FE: trang `/payment-history`.
- **`platformFee` cho enrollment:** `null` = **chưa tính**, `0` = **miễn phí thật** — phân biệt hai giá trị này, đừng coalesce `null → 0`.
- `partial_refund` phải **trừ phần hoàn tiền** khỏi doanh thu (lỗi tính dư 100% đã fix ở `9f621af`). Dashboard và `/admin/finance` dùng chung component `PlatformFinanceSummary` để không lệch số. Doanh thu **gói cước** cũng nằm trong "thu gộp" — quy ước này thống nhất giữa các trang.
- **Payout account validation:** nút "Tiếp tục" ở luồng thêm tài khoản trong `MentorFinance` bị disable đến khi tên ngân hàng + số tài khoản hợp lệ và đã xác nhận (`/api/mentor/payout-accounts`).

### Notifications & email

- **Welcome notification** — tạo idempotent trong `notificationDeliveryService` (chỉ 1 lần, dedupe qua `metadata.kind = "welcome"`), gọi từ `authService` ở cả register / login / google / google-first-login.
- `emailService`: `sendVerificationEmail`, `sendInitialPasswordEmail`, `sendResetPasswordEmail`, `sendMentorFeedbackEmail`, `sendRefundAccountToAdmin`. `isMailConfigured()` để bỏ qua an toàn khi chưa cấu hình SMTP.

---

## Trạng thái dự án hiện tại

### Backend ✅

Toàn bộ domain cốt lõi đã implement và mount: auth, mentors, bookings (+ check-in, no-show, refund), plans, payments (+ hoá đơn PDF, webhook SePay), users, courses, enrollments, cart, reviews, reports, mentor dashboard/finance/payout, notifications, admin (+ audit log, vòng đời tài khoản, finance overview), CV, analytics, upload.

**Ghi chú:**
- `/api/interviews`, `/api/ai` **đã gỡ** — xem mục "Tính năng đã GỠ" ở đầu file.
- Hạ tầng test: 13 file `*.test.js`/`*.integration.test.js`, dùng Node test runner + Jest + `mongodb-memory-server`.

### Frontend — trạng thái từng domain

| Domain | Trạng thái |
|:-------|:-----------|
| Auth (login/register/Google/reset/verify-email) | ✅ kết nối API thật |
| Dashboard (mentor/admin redirect từ `/`) | ✅ |
| Mentors list + profile | ✅ |
| Booking flow (`/my-bookings`, `/booking/:id`, check-in, no-show, reschedule) | ✅ |
| Session detail / feedback | ✅ |
| CV Analysis (hub tách JD/Field, `AiLoadingState` mascot loading) | ✅ — nhánh Supabase Edge còn lại là legacy |
| Courses (`/my-courses`, learning full-screen) | ✅ |
| Giỏ hàng (`CartDrawer` trong Navbar + `useCart`) | ✅ dùng `/api/cart` thật |
| Thanh toán + `/payment-history` + tải hoá đơn PDF | ✅ |
| Mentor dashboard/schedule/finance/analytics/peer-review | ✅ gọi `/api/mentor/*` |
| Meeting room (`/meeting/:sessionId`) | ✅ JaaS thật, fallback Jitsi public |
| Admin: dashboard/users/mentors/bookings/finance/finance-overview/transactions/payouts/content/settings/reviews/support/achievements | ✅ tất cả gọi API thật |
| Admin analytics (user-journey) | ✅ đọc `UserEvent` |
| Admin vòng đời tài khoản (impact → khóa/tạm ngưng/đóng + hoàn tiền) | ✅ |
| Notifications | 🔧 UI có; cần kiểm tra kết nối |
| Upload (avatar/CV/thumbnail) | 🔧 kiểm tra lại — trước đây trả mock URL |

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
rootDir: ProInterview/backend      # monorepo — kiểm tra lại nếu đổi layout
buildCommand: npm install
startCommand: npm start
healthCheckPath: /api/health
region: singapore
```

Env vars cần set trên Render: `NODE_ENV=production`, `MONGO_URI`, `JWT_SECRET`, `CORS_ORIGIN`, `FRONTEND_URL`, `GOOGLE_CLIENT_ID`, `CV_ANALYZER_URL`, JaaS (nếu dùng phòng họp thật), SMTP (nếu dùng email).

### Frontend (Vercel)

```json
// vercel.json
{ "headers": [{ "key": "Cross-Origin-Opener-Policy", "value": "same-origin-allow-popups" }] }
```

Build: `vite build` → `dist/`, Root Directory `ProInterview/frontend`. `frontend/vercel.json` có `rewrites` `/api/*` + `/uploads/*` trỏ về domain backend thật (hiện là `prointerview-backend-xm5q.onrender.com`) — cập nhật khi đổi host.

**Bẫy:** phải set `VITE_API_URL` trên Vercel dù đã có rewrite. `api.js` trả `""` khi biến trống ở prod, khiến `isExpressBackendConfigured()` → `false`, và `pages/cv/CVAnalysis.jsx` (`USE_EXPRESS_CV`) sẽ rơi về nhánh Supabase legacy thay vì gọi Express + Python — không có lỗi hiện ra.

Hướng dẫn deploy đầy đủ: [DEPLOYMENT.md](./DEPLOYMENT.md).

### Python CV Service

Có `Procfile` + `runtime.txt` — deploy được lên Heroku/Render. Sau deploy set `CV_ANALYZER_URL` vào backend env.

---

## Quy tắc phát triển

### Khi thêm API mới

1. Tạo route → controller (→ service nếu có business logic phức tạp) → model
2. Mount router trong `backend/src/app.js`
3. Cập nhật **`ROADMAP.md`** và **`API_INDEX.md`** (hai file này đang lệch — sửa phần liên quan khi đi qua)
4. Nếu tính năng cũng cần cho mobile, cân nhắc port sang `Prointerview-App/backend` — hai backend không tự đồng bộ

### Khi nối FE với API

1. Thêm/sửa function trong `frontend/src/app/utils/*Api.js` tương ứng
2. Dùng `apiUrl(path)` từ `utils/api.js` (không hardcode URL)
3. Dùng `authFetch` (Bearer token) cho route cần auth

### Khi làm việc quanh tiền

- Đừng coalesce `platformFee: null → 0` — hai giá trị này khác nghĩa.
- Doanh thu phải trừ `partial_refund`; dùng `PlatformFinanceSummary` thay vì tự tính lại.
- Thao tác trên số dư mentor phải qua `mentorEarningsService` (claim-first + transaction), không `$inc` trực tiếp.
- Mọi thay đổi trạng thái tài khoản phải qua cổng `accountClosureService` / `requireActiveMentor` — không tự viết check mới.

### Conventions

- Response: `{ success: true, <key>: data }` / `{ success: false, error: "msg" }`
- Auth middleware: `authJwt`, `requireMentor`, `requireActiveMentor(action)`, `requireAdmin`
- Mentor public URL: dùng `publicId`, không dùng `_id` trực tiếp
- Booking cancel: `DELETE /api/bookings/:id` (không tạo `PATCH .../cancel`)
- Change password: `PATCH /api/auth/me` (không cần route riêng); `PATCH /api/auth/me` từ chối mọi `body.role`
- Mọi thao tác ghi của admin tự động vào `SecurityLog` qua `adminAuditLog`

### Tech stack tham chiếu nhanh

| | |
|:-|:-|
| Frontend | React 18, Vite, React Router v7 (hash), Tailwind CSS, shadcn/ui, Recharts, @react-three/* |
| Backend | Express 5 (ESM), Node 20+, Mongoose 9, JWT, bcrypt, multer, google-auth-library, nodemailer |
| DB | MongoDB (20 schemas) |
| CV Analysis | Python FastAPI, pdf parsing, NLP skill extraction |
| Payments | Chuyển khoản ngân hàng + webhook SePay (chính); MoMo/ZaloPay/VNPay sandbox |
| Video meeting | JaaS (8x8.vc, JWT RS256), fallback Jitsi public |
| External | Google Identity Services (FedCM), SePay, Supabase Edge (legacy) |
| Testing | Node test runner + Jest, `mongodb-memory-server` (13 file test) |

---

## Tài liệu liên quan

| File | Nội dung |
|:-----|:---------|
| `README.md` | Tổng quan sản phẩm web, hướng dẫn chạy dev |
| `DEPLOYMENT.md` | Deploy Vercel + Render + Atlas từng bước, env var, bẫy đã biết, troubleshooting |
| `TESTING.md` | Kịch bản test site đã deploy theo vai trò + đối soát tiền + test bảo mật |
| `ROADMAP.md` | Endpoint theo Phase 1–4 — **đã lệch**, còn liệt kê module đã gỡ |
| `API_INDEX.md` | Contract endpoint — **đã lệch**, tham khảo thay vì tin tuyệt đối |
| `backend/DATABASE.md` | Schema MongoDB chi tiết từng field |
| `POSTMAN_TESTING.md` | Hướng dẫn test API với Postman |
| `../Prointerview-App/CLAUDE.md` | Tài liệu bản mobile — đối chiếu khi cần port tính năng qua lại |
