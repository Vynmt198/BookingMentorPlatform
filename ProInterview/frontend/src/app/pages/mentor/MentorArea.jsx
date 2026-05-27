import React from "react";
import { Outlet, useNavigate } from "react-router";
import { getUser, hasAuthCredentials } from "../../utils/auth";

/**
 * Chỉ user đã được cấp role `mentor` (sau khi admin phê duyệt) mới vào được các route /mentor/*.
 * Ứng viên đang chờ duyệt vẫn là customer → chuyển về /profile.
 */
export function MentorArea() {
  const navigate = useNavigate();
  const user = getUser();

  React.useEffect(() => {
    if (!hasAuthCredentials()) {
      navigate("/login?redirect=/mentor/dashboard", { replace: true });
      return;
    }
    if (user?.role !== "mentor") {
      navigate("/profile", { replace: true });
    }
  }, [user, navigate]);

  if (!hasAuthCredentials() || !user || user.role !== "mentor") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-500">
        Đang chuyển hướng…
      </div>
    );
  }

  return <Outlet />;
}
