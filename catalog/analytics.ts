import { z } from "zod";
import { ActionSchema, childList, DynamicNumberSchema, DynamicStringSchema, DynamicValueSchema } from "@a2ui/web_core/v1_0";

const NUMBER_FORMATS =["number", "integer", "compact", "currency", "percent"] as const;
export type NumberFormat = (typeof NUMBER_FORMATS)[number];

const numberFormat = (description: string) => z.enum(NUMBER_FORMATS).describe(description).optional();

const weight = z
  .number()
  .describe("Relative weight inside a Row or Column, like CSS flex-grow. Only set it on a direct child of a Row or Column.")
  .optional();

const title = DynamicStringSchema.describe("REF:#/$defs/DynamicString|Short chart title in sentence case.").optional();

const rows = DynamicValueSchema.describe(
  'REF:#/$defs/DynamicValue|The rows to draw. Bind to a dataset: {"@path": "/datasets/<name>"}.',
);

const field = (description: string) => z.string().describe(description);

const series = z
  .array(
    z
      .object({
        field: field("Column holding the values."),
        label: z.string().describe("Legend label. Defaults to the column name.").optional(),
      })
      .strict(),
  )
  .min(1)
  .max(6)
  .describe("One entry per plotted measure, at most 6. Fold the tail into 'Other' in SQL.");

const selection = DynamicStringSchema.describe(
  'REF:#/$defs/DynamicString|Two-way binding that receives the clicked category, e.g. {"@path": "/selection/category"}. Set it together with `action`.',
).optional();

const clickAction = ActionSchema.describe(
  "REF:#/$defs/Action|Dispatched after a click writes the category into `selection`. Bind the event context to the same path.",
).optional();

export const GridApi = {
  name: "Grid",
  schema: z
    .object({
      children: childList().describe("REF:#/$defs/ChildList|Components laid out left to right, wrapping into rows."),
      columns: z.number().int().min(1).max(4).describe("Columns on wide screens; collapses to one on phones. Default 2.").optional(),
      weight,
    })
    .strict(),
};

export const KpiCardApi = {
  name: "KpiCard",
  schema: z
    .object({
      label: DynamicStringSchema.describe("REF:#/$defs/DynamicString|Metric name in sentence case, no colon."),
      value: DynamicNumberSchema.describe(
        'REF:#/$defs/DynamicNumber|The metric. Bind to a single cell: {"@path": "/datasets/<name>/0/<column>"}.',
      ),
      format: numberFormat("How to display the value. Default compact."),
      delta: DynamicNumberSchema.describe(
        "REF:#/$defs/DynamicNumber|Change versus the comparison period as a fraction (0.12 means +12%).",
      ).optional(),
      deltaLabel: DynamicStringSchema.describe('REF:#/$defs/DynamicString|Names the comparison period, e.g. "vs Oct 2025".').optional(),
      upIsGood: z.boolean().describe("Whether an increase is good news. Default true; false for costs, returns, churn.").optional(),
      trend: DynamicValueSchema.describe("REF:#/$defs/DynamicValue|Optional rows for a sparkline, oldest first.").optional(),
      trendField: field("Column of `trend` to draw.").optional(),
      weight,
    })
    .strict(),
};

export const LineChartApi = {
  name: "LineChart",
  schema: z
    .object({
      title,
      data: rows,
      x: field("Column for the x axis: a date (YYYY-MM-DD), month (YYYY-MM) or other ordered value. Rows must be sorted by it."),
      series,
      variant: z.enum(["line", "area"]).describe("Area suits a single series or a stacked total. Default line.").optional(),
      stacked: z.boolean().describe("Stack the series (area variant only).").optional(),
      format: numberFormat("How to display y values. Default compact."),
      weight,
    })
    .strict(),
};

export const BarChartApi = {
  name: "BarChart",
  schema: z
    .object({
      title,
      data: rows,
      x: field("Category column. Sort rows in SQL (largest first unless the categories have a natural order)."),
      series,
      orientation: z
        .enum(["vertical", "horizontal"])
        .describe("Horizontal for long labels or more than 6 categories. Default vertical.")
        .optional(),
      stacked: z.boolean().describe("Stack the series into one bar per category.").optional(),
      format: numberFormat("How to display values. Default compact."),
      selection,
      action: clickAction,
      weight,
    })
    .strict(),
};

export const SegmentedBarApi = {
  name: "SegmentedBar",
  schema: z
    .object({
      title,
      data: rows,
      category: field("Column naming each part."),
      value: field("Column holding each part's amount."),
      format: numberFormat("How to display amounts. Default compact."),
      selection,
      action: clickAction,
      weight,
    })
    .strict(),
};

export const ScatterChartApi = {
  name: "ScatterChart",
  schema: z
    .object({
      title,
      data: rows,
      x: field("Numeric column for the x axis."),
      y: field("Numeric column for the y axis."),
      label: field("Column naming each point, shown on hover.").optional(),
      group: field("Column splitting points into at most 3 colored groups.").optional(),
      xFormat: numberFormat("How to display x values. Default compact."),
      yFormat: numberFormat("How to display y values. Default compact."),
      weight,
    })
    .strict(),
};

export const HeatmapApi = {
  name: "Heatmap",
  schema: z
    .object({
      title,
      data: rows,
      x: field("Column for the columns of the grid, e.g. hour."),
      y: field("Column for the rows of the grid, e.g. weekday."),
      value: field("Numeric column that sets each cell's shade."),
      xOrder: z.array(z.string()).describe("Column order. Default: order of first appearance.").optional(),
      yOrder: z.array(z.string()).describe("Row order. Default: order of first appearance.").optional(),
      format: numberFormat("How to display values. Default compact."),
      weight,
    })
    .strict(),
};

export const DataTableApi = {
  name: "DataTable",
  schema: z
    .object({
      title,
      data: rows,
      columns: z
        .array(
          z
            .object({
              field: field("Column name in the rows."),
              label: z.string().describe("Header. Defaults to the column name.").optional(),
              format: numberFormat("Number format for this column. Text columns need none."),
            })
            .strict(),
        )
        .describe("Columns to show, in order. Default: every column.")
        .optional(),
      pageSize: z.number().int().min(5).max(50).describe("Rows per page. Default 10.").optional(),
      weight,
    })
    .strict(),
};

export const ANALYTICS_APIS = [
  GridApi,
  KpiCardApi,
  LineChartApi,
  BarChartApi,
  SegmentedBarApi,
  ScatterChartApi,
  HeatmapApi,
  DataTableApi,
] as const;
