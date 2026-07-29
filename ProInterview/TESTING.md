# Kịch bản test — ProInterview (bản đã deploy)

Bộ kịch bản kiểm thử thủ công cho site chạy trên Vercel + Render. Đi từ smoke test 5 phút tới các luồng nghiệp vụ đầy đủ theo từng vai trò, kết thúc bằng các phép đối soát tiền và test tiêu cực.

> Deploy chưa xong thì xem [DEPLOYMENT.md](./DEPLOYMENT.md) trước.

---

## 1. Chuẩn bị dữ liệu

### 1.1 Nạp mock data

Ngoài `npm run seed:all` (dữ liệu nền chung), có script riêng dựng các **trạng thái khó tạo bằng tay** — booking đã hoàn tiền, thanh toán bị giữ, mentor đóng được vs mentor bị chặn đóng:

```bash
cd ProInterview/backend
# Trỏ MONGO_URI trong .env vào Atlas production, rồi:
node src/scripts/seedDemoShowcase.js --dry-run   # xem trước sẽ tạo gì
node src/scripts/seedDemoShowcase.js             # tạo thật
node src/scripts/seedDemoShowcase.js --clean     # dọn sạch khi test xong
```

**An toàn:** script chỉ đụng document có email `@demo.local` hoặc `providerRef` bắt đầu bằng `DEMO-`. Dữ liệu thật và dữ liệu `seed:all` không bị ảnh hưởng. Chạy lại nhiều lần không nhân bản.

### 1.2 Tài khoản test

Mật khẩu tất cả: **`Demo123456`**

| Email | Vai trò | Dùng để test |
|:------|:--------|:-------------|
| `hv.free@demo.local` | Học viên — gói Free | Đã dùng 2/3 lượt CV → test chặn quota |
| `hv.student@demo.local` | Học viên — gói Student | Lịch sử thanh toán, hoá đơn, khoá học, booking |
| `hv.pro@demo.local` | Học viên — gói Professional | Ưu đãi 10%, quota không giới hạn |
| `hv.refund@demo.local` | Học viên | Đang chờ hoàn tiền do mentor no-show |
| `mt.senior@demo.local` | Mentor | Đầy đủ: khoá học, booking mọi trạng thái, số dư rút được |
| `mt.new@demo.local` | Mentor | Hồ sơ chờ admin duyệt |
| `mt.suspend@demo.local` | Mentor | 3 report → test tạm ngưng + hoàn tiền học viên |
| `mt.closable@demo.local` | Mentor | Mọi số dư = 0 → đóng tài khoản **phải thành công** |
| `mt.blocked@demo.local` | Mentor | Còn tiền treo → đóng **phải bị chặn** kèm lý do |

Admin dùng `admin@dev.local` / `Dev123456` (từ `seed:all`).

### 1.3 Dữ liệu mock đã dựng sẵn

| Nhóm | Chi tiết |
|:-----|:---------|
| Booking (9) | Hoàn thành + đã giải phóng tiền · Hoàn thành + đang giữ tiền · Sắp diễn ra · Chờ chuyển khoản · Hủy muộn hoàn 50% · Mentor no-show hoàn 100% (chờ admin) · Học viên no-show · Buổi sẽ bị hoàn khi khóa mentor · Buổi chặn đóng tài khoản |
| Giao dịch (15) | `success` · `pending` · `partial_refund` · `refund_pending` · `held_inactive_account` · `failed`, trải đều booking / khoá học / gói cước |
| Ghi danh (3) | `platformFee` đã tính · `platformFee = null` (chưa tính) · `platformFee = 0` (miễn phí thật) |
| Khoá học (3) | 1 published trả phí (có giảm giá) · 1 free · 1 chờ admin duyệt |
| Khác | 2 subscription (1 hết hạn sau 5 ngày) · 5 đánh giá · 3 báo cáo · 3 yêu cầu rút tiền · 5 lịch sử phân tích CV · 7 thông báo |

---

## 2. Smoke test — 5 phút

Chạy trước mỗi lần deploy mới. Hỏng ở đâu thì dừng, sửa rồi mới đi tiếp.

