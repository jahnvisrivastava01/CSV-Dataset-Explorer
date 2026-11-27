const full = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

export const fmt = (n: number): string => full.format(n);
export const fmtCompact = (n: number): string => compact.format(n);

export function fmtDate(ts: number | null): string {
  if (ts === null) return "";
  return new Date(ts).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function toInputDate(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}
