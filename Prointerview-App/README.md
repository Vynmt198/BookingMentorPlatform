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
- `backend/` ở đây là **bản fork riêng** của backend web, đã tách ra và phát triển song song — không đồng bộ tự động. Một số tính năng chỉ có ở bản này (route `/api/cart` đã mount), một số tính năng chỉ có ở bản web (`ProInterview/backend`) và **chưa tồn tại ở đây**: analytics/user-journey tracking, JaaS video meeting, booking check-in.

Xem [../README.md](../README.md) để biết tổng quan cả hai sản phẩm.

---

## Kiến trúc

```
Prointerview-App/
├── mobile/            # Expo 54 + React Native 0.81 + React 19 (không dùng React Navigation)
├── backend/           # Express 5 + MongoDB (Mongoose 9) + JWT — fork riêng, khác ProInterview/backend
└── cv_jd_matching/     # Python FastAPI + Uvicorn (dùng chung kiến trúc với bản web)
```

`mobile/` không tách theo `screens/` + navigator chuẩn — toàn bộ điều hướng nằm trong một file `mobile/App.js` (~8800 dòng) quản lý bằng state nội bộ, các "màn hình" là component trong `mobile/src/components/` (`CartScreen`, `CheckoutScreen`, `MentorBookingScreen`, `MentorScheduleScreen`, `CourseDetailScreen`, `CourseLearningScreen`, `CvAnalysisHubScreen`, `ProfileScreen`, `RolePortal`, `GoogleSignInButton`...).

---

## Yêu cầu

| Công cụ | Phiên bản |
|:--------|:----------|
| Node.js | ≥ 20 |
| npm | ≥ 10 |
| MongoDB | ≥ 6 (local hoặc Atlas) |
| Expo CLI / Expo Go | để chạy mobile trên thiết bị/emulator |
| Python | ≥ 3.10 (chỉ cho CV/JD service) |

---

## Cài đặt & Chạy Dev

### Backend

```bash
cd backend
cp .env.example .env   # điền MONGO_URI, JWT_SECRET, CORS_ORIGIN, ...
npm install
npm run dev             # nodemon → src/server.js
npm run seed:all        # seed dữ liệu dev (tuỳ chọn)
```

### Mobile

```bash
cd mobile
npm install
npm start               # Expo dev server — quét QR bằng Expo Go, hoặc:
npm run android         # / npm run ios / npm run web
```

Base URL API mobile cấu hình tại `mobile/src/config/apiConfig.js`:
- **Prod:** mặc định trỏ `https://prointerview-backend.onrender.com`.
- **Dev:** tự dò IP LAN qua Expo debugger host, thử lần lượt cổng `5001`, `5000`.

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
| `admin@dev.local` | Admin |

---

## Tính năng mobile hiện có

- Đăng nhập/đăng ký, Google Sign-In (native + WebView fallback)
- Danh sách mentor, đặt lịch booking (`MentorBookingScreen`, `MentorScheduleScreen`)
- Khoá học: xem chi tiết, học video (`CourseDetailScreen`, `CourseLearningScreen`)
- CV/JD analysis hub (`CvAnalysisHubScreen`)
- **Giỏ hàng** (`CartScreen`, thay thế `CartModal` cũ) — full-screen, có fallback lưu local (AsyncStorage) khi backend không có `/api/cart` hoặc offline, tự enroll từng khoá học khi checkout không qua server cart
- Thanh toán, xem kết quả thanh toán (`CheckoutScreen`, `PaymentResultScreen`)
- Hồ sơ cá nhân (`ProfileScreen`), cổng chọn vai trò (`RolePortal`)

## Tính năng backend hiện có (khác biệt so với `ProInterview/backend`)

| Có ở đây | Chưa có ở đây (chỉ có ở bản web) |
|:---------|:----------------------------------|
| `/api/cart` (giỏ hàng — mount đầy đủ) | Analytics/user-journey tracking (`/api/analytics`, model `UserEvent`) |
| `/api/interviews`, `/api/ai` (giống bản web) | JaaS video meeting (`jaasService.js`) |
| 21 model Mongoose (không có `UserEvent`) | Booking check-in |
| Script `backfillMediaUrls.js` — vá avatar/thumbnail thiếu cho mentor/course | Script `verify:jaas`, `encode:jaas-key`, `seed:mentor-courses-ui` |

---

## Tài liệu

| File | Nội dung |
|:-----|:---------|
| [CLAUDE.md](./CLAUDE.md) | Kiến trúc chi tiết backend + mobile cho AI coding agent |
| [API_INDEX.md](./API_INDEX.md) | Contract endpoint (lưu ý: viết cho bản web, chưa cập nhật đầy đủ cho fork này) |
| [ROADMAP.md](./ROADMAP.md) | Lộ trình theo phase (idem — tham khảo, không phải nguồn chân lý) |
| [POSTMAN_TESTING.md](./POSTMAN_TESTING.md) | Hướng dẫn test API với Postman |

---

## Deployment

| Service | Platform | Ghi chú |
|:--------|:---------|:--------|
| Backend | Render | `render.yaml` có sẵn |
| Mobile | Expo (EAS Build) | chưa cấu hình EAS trong repo — build thủ công qua `expo` CLI |
| CV Service | Heroku / Render | `Procfile` + `runtime.txt` có sẵn |

---

## Giấy phép

Dự án thuộc sở hữu nội bộ. Liên hệ nhóm phát triển để biết thêm thông tin.
