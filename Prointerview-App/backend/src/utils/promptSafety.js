const INJECTION_PATTERNS_EN = [
  /ignore\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?|rules?)/gi,
  /disregard\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?)/gi,
  /forget\s+(everything|all|previous|above)/gi,
  /you\s+are\s+now\s+(a|an)\s+/gi,
  /act\s+as\s+(a|an)\s+/gi,
  /pretend\s+(to\s+be|you\s+are)/gi,
  /your\s+new\s+role\s+(is|will\s+be)/gi,
  /(reveal|show|print|output|display)\s+(your\s+)?(system\s+)?(prompt|instructions?)/gi,
  /what\s+(are|were)\s+your\s+(original\s+)?instructions?/gi,
  // NOTE: \bDAN\b intentionally case-SENSITIVE — real DAN jailbreaks use uppercase.
  // Using /gi would cause false positives on the common Vietnamese syllable "dan".
  /\bDAN\b|jailbreak|developer\s+mode/g,
];

const INJECTION_PATTERNS_VI = [
  /bỏ\s+qua\s+(tất\s+cả\s+)?(các\s+)?(chỉ\s+dẫn|hướng\s+dẫn|lệnh|quy\s+tắc)\s+(trước|trên|phía\s+trên)/gi,
  /quên\s+(tất\s+cả|hết|đi)\s+(những\s+gì|các\s+gì|mọi\s+thứ)/gi,
  /bây\s+giờ\s+(bạn|anh|chị|mày)\s+(là|sẽ\s+là)/gi,
  /đóng\s+vai\s+(một|là|như)/gi,
  /giả\s+vờ\s+(là|rằng|như)/gi,
  /hiển\s+thị\s+(system\s+prompt|chỉ\s+dẫn\s+hệ\s+thống)/gi,
  /tiết\s+lộ\s+(prompt|chỉ\s+dẫn)/gi,
];

// No-diacritics equivalents of VI patterns — catches bypass attempts where attacker
// types Vietnamese without tone marks (phổ biến trên điện thoại / bàn phím không dấu).
const INJECTION_PATTERNS_VI_NODIAC = [
  /bo\s+qua\s+(tat\s+ca\s+)?(cac\s+)?(chi\s+dan|huong\s+dan|lenh|quy\s+tac)\s+(truoc|tren|phia\s+tren)/gi,
  /quen\s+(tat\s+ca|het|di)\s+(nhung\s+gi|cac\s+gi|moi\s+thu)/gi,
  /bay\s+gio\s+(ban|anh|chi|may)\s+(la|se\s+la)/gi,
  /dong\s+vai\s+(mot|la|nhu)/gi,
  /gia\s+vo\s+(la|rang|nhu)/gi,
  /hien\s+thi\s+(system\s+prompt|chi\s+dan\s+he\s+thong)/gi,
  /tiet\s+lo\s+(prompt|chi\s+dan)/gi,
];

const ALL_PATTERNS = [
  ...INJECTION_PATTERNS_EN,
  ...INJECTION_PATTERNS_VI,
  ...INJECTION_PATTERNS_VI_NODIAC,
];

// Zero-width / invisible chars used to obfuscate injection patterns.
// U+200B ZW Space, U+200C ZW Non-Joiner, U+200D ZW Joiner,
// U+FEFF BOM, U+00AD Soft Hyphen, U+2060 Word Joiner.
const ZW_RE = new RegExp(
  "[​‌‍﻿­⁠]",
  "g"
);

function sanitizeUserInput(text, maxLen = 6000) {
  if (!text || typeof text !== "string") {
    return { text: "", injectionAttempts: 0, originalLength: 0 };
  }

  const originalLength = text.length;
  let cleaned = text.slice(0, maxLen);
  let injectionCount = 0;

  // Strip zero-width / invisible unicode chars first so patterns can still match
  // after obfuscation (e.g. "i[ZWS]g[ZWS]nore" -> "ignore")
  cleaned = cleaned.replace(ZW_RE, "");

  // Strip HTML/scripts
  cleaned = cleaned.replace(/<script[\s\S]*?<\/script>/gi, "[removed]");
  cleaned = cleaned.replace(/<style[\s\S]*?<\/style>/gi, "[removed]");
  cleaned = cleaned.replace(/<[^>]+>/g, " ");

  // Strip code blocks
  cleaned = cleaned.replace(/```[\s\S]*?```/g, "[code-block]");
  cleaned = cleaned.replace(/~~~[\s\S]*?~~~/g, "[code-block]");

  // Strip fake system headers
  cleaned = cleaned.replace(/^#{1,6}\s+(SYSTEM|ASSISTANT|USER|HUMAN)[:\s].*$/gim, "");
  cleaned = cleaned.replace(/^(SYSTEM|ASSISTANT|USER|HUMAN)\s*:\s*/gim, "");

  // Neutralize injection patterns
  for (const pattern of ALL_PATTERNS) {
    cleaned = cleaned.replace(pattern, () => {
      injectionCount++;
      return "[content-filtered]";
    });
  }

  // Normalize whitespace
  cleaned = cleaned.replace(/\n{4,}/g, "\n\n\n");
  cleaned = cleaned.replace(/[ \t]{4,}/g, "   ");
  cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

  return {
    text: cleaned.trim(),
    injectionAttempts: injectionCount,
    originalLength,
    truncated: originalLength > maxLen,
  };
}

export { sanitizeUserInput };
