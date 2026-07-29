# CLAUDE.md

Tài liệu hướng dẫn cho Claude Code khi làm việc trong repo này. Tài liệu sản phẩm (README, ROADMAP, API_INDEX) bằng **tiếng Việt**.

---

## Tổng quan dự án

**Prointerview-App** — bản **mobile** của ProInterview (SaaS luyện phỏng vấn xin việc), kiến trúc:

| Thư mục | Stack | Ghi chú |
|:--------|:------|:--------|
| `mobile/` | Expo 54 + React Native 0.81 + React 19 | Không dùng React Navigation |
| `backend/` | Express 5 + MongoDB (Mongoose 9) + JWT | **Fork riêng**, KHÔNG dùng chung code với `../ProInterview/backend` |
| `cv_jd_matching/` | Python FastAPI + Uvicorn | Giống bản web |

Không có `frontend/` trong repo này — thay vào đó là `mobile/`.

### ⚠️ Backend là fork độc lập

`backend/` ở đây là một codebase **độc lập, đã phân kỳ** khỏi `ProInterview/backend` (được tách ra rồi phát triển song song, không sync tự động). Trước khi sửa bug hay thêm tính năng backend, LUÔN xác nhận đang sửa đúng cây thư mục.

Khác biệt thực tế **đã kiểm chứng trên code hiện tại** (khoảng cách đã thu hẹp nhiều so với trước — cart, analytics, JaaS, check-in nay đều có ở cả hai):

| | Bản này (mobile) | `ProInterview/backend` (web) |
|:--|:--|:--|
| `/api/cart` + model `Cart` | ✅ | ✅ (nay đã mount, kèm UI `CartDrawer`) |
| `/api/analytics` + model `UserEvent` | ✅ | ✅ |
| JaaS video meeting (`jaasService.js`) | ✅ (dùng trong `bookingsService.js`) | ✅ |
| Booking check-in (`mentorCheckIn*`) | ✅ (`PATCH /api/bookings/mentor/:id/check-in`) | ✅ |
| `/api/interviews`, `/api/ai`, model `InterviewSession` | ✅ **còn giữ** | ❌ đã gỡ (commit `3c5a43d`) |
| Vòng đời tài khoản admin (`accountClosureService`, `mentorSuspensionRefundService`, `Mentor.status` enum active/suspended/closed) | ❌ | ✅ |
| Audit log admin (`adminAuditLog`, `GET /api/admin/audit-log`) | ❌ | ✅ |
| Hoá đơn PDF (`invoiceService`, `GET /api/payments/:id/invoice`) | ❌ | ✅ |
| Controller `adminAccountController`, `adminAuditController` | ❌ | ✅ |
| Util `planPricing.js` (quy đổi ngày còn lại khi đổi hạng), `userPresence.js` | ❌ | ✅ |
| Background jobs | 1 (`bookingReminderJob`) | 5 (thêm stale sweep, streak, plan expiry, earnings clearance) |
| npm script `verify:jaas` / `encode:jaas-key` | ❌ (file script **có** trong `src/scripts/`, chưa khai báo trong `package.json`) | ✅ |
| Số Mongoose schema | 21 (có `InterviewSession` + `UserEvent`) | 20 |

**Bản này còn giữ nhưng bản web đã bỏ:** phỏng vấn AI + avatar D-ID. Nếu cần port ngược từ web sang đây (vòng đời tài khoản, hoá đơn, audit log, các job tài chính), tham chiếu `../ProInterview/CLAUDE.md`.

---

## Lệnh phát triển

### Backend (`backend/`)

```bash
npm run dev                    # nodemon → src/server.js (port 5001 theo .env)
npm start                      # node src/server.js (production)
npm run seed:users             # Seed users dev (chỉ khi collection rỗng)
npm run seed:all               # Seed toàn bộ dữ liệu mock
npm run seed:ui-mock           # Seed mock cho UI
npm run seed:reviews / seed:reports / seed:mentor-samples / seed:course-samples
npm run seed:mentor-bios / seed:commission / seed:endpoint
npm run db:prune-fake-mentors  # Xóa Mentor docs không có User tương ứng
npm run sync:mentor-profiles   # Đồng bộ Mentor profiles với Users
npm run db:normalize-transfer-refs / db:migrate-cv-analysis[:dry]
npm test                       # test:node + test:dto + test:python-cv
npm run test:node / test:payments / test:python-cv / test:dto
```

