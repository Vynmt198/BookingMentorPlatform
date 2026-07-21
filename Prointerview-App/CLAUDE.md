# CLAUDE.md

Tài liệu hướng dẫn cho Claude Code khi làm việc trong repo này. Viết bằng tiếng Anh để tương thích tối đa, tài liệu sản phẩm (README, ROADMAP, API_INDEX) bằng **tiếng Việt**.

---

## Tổng quan dự án

**Prointerview-App** — bản **mobile** của ProInterview (SaaS luyện phỏng vấn xin việc), kiến trúc:

| Thư mục | Stack | Ghi chú |
|:--------|:------|:--------|
| `mobile/` | Expo 54 + React Native 0.81 + React 19 | Không dùng React Navigation |
| `backend/` | Express 5 + MongoDB (Mongoose 9) + JWT | **Fork riêng**, KHÔNG dùng chung code với `../ProInterview/backend` |
| `cv_jd_matching/` | Python FastAPI + Uvicorn | Giống bản web |

**⚠️ Quan trọng:** `backend/` ở đây là một codebase **độc lập, đã phân kỳ** khỏi `ProInterview/backend` (được tách ra rồi phát triển song song, không sync tự động). Trước khi sửa bug hay thêm tính năng backend, LUÔN xác nhận đang sửa đúng cây thư mục — sửa ở đây không tự áp dụng cho bản web và ngược lại. Khác biệt chính đã xác nhận:

| Có ở `Prointerview-App/backend` | Chỉ có ở `ProInterview/backend` (KHÔNG có ở đây) |
|:---------------------------------|:---------------------------------------------------|
| `/api/cart` — đã mount đầy đủ (`routes/cart.js`) | `/api/analytics` + model `UserEvent` (admin user-journey tracking) |
| | `jaasService.js` — JaaS (8x8.vc) video meeting cho booking |
| | Booking check-in (`AdminBookingCheckIns`, field check-in trên Booking) |
| | Script `verify:jaas`, `encode:jaas-key`, `seed:mentor-courses-ui` |

Không có `frontend/` trong repo này — thay vào đó là `mobile/`.

---

## Lệnh phát triển

### Backend (`backend/`)

```bash
npm run dev                    # nodemon → src/server.js (port 5000)
npm start                      # node src/server.js (production)
npm run seed:users             # Seed users dev (chỉ khi collection rỗng)
npm run seed:all               # Seed toàn bộ dữ liệu mock
npm run seed:ui-mock           # Seed mock cho UI
npm run seed:reviews / seed:reports / seed:mentor-samples / seed:course-samples / seed:mentor-bios / seed:commission
npm run db:prune-fake-mentors  # Xóa Mentor docs không có User tương ứng
npm run sync:mentor-profiles   # Đồng bộ Mentor profiles với Users
npm run db:normalize-transfer-refs / db:migrate-cv-analysis[:dry]
npm test                       # Toàn bộ test (Node test runner + Jest)
npm run test:node / test:payments / test:python-cv / test:dto
```

Script riêng của bản web (`verify:jaas`, `encode:jaas-key`, `seed:mentor-courses-ui`) **không tồn tại** trong `package.json` của backend này.

**Node:** `>=20`.

### Mobile (`mobile/`)

