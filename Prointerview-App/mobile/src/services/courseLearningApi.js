import { authFetch } from '../utils/mobileAuth';

const jsonHeaders = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
};

export async function fetchLessonContent(courseId, lessonId) {
  try {
    const res = await authFetch(
      `/api/courses/${encodeURIComponent(courseId)}/lessons/${encodeURIComponent(lessonId)}`,
      { method: 'GET', headers: jsonHeaders },
    );
    const body = await res.json().catch(() => ({}));
    return {
      success: res.ok && body.success !== false,
      lesson: body.lesson || null,
      error: body.error || (!res.ok ? `Lỗi ${res.status}` : undefined),
    };
  } catch {
    return { success: false, lesson: null, error: 'Không tải được nội dung bài học.' };
  }
}

export async function updateLearningProgress(enrollmentId, lessonId, isCompleted) {
  try {
    const res = await authFetch(
      `/api/enrollments/${encodeURIComponent(enrollmentId)}/progress`,
      {
        method: 'PATCH',
        headers: jsonHeaders,
        body: JSON.stringify({ lessonId, isCompleted }),
      },
    );
    const body = await res.json().catch(() => ({}));
    return {
      success: res.ok && body.success !== false,
      enrollment: body.enrollment || null,
      error: body.error || (!res.ok ? `Lỗi ${res.status}` : undefined),
    };
  } catch {
    return { success: false, error: 'Không lưu được tiến độ học.' };
  }
}
