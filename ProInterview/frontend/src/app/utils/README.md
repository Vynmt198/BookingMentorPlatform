# Tiện ích client (`src/app/utils/`)

Các file **`.js`** ở đây chạy trên **trình duyệt** (hoặc build-time), **không** phải server Node. Không “chuyển file sang backend” — chỉ **logic nhạy cảm / DB** mới cần viết lại phía BE.

## Bản đồ file

| File | Nhiệm vụ |
|:--|:--|
| **`api.js`** | `API_BASE_URL`, `apiUrl()`, `apiGet()` — base URL backend (Vite proxy dev / `VITE_API_URL` prod). |
| **`auth.js`** | Đăng ký, đăng nhập, Google, JWT trong `localStorage`, `PATCH /me`, `getPostLoginPath` (customer / mentor / admin). |
| **`mentorApi.js`** | `fetchMentors`, `fetchMentor` → `/api/mentors`. |
| **`bookingsApi.js`** | CRUD booking thật → `/api/bookings`. |
| **`bookings.js`** | `parseDateMs()` — helper sort/filter ngày lịch hẹn (dashboard / my bookings). |
| **`history.js`** | Cache client CV/JD metadata & lịch sử localStorage; đã login thì CV mới nhất qua `/api/cv/analyses`. |
| **`aiDialogue.js`** | Luật hội thoại demo (filter từ ngữ) phỏng vấn AI — chỉ client. |

## Liên quan backend

- Gọi HTTP thật: **`apiUrl`** + `fetch` / `authFetch`.
- Contract: **`API_INDEX.md`**, **`ROADMAP.md`**.
