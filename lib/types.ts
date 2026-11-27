export type ColumnKind = "number" | "date" | "text";

export interface ColumnInfo {
  name: string;
  kind: ColumnKind;
  nonEmpty: number;
  unique: number;
  sample: string[];
}

export interface Mapping {
  metric: string;
  category: string | null;
  date: string | null;
}

export type FormulaOp =
  | "add"
  | "subtract"
  | "multiply"
  | "divide"
  | "add_const"
  | "multiply_const";

export interface FormulaColumn {
  id: string;
  name: string;
  left: string;
  op: FormulaOp;
  right?: string;
  constant?: number;
}

export interface ParseError {
  row: number;
  message: string;
}

export interface SheetData {
  headers: string[];
  rows: Record<string, string>[];
  parseErrors: ParseError[];
}

export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
  parseErrors: ParseError[];
  sheets?: Record<string, SheetData>;
  activeSheet?: string;
}

export interface RowError {
  row: number;
  column: string;
  value: string;
  reason: string;
}

export interface DataRecord {
  id: number;
  metric: number;
  category: string;
  date: number | null;
  raw: Record<string, string>;
}

export interface Filters {
  search: string;
  categories: string[];
  dateFrom: string;
  dateTo: string;
  minVal: string;
  maxVal: string;
  outliersOnly: boolean;
}

export interface Kpis {
  total: number;
  count: number;
  average: number;
  median: number;
  min: number;
  max: number;
  topCategory: { name: string; total: number } | null;
}

export interface CategoryPoint {
  name: string;
  total: number;
  count: number;
}

export interface MonthPoint {
  month: string;
  total: number;
  count: number;
}

export interface OutlierSummary {
  count: number;
  lowerFence: number | null;
  upperFence: number | null;
  q1: number | null;
  q3: number | null;
  outlierIds: number[];
}

export interface DataHealth {
  totalRows: number;
  validRows: number;
  duplicateRows: number;
  completenessPct: number;
  columnMissing: { column: string; missing: number; pct: number; kind: ColumnKind }[];
}