| # | Việc cần làm | Kỳ vọng |
|:--|:-------------|:--------|
| S1 | Mở `https://<backend>.onrender.com/api/health` | JSON `success: true`, Mongo connected |
| S2 | Mở `https://<cv-service>.onrender.com/docs` | Trang Swagger UI |
| S3 | Mở trang chủ Vercel | Load được, Console không có lỗi đỏ |
| S4 | F12 → Network → kiểm tra request `/api/*` | Trỏ đúng domain Render, status 200, không CORS error |
| S5 | Đăng nhập `hv.student@demo.local` | Vào được dashboard, hiện tên "Nguyễn Thu Hà" |
| S6 | Mở `/mentors` | Hiện danh sách có 5 mentor demo, ảnh đại diện load được |

> Lần đầu gọi API sau khi Render ngủ sẽ mất ~50 giây. Đợi hết cold start rồi mới kết luận là lỗi.

---

## 3. Vai trò: Khách vãng lai (chưa đăng nhập)

| # | Việc cần làm | Kỳ vọng |
|:--|:-------------|:--------|
| G1 | Mở `/mentors`, lọc theo lĩnh vực "Technology" | Ra mentor senior/blocked, không ra mentor đã đóng |
| G2 | Mở hồ sơ mentor "Đặng Vũ Thành" | Hiện bio, giá 900.000đ, 4.8 sao, danh sách đánh giá |
| G3 | Bấm "Đặt lịch" khi chưa đăng nhập | Chuyển sang trang đăng nhập, **không** trắng trang |
| G4 | Mở `/courses` | 2 khoá published (không hiện khoá `pending_review`) |
| G5 | Mở khoá "Viết CV kỹ thuật…" (free) | Xem được bài học đánh dấu miễn phí |
| G6 | Mở khoá trả phí, bấm học bài không miễn phí | Chặn lại, mời ghi danh |
| G7 | Mở `/pricing` | 3 gói: Free / Student 150.000đ / Professional 500.000đ |
| G8 | Gõ tay URL `/admin` | Đá về trang chủ hoặc đăng nhập, **không** hiện giao diện admin |
| G9 | Gõ tay URL `/profile` | Yêu cầu đăng nhập |

---

## 4. Vai trò: Học viên

### 4.1 Xác thực

| # | Việc cần làm | Kỳ vọng |
|:--|:-------------|:--------|
| C1 | Đăng ký email mới | Tạo tài khoản, nhận thông báo chào mừng trong chuông |
| C2 | Kiểm tra hộp thư email vừa đăng ký | Nhận email xác thực (nếu đã cấu hình SMTP) |
| C3 | Đăng nhập sai mật khẩu 5 lần liên tiếp | Bị khóa tạm thời, báo lỗi rõ ràng |
| C4 | Đăng nhập bằng Google | Vào được; lần đầu nhận **email mật khẩu ban đầu** |
| C5 | Quên mật khẩu → đặt lại qua link email | Đổi được, và **token cũ bị vô hiệu** (tab khác bị đăng xuất) |
| C6 | Đăng nhập, mở `/settings` → phần phiên đăng nhập | Thấy danh sách thiết bị, thu hồi được |
| C7 | Đăng xuất rồi bấm Back của trình duyệt | Không vào lại được trang cần đăng nhập |

### 4.2 Phân tích CV/JD — `hv.free@demo.local`

| # | Việc cần làm | Kỳ vọng |
|:--|:-------------|:--------|
| C10 | Mở `/cv-analysis` | Hiện 2 lựa chọn: theo JD và theo lĩnh vực |
| C11 | Chọn "theo JD", tải lên 1 CV PDF + 1 JD PDF | Hiện `AiLoadingState`: video mascot, thông điệp đổi theo bước, thanh tiến trình, mẹo xoay vòng |
| C12 | Đợi phân tích xong | Ra điểm khớp, kỹ năng khớp/thiếu, gợi ý viết lại bullet |
| C13 | Mở `/cv-analysis/jd/history` | Thấy lần vừa chạy + 1 bản ghi mock cũ |
| C14 | Mở lại kết quả cũ từ lịch sử | Hiện đúng nội dung đã lưu |
| C15 | Chạy phân tích lần nữa (đã dùng 3/3) | **Chặn vì hết quota**, mời nâng gói — không phải lỗi 500 |
| C16 | Bấm gửi 2 request phân tích liên tiếp thật nhanh | Request thứ 2 bị chặn (`cvAnalysisInFlight`), không đốt 2 lần gọi LLM |
| C17 | Đăng nhập `hv.pro@demo.local`, chạy phân tích | Chạy được (quota 999) |
| C18 | Tải lên file không phải PDF | Báo lỗi định dạng rõ ràng |

