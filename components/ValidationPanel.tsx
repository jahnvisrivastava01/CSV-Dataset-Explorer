import type { RowError } from "@/lib/types";

interface Props {
  errors: RowError[];
  total: number;
}

const SHOW = 100;

export default function ValidationPanel({ errors, total }: Props) {
  if (errors.length === 0) return null;
  return (
    <div className="alert warn" role="status">
      <details>
        <summary>
          {errors.length} of {total} rows skipped because of invalid values
        </summary>
        <ul>
          {errors.slice(0, SHOW).map((e, i) => (
            <li key={i}>
              Row {e.row}
              {e.column ? ` · ${e.column}` : ""}: {e.message}
            </li>
          ))}
          {errors.length > SHOW && <li>…and {errors.length - SHOW} more</li>}
        </ul>
      </details>
    </div>
  );
}
