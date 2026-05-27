import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const p = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../src/app/pages/account/Settings.jsx",
);
let s = fs.readFileSync(p, "utf8");

const sessionsRe =
  /      <SectionCard title="Phiên đăng nhập" icon=\{Key\}>[\s\S]*?      <\/SectionCard>/;
if (sessionsRe.test(s)) {
  s = s.replace(sessionsRe, "      <LoginSessionsSection SectionCard={SectionCard} />");
}

const accountRe =
  /\/\* ─── TAB: Account[\s\S]*?^}\n\n\/\* ─── Main Settings Page/m;
s = s.replace(
  accountRe,
  `/* ─── TAB: Account ──────────────────────────────────────── */
function AccountTab({ onLogout }) {
  return <AccountDangerZone SectionCard={SectionCard} onLogout={onLogout} />;
}

/* ─── Main Settings Page`,
);

fs.writeFileSync(p, s);
console.log("patched", s.includes("LoginSessionsSection"), s.includes("AccountDangerZone"));
