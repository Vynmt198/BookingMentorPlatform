import { authFetch } from "./auth.js";

/**
 * Upload một file lên backend.
 * @param {File} file - Đối tượng File từ input.
 * @param {'avatar' | 'cv' | 'jd' | 'course-thumbnail' | 'course-video'} type - Loại upload.
 */
export async function uploadFile(file, type) {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const res = await authFetch(`/api/upload/${type}`, {
      method: "POST",
      body: formData,
      // Lưu ý: Không set Content-Type header khi dùng FormData, trình duyệt sẽ tự set kèm boundary
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: body.error || `Lỗi ${res.status}` };
    }

    return {
      success: true,
      url: body.url,
      fileId: body.fileId,
      fileName: body.fileName || file.name,
    };
  } catch (err) {
    console.error("Upload error:", err);
    return { success: false, error: "Không kết nối được backend để upload." };
  }
}
