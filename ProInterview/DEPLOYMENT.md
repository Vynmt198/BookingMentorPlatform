# Hướng dẫn Deploy — ProInterview (Web)

Deploy bản web lên **Vercel** (frontend) + **Render** (backend Express và Python CV service), dùng **MongoDB Atlas** làm database. Toàn bộ đều có gói free đủ chạy demo/đồ án.

> Tài liệu này chỉ dành cho `ProInterview/` (bản web). Bản mobile `Prointerview-App/` deploy qua EAS Build — xem [../Prointerview-App/README.md](../Prointerview-App/README.md).

---

## 0. Kiến trúc sau khi deploy

```
Người dùng
    │
    ▼
Vercel  (SPA React, domain: your-app.vercel.app)
    │  gọi API trực tiếp qua VITE_API_URL
    ▼
Render  (Express backend, domain: prointerview-backend-xm5q.onrender.com)
    ├──► MongoDB Atlas          (database)
    ├──► Render Python service  (CV/JD matching, FastAPI)
    ├──► Cloudinary             (lưu ảnh/file upload)
    ├──► Groq / OpenAI          (LLM)
    └──► Gmail SMTP             (email xác thực, mật khẩu, hoá đơn)
```

**3 service cần tạo:** 1 Vercel project + 2 Render web service.

---

## ⚠️ Đọc trước khi bắt đầu — 4 cái bẫy sẽ làm bạn mất thời gian

Đây là những chỗ config trong repo **không tự khớp**, nếu không biết trước sẽ debug rất lâu:

### 1. Thiếu `LLM_API_KEY` / `LLM_BASE_URL` → backend không khởi động được

`backend/src/server.js` có hàm `validateEnv()` chạy ngay khi boot. Ba biến `MONGO_URI`, `LLM_API_KEY`, `LLM_BASE_URL` được đánh dấu `critical: true` — thiếu bất kỳ biến nào thì **`process.exit(1)`**, service chết ngay, log Render chỉ hiện `❌ CRITICAL: Missing required env vars`.

**Vấn đề:** `render.yaml` chỉ khai báo `NODE_ENV`, `MONGO_URI`, `JWT_SECRET`, `CORS_ORIGIN`, `GOOGLE_CLIENT_ID`, `FRONTEND_URL` — **không có hai biến LLM**. Deploy bằng Blueprint mà không thêm tay là chắc chắn fail.

