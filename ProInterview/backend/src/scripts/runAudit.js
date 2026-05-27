/**
 * Audit nhanh: chạy test + health API (nếu backend đang bật).
 * node src/scripts/runAudit.js
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "../..");
const base = (process.env.E2E_API_URL || "http://127.0.0.1:5000").replace(/\/$/, "");

function runNpmTest() {
  return new Promise((resolve) => {
    const child = spawn("npm", ["test"], { cwd: root, shell: true, stdio: "inherit" });
    child.on("close", (code) => resolve(code === 0));
  });
}

async function health() {
  try {
    const res = await fetch(`${base}/api/health`);
    const data = await res.json().catch(() => ({}));
    return res.ok && data.success !== false;
  } catch {
    return false;
  }
}

console.log("\n=== ProInterview Audit ===\n");
const apiUp = await health();
console.log(apiUp ? "✓ API health" : "○ API health (backend chưa chạy — bỏ qua E2E)");

console.log("\n--- Unit / integration tests ---\n");
const testsOk = await runNpmTest();

console.log("\n--- Tóm tắt ---\n");
console.log(`Tests: ${testsOk ? "PASS" : "FAIL"}`);
if (apiUp) console.log("API: OK — luồng nghiệp vụ kiểm tra qua UI; test: npm test (backend + Python CV)");
process.exit(testsOk ? 0 : 1);
