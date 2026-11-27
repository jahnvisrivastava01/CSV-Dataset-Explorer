import type { ColumnInfo, DataRecord, Filters, Row } from "./types";

export const emptyFilters: Filters = {
  categories: [],
  from: "",
  to: "",
  min: "",
  max: "",
  search: "",
  outliersOnly: false,
};

export function hasActiveFilters(f: Filters): boolean {
  return (
    f.categories.length > 0 ||
    !!f.from ||
    !!f.to ||
    !!f.min ||
    !!f.max ||
    !!f.search.trim() ||
    f.outliersOnly
  );
}

export interface OutlierBounds {
  q1: number;
  median: number;
  q3: number;
  iqr: number;
  lowerFence: number;
  upperFence: number;
  outlierIds: Set<number>;
}

export function computeOutliers(records: DataRecord[]): OutlierBounds {
  if (records.length < 4) {
    return {
      q1: 0,
      median: 0,
      q3: 0,
      iqr: 0,
      lowerFence: -Infinity,
      upperFence: Infinity,
      outlierIds: new Set(),
    };
  }

  const sorted = [...records].map((r) => r.amount).sort((a, b) => a - b);
  const quantile = (q: number) => {
    const pos = (sorted.length - 1) * q;
    const base = Math.floor(pos);
    const rest = pos - base;
    const cur = sorted[base] ?? 0;
    const next = sorted[base + 1];
    return next !== undefined ? cur + rest * (next - cur) : cur;
  };

  const q1 = quantile(0.25);
  const median = quantile(0.5);
  const q3 = quantile(0.75);
  const iqr = q3 - q1;
  const lowerFence = q1 - 1.5 * iqr;
  const upperFence = q3 + 1.5 * iqr;

  const outlierIds = new Set<number>();
  if (iqr > 0) {
    for (const r of records) {
      if (r.amount < lowerFence || r.amount > upperFence) {
        outlierIds.add(r.id);
      }
    }
  }

  return { q1, median, q3, iqr, lowerFence, upperFence, outlierIds };
}

export function applyFilters(
  records: DataRecord[],
  f: Filters,
  outlierIds?: Set<number>
): DataRecord[] {
  const from = f.from ? Date.parse(f.from) : null;
  const to = f.to ? Date.parse(f.to) : null;
  const min = f.min !== "" ? Number(f.min) : null;
  const max = f.max !== "" ? Number(f.max) : null;
  const q = f.search.trim().toLowerCase();
  const cats = f.categories.length ? new Set(f.categories) : null;

  return records.filter((r) => {
    if (f.outliersOnly && outlierIds && !outlierIds.has(r.id)) return false;
    if (cats && !cats.has(r.category)) return false;
    if (from !== null && (r.date === null || r.date < from)) return false;
    if (to !== null && (r.date === null || r.date > to)) return false;
    if (min !== null && !Number.isNaN(min) && r.amount < min) return false;
    if (max !== null && !Number.isNaN(max) && r.amount > max) return false;
    if (q && !Object.values(r.raw).some((v) => v.toLowerCase().includes(q))) return false;
    return true;
  });
}

export interface Kpis {
  count: number;
  total: number;
  average: number;
  median: number;
  largest: number;
  smallest: number;
  topCategory: { name: string; total: number } | null;
}

export interface NamedValue {
  name: string;
  value: number;
}

export function byCategory(records: DataRecord[]): NamedValue[] {
  const map = new Map<string, number>();
  for (const r of records) map.set(r.category, (map.get(r.category) ?? 0) + r.amount);
  return [...map].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

export function computeKpis(records: DataRecord[]): Kpis {
  const count = records.length;
  let total = 0;
  let largest = -Infinity;
  let smallest = Infinity;
  const vals: number[] = [];

  for (const r of records) {
    total += r.amount;
    if (r.amount > largest) largest = r.amount;
    if (r.amount < smallest) smallest = r.amount;
    vals.push(r.amount);
  }

  vals.sort((a, b) => a - b);
  const mid = Math.floor(vals.length / 2);
  const median =
    vals.length === 0
      ? 0
      : vals.length % 2 !== 0
      ? vals[mid] ?? 0
      : ((vals[mid - 1] ?? 0) + (vals[mid] ?? 0)) / 2;

  const top = byCategory(records)[0];
  return {
    count,
    total,
    average: count ? total / count : 0,
    median,
    largest: count ? largest : 0,
    smallest: count ? smallest : 0,
    topCategory: top ? { name: top.name, total: top.value } : null,
  };
}

export interface DataHealthReport {
  totalRows: number;
  validRows: number;
  completenessPct: number;
  duplicateRows: number;
  columnStats: {
    name: string;
    type: ColumnInfo["type"];
    missingCount: number;
    missingPct: number;
    uniqueCount: number;
  }[];
}

export function computeDataHealth(
  headers: string[],
  rows: Row[],
  columns: ColumnInfo[],
  validCount: number
): DataHealthReport {
  const totalRows = rows.length;
  const seen = new Set<string>();
  let duplicateRows = 0;

  for (const r of rows) {
    const sig = headers.map((h) => (r[h] ?? "").trim()).join("||");
    if (seen.has(sig)) duplicateRows++;
    else seen.add(sig);
  }

  let totalCells = totalRows * headers.length;
  let filledCells = 0;

  const columnStats = columns.map((col) => {
    let missingCount = 0;
    const uniq = new Set<string>();
    for (const r of rows) {
      const v = (r[col.name] ?? "").trim();
      if (!v) {
        missingCount++;
      } else {
        filledCells++;
        uniq.add(v);
      }
    }
    return {
      name: col.name,
      type: col.type,
      missingCount,
      missingPct: totalRows > 0 ? Math.round((missingCount / totalRows) * 1000) / 10 : 0,
      uniqueCount: uniq.size,
    };
  });

  return {
    totalRows,
    validRows: validCount,
    completenessPct: totalCells > 0 ? Math.round((filledCells / totalCells) * 1000) / 10 : 100,
    duplicateRows,
    columnStats,
  };
}

export interface MonthPoint {
  key: string; // yyyy-mm
  label: string;
  value: number;
}

export function byMonth(records: DataRecord[]): MonthPoint[] {
  const map = new Map<string, number>();
  for (const r of records) {
    if (r.date === null) continue;
    const key = new Date(r.date).toISOString().slice(0, 7);
    map.set(key, (map.get(key) ?? 0) + r.amount);
  }
  return [...map]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([key, value]) => ({
      key,
      value,
      label: new Date(`${key}-01T00:00:00Z`).toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
        timeZone: "UTC",
      }),
    }));
}

/** Top N slices plus an "Other" bucket, for the donut chart. */
export function topWithOther(items: NamedValue[], n: number): NamedValue[] {
  const positive = items.filter((i) => i.value > 0);
  if (positive.length <= n) return positive;
  const head = positive.slice(0, n);
  const other = positive.slice(n).reduce((s, i) => s + i.value, 0);
  return [...head, { name: "Other", value: other }];
}
