# Rà soát Mock API & dữ liệu giả — ProInterview

> **Ngày rà:** 19/05/2026  
> **Phạm vi:** Toàn bộ `frontend/src`, `backend/src` (route mock, payment stub), file `data/`.  
> **Cách đọc:** 🔴 = ảnh hưởng dữ liệu thật trên UI production · 🟡 = fallback/local/demo · 🟢 = đã API thật · ⚪ = marketing/dev, chấp nhận được

---

## 1. Tóm tắt nhanh

| Mức | Số lượng ước lượng | Ý nghĩa |
|-----|-------------------|---------|
| 🔴 Cần migrate | **0** (đã xử lý 3 mục 19/05) | — |
| 🟡 Fallback client | **5** | `localStorage` + seed; API có nhưng chưa bỏ mock |
| 🟢 Đã nối API | **40+ màn** | Booking flow, mentor, admin, CV, interview, … |
| ⚪ Cố ý / dev | **6** | Home demo, AvatarDemo, `/api/mock`, seed DB |

**Frontend không gọi** `GET /api/mock/*` — route mock backend chỉ phục vụ dev/test thủ công.

**Thanh toán production (FE):** Checkout / Pricing dùng **chuyển khoản CK** (`bookingsApi`, `paymentsApi.createSubscriptionTransferPending`). `initiatePayment()` (gateway `mock=1`) **không được page nào import**.

---

## 2. 🔴 Ưu tiên cao — đã sửa (19/05/2026)

| Mục | Trạng thái |
|-----|------------|
| `Dashboard.jsx` + `bookings.js` | ✅ Chỉ `listBookings()` API; bỏ `UPCOMING_SESSIONS` mock |
| `Home.jsx` | ✅ `fetchCourses()` + `mapApiCourseToCard` |
| `CourseRecommendations.jsx` | ✅ `fetchCourses()`; lọc tag trên dữ liệu API |

---

## 2b. ~~Ưu tiên cao~~ (archive)

<details>
<summary>Chi tiết trước khi sửa</summary>

### 2.1 `Dashboard.jsx` + `utils/bookings.js`

Gộp mock `UPCOMING_SESSIONS` — **đã bỏ**.

### 2.2 `Home.jsx`

`COURSES_DATA` tĩnh — **đã thay bằng API**.

### 2.3 `CourseRecommendations.jsx`

`COURSES_DATA` — **đã thay bằng API**.

</details>

---

## 3. 🟡 Fallback / localStorage

> **Cập nhật 20/05:** history, MeetingRoom, MentorSchedule, CVAnalysis, CourseLearning Q&A + ghi chú đã xử lý.

### 3.1 `utils/history.js`

| Export / hành vi | Mock seed | API thay thế |
|------------------|-----------|----------------|
| `getCVAnalysisHistory()` | `CV_ANALYSIS_HISTORY` seed lần đầu | ✅ `fetchCvAnalyses()` — `AnalysisHistory.jsx` đã dùng API |
| `getStoredInterviewHistory()` | `INTERVIEW_HISTORY` seed | Interview session: ✅ `interviewsApi` |
| `getLatestCVAnalysis()` | Đọc local trước | `getSuggestedBookingDataAsync()` **đã ưu tiên** `fetchCvAnalyses()` |
| `saveUploadedCV`, file JD | Chỉ metadata tên file trong `localStorage` | Upload thật: `/api/upload/cv` (Profile/CVAnalysis) |
| `addCVAnalysisRecord` | `@deprecated` — vẫn ghi local | Không dùng sau khi lưu qua `/api/cv/analyses` |

**Còn dùng mock/local:**

- `Interview.jsx` — `getLatestCVAnalysis`, `getUploadedCV`, `saveUploadedCV` (gợi ý CV khi bắt đầu phỏng vấn).
- `Booking.jsx` — `getSuggestedBookingDataAsync()` (đã hybrid API → local).

### 3.2 `utils/meetings.js` — ✅ đã bỏ khỏi luồng chính

| | |
|--|--|
| **Trước** | `MeetingRoom` ghi join code vào `localStorage` |
| **Hiện tại** | Chỉ `startBookingMeeting` API + embed Jitsi theo `bookingId` |
| **File** | `@deprecated` — không còn import từ page production |

### 3.3 `MentorSchedule.jsx` — modal availability

| | |
|--|--|
| **Hành vi** | Nếu mentor chưa có `recurringSchedule`, modal khởi tạo **trống**; thêm slot thủ công hoặc “Thêm slot” |
| **API** | `fetchMentorAvailability` / `updateMyMentorAvailability` |

### 3.4 `CVAnalysis.jsx` — ✅ đã bỏ `DEMO_*`

Chỉ render panel kết quả khi có `analysisResult` từ API Python/Express; không còn điểm/gợi ý mẫu.

### 3.5 `CourseLearning.jsx` — Q&A & ghi chú bài học

