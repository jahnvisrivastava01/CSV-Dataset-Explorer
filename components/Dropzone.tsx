"use client";

import { useRef, useState } from "react";

interface Props {
  onFile: (file: File) => void;
  loading: boolean;
}

export default function Dropzone({ onFile, loading }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  return (
    <section className="hero-shell">
      <div
        className={`dropzone-hero${over ? " active" : ""}`}
        role="button"
        tabIndex={0}
        onClick={() => input.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          const file = e.dataTransfer.files[0];
          if (file) onFile(file);
        }}
      >
        <div className="hero-badge">
          <span className="pulse-dot" />
          <span>100% Client-Side Engine · Zero Data Leaves Your Browser</span>
        </div>

        <h2 className="hero-title">
          {loading
            ? "Parsing and auditing your dataset…"
            : "Drop a CSV or Excel file here, or click to browse"}
        </h2>
        <p className="hero-sub">
          Instantly validate rows, switch Excel sheets, create formula columns, detect statistical outliers, and export clean spreadsheets.
        </p>

        <div className="actions" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="btn primary hero-cta" onClick={() => input.current?.click()}>
            Choose CSV or Excel File
          </button>
          <span className="file-hint">Supports .csv, .xlsx, .xls, .tsv, .txt</span>
        </div>

        <input
          ref={input}
          type="file"
          accept=".csv,.tsv,.txt,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFile(file);
            e.target.value = "";
          }}
        />
      </div>

      <div className="workflow-grid">
        <div className="workflow-card" style={{ animationDelay: "0.05s" }}>
          <div className="step-num">01</div>
          <h3>Auto Schema &amp; Audit</h3>
          <p>Detects numeric, date, and category columns automatically across CSVs and multi-sheet Excel workbooks.</p>
        </div>

        <div className="workflow-card" style={{ animationDelay: "0.15s" }}>
          <div className="step-num">02</div>
          <h3>Live Formula Columns</h3>
          <p>Compute taxes, margins, or row-level arithmetic across thousands of rows without manual Excel dragging.</p>
        </div>

        <div className="workflow-card" style={{ animationDelay: "0.25s" }}>
          <div className="step-num">03</div>
          <h3>Interactive Charts &amp; Export</h3>
          <p>Slice trends by date or category, isolate IQR outliers, and download cleaned CSV or JSON files.</p>
        </div>
      </div>
    </section>
  );
}