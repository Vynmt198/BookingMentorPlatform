/** Một mốc học vấn (trường, bằng cấp, thời gian). */
export function emptyEducationEntry() {
  return {
    school: "",
    major: "",
    degree: "",
    startMonth: "",
    endMonth: "",
    isCurrent: false,
    gpa: "",
    note: "",
  };
}

function filled(v) {
  return String(v ?? "").trim().length > 0;
}

function formatMonthLabel(ym) {
  const s = String(ym ?? "").trim();
  if (!/^\d{4}-\d{2}$/.test(s)) return s || "-";
  const [y, m] = s.split("-");
  return `${m}/${y}`;
}

export function parseEducationHistory(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return [emptyEducationEntry()];
  if (s.startsWith("{")) {
    try {
      const data = JSON.parse(s);
      if (data?.version === 1 && Array.isArray(data.entries) && data.entries.length) {
        return data.entries.map((e) => ({
          school: String(e?.school ?? "").trim(),
          major: String(e?.major ?? "").trim(),
          degree: String(e?.degree ?? "").trim(),
          startMonth: String(e?.startMonth ?? "").trim(),
          endMonth: String(e?.endMonth ?? "").trim(),
          isCurrent: Boolean(e?.isCurrent),
          gpa: String(e?.gpa ?? "").trim(),
          note: String(e?.note ?? "").trim(),
        }));
      }
    } catch {
      /* legacy text */
    }
  }
  return [{ ...emptyEducationEntry(), school: s }];
}

export function serializeEducationHistory(entries) {
  const list = Array.isArray(entries) ? entries : [];
  return JSON.stringify({
    version: 1,
    entries: list.map((e) => ({
      school: String(e?.school ?? "").trim(),
      major: String(e?.major ?? "").trim(),
      degree: String(e?.degree ?? "").trim(),
      startMonth: String(e?.startMonth ?? "").trim(),
      endMonth: e?.isCurrent ? "" : String(e?.endMonth ?? "").trim(),
      isCurrent: Boolean(e?.isCurrent),
      gpa: String(e?.gpa ?? "").trim(),
      note: String(e?.note ?? "").trim(),
    })),
  });
}

export function formatEducationEntryPeriod(entry) {
  if (!entry) return "";
  if (entry.isCurrent && entry.startMonth) {
    return `${formatMonthLabel(entry.startMonth)} - Hiện tại`;
  }
  if (entry.startMonth && entry.endMonth) {
    return `${formatMonthLabel(entry.startMonth)} - ${formatMonthLabel(entry.endMonth)}`;
  }
  if (entry.startMonth) return `Từ ${formatMonthLabel(entry.startMonth)}`;
  if (entry.isCurrent) return "Đang học";
  return "";
}

export function formatEducationHistoryLines(entries) {
  const list = Array.isArray(entries) ? entries : [];
  const lines = [];
  for (const e of list) {
    const school = e.school || "-";
    const major = e.major ? ` - ${e.major}` : "";
    const degree = e.degree ? `${e.degree} · ` : "";
    const period = formatEducationEntryPeriod(e);
    const periodPart = period ? ` (${period})` : "";
    const currentTag = e.isCurrent ? " [Đang học]" : "";
    const gpaPart = e.gpa ? ` · GPA ${e.gpa}` : "";
    lines.push(`${degree}${school}${major}${currentTag}${periodPart}${gpaPart}`);
    if (e.note) lines.push(`  ${e.note}`);
  }
  return lines.filter(Boolean).join("\n");
}

export function hasEducationHistoryContent(entries) {
  const list = Array.isArray(entries) ? entries : [];
  return list.some(
    (e) =>
      filled(e.school) ||
      filled(e.major) ||
      filled(e.degree) ||
      filled(e.note) ||
      filled(e.gpa),
  );
}

/** Hiển thị từ DB (JSON hoặc text cũ). */
export function formatEducationDisplay(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  if (s.startsWith("{")) {
    return formatEducationHistoryLines(parseEducationHistory(s));
  }
  return s;
}
