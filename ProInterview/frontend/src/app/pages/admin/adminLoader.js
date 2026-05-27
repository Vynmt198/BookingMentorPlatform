import { redirect } from "react-router";
import { getUser, hasAuthCredentials } from "../../utils/auth";

/** Chỉ user đã đăng nhập với role `admin` được vào /admin/* */
export function adminLoader() {
  if (!hasAuthCredentials()) {
    throw redirect("/login?redirect=/admin");
  }
  const u = getUser();
  if (!u || u.role !== "admin") {
    throw redirect("/login?redirect=/admin");
  }
  return null;
}
