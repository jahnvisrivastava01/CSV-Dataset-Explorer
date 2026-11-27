"use client";

import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import type { MonthPoint, NamedValue } from "@/lib/analytics";
import { fmt, fmtCompact } from "@/lib/format";

const PALETTE = ["#2563eb", "#e11d48", "#0ea5e9", "#8b5cf6", "#f59e0b", "#10b981", "#64748b"];
const tick = { style: { fill: "var(--muted)", fontSize: 12 } };
const tooltipStyle = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  color: "var(--text)",
  fontSize: 13,
};

interface Props {
  categories: NamedValue[]; // sorted desc, from filtered data
  pie: NamedValue[];
  months: MonthPoint[];
  selected: string[];
  metric: string;
  onToggleCategory: (name: string) => void;
}

const short = (s: string) => (s.length > 18 ? s.slice(0, 17) + "…" : s);

export default function Charts({ categories, pie, months, selected, metric, onToggleCategory }: Props) {
  const top = categories.slice(0, 8);
  const dim = (name: string) => selected.length > 0 && !selected.includes(name);

  return (
    <div className="charts">
      {months.length > 0 && (
        <div className="card wide">
          <h2>{metric} over time</h2>
          <div className="chartbox">
            <ResponsiveContainer>
              <AreaChart data={months} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="fillArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tick={tick} axisLine={false} tickLine={false} />
                <YAxis tick={tick} axisLine={false} tickLine={false} tickFormatter={fmtCompact} width={48} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [fmt(v), metric]} />
                <Area type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} fill="url(#fillArea)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {top.length > 0 && categories.length > 1 && (
        <>
          <div className="card">
            <h2>Top categories (click to filter)</h2>
            <div className="chartbox">
              <ResponsiveContainer>
                <BarChart data={top} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" tick={tick} axisLine={false} tickLine={false} tickFormatter={fmtCompact} />
                  <YAxis type="category" dataKey="name" tick={tick} axisLine={false} tickLine={false} width={120} tickFormatter={short} />
                  <Tooltip cursor={{ fill: "var(--accent-soft)" }} contentStyle={tooltipStyle} formatter={(v: number) => [fmt(v), metric]} />
                  <Bar
                    dataKey="value"
                    radius={[0, 4, 4, 0]}
                    cursor="pointer"
                    onClick={(d: unknown) => onToggleCategory((d as NamedValue).name)}
                  >
                    {top.map((c) => (
                      <Cell key={c.name} fill="#2563eb" fillOpacity={dim(c.name) ? 0.3 : 1} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card">
            <h2>Share of total</h2>
            <div className="chartbox">
              <ResponsiveContainer>
                <PieChart>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number, n: string) => [fmt(v), n]} />
                  <Pie
                    data={pie}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="55%"
                    outerRadius="85%"
                    paddingAngle={2}
                    stroke="var(--card)"
                    cursor="pointer"
                    onClick={(d: unknown) => {
                      const name = (d as NamedValue).name;
                      if (name !== "Other") onToggleCategory(name);
                    }}
                  >
                    {pie.map((s, i) => (
                      <Cell key={s.name} fill={PALETTE[i % PALETTE.length]} fillOpacity={dim(s.name) ? 0.3 : 1} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="chips" aria-hidden>
              {pie.map((s, i) => (
                <span key={s.name} className="muted">
                  <span style={{ color: PALETTE[i % PALETTE.length] }}>●</span> {s.name}
                </span>
              ))}
            </div>
          </div>
        </>
      )}

      {months.length === 0 && categories.length <= 1 && (
        <div className="card wide empty-animated">
          <div className="empty-bars" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </div>
          <strong>No chart dimension selected yet</strong>
          <span>Pick a Date column or a Group by (category) column above to generate visual trends and breakdowns.</span>
        </div>
      )}
    </div>
  );
}
