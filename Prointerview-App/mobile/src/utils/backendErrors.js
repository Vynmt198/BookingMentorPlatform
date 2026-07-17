/** Hướng dẫn dev khi mobile không gọi được API local. */
export const BACKEND_DEV_FOLDER = 'Prointerview-App/backend';

export const BACKEND_DEV_HINT =
  `Chạy ${BACKEND_DEV_FOLDER} (npm run dev), cùng Wi‑Fi với điện thoại, mở firewall cổng 5001.`;

export function formatBackendUnreachableMessage(triedBases = []) {
  const tried = (triedBases || []).filter(Boolean).slice(0, 4);
  const triedText = tried.length ? ` (đã thử: ${tried.join(', ')})` : '';
  return `Không kết nối backend${triedText}. ${BACKEND_DEV_HINT}`;
}
