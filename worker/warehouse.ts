import { guardReadOnly } from "./sql-guard.ts";

const MAX_RESULT_ROWS = 1000;

export type Row = Record<string, unknown>;

export type QueryResult =
  | { ok: true; columns: string[]; rows: Row[]; truncated: boolean; durationMs: number }
  | { ok: false; problem: string };

export interface Warehouse {
  query(sql: string): Promise<QueryResult>;
}

export function d1Warehouse(database: D1Database): Warehouse {
  return {
    async query(sql) {
      const guarded = guardReadOnly(sql);
      if (!guarded.ok) return guarded;
      const started = Date.now();
      try {
        const [columns, ...values] = await database
          .prepare(`SELECT * FROM (${guarded.sql}) LIMIT ${MAX_RESULT_ROWS + 1}`)
          .raw<unknown[]>({ columnNames: true });
        const rows = values.slice(0, MAX_RESULT_ROWS).map((cells) => toRow(columns, cells));
        return { ok: true, columns, rows, truncated: values.length > MAX_RESULT_ROWS, durationMs: Date.now() - started };
      } catch (error) {
        return { ok: false, problem: describeDatabaseError(error) };
      }
    },
  };
}

function toRow(columns: string[], cells: unknown[]): Row {
  return Object.fromEntries(columns.map((column, index) => [column, roundDecimals(cells[index])]));
}

function roundDecimals(value: unknown): unknown {
  return typeof value === "number" && !Number.isInteger(value) ? Math.round(value * 10_000) / 10_000 : value;
}

function describeDatabaseError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/^D1_ERROR:\s*/, "").replace(/:\s*SQLITE_ERROR.*$/, "");
}
