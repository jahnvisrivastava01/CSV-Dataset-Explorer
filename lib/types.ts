export type Row = Record<string, string>;

export type ColumnType = "number" | "date" | "category" | "text";

export interface ColumnInfo {
  name: string;
  type: ColumnType;
}

/** A problem found while reading or validating the file. */
export interface RowError {
  row: number; // 1-based data row (header excluded)
  column?: string;
  message: string;
}

export interface ParsedCsv {
  headers: string[];
  rows: Row[];
  parseErrors: RowError[];
}

export interface Dataset extends ParsedCsv {
  fileName: string;
  columns: ColumnInfo[];
}

/** Which columns drive the KPIs and charts. */
export interface Mapping {
  metric: string; // required numeric column
  date: string | null;
  category: string | null;
}

/** A custom formula column created by the user (e.g. Amount * 1.18 or Revenue - Cost). */
export type FormulaOp = "+" | "-" | "*" | "/";

export interface FormulaColumn {
  id: string;
  name: string;
  leftCol: string;
  op: FormulaOp;
  rightMode: "column" | "constant";
  rightCol?: string;
  rightConstant?: number;
  decimals: number;
}

/** A row that passed validation. */
export interface DataRecord {
  id: number;
  row: number;
  date: number | null; // UTC timestamp (ms)
  category: string;
  amount: number;
  raw: Row;
}

export interface Filters {
  categories: string[]; // empty = all
  from: string; // yyyy-mm-dd or ""
  to: string;
  min: string;
  max: string;
  search: string;
  outliersOnly: boolean;
}
