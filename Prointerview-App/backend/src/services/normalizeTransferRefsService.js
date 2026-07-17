import { Booking } from "../models/Booking.js";
import { Enrollment } from "../models/Enrollment.js";
import { Payment } from "../models/Payment.js";

function normalizeTransferRef(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const parts = raw
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);

  if (parts.length === 0) return "";
  // Chuẩn mới: mỗi giao dịch chỉ giữ một nội dung duy nhất.
  return parts[0].slice(0, 120);
}

async function normalizeCollection({
  model,
  label,
  query,
  pickRef,
  setRef,
  dryRun,
}) {
  const docs = await model.find(query).select("_id paymentRef providerRef").lean();
  let changed = 0;

  for (const doc of docs) {
    const current = pickRef(doc);
    const next = normalizeTransferRef(current);
    if (next === current) continue;
    changed += 1;
    if (dryRun) continue;
    await model.updateOne({ _id: doc._id }, setRef(next));
  }

  return { label, scanned: docs.length, changed };
}

export async function normalizeTransferRefs({ dryRun = false } = {}) {
  const results = await Promise.all([
    normalizeCollection({
      model: Booking,
      label: "bookings",
      query: { paymentMethod: "transfer", paymentRef: { $type: "string", $ne: "" } },
      pickRef: (doc) => String(doc.paymentRef || "").trim(),
      setRef: (next) => ({ $set: { paymentRef: next } }),
      dryRun,
    }),
    normalizeCollection({
      model: Enrollment,
      label: "enrollments",
      query: { paymentMethod: "transfer", paymentRef: { $type: "string", $ne: "" } },
      pickRef: (doc) => String(doc.paymentRef || "").trim(),
      setRef: (next) => ({ $set: { paymentRef: next } }),
      dryRun,
    }),
    normalizeCollection({
      model: Payment,
      label: "payments(transfer providerRef)",
      query: { provider: "transfer", providerRef: { $type: "string", $ne: "" } },
      pickRef: (doc) => String(doc.providerRef || "").trim(),
      setRef: (next) => ({ $set: { providerRef: next } }),
      dryRun,
    }),
  ]);

  const totalScanned = results.reduce((sum, item) => sum + Number(item.scanned || 0), 0);
  const totalChanged = results.reduce((sum, item) => sum + Number(item.changed || 0), 0);
  return {
    dryRun: Boolean(dryRun),
    totalScanned,
    totalChanged,
    results,
  };
}

