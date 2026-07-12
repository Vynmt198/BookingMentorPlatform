
import { createRoot } from "react-dom/client";
import App from "./app/App.jsx";
import "./styles/index.css";

// Lắng nghe và xử lý token trả về từ Google OAuth trong cửa sổ popup
if (window.location.hash) {
  const hashParams = new URLSearchParams(window.location.hash.substring(1));
  const idToken = hashParams.get("id_token");
  const state = hashParams.get("state");
  if (idToken && state === "google_auth" && window.opener) {
    window.opener.postMessage({ type: "GOOGLE_AUTH_SUCCESS", credential: idToken }, "*");
    window.close();
  }
}

createRoot(document.getElementById("root")).render(<App />);
  