export function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/** Offset of `iso` from `baseIso`, e.g. "+3.2s". */
export function relativeOffset(iso: string, baseIso: string): string {
  const diff = new Date(iso).getTime() - new Date(baseIso).getTime();
  if (Number.isNaN(diff)) return "";
  const sign = diff < 0 ? "-" : "+";
  return `${sign}${(Math.abs(diff) / 1000).toFixed(1)}s`;
}

export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "0s";
  const total = Math.round(ms / 1000);
  if (total === 0) return `${ms}ms`;
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const parts: string[] = [];
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  if (s || parts.length === 0) parts.push(`${s}s`);
  return parts.join(" ");
}

export function shortId(id: string): string {
  return id.slice(0, 8);
}

export function pathOf(url: string): string {
  try {
    const u = new URL(url);
    return `${u.pathname}${u.search}${u.hash}` || "/";
  } catch {
    return url;
  }
}
