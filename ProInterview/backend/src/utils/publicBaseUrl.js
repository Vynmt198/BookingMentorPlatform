/**
 * URL gốc công khai của API (dùng cho link /uploads/...).
 * Prod: set BACKEND_URL=https://prointerview-backend.onrender.com
 */
export function getPublicBaseUrl(req) {
  const fromEnv = typeof process.env.BACKEND_URL === "string" ? process.env.BACKEND_URL.trim() : "";
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (req) {
    const proto = String(req.headers["x-forwarded-proto"] || req.protocol || "https").split(",")[0].trim();
    const host = String(req.headers["x-forwarded-host"] || req.get("host") || "").split(",")[0].trim();
    if (host) return `${proto}://${host}`;
  }
  const port = Number(process.env.PORT) || 5000;
  return `http://127.0.0.1:${port}`;
}
