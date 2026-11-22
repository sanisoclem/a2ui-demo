import type { NumberFormat } from "../../catalog/analytics.ts";

export type Row = Record<string, unknown>;

export type Detail = "full" | "short";

const MONTH = /^(\d{4})-(\d{2})$/;
const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function rowsOf(value: unknown): Row[] {
  if (!Array.isArray(value)) return [];
  return value.filter((row): row is Row => typeof row === "object" && row !== null && !Array.isArray(row));
}

export function toNumber(value: unknown): number | undefined {
  const number = typeof value === "number" ? value : typeof value === "string" && value.trim() !== "" ? Number(value) : NaN;
  return Number.isFinite(number) ? number : undefined;
}

export function formatNumber(value: unknown, format: NumberFormat = "compact", detail: Detail = "full"): string {
  const number = toNumber(value);
  if (number === undefined) return value === null || value === undefined ? "—" : String(value);
  switch (format) {
    case "percent":
      return new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: detail === "full" ? 1 : 0 }).format(number);
    case "currency":
      return detail === "short" || Math.abs(number) >= 1_000_000 ? shortCurrency(number) : fullCurrency(number);
    case "integer":
      return detail === "short" ? shortNumber(number) : new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(number);
    case "number":
      return detail === "short" ? shortNumber(number) : new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(number);
    case "compact":
      return shortNumber(number);
  }
}

export function formatChange(fraction: number): string {
  const percent = new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 1 }).format(Math.abs(fraction));
  return `${fraction >= 0 ? "+" : "−"}${percent}`;
}

function fullCurrency(number: number): string {
  const decimals = Math.abs(number) >= 100 ? 0 : 2;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(number);
}

function shortCurrency(number: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 }).format(number);
}

function shortNumber(number: number): string {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(number);
}

export function formatCategory(value: unknown, detail: Detail = "full"): string {
  if (typeof value !== "string") return value === null || value === undefined ? "—" : String(value);
  const month = MONTH.exec(value);
  if (month) return `${MONTH_NAMES[Number(month[2]) - 1]} ${detail === "full" ? month[1] : `’${month[1]!.slice(2)}`}`;
  const date = DATE.exec(value);
  if (date) return `${MONTH_NAMES[Number(date[2]) - 1]} ${Number(date[3])}${detail === "full" ? `, ${date[1]}` : ""}`;
  return value;
}

export function isNumericColumn(rows: Row[], column: string): boolean {
  return rows.length > 0 && rows.every((row) => row[column] === null || typeof row[column] === "number");
}

export function columnsOf(rows: Row[]): string[] {
  return rows.length > 0 ? Object.keys(rows[0]!) : [];
}

export function labelOf(column: string): string {
  const words = column.replaceAll("_", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}