| | |
|--|--|
| **Q&A** | ✅ `GET/POST /api/courses/:id/lessons/:lessonId/qa` |
| **Ghi chú** | ✅ `GET/PUT /api/courses/:id/lessons/:lessonId/notes` — lưu trên `Enrollment.lessonNotes` |
| **Nội dung khóa** | ✅ `fetchCourseById`, `fetchLessonContent` |

---

## 4. 🟢 Đã nối API thật (không còn mock HTTP cho domain chính)

Các page sau gọi `*Api.js` / `authFetch` tương ứng (liệt kê theo nhóm):

| Nhóm | Pages / components |
|------|-------------------|
| Auth | Login, Register, Forgot/Reset password, VerifyEmail, GoogleSignInBlock |
| Account | Dashboard (stats + cancel booking API), Profile, Settings, AccountDangerZone, LoginSessionsSection |
| Booking | Booking, Checkout (CK), SessionDetail, MyBookings, MentorReview, RescheduleModal, MeetingRoom (metadata) |
| Mentor | Dashboard, Schedule, Finance, Analytics, Reviews, PeerReview, CourseManagement, CourseEdit, MeetingDetail, SessionFeedback |
| Mentors | Mentors list, MentorProfile |
| Courses | Courses, CourseDetail, CourseLearning (nội dung), MyCourses |
| CV | CVAnalysis (analyze + save), AnalysisHistory |
| Interview | Interview, InterviewRoom, InterviewFeedback |
| Admin | Dashboard, Users, Mentors, MentorsPending, Bookings, SubscriptionPayments, CoursePayments, Placeholders (Finance, Transactions, Payouts, User/Booking/Mentor detail, ContentCourses, Reviews, Support reports, Analytics) |
| Khác | Navbar (notifications API), ReportMentorModal (`reportsApi`), PaymentReturn |

**Ghi chú:** `sessionType: "mock_interview"` là **loại buổi hẹn** (phỏng vấn giả định), không phải mock API.

---

## 5. ⚪ Chấp nhận được / dev-only

| Mục | Mô tả |
|-----|--------|
| `pages/interview/AvatarDemo.jsx` | Route `/avatar-demo` — scenario demo D-ID, không production flow |
| `Home.jsx` | `InterviewDemoMockup`, video marketing — UI tĩnh |
| `Login.jsx` | Quote marketing (“mock interview”) |
| `constants/mentorFilterFields.js` | Chip lọc lĩnh vực `Mentors.jsx` |
| `constants/reportCategories.js` | Nhãn báo cáo mentor (`ReportMentorModal`) |
| ~~`Navbar.jsx` `MOCK_NOTIFICATIONS`~~ | Đã dọn — notifications từ API |
| `backend` `/api/mock` | `mockCoursesController.js` — courses/enroll giả cho Postman/dev |
| `backend` `paymentsService` `mock=1` payUrl | Sandbox gateway; FE checkout CK **không** gọi `initiatePayment` |
| `backend` scripts `seed*.js` | Chỉ CLI seed MongoDB, không phải runtime FE |
| Upload BE | ✅ Trả URL file thật `/uploads/...` (không còn URL placeholder cứng trong controller) |

---

## 6. Backend — route & stub

| Endpoint / code | Trạng thái |
|-----------------|------------|
| `/api/mock/*` | Mock courses/enroll — **FE không dùng** |
| `POST /api/payments/initiate` (hoặc tương đương) | Trả `payUrl` + `mock: true` nếu không cấu hình VNPay |
| MoMo / ZaloPay trong `paymentsService` | Stub sandbox — ngoài phạm vi CK mặc định |
| Tất cả route Phase 1–4 trong `app.js` | ✅ Express thật + MongoDB |

---

## 7. File `data/` (đã dọn mock FE)

| Còn lại | Ghi chú |
|---------|---------|
| `data/README.md` | Ghi chú legacy đã xóa |
| ~~`mockData.js`, `coursesData.js`, `mentorMockData.js`, `seeds/*`~~ | Đã xóa — filter mentor → `constants/mentorFilterFields.js` |

---

## 8. ~~Thứ tự migrate đề xuất~~ *(đã xử lý chính)*

Các mục Dashboard/Home/bookings/meetings/CourseLearning/mock barrel đã migrate hoặc gỡ. Còn **`history.js` client cache** và **admin placeholders** nếu cần sprint sau.

---

## 9. Lệnh tự rà lại sau khi sửa

```powershell
rg "mockData|coursesData|mentorMockData|getAllBookings|UPCOMING_SESSIONS" frontend/src
rg "/api/mock" frontend/src
rg "getBookingById|getAllBookings|saveBooking" frontend/src
```

---

*Báo cáo này bổ sung cho `KIEM_TRA_XU_LY_LOI.md`. Cập nhật file khi hoàn tất thêm mục.*
