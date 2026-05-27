/** Phản hồi mentor trên đánh giá công khai (khóa học / hồ sơ mentor). */
export function ReviewReplyBlock({ reply, className = "" }) {
  const content = typeof reply === "string" ? reply : reply?.content;
  if (!content?.trim()) return null;

  const repliedAt = reply?.repliedAt;
  return (
    <div
      className={`mt-3 rounded-sm border border-violet-100 bg-violet-50/80 px-3 py-2.5 ${className}`.trim()}
    >
      <p className="text-[10px] font-bold uppercase tracking-wider text-violet-800">Phản hồi mentor</p>
      <p className="mt-1 text-sm leading-relaxed text-slate-700">{content}</p>
      {repliedAt ? (
        <p className="mt-1 text-xs text-slate-400">
          {new Date(repliedAt).toLocaleString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      ) : null}
    </div>
  );
}
