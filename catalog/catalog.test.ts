import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { buildCatalogDocument, formatCatalogDocument } from "../scripts/write-catalog.ts";

it("catalog.json is the catalog defined in code (regenerate with `pnpm catalog`)", () => {
  const committed = readFileSync(new URL("./catalog.json", import.meta.url), "utf8");
  expect(committed).toBe(formatCatalogDocument(buildCatalogDocument()));
});
