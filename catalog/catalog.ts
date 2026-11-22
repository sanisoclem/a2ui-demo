import type { Catalog, ComponentApi, FunctionApi } from "@a2ui/web_core/catalog";

export const CATALOG_ID = "urn:a2ui-demo:catalog:analytics:v1";

const BASIC_COMPONENT_NAMES =["Text", "Row", "Column", "Card", "Tabs", "Divider", "Button", "ChoicePicker"];

const CATALOG_INSTRUCTIONS =`Analytics catalog: the basic layout and input components plus charts, KPI cards and tables for answering data questions.

## Binding data
- Charts and tables never carry literal numbers. Bind \`data\` to a dataset the agent queried: {"@path": "/datasets/<name>"}.
- A KpiCard binds \`value\` (and \`delta\`) to one cell: {"@path": "/datasets/<name>/0/<column>"}.
- \`/datasets\` belongs to the agent runtime. UI state such as filters and selections lives under \`/filters\` and \`/selection\`.

## Choosing the form
- One number: a KpiCard, never a one-bar chart. A few headline numbers: KpiCards in a Grid.
- Change over time: LineChart (variant "area" for a single series).
- Comparing categories: BarChart, sorted largest first; horizontal for long labels or more than 6 categories.
- One whole split into at most 6 parts: SegmentedBar. More parts, or comparing parts closely: a horizontal BarChart.
- Two categorical dimensions against one measure (weekday x hour, category x month): Heatmap.
- Relationship between two measures per item: ScatterChart (at most 3 groups).
- Detail rows or exact figures: DataTable.
- Two measures on different scales go in two charts. Never put two units on one chart.
- At most 6 series per chart; fold the tail into "Other" in SQL.

## Layout
- Root is a Column. Start with a Text title ("## ..."), then a short Text with the insight in 1-3 sentences, then the visuals.
- Put KpiCards in a Grid with \`columns\` 3 or 4, charts in a Grid with \`columns\` 2, tables full width.
- Use Card only to group a filter bar or a detail section; charts already draw their own card.

## Interaction
- Drill-down: give a BarChart or SegmentedBar both \`selection\` {"@path": "/selection/<dimension>"} and an \`action\` {"event": {"name": "drill_down", "context": {"dimension": "<dimension>", "value": {"@path": "/selection/<dimension>"}}}}.
- Filters: one Row above the charts with ChoicePickers (variant "mutuallyExclusive", displayStyle "chips") whose \`value\` binds to {"@path": "/filters/<name>"}, and a primary Button whose action is {"event": {"name": "apply_filters", "context": {"<name>": {"@path": "/filters/<name>"}}}}.`;

export function deriveAnalyticsCatalog<T extends ComponentApi, F extends FunctionApi>(
  basicCatalog: Catalog<T, F>,
  analyticsComponents: readonly T[],
): Catalog<T, F> {
  return basicCatalog.derive({
    catalogId: CATALOG_ID,
    components: [...BASIC_COMPONENT_NAMES, ...analyticsComponents],
    instructions: CATALOG_INSTRUCTIONS,
  });
}
