import { createComponentImplementation } from "@a2ui/react";
import { SegmentedBarApi } from "../../../catalog/analytics.ts";
import { ChartFrame, seriesColor, seriesInk } from "../chart-frame.tsx";
import { formatCategory, formatNumber, rowsOf, toNumber } from "../format.ts";
import { categoryPicker } from "../selection.ts";

const MAX_PARTS = 6;
const LABEL_MIN_SHARE = 0.09;

export const SegmentedBar = createComponentImplementation(SegmentedBarApi, ({ props }) => {
  const rows = rowsOf(props.data);
  const format = props.format ?? "compact";
  const parts = rows.slice(0, MAX_PARTS).map((row, index) => ({
    name: formatCategory(row[props.category]),
    key: String(row[props.category]),
    amount: Math.max(0, toNumber(row[props.value]) ?? 0),
    color: seriesColor(index),
    ink: seriesInk(index),
  }));
  const total = parts.reduce((sum, part) => sum + part.amount, 0);
  const pick = categoryPicker(props.setSelection, props.action);
  const share = (amount: number) => (total > 0 ? amount / total : 0);
  return (
    <ChartFrame title={props.title} rows={rows} columns={[{ field: props.category }, { field: props.value, format }]}>
      <div className="segmented">
        <div className="segmented-bar" role="list">
          {parts
            .filter((part) => part.amount > 0)
            .map((part) => (
              <button
                key={part.key}
                type="button"
                role="listitem"
                className="segment"
                disabled={!pick}
                aria-label={`${part.name}: ${formatNumber(part.amount, format)}, ${formatNumber(share(part.amount), "percent")}`}
                data-dimmed={Boolean(props.selection) && props.selection !== part.key}
                style={{ flexGrow: part.amount, background: part.color, color: part.ink }}
                onClick={() => pick?.(part.key)}
              >
                {share(part.amount) >= LABEL_MIN_SHARE && formatNumber(share(part.amount), "percent", "short")}
              </button>
            ))}
        </div>
        <ul className="segmented-legend">
          {parts.map((part) => (
            <li key={part.key}>
              <span className="legend-key legend-key-box" style={{ background: part.color }} />
              <span className="segmented-name">{part.name}</span>
              <span className="segmented-amount">{formatNumber(part.amount, format, "short")}</span>
            </li>
          ))}
        </ul>
      </div>
    </ChartFrame>
  );
});
