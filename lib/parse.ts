import Papa from "papaparse";
import * as XLSX from "xlsx";
import type {
  ColumnInfo,
  ColumnKind,
  DataRecord,
  FormulaColumn,
  Mapping,
  ParsedCsv,
  ParseError,
  RowError,
  SheetData,
} from "./types";

const MAX_ROWS = 50_000;

export function parseNumber(raw: string): number | null {
  const s = raw.trim();
  if (!s) return null;
  const negative = /^\(.*\)$/.test(s);
  const cleaned = s.replace(/[$€£¥₹,\s()]/g, "");
  if (!cleaned || cleaned === "-" || cleaned === "+") return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  return negative ? -Math.abs(n) : n;
}

export function parseDate(raw: string): number | null {
  const s = raw.trim();
  if (!s) return null;

  let m = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T\s].*)?$/.exec(s);
  if (m) return validUtc(+m[1], +m[2], +m[3]);

  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (m) return validUtc(+m[3], +m[1], +m[2]);

  m = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(s);
  if (m) return validUtc(+m[3], +m[2], +m[1]);

  if (/^\d+$/.test(s)) return null;

  const t = Date.parse(s);
  if (!Number.isFinite(t)) return null;
  const d = new Date(t);
  return validUtc(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

function validUtc(y: number, m: number, d: number): number | null {
  if (y < 1900 || y > 2200 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const ms = Date.UTC(y, m - 1, d);
  const check = new Date(ms);
  if (
    check.getUTCFullYear() !== y ||
    check.getUTCMonth() !== m - 1 ||
    check.getUTCDate() !== d
  ) {
    return null;
  }
  return ms;
}

function parseCsvOnly(file: File): Promise<ParsedCsv> {
  return new Promise((resolve, reject) => {
    const parseErrors: ParseError[] = [];
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (h) => h.trim(),
      complete: (res) => {
        const headers = (res.meta.fields ?? []).filter(Boolean);
        for (const e of res.errors) {
          parseErrors.push({
            row: typeof e.row === "number" ? e.row + 2 : 0,
            message: e.message,
          });
        }
        const rows = res.data.slice(0, MAX_ROWS);
        if (res.data.length > MAX_ROWS) {
          parseErrors.push({
            row: MAX_ROWS,
            message: `Only the first ${MAX_ROWS.toLocaleString()} rows were loaded.`,
          });
        }
        resolve({ headers, rows, parseErrors });
      },
      error: (err) => reject(err),
    });
  });
}

export async function parseDatasetFile(file: File): Promise<ParsedCsv> {
  if (/\.(xlsx|xls)$/i.test(file.name)) {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
    const sheets: Record<string, SheetData> = {};

    for (const name of workbook.SheetNames) {
      const sheet = workbook.Sheets[name];
      const rawMatrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
        header: 1,
        defval: "",
        raw: false,
      });

      if (rawMatrix.length < 2) continue;

      const headers = (rawMatrix[0] as unknown[]).map((h, i) => {
        const clean = String(h ?? "").trim();
        return clean || `Column_${i + 1}`;
      });

      const rows: Record<string, string>[] = [];
      for (let r = 1; r < rawMatrix.length; r++) {
        if (rows.length >= MAX_ROWS) break;
        const line = rawMatrix[r] as unknown[];
        if (!line || line.every((cell) => String(cell ?? "").trim() === "")) continue;
        const obj: Record<string, string> = {};
        headers.forEach((h, idx) => {
          obj[h] = String(line[idx] ?? "").trim();
        });
        rows.push(obj);
      }

      if (rows.length > 0) {
        sheets[name] = { headers, rows, parseErrors: [] };
      }
    }

    const sheetNames = Object.keys(sheets);
    if (sheetNames.length === 0) {
      throw new Error("No non-empty sheets with data rows found in this Excel workbook.");
    }

    const firstSheet = sheetNames[0];
    return {
      ...sheets[firstSheet],
      sheets,
      activeSheet: firstSheet,
    };
  }

  return parseCsvOnly(file);
}

export const parseCsvFile = parseDatasetFile;