### 4.3 Đặt lịch mentor — `hv.student@demo.local`

| # | Việc cần làm | Kỳ vọng |
|:--|:-------------|:--------|
| C20 | Mở hồ sơ `mt.senior`, chọn ngày + khung giờ trống | Lịch chỉ hiện ngày trong tuần, 5 khung giờ/ngày |
| C21 | Chọn khung giờ **đã có người đặt** (ngày mai 10:30) | Khung này không chọn được / báo đã kín |
| C22 | Đặt buổi mock interview 60 phút | Ra trang thanh toán, giá gốc 900.000đ |
| C23 | Kiểm tra bảng giá ở bước thanh toán | **Giảm 5%** (gói Student), có VAT 8%, tổng khớp |
| C24 | Xem QR chuyển khoản | Hiện QR VietQR + số tài khoản + nội dung CK |
| C25 | Bấm "Tôi đã chuyển khoản" | Chuyển sang trạng thái chờ admin xác nhận |
| C26 | Mở `/my-bookings` | Buổi mới ở trạng thái chờ; các buổi cũ đúng trạng thái |
| C27 | Mở buổi "ngày mai 10:30" (đã thanh toán) | Có nút vào phòng họp |
| C28 | Bấm vào phòng họp **trước giờ hẹn nhiều** | Chặn hoặc báo chưa tới giờ (không cho vào tùy tiện) |
| C29 | Hủy 1 buổi đã thanh toán | Hiện rõ % hoàn theo chính sách + form khai báo STK nhận tiền |
| C30 | Mở buổi đã hoàn thành (12 ngày trước) | Thấy bản tổng kết của mentor: điểm mạnh, điểm cần cải thiện |
| C31 | Đánh giá mentor sau buổi hoàn thành | Gửi được; điểm trung bình mentor cập nhật |
| C32 | Thử đánh giá lần 2 cùng buổi đó | Bị chặn (mỗi buổi 1 đánh giá) |
| C33 | Thử báo cáo mentor ở buổi **vừa đặt, chưa diễn ra** | **Bị chặn** — chỉ báo cáo được sau buổi `completed`/`no_show` |

### 4.4 Khoá học và giỏ hàng

| # | Việc cần làm | Kỳ vọng |
|:--|:-------------|:--------|
| C40 | Mở khoá "System Design", bấm thêm vào giỏ | Icon giỏ tăng số lượng |
| C41 | Mở giỏ hàng (Navbar) | Hiện đúng khoá, giá **890.000đ** (giá giảm, không phải 1.200.000đ) |
| C42 | Thêm cùng khoá đó lần nữa | Không nhân đôi |
| C43 | Xoá khỏi giỏ rồi thêm lại | Hoạt động đúng |
| C44 | Thanh toán giỏ hàng | Ra luồng chuyển khoản, tạo bản ghi chờ xác nhận |
| C45 | Mở `/my-courses` | Thấy khoá "System Design" (50% tiến độ) + khoá free (100%) |
| C46 | Vào học khoá free, xem hết bài | Tiến độ cập nhật, chế độ toàn màn hình không có sidebar |
| C47 | Ghi danh khoá free | Vào học ngay, không qua thanh toán |
| C48 | Mở khoá đang chờ duyệt bằng URL trực tiếp | Không xem được (chưa published) |

### 4.5 Thanh toán và hoá đơn — `hv.student@demo.local`

| # | Việc cần làm | Kỳ vọng |
|:--|:-------------|:--------|
| C50 | Mở `/payment-history` | Liệt kê giao dịch: booking, khoá học, gói cước |
| C51 | Kiểm tra nhãn trạng thái từng dòng | Thành công / chờ / hoàn một phần / thất bại hiển thị đúng màu, đúng chữ |
| C52 | Tải hoá đơn PDF của 1 giao dịch thành công | Tải được, mở ra đúng số tiền, tên người mua, thông tin bên bán |
| C53 | Đăng nhập `hv.pro@demo.local` → `/payment-history` | Thấy giao dịch gói năm 4.800.000đ và giao dịch hoàn 50% |
| C54 | Kiểm tra dòng hoàn một phần | Ghi rõ đã hoàn 486.000đ, không hiển thị như giao dịch thành công bình thường |
| C55 | Thử tải hoá đơn của giao dịch **người khác** (sửa ID trên URL) | **Bị từ chối** — không đọc được dữ liệu người khác |

