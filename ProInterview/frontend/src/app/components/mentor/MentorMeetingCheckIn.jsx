import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, RefreshCw, User } from "lucide-react";
import { uploadFile } from "../../utils/uploadApi.js";
import { submitMentorMeetingCheckIn } from "../../utils/bookingsApi.js";
import { toastApiError, toastApiSuccess } from "../../utils/apiToast.js";
import { avatarSrc } from "../../utils/mediaUrl.js";
import { BRAND_CTA_LIME_STYLE, BRAND_CTA_PURPLE_STYLE } from "../../constants/brandColors.js";

function stopStream(stream) {
  stream?.getTracks?.().forEach((t) => t.stop());
}

export function MentorMeetingCheckIn({
  bookingId,
  mentorName,
  mentorAvatar,
  customerName,
  onComplete,
  onCancel,
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [capturedBlob, setCapturedBlob] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const startCamera = useCallback(async () => {
    setCameraError("");
    setCameraReady(false);
    stopStream(streamRef.current);
    streamRef.current = null;

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Trình duyệt không hỗ trợ webcam.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(() => {});
          setCameraReady(true);
        };
      }
    } catch {
      setCameraError("Không mở được webcam. Cho phép quyền camera và thử lại.");
    }
  }, []);

  useEffect(() => {
    void startCamera();
    return () => {
      stopStream(streamRef.current);
    };
  }, [startCamera]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !cameraReady) return;

    const w = video.videoWidth || 640;
    const h = video.videoHeight || 480;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          toastApiError("Không chụp được ảnh. Thử lại.");
          return;
        }
        setCapturedBlob(blob);
        setPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return URL.createObjectURL(blob);
        });
      },
      "image/jpeg",
      0.88,
    );
  };

  const handleRetake = () => {
    setCapturedBlob(null);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return "";
    });
    const video = videoRef.current;
    if (video && streamRef.current) {
      video.srcObject = streamRef.current;
      void video.play().catch(() => {});
      setCameraReady(true);
    } else {
      void startCamera();
    }
  };

  const handleConfirm = async () => {
    if (!capturedBlob || submitting) return;
    setSubmitting(true);
    try {
      const file = new File([capturedBlob], `checkin-${bookingId}.jpg`, { type: "image/jpeg" });
      const up = await uploadFile(file, "meeting-checkin");
      if (!up.success || !up.url) {
        toastApiError(up.error, "Không tải ảnh check-in lên được.");
        return;
      }
      const res = await submitMentorMeetingCheckIn(bookingId, up.url);
      if (!res.success) {
        toastApiError(res.error, "Không ghi nhận check-in.");
        return;
      }
      toastApiSuccess("Đã check-in. Đang mở phòng…");
      onComplete?.(res.booking);
    } catch {
      toastApiError("Lỗi kết nối khi xác nhận check-in.");
    } finally {
      setSubmitting(false);
    }
  };

  const profileAvatar = avatarSrc(mentorAvatar);

  return (
    <div className="mentor-role-shell min-h-svh bg-[#f8f9fc] relative overflow-hidden font-sans text-slate-900">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 left-1/2 h-80 w-[90%] -translate-x-1/2 rounded-full bg-[#8037f4]/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-56 w-56 rounded-full bg-[#93f72b]/12 blur-3xl" />
      </div>

      <main className="relative z-10 mx-auto flex min-h-svh max-w-4xl flex-col px-4 pb-10 pt-10 sm:px-6 sm:pt-14">
        <div className="mb-8 text-center sm:mb-10">
          <h1 className="font-headline text-2xl font-black tracking-tight text-[#8037f4] sm:text-3xl">
            Xác minh khuôn mặt
          </h1>
          {customerName ? (
            <p className="mt-2 text-sm text-[#8037f4]/80">
              Buổi học với{" "}
              <span className="font-semibold text-[#8037f4]">{customerName}</span>
            </p>
          ) : (
            <p className="mt-2 text-sm text-[#8037f4]/80">Chụp một ảnh trước khi vào phòng video</p>
          )}
        </div>

        <div className="grid flex-1 gap-6 lg:grid-cols-[minmax(0,1fr)_240px] lg:items-start">
          <section className="overflow-hidden rounded-3xl border border-violet-200/60 bg-white shadow-[0_20px_60px_rgba(128,55,244,0.1)]">
            <div className="flex items-center justify-between border-b border-violet-100/80 px-4 py-3 sm:px-5">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                {previewUrl ? "Ảnh check-in" : "Webcam"}
              </p>
              {cameraReady && !previewUrl ? (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-red-500">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                  Live
                </span>
              ) : null}
            </div>

            <div className="p-3 sm:p-4">
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-slate-900/5 ring-1 ring-violet-100">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`h-full w-full object-cover scale-x-[-1] ${previewUrl ? "invisible absolute inset-0" : ""}`}
                />
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Ảnh check-in"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : null}
                {!previewUrl && !cameraReady && !cameraError ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/85 text-xs font-medium text-slate-500">
                    Đang mở camera…
                  </div>
                ) : null}
                {!previewUrl && cameraError ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/95 p-4 text-center">
                    <p className="text-sm text-red-600">{cameraError}</p>
                    <button
                      type="button"
                      onClick={() => void startCamera()}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                    >
                      Thử lại
                    </button>
                  </div>
                ) : null}
              </div>
              <p className="mt-3 text-center text-xs text-slate-400">
                Ảnh rõ mặt, đủ sáng — chỉ làm một lần mỗi buổi.
              </p>
            </div>
            <canvas ref={canvasRef} className="hidden" aria-hidden />
          </section>

          <aside className="flex flex-col gap-4">
            <div className="rounded-2xl border border-violet-200/60 bg-white p-4 shadow-[0_8px_32px_rgba(128,55,244,0.06)]">
              <div className="flex items-center gap-3">
                {profileAvatar ? (
                  <img
                    src={profileAvatar}
                    alt={mentorName || "Mentor"}
                    className="h-14 w-14 rounded-2xl border-2 border-violet-100 object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-violet-100 bg-violet-50 text-[#8037f4]">
                    <User size={24} />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-base font-bold text-slate-900">{mentorName || "Mentor"}</p>
                  <p className="text-xs text-slate-400">Mentor</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              {!previewUrl ? (
                <button
                  type="button"
                  onClick={handleCapture}
                  disabled={!cameraReady || submitting}
                  style={BRAND_CTA_LIME_STYLE}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-xs font-black uppercase tracking-widest shadow-[0_10px_28px_rgba(147,247,43,0.35)] disabled:opacity-50"
                >
                  <Camera size={18} /> Chụp ảnh
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleRetake}
                    disabled={submitting}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-xs font-black uppercase tracking-widest text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    <RefreshCw size={16} /> Chụp lại
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={submitting}
                    style={BRAND_CTA_PURPLE_STYLE}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-xs font-black uppercase tracking-widest shadow-[0_10px_28px_rgba(128,55,244,0.28)] disabled:opacity-50"
                  >
                    {submitting ? "Đang gửi…" : "Vào phòng họp"}
                  </button>
                </>
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
