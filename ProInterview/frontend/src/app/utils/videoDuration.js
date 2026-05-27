/** Đọc thời lượng video từ file local (trước/sau upload). Trả phút, làm tròn lên, tối thiểu 1. */
export function getVideoDurationMinutes(file) {
  return new Promise((resolve) => {
    if (!file || !String(file.type || "").startsWith("video/")) {
      resolve(0);
      return;
    }
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";

    const cleanup = () => {
      URL.revokeObjectURL(url);
      video.removeAttribute("src");
      video.load();
    };

    video.onloadedmetadata = () => {
      const seconds = Number(video.duration);
      cleanup();
      if (!Number.isFinite(seconds) || seconds <= 0) {
        resolve(0);
        return;
      }
      resolve(Math.max(1, Math.ceil(seconds / 60)));
    };

    video.onerror = () => {
      cleanup();
      resolve(0);
    };

    video.src = url;
  });
}

export function formatLessonDurationMinutes(minutes) {
  const m = Math.max(0, Math.round(Number(minutes) || 0));
  if (m <= 0) return "Chưa có";
  return `${m} phút`;
}
