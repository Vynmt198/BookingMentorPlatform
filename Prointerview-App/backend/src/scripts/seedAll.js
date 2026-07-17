/**
 * Seed toàn bộ dữ liệu demo UI — chạy từ thư mục backend:
 *   npm run seed:all
 */
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const backendRoot = join(__dirname, "..", "..");

const STEPS = [
  { label: "User dev (nếu collection users trống)", script: "seedUsers.js" },
  { label: "Endpoint fixtures — users, mentors, bookings, courses, payments, CV, interview…", script: "seedEndpointData.js" },
  { label: "5 mentor mẫu (trang /mentors)", script: "seedMentorSamples.js" },
  { label: "5 khóa học video Cloudinary (trang /courses)", script: "seedCourseSamples.js" },
  { label: "UI mock — booking mentor dashboard, payout", script: "seedUiMockData.js" },
  { label: "Commission & earnings mẫu", script: "seedMentorCommissionSamples.js" },
  { label: "Đánh giá mentor / khóa học", script: "seedReviews.js" },
  { label: "Báo cáo khiếu nại (admin)", script: "seedReports.js" },
  { label: "Bio mentor thiếu mô tả", script: "seedMentorBios.js" },
  { label: "Đồng bộ hồ sơ mentor ↔ user", script: "syncMentorProfiles.js" },
];

function run(script) {
  execSync(`node src/scripts/${script}`, {
    cwd: backendRoot,
    stdio: "inherit",
    env: process.env,
  });
}

console.log("\n=== ProInterview — seed dữ liệu UI đầy đủ ===\n");

for (let i = 0; i < STEPS.length; i += 1) {
  const step = STEPS[i];
  console.log(`\n[${i + 1}/${STEPS.length}] ▶ ${step.label}`);
  try {
    run(step.script);
  } catch {
    console.error(`\n✗ Thất bại tại bước: ${step.script}`);
    process.exit(1);
  }
}

console.log(`
=== Seed hoàn tất ===

Mật khẩu chung (dev): Dev123456

Tài khoản chính:
  • customer@dev.local      — Customer (dashboard, booking, CV)
  • mentor@dev.local        — Mentor (dashboard, lịch, finance)
  • mentor2@dev.local       — Mentor phụ (HR / CV review)
  • admin@dev.local         — Admin
  • customer2@dev.local     — Customer phụ (reviews)
  • starter.customer@dev.local — Gói student

Mentor mẫu thêm (mock interview):
  • mentor.frontend@dev.local
  • mentor.product@dev.local
  • mentor.devops@dev.local
  • mentor.fullstack@dev.local
  • mentor.data@dev.local

Khởi động UI: cd ../frontend && npm run dev:full
`);
