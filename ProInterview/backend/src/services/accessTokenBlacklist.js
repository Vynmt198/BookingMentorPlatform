import mongoose from "mongoose";
import { User } from "../models/User.js";

const MAX_REVOKED_PER_USER = 200;

function pruneRevokedList(list) {
  const now = Date.now();
  const kept = (Array.isArray(list) ? list : []).filter((row) => {
    const expAt = row?.expAt ? new Date(row.expAt).getTime() : 0;
    return expAt > now;
  });
  return kept.slice(-MAX_REVOKED_PER_USER);
}

/**
 * Thu hồi access token theo jti (đăng xuất / thu hồi phiên hiện tại).
 */
export async function revokeAccessTokenJti(userId, jti, expUnixSeconds) {
  const uid = String(userId ?? "").trim();
  const id = String(jti ?? "").trim();
  if (!mongoose.isValidObjectId(uid) || !id) return;

  const expAt = Number.isFinite(Number(expUnixSeconds))
    ? new Date(Number(expUnixSeconds) * 1000)
    : new Date(Date.now() + 15 * 60 * 1000);

  const user = await User.findById(uid).select("+revokedAccessJtis").lean();
  if (!user) return;

  const next = pruneRevokedList([
    ...(user.revokedAccessJtis || []),
    { jti: id, expAt },
  ]);

  await User.findByIdAndUpdate(uid, { $set: { revokedAccessJtis: next } });
}

export async function isAccessTokenJtiRevoked(userId, jti) {
  const uid = String(userId ?? "").trim();
  const id = String(jti ?? "").trim();
  if (!mongoose.isValidObjectId(uid) || !id) return false;

  const user = await User.findById(uid).select("+revokedAccessJtis").lean();
  if (!user) return false;

  const now = Date.now();
  const hit = (user.revokedAccessJtis || []).some(
    (row) => row?.jti === id && new Date(row.expAt).getTime() > now,
  );

  if (hit) return true;

  const pruned = pruneRevokedList(user.revokedAccessJtis);
  if (pruned.length !== (user.revokedAccessJtis || []).length) {
    await User.findByIdAndUpdate(uid, { $set: { revokedAccessJtis: pruned } });
  }
  return false;
}
