export type SqlValue = string | number | null;

export type TableRows = { table: string; columns: readonly string[]; rows: readonly (readonly SqlValue[])[] };

const ROWS_PER_INSERT = 400;

export function insertStatements({ table, columns, rows }: TableRows): string[] {
  const statements: string[] = [];
  for (let start = 0; start < rows.length; start += ROWS_PER_INSERT) {
    const values = rows.slice(start, start + ROWS_PER_INSERT).map((row) => `(${row.map(sqlLiteral).join(",")})`);
    statements.push(`INSERT INTO ${table} (${columns.join(",")}) VALUES\n${values.join(",\n")};`);
  }
  return statements;
}

function sqlLiteral(value: SqlValue): string {
  if (value === null) return "NULL";
  if (typeof value === "number") return Number.isInteger(value) ? String(value) : value.toFixed(2);
  return `'${value.replaceAll("'", "''")}'`;
}
