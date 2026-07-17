/**
 * Structured logger — wraps console, emits JSON lines.
 * No extra deps: works with Node 20 ESM out of the box.
 * In prod, pipe stdout to a log aggregator (Datadog, Loki, etc.).
 */

function log(level, event, data = {}) {
  const entry = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    event,
    ...data,
  });
  // warn + error → stderr so they're separable in log pipelines
  if (level === "warn" || level === "error") {
    process.stderr.write(entry + "\n");
  } else {
    process.stdout.write(entry + "\n");
  }
}

export const logger = {
  info:  (event, data = {}) => log("info",  event, data),
  warn:  (event, data = {}) => log("warn",  event, data),
  error: (event, data = {}) => log("error", event, data),
};
