# ProInterview

> Nền tảng SaaS luyện phỏng vấn xin việc với AI avatar, đặt lịch mentor, phân tích CV/JD và khóa học trực tuyến.

[![Node](https://img.shields.io/badge/Node-%3E%3D20-brightgreen)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-blue)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express-5-lightgrey)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose_9-green)](https://mongoosejs.com/)
[![Python](https://img.shields.io/badge/Python-FastAPI-009688)](https://fastapi.tiangolo.com/)

---

## Tổng quan

**ProInterview** là ứng dụng web giúp ứng viên chuẩn bị phỏng vấn xin việc thông qua:

- **Phỏng vấn AI** — avatar D-ID đặt câu hỏi, nhận diện khuôn mặt, đánh giá phản hồi
- **Đặt lịch mentor** — booking 1-1 với mentor, thanh toán, đánh giá sau buổi
- **Phân tích CV/JD** — matching CV với mô tả công việc, trích xuất kỹ năng
- **Khóa học** — mua và học khóa học video do mentor tạo
- **Dashboard** — theo dõi tiến trình, lịch sử phỏng vấn, thống kê

---

## Kiến trúc Monorepo

```
ProInterview/
├── frontend/          # Vite + React 18 + Tailwind CSS + shadcn/ui   (port 5173)
├── backend/           # Express 5 + MongoDB (Mongoose 9) + JWT        (port 5000)
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
cd prointerview
```

### 2. Cấu hình môi trường

**Backend** — tạo `backend/.env` từ template:

```bash
cp backend/.env.example backend/.env
```

Điền các biến bắt buộc:

```env
MONGO_URI=mongodb://127.0.0.1:27017/prointerview
JWT_SECRET=<chuỗi ngẫu nhiên dài ≥ 32 ký tự>
CORS_ORIGIN=http://localhost:5173
JWT_EXPIRES_IN=7d
GOOGLE_CLIENT_ID=<từ Google Cloud Console>
LLM_API_KEY=<OpenAI hoặc compatible>
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o-mini
CV_ANALYZER_URL=http://localhost:8000   # Python service (dev)
```

**Frontend** — tạo `frontend/.env.local`:

```env
VITE_GOOGLE_CLIENT_ID=<giống backend>
```

### 3. Cài dependencies

```bash
# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 4. Seed dữ liệu dev

```bash
cd backend
npm run seed:all
```

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

## Tính năng chính

### Người dùng (Customer)
- Đăng ký / đăng nhập email, Google OAuth
- Luyện phỏng vấn với AI avatar (D-ID streaming)
- Upload CV, phân tích và đối chiếu với JD
- Tìm kiếm và đặt lịch mentor
- Mua và học khóa học video
- Lịch sử phỏng vấn, dashboard cá nhân

### Mentor
- Quản lý lịch, booking, thu nhập
- Tạo và quản lý khóa học
- Peer review với mentor khác
- Analytics buổi tư vấn

### Admin
- Quản lý người dùng, mentor, bookings
- Xét duyệt mentor mới
- Dashboard thống kê toàn hệ thống

---

## API

Base URL: `/api` · Auth: `Authorization: Bearer <jwt>`

| Nhóm | Endpoint |
|:-----|:---------|
| Auth | `/api/auth/*` |
| Mentors | `/api/mentors/*` |
| Bookings | `/api/bookings/*` |
| Courses | `/api/courses/*`, `/api/enrollments/*` |
| CV & JD | `/api/cv/*` |
| Interviews | `/api/interviews/*` |
| Payments | `/api/payments/*` |
| Admin | `/api/admin/*` |
| Health | `GET /api/health` |

Xem toàn bộ contract tại [API_INDEX.md](./API_INDEX.md).  
Docs CV/JD service (khi chạy local): `http://127.0.0.1:8000/docs`

---

## Tài liệu

| File | Nội dung |
|:-----|:---------|
| [API_INDEX.md](./API_INDEX.md) | Contract đầy đủ tất cả endpoints (đang chạy + roadmap) |
| [ROADMAP.md](./ROADMAP.md) | Lộ trình theo phase, trạng thái từng endpoint |
| [backend/DATABASE.md](./backend/DATABASE.md) | Schema MongoDB chi tiết, seed scripts |
| [POSTMAN_TESTING.md](./POSTMAN_TESTING.md) | Hướng dẫn test API với Postman |

---

## Deployment

| Service | Platform | Ghi chú |
|:--------|:---------|:--------|
| Backend | Render | `render.yaml` có sẵn; region: Singapore |
| Frontend | Vercel | `vercel.json` có sẵn; cần set `VITE_API_URL` |
| CV Service | Heroku / Render | `Procfile` + `runtime.txt` có sẵn |

Sau khi deploy, đặt `CV_ANALYZER_URL` trong backend env trỏ về URL Python service.

---

## Tech Stack

| Layer | Công nghệ |
|:------|:----------|
| Frontend | React 18, Vite, React Router v7, Tailwind CSS, shadcn/ui, Recharts |
| Backend | Express 5 (ESM), Node ≥ 20, Mongoose 9, JWT, bcrypt, Multer |
| Database | MongoDB |
| AI / CV | Python FastAPI, pdf parsing, NLP |
| Avatar AI | D-ID Streaming API |
| Auth | Google Identity Services (FedCM), JWT refresh sessions |
| Payments | Chuyển khoản ngân hàng (chính); MoMo / ZaloPay (sandbox) |

---

## Đóng góp

1. Fork repo và tạo branch từ `main`
2. Khi thêm API mới: cập nhật [API_INDEX.md](./API_INDEX.md) và [ROADMAP.md](./ROADMAP.md)
3. Dùng `apiUrl()` từ `frontend/src/app/utils/api.js`, không hardcode URL
4. Response shape chuẩn: `{ success: true, <key>: data }` / `{ success: false, error: "msg" }`
5. Tạo Pull Request vào `main` với mô tả rõ ràng

---

## Giấy phép

Dự án thuộc sở hữu nội bộ. Liên hệ nhóm phát triển để biết thêm thông tin.