### 4.6 Hồ sơ và thông báo

| # | Việc cần làm | Kỳ vọng |
|:--|:-------------|:--------|
| C60 | Mở `/profile`, tải ảnh đại diện lên | Upload xong, **tải lại trang vẫn thấy ảnh** (xem mục 8) |
| C61 | Điền học vấn, kinh nghiệm, kỹ năng → Lưu | Lưu được, tải lại vẫn còn |
| C62 | Đổi mật khẩu trong `/settings` | Đổi được, các phiên khác bị đăng xuất |
| C63 | Mở chuông thông báo (`hv.student`) | Thấy nhắc buổi hẹn ngày mai + cảnh báo gói sắp hết hạn |
| C64 | Bấm vào 1 thông báo | Chuyển đúng trang liên quan, đánh dấu đã đọc |
| C65 | Đăng nhập `hv.refund@demo.local` | Thấy thông báo hoàn tiền kèm yêu cầu khai báo STK |
| C66 | Bấm vào thông báo hoàn tiền | Mở form nhập thông tin ngân hàng |
| C67 | Nâng gói từ Free lên Student ở `/pricing` | Ra checkout đúng giá 150.000đ |
| C68 | (`hv.student`) Nâng từ Student lên Professional | Giá được **quy đổi theo ngày còn lại**, không cộng dồn ngày miễn phí |

---

## 5. Vai trò: Mentor — `mt.senior@demo.local`

| # | Việc cần làm | Kỳ vọng |
|:--|:-------------|:--------|
| M1 | Đăng nhập | Tự chuyển tới `/mentor/dashboard` |
| M2 | Xem dashboard | Số buổi, thu nhập, đánh giá khớp dữ liệu seed |
| M3 | Mở `/mentor/schedule` | Thấy buổi sắp tới (ngày mai 10:30) và các buổi đã qua |
| M4 | Mở buổi đã thanh toán, bấm bắt đầu | Yêu cầu **check-in bằng ảnh webcam** trước khi vào phòng |
| M5 | Chụp ảnh check-in và vào phòng | Vào được phòng họp (JaaS thật, hoặc Jitsi nếu chưa cấu hình JaaS) |
| M6 | Trong phòng, ghi chú nhanh / gắn tag | Lưu được vào buổi |
| M7 | Kết thúc buổi, gửi bản tổng kết | Học viên nhận được và xem được |
| M8 | Tự báo học viên vắng mặt (sau 15 phút) | Buổi tính như hoàn thành, **mentor nhận đủ tiền**, học viên không được hoàn |
| M9 | Đổi lịch 1 buổi | Học viên nhận thông báo, lịch sử đổi được ghi lại |
| M10 | Mở `/mentor/finance` | Số dư khả dụng 4.200.000đ, đang giữ 1.260.000đ |
| M11 | Thêm tài khoản nhận tiền — **để trống số tài khoản** | Nút "Tiếp tục" **bị mờ**, không bấm được |
| M12 | Nhập tên ngân hàng + STK hợp lệ và tích xác nhận | Nút "Tiếp tục" mới sáng lên |
| M13 | Yêu cầu rút 2.000.000đ | Tạo yêu cầu, trạng thái chờ duyệt |
| M14 | Thử rút nhiều hơn số dư khả dụng | Bị chặn, báo lỗi rõ ràng |
| M15 | Thử rút cả phần "đang giữ" | Không rút được — tiền chưa tới hạn giải phóng |
| M16 | Mở `/mentor/courses` | 3 khoá: 1 published, 1 free, 1 chờ duyệt |
| M17 | Sửa khoá đã published | Chuyển sang trạng thái chờ duyệt lại |
| M18 | Tạo khoá mới qua trình tạo nhiều bước | Tạo được, vào hàng chờ duyệt |
| M19 | Mở `/mentor/peer-review` | Thấy khoá của mentor khác cần đánh giá chéo |
| M20 | Bấm mở đề cương khoá học trong peer review | Mở ở **tab mới**, không mất form đang điền |
| M21 | Mở `/mentor/analytics` | Biểu đồ có dữ liệu, không trắng trang |
| M22 | Mở `/mentor/reviews` | Thấy đánh giá 5 sao và 4 sao; trả lời được đánh giá |
| M23 | Gõ tay URL `/admin` | Bị chặn |

