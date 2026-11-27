"use client";

import type { Filters as FilterState } from "@/lib/types";
import type { NamedValue } from "@/lib/analytics";

interface Props {
  filters: FilterState;
  onChange: (f: FilterState) => void;
  onReset: () => void;
  categories: NamedValue[];
  hasDate: boolean;
  dateBounds: { min: string; max: string } | null;
  matched: number;
  total: number;
  active: boolean;
}

const MAX_CHIPS = 24;

export default function Filters({
  filters, onChange, onReset, categories, hasDate, dateBounds, matched, total, active,
}: Props) {
  const set = (patch: Partial<FilterState>) => onChange({ ...filters, ...patch });

  function toggle(name: string) {
    const has = filters.categories.includes(name);
    set({
      categories: has
        ? filters.categories.filter((c) => c !== name)
        : [...filters.categories, name],
    });
  }

  const shown = categories.slice(0, MAX_CHIPS);

  return (
    <div className="card">
      <div className="filterhead">
        <h2>Filters</h2>
        <div className="muted">
          {matched} of {total} rows{" "}
          {active && (
            <button className="btn link" onClick={onReset}>
              Reset
            </button>
          )}
        </div>
      </div>

      <div className="filters">
        <label className="field">
          Search
          <input
            type="search"
            placeholder="Any column…"
            value={filters.search}
            onChange={(e) => set({ search: e.target.value })}
          />
        </label>
        {hasDate && (
          <>
            <label className="field">
              From
              <input
                type="date"
                value={filters.from}
                min={dateBounds?.min}
                max={dateBounds?.max}
                onChange={(e) => set({ from: e.target.value })}
              />
            </label>
            <label className="field">
              To
              <input
                type="date"
                value={filters.to}
                min={dateBounds?.min}
                max={dateBounds?.max}
                onChange={(e) => set({ to: e.target.value })}
              />
            </label>
          </>
        )}
        <label className="field">
          Min value
          <input
            type="number"
            inputMode="decimal"
            value={filters.min}
            onChange={(e) => set({ min: e.target.value })}
          />
        </label>
        <label className="field">
          Max value
          <input
            type="number"
            inputMode="decimal"
            value={filters.max}
            onChange={(e) => set({ max: e.target.value })}
          />
        </label>
      </div>

      {shown.length > 1 && (
        <div className="chips" role="group" aria-label="Categories">
          {shown.map((c) => (
            <button
              key={c.name}
              className="chip"
              aria-pressed={filters.categories.includes(c.name)}
              onClick={() => toggle(c.name)}
            >
              {c.name}
            </button>
          ))}
          {categories.length > MAX_CHIPS && (
            <span className="muted">+{categories.length - MAX_CHIPS} more (use search)</span>
          )}
        </div>
      )}
    </div>
  );
}
