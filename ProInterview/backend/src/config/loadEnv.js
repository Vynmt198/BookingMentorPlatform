import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const here = dirname(fileURLToPath(import.meta.url));
const backendRoot = join(here, "..", "..");

let envPath = join(backendRoot, ".env");
if (!existsSync(envPath)) {
  const alt = join(backendRoot, "env");
  if (existsSync(alt)) envPath = alt;
}

dotenv.config({
  path: envPath,
  override: true,
});

// Atlas: chỉ khi CHƯA có MONGO_URI — ghép từ 3 biến (encode mật khẩu an toàn). Nếu đã ghi MONGO_URI một dòng trong .env thì giữ nguyên.
const existingUri = process.env.MONGO_URI?.trim();
const atlasUser = process.env.MONGO_ATLAS_USER?.trim();
const atlasPass = process.env.MONGO_ATLAS_PASSWORD;
const atlasHost = process.env.MONGO_ATLAS_HOST?.trim();
if (
  !existingUri &&
  atlasUser &&
  atlasPass !== undefined &&
  String(atlasPass) !== "" &&
  atlasHost
) {
  const user = encodeURIComponent(atlasUser);
  const pass = encodeURIComponent(String(atlasPass));
  const dbName = process.env.MONGO_DB_NAME?.trim() || "bookingmentor";
  process.env.MONGO_URI = `mongodb+srv://${user}:${pass}@${atlasHost}/${dbName}?retryWrites=true&w=majority&appName=BookingMentorPlatform`;
}
