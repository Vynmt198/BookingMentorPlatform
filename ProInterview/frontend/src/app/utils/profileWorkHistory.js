/** Một mốc kinh nghiệm làm việc (quá khứ hoặc hiện tại). */
export function emptyWorkEntry() {
  return {
    role: "",
    company: "",
    startMonth: "",
    endMonth: "",
    isCurrent: false,
    note: "",
  };
}

function filled(v) {
  return String(v ?? "").trim().length > 0;
}

export function parseWorkHistory(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return [emptyWorkEntry()];
  if (s.startsWith("{")) {
    try {
      const data = JSON.parse(s);
      if (data?.version === 1 && Array.isArray(data.entries) && data.entries.length) {
        return data.entries.map((e) => ({
          role: String(e?.role ?? "").trim(),
          company: String(e?.company ?? "").trim(),
          startMonth: String(e?.startMonth ?? "").trim(),
          endMonth: String(e?.endMonth ?? "").trim(),
          isCurrent: Boolean(e?.isCurrent),
          note: String(e?.note ?? "").trim(),
        }));
      }
    } catch {
      /* legacy text */
    }
  }
  return [
    {
      ...emptyWorkEntry(),
      note: s,
    },
  ];
}

export function serializeWorkHistory(entries) {
  const list = Array.isArray(entries) ? entries : [];
  return JSON.stringify({
    version: 1,
    entries: list.map((e) => ({
      role: String(e?.role ?? "").trim(),
      company: String(e?.company ?? "").trim(),
      startMonth: String(e?.startMonth ?? "").trim(),
      endMonth: e?.isCurrent ? "" : String(e?.endMonth ?? "").trim(),
      isCurrent: Boolean(e?.isCurrent),
      note: String(e?.note ?? "").trim(),
    })),
  });
}

function formatMonthLabel(ym) {
  const s = String(ym ?? "").trim();
  if (!/^\d{4}-\d{2}$/.test(s)) return s || "—";
  const [y, m] = s.split("-");
  return `${m}/${y}`;
}

/** Gợi ý tháng bắt đầu từ tổng số năm KN (khi dữ liệu cũ chưa có startMonth). */
export function inferStartMonthFromExperienceYears(years) {
  const n = Number(years);
  if (!Number.isFinite(n) || n <= 0) return "";
  const now = new Date();
  const startYear = now.getFullYear() - Math.max(1, Math.round(n));
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${startYear}-${month}`;
}

/** Một dòng hiển thị khoảng thời gian làm việc. */
export function formatWorkEntryPeriod(entry) {
  if (!entry) return "";
  if (entry.isCurrent && entry.startMonth) {
    return `${formatMonthLabel(entry.startMonth)} — Hiện tại`;
  }
  if (entry.startMonth && entry.endMonth) {
    return `${formatMonthLabel(entry.startMonth)} — ${formatMonthLabel(entry.endMonth)}`;
  }
  if (entry.startMonth) {
    return `Từ ${formatMonthLabel(entry.startMonth)}`;
  }
  if (entry.isCurrent) return "";
  return "";
}

/** Hiển thị cho admin / export text. */
export function formatWorkHistoryLines(entries) {
  const list = Array.isArray(entries) ? entries : [];
  const lines = [];
  for (const e of list) {
    const role = e.role || "—";
    const company = e.company || "—";
    let period = "—";
    if (e.isCurrent && e.startMonth) {
      period = `${formatMonthLabel(e.startMonth)} — Hiện tại`;
    } else if (e.startMonth && e.endMonth) {
      period = `${formatMonthLabel(e.startMonth)} — ${formatMonthLabel(e.endMonth)}`;
    } else if (e.startMonth) {
      period = `Từ ${formatMonthLabel(e.startMonth)}`;
    } else if (e.isCurrent) {
      period = "Hiện tại";
    }
    const tag = e.isCurrent ? " [Hiện tại]" : "";
    lines.push(`${role} · ${company}${tag} (${period})`);
    if (e.note) lines.push(`  ${e.note}`);
  }
  return lines.filter(Boolean).join("\n");
}

export function hasWorkHistoryContent(entries) {
  const list = Array.isArray(entries) ? entries : [];
  return list.some((e) => filled(e.role) || filled(e.company) || filled(e.note));
}

/** Lấy mốc “hiện tại” hoặc mốc đầu — đồng bộ mentor.title / company. */
export function pickCurrentWorkEntry(entries) {
  const list = Array.isArray(entries) ? entries : [];
  return list.find((e) => e.isCurrent) || list.find((e) => filled(e.role) || filled(e.company)) || null;
}

export function workHistoryToCompanies(entries) {
  return (Array.isArray(entries) ? entries : [])
    .map((e) => String(e?.company ?? "").trim())
    .filter(Boolean);
}

function monthsBetween(startYm, endYm) {
  if (!/^\d{4}-\d{2}$/.test(startYm)) return null;
  const end = endYm && /^\d{4}-\d{2}$/.test(endYm) ? endYm : null;
  const [sy, sm] = startYm.split("-").map(Number);
  const now = new Date();
  const ey = end ? Number(end.split("-")[0]) : now.getFullYear();
  const em = end ? Number(end.split("-")[1]) : now.getMonth() + 1;
  const months = (ey - sy) * 12 + (em - sm) + 1;
  return months > 0 ? months : null;
}

export function estimateExperienceYears(entries) {
  const list = Array.isArray(entries) ? entries : [];
  let totalMonths = 0;
  for (const e of list) {
    const m = monthsBetween(e.startMonth, e.isCurrent ? "" : e.endMonth);
    if (m) totalMonths += m;
  }
  if (totalMonths <= 0) return null;
  return Math.max(1, Math.round(totalMonths / 12));
}
