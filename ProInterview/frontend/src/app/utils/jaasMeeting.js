const loadPromises = new Map();

/** Tải JitsiMeetExternalAPI từ domain JaaS hoặc meet.jit.si (idempotent). */
export function loadJitsiExternalApi(domain = "8x8.vc") {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Jitsi API chỉ chạy trên browser."));
  }
  if (window.JitsiMeetExternalAPI) {
    return Promise.resolve(window.JitsiMeetExternalAPI);
  }

  const host = String(domain || "8x8.vc").replace(/^https?:\/\//, "");
  if (!loadPromises.has(host)) {
    loadPromises.set(
      host,
      new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = `https://${host}/external_api.js`;
        script.async = true;
        script.onload = () => {
          if (window.JitsiMeetExternalAPI) resolve(window.JitsiMeetExternalAPI);
          else reject(new Error("JitsiMeetExternalAPI không khả dụng."));
        };
        script.onerror = () => reject(new Error(`Không tải được Jitsi API từ ${host}.`));
        document.head.appendChild(script);
      }),
    );
  }
  return loadPromises.get(host);
}

export const JAAS_MEETING_CONFIG = {
  prejoinPageEnabled: false,
  prejoinConfig: { enabled: false },
  enableWelcomePage: false,
  disableDeepLinking: true,
  startWithAudioMuted: true,
  startWithVideoMuted: true,
  hideConferenceSubject: true,
};

export const JAAS_INTERFACE_CONFIG = {
  SHOW_JITSI_WATERMARK: false,
  SHOW_WATERMARK_FOR_GUESTS: false,
  DEFAULT_BACKGROUND: "#0f172a",
  TOOLBAR_BUTTONS: [
    "microphone",
    "camera",
    "desktop",
    "fullscreen",
    "hangup",
    "chat",
    "raisehand",
    "tileview",
    "settings",
  ],
};

/** Khởi tạo phòng JaaS qua External API. */
export async function mountJaasMeeting(container, meeting, { displayName } = {}) {
  if (!container || !meeting?.jwt) {
    throw new Error("Thiếu container hoặc JWT phòng họp.");
  }

  const JitsiMeetExternalAPI = await loadJitsiExternalApi(meeting.domain || "8x8.vc");
  const roomName = meeting.fullRoomName || `${meeting.appId}/${meeting.roomName}`;

  return new JitsiMeetExternalAPI(meeting.domain || "8x8.vc", {
    roomName,
    jwt: meeting.jwt,
    parentNode: container,
    width: "100%",
    height: "100%",
    userInfo: { displayName: displayName || "User" },
    configOverwrite: JAAS_MEETING_CONFIG,
    interfaceConfigOverwrite: JAAS_INTERFACE_CONFIG,
  });
}