→ Luôn set `LLM_API_KEY` và `LLM_BASE_URL` trên Render (xem [Bước 3](#bước-3--deploy-backend-express-lên-render)).

### 2. Không set `VITE_API_URL` → trang phân tích CV im lặng chạy sai nhánh

`frontend/src/app/utils/api.js` trả `""` (same-origin) khi `VITE_API_URL` trống ở production — về lý thuyết vẫn chạy được nhờ `vercel.json` rewrite. **Nhưng** hàm `isExpressBackendConfigured()` khi đó trả `false`, và `pages/cv/CVAnalysis.jsx` dùng cờ đó (`USE_EXPRESS_CV`) để chọn nhánh xử lý — kết quả là trang CV Analysis rơi về nhánh Supabase legacy thay vì gọi Express + Python. Không có lỗi đỏ nào, chỉ là tính năng chạy sai.

→ **Luôn set `VITE_API_URL`** trỏ thẳng tới domain Render, đừng dựa vào rewrite.

### 3. Upload file sẽ biến mất nếu không có Cloudinary

`uploadController.js` thử upload lên Cloudinary trước; chưa cấu hình thì fallback lưu vào `public/uploads/` trên đĩa. Filesystem của Render **ephemeral** — mọi redeploy hoặc lần service ngủ dậy đều xoá sạch. Avatar, CV, thumbnail khoá học, ảnh check-in đều mất, DB còn URL trỏ vào hư không.

→ Set `CLOUDINARY_*` ngay từ đầu, đừng để "làm sau".

### 4. `vercel.json` hardcode domain backend

File `vercel.json` rewrite `/api/*` và `/uploads/*` sang `https://prointerview-backend-xm5q.onrender.com`. Nếu Render service của bạn tên khác, phải sửa file này rồi commit — riêng `/uploads/*` vẫn cần rewrite đúng để hiển thị ảnh fallback.

---

## Bước 1 — MongoDB Atlas

1. Tạo tài khoản tại [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) → tạo **Cluster M0 (free)**, chọn region gần Singapore.
2. **Database Access** → Add New Database User:
   - Username / Password (lưu lại, tránh ký tự đặc biệt như `@`, `/`, `:` — nếu có phải URL-encode)
   - Role: `Atlas admin` hoặc `Read and write to any database`
3. **Network Access** → Add IP Address → **`0.0.0.0/0`** (Allow access from anywhere).

   > Render gói free **không có static IP**, nên không thể whitelist IP cụ thể. Đây là đánh đổi bắt buộc — bù lại bằng mật khẩu DB mạnh.

4. **Connect** → Drivers → copy connection string, thêm tên database vào cuối:

   ```
   mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/prointerview?retryWrites=true&w=majority
   ```

   Chuỗi này chính là `MONGO_URI`.

> Backend đã có `dns.setDefaultResultOrder("ipv4first")` trong `app.js` để xử lý lỗi `ENETUNREACH` khi Render kết nối Atlas qua IPv6 — bạn không cần làm gì thêm.

---

## Bước 2 — Lấy các khoá bên ngoài

Chuẩn bị sẵn trước khi tạo service, vì Render sẽ hỏi ngay.

### 2.1 LLM (bắt buộc — backend không boot nếu thiếu)

Rẻ nhất là **Groq** (free tier rộng rãi):
1. Đăng ký [console.groq.com](https://console.groq.com) → API Keys → Create API Key
2. Ghi lại:
   - `LLM_API_KEY` = key vừa tạo
   - `LLM_BASE_URL` = `https://api.groq.com/openai/v1`
   - `LLM_MODEL` = `llama-3.3-70b-versatile`

Dùng OpenAI cũng được: `LLM_BASE_URL=https://api.openai.com/v1`, `LLM_MODEL=gpt-4o-mini`.

### 2.2 Cloudinary (rất nên có — xem bẫy #3)

1. Đăng ký [cloudinary.com](https://cloudinary.com) (free 25GB)
2. Dashboard → copy `Cloud Name`, `API Key`, `API Secret`
   → `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`

### 2.3 Google OAuth

1. [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials
2. Create Credentials → OAuth client ID → **Web application**
3. **Authorized JavaScript origins** — thêm cả hai:
   ```
   http://localhost:5173
   https://your-app.vercel.app          ← điền sau khi có domain Vercel ở Bước 5
   ```
4. Copy Client ID → dùng cho **cả** `GOOGLE_CLIENT_ID` (backend) và `VITE_GOOGLE_CLIENT_ID` (frontend). Hai giá trị **phải giống nhau**.

> Không cần Authorized redirect URI vì frontend dùng Google Identity Services (FedCM popup), không phải OAuth redirect flow.

### 2.4 Gmail SMTP (cho email xác thực / mật khẩu ban đầu / hoàn tiền)

1. Bật **2-Step Verification** cho tài khoản Gmail
2. [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) → tạo App Password (16 ký tự)
3. `MAIL_USER` = email, `MAIL_PASS` = app password (không phải mật khẩu Gmail thường)

Bỏ qua được — `isMailConfigured()` sẽ khiến hệ thống skip gửi mail an toàn, nhưng user sẽ không nhận được email xác thực hay mật khẩu ban đầu khi đăng nhập Google.

### 2.5 Ngân hàng nhận chuyển khoản (cho trang thanh toán)

Cần số tài khoản thật để sinh QR VietQR: tên ngân hàng, số tài khoản, chủ tài khoản, mã VietQR (vd `TPB` cho TPBank).

---

## Bước 3 — Deploy Python CV service lên Render

Làm service này **trước** vì backend cần URL của nó.

1. [dashboard.render.com](https://dashboard.render.com) → **New → Web Service** → connect GitHub repo
2. Cấu hình:

   | Trường | Giá trị |
   |:-------|:--------|
   | Name | `prointerview-cv` |
   | Region | Singapore |
   | Branch | `main` |
   | **Root Directory** | `ProInterview/cv_jd_matching` |
   | Runtime | Python 3 |
   | Build Command | `pip install -r requirements.txt` |
   | Start Command | `bash start.sh` |
   | Instance Type | Free |

3. Environment variables:

   | Key | Value |
   |:----|:------|
   | `LLM_API_KEY` | key Groq/OpenAI |
   | `LLM_BASE_URL` | `https://api.groq.com/openai/v1` |
   | `LLM_MODEL` | `llama-3.3-70b-versatile` |

4. Create Web Service → đợi build.

**Kiểm tra:** mở `https://prointerview-cv.onrender.com/docs` — phải thấy trang Swagger UI của FastAPI.

**Ghi lại URL này** → sẽ là `CV_ANALYZER_URL` ở bước sau.

> `start.sh` đã dùng `$PORT` do Render cấp và bind `0.0.0.0` — không cần sửa. `runtime.txt` pin Python `3.12.8`. CORS của service này để `allow_origins=["*"]` vì chỉ backend Express gọi vào.

---

## Bước 4 — Deploy backend Express lên Render

**New → Web Service** → cùng repo.

| Trường | Giá trị |
|:-------|:--------|
| Name | `prointerview-backend` |
| Region | Singapore |
| Branch | `main` |
| **Root Directory** | `ProInterview/backend` |
| Runtime | Node |
| Build Command | `npm install` |
| Start Command | `npm start` |
| **Health Check Path** | `/api/health` |
| Instance Type | Free |

### Environment variables

**Bắt buộc — thiếu là service không chạy:**

| Key | Value | Ghi chú |
|:----|:------|:--------|
| `NODE_ENV` | `production` | bật trust proxy, rate limit chặt, CORS prod |
| `MONGO_URI` | chuỗi Atlas ở Bước 1 | thiếu → `process.exit(1)` |
| `LLM_API_KEY` | key Groq/OpenAI | thiếu → `process.exit(1)` |
| `LLM_BASE_URL` | `https://api.groq.com/openai/v1` | thiếu → `process.exit(1)` |
| `JWT_SECRET` | chuỗi ngẫu nhiên ≥ 32 ký tự | thiếu → mọi route auth trả lỗi |

Sinh `JWT_SECRET`:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

**Rất nên có:**

| Key | Value | Hậu quả nếu thiếu |
|:----|:------|:-------------------|
| `LLM_MODEL` | `llama-3.3-70b-versatile` | dùng model mặc định, có thể không tồn tại trên provider |
| `CV_ANALYZER_URL` | URL service ở Bước 3 | phân tích CV/JD trả `503` |
| `GOOGLE_CLIENT_ID` | Client ID Bước 2.3 | không đăng nhập Google được |
| `CORS_ORIGIN` | `https://your-app.vercel.app` | xem ghi chú CORS bên dưới |
| `FRONTEND_URL` | `https://your-app.vercel.app` | link trong email trỏ về `localhost` |
| `BACKEND_URL` | `https://prointerview-backend-xm5q.onrender.com` | URL file upload fallback sai |
| `CLOUDINARY_CLOUD_NAME` | | **file upload mất sau mỗi redeploy** |
| `CLOUDINARY_API_KEY` | | |
| `CLOUDINARY_API_SECRET` | | |
| `MAIL_USER` | email Gmail | không gửi được email |
| `MAIL_PASS` | app password 16 ký tự | |
| `MAIL_FROM` | `"ProInterview" <ban@gmail.com>` | dùng giá trị mặc định |

**Tuỳ chọn:**

| Key | Mặc định / Ghi chú |
|:----|:-------------------|
| `JWT_EXPIRES_IN` | `7d` |
| `ADMIN_INVITE_CODE` | mã mời để đăng ký tài khoản admin qua trang Register |
| `BOOKING_PLATFORM_FEE_RATE` | `0.30` — hoa hồng booking |
| `COURSE_PLATFORM_FEE_RATE` | `0.35` — hoa hồng khoá học |
| `BOOKING_PLATFORM_FEE_RATE_EARLY_MENTOR` | `0.20` |
| `COURSE_PLATFORM_FEE_RATE_EARLY_MENTOR` | `0.25` |
| `EARLY_MENTOR_LIMIT` / `EARLY_MENTOR_DURATION_YEARS` | `20` / `1` |
| `TRANSFER_PAYMENT_TIMEOUT_MINUTES` | hạn chờ xác nhận chuyển khoản |
| `REFUND_NOTIFY_EMAIL` | email admin nhận thông tin hoàn tiền |
| `INVOICE_SELLER_NAME` / `_ADDRESS` / `_EMAIL` | thông tin bên bán in trên hoá đơn PDF |
| `JAAS_*` | phòng họp video — xem [Bước 8](#bước-8--tuỳ-chọn-nâng-cao) |
| `SEPAY_WEBHOOK_API_KEY` | tự động xác nhận chuyển khoản — xem Bước 8 |
| `UPLOAD_MAX_MB` | giới hạn dung lượng upload |

### Ghi chú về CORS

`app.js` xử lý CORS theo thứ tự: dùng `CORS_ORIGIN` (phân tách bằng dấu phẩy) nếu có; không có thì ở prod dùng mặc định `https://pro-interview-mu.vercel.app`. **Ngoài ra, ở prod mọi origin khớp `*.vercel.app` đều được cho qua** — nên preview deployment của Vercel vẫn gọi API được mà không cần khai báo thêm.

Nhiều domain thì viết liền nhau:
```
CORS_ORIGIN=https://your-app.vercel.app,https://prointerview.com
```

### Kiểm tra

Mở `https://prointerview-backend-xm5q.onrender.com/api/health` — phải trả JSON có `success: true` kèm trạng thái Mongo và cấu hình JaaS.

Nếu service không lên, mở **Logs** trên Render: `❌ CRITICAL: Missing required env vars` chỉ đích danh biến còn thiếu.

---

## Bước 5 — Deploy frontend lên Vercel

### 5.1 Sửa `vercel.json` nếu đổi tên backend

Nếu Render service của bạn **không** tên `prointerview-backend-xm5q`, sửa `ProInterview/frontend/vercel.json` rồi commit:

```json
{
  "rewrites": [
    { "source": "/api/:path*",     "destination": "https://<tên-service>.onrender.com/api/:path*" },
    { "source": "/uploads/:path*", "destination": "https://<tên-service>.onrender.com/uploads/:path*" }
  ]
}
```

### 5.2 Tạo project

[vercel.com/new](https://vercel.com/new) → import repo:

| Trường | Giá trị |
|:-------|:--------|
| Framework Preset | Vite |
| **Root Directory** | `ProInterview/frontend` |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm install` |

### 5.3 Environment Variables

| Key | Value | Ghi chú |
|:----|:------|:--------|
| `VITE_API_URL` | `https://prointerview-backend-xm5q.onrender.com` | **bắt buộc** — xem bẫy #2 |
| `VITE_GOOGLE_CLIENT_ID` | giống `GOOGLE_CLIENT_ID` backend | |
| `VITE_FRONTEND_URL` | `https://your-app.vercel.app` | link tuyệt đối |
| `VITE_BANK_TRANSFER_NAME` | vd `TPBank` | thiếu → trang thanh toán báo "Chưa cấu hình STK ngân hàng" |
| `VITE_BANK_TRANSFER_ACCOUNT` | số tài khoản | |
| `VITE_BANK_TRANSFER_OWNER` | tên chủ tài khoản | |
| `VITE_VIETQR_BANK_ID` | vd `TPB` | bỏ qua được nếu tên NH tự nhận diện được |

> Biến `VITE_*` được **nhúng vào bundle lúc build**. Đổi giá trị bắt buộc phải **Redeploy**, không có hot reload. Đừng đặt secret vào biến `VITE_*` — ai cũng đọc được trong JS bundle.

### 5.4 Deploy và ghi lại domain

Deploy → nhận domain dạng `https://your-app.vercel.app`.

> Frontend dùng **hash router** (`/#/mentors`), nên không cần cấu hình SPA fallback rewrite trên Vercel — mọi URL đều phục vụ từ `index.html` ở root.

---

## Bước 6 — Nối vòng cấu hình

Sau khi có cả hai domain, quay lại cập nhật chéo. **Bước này rất hay bị quên.**

1. **Render backend** → Environment → cập nhật rồi Save (service tự restart):
   ```
   CORS_ORIGIN=https://your-app.vercel.app
   FRONTEND_URL=https://your-app.vercel.app
   BACKEND_URL=https://prointerview-backend-xm5q.onrender.com
   CV_ANALYZER_URL=https://prointerview-cv.onrender.com
   ```

2. **Google Cloud Console** → OAuth client → **Authorized JavaScript origins** → thêm `https://your-app.vercel.app` → Save.

   > Google mất vài phút tới vài chục phút để propagate. Lỗi `origin_mismatch` ngay sau khi thêm là bình thường, đợi rồi thử lại.

3. **Vercel** → Redeploy nếu vừa đổi biến `VITE_*`.

---

## Bước 7 — Seed dữ liệu và tạo tài khoản admin

Database Atlas đang trống. Có hai cách:

### Cách 1 — Seed từ máy bạn (khuyến nghị)

```bash
cd ProInterview/backend
# Tạm trỏ .env local vào Atlas production
# MONGO_URI=mongodb+srv://...
npm run seed:all
```

Tạo sẵn users, mentors, courses, reviews mẫu. Tài khoản dev — mật khẩu `Dev123456`:

| Email | Role |
|:------|:-----|
| `customer@dev.local` | Customer |
| `mentor@dev.local` | Mentor |
| `admin@dev.local` | Admin |

> **Đổi mật khẩu các tài khoản này ngay** nếu deploy công khai — chúng nằm trong tài liệu.

### Cách 2 — Đăng ký qua giao diện

Set `ADMIN_INVITE_CODE` trên Render, rồi dùng mã đó ở trang Register để tạo tài khoản admin đầu tiên.

---

## Bước 8 — Tuỳ chọn nâng cao

### JaaS — phòng họp video thật

Không cấu hình thì phòng họp tự fallback `meet.jit.si`, **giới hạn ~5 phút khi nhúng** — đủ demo, không đủ dùng thật.

1. Đăng ký [jaas.8x8.vc](https://jaas.8x8.vc) → API Keys → tạo key, tải file `.pk` (PEM RSA)
2. Encode private key thành base64 (chạy ở máy local):
   ```bash
   cd ProInterview/backend
   npm run encode:jaas-key
   ```
3. Set trên Render:
   ```
   JAAS_APP_ID=<app id>
   JAAS_API_KEY_ID=<api key id>
   JAAS_PRIVATE_KEY_BASE64=<chuỗi base64 vừa encode>
   JAAS_DOMAIN=8x8.vc
   JAAS_JWT_TTL_SEC=10800
   ```
4. Kiểm tra: `GET /api/health` trả kèm `getJaasPublicStatus()` — xác nhận cấu hình đã đúng. Chi tiết hơn: `npm run verify:jaas` ở local.

> Dùng `JAAS_PRIVATE_KEY_BASE64` thay vì `JAAS_PRIVATE_KEY` — key PEM nhiều dòng rất dễ vỡ khi dán vào ô env của Render.

### SePay — tự động xác nhận chuyển khoản

Không có thì admin phải xác nhận tay từng giao dịch trong `/admin/transactions` (vẫn hoạt động bình thường).

1. Đăng ký SePay, liên kết tài khoản ngân hàng
2. Cấu hình webhook URL: `https://prointerview-backend-xm5q.onrender.com/api/payments/webhook/sepay`
3. Set `SEPAY_WEBHOOK_API_KEY` trên Render

> Giao dịch thuộc tài khoản bị khoá sẽ **không** tự xác nhận mà bị giữ ở trạng thái `held_inactive_account`, admin xử lý tại `/admin/transactions`.

### Custom domain

Vercel → Settings → Domains → thêm domain → trỏ DNS theo hướng dẫn. Sau đó **phải** cập nhật:
- `CORS_ORIGIN` và `FRONTEND_URL` trên Render (domain mới không còn khớp `*.vercel.app`)
- Authorized JavaScript origins trên Google Console
- `VITE_FRONTEND_URL` trên Vercel → Redeploy

---

## Bước 9 — Checklist kiểm tra sau deploy

Đi lần lượt, mỗi mục hỏng chỉ ra đúng một nhóm cấu hình:

| # | Kiểm tra | Hỏng thì xem |
|:--|:---------|:-------------|
| 1 | `GET /api/health` trả `success: true` | `MONGO_URI`, log Render |
| 2 | `https://<cv-service>/docs` mở được | Bước 3 |
| 3 | Trang chủ Vercel load, không lỗi đỏ ở Console | Build log Vercel |
| 4 | Đăng nhập `customer@dev.local` / `Dev123456` | `JWT_SECRET`, seed, `CORS_ORIGIN` |
| 5 | Đăng nhập Google | `GOOGLE_CLIENT_ID` khớp 2 bên + Authorized origins |
| 6 | Danh sách mentor có dữ liệu | seed |
| 7 | Upload avatar ở `/profile`, **reload lại vẫn thấy ảnh** | `CLOUDINARY_*` |
| 8 | Phân tích CV ở `/cv-analysis/jd` chạy hết luồng | `VITE_API_URL` (bẫy #2), `CV_ANALYZER_URL`, `LLM_API_KEY` |
| 9 | Trang `/checkout` hiện QR VietQR | `VITE_BANK_TRANSFER_*` |
| 10 | Đăng nhập admin, mở `/admin/finance-overview` | seed tài khoản admin |
| 11 | Email xác thực về hộp thư | `MAIL_USER`, `MAIL_PASS` |
| 12 | Đặt lịch mentor → vào `/meeting/:id` | JaaS (hoặc chấp nhận fallback 5') |

---

## Giới hạn của gói free và cách sống chung

### Render free — service ngủ sau 15 phút không có request

- Request đầu tiên sau khi ngủ mất **~50 giây** để cold start. Người chấm đồ án dễ tưởng site chết.
- **5 background job** (booking reminder, stale sweep, streak, plan expiry, earnings clearance) **không chạy khi service ngủ** — nhắc lịch và giải phóng thu nhập mentor sẽ trễ.

**Cách giảm nhẹ:** dùng [cron-job.org](https://cron-job.org) (free) ping `https://prointerview-backend-xm5q.onrender.com/api/health` mỗi 10 phút. Endpoint `/health` đã được `skip` khỏi rate limiter nên ping thoải mái.

> Ping giữ service thức chứ không tăng tài nguyên. Cần chạy job đúng giờ thật thì phải lên gói trả phí.

- Free tier có hạn mức ~750 giờ/tháng cho toàn account. Hai service cùng chạy 24/7 sẽ vượt — cân nhắc chỉ ping service backend.

### Vercel free

Thoải mái cho SPA tĩnh. Lưu ý bandwidth 100GB/tháng và mỗi lần push lên branch đều tạo preview deployment mới (được CORS cho qua nhờ luật `*.vercel.app`).

### MongoDB Atlas M0

512MB storage, không có backup tự động. Muốn giữ dữ liệu thì `mongodump` định kỳ.

---

## Troubleshooting

**Render deploy fail, log có `❌ CRITICAL: Missing required env vars`**
→ Thiếu `MONGO_URI`, `LLM_API_KEY` hoặc `LLM_BASE_URL`. Log chỉ đích danh biến nào.

**`MongooseServerSelectionError` / `ENETUNREACH`**
→ Chưa mở `0.0.0.0/0` trong Atlas Network Access, hoặc sai user/password. Password có ký tự đặc biệt thì phải URL-encode (`@` → `%40`).

**Frontend gọi API bị CORS blocked**
→ `CORS_ORIGIN` trên Render chưa khớp domain Vercel. Kiểm tra không có dấu `/` ở cuối, và dùng `https://` chứ không phải `http://`.

**Đăng nhập Google báo `origin_mismatch` / popup đóng ngay**
→ Chưa thêm domain Vercel vào Authorized JavaScript origins, hoặc `VITE_GOOGLE_CLIENT_ID` ≠ `GOOGLE_CLIENT_ID`. Vừa thêm thì đợi vài phút.

**Ảnh upload hiện lúc đầu rồi mất sau vài giờ**
→ Đang chạy fallback local trên filesystem ephemeral. Set `CLOUDINARY_*` rồi upload lại (ảnh cũ đã mất vĩnh viễn).

**Phân tích CV trả `503`**
→ `CV_ANALYZER_URL` sai, hoặc service Python đang cold start (thử lại sau ~50s), hoặc service Python đã sập — kiểm tra log của nó.

**Phân tích CV không báo lỗi nhưng kết quả sai/không như local**
→ Bẫy #2: `VITE_API_URL` trống nên chạy nhánh Supabase legacy. Set biến rồi Redeploy.

**Request đầu tiên rất chậm rồi sau đó bình thường**
→ Cold start Render free. Xem mục ping ở trên.

**API trả dữ liệu cũ dù DB đã đổi**
→ Đã được xử lý: `app.js` set `Cache-Control: no-store` cho mọi response `/api` (edge proxy của Vercel rewrite từng giữ lại response cũ). Nếu vẫn gặp, kiểm tra header trả về trong tab Network — thiếu `no-store` nghĩa là đang chạy bản backend cũ, cần redeploy Render.

**`429 Quá nhiều yêu cầu`**
→ Rate limit prod là 500 request / 15 phút / IP. Thao tác ghi của admin còn chặt hơn: 30/phút.

**Đổi biến `VITE_*` trên Vercel mà không thấy tác dụng**
→ Biến `VITE_*` nhúng lúc build. Phải Redeploy.

---

## Tài liệu liên quan

| File | Nội dung |
|:-----|:---------|
| [README.md](./README.md) | Tổng quan sản phẩm, chạy dev local |
| [CLAUDE.md](./CLAUDE.md) | Kiến trúc chi tiết, danh sách đầy đủ env var, quy tắc domain |
| [backend/.env.example](./backend/.env.example) | Template env backend kèm chú thích |
| [backend/DATABASE.md](./backend/DATABASE.md) | Schema MongoDB, seed scripts |
