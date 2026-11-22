import { writeFileSync } from "node:fs";
import type { ComponentApi, FunctionApi } from "@a2ui/web_core/catalog";
import { basicCatalog } from "@a2ui/web_core/v1_0";
import { ANALYTICS_APIS } from "../catalog/analytics.ts";
import { deriveAnalyticsCatalog } from "../catalog/catalog.ts";

export function buildCatalogDocument(): Record<string, unknown> {
  return deriveAnalyticsCatalog<ComponentApi, FunctionApi>(basicCatalog, ANALYTICS_APIS).toJson();
}

export function formatCatalogDocument(document: Record<string, unknown>): string {
  return `${JSON.stringify(document, null, 2)}\n`;
}

if (import.meta.main) {
  const target = new URL("../catalog/catalog.json", import.meta.url);
  writeFileSync(target, formatCatalogDocument(buildCatalogDocument()));
}
