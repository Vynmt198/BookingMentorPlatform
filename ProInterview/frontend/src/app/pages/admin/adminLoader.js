import { redirect } from "react-router";
import { authFetch, getUser, hasAuthCredentials, setLoggedIn } from "../../utils/auth";

const LOGIN_REDIRECT = "/login?redirect=/admin";

/** Lỗi tạm thời (mất mạng, backend restart, rate limit) — giữ phiên, dùng role đang có sẵn. */
function fallbackToCachedRole() {
  if (getUser()?.role === "admin") return null;
  throw redirect(LOGIN_REDIRECT);
}

/**
 * Chỉ user đã đăng nhập với role `admin` được vào /admin/*.
 *
 * Role được lấy lại từ server chứ không tin `localStorage` — giá trị trong localStorage do
 * trình duyệt kiểm soát, và cũng bị cũ ngay khi admin bị hạ quyền hoặc bị khóa ở phiên khác.
 * Backend vẫn là lớp chặn thật (`authJwt + requireAdmin`); loader này chỉ để UI không dựng lên
 * một trang quản trị rỗng đầy lỗi 403.
 */
export async function adminLoader() {
  if (!hasAuthCredentials()) {
    throw redirect(LOGIN_REDIRECT);
  }

  let res;
  try {
    res = await authFetch("/api/auth/me", { headers: { Accept: "application/json" } });
  } catch {
    return fallbackToCachedRole();
  }

  if (res.status >= 500 || res.status === 429) {
    return fallbackToCachedRole();
  }
  if (!res.ok) {
    throw redirect(LOGIN_REDIRECT);
  }

  const body = await res.json().catch(() => ({}));
  const user = body?.success ? body.user : null;
  if (!user || user.role !== "admin") {
    throw redirect(LOGIN_REDIRECT);
  }

  // Đồng bộ lại profile để phần còn lại của UI đọc đúng role/plan mới nhất.
  setLoggedIn(user);
  return null;
}
