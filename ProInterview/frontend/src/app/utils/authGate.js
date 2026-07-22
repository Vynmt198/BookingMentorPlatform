import { hasAuthCredentials } from "./auth.js";

/** Hash route login kèm redirect sau đăng nhập. */
export function buildLoginPath(redirectPath = "/") {
  const target = redirectPath && typeof redirectPath === "string" ? redirectPath : "/";
  return `/login?redirect=${encodeURIComponent(target)}`;
}

/** Hash route đăng ký kèm redirect. */
export function buildRegisterPath(redirectPath = "/") {
  const target = redirectPath && typeof redirectPath === "string" ? redirectPath : "/";
  return `/register?redirect=${encodeURIComponent(target)}`;
}

/**
 * Điều hướng tới `path` (vd. /mentors, /courses, /checkout?...).
 * Chưa đăng nhập → /login?redirect=...
 */
export function requireLoginNavigate(navigate, path) {
  if (!path || typeof path !== "string") return;
  if (hasAuthCredentials()) {
    navigate(path);
    return;
  }
  navigate(`/login?redirect=${encodeURIComponent(path)}`);
}
