# ProInterview

> Nền tảng SaaS hỗ trợ tìm việc: phân tích CV/JD, đặt lịch mentor 1-1 kèm phòng họp video, và khóa học trực tuyến.

[![Node](https://img.shields.io/badge/Node-%3E%3D20-brightgreen)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-blue)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express-5-lightgrey)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose_9-green)](https://mongoosejs.com/)
[![Python](https://img.shields.io/badge/Python-FastAPI-009688)](https://fastapi.tiangolo.com/)

---

## Tổng quan

**ProInterview** là ứng dụng web giúp ứng viên chuẩn bị phỏng vấn xin việc thông qua:

- **Phân tích CV/JD** — matching CV với mô tả công việc hoặc theo lĩnh vực, trích xuất kỹ năng, gợi ý cải thiện
- **Đặt lịch mentor** — booking 1-1, thanh toán chuyển khoản, phòng họp video JaaS kèm check-in, đánh giá sau buổi
- **Khóa học** — giỏ hàng, mua và học khóa học video do mentor tạo
- **Dashboard** — theo dõi tiến trình, lịch sử giao dịch + hoá đơn PDF, thống kê

> **Lưu ý phạm vi:** tính năng phỏng vấn AI và avatar D-ID **đã được gỡ khỏi bản web** (commit `3c5a43d`). Bản mobile (`../Prointerview-App/`) vẫn còn.

---

## Kiến trúc Monorepo

```
ProInterview/
├── frontend/          # Vite + React 18 + Tailwind CSS + shadcn/ui   (port 5173)
├── backend/           # Express 5 + MongoDB (Mongoose 9) + JWT        (port 5000/5001)
└── cv_jd_matching/    # Python FastAPI + Uvicorn                      (port 8000)
```

---

## Yêu cầu

| Công cụ | Phiên bản |
|:--------|:----------|
| Node.js | ≥ 20 |
| npm | ≥ 10 |
| MongoDB | ≥ 6 (local hoặc Atlas) |
| Python | ≥ 3.10 (chỉ cho CV/JD service) |

---

## Cài đặt & Chạy Dev

### 1. Clone repo

```bash
git clone https://github.com/<your-org>/prointerview.git
cd prointerview/ProInterview
```

### 2. Cấu hình môi trường

**Backend** — tạo `backend/.env` từ template:

```bash
cp backend/.env.example backend/.env
```

Điền các biến bắt buộc:

```env
PORT=5001
MONGO_URI=mongodb://127.0.0.1:27017/prointerview
JWT_SECRET=<chuỗi ngẫu nhiên dài ≥ 32 ký tự>
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173
FRONTEND_URL=http://localhost:5173
GOOGLE_CLIENT_ID=<từ Google Cloud Console>
LLM_API_KEY=<OpenAI-compatible, vd Groq>
LLM_BASE_URL=https://api.groq.com/openai/v1
LLM_MODEL=llama-3.3-70b-versatile
CV_ANALYZER_URL=http://localhost:8000   # Python service (dev)
```

Các nhóm biến tuỳ chọn trong `.env.example`: tỷ lệ hoa hồng (`BOOKING_PLATFORM_FEE_RATE`, `COURSE_PLATFORM_FEE_RATE`, chính sách early mentor), JaaS (`JAAS_*`), `ADMIN_INVITE_CODE`. Không set JaaS thì phòng họp tự fallback `meet.jit.si` (giới hạn ~5 phút khi embed).

**Frontend** — tạo `frontend/.env.local`:

```env
VITE_GOOGLE_CLIENT_ID=<giống backend>
# Cần cho trang thanh toán chuyển khoản (thiếu → không hiện QR VietQR)
VITE_BANK_TRANSFER_NAME=TPBank
VITE_BANK_TRANSFER_ACCOUNT=<số tài khoản>
VITE_BANK_TRANSFER_OWNER=<chủ tài khoản>
VITE_VIETQR_BANK_ID=TPB
```

### 3. Cài dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 4. Seed dữ liệu dev

```bash
cd backend
npm run seed:all
```

Seed demo cho từng luồng cụ thể: `npm run seed:meeting-flow` (phòng họp), `npm run seed:suspend-demo` (tạm ngưng mentor + hoàn tiền học viên), `npm run seed:lock-test` (khóa tài khoản), `npm run seed:commission` (hoa hồng).

### 5. Khởi động

**Chạy đồng thời toàn bộ stack (khuyến nghị):**

```bash
cd frontend
npm run dev:full
```

Hoặc chạy riêng từng service:

```bash
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — Frontend
cd frontend && npm run dev

# Terminal 3 — CV/JD Service (tuỳ chọn)
cd cv_jd_matching
pip install -r requirements.txt
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

### Tài khoản dev mặc định (sau seed)

Mật khẩu: **`Dev123456`**

| Email | Role |
|:------|:-----|
| `customer@dev.local` | Customer (plan: free) |
| `mentor@dev.local` | Mentor |
| `admin@dev.local` | Admin |

---

## Gói cước

| Plan | Giá/tháng | Giá/năm | CV/JD Analysis | Ưu đãi mentor & khoá học |
|:-----|:----------|:--------|:---------------|:--------------------------|
| Free | 0đ | — | 3/tháng | 0% |
| Student | 150,000đ | 1,440,000đ | 50/tháng | 5% |
| Professional | 500,000đ | 4,800,000đ | Không giới hạn | 10% |

Buổi mentor luôn tự thanh toán — gói cước cho **ưu đãi %**, không cấp buổi miễn phí. Nâng/hạ hạng giữa chừng được quy đổi giá trị ngày còn lại theo tiền.

---

## Tính năng chính

### Người dùng (Customer)
- Đăng ký / đăng nhập email, Google OAuth (nhận email mật khẩu ban đầu khi đăng nhập Google lần đầu)
- Upload CV, phân tích và đối chiếu với JD hoặc theo lĩnh vực (`/cv-analysis/jd`, `/cv-analysis/field`)
- Tìm kiếm và đặt lịch mentor, vào phòng họp video qua JaaS (8x8.vc, fallback Jitsi public)
- Giỏ hàng, mua và học khóa học video
- Lịch sử giao dịch + tải hoá đơn PDF (`/payment-history`), booking, dashboard cá nhân

### Mentor
- Quản lý lịch, booking (kèm check-in bằng ảnh webcam trước khi vào phòng họp)
- Thu nhập/hoa hồng, quản lý tài khoản nhận tiền (có validate ngân hàng + STK), yêu cầu rút tiền
- Tạo và quản lý khóa học, peer review với mentor khác, analytics buổi tư vấn
- Tự báo học viên no-show sau 15 phút (buổi tính như hoàn thành, mentor nhận đủ tiền)

### Admin
- Quản lý người dùng, mentor, bookings, khoá học, thanh toán (booking / subscription / course)
- Xét duyệt mentor mới, duyệt giá, quản lý check-in booking
- **Minh bạch tài chính** — trang "Thu · Chi · Lợi nhuận" (`/admin/finance-overview`) tổng hợp toàn hệ thống kèm phép đối chiếu tự kiểm chứng; Dashboard và `/admin/finance` dùng chung một nguồn tính doanh thu
- **Vòng đời tài khoản** — xem trước tác động trước khi khóa, tạm ngưng (chặn hoạt động nhưng mentor vẫn rút được tiền), đóng tài khoản (soft-delete, ẩn danh PII, giữ nguyên lịch sử tài chính), tự hoàn tiền 100% cho học viên có buổi chưa diễn ra
- Analytics hành vi người dùng (user-journey tracking) và audit log mọi thao tác ghi của admin

---

## API

Base URL: `/api` · Auth: `Authorization: Bearer <jwt>`

| Nhóm | Endpoint |
|:-----|:---------|
| Auth | `/api/auth/*` |
| Mentors | `/api/mentors/*` |
| Mentor (self) | `/api/mentor/*` — dashboard, finance, analytics, payout-accounts, peer-reviews |
| Bookings | `/api/bookings/*` — gồm check-in, no-show, reschedule, refund destination |
| Courses | `/api/courses/*`, `/api/enrollments/*` |
| Cart | `/api/cart/*` — get/add/checkout/update/remove/clear |
| CV & JD | `/api/cv/*` |
| Plans | `/api/plans/*` |
| Payments | `/api/payments/*` — gồm `GET /history`, `GET /:id/invoice` (PDF), webhook SePay |
| Reviews / Reports | `/api/reviews/*`, `/api/reports/*` |
| Notifications | `/api/notifications/*` |
| Analytics | `/api/analytics/events` — ghi sự kiện hành vi cho admin user-journey |
| Admin | `/api/admin/*` — gồm `audit-log`, `users/:id/impact`, `users/:id/close`, `finance/overview`, `payments/held` |
| Upload | `/api/upload/*` |
| Health | `GET /api/health` — trả kèm trạng thái cấu hình JaaS |

> `API_INDEX.md` và `ROADMAP.md` **đã lệch so với code** (còn liệt kê `/api/interviews`, `/api/ai` đã gỡ). Kiểm tra `backend/src/app.js` + `backend/src/routes/` để biết endpoint thực tế.

Docs CV/JD service (khi chạy local): `http://127.0.0.1:8000/docs`

---

## Tài liệu

| File | Nội dung |
|:-----|:---------|
| [DEPLOYMENT.md](./DEPLOYMENT.md) | **Hướng dẫn deploy Vercel + Render + MongoDB Atlas** từng bước, bảng env var, checklist, troubleshooting |
| [TESTING.md](./TESTING.md) | **Kịch bản test site đã deploy** — smoke test, luồng theo vai trò, đối soát tiền, test bảo mật; kèm mock data qua `npm run seed:demo` |
| [CLAUDE.md](./CLAUDE.md) | Kiến trúc chi tiết backend + frontend, quy tắc domain (tiền, vòng đời tài khoản) |
| [API_INDEX.md](./API_INDEX.md) | Contract endpoints — tham khảo, đã lệch một phần |
| [ROADMAP.md](./ROADMAP.md) | Lộ trình theo phase — tham khảo, đã lệch một phần |
| [backend/DATABASE.md](./backend/DATABASE.md) | Schema MongoDB chi tiết, seed scripts |
| [POSTMAN_TESTING.md](./POSTMAN_TESTING.md) | Hướng dẫn test API với Postman |

---

## Deployment

| Service | Platform | Ghi chú |
|:--------|:---------|:--------|
| Backend | Render | `render.yaml` (Blueprint), `rootDir: ProInterview/backend`, region Singapore, health check `/api/health` |
| Frontend | Vercel | `frontend/vercel.json` — rewrite `/api/*` + `/uploads/*` sang domain backend, header COOP cho FedCM |
| CV Service | Heroku / Render | `Procfile` + `runtime.txt` có sẵn |

Sau khi deploy, đặt `CV_ANALYZER_URL` trong backend env trỏ về URL Python service, và cập nhật domain backend trong `frontend/vercel.json` nếu đổi host.

→ **Hướng dẫn deploy đầy đủ từng bước: [DEPLOYMENT.md](./DEPLOYMENT.md)** — gồm bảng env var bắt buộc/tuỳ chọn, checklist kiểm tra sau deploy, và các bẫy cấu hình đã biết (backend không boot nếu thiếu `LLM_API_KEY`; file upload mất nếu chưa có Cloudinary).

---

## Tech Stack

| Layer | Công nghệ |
|:------|:----------|
| Frontend | React 18, Vite, React Router v7 (hash), Tailwind CSS, shadcn/ui, Recharts |
| Backend | Express 5 (ESM), Node ≥ 20, Mongoose 9, JWT, bcrypt, Multer, nodemailer |
| Database | MongoDB — 20 Mongoose schemas |
| AI / CV | Python FastAPI, pdf parsing, NLP; LLM OpenAI-compatible cho gợi ý |
| Video meeting | JaaS (8x8.vc, JWT RS256 ký bởi `jaasService.js`), fallback Jitsi public |
| Auth | Google Identity Services (FedCM), JWT + refresh sessions |
| Payments | Chuyển khoản ngân hàng + webhook SePay (chính); MoMo / ZaloPay / VNPay (sandbox) |
| Background jobs | 5 job: booking reminder, stale sweep, streak, plan expiry, earnings clearance |
| Testing | Node test runner + Jest, integration test qua `mongodb-memory-server` (13 file test) |

---

## Đóng góp

1. Fork repo và tạo branch từ `main`
2. Khi thêm API mới: cập nhật [API_INDEX.md](./API_INDEX.md) và [ROADMAP.md](./ROADMAP.md)
3. Dùng `apiUrl()` từ `frontend/src/app/utils/api.js`, không hardcode URL
4. Response shape chuẩn: `{ success: true, <key>: data }` / `{ success: false, error: "msg" }`
5. Code liên quan tới tiền: đọc mục "Khi làm việc quanh tiền" trong [CLAUDE.md](./CLAUDE.md) trước khi sửa
6. Tạo Pull Request vào `main` với mô tả rõ ràng

---

## Giấy phép

Dự án thuộc sở hữu nội bộ. Liên hệ nhóm phát triển để biết thêm thông tin.