```bash
npm install
npm start        # Expo dev server — quét QR bằng Expo Go
npm run android  # Build/chạy Android
npm run ios      # Build/chạy iOS
npm run web      # Chạy qua react-native-web
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
| `admin@dev.local` | admin |

---

## Cấu hình môi trường

### Backend `backend/.env`

Không có `.env.example` trong thư mục này (khác bản web) — tham khảo biến cần thiết từ `ProInterview/backend/.env.example` (các biến JaaS/`LLM_*` có thể không cần thiết nếu tính năng tương ứng không tồn tại ở backend này):

```env
MONGO_URI=mongodb://127.0.0.1:27017/prointerview
JWT_SECRET=<chuỗi dài ngẫu nhiên>
CORS_ORIGIN=<origin app mobile / dev tool>
JWT_EXPIRES_IN=7d
GOOGLE_CLIENT_ID=<từ GCP>
CV_ANALYZER_URL=https://your-cv-analyzer.example.com
LLM_API_KEY=<your-key>            # dùng bởi interviewQuestionService nếu có sinh câu hỏi AI
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o-mini
```

### Mobile — cấu hình API base

File `mobile/src/config/apiConfig.js`:
- **Prod:** `PROINTERVIEW_PROD_API_URL = 'https://prointerview-backend.onrender.com'`
- **Dev:** tự dò IP LAN qua Expo debugger host, thử lần lượt cổng `5001`, `5000` (`DEV_API_PORTS`)

`mobile/src/utils/api.js` → `ensureApiBase()` probe từng candidate bằng `GET /api/health`, cache kết quả.

---

## Kiến trúc Backend (`backend/src/`)

### Entry points

- **`server.js`** — load env, kết nối MongoDB, gọi `createApp()`, listen `PORT` (default 5000).
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
| `/api/bookings` | `bookings.js` | không có check-in (khác bản web) |
| `/api/plans` | `plans.js` | |
| `/api/payments` | `payments.js` | |
| `/api/users` | `users.js` | |
| `/api/courses` | `courses.js` | |
| `/api/reviews` | `reviews.js` | |
| `/api/reports` | `reports.js` | |
| `/api/mentor` | `mentor.js` | Dashboard/finance/analytics **cá nhân** mentor (khác "admin analytics" của bản web) |
| `/api/notifications` | `notifications.js` | |
| `/api/admin` | `admin.js` | |
| `/api/enrollments` | `enrollments.js` | |
| `/api/cart` | `cart.js` | **Đã mount** (khác bản web — bên đó có file nhưng chưa mount) — get/add/checkout/update/remove/clear, model `Cart` |
| `/api/cv` | `cv.js` + `cvMatch.js` | cv.js: CRUD/quota; cvMatch.js: proxy sang Python |
| `/api/interviews` | `interviews.js` | Session lifecycle phỏng vấn AI (giống bản web) |
| `/api/upload` | `upload.js` | |
| `/api/mock` | `mockCourses.js` | Mock data cho dev/test |
| `/api/ai` | `aiProviders.js` | STT/TTS/emotion/D-ID avatar/pregenerate (giống bản web) |

**Không có** `/api/analytics` — model `UserEvent` và admin user-journey tracking không tồn tại trong backend này.

### Services (`services/`)

`authService`, `bookingsService` (KHÔNG import `jaasService` — không có tích hợp JaaS), `dashboardStatsService`, `mentorDashboardService`, `mentorMeService`, `mentorProfileService`, `mentorsService`, `paymentsService`, `plansService`, `reportsService`, `reviewsService`, `userRoleService`, `interviewQuestionService`, `emotionService`, `sttService`, `ttsService`, `avatarService`, `videoPregenService`, `competencyFramework`, `courseMentorInsightsService`, `courseStatsService`, `mentorCommissionService`, `mentorEarningsService`, `sepayWebhookService`, `normalizeTransferRefsService`, `transferPaymentExpiryService`, `notificationDeliveryService`, `emailService`, `cacheService`, `accessTokenBlacklist`, `langfuseService`

**Không có** `analyticsService.js`, `jaasService.js`.

### Models (`models/`) — 21 Mongoose schemas

`User`, `Mentor`, `Booking`, `Payment`, `Course`, `Enrollment`, `Review`, `Notification`, `CVAnalysis`, `Report`, `Subscription`, `Activity`, `CourseQA`, `MentorPeerReview`, `PayoutRequest`, `Cart` (đã dùng — route mounted), `InterviewSession`, `MentorKnowledge`, `SecurityLog`, `SepayWebhookEvent`, `index.js`

**Không có** `UserEvent.js`.

### Script riêng của backend này

- `backend/src/scripts/backfillMediaUrls.js` — vá `thumbnail` rỗng của `Course` (dùng ảnh Unsplash mặc định) và `avatar` rỗng của `Mentor` (lấy từ `User.avatar` liên kết qua `userId`, hoặc sinh từ `ui-avatars.com` theo tên) — chạy one-off sau khi phát hiện media URL bị thiếu ở mobile.
- `backend/src/scripts/resetDevPasswords.js` — reset mật khẩu tài khoản dev.

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
- **Refresh token:** dạng `sessionObjectId:secret` (opaque), lưu hash trong `User.authSessions`.
- Logout → `tokenVersion++`, xóa toàn bộ refresh sessions.
- Mobile tự động gọi `POST /api/auth/refresh` khi gặp 401 và retry request (`mobile/src/utils/mobileAuth.js`).

---

## Kiến trúc Mobile (`mobile/`)

### Cấu trúc

```
mobile/
├── App.js              # ~8800 dòng — điều hướng bằng state nội bộ, KHÔNG dùng React Navigation
└── src/
    ├── components/     # "Màn hình": CartScreen, CheckoutScreen, CheckoutModal, PaymentResultScreen,
    │                   #   CourseLearningScreen, CourseDetailScreen, ProfileScreen, CvAnalysisHubScreen,
    │                   #   MentorsScreen, MentorBookingScreen, MentorScheduleScreen, RolePortal,
    │                   #   GoogleSignInButton, GoogleAuthWebView
    ├── config/         # apiConfig.js, paymentConfig.js, googleAuth.ts
    ├── contexts/        # AuthContext.tsx
    ├── hooks/           # useGoogleBrowserAuth.ts
    ├── services/        # cartApi.js, courseApi.js, courseLearningApi.js, paymentApi.js, profileApi.js,
    │                   #   proInterviewApi.js, roleApi.js, uploadApi.js, authService.ts, googleBrowserAuth.ts
    ├── types/
    └── utils/           # api.js, authStorage.js, backendErrors.js, bookingSchedule.js, courseDisplay.js,
                        #   localCartStorage.js, mediaUrl.js, mentorDisplay.js, mobileAuth.js, profileValidation.js