---

## 6. Vai trò: Admin — `admin@dev.local`

### 6.1 Người dùng và mentor

| # | Việc cần làm | Kỳ vọng |
|:--|:-------------|:--------|
| A1 | Đăng nhập | Tự chuyển tới `/admin` |
| A2 | Mở `/admin/users`, tìm "demo.local" | Lọc **phía server**, phân trang hoạt động |
| A3 | Mở chi tiết `hv.student` | Thấy gói, quota, booking, giao dịch của user |
| A4 | Mở `/admin/mentors/pending` | Thấy `mt.new` đang chờ duyệt |
| A5 | Duyệt hồ sơ `mt.new` | Chuyển sang đã duyệt, mentor hiện ra ở `/mentors` |
| A6 | Mở `/admin/mentors`, bấm khóa `mt.suspend` | **Hiện hộp xác nhận trước**, không khóa ngay |
| A7 | Thử tự khóa chính tài khoản admin đang dùng | **Bị chặn** |
| A8 | Thử khóa một admin khác | **Bị chặn** |
| A9 | Mở `/admin/reviews` | Ẩn/hiện được đánh giá 2 sao |

### 6.2 Vòng đời tài khoản — phần quan trọng nhất

| # | Việc cần làm | Kỳ vọng |
|:--|:-------------|:--------|
| A10 | Mở chi tiết `mt.suspend` → xem trước tác động khi khóa | Liệt kê số buổi sẽ bị hủy và số tiền phải hoàn **trước khi** thực hiện |
| A11 | Tạm ngưng `mt.suspend` | Buổi đã trả tiền chưa diễn ra (ngày +4) chuyển sang chờ hoàn tiền, học viên nhận thông báo |
| A12 | Kiểm tra buổi đã hoàn thành của mentor đó | **Không bị đụng tới** |
| A13 | Kiểm tra buổi **chưa thanh toán** của mentor đó | **Không hoàn tiền** (chưa thu thì không hoàn) |
| A14 | Đăng nhập lại bằng `mt.suspend` | **Vẫn đăng nhập được** |
| A15 | (mentor bị tạm ngưng) Vào `/mentor/finance` yêu cầu rút tiền | **Vẫn rút được** — chặn hoạt động không đồng nghĩa chặn tiền |
| A16 | (mentor bị tạm ngưng) Thử sửa lịch rảnh / tạo khoá học | **Bị chặn** |
| A17 | Tìm `mt.suspend` ở trang `/mentors` công khai | **Không còn xuất hiện** |
| A18 | Admin tạo yêu cầu rút tiền thay mặt mentor bị khóa | Tạo được |
| A19 | Mở `mt.closable` → bấm đóng tài khoản | **Thành công** (mọi số dư = 0, không dòng treo) |
| A20 | Kiểm tra dữ liệu sau khi đóng | Hồ sơ mentor và lịch sử tài chính **vẫn còn**, thông tin cá nhân đã ẩn danh |
| A21 | Mở `mt.blocked` → bấm đóng tài khoản | **Bị chặn**, liệt kê lý do: còn số dư, còn dòng chưa giải phóng, còn yêu cầu rút chờ duyệt |
| A22 | Mở `/admin/audit-log` | Ghi nhận mọi thao tác vừa làm ở A5–A21 |

> Đã kiểm chứng trên chính bộ mock data này: `mt.closable` qua được tất cả 7 điều kiện; `mt.blocked` fail 4 điều kiện (`clearingBalance`, `availableBalance`, `noUnclearedRows`, `noOpenPayouts`).

### 6.3 Tài chính

