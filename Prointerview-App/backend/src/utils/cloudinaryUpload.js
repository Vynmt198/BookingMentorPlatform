import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

function isConfigured() {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

let _configured = false;
function ensureConfig() {
  if (_configured) return;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure:     true,
  });
  _configured = true;
}

/**
 * Upload file lên Cloudinary từ disk path hoặc Buffer.
 * Trả { url, publicId } khi thành công, null khi chưa cấu hình.
 * Ném lỗi khi Cloudinary trả lỗi thật (để caller quyết định fallback).
 *
 * @param {string|Buffer} source - path trên disk hoặc Buffer
 * @param {object} options - cloudinary upload options (folder, resource_type, transformation...)
 */
export async function uploadToCloudinary(source, options = {}) {
  if (!isConfigured()) return null;
  ensureConfig();

  return new Promise((resolve, reject) => {
    if (typeof source === "string") {
      cloudinary.uploader.upload(source, options, (err, result) => {
        if (err) return reject(err);
        resolve({ url: result.secure_url, publicId: result.public_id });
      });
    } else {
      const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
        if (err) return reject(err);
        resolve({ url: result.secure_url, publicId: result.public_id });
      });
      stream.end(source);
    }
  });
}

/** Xóa file local sau khi upload CDN thành công. Silent fail. */
export function deleteLocalFile(filepath) {
  try { fs.unlinkSync(filepath); } catch (_) {}
}

export { isConfigured as isCloudinaryConfigured };
