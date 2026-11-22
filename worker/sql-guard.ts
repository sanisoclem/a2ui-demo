export type GuardedSql = { ok: true; sql: string } | { ok: false; problem: string };

const WRITE_KEYWORDS =
  /\b(insert|update|delete|drop|alter|create|attach|detach|pragma|vacuum|reindex|analyze|begin|commit|rollback|savepoint|release|replace\s+into)\b/i;

export function guardReadOnly(input: string): GuardedSql {
  const sql = stripComments(input).trim().replace(/;\s*$/, "").trim();
  const code = blankStringLiterals(sql);
  if (sql === "") return { ok: false, problem: "The query is empty." };
  if (code.includes(";")) return { ok: false, problem: "Send one statement per query." };
  if (!/^(select|with)\b/i.test(code)) return { ok: false, problem: "Only SELECT queries (optionally starting with WITH) are allowed." };
  const write = WRITE_KEYWORDS.exec(code);
  if (write) return { ok: false, problem: `The warehouse is read-only; "${write[1]}" is not allowed.` };
  return { ok: true, sql };
}

function stripComments(sql: string): string {
  return sql.replace(/--[^\n]*/g, " ").replace(/\/\*[\s\S]*?\*\//g, " ");
}

function blankStringLiterals(sql: string): string {
  return sql.replace(/'(?:[^']|'')*'/g, "''").replace(/"(?:[^"]|"")*"/g, '""');
}