| # | Việc cần làm | Kỳ vọng |
|:--|:-------------|:--------|
| A30 | Mở `/admin/finance-overview` (Thu · Chi · Lợi nhuận) | Hiện tổng thu, tổng chi, lợi nhuận + **phép đối chiếu tự kiểm chứng khớp** |
| A31 | So widget doanh thu ở `/admin` với `/admin/finance` | **Hai số phải bằng nhau** (dùng chung một component tính) |
| A32 | Kiểm tra doanh thu có tính gói cước không | **Có** — 150.000đ + 4.800.000đ phải nằm trong tổng thu |
| A33 | Kiểm tra booking hoàn 50% | Doanh thu chỉ tính phần giữ lại, **không tính đủ 100%** |
| A34 | Mở `/admin/bookings`, tìm nhóm "Đã hoàn cho học viên" | Nhóm này **tồn tại và có dữ liệu** |
| A35 | Mở `/admin/transactions` | Thấy giao dịch chờ xác nhận của `hv.free` |
| A36 | Xác nhận giao dịch chuyển khoản đó | Booking chuyển sang đã thanh toán, học viên nhận thông báo |
| A37 | Mở hàng đợi thanh toán bị giữ | Thấy giao dịch `held_inactive_account` 150.000đ của `hv.free` |
| A38 | Xử lý giao dịch bị giữ | Quyết được: xác nhận hoặc hoàn tiền |
| A39 | Mở `/admin/subscription-payments` | **Một bảng** lọc theo trạng thái + lịch sử người mua (không phải nhiều bảng rời) |
| A40 | Mở `/admin/course-payments` | Thấy 3 ghi danh |
| A41 | Kiểm tra ghi danh có `platformFee = null` | Hiển thị **"chưa tính"**, không hiển thị "0đ" |
| A42 | Kiểm tra ghi danh khoá miễn phí | Hiển thị **"0đ"** — miễn phí thật, khác với "chưa tính" |
| A43 | Mở `/admin/payouts` | 1 yêu cầu chờ duyệt của `mt.senior`, 1 đã trả |
| A44 | Duyệt rồi đánh dấu đã chuyển tiền | Trạng thái đổi đúng, số dư mentor giảm tương ứng |
| A45 | Mở buổi đang chờ hoàn tiền của `hv.refund` | Thấy thông tin ngân hàng học viên đã khai |
| A46 | Xác nhận đã chuyển tiền hoàn | Trạng thái chuyển sang đã hoàn, có ghi nhận người thao tác |

### 6.4 Nội dung, kiểm duyệt, phân tích

| # | Việc cần làm | Kỳ vọng |
|:--|:-------------|:--------|
| A50 | Mở `/admin/content/courses` | Thấy khoá "Đàm phán lương" đang chờ duyệt |
| A51 | Duyệt khoá đó | Xuất hiện ở `/courses` công khai |
| A52 | Từ chối 1 khoá kèm lý do | Mentor thấy được lý do |
| A53 | Mở trang báo cáo khiếu nại | Report **gộp theo từng mentor**, không phải danh sách rời rạc |
| A54 | Xử lý hết report của `mt.suspend` | Mentor **tự động được mở lại** khỏi trạng thái tạm ngưng do report |
| A55 | Mở `/admin/analytics` | Biểu đồ hành vi có dữ liệu |
| A56 | Mở hành trình của 1 người dùng cụ thể | Hiện chuỗi sự kiện theo thời gian |
| A57 | Mở `/admin/bookings/check-ins` | Thấy ảnh check-in của mentor |
| A58 | Mở `/admin/settings` | Load được, sửa được cấu hình |

---

## 7. Kịch bản xuyên suốt (end-to-end)

Chạy trọn vẹn, không tách rời — đây là thứ phát hiện lỗi tích hợp mà test lẻ bỏ sót.

### E1 — Vòng đời đặt lịch đầy đủ

1. `hv.free` đăng nhập → phân tích CV với JD
2. Từ kết quả, bấm gợi ý tìm mentor → mở hồ sơ `mt.senior`
3. Đặt buổi mock interview, chọn khung giờ trống
4. Thanh toán chuyển khoản → bấm "đã chuyển"
5. **Admin** xác nhận giao dịch → học viên nhận thông báo
6. **Mentor** thấy buổi mới ở lịch, xác nhận
7. Tới giờ: mentor check-in bằng ảnh → vào phòng họp
8. Học viên vào phòng họp cùng buổi
9. Mentor kết thúc buổi, gửi bản tổng kết
10. Học viên đánh giá mentor
11. **Mentor**: kiểm tra tiền đã vào mục "đang giữ", chưa rút được
12. **Admin**: kiểm tra doanh thu ở `/admin/finance-overview` đã tăng đúng số

