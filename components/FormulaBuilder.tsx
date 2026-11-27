"use client";

import { useState } from "react";
import type { ColumnInfo, FormulaColumn, FormulaOp } from "@/lib/types";

interface Props {
  columns: ColumnInfo[];
  formulas: FormulaColumn[];
  onAdd: (f: FormulaColumn) => void;
  onRemove: (id: string) => void;
}

export default function FormulaBuilder({ columns, formulas, onAdd, onRemove }: Props) {
  const numericCols = columns.filter((c) => c.type === "number");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [leftCol, setLeftCol] = useState(numericCols[0]?.name ?? "");
  const [op, setOp] = useState<FormulaOp>("*");
  const [rightMode, setRightMode] = useState<"column" | "constant">("constant");
  const [rightCol, setRightCol] = useState(numericCols[1]?.name ?? numericCols[0]?.name ?? "");
  const [rightConstant, setRightConstant] = useState("1.18");
  const [decimals, setDecimals] = useState(2);

  if (numericCols.length === 0) return null;

  const activeLeft = numericCols.some((c) => c.name === leftCol) ? leftCol : numericCols[0]!.name;
  const activeRightCol = numericCols.some((c) => c.name === rightCol)
    ? rightCol
    : numericCols[0]!.name;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) return;

    const numConst = Number(rightConstant);
    if (rightMode === "constant" && Number.isNaN(numConst)) return;

    onAdd({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: cleanName,
      leftCol: activeLeft,
      op,
      rightMode,
      rightCol: rightMode === "column" ? activeRightCol : undefined,
      rightConstant: rightMode === "constant" ? numConst : undefined,
      decimals,
    });
    setName("");
  }

  return (
    <div className="card">
      <div className="sectionhead">
        <div>
          <h2>Formula Columns</h2>
          <p className="muted">
            Create calculated spreadsheet columns (e.g., GST tax, net profit, margins) that automatically chart and export.
          </p>
        </div>
        <button type="button" className="btn" onClick={() => setOpen((v) => !v)}>
          {open ? "Hide builder" : "+ Add formula column"}
        </button>
      </div>

      {formulas.length > 0 && (
        <div className="chips" style={{ marginBottom: open ? 14 : 0 }}>
          {formulas.map((f) => (
            <span key={f.id} className="formula-tag">
              <b>{f.name}</b> = {f.leftCol} {f.op}{" "}
              {f.rightMode === "column" ? f.rightCol : f.rightConstant}
              <button
                type="button"
                className="tag-remove"
                aria-label={`Remove ${f.name}`}
                onClick={() => onRemove(f.id)}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {open && (
        <form className="formula-form" onSubmit={handleSubmit}>
          <label className="field">
            New column name
            <input
              type="text"
              placeholder="e.g. Amount with GST"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>

          <label className="field">
            Column A
            <select value={activeLeft} onChange={(e) => setLeftCol(e.target.value)}>
              {numericCols.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            Operator
            <select value={op} onChange={(e) => setOp(e.target.value as FormulaOp)}>
              <option value="*">× (Multiply)</option>
              <option value="+">+ (Add)</option>
              <option value="-">− (Subtract)</option>
              <option value="/">÷ (Divide)</option>
            </select>
          </label>

          <label className="field">
            Right operand type
            <select
              value={rightMode}
              onChange={(e) => setRightMode(e.target.value as "column" | "constant")}
            >
              <option value="constant">Fixed number</option>
              <option value="column">Another column</option>
            </select>
          </label>

          {rightMode === "constant" ? (
            <label className="field">
              Number value
              <input
                type="number"
                step="any"
                value={rightConstant}
                onChange={(e) => setRightConstant(e.target.value)}
                required
              />
            </label>
          ) : (
            <label className="field">
              Column B
              <select value={activeRightCol} onChange={(e) => setRightCol(e.target.value)}>
                {numericCols.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="field">
            Decimals
            <select value={decimals} onChange={(e) => setDecimals(Number(e.target.value))}>
              <option value={0}>0</option>
              <option value={2}>2</option>
              <option value={4}>4</option>
            </select>
          </label>

          <button type="submit" className="btn primary">
            Apply formula
          </button>
        </form>
      )}
    </div>
  );
}
