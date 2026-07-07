import { motion } from "motion/react";
import { Video, BadgeCheck, Star } from "lucide-react";
import { MENTOR_BOOKING_COPY } from "../../constants/brandVoice";

function formatVnd(amount) {
  return `${Number(amount || 0).toLocaleString("vi-VN")}đ`;
}

function displayTitle(mentor) {
  const title = (mentor.title || "").trim();
  const company = (mentor.company || "").trim();
  if (title && title.toLowerCase() !== "mentor") {
    return company && company !== "—" ? `${title} tại ${company}` : title;
  }
  if (mentor.field) return mentor.field;
  return "Mentor ProInterview";
}

function resolveMentorSessionOffer(mentor) {
  const hourly = Number(mentor.price) || 0;
  const fromApi = Array.isArray(mentor.sessionTypes) ? mentor.sessionTypes : [];
  const mock = fromApi.find((session) => session?.type === "mock_interview");
  return {
    label: MENTOR_BOOKING_COPY.sessionTitle,
    price: mock?.price ?? hourly,
    minutes: mock?.durationMinutes ?? 60,
    icon: Video,
  };
}

function StarRating({ rating, reviewCount }) {
  const value = Number(rating) || 0;
  const filled = Math.round(value);
  return (
    <div className="flex items-center justify-center gap-1.5 text-sm">
      <span className="font-bold text-slate-900">
        {value > 0 ? value.toFixed(1) : "—"}
      </span>
      <span className="inline-flex gap-0.5" aria-hidden>
        {[1, 2, 3, 4, 5].map((index) => (
          <Star
            key={index}
            className={`size-3.5 ${
              index <= filled
                ? "fill-lime-400 text-lime-400"
                : "fill-slate-200 text-slate-200"
            }`}
          />
        ))}
      </span>
      <span className="text-xs text-slate-500">({reviewCount} đánh giá)</span>
    </div>
  );
}

export function MentorListCard({ mentor, onOpenProfile, onBook }) {
  const offer = resolveMentorSessionOffer(mentor);
  const avatarSrc =
    mentor.avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      mentor.name || "M",
    )}&background=ede9fe&color=6d28d9`;
  const isVerified = Boolean(
    mentor.isVerified ||
      (mentor.name && mentor.title && mentor.company && mentor.avatar),
  );
  const isOnline = Boolean(mentor.available || mentor.isOnline);

  return (
    <motion.div
      onClick={onOpenProfile}
      className="group relative flex h-full cursor-pointer flex-col justify-between overflow-hidden rounded-3xl border border-violet-100/80 bg-white p-5 shadow-sm"
      whileHover={{
        y: -8,
        boxShadow: "0 20px 48px rgba(128,55,244,0.14)",
        borderColor: "rgba(128,55,244,0.3)",
      }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: "spring", stiffness: 340, damping: 28 }}
    >
      <div className="flex w-full min-w-0 flex-col items-center text-center">
        <div className="relative mb-4 h-24 w-24 shrink-0 sm:h-28 sm:w-28 md:h-32 md:w-32">
          <motion.img
            src={avatarSrc}
            alt={mentor.name}
            className="h-full w-full rounded-full border-4 border-violet-50 object-cover shadow-sm"
            whileHover={{ scale: 1.07 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          />
          {isOnline ? (
            <span className="absolute bottom-1 right-1" title="Đang hoạt động">
              <span className="absolute inline-flex h-3.5 w-3.5 animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500" />
            </span>
          ) : null}
        </div>

        <h3 className="flex w-full items-center justify-center gap-1 text-base font-bold tracking-tight text-slate-900 transition-colors duration-200 group-hover:text-[#8037f4] sm:text-lg">
          <span className="max-w-[180px] truncate">{mentor.name}</span>
          {isVerified ? (
            <motion.span
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 15,
                delay: 0.2,
              }}
              whileHover={{ scale: 1.25, rotate: 10 }}
            >
              <BadgeCheck
                className="size-4 shrink-0 fill-amber-400 text-white"
                aria-label="Mentor đã xác minh"
              />
            </motion.span>
          ) : null}
        </h3>

        <p className="mt-1 min-h-[2.5rem] w-full line-clamp-2 px-2 text-xs font-semibold text-slate-500">
          {displayTitle(mentor)}
        </p>

        <div className="mt-3">
          <StarRating rating={mentor.rating} reviewCount={mentor.reviews ?? 0} />
        </div>

        {mentor.tags?.length ? (
          <div className="mt-3 flex w-full min-w-0 flex-wrap justify-center gap-1.5 px-2">
            {mentor.tags.slice(0, 3).map((tag, index) => (
              <motion.div
                key={tag}
                className="block max-w-full truncate rounded-full bg-violet-50 px-2.5 py-0.5 text-[10px] font-medium text-violet-700"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.05 * index, duration: 0.25 }}
                whileHover={{
                  scale: 1.1,
                  backgroundColor: "#ede9fe",
                  color: "#5b21b6",
                }}
              >
                {tag}
              </motion.div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="mt-5 flex w-full flex-col items-center">
        <div className="mb-4 w-full border-t border-slate-100" />

        <div className="mb-4 text-center">
          <span className="text-xs text-slate-500">{offer.label}</span>
          <p className="mt-0.5">
            <span className="text-sm font-bold text-slate-900">
              {formatVnd(offer.price)}
              <span className="text-xs font-medium text-slate-500">
                {" "}
                / {offer.minutes} phút
              </span>
            </span>
          </p>
        </div>

        <div className="flex w-full flex-col gap-2">
          <motion.button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onBook();
            }}
            className="w-full rounded-2xl bg-lime-400 py-2.5 text-xs font-extrabold text-violet-950 shadow-sm"
            whileHover={{ scale: 1.04, backgroundColor: "#a3e635" }}
            whileTap={{ scale: 0.93, backgroundColor: "#84cc16" }}
            transition={{ type: "spring", stiffness: 380, damping: 22 }}
          >
            Đặt lịch
          </motion.button>

          <motion.button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onOpenProfile();
            }}
            className="w-full rounded-2xl border border-violet-200 bg-white py-2.5 text-xs font-bold text-violet-700"
            whileHover={{
              scale: 1.02,
              borderColor: "#a78bfa",
              backgroundColor: "#f5f3ff",
            }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 380, damping: 22 }}
          >
            Xem chi tiết
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
