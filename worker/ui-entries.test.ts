import { describe, expect, it } from "vitest";
import catalogDocument from "../catalog/catalog.json";
import { componentChecker, findLayoutProblems, readUiEntry, type Component } from "./ui-entries.ts";

const checker = componentChecker(catalogDocument);
const read = (entry: unknown) => readUiEntry(JSON.stringify(entry), checker);

describe("readUiEntry", () => {
  it("accepts a catalog component whose props match its schema", () => {
    const chart = { id: "trend", component: "LineChart", data: { "@path": "/datasets/monthly" }, x: "month", series: [{ field: "revenue" }] };
    expect(read(chart)).toEqual({ kind: "component", component: chart });
  });

  it("rejects unknown components and props outside the schema, naming the component", () => {
    expect(read({ id: "pie", component: "PieChart" })).toMatchObject({ kind: "rejected", problem: expect.stringContaining("Unknown component") });
    expect(read({ id: "t", component: "Text", text: "Hi", color: "red" })).toMatchObject({
      kind: "rejected",
      problem: expect.stringContaining("t (Text)"),
    });
  });

  it("accepts data entries for UI state but keeps /datasets for query results", () => {
    expect(read({ path: "/filters/region", value: ["All"] })).toEqual({ kind: "data", path: "/filters/region", value: ["All"] });
    expect(read({ path: "/datasets/revenue", value: [] })).toMatchObject({ kind: "rejected" });
  });
});

describe("findLayoutProblems", () => {
  const components = (...list: Component[]) => new Map(list.map((component) => [component.id, component]));

  it("finds nothing wrong with a rooted tree whose bindings all have datasets", () => {
    const tree = components(
      { id: "root", component: "Column", children: ["kpi"] },
      { id: "kpi", component: "KpiCard", label: "Revenue", value: { "@path": "/datasets/totals/0/revenue" } },
    );
    expect(findLayoutProblems(tree, new Set(["totals"]))).toEqual([]);
  });

  it("reports a missing root, children never sent and datasets never queried", () => {
    const tree = components(
      { id: "body", component: "Column", children: ["chart", "ghost"] },
      { id: "chart", component: "BarChart", data: { "@path": "/datasets/unqueried" }, x: "c", series: [{ field: "v" }] },
    );
    expect(findLayoutProblems(tree, new Set())).toEqual([
      'No component has id "root".',
      'body refers to child "ghost", which was never sent.',
      "chart binds to /datasets/unqueried, but no query produced that dataset.",
    ]);
  });
});
