/**
 * Chuyển file private key JaaS sang dạng paste vào Render env.
 * Chạy: node src/scripts/encodeJaasPrivateKey.js [đường-dẫn-file.pk]
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import "../config/loadEnv.js";

const BACKEND_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const defaultPath = process.env.JAAS_PRIVATE_KEY_PATH || "./keys/jaas-private.pk";

const argPath = process.argv[2] || defaultPath;
const resolved = path.isAbsolute(argPath)
  ? argPath
  : path.resolve(BACKEND_ROOT, String(argPath).replace(/^\.\//, ""));

if (!fs.existsSync(resolved)) {
  console.error(`Không tìm thấy file: ${resolved}`);
  process.exit(1);
}

const pem = fs.readFileSync(resolved, "utf8").trim();
const oneLine = pem.replace(/\r?\n/g, "\\n");
const base64 = Buffer.from(pem, "utf8").toString("base64");

console.log("── Paste vào Render → Environment (backend) ──\n");
console.log("JAAS_PRIVATE_KEY (khuyên dùng — dán cả dòng, giữ \\n):\n");
console.log(oneLine);
console.log("\nHoặc JAAS_PRIVATE_KEY_BASE64 (copy từ file output riêng nếu cần).");
console.log(`Base64 length: ${base64.length} ký tự`);
console.log("\nProd KHÔNG commit/dùng JAAS_PRIVATE_KEY_PATH — file .pk không có trên Render.");
console.log("Cũng set: JAAS_APP_ID, JAAS_API_KEY_ID, BACKEND_URL, CORS_ORIGIN, FRONTEND_URL");
