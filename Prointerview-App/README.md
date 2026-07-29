# Prointerview-App

> Bản **mobile** (Expo/React Native) của nền tảng ProInterview, cùng một **backend Express riêng** (fork độc lập của `ProInterview/backend`, đã phân kỳ tính năng).

[![Expo](https://img.shields.io/badge/Expo-54-000020)](https://expo.dev/)
[![React Native](https://img.shields.io/badge/React_Native-0.81-61DAFB)](https://reactnative.dev/)
[![Express](https://img.shields.io/badge/Express-5-lightgrey)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose_9-green)](https://mongoosejs.com/)

---

## Quan hệ với `ProInterview/`

Thư mục này **không phải** bản build lại của web app — nó là một sản phẩm riêng, chia sẻ cùng domain nghiệp vụ (mentor, booking, course, CV) nhưng:

- `mobile/` là app Expo/React Native độc lập, không dùng chung code với `frontend/` của bản web.
- `backend/` ở đây là **bản fork riêng** của backend web, đã tách ra và phát triển song song — không đồng bộ tự động.

Khoảng cách giữa hai backend đã thu hẹp nhiều: giỏ hàng, analytics/`UserEvent`, JaaS video meeting và booking check-in nay **đều có ở cả hai bên**. Xem [../README.md](../README.md) để biết bảng khác biệt đầy đủ.

---

## Kiến trúc

```
Prointerview-App/
├── mobile/            # Expo 54 + React Native 0.81 + React 19 (không dùng React Navigation)
├── backend/           # Express 5 + MongoDB (Mongoose 9) + JWT — fork riêng, khác ProInterview/backend
└── cv_jd_matching/    # Python FastAPI + Uvicorn (dùng chung kiến trúc với bản web)
```

`mobile/` không tách theo `screens/` + navigator chuẩn — toàn bộ điều hướng nằm trong một file `mobile/App.js` (~10.300 dòng) quản lý bằng state nội bộ, các "màn hình" là component trong `mobile/src/components/`.

---

## Yêu cầu

| Công cụ | Phiên bản |
|:--------|:----------|
| Node.js | ≥ 20 (EAS build pin `22.15.0`) |
| npm | ≥ 10 |
| MongoDB | ≥ 6 (local hoặc Atlas) |
| Expo CLI / Expo Go | để chạy mobile trên thiết bị/emulator |
| EAS CLI | ≥ 13.2.0 (chỉ khi build APK/AAB hoặc OTA update) |
| Python | ≥ 3.10 (chỉ cho CV/JD service) |

---

## Cài đặt & Chạy Dev

### Backend

```bash
cd backend
# Không có .env.example ở đây — tham khảo ../ProInterview/backend/.env.example
# Tối thiểu: PORT=5001, MONGO_URI, JWT_SECRET, CORS_ORIGIN, GOOGLE_CLIENT_ID, CV_ANALYZER_URL
npm install
npm run dev             # nodemon → src/server.js
npm run seed:all        # seed dữ liệu dev (tuỳ chọn)
```

### Mobile

```bash
cd mobile
cp .env.example .env    # điền EXPO_PUBLIC_DEV_API_HOST = IP LAN máy chạy backend
npm install
npm start               # kill port 8081 rồi expo start --lan — quét QR bằng Expo Go
npm run start:clean     # như trên nhưng clear cache
npm run android         # / npm run ios / npm run web
```

Base URL API cấu hình tại `mobile/src/config/apiConfig.js`:
- **Prod:** mặc định `https://prointerview-backend.onrender.com` (override bằng `EXPO_PUBLIC_API_URL`).
- **Dev:** ưu tiên `EXPO_PUBLIC_DEV_API_HOST`, rồi tự dò IP LAN qua Expo/Metro debugger host; thử lần lượt cổng `5001`, `5000`. `ensureApiBase()` probe từng ứng viên bằng `GET /api/health` và cache kết quả.

Token lưu bằng `expo-secure-store`, tự refresh khi 401 (`mobile/src/utils/mobileAuth.js`).

### CV/JD Matcher (tuỳ chọn)

```bash
cd cv_jd_matching
pip install -r requirements.txt
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

### Tài khoản dev mặc định (sau seed)

Mật khẩu: **`Dev123456`**

| Email | Role |
|:------|:-----|
| `customer@dev.local` | Customer |
| `mentor@dev.local` | Mentor |

> Admin (`admin@dev.local`) chỉ dùng trên website ProInterview — app mobile **chặn đăng nhập admin** ở `mobileAuth.js`.

---

## Tính năng mobile hiện có

- Đăng nhập/đăng ký, Google Sign-In (native + WebView fallback); đăng nhập Google lần đầu được gửi email mật khẩu ban đầu
- Danh sách mentor, đặt lịch booking (`MentorsScreen`, `MentorBookingScreen`, `MentorScheduleScreen`)
- **Phòng họp video** (`MeetingRoomScreen`) — nhúng JaaS/Jitsi qua WebView, mentor check-in bằng ảnh trước khi vào
- **Cổng mentor** (`RolePortal`, `MentorExtraScreens`) — dashboard, analytics, peer review, session feedback
- Khoá học: xem chi tiết, học video (`CourseDetailScreen`, `CourseLearningScreen`)
- **CV/JD analysis** — hub (`CvAnalysisHubScreen`) + màn upload CV & JD (`CvJdUploadScreen`), dùng `AiLoadingState` (video mascot + message theo bước + progress bar + tip xoay vòng)
- **Giỏ hàng** (`CartScreen`) — full-screen, fallback lưu local (AsyncStorage) khi backend không có `/api/cart` hoặc offline
- Thanh toán chuyển khoản + QR VietQR, xem kết quả (`CheckoutScreen`, `CheckoutModal`, `PaymentResultScreen`)
- Hồ sơ cá nhân (`ProfileScreen`)
- Ghi nhận sự kiện hành vi lên `/api/analytics/events` (`services/analyticsApi.js`)

## Backend — khác biệt so với `ProInterview/backend`

| Chỉ có ở đây | Chưa có ở đây (chỉ bản web) |
|:-------------|:-----------------------------|
| `/api/interviews`, `/api/ai` + model `InterviewSession` (bản web đã gỡ) | Vòng đời tài khoản admin: khóa / tạm ngưng / đóng + hoàn tiền học viên (`accountClosureService`, `mentorSuspensionRefundService`, `Mentor.status`) |
| Service phỏng vấn AI: `interviewQuestionService`, `emotionService`, `avatarService`, `videoPregenService`, `competencyFramework` | Audit log admin (`adminAuditLog`, `GET /api/admin/audit-log`) |
| Quota gói vẫn cấp buổi mentor miễn phí (bản web đã bỏ, chỉ còn ưu đãi %) | Hoá đơn PDF (`invoiceService`, `GET /api/payments/:id/invoice`) |
| Script vá dữ liệu: `backfillMediaUrls.js`, `fixBrokenThumbnails.js`, `auditPastBookings.js` | 4/5 background job (stale sweep, streak, plan expiry, earnings clearance) — ở đây chỉ có `bookingReminderJob` |
| 21 Mongoose schema | Util `planPricing.js` (quy đổi ngày còn lại khi đổi hạng gói), `userPresence.js` |

Đã có ở **cả hai**: `/api/cart`, `/api/analytics` + `UserEvent`, `jaasService.js`, booking check-in.

---

## Tài liệu

| File | Nội dung |
|:-----|:---------|
| [CLAUDE.md](./CLAUDE.md) | Kiến trúc chi tiết backend + mobile, bảng khác biệt đầy đủ với bản web |
| [API_INDEX.md](./API_INDEX.md) | Contract endpoint (lưu ý: viết cho bản web, chưa cập nhật cho fork này) |
| [ROADMAP.md](./ROADMAP.md) | Lộ trình theo phase (idem — tham khảo, không phải nguồn chân lý) |
| [POSTMAN_TESTING.md](./POSTMAN_TESTING.md) | Hướng dẫn test API với Postman |

---

## Deployment

| Service | Platform | Ghi chú |
|:--------|:---------|:--------|
| Backend | Render | `render.yaml` có sẵn — deploy như service riêng, kiểm tra `MONGO_URI` trỏ đúng DB |
| Mobile | Expo EAS Build + EAS Update | `eas.json` — 3 profile: `development`/`preview` (APK) và `production` (AAB) |
| CV Service | Heroku / Render | `Procfile` + `runtime.txt` có sẵn |

### Build & OTA (chạy trong `mobile/`)

```bash
npm run eas:login && npm run eas:init    # lần đầu
npm run build:apk:bump                   # APK preview (tự bump versionCode)
npm run build:aab:bump                   # AAB production (Play Store)
npm run update:preview -- --message "Fix login"    # OTA update
npm run update:production
```

**Lưu ý quan trọng:**
- `runtimeVersion` trong `app.json` được **cố định `"1.0.0"`**, cố ý không dùng policy `appVersion` — đổi giá trị này sẽ cắt OTA cho toàn bộ build đã phát hành.
- OTA chỉ áp dụng thay đổi **JS/UI**. Đổi native (dependency có native code, permission, icon adaptive, gradle) phải build lại APK/AAB.
- URL backend prod nằm ở **hai chỗ**: `mobile/src/config/apiConfig.js` và `eas.json` (`env.EXPO_PUBLIC_API_URL`) — đổi host phải sửa cả hai.
- EAS project: `owner = janetns198`, `slug = prointerview-mobile`, Android package `com.prointerview.app`.

---

## Giấy phép

Dự án thuộc sở hữu nội bộ. Liên hệ nhóm phát triển để biết thêm thông tin.
