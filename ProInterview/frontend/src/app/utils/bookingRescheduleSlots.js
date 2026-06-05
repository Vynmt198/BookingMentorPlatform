import { fetchBookedSlots } from "./bookingsApi";
import { isBookingSlotInFuture } from "./bookingSchedule";
import { fetchMentorAvailability } from "./mentorApi";

function toBookingDateFormat(input) {
  const s = String(input || "").trim();
  if (!s) return "";
  if (s.includes(",")) {
    const tail = s.split(",").pop().trim();
    const parts = tail.split("/").map((p) => p.trim());
    if (parts.length === 3) return `${parts[0].padStart(2, "0")}/${parts[1].padStart(2, "0")}/${parts[2]}`;
    if (parts.length === 2) return `${parts[0].padStart(2, "0")}/${parts[1].padStart(2, "0")}`;
    return tail;
  }
  const parts = s.split("/").map((p) => p.trim());
  if (parts.length === 3) return `${parts[0].padStart(2, "0")}/${parts[1].padStart(2, "0")}/${parts[2]}`;
  if (parts.length === 2) return `${parts[0].padStart(2, "0")}/${parts[1].padStart(2, "0")}`;
  return s;
}

/**
 * Danh sách slot trống của mentor cho form đổi lịch.
 * @param {string} mentorId
 * @param {{ allowCurrentSlot?: { date: string, time: string } }} [opts] — cho phép slot đang giữ bởi buổi hiện tại (dù booked)
 */
export async function loadMentorRescheduleSlotOptions(mentorId, opts = {}) {
  if (!mentorId) return [];

  const [availability, bookedRes] = await Promise.all([
    fetchMentorAvailability(mentorId),
    fetchBookedSlots(mentorId),
  ]);

  if (!availability?.availableSlots) return [];

  const bookedMap = bookedRes.success ? bookedRes.booked || {} : {};
  const allow = opts.allowCurrentSlot;
  const allowDate = allow?.date ? toBookingDateFormat(allow.date) : "";
  const allowTime = String(allow?.time || "").trim();
  const options = [];

  for (const [date, slots] of Object.entries(availability.availableSlots || {})) {
    const bookingDate = toBookingDateFormat(date);
    for (const slot of Array.isArray(slots) ? slots : []) {
      const time = String(slot).trim();
      if (!time) continue;
      if (!isBookingSlotInFuture(bookingDate, time)) continue;

      const taken = Array.isArray(bookedMap[date]) ? bookedMap[date].includes(time) : false;
      const isCurrent = allowDate && allowTime && bookingDate === allowDate && time === allowTime;
      if (taken && !isCurrent) continue;

      options.push({ date: bookingDate, slot: time, label: `${bookingDate} • ${time}` });
    }
  }

  options.sort((a, b) => `${a.date} ${a.slot}`.localeCompare(`${b.date} ${b.slot}`));
  return options;
}
