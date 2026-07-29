# Product

Repo chứa **hai sản phẩm độc lập** cùng thuộc hệ sinh thái ProInterview — nền tảng luyện phỏng vấn xin việc, đặt lịch mentor, phân tích CV/JD và học khoá học online. Hai thư mục con là **hai backend đã phân kỳ**, không dùng chung mã nguồn — sửa ở bên này không tự động áp dụng cho bên kia.

```
Product/
├── ProInterview/          # Sản phẩm WEB — frontend React + backend Express + cv_jd_matching (FastAPI)
└── Prointerview-App/      # Sản phẩm MOBILE — app Expo/React Native + backend Express riêng (fork) + cv_jd_matching
```

## ProInterview/ — Web

Frontend Vite + React 18 + Tailwind/shadcn, backend Express 5 + MongoDB, service Python FastAPI cho matching CV/JD.

Phạm vi hiện tại: phân tích CV/JD, đặt lịch + phòng họp mentor qua JaaS (8x8.vc) kèm check-in, giỏ hàng + thanh toán chuyển khoản + hoá đơn PDF, khoá học, dashboard admin (analytics/user-journey, minh bạch tài chính Thu–Chi–Lợi nhuận, vòng đời tài khoản: khóa / tạm ngưng / đóng + hoàn tiền).

> **Đã gỡ:** toàn bộ tính năng phỏng vấn AI và avatar D-ID (`/api/interviews`, `/api/ai`, model `InterviewSession`) — xoá ở commit `3c5a43d`. Bản mobile vẫn còn.

→ Chi tiết: [ProInterview/README.md](./ProInterview/README.md) · [ProInterview/CLAUDE.md](./ProInterview/CLAUDE.md)

## Prointerview-App/ — Mobile

App Expo/React Native (`mobile/`) dùng chung domain nghiệp vụ với bản web nhưng gọi vào **backend riêng** (`backend/`) — được tách ra từ bản web ở một thời điểm trước đó rồi phát triển độc lập.

Backend này đã được port thêm phần lớn tính năng của bản web (giỏ hàng, analytics/`UserEvent`, JaaS, booking check-in) và **vẫn giữ** phần phỏng vấn AI mà bản web đã gỡ.

→ Chi tiết: [Prointerview-App/README.md](./Prointerview-App/README.md) · [Prointerview-App/CLAUDE.md](./Prointerview-App/CLAUDE.md)

## Khác biệt thực tế giữa hai backend (đã kiểm chứng trên code hiện tại)

| | `ProInterview/backend` (web) | `Prointerview-App/backend` (mobile) |
|:--|:--|:--|
| `/api/cart` | ✅ đã mount (+ UI `CartDrawer` trên web) | ✅ đã mount |
| `/api/analytics` + model `UserEvent` | ✅ | ✅ |
| JaaS video meeting (`jaasService.js`) | ✅ | ✅ |
| Booking check-in (`mentorCheckIn*`) | ✅ | ✅ |
| `/api/interviews`, `/api/ai`, `InterviewSession` | ❌ đã gỡ | ✅ còn |
| Vòng đời tài khoản admin (`accountClosureService`, `mentorSuspensionRefundService`, `Mentor.status`) | ✅ | ❌ |
| Audit log admin (`adminAuditLog`, `GET /api/admin/audit-log`) | ✅ | ❌ |
| Hoá đơn PDF (`invoiceService`, `GET /api/payments/:id/invoice`) | ✅ | ❌ |
| Background jobs | 5 (reminder, stale sweep, streak, plan expiry, earnings clearance) | 1 (booking reminder) |
| Số Mongoose schema | 20 | 21 (thêm `InterviewSession`) |

## Tài khoản dev mặc định (sau khi seed, áp dụng cho cả hai backend)

Mật khẩu: **`Dev123456`**

| Email | Role |
|:------|:-----|
| `customer@dev.local` | Customer |
| `mentor@dev.local` | Mentor |
| `admin@dev.local` | Admin (app mobile chặn đăng nhập admin — chỉ dùng trên web) |

## Ghi chú quan trọng khi làm việc trên repo này

- Không có `package.json` ở root để orchestrate cả hai — mỗi sản phẩm chạy độc lập, xem README riêng của từng thư mục để biết lệnh dev.
- Trước khi sửa backend, xác định rõ đang làm việc trên `ProInterview/backend` hay `Prointerview-App/backend` — đây là hai codebase khác nhau, không phải symlink/submodule.
- `API_INDEX.md` / `ROADMAP.md` tồn tại ở cả hai thư mục nhưng **đã lệch so với code**; `README.md` + `CLAUDE.md` của từng thư mục là nguồn chân lý gần nhất.
