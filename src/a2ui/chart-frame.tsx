import { useState, type ReactNode } from "react";
import type { NumberFormat } from "../../catalog/analytics.ts";
import { formatCategory, formatNumber, isNumericColumn, labelOf, type Row } from "./format.ts";

export const CHART_HEIGHT = 240;
export const CHART_MARGIN = { top: 8, right: 12, bottom: 0, left: 0 };
export const AXIS_TICK = { fill: "var(--text-muted)", fontSize: 12 };
export const ACTIVE_DOT = { r: 4, strokeWidth: 2, stroke: "var(--surface-1)" };

const YELLOW_SLOT = 3;

export function seriesColor(index: number): string {
  return `var(--series-${(index % 8) + 1})`;
}

export function seriesInk(index: number): string {
  return index % 8 === YELLOW_SLOT ? "#0b0b0b" : "#ffffff";
}

export type TableColumn = { field: string; label?: string; format?: NumberFormat };

export type LegendItem = { label: string; color: string; mark: "line" | "box" };

type ChartFrameProps = {
  title?: string;
  rows: Row[];
  columns: TableColumn[];
  legend?: LegendItem[];
  children: ReactNode;
};

export function ChartFrame({ title, rows, columns, legend = [], children }: ChartFrameProps) {
  const [showTable, setShowTable] = useState(false);
  return (
    <figure className="chart">
      <figcaption className="chart-head">
        <span className="chart-title">{title}</span>
        <button type="button" className="chart-toggle" aria-pressed={showTable} onClick={() => setShowTable(!showTable)}>
          {showTable ? "Chart" : "Table"}
        </button>
      </figcaption>
      {showTable ? (
        <TableView rows={rows} columns={columns} pageSize={8} />
      ) : (
        <>
          {legend.length > 1 && <Legend items={legend} />}
          {rows.length === 0 ? <p className="chart-empty">No rows to show.</p> : children}
        </>
      )}
    </figure>
  );
}

export function Legend({ items }: { items: LegendItem[] }) {
  return (
    <ul className="legend">
      {items.map((item) => (
        <li key={item.label}>
          <span className={`legend-key legend-key-${item.mark}`} style={{ background: item.color }} />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

type TooltipEntry = { dataKey?: unknown; name?: unknown; value?: unknown; color?: string };

type ChartTooltipProps = {
  active?: boolean;
  payload?: readonly TooltipEntry[];
  label?: unknown;
  format: NumberFormat;
};

export function ChartTooltip({ active, payload, label, format }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="tooltip">
      <div className="tooltip-label">{formatCategory(label)}</div>
      {payload.map((entry) => (
        <div className="tooltip-row" key={String(entry.dataKey)}>
          <span className="tooltip-key" style={{ background: entry.color }} />
          <strong>{formatNumber(entry.value, format)}</strong>
          <span>{String(entry.name ?? entry.dataKey)}</span>
        </div>
      ))}
    </div>
  );
}

type TableViewProps = { rows: Row[]; columns: TableColumn[]; pageSize: number };

export function TableView({ rows, columns, pageSize }: TableViewProps) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(page, pages - 1);
  const shown = rows.slice(current * pageSize, (current + 1) * pageSize);
  const numeric = new Set(columns.filter((column) => isNumericColumn(rows, column.field)).map((column) => column.field));
  return (
    <div className="table-view">
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.field} className={numeric.has(column.field) ? "numeric" : undefined}>
                  {column.label ?? labelOf(column.field)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((row, index) => (
              <tr key={index}>
                {columns.map((column) => (
                  <td key={column.field} className={numeric.has(column.field) ? "numeric" : undefined}>
                    {numeric.has(column.field) ? formatNumber(row[column.field], column.format ?? "number") : formatCategory(row[column.field])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="table-pages">
          <span>
            {current * pageSize + 1}–{current * pageSize + shown.length} of {rows.length}
          </span>
          <button type="button" disabled={current === 0} onClick={() => setPage(current - 1)} aria-label="Previous page">
            ‹
          </button>
          <button type="button" disabled={current === pages - 1} onClick={() => setPage(current + 1)} aria-label="Next page">
            ›
          </button>
        </div>
      )}
    </div>
  );
}
