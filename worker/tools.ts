import { z } from "zod";
import type { ToolDefinition } from "./deepseek.ts";

export const RUN_SQL = "run_sql";

const DATASET_NAME = /^[a-z][a-z0-9_]{0,39}$/;

export const RUN_SQL_TOOL: ToolDefinition = {
  type: "function",
  function: {
    name: RUN_SQL,
    description:
      "Run one read-only SQLite SELECT against the warehouse. The full result is loaded into the dashboard's data model at /datasets/<name>; you receive a preview.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "snake_case dataset name, e.g. monthly_revenue", pattern: DATASET_NAME.source },
        purpose: { type: "string", description: "One short sentence for the user, e.g. 'Monthly revenue by channel for 2026'." },
        sql: { type: "string", description: "A single SELECT (or WITH ... SELECT) statement in SQLite dialect." },
      },
      required: ["name", "purpose", "sql"],
    },
  },
};

const RunSqlArgumentsSchema = z.object({
  name: z.string().regex(DATASET_NAME, "name must be snake_case, starting with a letter, at most 40 characters"),
  purpose: z.string().max(300).default(""),
  sql: z.string().min(1).max(20_000),
});

export type RunSqlArguments = z.infer<typeof RunSqlArgumentsSchema>;

export function parseRunSqlArguments(text: string): { ok: true; value: RunSqlArguments } | { ok: false; problem: string } {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, problem: "Arguments were not valid JSON." };
  }
  const result = RunSqlArgumentsSchema.safeParse(json);
  if (result.success) return { ok: true, value: result.data };
  return { ok: false, problem: result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ") };
}