**Kỳ vọng:** mỗi bước đều có thông báo cho đúng người, số tiền nhất quán từ đầu tới cuối.

### E2 — Khóa mentor kèm hoàn tiền

1. **Admin** mở `mt.suspend` → xem trước tác động
2. Ghi lại số buổi sẽ hủy và số tiền sẽ hoàn
3. Tạm ngưng mentor
4. Kiểm tra: đúng số buổi đó bị hủy, không thừa không thiếu
5. **Học viên** `hv.refund` nhận thông báo, khai báo STK
6. **Admin** xác nhận đã chuyển hoàn
7. Kiểm tra `/admin/finance-overview`: khoản hoàn được trừ khỏi doanh thu
8. **Mentor bị tạm ngưng** đăng nhập → vẫn rút được tiền, không sửa được lịch

### E3 — Mua khoá học qua giỏ hàng

1. `hv.pro` thêm 2 khoá vào giỏ (1 trả phí, 1 free)
2. Thanh toán → **Admin** xác nhận
3. Học viên vào học, hoàn thành khoá free
4. **Mentor** kiểm tra thu nhập từ khoá học tăng đúng
5. **Admin** đối chiếu ở `/admin/course-payments`

### E4 — Đóng tài khoản

1. **Admin** thử đóng `mt.blocked` → bị chặn, đọc danh sách lý do
2. Duyệt + chi trả yêu cầu rút tiền của mentor đó
3. Đợi (hoặc chỉnh DB) để khoản đang giữ được giải phóng, rồi chi nốt
4. Thử đóng lại → lúc này phải thành công
5. Kiểm tra lịch sử tài chính vẫn nguyên vẹn sau khi đóng

---

## 8. Đối soát tiền — làm bằng máy tính, không ước lượng

Đây là phần dễ sai nhất và cũng là phần đã từng có bug thật.

| # | Phép kiểm tra | Cách làm |
|:--|:--------------|:---------|
| $1 | Giá booking | `900.000 × 0,95 (gói Student)` + VAT 8% = số hiện trên checkout |
| $2 | Hoa hồng nền tảng | Buổi 900.000đ → phí 30% = 270.000đ → mentor nhận 630.000đ |
| $3 | Doanh thu ≠ tiền thu vào | Buổi hoàn 50%: thu 972.000đ nhưng doanh thu chỉ tính phần giữ lại |
| $4 | Dashboard vs trang tài chính | Hai con số phải **bằng nhau tuyệt đối** |
| $5 | Gói cước trong doanh thu | Tổng thu phải bao gồm 150.000đ + 4.800.000đ |
| $6 | Phép đối chiếu trang Thu–Chi–Lợi nhuận | Thu − Chi = Lợi nhuận, và khớp với tổng các phần |
| $7 | Số dư mentor | Khả dụng + đang giữ = tổng đã kiếm − đã rút |
| $8 | Sau khi duyệt rút tiền | Số dư khả dụng giảm **đúng bằng** số đã duyệt |
| $9 | `platformFee` null vs 0 | Null hiện "chưa tính"; 0 hiện "0đ". **Không được gộp làm một** |
| $10 | Tiền của buổi học viên no-show | Mentor nhận đủ, học viên không được hoàn |

---

## 9. Test tiêu cực và bảo mật