export function inferColumns(
  headers: string[],
  rows: Record<string, string>[]
): ColumnInfo[] {
  const sampleRows = rows.slice(0, 200);
  return headers.map((name) => {
    const values = sampleRows
      .map((r) => (r[name] ?? "").trim())
      .filter((v) => v.length > 0);
    const nonEmpty = values.length;
    const unique = new Set(values).size;
    let nums = 0;
    let dates = 0;
    for (const v of values) {
      if (parseNumber(v) !== null) nums++;
      if (parseDate(v) !== null) dates++;
    }
    let kind: ColumnKind = "text";
    if (nonEmpty > 0) {
      if (nums / nonEmpty >= 0.8) kind = "number";
      else if (dates / nonEmpty >= 0.8) kind = "date";
    }
    return {
      name,
      kind,
      nonEmpty,
      unique,
      sample: Array.from(new Set(values)).slice(0, 3),
    };
  });
}

export function defaultMapping(columns: ColumnInfo[]): Mapping | null {
  const numCols = columns.filter((c) => c.kind === "number");
  if (numCols.length === 0) return null;

  const metricHint = /amount|total|price|revenue|sales|cost|spend|value|qty|quantity|balance|profit|fee/i;
  const metric = (numCols.find((c) => metricHint.test(c.name)) ?? numCols[0]).name;

  const dateCol = columns.find((c) => c.kind === "date");

  const textCols = columns.filter((c) => c.kind === "text" && c.unique > 1);
  const catHint = /category|type|department|dept|region|status|group|segment|product|item|channel/i;
  const preferred =
    textCols.find((c) => catHint.test(c.name) && c.unique <= 50) ??
    textCols.find((c) => c.unique <= 25) ??
    textCols[0];

  return {
    metric,
    category: preferred ? preferred.name : null,
    date: dateCol ? dateCol.name : null,
  };
}

export function applyFormulaColumns(
  headers: string[],
  rows: Record<string, string>[],
  formulas: FormulaColumn[]
): { headers: string[]; rows: Record<string, string>[] } {
  if (formulas.length === 0) return { headers, rows };

  const outHeaders = [...headers];
  for (const f of formulas) {
    if (!outHeaders.includes(f.name)) outHeaders.push(f.name);
  }

  const outRows = rows.map((row) => {
    const copy: Record<string, string> = { ...row };
    for (const f of formulas) {
      const a = parseNumber(copy[f.left] ?? "");
      const b = f.right ? parseNumber(copy[f.right] ?? "") : null;
      const k = typeof f.constant === "number" && Number.isFinite(f.constant) ? f.constant : null;

      let res: number | null = null;
      if (a !== null) {
        switch (f.op) {
          case "add":
            if (b !== null) res = a + b;
            break;
          case "subtract":
            if (b !== null) res = a - b;
            break;
          case "multiply":
            if (b !== null) res = a * b;
            break;
          case "divide":
            if (b !== null && b !== 0) res = a / b;
            break;
          case "add_const":
            if (k !== null) res = a + k;
            break;
          case "multiply_const":
            if (k !== null) res = a * k;
            break;
        }
      }
      copy[f.name] = res !== null && Number.isFinite(res) ? String(Math.round(res * 10000) / 10000) : "";
    }
    return copy;
  });

  return { headers: outHeaders, rows: outRows };
}

export function buildRecords(
  rows: Record<string, string>[],
  mapping: Mapping
): { records: DataRecord[]; errors: RowError[] } {
  const records: DataRecord[] = [];
  const errors: RowError[] = [];

  rows.forEach((raw, idx) => {
    const rowNum = idx + 2;
    const metricRaw = raw[mapping.metric] ?? "";
    const metric = parseNumber(metricRaw);
    if (metric === null) {
      errors.push({
        row: rowNum,
        column: mapping.metric,
        value: metricRaw,
        reason: metricRaw.trim() ? "not a number" : "missing number",
      });
      return;
    }

    let date: number | null = null;
    if (mapping.date) {
      const dateRaw = raw[mapping.date] ?? "";
      if (dateRaw.trim()) {
        date = parseDate(dateRaw);
        if (date === null) {
          errors.push({
            row: rowNum,
            column: mapping.date,
            value: dateRaw,
            reason: "unrecognized date",
          });
        }
      }
    }

    const catRaw = mapping.category ? (raw[mapping.category] ?? "").trim() : "";
    const category = mapping.category ? catRaw || "(Uncategorized)" : "All rows";

    records.push({ id: idx + 1, metric, category, date, raw });
  });

  return { records, errors };
}