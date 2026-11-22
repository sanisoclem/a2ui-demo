import { createComponentImplementation } from "@a2ui/react";
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { LineChartApi } from "../../../catalog/analytics.ts";
import { ACTIVE_DOT, AXIS_TICK, CHART_HEIGHT, CHART_MARGIN, ChartFrame, ChartTooltip, seriesColor } from "../chart-frame.tsx";
import { formatCategory, formatNumber, labelOf, rowsOf } from "../format.ts";

export const LineChartView = createComponentImplementation(LineChartApi, ({ props }) => {
  const rows = rowsOf(props.data);
  const format = props.format ?? "compact";
  const series = props.series.map((entry, index) => ({ field: entry.field, label: entry.label ?? labelOf(entry.field), color: seriesColor(index) }));
  const isArea = props.variant === "area";
  return (
    <ChartFrame
      title={props.title}
      rows={rows}
      columns={[{ field: props.x }, ...series.map((entry) => ({ field: entry.field, label: entry.label, format }))]}
      legend={series.map((entry) => ({ label: entry.label, color: entry.color, mark: isArea ? "box" : "line" }))}
    >
      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
        <ComposedChart data={rows} margin={CHART_MARGIN}>
          <CartesianGrid vertical={false} stroke="var(--grid)" />
          <XAxis
            dataKey={props.x}
            tickFormatter={(value) => formatCategory(value, "short")}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={{ stroke: "var(--axis)" }}
            minTickGap={24}
          />
          <YAxis tickFormatter={(value) => formatNumber(value, format, "short")} tick={AXIS_TICK} tickLine={false} axisLine={false} width={56} />
          <Tooltip content={<ChartTooltip format={format} />} cursor={{ stroke: "var(--axis)", strokeWidth: 1 }} />
          {series.map((entry) =>
            isArea ? (
              <Area
                key={entry.field}
                type="monotone"
                dataKey={entry.field}
                name={entry.label}
                stroke={entry.color}
                strokeWidth={2}
                fill={entry.color}
                fillOpacity={0.1}
                stackId={props.stacked ? "stack" : undefined}
                activeDot={ACTIVE_DOT}
                isAnimationActive={false}
              />
            ) : (
              <Line
                key={entry.field}
                type="monotone"
                dataKey={entry.field}
                name={entry.label}
                stroke={entry.color}
                strokeWidth={2}
                dot={false}
                activeDot={ACTIVE_DOT}
                isAnimationActive={false}
              />
            ),
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
});
