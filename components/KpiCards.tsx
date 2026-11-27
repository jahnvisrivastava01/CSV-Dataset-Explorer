import type { Kpis } from "@/lib/analytics";
import { fmt, fmtCompact } from "@/lib/format";

interface Props {
  kpis: Kpis;
  metric: string;
  hasCategory: boolean;
}

export default function KpiCards({ kpis, metric, hasCategory }: Props) {
  return (
    <div className="kpis">
      <div className="card kpi accent">
        <div className="label">Total {metric}</div>
        <div className="value" title={fmt(kpis.total)}>{fmtCompact(kpis.total)}</div>
        <div className="sub">{fmt(kpis.total)}</div>
      </div>
      <div className="card kpi">
        <div className="label">Records</div>
        <div className="value">{fmt(kpis.count)}</div>
        <div className="sub">after filters</div>
      </div>
      <div className="card kpi">
        <div className="label">Average</div>
        <div className="value">{fmt(kpis.average)}</div>
        <div className="sub">Median: {fmt(kpis.median)}</div>
      </div>
      <div className="card kpi">
        <div className="label">Range (Min – Max)</div>
        <div className="value">{fmtCompact(kpis.largest)}</div>
        <div className="sub">{fmt(kpis.smallest)} to {fmt(kpis.largest)}</div>
      </div>
      {hasCategory && (
        <div className="card kpi rose">
          <div className="label">Top category</div>
          <div className="value">{kpis.topCategory?.name ?? "–"}</div>
          <div className="sub">{kpis.topCategory ? fmt(kpis.topCategory.total) : ""}</div>
        </div>
      )}
    </div>
  );
}
