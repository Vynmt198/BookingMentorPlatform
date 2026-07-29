/**
 * Kiểm tra cấu hình JaaS — chạy: node src/scripts/verifyJaas.js
 * Không in private key hay JWT đầy đủ.
 */
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import "../config/loadEnv.js";
import {
  isJaasConfigured,
  signJaasMeetingJwt,
  proInterviewJaasRoomSlug,
} from "../services/jaasService.js";

const BACKEND_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function loadPrivatePem() {
  const inline = String(process.env.JAAS_PRIVATE_KEY || "").trim();
  if (inline) {
    return inline.includes("\\n") ? inline.replace(/\\n/g, "\n") : inline;
  }
  const envPath = String(process.env.JAAS_PRIVATE_KEY_PATH || "").trim();
  const resolved = path.isAbsolute(envPath)
    ? envPath
    : path.resolve(BACKEND_ROOT, envPath.replace(/^\.\//, ""));
  return fs.readFileSync(resolved, "utf8");
}

function main() {
  const appId = String(process.env.JAAS_APP_ID || "").trim();
  const kid = String(process.env.JAAS_API_KEY_ID || "").trim();
  const keyPath = String(process.env.JAAS_PRIVATE_KEY_PATH || "").trim();

  console.log("── JaaS verify ──");
  console.log("configured:", isJaasConfigured());
  console.log("appId suffix:", appId.slice(-8) || "(missing)");
  console.log("kid suffix:", kid.split("/").pop() || "(missing)");
  console.log("key path set:", Boolean(keyPath));

  if (!isJaasConfigured()) {
    console.error("FAIL: Thiếu JAAS_APP_ID, JAAS_API_KEY_ID hoặc private key file.");
    process.exit(1);
  }

  if (!kid.startsWith(`${appId}/`)) {
    console.error("FAIL: JAAS_API_KEY_ID phải bắt đầu bằng JAAS_APP_ID + '/'");
    process.exit(1);
  }

  const token = signJaasMeetingJwt({
    appId,
    apiKeyId: kid,
    roomSlug: proInterviewJaasRoomSlug("verify-test"),
    userId: "verify-user",
    name: "Verify",
    email: "verify@dev.local",
    moderator: false,
  });

  const [headerB64, payloadB64, signatureB64] = token.split(".");
  const header = JSON.parse(Buffer.from(headerB64, "base64url"));
  const payload = JSON.parse(Buffer.from(payloadB64, "base64url"));

  console.log("JWT header alg:", header.alg);
  console.log("JWT header kid matches env:", header.kid === kid);
  console.log("JWT payload sub matches appId:", payload.sub === appId);
  console.log("JWT payload room:", payload.room);

  const privatePem = loadPrivatePem();
  const publicKey = crypto.createPublicKey(privatePem);
  const ok = crypto.verify(
    "RSA-SHA256",
    Buffer.from(`${headerB64}.${payloadB64}`),
    publicKey,
    Buffer.from(signatureB64, "base64url"),
  );
  console.log("Local RSA verify:", ok ? "OK" : "FAIL");

  if (!ok || header.kid !== kid) {
    console.error("\nFAIL: JWT ký lỗi hoặc kid không khớp .env");
    process.exit(1);
  }

  console.log("\nOK: Backend ký JWT hợp lệ cục bộ.");
  console.log("Nếu browser vẫn báo 'could not obtain public key':");
  console.log("  → File .pk KHÔNG khớp API key trên jaas.8x8.vc (tạo lại key pair).");
  console.log("  → Hoặc kid trên console khác với JAAS_API_KEY_ID trong .env.");
}

main();
