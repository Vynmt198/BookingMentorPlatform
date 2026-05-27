import mongoose from "mongoose";

/**
 * Kiểm tra xem MongoDB hiện tại có hỗ trợ transaction không (cần Replica Set hoặc Sharded Cluster).
 * @returns {Promise<boolean>}
 */
export async function supportsTransactions() {
  try {
    const hello = await mongoose.connection.db.admin().command({ hello: 1 });
    return !!(hello.setName || hello.msg === "isdbgrid");
  } catch (error) {
    console.error("[dbHelper] Error checking transaction support:", error.message);
    return false;
  }
}

/**
 * Chạy một hàm callback. Nếu DB hỗ trợ transaction, chạy trong session.
 * Nếu không hỗ trợ, chạy trực tiếp không có session.
 * @param {Function} callback - (session) => Promise<any>
 */
export async function runInTransaction(callback) {
  const supported = await supportsTransactions();
  
  if (!supported) {
    // Fallback cho môi trường Standalone (dev local)
    return callback(null);
  }

  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await callback(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}