Script `verify:jaas`, `encode:jaas-key`, `seed:mentor-courses-ui`, `seed:meeting-flow`, `seed:suspend-demo`, `seed:lock-test` **không có** trong `package.json` của backend này. Hai file `verifyJaas.js` / `encodeJaasPrivateKey.js` có sẵn trong `src/scripts/` — chạy trực tiếp bằng `node src/scripts/verifyJaas.js`.

**Node:** `>=20`.

### Mobile (`mobile/`)

```bash
npm install
npm start              # kill port 8081 (prestart) → expo start --lan --port 8081
npm run start:clean    # như trên nhưng clear cache (-c)
npm run android        # expo run:android
npm run ios            # expo run:ios
npm run web            # expo start --web

# EAS Build / OTA update
npm run eas:login && npm run eas:init   # lần đầu
npm run version:bump                    # tăng versionCode Android (patch)
npm run build:apk        / build:apk:bump    # profile preview  → APK
npm run build:aab        / build:aab:bump    # profile production → AAB (Play Store)
npm run update:preview   / update:production # OTA update (chỉ đổi JS/UI)
```

Không có bundler config để chạy "cả stack cùng lúc" như `dev:full` bên web — chạy `backend` và `mobile` ở 2 terminal riêng.

### CV/JD Matcher (`cv_jd_matching/`)

```bash
cd cv_jd_matching
python -m pip install -r requirements.txt
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

### Tài khoản dev (sau `seed:users`)

Mật khẩu mặc định tất cả: **`Dev123456`**

| Email | Role / Plan |
|:------|:-----------|
| `customer@dev.local` | customer, plan: free |
| `mentor@dev.local` | mentor |
| `admin@dev.local` | admin — **app mobile chặn đăng nhập admin** (`mobileAuth.js` từ chối `user.role === 'admin'`); chỉ dùng trên web |

---

## Cấu hình môi trường

### Backend `backend/.env`

Không có `.env.example` trong thư mục này (khác bản web) — tham khảo biến từ `ProInterview/backend/.env.example`:

```env
NODE_ENV=development
PORT=5001
MONGO_URI=mongodb://127.0.0.1:27017/prointerview
JWT_SECRET=<chuỗi dài ngẫu nhiên ≥32 ký tự>
JWT_EXPIRES_IN=7d
CORS_ORIGIN=<origin app mobile / dev tool>
GOOGLE_CLIENT_ID=<từ GCP>
CV_ANALYZER_URL=http://localhost:8000
LLM_API_KEY=<your-key>            # interviewQuestionService / cvMatch
LLM_BASE_URL=https://api.groq.com/openai/v1
LLM_MODEL=llama-3.3-70b-versatile
# JaaS — backend này CÓ jaasService.js, set nếu muốn phòng họp thật thay vì fallback meet.jit.si
# JAAS_APP_ID= / JAAS_API_KEY_ID= / JAAS_PRIVATE_KEY[_BASE64|_PATH]= / JAAS_DOMAIN=8x8.vc
```

### Mobile `mobile/.env` (xem `mobile/.env.example`)

```env
# DEV (Expo Go / local backend)
EXPO_PUBLIC_API_URL=http://localhost:5001
EXPO_PUBLIC_DEV_API_HOST=<IP LAN máy chạy backend>   # override khi Expo không lấy được IP
# PRODUCTION (set trên expo.dev hoặc eas.json env) — không set DEV_API_HOST
# EXPO_PUBLIC_API_URL=https://prointerview-backend.onrender.com

EXPO_PUBLIC_GOOGLE_CLIENT_ID=<khớp VITE_GOOGLE_CLIENT_ID web + GOOGLE_CLIENT_ID backend>
# EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID= / EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=   (cần khi build APK/AAB)

