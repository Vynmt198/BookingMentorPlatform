/** Nhận diện loại phòng họp và URL có embed được trong iframe hay không. */

export function parseMeetingUrl(raw) {
  const url = String(raw || "").trim();
  if (!url || !/^https?:\/\//i.test(url)) return null;
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

export function getMeetingProvider(url) {
  const parsed = typeof url === "string" ? parseMeetingUrl(url) : url;
  if (!parsed) return "none";
  const host = parsed.hostname.toLowerCase();
  if (host.includes("meet.google.com")) return "google_meet";
  if (host.includes("zoom.us") || host.includes("zoom.com")) return "zoom";
  if (host.includes("teams.microsoft.com") || host.includes("teams.live.com")) return "teams";
  if (host.includes("jit.si") || host.includes("8x8.vc") || host.includes("jitsi")) return "jitsi";
  return "other";
}

/** Chỉ Jitsi cho phép nhúng iframe trên domain khác (Google Meet / Zoom / Teams đều chặn). */
export function canEmbedMeetingUrl(url) {
  return getMeetingProvider(url) === "jitsi";
}

export const MEETING_PROVIDER_LABELS = {
  google_meet: "Google Meet",
  zoom: "Zoom",
  teams: "Microsoft Teams",
  jitsi: "Jitsi",
  other: "Liên kết phòng họp",
  none: "",
};

export function buildJitsiMeetUrl(roomName, displayName) {
  const room = String(roomName || "ProInterview")
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80) || "ProInterview";
  const name = encodeURIComponent(displayName || "User");
  return `https://meet.jit.si/${room}#config.prejoinPageEnabled=false&userInfo.displayName="${name}"`;
}

/** Tên phòng cố định theo booking — mentor & học viên vào cùng một phòng Jitsi. */
export function proInterviewRoomName(bookingId) {
  return `ProInterview-${String(bookingId || "").trim()}`;
}

/**
 * Link phòng trên nền tảng ProInterview (Jitsi).
 * Bỏ qua meetingLink Google Meet/Zoom cũ trong DB — luôn dùng phòng theo booking id.
 */
export function resolveProInterviewMeetLink(bookingId, _storedLink = "") {
  const id = String(bookingId || "").trim();
  if (!id) return "";
  // Luôn theo bookingId — tránh link Jitsi cũ (PI123…) lệch với MeetingRoom
  return `https://meet.jit.si/${proInterviewRoomName(id)}`;
}

export function buildProInterviewMeetUrl(bookingId, displayName) {
  return buildJitsiMeetUrl(proInterviewRoomName(bookingId), displayName);
}

/** Có được phép mở phòng Jitsi hay không (khớp backend `startBookingMeeting`). */
/** Parse `date` (DD/MM/YYYY) + `timeSlot` (HH:mm) → timestamp ms. */
export function parseBookingStartMs(booking) {
  const date = String(booking?.date || "").trim();
  const time = String(booking?.timeSlot || booking?.time || "09:00").trim();
  const parts = date.split("/").map((p) => parseInt(p, 10));
  const [h, min = 0] = time.split(":").map((p) => parseInt(p, 10));
  if (parts.length >= 3) {
    const [d, m, y] = parts;
    return new Date(y, m - 1, d, h, min, 0).getTime();
  }
  if (parts.length === 2) {
    const [d, m] = parts;
    return new Date(new Date().getFullYear(), m - 1, d, h, min, 0).getTime();
  }
  return NaN;
}

/** Cho phép đánh dấu in_progress / coi là đang live (mặc định 15 phút trước giờ hẹn). */
export function isBookingInLiveWindow(booking, { earlyMinutes = 15, lateMinutesAfterEnd = 60 } = {}) {
  const start = parseBookingStartMs(booking);
  if (!Number.isFinite(start)) return true;
  const dur = (Number(booking?.durationMinutes) || 60) * 60 * 1000;
  const end = start + dur;
  const now = Date.now();
  return now >= start - earlyMinutes * 60 * 1000 && now <= end + lateMinutesAfterEnd * 60 * 1000;
}

export function getMinutesUntilBookingStart(booking) {
  const start = parseBookingStartMs(booking);
  if (!Number.isFinite(start)) return 0;
  return Math.max(0, Math.ceil((start - Date.now()) / 60_000));
}

export function canEnterMeetingRoom(booking) {
  if (!booking) {
    return { ok: false, message: "Không tìm thấy buổi hẹn." };
  }
  const st = String(booking.status || "").toLowerCase();
  const pst = String(booking.paymentStatus || "").toLowerCase();
  if (["cancelled", "completed", "no_show", "done"].includes(st)) {
    return { ok: false, message: "Buổi hẹn đã kết thúc hoặc đã bị hủy." };
  }
  if (!["confirmed", "in_progress"].includes(st)) {
    return {
      ok: false,
      message: "Buổi hẹn chưa được xác nhận. Hoàn tất thanh toán hoặc chờ mentor xác nhận.",
    };
  }
  if (pst !== "paid") {
    return { ok: false, message: "Buổi hẹn chưa được thanh toán." };
  }
  return { ok: true, message: "" };
}
