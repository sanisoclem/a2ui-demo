import { createComponentImplementation } from "@a2ui/react";
import type { CSSProperties } from "react";
import { HeatmapApi, type NumberFormat } from "../../../catalog/analytics.ts";
import { ChartFrame } from "../chart-frame.tsx";
import { formatCategory, formatNumber, rowsOf, toNumber, type Row } from "../format.ts";

const SHADES = 9;
const MAX_COLUMN_LABELS = 8;

export const Heatmap = createComponentImplementation(HeatmapApi, ({ props }) => {
  const rows = rowsOf(props.data);
  const format = props.format ?? "compact";
  const xs = props.xOrder ?? distinct(rows, props.x);
  const ys = props.yOrder ?? distinct(rows, props.y);
  const cells = new Map(rows.map((row) => [`${String(row[props.y])}|${String(row[props.x])}`, toNumber(row[props.value])]));
  const values = [...cells.values()].filter((value): value is number => value !== undefined);
  const low = Math.min(...values);
  const high = Math.max(...values);
  const shade = (value: number) => (high === low ? SHADES - 1 : Math.round(((value - low) / (high - low)) * (SHADES - 1)));
  return (
    <ChartFrame title={props.title} rows={rows} columns={[{ field: props.y }, { field: props.x }, { field: props.value, format }]}>
      <div className="heatmap-scroll">
        <div className="heatmap" style={{ "--heatmap-columns": xs.length } as CSSProperties}>
          <span />
          {xs.map((x, index) => (
            <span key={x} className="heatmap-x">
              {index % labelStep(xs.length) === 0 && formatCategory(x, "short")}
            </span>
          ))}
          {ys.map((y) => (
            <HeatmapRow key={y} y={y} xs={xs} cells={cells} shade={shade} format={format} />
          ))}
        </div>
      </div>
      <div className="heatmap-scale">
        <span>{formatNumber(low, format, "short")}</span>
        <span className="heatmap-ramp" />
        <span>{formatNumber(high, format, "short")}</span>
      </div>
    </ChartFrame>
  );
});

type HeatmapRowProps = {
  y: string;
  xs: string[];
  cells: Map<string, number | undefined>;
  shade: (value: number) => number;
  format: NumberFormat;
};

function HeatmapRow({ y, xs, cells, shade, format }: HeatmapRowProps) {
  return (
    <>
      <span className="heatmap-y">{formatCategory(y, "short")}</span>
      {xs.map((x) => {
        const value = cells.get(`${y}|${x}`);
        const label = `${formatCategory(y)}, ${formatCategory(x)}: ${formatNumber(value, format)}`;
        return (
          <span
            key={x}
            className="heatmap-cell"
            title={label}
            aria-label={label}
            style={{ background: value === undefined ? "transparent" : `var(--seq-${shade(value)})` }}
          />
        );
      })}
    </>
  );
}

function labelStep(columns: number): number {
  return columns > MAX_COLUMN_LABELS ? Math.ceil(columns / MAX_COLUMN_LABELS) : 1;
}

function distinct(rows: Row[], field: string): string[] {
  return [...new Set(rows.map((row) => String(row[field])))];
}