EXPO_PUBLIC_BANK_TRANSFER_NAME=TPBank
EXPO_PUBLIC_BANK_TRANSFER_ACCOUNT=
EXPO_PUBLIC_BANK_TRANSFER_OWNER=
EXPO_PUBLIC_VIETQR_BANK_ID=TPB
```

### Resolve API base

`mobile/src/config/apiConfig.js`:
- **Prod:** `PROINTERVIEW_PROD_API_URL = 'https://prointerview-backend.onrender.com'` (override bằng `EXPO_PUBLIC_API_URL`)
- **Dev:** gom danh sách IP LAN ứng viên theo thứ tự ưu tiên — `EXPO_PUBLIC_DEV_API_HOST` → IP Metro/Expo đang chạy (`debuggerHost`, `hostUri`, `linkingUri`, `NativeModules.SourceCode.scriptURL`) — rồi thử lần lượt cổng `5001`, `5000` (`DEV_API_PORTS`). Loopback và IPv6 link-local bị loại vì điện thoại không gọi được.

`mobile/src/utils/api.js` → `ensureApiBase()` probe từng candidate bằng `GET /api/health`, cache kết quả.

---

## Kiến trúc Backend (`backend/src/`)

### Entry points

- **`server.js`** — load env, kết nối MongoDB, gọi `createApp()`, listen `PORT`, start `bookingReminderJob`.
- **`app.js`** — `createApp()`: middleware, `GET /api/health`, mount tất cả routers `/api/*`.

### Pattern chuẩn

```
Route → Controller → Service → Mongoose Model
```

### Routers mounted trong `app.js`

| Prefix | File (`routes/`) | Ghi chú |
|:-------|:-----------------|:--------|
| `/api/auth` | `auth.js` | |
| `/api/mentors` | `mentors.js` | |
| `/api/bookings` | `bookings.js` | gồm check-in mentor, start meeting, no-show, refund destination, rebook credit |
| `/api/plans` | `plans.js` | |
| `/api/payments` | `payments.js` | **không có** `GET /:id/invoice` (chỉ bản web có) |
| `/api/users` | `users.js` | |
| `/api/courses` | `courses.js` | |
| `/api/reviews` | `reviews.js` | |
| `/api/reports` | `reports.js` | |
| `/api/mentor` | `mentor.js` | Dashboard/finance/analytics **cá nhân** mentor |
| `/api/notifications` | `notifications.js` | |
| `/api/admin` | `admin.js` | **không có** audit-log / account impact-close |
| `/api/enrollments` | `enrollments.js` | |
| `/api/cart` | `cart.js` | get/add/checkout/update/remove/clear, model `Cart` |
| `/api/analytics` | `analytics.js` | `POST /events` (auth + `analyticsEventsLimiter`) → `UserEvent` |
| `/api/cv` | `cv.js` + `cvMatch.js` | cv.js: CRUD/quota; cvMatch.js: proxy sang Python |
| `/api/interviews` | `interviews.js` | Vòng đời phiên phỏng vấn AI — **chỉ có ở bản này** |
| `/api/upload` | `upload.js` | gồm upload ảnh check-in phòng họp |
| `/api/mock` | `mockCourses.js` | Mock data cho dev/test |
| `/api/ai` | `aiProviders.js` | STT/TTS/emotion/D-ID avatar/pregenerate — **chỉ có ở bản này** |

### Services (`services/`)

`accessTokenBlacklist`, `analyticsService`, `authService`, `avatarService`, `bookingsService` (**có** import `buildJaasMeetingLaunch` từ `jaasService`), `cacheService`, `competencyFramework`, `courseMentorInsightsService`, `courseStatsService`, `dashboardStatsService`, `emailService`, `emotionService`, `interviewQuestionService`, `jaasService`, `langfuseService`, `mentorCommissionService`, `mentorDashboardService`, `mentorEarningsService`, `mentorMeService`, `mentorProfileService`, `mentorsService`, `normalizeTransferRefsService`, `notificationDeliveryService`, `paymentsService`, `plansService`, `reportsService`, `reviewsService`, `sepayWebhookService`, `sttService`, `transferPaymentExpiryService`, `ttsService`, `userRoleService`, `videoPregenService`

**Không có:** `accountClosureService`, `mentorSuspensionRefundService`, `invoiceService` (chỉ bản web).

### Models (`models/`) — 21 Mongoose schemas

`User`, `Mentor`, `Booking`, `Payment`, `Course`, `Enrollment`, `Review`, `Notification`, `CVAnalysis`, `Report`, `Subscription`, `Activity`, `CourseQA`, `MentorPeerReview`, `PayoutRequest`, `Cart`, `InterviewSession`, `MentorKnowledge`, `SecurityLog`, `SepayWebhookEvent`, `UserEvent` (+ `index.js`)

`Mentor` ở bản này **không có** field `status` enum `active/suspended/closed` — chỉ có `isActive` và `application.status`.

### Script riêng của backend này

- `backfillMediaUrls.js` — vá `thumbnail` rỗng của `Course` (ảnh Unsplash mặc định) và `avatar` rỗng của `Mentor` (lấy từ `User.avatar` qua `userId`, hoặc sinh từ `ui-avatars.com`)
- `fixBrokenThumbnails.js`, `checkCourses.js`, `checkUser.js` — kiểm tra/vá dữ liệu one-off
- `resetDevPasswords.js`, `forceSeedDev.js` — reset/ép seed tài khoản dev
- `auditPastBookings.js`, `runAudit.js` — audit booking cũ / phí hoa hồng
- `verifyJaas.js`, `encodeJaasPrivateKey.js` — hỗ trợ JaaS (chưa có npm script tương ứng)
- `seedExtraData.js` — seed dữ liệu bổ sung

### Middleware

- `authJwt` — verify Bearer JWT, set `req.user` / `req.userId`
- `requireMentor` — `role === "mentor"`
- `requireAdmin` — `role === "admin"`
- `rateLimiters.js` — `apiLimiter`, login/register, `analyticsEventsLimiter`, …

**Không có** `adminAuditLog.js` (chỉ bản web).

### Response shape

```js
// Thành công
{ success: true, user: {...} }      // key: user, mentors, bookings, ...
// Lỗi
{ success: false, error: "message" }
```

### Auth & tokens

- **Access JWT:** claim `tv` phải khớp `User.tokenVersion`. Hết hạn (mặc định 15m, hoặc `JWT_EXPIRES_IN`).
- **Refresh token:** dạng `sessionObjectId:secret` (opaque), lưu hash trong `User.authSessions`.
- Logout → `tokenVersion++`, xóa toàn bộ refresh sessions.
- Mobile tự động gọi `POST /api/auth/refresh` khi gặp 401 và retry request (`mobile/src/utils/mobileAuth.js`).
- Đăng ký / đăng nhập Google lần đầu → backend gửi **email mật khẩu ban đầu** (`sendInitialPasswordEmail`) để user đăng nhập được bằng email/password sau này.
- **Welcome notification** — `notificationDeliveryService` tạo idempotent (dedupe qua `metadata.kind = "welcome"`), gọi từ `authService` ở register / login / google.

---

## Kiến trúc Mobile (`mobile/`)

### Cấu trúc

```
mobile/
├── App.js              # ~10.300 dòng — điều hướng bằng state nội bộ, KHÔNG dùng React Navigation
├── app.json            # Expo config: slug prointerview-mobile, owner janetns198,
│                       #   runtimeVersion "1.0.0" (cố định, KHÔNG dùng appVersion policy),
│                       #   android.package com.prointerview.app, EAS projectId
├── eas.json            # 3 profile build: development / preview (APK) / production (AAB)
├── metro.config.js
├── android/            # native project đã eject (icon adaptive, manifest, gradle)
├── assets/             # gồm mascot-loading.mp4 (video loading AI)
└── scripts/
    ├── bump-android-version.js   # tăng versionCode/version (dùng bởi build:*:bump)
    └── kill-port.js              # giải phóng 8081 trước khi expo start
└── src/
    ├── components/     # "Màn hình" — xem bảng dưới
    ├── config/         # apiConfig.js, paymentConfig.js, googleAuth.ts
    ├── contexts/       # AuthContext.tsx
    ├── hooks/          # useGoogleBrowserAuth.ts
    ├── services/       # analyticsApi.js, authService.ts, cartApi.js, courseApi.js,
    │                   #   courseLearningApi.js, googleBrowserAuth.ts, paymentApi.js,
    │                   #   proInterviewApi.js, profileApi.js, roleApi.js, uploadApi.js
    ├── types/
    └── utils/          # api.js, authStorage.js, backendErrors.js, bookingSchedule.js,
                        #   courseDisplay.js, localCartStorage.js, mediaUrl.js,
                        #   mentorDisplay.js, mobileAuth.js, profileValidation.js
```

**Vì sao không có `screens/` + navigator chuẩn:** app được viết theo mô hình 1 file `App.js` quản lý state màn hình hiện tại, import trực tiếp các component "trang" từ `src/components/`. Khi thêm màn hình mới, thêm component vào `src/components/` rồi wire state chuyển màn trong `App.js` — không có route config tập trung.

### Các màn hình (`src/components/`)

| File | Vai trò |
|:-----|:--------|
| `MentorsScreen.js`, `MentorBookingScreen.js`, `MentorScheduleScreen.js` | Tìm mentor, đặt lịch, lịch của mentor |
| `MeetingRoomScreen.js` | **Phòng họp video** — nhúng JaaS/Jitsi qua `react-native-webview` (`buildMeetingHtml`), kèm check-in bằng ảnh (`expo-image-picker` → `uploadMeetingCheckinImage`) |
| `MentorExtraScreens.js` | `MentorAnalyticsScreen`, `MentorPeerReviewScreen`, `MentorSessionFeedbackScreen`, `InfoContentScreen` (trang tĩnh: pricing, terms…) |
| `RolePortal.js` | Cổng theo role — dashboard mentor |
| `CourseDetailScreen.js`, `CourseLearningScreen.js` | Chi tiết + học khóa học |
| `CvAnalysisHubScreen.js`, `CvJdUploadScreen.js` | Hub phân tích CV; màn upload CV + JD chuyên biệt |
| `AiLoadingState.js` | **State loading dùng chung** — video mascot (`assets/mascot-loading.mp4` qua `expo-av`) + message theo bước (`CV_LOADING_STEPS`) + progress bar tự nhích + tip xoay vòng (`CV_LOADING_TIPS`). Đối ứng của `shared/AiLoadingState.jsx` bên web |
| `CartScreen.js` | Giỏ hàng full-screen (thay `CartModal.js` đã xoá) |
| `CheckoutScreen.js`, `CheckoutModal.js`, `PaymentResultScreen.js` | Thanh toán + kết quả |
| `ProfileScreen.js` | Hồ sơ cá nhân |
| `GoogleSignInButton.tsx`, `GoogleAuthWebView.tsx` | Google Sign-In native + fallback WebView |

### Giỏ hàng (Cart)

- `cartApi.js`: fallback kép — nếu backend không có `/api/cart` (404) hoặc offline thì dùng `localCartStorage.js` (AsyncStorage); `detectServerCart()` cache trạng thái server có hỗ trợ cart hay không; `checkoutCart()` khi không có server cart sẽ enroll từng course qua `enrollCourse()` tuần tự.
- Backend này **đã mount** `/api/cart` nên đường server-cart được ưu tiên khi detect thành công. Fallback vẫn giữ để chạy được với backend cũ/offline.

### Media URL

`mobile/src/utils/mediaUrl.js` → `resolveMediaUrl()` chuẩn hoá URL `/uploads/...` theo API base hiện tại (`mediaBase()`), xử lý riêng cho avatar Google (`googleusercontent.com`). Đi kèm `backfillMediaUrls.js` phía backend để vá thumbnail/avatar thiếu.

### Thanh toán

`mobile/src/config/paymentConfig.js` đọc `EXPO_PUBLIC_BANK_TRANSFER_*`, tự suy `VietQR bankId` từ tên ngân hàng khi không set explicit (`inferVietQrBankId`), sinh URL ảnh QR qua `buildVietQrImageUrl` (`img.vietqr.io`). Khớp quy ước `VITE_BANK_TRANSFER_*` bên web.

### Gọi API & Auth

- `mobile/src/utils/mobileAuth.js` — `authFetch()` gắn `Authorization: Bearer <token>` từ `authStorage.js` (Expo SecureStore), tự refresh khi 401, **chặn đăng nhập tài khoản role `admin`**.
- `mobile/src/config/googleAuth.ts`, `hooks/useGoogleBrowserAuth.ts` — Google Sign-In native (`@react-native-google-signin/google-signin`) + fallback WebView (`GoogleAuthWebView.tsx`).
- `mobile/src/services/analyticsApi.js` — gửi sự kiện hành vi lên `POST /api/analytics/events`.
- Upload dùng **File/Blob thật** trên web target (fix ở commit `c04b355`), không dựa vào shim của RN.

---

## Tích hợp bên ngoài

### Express → Python CV/JD Matcher

- Giống bản web: `cvMatch.js` proxy sang `CV_ANALYZER_URL` (FastAPI port 8000)

### JaaS (8x8.vc) — Phòng họp mentor/booking

- `backend/src/services/jaasService.js` ký JWT RS256; `bookingsService.js` gọi `buildJaasMeetingLaunch()` trả object `meeting` cho client. Fallback `{ provider: "jitsi_public" }` khi chưa cấu hình.
- Mobile render phòng họp trong WebView (`MeetingRoomScreen.js`), mentor check-in bằng ảnh trước khi vào.

### AI Providers & Interview session (`/api/ai/*`, `/api/interviews/*`)

- **Chỉ còn ở bản này** (bản web đã gỡ): STT/TTS/emotion/D-ID avatar/pregenerate qua `aiProviders.js`; vòng đời phiên phỏng vấn qua `interviews.js` + model `InterviewSession`.

### Analytics (`/api/analytics/*`)

- `POST /events` ghi `page_view`/`action` vào `UserEvent`. Mobile gửi qua `services/analyticsApi.js`. Phần đọc lại cho admin (`/api/admin/analytics/*`) nằm ở bản web.

### Google Identity Services

- Backend: `POST /api/auth/google` verify qua `google-auth-library` (giống bản web)
- Mobile: native Google Sign-In SDK + fallback WebView, không dùng FedCM như frontend web

---

## Khái niệm domain chính

### Plans & Quota

| Plan | Giá/tháng | CV Analysis | Mentor Sessions |
|:-----|:----------|:------------|:----------------|
| `free` | 0đ | 2 | 0 |
| `student` | 150,000đ | 999 (không giới hạn) | 1 |
| `professional` | 500,000đ | 999 (không giới hạn) | 4 |
| `premium` | 2,000,000đ | 999 (không giới hạn) | 999 |

Nguồn chân lý: quota ở `backend/src/services/plansService.js` (`activatePlan` / `cancelPlan`), giá ở `backend/src/controllers/adminController.js` (bảng plan catalog).

> **Khác bản web:** bản web đã bỏ gói `premium` (map về `professional`), đổi quota sang `free 3 / student 50 / professional 999`, và set `mentorSessionLimit = 0` cho mọi gói (buổi mentor luôn tự thanh toán, gói chỉ cho ưu đãi %). Backend này **vẫn cấp buổi mentor theo quota**. Đừng copy logic gói giữa hai bên mà không đối chiếu.

Fields trên `User`: `plan`, `planExpiresAt`, `quota` (cvAnalysisUsed/Limit, mentorSessionUsed/Limit).

### Mentor

- User có `role=mentor` phải có document **`Mentor`** (`userId`).
- Public URL dùng `publicId` (không dùng `_id`).
- Cấp role mentor: Admin dùng `PATCH /api/users/:id/role`.
- **Không có** `Mentor.status` (active/suspended/closed) như bản web — chỉ `isActive`.

### Bookings

Fields quan trọng: `price`, `platformFee`, `vat`, `totalAmount`, `paymentStatus`, `status`, `rescheduleHistory`, `meetingLink`, `mentorCheckInImageUrl/At/UserId`.

Lifecycle status: `pending` → `confirmed` → `completed` / `cancelled` / `no_show`.

Hủy booking: `DELETE /api/bookings/:id`.

Route mentor đáng chú ý: `PATCH /mentor/:id/check-in`, `PATCH /mentor/:id/start`, `PATCH /mentor/:id/reschedule`, `PATCH /mentor/:id/cancel`, `POST /:id/report-customer-no-show`, `POST /:id/mentor-knowledge`.

### Cart

- Model `Cart { userId (unique, ref User), items: [{ itemType, itemId (refPath itemType), ... }] }`
- Route `/api/cart`: `GET /`, `POST /add`, `POST /checkout`, `PUT /:itemId`, `DELETE /remove/:itemId`, `DELETE /clear` — tất cả yêu cầu `authJwt`.

### Payments

- Chuyển khoản ngân hàng là kênh chính (+ webhook SePay), MoMo/ZaloPay/VNPay sandbox/stub — giống bản web.
- **Không có** hoá đơn PDF (`invoiceService`) — chỉ bản web.

---

## Trạng thái dự án hiện tại

### Backend

Đầy đủ các domain cốt lõi: auth, mentor, booking (+ check-in, no-show), course, enrollment, payment, review, report, cv, upload, cart, analytics, JaaS, và phỏng vấn AI.

**Thiếu so với bản web:** vòng đời tài khoản admin (khóa/tạm ngưng/đóng + hoàn tiền học viên), audit log admin, hoá đơn PDF, 4/5 background job tài chính. Nếu task yêu cầu một trong số này trên mobile, cần port từ `ProInterview/backend` sang.

### Mobile

| Tính năng | Trạng thái |
|:----------|:-----------|
| Auth (login/register/Google native + WebView) | ✅ — chặn tài khoản admin |
| Mentors list + booking | ✅ (`MentorsScreen`, `MentorBookingScreen`, `MentorScheduleScreen`) |
| Cổng mentor (dashboard, analytics, peer review, session feedback) | ✅ (`RolePortal`, `MentorExtraScreens`) |
| Phòng họp video + check-in | ✅ (`MeetingRoomScreen` — WebView JaaS/Jitsi) |
| Courses (detail + learning) | ✅ (`CourseDetailScreen`, `CourseLearningScreen`) |
| CV Analysis (hub + upload CV/JD + loading mascot) | ✅ (`CvAnalysisHubScreen`, `CvJdUploadScreen`, `AiLoadingState`) |
| Giỏ hàng | ✅ full-screen + fallback local storage |
| Thanh toán (CK + VietQR) | ✅ (`CheckoutScreen`, `CheckoutModal`, `PaymentResultScreen`) |
| Hồ sơ | ✅ (`ProfileScreen`) |
| Analytics events | ✅ (`analyticsApi.js` → `/api/analytics/events`) |
| EAS Build + OTA update | ✅ (`eas.json`, 3 profile, `expo-updates`, runtimeVersion cố định) |

---

## Deployment

### Backend (Render)

Tương tự bản web (`render.yaml`), nhưng deploy như một service riêng biệt — kiểm tra `MONGO_URI` trỏ đúng database (có thể chung hoặc khác DB với bản web tuỳ hạ tầng thực tế).

### Mobile (Expo / EAS)

- **Đã cấu hình EAS** — `eas.json` với 3 profile:

  | Profile | Channel | Output | Env |
  |:--------|:--------|:-------|:----|
  | `development` | development | APK, dev client, internal | — |
  | `preview` | preview | APK, internal | `EXPO_PUBLIC_API_URL=https://prointerview-backend.onrender.com` |
  | `production` | production | AAB (`autoIncrement`) | như trên |

  `submit.production.android.track = internal`. Node pin `22.15.0`, `cli.appVersionSource = "remote"`.

- **`runtimeVersion` cố định `"1.0.0"`** trong `app.json` — cố ý **không** dùng policy `appVersion` (commit `3b1e687`), để OTA update không bị lệch runtime khi bump version. Đổi giá trị này = cắt OTA cho toàn bộ build cũ.
- OTA chỉ áp dụng cho thay đổi **JS/UI**. Đổi native (dependency có native code, permission, icon adaptive, gradle) phải build lại APK/AAB.
- EAS project: `owner = janetns198`, `slug = prointerview-mobile`, `projectId = 73e4279d-…`.
- URL API prod nằm ở `apiConfig.js` (`PROINTERVIEW_PROD_API_URL`) và `eas.json` env — đổi backend host phải sửa **cả hai**.

### Python CV Service

Giống bản web — `Procfile` + `runtime.txt`.

---

## Quy tắc phát triển

### Khi thêm API mới

1. Tạo route → controller (→ service nếu có business logic phức tạp) → model
2. Mount router trong `backend/src/app.js`
3. Nếu tính năng cũng cần cho bản web, cân nhắc port sang `ProInterview/backend` (và ngược lại) — hai backend không tự đồng bộ

### Khi nối Mobile với API

1. Thêm/sửa function trong `mobile/src/services/*Api.js` tương ứng
2. Dùng `authFetch()` từ `mobile/src/utils/mobileAuth.js` cho route cần auth
3. Dùng `resolveMediaUrl()` từ `mobile/src/utils/mediaUrl.js` khi hiển thị ảnh/media từ `/uploads/...`
4. Màn hình mới: thêm component vào `src/components/` rồi wire state chuyển màn trong `App.js`
5. Loading cho tác vụ AI/CV: dùng `AiLoadingState` thay vì tự vẽ spinner

### Conventions

- Response: `{ success: true, <key>: data }` / `{ success: false, error: "msg" }`
- Auth middleware: `authJwt` (Bearer JWT), `requireMentor`, `requireAdmin`
- Mentor public URL: dùng `publicId`, không dùng `_id` trực tiếp
- Booking cancel: `DELETE /api/bookings/:id`

### Tech stack tham chiếu nhanh

| | |
|:-|:-|
| Mobile | Expo 54, React 19, React Native 0.81, expo-av, expo-updates, expo-secure-store, expo-document-picker, expo-image-picker, react-native-webview, @react-native-google-signin |
| Build | EAS Build (APK/AAB) + EAS Update (OTA), scripts `bump-android-version.js` / `kill-port.js` |
| Backend | Express 5 (ESM), Node 20+, Mongoose 9, JWT, bcrypt, multer, google-auth-library, nodemailer |
| DB | MongoDB — 21 schemas (có `InterviewSession` + `UserEvent`) |
| CV Analysis | Python FastAPI, pdf parsing, NLP skill extraction |
| Payments | Chuyển khoản + VietQR + webhook SePay; MoMo/ZaloPay/VNPay sandbox |
| Video meeting | JaaS (8x8.vc) trong WebView, fallback Jitsi public |
| External | Google Sign-In (native + WebView), D-ID API qua `/api/ai` |

---

## Tài liệu liên quan

| File | Nội dung |
|:-----|:---------|
| [README.md](./README.md) | Tổng quan sản phẩm mobile, hướng dẫn chạy dev |
| `ROADMAP.md` / `API_INDEX.md` | **Lưu ý:** viết cho bản web gốc, chưa cập nhật cho fork này — tham khảo contract chung, không phải nguồn chân lý |
| [POSTMAN_TESTING.md](./POSTMAN_TESTING.md) | Hướng dẫn test API với Postman |
| `../ProInterview/CLAUDE.md` | Tài liệu bản web — đối chiếu khi cần port tính năng qua lại |
| `../README.md` | Tổng quan hai sản phẩm + bảng khác biệt giữa hai backend |
