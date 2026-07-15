/** Path hiện tại (Browser Router): pathname + query. */
export function getCurrentAppPath() {
  if (typeof window === "undefined") return "/";
  const path = `${window.location.pathname || "/"}${window.location.search || ""}`;
  return path || "/";
}
