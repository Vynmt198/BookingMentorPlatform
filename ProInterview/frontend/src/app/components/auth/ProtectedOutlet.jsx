import { Outlet } from "react-router";

/** Layout trung gian — loader requireAuthLoader đã kiểm tra phiên trước khi render. */
export function ProtectedOutlet() {
  return <Outlet />;
}
