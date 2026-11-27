"use client";

import type { ColumnInfo, Mapping } from "@/lib/types";

interface Props {
  columns: ColumnInfo[];
  mapping: Mapping;
  onChange: (m: Mapping) => void;
}

export default function ColumnMapper({ columns, mapping, onChange }: Props) {
  const numbers = columns.filter((c) => c.type === "number");
  const dates = columns.filter((c) => c.type === "date");
  const cats = columns.filter((c) => c.type !== "number" && c.type !== "date");

  return (
    <div className="mapper">
      <label className="field">
        Value column (numbers)
        <select
          value={mapping.metric}
          onChange={(e) => onChange({ ...mapping, metric: e.target.value })}
        >
          {numbers.map((c) => (
            <option key={c.name}>{c.name}</option>
          ))}
        </select>
      </label>
      <label className="field">
        Date column
        <select
          value={mapping.date ?? ""}
          onChange={(e) => onChange({ ...mapping, date: e.target.value || null })}
        >
          <option value="">None</option>
          {dates.map((c) => (
            <option key={c.name}>{c.name}</option>
          ))}
        </select>
      </label>
      <label className="field">
        Group by (category)
        <select
          value={mapping.category ?? ""}
          onChange={(e) => onChange({ ...mapping, category: e.target.value || null })}
        >
          <option value="">None</option>
          {cats.map((c) => (
            <option key={c.name}>{c.name}</option>
          ))}
        </select>
      </label>
    </div>
  );
}
