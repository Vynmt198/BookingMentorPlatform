function toLocalDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function toBookingDate(dateKey) {
  const [year, month, day] = String(dateKey).split('-');
  return `${day}/${month}/${year}`;
}

export function buildAvailableBookingDays(availability) {
  if (!availability) return [];
  const explicit = availability.availableSlots || {};
  const recurring = Array.isArray(availability.recurringSchedule)
    ? availability.recurringSchedule
    : [];
  const blocked = new Set((availability.blockedDates || []).map(String));
  const now = new Date();
  const days = [];

  for (let offset = 0; offset < 21 && days.length < 7; offset += 1) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    const key = toLocalDateKey(date);
    if (blocked.has(key)) continue;
    const mentorDay = (date.getDay() + 6) % 7;
    const recurringSlots = recurring.find((item) => Number(item.dayOfWeek) === mentorDay)?.slots || [];
    const sourceSlots = Object.prototype.hasOwnProperty.call(explicit, key) ? explicit[key] : recurringSlots;
    const slots = [...new Set(sourceSlots || [])]
      .filter((slot) => {
        const [hour, minute] = String(slot).split(':').map(Number);
        const slotTime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, minute);
        return slotTime.getTime() > now.getTime() + 30 * 60 * 1000;
      })
      .sort();
    if (slots.length) {
      days.push({
        key,
        label: date.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' }),
        slots,
      });
    }
  }
  return days;
}
