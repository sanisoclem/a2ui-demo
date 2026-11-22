import { createComponentImplementation } from "@a2ui/react";
import { Line, LineChart, ResponsiveContainer } from "recharts";
import { KpiCardApi } from "../../../catalog/analytics.ts";
import { formatChange, formatNumber, rowsOf, toNumber, type Row } from "../format.ts";

export const KpiCard = createComponentImplementation(KpiCardApi, ({ props }) => {
  const delta = toNumber(props.delta);
  const trend = rowsOf(props.trend);
  return (
    <div className="kpi">
      <div className="kpi-label">{props.label}</div>
      <div className="kpi-value">{formatNumber(props.value, props.format ?? "compact", "short")}</div>
      {delta !== undefined && <Change delta={delta} upIsGood={props.upIsGood ?? true} label={props.deltaLabel} />}
      {trend.length > 1 && props.trendField && <Sparkline rows={trend} field={props.trendField} />}
    </div>
  );
});

function Change({ delta, upIsGood, label }: { delta: number; upIsGood: boolean; label?: string }) {
  const tone = delta === 0 ? "flat" : delta > 0 === upIsGood ? "good" : "bad";
  return (
    <div className={`kpi-change kpi-change-${tone}`}>
      <span aria-hidden="true">{delta > 0 ? "▲" : delta < 0 ? "▼" : "■"}</span>
      <strong>{formatChange(delta)}</strong>
      {label && <span className="kpi-change-label">{label}</span>}
    </div>
  );
}

function Sparkline({ rows, field }: { rows: Row[]; field: string }) {
  return (
    <div className="kpi-trend" aria-hidden="true">
      <ResponsiveContainer width="100%" height={32}>
        <LineChart data={rows} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
          <Line
            dataKey={field}
            stroke="var(--text-muted)"
            strokeWidth={1.5}
            isAnimationActive={false}
            dot={(dot: { index?: number; cx?: number; cy?: number }) =>
              dot.index === rows.length - 1 ? (
                <circle key="last" cx={dot.cx} cy={dot.cy} r={3} fill="var(--series-1)" stroke="var(--surface-1)" strokeWidth={2} />
              ) : (
                <g key={dot.index} />
              )
            }
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
