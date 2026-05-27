import { ExternalLink } from "lucide-react";
import { mediaSrc } from "../../utils/mediaUrl.js";

export function youtubeEmbedUrl(url) {
  if (!url) return null;
  const m = String(url).match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]+)/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

/** Phát video bài học trong admin (upload local hoặc YouTube). */
export function AdminLessonVideoPlayer({ url, title = "Video bài học" }) {
  const raw = String(url || "").trim();
  if (!raw) return null;

  const embed = youtubeEmbedUrl(raw);
  const src = mediaSrc(raw);

  if (embed) {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-lg border border-slate-200 bg-black">
        <iframe
          title={title}
          src={embed}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  if (src) {
    return (
      <video
        key={src}
        controls
        playsInline
        preload="metadata"
        className="max-h-[min(420px,55vh)] w-full rounded-lg border border-slate-200 bg-black"
        src={src}
      />
    );
  }

  return (
    <a
      href={raw}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-800 hover:bg-violet-100"
    >
      <ExternalLink className="h-4 w-4 shrink-0" />
      Mở video trong tab mới
    </a>
  );
}