| # | Việc cần làm | Kỳ vọng |
|:--|:-------------|:--------|
| N1 | Học viên gọi thẳng API admin (Postman, token học viên) | 403 |
| N2 | Sửa ID trên URL để xem booking người khác | Bị từ chối |
| N3 | Tải hoá đơn của người khác | Bị từ chối |
| N4 | Gửi `role: "admin"` trong `PATCH /api/auth/me` | **Bị từ chối thẳng** |
| N5 | Dùng token đã đăng xuất | 401 |
| N6 | Đặt 2 buổi cùng mentor, cùng khung giờ, 2 tab song song | Chỉ 1 buổi thành công (chặn ở tầng database) |
| N7 | Tải file 50MB lên | Bị chặn theo giới hạn dung lượng |
| N8 | Tải file `.exe` đổi đuôi thành `.pdf` | Bị chặn |
| N9 | Nhập `<script>alert(1)</script>` vào ô bio | Hiển thị dạng chữ, **không chạy** |
| N10 | Nhập `{"$gt": ""}` vào ô đăng nhập | Không bypass được (đã lọc ký tự đặc biệt trong key) |
| N11 | Gọi 1 API hơn 500 lần trong 15 phút | Bị chặn `429` |
| N12 | Admin thực hiện hơn 30 thao tác ghi trong 1 phút | Bị chặn |
| N13 | Số tiền âm trong yêu cầu rút | Bị từ chối |
| N14 | Đặt lịch vào ngày trong quá khứ | Bị từ chối |
| N15 | Học viên gọi API check-in của mentor | 403 |

---

## 10. Giao diện và thiết bị

| # | Việc cần làm | Kỳ vọng |
|:--|:-------------|:--------|
| U1 | Thu nhỏ trình duyệt xuống 375px | Không tràn ngang, menu chuyển sang dạng mobile |
| U2 | Mở trên điện thoại thật | Bấm được, chữ đọc được |
| U3 | Tải trang khi mạng chậm (throttle 3G) | Có trạng thái đang tải, không trắng trang |
| U4 | Ngắt mạng giữa chừng rồi thao tác | Báo lỗi rõ ràng, không treo vô hạn |
| U5 | Bấm F5 ở trang bất kỳ | Không mất trạng thái đăng nhập |
| U6 | Bấm Back/Forward liên tục | Điều hướng đúng (hash router) |
| U7 | Mở 2 tab, đăng xuất ở tab 1 | Tab 2 cũng mất quyền khi thao tác tiếp |
| U8 | Kiểm tra chính tả tiếng Việt các nút chính | Đủ dấu, đúng chính tả |

---

## 11. Bảng ghi kết quả

Sao chép để theo dõi từng đợt test:

```
Ngày test: ___________   Người test: ___________   Commit: ___________

Nhóm                          Đạt   Hỏng   Bỏ qua   Ghi chú
Smoke test (S1–S6)            ___   ___    ___      _______________
Khách vãng lai (G1–G9)        ___   ___    ___      _______________
Học viên (C1–C68)             ___   ___    ___      _______________
Mentor (M1–M23)               ___   ___    ___      _______________
Admin (A1–A58)                ___   ___    ___      _______________
Xuyên suốt (E1–E4)            ___   ___    ___      _______________
Đối soát tiền ($1–$10)        ___   ___    ___      _______________
Bảo mật (N1–N15)              ___   ___    ___      _______________
Giao diện (U1–U8)             ___   ___    ___      _______________
```

**Mức độ ưu tiên khi có lỗi:**

| Mức | Tiêu chí | Ví dụ |
|:----|:---------|:------|
| Chặn phát hành | Sai tiền, lộ dữ liệu, không đăng nhập được | Doanh thu tính dư, xem được booking người khác |
| Cao | Luồng chính đứt | Không đặt được lịch, không thanh toán được |
| Trung bình | Có đường vòng | Bộ lọc sai, phân trang lỗi |
| Thấp | Thẩm mỹ | Lệch khoảng cách, sai chính tả |

---

## 12. Dọn dẹp sau khi test

```bash
cd ProInterview/backend
node src/scripts/seedDemoShowcase.js --clean
```

Xoá toàn bộ dữ liệu `@demo.local`. Nếu đã đổi mật khẩu các tài khoản `@dev.local` trong lúc test thì chạy lại `npm run seed:users` trên database trống, hoặc đặt lại thủ công.

> Trước khi bàn giao hoặc chấm điểm: **đổi mật khẩu mọi tài khoản `@dev.local`** — chúng được ghi công khai trong tài liệu.

---

## Tài liệu liên quan

| File | Nội dung |
|:-----|:---------|
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Deploy Vercel + Render + Atlas, env var, troubleshooting |
| [README.md](./README.md) | Tổng quan sản phẩm, chạy dev local |
| [CLAUDE.md](./CLAUDE.md) | Kiến trúc, quy tắc domain (tiền, vòng đời tài khoản) |
| [POSTMAN_TESTING.md](./POSTMAN_TESTING.md) | Test API bằng Postman |
