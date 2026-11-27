"use client";

import { useMemo, useState } from "react";
import Papa from "papaparse";
import type { ColumnInfo, DataRecord } from "@/lib/types";
import { parseDate, parseNumber } from "@/lib/parse";

interface Props {
  records: DataRecord[];
  headers: string[];
  columns: ColumnInfo[];
  fileName: string;
  outlierIds: Set<number>;
}

const PAGE = 15;

export default function DataTable({ records, headers, columns, fileName, outlierIds }: Props) {
  const [sort, setSort] = useState<{ col: string; dir: 1 | -1 } | null>(null);
  const [page, setPage] = useState(0);

  const types = useMemo(
    () => new Map(columns.map((c) => [c.name, c.type])),
    [columns]
  );

  const sorted = useMemo(() => {
    if (!sort) return records;
    const type = types.get(sort.col);
    const key = (r: DataRecord): number | string => {
      const v = r.raw[sort.col] ?? "";
      if (type === "number") return parseNumber(v) ?? -Infinity;
      if (type === "date") return parseDate(v) ?? -Infinity;
      return v.toLowerCase();
    };
    return [...records].sort((a, b) => {
      const x = key(a);
      const y = key(b);
      return x < y ? -sort.dir : x > y ? sort.dir : 0;
    });
  }, [records, sort, types]);

  const pages = Math.max(1, Math.ceil(sorted.length / PAGE));
  const current = Math.min(page, pages - 1);
  const slice = sorted.slice(current * PAGE, current * PAGE + PAGE);

  function toggleSort(col: string) {
    setPage(0);
    setSort((s) =>
      s?.col === col ? (s.dir === 1 ? { col, dir: -1 } : null) : { col, dir: 1 }
    );
  }

  function downloadFile(content: string, mime: string, ext: string) {
    const stem = fileName.replace(/\.[^.]+$/, "") || "dataset";
    const url = URL.createObjectURL(new Blob([content], { type: mime }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${stem}-cleaned.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportCsv() {
    const csv = Papa.unparse(records.map((r) => r.raw), { columns: headers });
    downloadFile(csv, "text/csv;charset=utf-8;", "csv");
  }

  function exportJson() {
    const json = JSON.stringify(records.map((r) => r.raw), null, 2);
    downloadFile(json, "application/json", "json");
  }

  return (
    <div className="card">
      <div className="tablehead">
        <div>
          <h2>Rows ({records.length})</h2>
        </div>
        <div className="btns">
          <button className="btn" onClick={exportCsv} disabled={records.length === 0}>
            Export CSV
          </button>
          <button className="btn" onClick={exportJson} disabled={records.length === 0}>
            Export JSON
          </button>
        </div>
      </div>

      {records.length === 0 ? (
        <div className="empty">No rows match these filters.</div>
      ) : (
        <>
          <div className="tablewrap">
            <table>
              <thead>
                <tr>
                  {headers.map((h) => (
                    <th
                      key={h}
                      className={types.get(h) === "number" ? "num" : undefined}
                      aria-sort={sort?.col === h ? (sort.dir === 1 ? "ascending" : "descending") : undefined}
                      onClick={() => toggleSort(h)}
                    >
                      {h}
                      {sort?.col === h ? (sort.dir === 1 ? " ▲" : " ▼") : ""}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {slice.map((r) => {
                  const isOutlier = outlierIds.has(r.id);
                  return (
                    <tr key={r.id} className={isOutlier ? "outlier-row" : undefined}>
                      {headers.map((h, idx) => (
                        <td
                          key={h}
                          className={types.get(h) === "number" ? "num" : undefined}
                        >
                          {r.raw[h]}
                          {idx === 0 && isOutlier && (
                            <span className="badge warn-badge" title="Statistical IQR outlier">
                              Outlier
                            </span>
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="pager">
            <span className="muted">
              Page {current + 1} of {pages}
            </span>
            <div className="btns">
              <button className="btn" onClick={() => setPage(current - 1)} disabled={current === 0}>
                Previous
              </button>
              <button className="btn" onClick={() => setPage(current + 1)} disabled={current >= pages - 1}>
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
