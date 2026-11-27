"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";
import Dropzone from "@/components/Dropzone";
import ColumnMapper from "@/components/ColumnMapper";
import FormulaBuilder from "@/components/FormulaBuilder";
import DataHealthPanel from "@/components/DataHealthPanel";
import ValidationPanel from "@/components/ValidationPanel";
import KpiCards from "@/components/KpiCards";
import Filters from "@/components/Filters";
import Charts from "@/components/Charts";
import DataTable from "@/components/DataTable";
import {
  applyFormulaColumns,
  buildRecords,
  defaultMapping,
  inferColumns,
  parseCsvFile,
} from "@/lib/parse";
import {
  applyFilters,
  byCategory,
  byMonth,
  computeDataHealth,
  computeKpis,
  computeOutliers,
  emptyFilters,
  hasActiveFilters,
  topWithOther,
} from "@/lib/analytics";
import { toInputDate } from "@/lib/format";
import type {
  Filters as FilterState,
  FormulaColumn,
  Mapping,
  ParsedCsv,
} from "@/lib/types";

const STORAGE_KEY = "csv-explorer-session-v1";

export default function Page() {
  const [rawDataset, setRawDataset] = useState<(ParsedCsv & { fileName: string }) | null>(null);
  const [formulas, setFormulas] = useState<FormulaColumn[]>([]);
  const [mapping, setMapping] = useState<Mapping | null>(null);
  const [filters, setFilters] = useState<FilterState>(emptyFilters);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Restore saved dataset, formulas, mapping, and filters before rendering Dropzone
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.rawDataset && data.mapping) {
          setRawDataset(data.rawDataset);
          setFormulas(data.formulas ?? []);
          setMapping(data.mapping);
          setFilters(data.filters ?? emptyFilters);
        }
      }
    } catch {
      /* ignore corrupted or unavailable storage */
    } finally {
      setHydrated(true);
    }
  }, []);

  // Automatically save whenever dataset, formulas, mapping, or filters change
  useEffect(() => {
    if (!hydrated) return;
    try {
      if (!rawDataset || !mapping) {
        sessionStorage.removeItem(STORAGE_KEY);
        return;
      }
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ rawDataset, formulas, mapping, filters })
      );
    } catch {
      /* ignore quota exceeded for huge files (>5MB) */
    }
  }, [rawDataset, formulas, mapping, filters, hydrated]);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    setLoading(true);
    try {
      if (!/\.(csv|tsv|txt|xlsx|xls)$/i.test(file.name)) {
        throw new Error("Please choose a .csv or .xlsx file.");
      }
      const parsed = await parseCsvFile(file);
      if (parsed.headers.length === 0 || parsed.rows.length === 0) {
        throw new Error("No data rows found in this file.");
      }
      const columns = inferColumns(parsed.headers, parsed.rows);
      const m = defaultMapping(columns);
      if (!m) {
        throw new Error("No numeric column found. Add a column with numbers, such as Amount.");
      }
      setRawDataset({ fileName: file.name, ...parsed });
      setFormulas([]);
      setMapping(m);
      setFilters(emptyFilters);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read this file.");
    } finally {
      setLoading(false);
    }
  }, []);

  const computed = useMemo(() => {
    if (!rawDataset) return null;
    const { headers, rows } = applyFormulaColumns(
      rawDataset.headers,
      rawDataset.rows,
      formulas
    );
    const columns = inferColumns(headers, rows);
    return {
      fileName: rawDataset.fileName,
      parseErrors: rawDataset.parseErrors,
      headers,
      rows,
      columns,
    };
  }, [rawDataset, formulas]);

  const built = useMemo(
    () => (computed && mapping ? buildRecords(computed.rows, mapping) : null),
    [computed, mapping]
  );

  const records = built?.records ?? [];
  const outliers = useMemo(() => computeOutliers(records), [records]);
  const filtered = useMemo(
    () => applyFilters(records, filters, outliers.outlierIds),
    [records, filters, outliers.outlierIds]
  );
  const kpis = useMemo(() => computeKpis(filtered), [filtered]);
  const allCategories = useMemo(() => byCategory(records), [records]);
  const categories = useMemo(() => byCategory(filtered), [filtered]);
  const months = useMemo(() => byMonth(filtered), [filtered]);
  const pie = useMemo(() => topWithOther(categories, 6), [categories]);

  const health = useMemo(
    () =>
      computed
        ? computeDataHealth(computed.headers, computed.rows, computed.columns, records.length)
        : null,
    [computed, records.length]
  );

  const dateBounds = useMemo(() => {
    const dates = records.flatMap((r) => (r.date === null ? [] : [r.date]));
    if (dates.length === 0) return null;
    return { min: toInputDate(Math.min(...dates)), max: toInputDate(Math.max(...dates)) };
  }, [records]);

  function toggleCategory(name: string) {
    setFilters((f) => ({
      ...f,
      categories: f.categories.includes(name)
        ? f.categories.filter((c) => c !== name)
        : [...f.categories, name],
    }));
  }

  function changeMapping(m: Mapping) {
    setMapping(m);
    setFilters(emptyFilters);
  }

  function switchSheet(sheetName: string) {
    if (!rawDataset?.sheets?.[sheetName]) return;
    const nextSheet = rawDataset.sheets[sheetName];
    const cols = inferColumns(nextSheet.headers, nextSheet.rows);
    const m = defaultMapping(cols);
    if (!m) {
      setError(`Sheet "${sheetName}" has no numeric column to chart.`);
      return;
    }
    setError(null);
    setRawDataset({
      ...rawDataset,
      ...nextSheet,
      activeSheet: sheetName,
    });
    setFormulas([]);
    setMapping(m);
    setFilters(emptyFilters);
  }

  function addFormula(f: FormulaColumn) {
    setFormulas((prev) => [...prev, f]);
    setMapping((prev) => (prev ? { ...prev, metric: f.name } : prev));
  }

  function removeFormula(id: string) {
    const target = formulas.find((f) => f.id === id);
    const next = formulas.filter((f) => f.id !== id);
    setFormulas(next);
    if (target && mapping?.metric === target.name && rawDataset) {
      const baseCols = inferColumns(rawDataset.headers, rawDataset.rows);
      const fallback = defaultMapping(baseCols);
      if (fallback) setMapping(fallback);
    }
  }

  const allErrors = [...(built?.errors ?? [])];

  return (
    <main className="container">
      <header className="topbar">
        <div>
          <h1>Dataset Explorer</h1>
          <p>Drop in a CSV or Excel workbook. Rows are checked, transformed with formulas, charted, and filterable.</p>
        </div>
        <ThemeToggle />
      </header>

      <div className="stack">
        {hydrated && !computed && <Dropzone onFile={handleFile} loading={loading} />}
        {error && <div className="alert error" role="alert">{error}</div>}

        {computed && mapping && built && health && (
          <>
            <div className="card">
              <div className="fileline">
                <span>
                  <b>{computed.fileName}</b>
                  {rawDataset?.activeSheet ? ` (${rawDataset.activeSheet})` : ""} ·{" "}
                  {computed.rows.length} rows · {computed.headers.length} columns
                </span>
                <button
                  className="btn"
                  onClick={() => {
                    sessionStorage.removeItem(STORAGE_KEY);
                    setRawDataset(null);
                    setFormulas([]);
                    setMapping(null);
                  }}
                >
                  Load another file
                </button>
              </div>

              {rawDataset?.sheets && Object.keys(rawDataset.sheets).length > 1 && (
                <div className="sheet-tabs" role="tablist" aria-label="Excel sheets">
                  <span className="muted">Sheets:</span>
                  {Object.keys(rawDataset.sheets).map((sheetName) => (
                    <button
                      key={sheetName}
                      type="button"
                      role="tab"
                      aria-selected={rawDataset.activeSheet === sheetName}
                      className={`chip${rawDataset.activeSheet === sheetName ? " active-sheet" : ""}`}
                      onClick={() => switchSheet(sheetName)}
                    >
                      {sheetName}
                    </button>
                  ))}
                </div>
              )}

              <ColumnMapper columns={computed.columns} mapping={mapping} onChange={changeMapping} />
            </div>

            <div className="tools-grid">
              <FormulaBuilder
                columns={computed.columns}
                formulas={formulas}
                onAdd={addFormula}
                onRemove={removeFormula}
              />

              {records.length > 0 && (
                <DataHealthPanel
                  health={health}
                  outliers={outliers}
                  metric={mapping.metric}
                  outliersOnly={filters.outliersOnly}
                  onToggleOutliers={() =>
                    setFilters((f) => ({ ...f, outliersOnly: !f.outliersOnly }))
                  }
                />
              )}
            </div>

            {computed.parseErrors.length > 0 && (
              <div className="alert warn" role="status">
                <details>
                  <summary>{computed.parseErrors.length} formatting problems in the file</summary>
                  <ul>
                    {computed.parseErrors.slice(0, 50).map((e, i) => (
                      <li key={i}>Row {e.row}: {e.message}</li>
                    ))}
                  </ul>
                </details>
              </div>
            )}
            <ValidationPanel errors={allErrors} total={computed.rows.length} />

            {records.length === 0 ? (
              <div className="alert error" role="alert">
                No valid rows with this column setup. Try a different value or date column.
              </div>
            ) : (
              <>
                <KpiCards kpis={kpis} metric={mapping.metric} hasCategory={!!mapping.category} />
                <Filters
                  filters={filters}
                  onChange={setFilters}
                  onReset={() => setFilters(emptyFilters)}
                  categories={allCategories}
                  hasDate={!!mapping.date}
                  dateBounds={dateBounds}
                  matched={filtered.length}
                  total={records.length}
                  active={hasActiveFilters(filters)}
                />
                <Charts
                  categories={categories}
                  pie={pie}
                  months={months}
                  selected={filters.categories}
                  metric={mapping.metric}
                  onToggleCategory={toggleCategory}
                />
                <DataTable
                  records={filtered}
                  headers={computed.headers}
                  columns={computed.columns}
                  fileName={computed.fileName}
                  outlierIds={outliers.outlierIds}
                />
              </>
            )}
          </>
        )}
      </div>

      <footer className="footer">
        <span>
          <b>Dataset Explorer</b> · Built by <b>Jahnvi Srivastava</b>
        </span>
        <span className="muted">
          Client-side CSV &amp; Excel parsing, formula engine &amp; statistical profiling
        </span>
      </footer>
    </main>
  );
}