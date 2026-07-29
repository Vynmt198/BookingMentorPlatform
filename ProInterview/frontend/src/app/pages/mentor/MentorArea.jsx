import React from "react";
import { Outlet, useNavigate, Link } from "react-router";
import { PauseCircle } from "lucide-react";
import { getUser, hasAuthCredentials, authFetch } from "../../utils/auth.js";

/**
 * Hồ sơ đang tạm ngưng: mentor vẫn vào được khu /mentor/*, nhưng cần biết rõ cái gì bị chặn và
 * cái gì vẫn dùng được — đặc biệt là tiền, vì đó là lý do họ vẫn được đăng nhập.
 */
function SuspendedBanner() {
  return (
    <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-5">
      <div className="flex items-start gap-3">
        <PauseCircle size={20} className="mt-0.5 shrink-0 text-amber-600" />
        <div className="min-w-0 text-sm">
          <h3 className="font-black tracking-tight text-amber-900">Hồ sơ cố vấn đang tạm ngưng</h3>
          <p className="mt-1 font-semibold text-amber-800">
            Bạn đã bị ẩn khỏi tìm kiếm. Cho tới khi quản trị viên mở lại, bạn tạm thời không thể:
          </p>
          <ul className="mt-1.5 list-disc space-y-0.5 pl-5 font-semibold text-amber-800">
            <li>thêm hoặc sửa lịch rảnh để nhận booking mới</li>
            <li>tạo, chỉnh sửa, đăng khóa học và tải lên nội dung khóa</li>
            <li>tham gia đánh giá chéo</li>
            <li>phản hồi đánh giá của học viên</li>
            <li>cập nhật hồ sơ cố vấn hoặc gửi yêu cầu đổi giá</li>
          </ul>
          <p className="mt-2.5 font-semibold text-amber-900">
            <b>Tài chính không bị ảnh hưởng.</b> Bạn vẫn xem được số dư, các khoản đang giữ vẫn được
            giải phóng theo lịch, và bạn vẫn tạo được yêu cầu rút tiền tại{" "}
            <Link to="/mentor/finance" className="underline underline-offset-2">
              mục Tài chính
            </Link>
            . Các buổi hẹn đã nhận từ trước vẫn diễn ra bình thường để không ảnh hưởng học viên đã
            thanh toán.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Chỉ user đã được cấp role `mentor` (sau khi admin phê duyệt) mới vào được các route /mentor/*.
 * Ứng viên đang chờ duyệt vẫn là customer → chuyển về /profile.
 */
export function MentorArea() {
  const navigate = useNavigate();
  const user = getUser();
  const [mentorStatus, setMentorStatus] = React.useState("");

  React.useEffect(() => {
    if (user?.role !== "mentor") return;
    let cancelled = false;
    (async () => {
      try {
        const res = await authFetch("/api/mentor/status", { headers: { Accept: "application/json" } });
        const body = await res.json().catch(() => ({}));
        if (!cancelled && body?.success) setMentorStatus(body.status || "");
      } catch {
        // Không lấy được trạng thái thì thôi — không chặn khu mentor vì một lần fetch hỏng.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.role]);

  React.useEffect(() => {
    if (!hasAuthCredentials()) {
      navigate("/login?redirect=/mentor/dashboard", { replace: true });
      return;
    }
    if (user?.role !== "mentor") {
      navigate("/profile", { replace: true });
    }
    // `user` là object mới mỗi render (getUser parse localStorage) — dùng role dạng chuỗi.
  }, [user?.role, navigate]);

  if (!hasAuthCredentials() || !user || user.role !== "mentor") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm font-semibold text-slate-500">
        Đang chuyển hướng…
      </div>
    );
  }

  return (
    <div className="mentor-role-shell min-w-0" data-mentor-content>
      {mentorStatus === "suspended" ? <SuspendedBanner /> : null}
      <Outlet />
    </div>
  );
}
