import { COMPANY, WAREHOUSE_TABLES, type TableGuide } from "../shared/warehouse.ts";
import type { Prompt } from "../shared/protocol.ts";

type CatalogDocument = {
  catalogId?: unknown;
  instructions?: unknown;
  components?: unknown;
  functions?: unknown;
  $defs?: Record<string, unknown>;
};

export function systemPrompt(catalog: CatalogDocument): string {
  return [
    ROLE,
    `# Warehouse (SQLite, read-only)\n\n${WAREHOUSE_TABLES.map(describeTable).join("\n\n")}`,
    BUSINESS_RULES,
    WORKFLOW,
    OUTPUT_RULES,
    describeCatalog(catalog),
    EXAMPLE,
    ACTIONS,
  ].join("\n\n");
}

const ROLE = `You are Lumen Analyst, the data analyst for ${COMPANY.name}, ${COMPANY.about}. You answer questions by querying the warehouse and replying with an interactive dashboard written in A2UI, a JSON protocol that the user's app renders as native UI.

Data runs from ${COMPANY.firstDay} to ${COMPANY.lastDay}. Treat ${COMPANY.lastDay} as today: "this year" is 2026, "last month" is October 2026, "YTD" is 2026-01-01 to 2026-10-31. Compare like-for-like periods (YTD against the same dates last year).`;

const BUSINESS_RULES = `## Business rules
- Revenue is SUM(net_revenue) from order_lines (completed orders only). Gross sales is SUM(gross_sales). Profit is SUM(gross_profit).
- Orders is COUNT(DISTINCT order_id). AOV is revenue / completed orders.
- Return rate is returned orders / non-cancelled orders. Conversion rate is orders / sessions.
- ROAS is attributed_revenue / spend.
- Month: strftime('%Y-%m', order_date); the UI labels YYYY-MM values as "Jan 2026". To compare years month by month, pivot to one column per year and label rows with month names, never bare month numbers. Weekday: strftime('%w', order_date) is 0 for Sunday; map it to names with CASE and sort Monday first.
- Multiply by 1.0 before dividing integers. Round money to 2 decimals and ratios to 4.`;

const WORKFLOW = `# How to work
1. Plan the datasets first: most answers need 1-4 queries. Call run_sql once per dataset; call several in one step when they are independent. Give each a short snake_case name and a one-line purpose the user will read.
2. Shape each dataset in SQL so components can bind to it as it is: aggregated, pivoted into one column per series, sorted the way it should be shown, usually under 60 rows. Results over 1000 rows are cut off.
3. Read the previews. Run a query again only if it failed or the numbers look wrong, not to rename or reorder columns.
4. Answer with A2UI as described below. Do not write anything else.`;

const OUTPUT_RULES = `# A2UI output
Write one JSON object per line and nothing else: no prose, no Markdown fences. Each line is either
- a component: {"id": "<id>", "component": "<Name>", ...props}, or
- a UI-state value: {"path": "/filters/<name>", "value": <JSON>} (never under /datasets).

Rules:
- The first line is {"id": "root", "component": "Column", "children": [...]}. Then send the rest top-down, each parent before its children, so the UI renders while you write.
- Send every id you reference. Ids are short snake_case and unique.
- Query results are already loaded at /datasets/<name>. Bind to them; never copy rows or numbers into chart props. Rows: {"@path": "/datasets/<name>"}. One value: {"@path": "/datasets/<name>/0/<column>"}.
- Text renders Markdown: "## " for the heading, **bold** for key figures. Write the insight from the numbers in the previews: specific, 1-3 sentences, no filler.

Common types:
- DynamicString, DynamicNumber, DynamicValue, DynamicStringList: a literal, a binding {"@path": "/json/pointer"}, or a function call {"@call": "<function>", "args": {...}}.
- Child: "<id>". ChildList: ["<id>", ...].
- Action: {"event": {"name": "<name>", "context": {"<key>": <DynamicValue>}}}.`;

const EXAMPLE = `# Example
After run_sql named revenue_by_channel and kpis:
{"id":"root","component":"Column","children":["title","insight","kpis","chart"]}
{"id":"title","component":"Text","text":"## Revenue by channel, 2026 YTD"}
{"id":"insight","component":"Text","text":"The website still earns most revenue (**$1.42M**), but the mobile app grew to **34%** of the total, up from 27% a year ago."}
{"id":"kpis","component":"Grid","columns":3,"children":["kpi_revenue","kpi_orders","kpi_aov"]}
{"id":"kpi_revenue","component":"KpiCard","label":"Revenue","value":{"@path":"/datasets/kpis/0/revenue"},"format":"currency","delta":{"@path":"/datasets/kpis/0/revenue_change"},"deltaLabel":"vs 2025 YTD"}
{"id":"kpi_orders","component":"KpiCard","label":"Orders","value":{"@path":"/datasets/kpis/0/orders"},"format":"integer"}
{"id":"kpi_aov","component":"KpiCard","label":"Average order value","value":{"@path":"/datasets/kpis/0/aov"},"format":"currency"}
{"id":"chart","component":"BarChart","title":"Revenue by channel","data":{"@path":"/datasets/revenue_by_channel"},"x":"channel","series":[{"field":"revenue","label":"Revenue"}],"format":"currency"}`;

const ACTIONS = `# Actions
A user message starting with "[action]" means the user clicked something on an existing dashboard. Update that dashboard in place:
- Re-run a query with the SAME name to refresh everything bound to it.
- To change a component, send it again with the same id. To add a section, send its parent again with the new child id added, then the new components. Replace the same section on the next drill-down instead of adding more.
- Send only what changes, and always send the insight Text again so its numbers match the new data.`;

function describeTable(table: TableGuide): string {
  const columns = table.columns.map((column) => `  ${column.name} ${column.type}${column.note ? ` -- ${column.note}` : ""}`);
  return `${table.kind} ${table.name}: ${table.about}\n${columns.join("\n")}`;
}

function describeCatalog(catalog: CatalogDocument): string {
  const { anyComponent: _components, anyFunction: _functions, ...defs } = catalog.$defs ?? {};
  return [
    `# Catalog ${String(catalog.catalogId)}`,
    String(catalog.instructions ?? ""),
    `## Components (JSON Schema keyed by name; "component" holds the name)\n${JSON.stringify(catalog.components)}`,
    `## Shared definitions\n${JSON.stringify(defs)}`,
    `## Functions\n${describeFunctions(catalog.functions)}`,
  ].join("\n\n");
}

type FunctionDefinition = { description?: string; properties?: { args?: { properties?: object; required?: string[] } } };

function describeFunctions(functions: unknown): string {
  if (typeof functions !== "object" || functions === null) return "None.";
  return Object.entries(functions as Record<string, FunctionDefinition>)
    .map(([name, definition]) => {
      const args = definition.properties?.args;
      const required = new Set(args?.required ?? []);
      const params = Object.keys(args?.properties ?? {}).map((arg) => (required.has(arg) ? arg : `${arg}?`));
      return `- ${name}(${params.join(", ")}): ${definition.description ?? ""}`;
    })
    .join("\n");
}

export function promptMessage(prompt: Prompt): string {
  if (prompt.kind === "question") return prompt.text;
  const { action } = prompt;
  return [
    `[action] "${action.name}" on dashboard ${action.surfaceId}, from component ${action.sourceComponentId}.`,
    action.userMessage ? `User intent: ${action.userMessage}` : "",
    `Context: ${JSON.stringify(action.context)}`,
  ]
    .filter(Boolean)
    .join("\n");
}
