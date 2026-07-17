import "../config/loadEnv.js";
import mongoose from "mongoose";
import { connectDatabase } from "../db/connect.js";
import { normalizeTransferRefs } from "../services/normalizeTransferRefsService.js";

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("Thiếu MONGO_URI.");
    process.exit(1);
  }

  const dryRun = process.argv.includes("--dry-run");
  await connectDatabase(uri);
  const { results } = await normalizeTransferRefs({ dryRun });
  for (const r of results) {
    console.log(`[${r.label}] scanned=${r.scanned}, changed=${r.changed}`);
  }
  console.log(dryRun ? "DRY RUN hoàn tất (không ghi DB)." : "Đã normalize transfer refs thành công.");

  await mongoose.disconnect();
}

main().catch(async (e) => {
  console.error(e);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
