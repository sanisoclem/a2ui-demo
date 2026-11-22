import { createComponentImplementation } from "@a2ui/react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChartApi } from "../../../catalog/analytics.ts";
import { AXIS_TICK, CHART_HEIGHT, CHART_MARGIN, ChartFrame, ChartTooltip, seriesColor } from "../chart-frame.tsx";
import { formatCategory, formatNumber, labelOf, rowsOf, type Row } from "../format.ts";
import { categoryPicker } from "../selection.ts";

const BAR_ROW_HEIGHT = 30;

export const BarChartView = createComponentImplementation(BarChartApi, ({ props }) => {
  const rows = rowsOf(props.data);
  const format = props.format ?? "compact";
  const horizontal = props.orientation === "horizontal";
  const series = props.series.map((entry, index) => ({ field: entry.field, label: entry.label ?? labelOf(entry.field), color: seriesColor(index) }));
  const pick = categoryPicker(props.setSelection, props.action);
  const isDimmed = (row: Row) => Boolean(props.selection) && String(row[props.x]) !== props.selection;
  const categoryAxis = {
    dataKey: props.x,
    tickFormatter: (value: unknown) => formatCategory(value, "short"),
    tick: AXIS_TICK,
    tickLine: false,
    axisLine: { stroke: "var(--axis)" },
  };
  const valueAxis = {
    tickFormatter: (value: unknown) => formatNumber(value, format, "short"),
    tick: AXIS_TICK,
    tickLine: false,
    axisLine: false,
  };
  return (
    <ChartFrame
      title={props.title}
      rows={rows}
      columns={[{ field: props.x }, ...series.map((entry) => ({ field: entry.field, label: entry.label, format }))]}
      legend={series.map((entry) => ({ label: entry.label, color: entry.color, mark: "box" }))}
    >
      <ResponsiveContainer width="100%" height={horizontal ? Math.max(CHART_HEIGHT, rows.length * BAR_ROW_HEIGHT + 40) : CHART_HEIGHT}>
        <BarChart data={rows} layout={horizontal ? "vertical" : "horizontal"} margin={CHART_MARGIN} barGap={2} barCategoryGap="24%">
          <CartesianGrid horizontal={!horizontal} vertical={horizontal} stroke="var(--grid)" />
          {horizontal ? (
            <>
              <XAxis type="number" {...valueAxis} />
              <YAxis type="category" {...categoryAxis} width={categoryWidth(rows, props.x)} interval={0} />
            </>
          ) : (
            <>
              <XAxis {...categoryAxis} minTickGap={8} />
              <YAxis {...valueAxis} width={56} />
            </>
          )}
          <Tooltip content={<ChartTooltip format={format} />} cursor={{ fill: "var(--hover-wash)" }} />
          {series.map((entry, index) => (
            <Bar
              key={entry.field}
              dataKey={entry.field}
              name={entry.label}
              fill={entry.color}
              maxBarSize={24}
              stackId={props.stacked ? "stack" : undefined}
              stroke={props.stacked ? "var(--surface-1)" : undefined}
              strokeWidth={props.stacked ? 2 : 0}
              radius={barRadius(horizontal, !props.stacked || index === series.length - 1)}
              isAnimationActive={false}
              cursor={pick ? "pointer" : undefined}
              onClick={pick ? (bar) => pick((bar.payload as Row)[props.x]) : undefined}
            >
              {rows.map((row, rowIndex) => (
                <Cell key={rowIndex} fillOpacity={isDimmed(row) ? 0.35 : 1} />
              ))}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
});

function barRadius(horizontal: boolean, roundEnd: boolean): [number, number, number, number] {
  if (!roundEnd) return [0, 0, 0, 0];
  return horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0];
}

function categoryWidth(rows: Row[], field: string): number {
  const longest = Math.max(0, ...rows.map((row) => formatCategory(row[field], "short").length));
  return Math.min(180, Math.max(64, longest * 7 + 12));
}
