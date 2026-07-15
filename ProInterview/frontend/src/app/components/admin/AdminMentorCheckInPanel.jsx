import { ExternalLink, ShieldCheck, User } from "lucide-react";
import { Link } from "react-router";
import { avatarSrc, resolveMediaUrl } from "../../utils/mediaUrl.js";

function formatCheckInAt(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatWhen(date, timeSlot) {
  const d = String(date || "").trim();
  const t = String(timeSlot || "").trim();
  if (!d && !t) return "—";
  return t ? `${d} · ${t}` : d;
}

/**
 * Panel xem ảnh check-in webcam mentor (admin).
 * @param {{ booking: object, mentorAvatar?: string, compact?: boolean }} props
 */
export function AdminMentorCheckInPanel({ booking, mentorAvatar = "", compact = false }) {
  const checkInUrl = resolveMediaUrl(booking?.mentorCheckInImageUrl);
  const profileUrl = avatarSrc(mentorAvatar || booking?.mentorId?.avatar, "");
  const hasCheckIn = Boolean(booking?.mentorCheckInAt && checkInUrl);
  const bookingId = booking?._id || booking?.id;

  if (!hasCheckIn) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-6 text-center">
        <ShieldCheck className="mx-auto h-8 w-8 text-slate-300" />
        <p className="mt-2 text-sm font-semibold text-slate-600">Chưa có check-in webcam</p>
        <p className="mt-1 text-xs text-slate-500">
          Mentor chưa chụp ảnh xác minh trước khi vào phòng họp.
        </p>
      </div>
    );
  }

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Đã check-in</p>
          <p className="mt-0.5 text-sm font-semibold text-slate-800">{formatCheckInAt(booking.mentorCheckInAt)}</p>
          {!compact ? (
            <p className="mt-1 text-xs text-slate-500">Buổi: {formatWhen(booking.date, booking.timeSlot)}</p>
          ) : null}
        </div>
        {checkInUrl ? (
          <a
            href={checkInUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-xs font-bold text-violet-800 hover:bg-violet-50"
          >
            Mở ảnh gốc
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        ) : null}
      </div>

      <div className={`grid gap-4 ${compact ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 md:grid-cols-2"}`}>
        <figure className="overflow-hidden rounded-xl border border-emerald-200/80 bg-white shadow-sm">
          <figcaption className="border-b border-emerald-100 bg-emerald-50/80 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-emerald-800">
            Ảnh check-in webcam
          </figcaption>
          <a href={checkInUrl} target="_blank" rel="noreferrer" className="block bg-slate-900/5">
            <img
              src={checkInUrl}
              alt="Ảnh check-in mentor"
              className="aspect-[4/3] w-full object-cover"
              loading="lazy"
            />
          </a>
        </figure>

        <figure className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <figcaption className="border-b border-slate-100 bg-slate-50 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-600">
            Ảnh hồ sơ mentor
          </figcaption>
          <div className="flex aspect-[4/3] items-center justify-center bg-slate-50 p-6">
            {profileUrl ? (
              <img
                src={profileUrl}
                alt="Avatar mentor"
                className="max-h-full max-w-full rounded-2xl border border-slate-200 object-contain shadow-md"
                loading="lazy"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-violet-100 text-violet-400">
                <User className="h-10 w-10" />
              </div>
            )}
          </div>
        </figure>
      </div>

      {bookingId && !compact ? (
        <p className="text-xs text-slate-500">
          Mã buổi:{" "}
          <Link to={`/admin/bookings/${bookingId}`} className="font-mono font-bold text-violet-700 hover:underline">
            {String(bookingId).slice(-8)}
          </Link>
        </p>
      ) : null}
    </div>
  );
}
