"use client";

import { useState } from "react";
import type { DataHealthReport, OutlierBounds } from "@/lib/analytics";
import { fmt } from "@/lib/format";

interface Props {
  health: DataHealthReport;
  outliers: OutlierBounds;
  metric: string;
  outliersOnly: boolean;
  onToggleOutliers: () => void;
}

export default function DataHealthPanel({
  health,
  outliers,
  metric,
  outliersOnly,
  onToggleOutliers,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card">
      <div className="sectionhead">
        <div>
          <h2>Data Health & Statistical Profile</h2>
          <p className="muted">
            Completeness: <b>{health.completenessPct}%</b> · Duplicate rows:{" "}
            <b>{health.duplicateRows}</b> · IQR outliers in {metric}:{" "}
            <b>{outliers.outlierIds.size}</b>
          </p>
        </div>

        <div className="btns">
          {outliers.outlierIds.size > 0 && (
            <button
              type="button"
              className={`btn${outliersOnly ? " primary" : ""}`}
              onClick={onToggleOutliers}
            >
              {outliersOnly
                ? `Showing ${outliers.outlierIds.size} outliers (Show all)`
                : `Inspect ${outliers.outlierIds.size} outliers`}
            </button>
          )}
          <button type="button" className="btn" onClick={() => setExpanded((v) => !v)}>
            {expanded ? "Hide column audit" : "Column audit"}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="health-grid">
          <div className="health-stats">
            <div>
              <span className="muted">Q1 (25th)</span>
              <div>
                <b>{fmt(outliers.q1)}</b>
              </div>
            </div>
            <div>
              <span className="muted">Median (50th)</span>
              <div>
                <b>{fmt(outliers.median)}</b>
              </div>
            </div>
            <div>
              <span className="muted">Q3 (75th)</span>
              <div>
                <b>{fmt(outliers.q3)}</b>
              </div>
            </div>
            <div>
              <span className="muted">IQR Spread</span>
              <div>
                <b>{fmt(outliers.iqr)}</b>
              </div>
            </div>
          </div>

          <div className="tablewrap">
            <table>
              <thead>
                <tr>
                  <th>Column</th>
                  <th>Detected Type</th>
                  <th className="num">Unique Values</th>
                  <th className="num">Missing Cells</th>
                  <th className="num">Missing %</th>
                </tr>
              </thead>
              <tbody>
                {health.columnStats.map((c) => (
                  <tr key={c.name}>
                    <td>
                      <b>{c.name}</b>
                    </td>
                    <td>
                      <span className="badge">{c.type}</span>
                    </td>
                    <td className="num">{fmt(c.uniqueCount)}</td>
                    <td className="num">{fmt(c.missingCount)}</td>
                    <td className="num">{c.missingPct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
