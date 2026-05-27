import { authFetch, hasAuthCredentials } from "./auth.js";

const jsonHeaders = {
  Accept: "application/json",
  "Content-Type": "application/json",
};

export const enrollmentApi = {
  /** Ghi danh: khóa miễn phí tạo paid ngay; khóa có phí cần `{ paymentMethod: "transfer", orderNum? }` từ bước checkout. */
  enroll: async (courseId, body = null) => {
    if (!hasAuthCredentials()) return { success: false, error: "Chưa đăng nhập." };
    try {
      const res = await authFetch(`/api/courses/${courseId}/enroll`, {
        method: "POST",
        headers: { ...jsonHeaders },
        body: body != null ? JSON.stringify(body) : undefined,
      });
      const out = await res.json().catch(() => ({}));
      return { success: res.ok, ...out };
    } catch {
      return { success: false, error: "Không kết nối được backend." };
    }
  },

  submitEnrollmentTransfer: async (enrollmentId, reference) => {
    if (!hasAuthCredentials()) return { success: false, error: "Chưa đăng nhập." };
    try {
      const res = await authFetch(`/api/enrollments/${encodeURIComponent(enrollmentId)}/submit-transfer`, {
        method: "PATCH",
        headers: { ...jsonHeaders },
        body: JSON.stringify({ reference: String(reference ?? "").trim() }),
      });
      const raw = await res.text().catch(() => "");
      let body = {};
      try {
        body = raw ? JSON.parse(raw) : {};
      } catch {
        body = {};
      }
      if (!res.ok) {
        const hint =
          body.error ||
          body.message ||
          (raw && !raw.trim().startsWith("{") && raw.length < 280 ? raw.trim().slice(0, 280) : "");
        return { success: false, error: hint || `Lỗi ${res.status}` };
      }
      return { success: true, ...body };
    } catch {
      return { success: false, error: "Không kết nối được backend." };
    }
  },

  /** Lấy danh sách khóa học của tôi */
  getMyEnrollments: async () => {
    if (!hasAuthCredentials()) return { success: false, error: "Chưa đăng nhập.", enrollments: [] };
    try {
      const res = await authFetch("/api/enrollments/my", {
        method: "GET",
        headers: { ...jsonHeaders },
      });
      const body = await res.json().catch(() => ({}));
      return { success: res.ok, enrollments: body.enrollments || [], error: body.error };
    } catch {
      return { success: false, error: "Không kết nối được backend.", enrollments: [] };
    }
  },

  /** Cập nhật tiến độ học tập */
  updateProgress: async (enrollmentId, lessonId, isCompleted = true) => {
    if (!hasAuthCredentials()) return { success: false, error: "Chưa đăng nhập." };
    try {
      const res = await authFetch(`/api/enrollments/${enrollmentId}/progress`, {
        method: "PATCH",
        headers: { ...jsonHeaders },
        body: JSON.stringify({ lessonId, isCompleted }),
      });
      const body = await res.json().catch(() => ({}));
      return { success: res.ok, ...body };
    } catch {
      return { success: false, error: "Không kết nối được backend." };
    }
  },

  /** Lấy hoặc tạo chứng chỉ */
  getCertificate: async (enrollmentId) => {
    if (!hasAuthCredentials()) return { success: false, error: "Chưa đăng nhập." };
    try {
      const res = await authFetch(`/api/enrollments/${enrollmentId}/certificate`, {
        method: "GET",
        headers: { ...jsonHeaders },
      });
      const body = await res.json().catch(() => ({}));
      return { success: res.ok, ...body };
    } catch {
      return { success: false, error: "Không kết nối được backend." };
    }
  },
};
