import Papa from "papaparse";
import type {
  ColumnInfo,
  DataRecord,
  FormulaColumn,
  Mapping,
  ParsedCsv,
  Row,
  RowError,
} from "./types";

/* ---------- value parsers ---------- */

/** "$1,250.50", "(300)", "₹ 99" -> number. Returns null when not numeric. */
export function parseNumber(value: string | undefined): number | null {
  if (value === undefined) return null;
  let s = value.trim();
  if (!s) return null;
  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  s = s.replace(/[₹$€£\s,]/g, "");
  if (!/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(s)) return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return negative ? -n : n;
}

function utc(y: number, m: number, d: number): number | null {
  const t = Date.UTC(y, m - 1, d);
  const dt = new Date(t);
  const ok =
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d;
  return ok ? t : null;
}

const ISO = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[T\s].*)?$/;
const SLASH = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})(?:\s.*)?$/;

/**
 * Parses common date formats into a UTC timestamp.
 * yyyy-mm-dd, dd/mm/yyyy, mm/dd/yyyy and "Jan 5, 2026" are supported.
 * For ambiguous values like 03/04/2026 we assume month/day (US style).
 */
export function parseDate(value: string | undefined): number | null {
  if (value === undefined) return null;
  const s = value.trim();
  if (!s) return null;

  let m = ISO.exec(s);
  if (m) return utc(Number(m[1]), Number(m[2]), Number(m[3]));

  m = SLASH.exec(s);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    let y = Number(m[3]);
    if (m[3]!.length === 2) y += 2000;
    if (a > 12) return utc(y, b, a); // dd/mm/yyyy
    return utc(y, a, b); // mm/dd/yyyy
  }

  if (/[a-z]/i.test(s)) {
    const p = Date.parse(s);
    if (!Number.isNaN(p)) {
      const d = new Date(p);
      return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
    }
  }
  return null;
}

/* ---------- CSV reading ---------- */

export function parseCsvFile(file: File): Promise<ParsedCsv> {
  return new Promise((resolve, reject) => {
    Papa.parse<Row>(file, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (h) => h.trim(),
      complete: (res) => {
        const headers = (res.meta.fields ?? []).filter((h) => h !== "");
        const parseErrors: RowError[] = res.errors
          .filter((e) => e.code !== "UndetectableDelimiter")
          .map((e) => ({
            row: (e.row ?? 0) + 1,
            message: e.message,
          }));
        resolve({ headers, rows: res.data, parseErrors });
      },
      error: (err) => reject(err),
    });
  });
}

/* ---------- formula evaluation ---------- */

export function applyFormulaColumns(
  baseHeaders: string[],
  baseRows: Row[],
  formulas: FormulaColumn[]
): { headers: string[]; rows: Row[] } {
  if (formulas.length === 0) {
    return { headers: baseHeaders, rows: baseRows };
  }

  const headers = [...baseHeaders];
  for (const f of formulas) {
    if (!headers.includes(f.name)) headers.push(f.name);
  }

  const rows = baseRows.map((raw) => {
    const next: Row = { ...raw };
    for (const f of formulas) {
      const left = parseNumber(next[f.leftCol]);
      const right =
        f.rightMode === "column"
          ? f.rightCol
            ? parseNumber(next[f.rightCol])
            : null
          : f.rightConstant ?? null;

      if (left === null || right === null) {
        next[f.name] = "";
        continue;
      }

      let val: number | null = null;
      if (f.op === "+") val = left + right;
      else if (f.op === "-") val = left - right;
      else if (f.op === "*") val = left * right;
      else if (f.op === "/") val = right === 0 ? null : left / right;

      next[f.name] =
        val === null || !Number.isFinite(val)
          ? ""
          : Number(val.toFixed(f.decimals)).toString();
    }
    return next;
  });

  return { headers, rows };
}

/* ---------- column inference ---------- */

const SAMPLE = 500;

export function inferColumns(headers: string[], rows: Row[]): ColumnInfo[] {
  return headers.map((name) => {
    const values: string[] = [];
    for (const r of rows) {
      const v = (r[name] ?? "").trim();
      if (v) values.push(v);
      if (values.length >= SAMPLE) break;
    }
    if (values.length === 0) return { name, type: "text" };

    const share = (fn: (v: string) => unknown) =>
      values.filter((v) => fn(v) !== null).length / values.length;

    if (share(parseDate) >= 0.9) return { name, type: "date" };
    if (share(parseNumber) >= 0.9) return { name, type: "number" };

    const unique = new Set(values).size;
    if (unique <= Math.max(25, values.length * 0.25)) {
      return { name, type: "category" };
    }
    return { name, type: "text" };
  });
}

export function defaultMapping(columns: ColumnInfo[]): Mapping | null {
  const numbers = columns.filter((c) => c.type === "number");
  if (numbers.length === 0) return null;

  const idLike = /(^id$|_id$|\bid$|index|^row|zip|postal|phone)/i;
  const metricHint = /amount|price|sales|cost|total|expense|revenue|spend|value/i;
  const metric =
    numbers.find((c) => metricHint.test(c.name)) ??
    numbers.find((c) => !idLike.test(c.name)) ??
    numbers[0]!;

  const categories = columns.filter(
    (c) => c.type === "category" && c.name !== metric.name
  );
  const fallbackText = columns.filter(
    (c) => c.type === "text" && c.name !== metric.name
  );

  const category =
    categories.find((c) => /categor|type|dept|segment|group|author|genre/i.test(c.name)) ??
    categories[0] ??
    fallbackText[0] ??
    null;

  const date = columns.find((c) => c.type === "date") ?? null;

  return { metric: metric.name, date: date?.name ?? null, category: category?.name ?? null };
}

/* ---------- validation ---------- */

export interface BuildResult {
  records: DataRecord[];
  errors: RowError[];
}

/** Validates every row against the chosen mapping. Bad rows are reported, not silently dropped. */
export function buildRecords(rows: Row[], mapping: Mapping): BuildResult {
  const records: DataRecord[] = [];
  const errors: RowError[] = [];

  rows.forEach((raw, i) => {
    const row = i + 1;

    const amount = parseNumber(raw[mapping.metric]);
    if (amount === null) {
      errors.push({
        row,
        column: mapping.metric,
        message: `"${raw[mapping.metric] ?? ""}" is not a valid number`,
      });
      return;
    }

    let date: number | null = null;
    if (mapping.date) {
      date = parseDate(raw[mapping.date]);
      if (date === null) {
        errors.push({
          row,
          column: mapping.date,
          message: `"${raw[mapping.date] ?? ""}" is not a valid date`,
        });
        return;
      }
    }

    const category = mapping.category
      ? (raw[mapping.category] ?? "").trim() || "Uncategorized"
      : "All";

    records.push({ id: i, row, date, category, amount, raw });
  });

  return { records, errors };
}
