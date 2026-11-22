import { describe, expect, it } from "vitest";
import { guardReadOnly } from "./sql-guard.ts";

const accepted = (sql: string) => expect(guardReadOnly(sql)).toMatchObject({ ok: true });
const rejected = (sql: string) => expect(guardReadOnly(sql)).toMatchObject({ ok: false });

describe("guardReadOnly", () => {
  it("accepts single SELECT and WITH queries, with or without a trailing semicolon", () => {
    accepted("SELECT category, SUM(net_revenue) FROM order_lines GROUP BY 1;");
    accepted("with m as (select 1 as x) select x from m");
  });

  it("returns the query without its trailing semicolon or comments", () => {
    expect(guardReadOnly("-- revenue\nSELECT 1 ; ")).toEqual({ ok: true, sql: "SELECT 1" });
  });

  it("allows the replace() function and columns whose names contain write keywords", () => {
    accepted("SELECT replace(product_name, 'Tent', 'Shelter') AS name FROM products");
    accepted("SELECT created_on, updated_by FROM t");
  });

  it("ignores keywords and semicolons inside string literals", () => {
    accepted("SELECT * FROM orders WHERE promo_code = 'DELETE;DROP'");
  });

  it("rejects writes, schema changes and pragmas", () => {
    rejected("DELETE FROM orders");
    rejected("WITH doomed AS (SELECT order_id FROM orders) DELETE FROM orders WHERE order_id IN doomed");
    rejected("SELECT 1; DROP TABLE orders");
    rejected("PRAGMA table_info(orders)");
    rejected("ATTACH DATABASE 'x' AS y");
    rejected("REPLACE INTO products VALUES (1)");
  });

  it("rejects writes hidden behind comments", () => {
    rejected("SELECT 1 /* harmless */; UPDATE orders SET status = 'Completed'");
  });
});