```

**Vì sao không có `screens/` + navigator chuẩn:** app được viết theo mô hình 1 file `App.js` quản lý state màn hình hiện tại, import trực tiếp các component "trang" từ `src/components/`. Khi thêm màn hình mới, thêm component vào `src/components/` rồi wire state chuyển màn trong `App.js` — không có route config tập trung.

### Giỏ hàng (Cart) — tính năng vừa cải tiến gần đây

- `CartScreen.js` (full-screen, thay thế `CartModal.js` cũ đã xoá): header "Giỏ hàng (n)", danh sách item, xóa từng item, tổng tiền, nút "Thanh toán"/"Tiếp tục mua sắm", empty state có CTA.
- `cartApi.js`: cơ chế fallback kép — nếu backend không có `/api/cart` (404) hoặc offline thì dùng `localCartStorage.js` (AsyncStorage); `detectServerCart()` cache trạng thái server có hỗ trợ cart hay không; `checkoutCart()` khi không có server cart sẽ enroll từng course qua `enrollCourse()` tuần tự.
- Vì backend này **đã mount** `/api/cart`, đường server-cart sẽ được ưu tiên khi phát hiện thành công.

### Media URL

`mobile/src/utils/mediaUrl.js` → `resolveMediaUrl()` chuẩn hoá URL `/uploads/...` theo API base hiện tại (`mediaBase()`), xử lý riêng cho avatar Google (`googleusercontent.com`). Vừa được sửa cùng lúc với `backfillMediaUrls.js` để khắc phục thumbnail/avatar thiếu.

### Gọi API & Auth

- `mobile/src/utils/mobileAuth.js` — `authFetch()` gắn `Authorization: Bearer <token>` từ `authStorage.js` (Expo SecureStore), tự refresh khi 401.
- `mobile/src/config/googleAuth.ts`, `hooks/useGoogleBrowserAuth.ts` — Google Sign-In native (`@react-native-google-signin/google-signin`) + fallback WebView (`GoogleAuthWebView.tsx`).

---

## Tích hợp bên ngoài

### Express → Python CV/JD Matcher

- Giống bản web: `cvMatch.js` proxy sang `CV_ANALYZER_URL` (FastAPI port 8000)

### AI Providers & Interview session (`/api/ai/*`, `/api/interviews/*`)

- Có mặt đầy đủ, giống bản web: STT/TTS/emotion/D-ID avatar/pregenerate qua `aiProviders.js`; vòng đời phiên phỏng vấn qua `interviews.js`

### Google Identity Services

- Backend: `POST /api/auth/google` verify qua `google-auth-library` (giống bản web)
- Mobile: native Google Sign-In SDK, không dùng Google Identity Services web (FedCM) như frontend web

### KHÔNG có ở backend này

- JaaS (8x8.vc video meeting) — không có `jaasService.js`, không có tích hợp nào trong `bookingsService.js`
- Analytics / admin user-journey tracking — không có route, controller, service, model liên quan
- Booking check-in

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

### Mentor

- User có `role=mentor` phải có document **`Mentor`** (`userId`).
- Public URL dùng `publicId` (không dùng `_id`).
- Cấp role mentor: Admin dùng `PATCH /api/users/:id/role`.

### Bookings

Fields quan trọng: `price`, `platformFee`, `vat`, `totalAmount`, `paymentStatus`, `status`, `rescheduleHistory`. **Không có field/route check-in** (khác bản web).

Lifecycle status: `pending` → `confirmed` → `completed` / `cancelled`.

Hủy booking: `DELETE /api/bookings/:id`.

### Cart

- Model `Cart { userId (unique, ref User), items: [{ itemType, itemId (refPath itemType), ... }] }`
- Route `/api/cart`: `GET /`, `POST /add`, `POST /checkout`, `PUT /:itemId`, `DELETE /remove/:itemId`, `DELETE /clear` — tất cả yêu cầu `authJwt`.

### Payments

- Chuyển khoản ngân hàng là kênh chính, MoMo/ZaloPay/VNPay sandbox/stub — giống bản web.

---

## Trạng thái dự án hiện tại

### Backend

Đầy đủ các domain cốt lõi (auth, mentor, booking, course, enrollment, payment, review, cv, upload, interview AI, cart). **Thiếu so với bản web:** analytics/user-journey, JaaS video meeting, booking check-in — nếu task yêu cầu 1 trong 3 tính năng này trên mobile, cần port từ `ProInterview/backend` sang, không có sẵn ở đây.

### Mobile

| Tính năng | Trạng thái |
|:----------|:-----------|
| Auth (login/register/Google) | ✅ |
| Mentors list + booking | ✅ (`MentorsScreen`, `MentorBookingScreen`, `MentorScheduleScreen`) |
| Courses (detail + learning) | ✅ (`CourseDetailScreen`, `CourseLearningScreen`) |
| CV Analysis | ✅ hub cơ bản (`CvAnalysisHubScreen`) |
| Giỏ hàng | ✅ vừa cải tiến — full-screen + fallback local storage |
| Thanh toán | ✅ (`CheckoutScreen`, `CheckoutModal`, `PaymentResultScreen`) |
| Hồ sơ | ✅ (`ProfileScreen`) |
| Meeting room video | 📋 không có màn hình meeting/JaaS riêng trên mobile hiện tại |

---

## Deployment

### Backend (Render)

Tương tự bản web (`render.yaml`), nhưng deploy như một service riêng biệt — kiểm tra `MONGO_URI` trỏ đúng database (có thể chung hoặc khác DB với bản web tuỳ cấu hình hạ tầng thực tế).

### Mobile (Expo)

Chưa có cấu hình EAS Build trong repo — build/publish qua Expo CLI thủ công (`npx expo ...`). URL API prod cứng trong `apiConfig.js` (`https://prointerview-backend.onrender.com`) — cập nhật file này nếu đổi backend host.

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

### Conventions

- Response: `{ success: true, <key>: data }` / `{ success: false, error: "msg" }`
- Auth middleware: `authJwt` (Bearer JWT), `requireMentor`, `requireAdmin`
- Mentor public URL: dùng `publicId`, không dùng `_id` trực tiếp
- Booking cancel: `DELETE /api/bookings/:id`

### Tech stack tham chiếu nhanh

| | |
|:-|:-|
| Mobile | Expo 54, React 19, React Native 0.81, expo-secure-store, expo-document-picker, react-native-webview |
| Backend | Express 5 (ESM), Node 20+, Mongoose 9, JWT, bcrypt, multer, google-auth-library |
| DB | MongoDB (21 schemas, không có `UserEvent`) |
| CV Analysis | Python FastAPI, pdf parsing, NLP skill extraction |
| Payments | MoMo, ZaloPay (sandbox), VNPay partial |
| External | Google Sign-In (native), D-ID API qua `/api/ai` |

---

## Tài liệu liên quan

| File | Nội dung |
|:-----|:---------|
| [README.md](./README.md) | Tổng quan sản phẩm mobile, hướng dẫn chạy dev |
| `ROADMAP.md` / `API_INDEX.md` | **Lưu ý:** viết cho bản web gốc, chưa cập nhật đầy đủ cho backend fork này — dùng để tham khảo contract chung, không phải nguồn chân lý cho các khác biệt nêu trên |
| `../ProInterview/CLAUDE.md` | Tài liệu tương ứng của bản web — đối chiếu khi cần port tính năng qua lại |
