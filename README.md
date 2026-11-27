# 📊 Dataset Explorer

A client-side interactive data analysis, formula transformation, and visualization web application built with **Next.js (App Router)** and **TypeScript**. Designed to eliminate repetitive manual spreadsheet workflows, the application parses raw `.csv` files directly in the browser, validates row integrity, applies custom calculated formula columns, audits statistical data health, and exports cleaned datasets with zero backend latency.

---

## ✨ Key Features

- **Instant Drag-and-Drop Ingestion:** Supports `.csv`, `.tsv`, and `.txt` files alongside built-in sample datasets (`sample-expenses.csv` and `sample-with-errors.csv`).
- **Custom Formula Column Builder:** Create calculated columns (`+`, `−`, `×`, `÷`) using existing numeric columns or fixed constants (e.g., GST tax multipliers, profit margins, unit totals) that dynamically feed into KPIs, charts, and exports.
- **Data Health & IQR Outlier Detection:** Audits dataset completeness, duplicate rows, per-column missing percentages, quartiles (`Q1`, `Median`, `Q3`, `IQR`), and flags statistical outliers in the data grid.
- **Automatic Schema Inference & Column Mapping:** Detects numeric, date, and categorical fields automatically while allowing dynamic remapping across any dataset structure.
- **Row-Level Data Validation:** Identifies malformed dates, missing entries, and non-numeric values in metric columns, surfacing detailed row-by-row diagnostic warnings.
- **Dynamic KPI Aggregations & Interactive Charts:** Real-time totals, averages, medians, min/max bounds, category bar charts, share-of-total breakdowns, and monthly time-series trends.
- **Cleaned Data Export (`CSV` & `JSON`):** Export filtered and formula-enriched records directly back to `.csv` or `.json`.

---

## 🛠️ Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript (Strict Mode)
- **Parsing & Charts:** PapaParse, Recharts
- **State & Performance:** React Hooks (`useState`, `useMemo`, `useCallback`)
- **Styling:** Custom CSS Variables, CSS Grid & Flexbox (Full-width left-aligned layout)
- **Typography:** Plus Jakarta Sans (`next/font/google`)

---

## 🏗️ Project Structure

```text
csv-explorer/
├── app/
│   ├── globals.css            # Theme tokens, full-width left-aligned layout & animations
│   ├── layout.tsx             # Root layout, metadata & typography
│   └── page.tsx               # State orchestrator & memoized analytics pipeline
├── components/
│   ├── Charts.tsx             # Time-series, category bar & share visualizations
│   ├── ColumnMapper.tsx       # Interactive schema mapping controls
│   ├── DataHealthPanel.tsx    # Completeness audit, quartiles & IQR outlier filter
│   ├── DataTable.tsx          # Sortable, paginated table with CSV/JSON export
│   ├── Dropzone.tsx           # Drag-and-drop file uploader & sample loaders
│   ├── Filters.tsx            # Date bounds, search & category chip filters
│   ├── FormulaBuilder.tsx     # Custom calculated spreadsheet column builder
│   ├── KpiCards.tsx           # Summary metric cards (Total, Mean, Median, Range)
│   ├── ThemeToggle.tsx        # Light/dark mode switcher
│   └── ValidationPanel.tsx    # Row-level data quality & parsing error inspector
├── lib/
│   ├── analytics.ts           # Filtering, KPI math, IQR outliers & data health audit
│   ├── format.ts              # Numeric & date formatting utilities
│   ├── parse.ts               # CSV parser, formula evaluator & schema inference
│   └── types.ts               # Strict TypeScript interfaces
└── public/
    ├── sample-expenses.csv
    └── sample-with-errors.csv
```

---

## 🚀 Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

3. **Open in browser:**
   Navigate to `http://localhost:3000` and upload a CSV file or select one of the built-in sample datasets.

---

## 👩‍💻 Author

**Jahnvi Srivastava**
