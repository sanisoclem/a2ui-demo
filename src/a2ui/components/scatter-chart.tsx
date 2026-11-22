import { createComponentImplementation } from "@a2ui/react";
import { CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from "recharts";
import { ScatterChartApi, type NumberFormat } from "../../../catalog/analytics.ts";
import { AXIS_TICK, CHART_HEIGHT, CHART_MARGIN, ChartFrame, seriesColor } from "../chart-frame.tsx";
import { formatNumber, labelOf, rowsOf, type Row } from "../format.ts";

const MAX_GROUPS = 3;

export const ScatterChartView = createComponentImplementation(ScatterChartApi, ({ props }) => {
  const rows = rowsOf(props.data);
  const xFormat = props.xFormat ?? "compact";
  const yFormat = props.yFormat ?? "compact";
  const groups = groupRows(rows, props.group);
  const axis = { tick: AXIS_TICK, tickLine: false, axisLine: { stroke: "var(--axis)" } };
  return (
    <ChartFrame
      title={props.title}
      rows={rows}
      columns={[
        ...(props.label ? [{ field: props.label }] : []),
        { field: props.x, format: xFormat },
        { field: props.y, format: yFormat },
        ...(props.group ? [{ field: props.group }] : []),
      ]}
      legend={groups.map((group, index) => ({ label: group.name, color: seriesColor(index), mark: "box" }))}
    >
      <ResponsiveContainer width="100%" height={CHART_HEIGHT + 20}>
        <ScatterChart margin={CHART_MARGIN}>
          <CartesianGrid stroke="var(--grid)" />
          <XAxis type="number" dataKey={props.x} name={labelOf(props.x)} tickFormatter={(value) => formatNumber(value, xFormat, "short")} {...axis} />
          <YAxis type="number" dataKey={props.y} name={labelOf(props.y)} tickFormatter={(value) => formatNumber(value, yFormat, "short")} {...axis} width={56} />
          <Tooltip
            cursor={{ stroke: "var(--axis)", strokeWidth: 1 }}
            content={({ active, payload }) => (
              <PointTooltip active={active} row={payload?.[0]?.payload as Row | undefined} props={props} xFormat={xFormat} yFormat={yFormat} />
            )}
          />
          {groups.map((group, index) => (
            <Scatter key={group.name} name={group.name} data={group.rows} fill={seriesColor(index)} stroke="var(--surface-1)" strokeWidth={2} isAnimationActive={false} />
          ))}
        </ScatterChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
});

function groupRows(rows: Row[], field: string | undefined): { name: string; rows: Row[] }[] {
  if (!field) return [{ name: "All", rows }];
  const groups = new Map<string, Row[]>();
  for (const row of rows) {
    const name = String(row[field] ?? "Other");
    groups.set(name, [...(groups.get(name) ?? []), row]);
  }
  const ordered = [...groups.entries()].map(([name, members]) => ({ name, rows: members }));
  if (ordered.length <= MAX_GROUPS) return ordered;
  const kept = ordered.slice(0, MAX_GROUPS - 1);
  return [...kept, { name: "Other", rows: ordered.slice(MAX_GROUPS - 1).flatMap((group) => group.rows) }];
}

type PointTooltipProps = {
  active?: boolean;
  row?: Row;
  props: { x: string; y: string; label?: string; group?: string };
  xFormat: NumberFormat;
  yFormat: NumberFormat;
};

function PointTooltip({ active, row, props, xFormat, yFormat }: PointTooltipProps) {
  if (!active || !row) return null;
  return (
    <div className="tooltip">
      {props.label && <div className="tooltip-label">{String(row[props.label])}</div>}
      <div className="tooltip-row">
        <strong>{formatNumber(row[props.x], xFormat)}</strong>
        <span>{labelOf(props.x)}</span>
      </div>
      <div className="tooltip-row">
        <strong>{formatNumber(row[props.y], yFormat)}</strong>
        <span>{labelOf(props.y)}</span>
      </div>
      {props.group && <div className="tooltip-note">{String(row[props.group])}</div>}
    </div>
  );
}
