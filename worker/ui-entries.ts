import { Catalog } from "@a2ui/web_core/catalog";
import type { ZodError } from "zod";

export type Component = { id: string; component: string } & Record<string, unknown>;

export type UiEntry =
  | { kind: "component"; component: Component }
  | { kind: "data"; path: string; value: unknown }
  | { kind: "rejected"; problem: string };

export interface ComponentChecker {
  check(component: Component): string | undefined;
}

const COMPONENT_ID = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/;
const DATASETS_PATH = "/datasets";

export function componentChecker(catalogDocument: Record<string, unknown>): ComponentChecker {
  const catalog = Catalog.fromJson(catalogDocument);
  const names = [...catalog.components.keys()].join(", ");
  return {
    check({ id: _id, component: name, ...props }) {
      const api = catalog.components.get(name);
      if (!api) return `Unknown component "${name}". Available: ${names}.`;
      const result = api.schema.safeParse(props);
      return result.success ? undefined : describeIssues(result.error);
    },
  };
}

function describeIssues(error: ZodError): string {
  return error.issues.map((issue) => `${issue.path.join(".") || "props"}: ${issue.message}`).join("; ");
}

export function readUiEntry(text: string, checker: ComponentChecker): UiEntry {
  const parsed = parseObject(text);
  if (!parsed) return { kind: "rejected", problem: "Not a JSON object." };
  if (typeof parsed.id === "string" && typeof parsed.component === "string") return readComponent(parsed as Component, checker);
  if (typeof parsed.path === "string" && "value" in parsed) return readData(parsed.path, parsed.value);
  return { kind: "rejected", problem: 'Each entry must be a component {"id", "component", ...} or a data entry {"path", "value"}.' };
}

function parseObject(text: string): Record<string, unknown> | undefined {
  try {
    const value: unknown = JSON.parse(text);
    return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
  } catch {
    return undefined;
  }
}

function readComponent(component: Component, checker: ComponentChecker): UiEntry {
  if (!COMPONENT_ID.test(component.id)) return { kind: "rejected", problem: `Invalid id "${component.id}".` };
  const problem = checker.check(component);
  return problem ? { kind: "rejected", problem: `${component.id} (${component.component}): ${problem}` } : { kind: "component", component };
}

function readData(path: string, value: unknown): UiEntry {
  if (!path.startsWith("/")) return { kind: "rejected", problem: `Data path "${path}" must start with "/".` };
  if (path === "/" || path.startsWith(DATASETS_PATH)) return { kind: "rejected", problem: `Data path "${path}" is reserved for query results.` };
  return { kind: "data", path, value };
}

export function findLayoutProblems(components: ReadonlyMap<string, Component>, datasets: ReadonlySet<string>): string[] {
  const problems: string[] = [];
  if (!components.has("root")) problems.push('No component has id "root".');
  for (const component of components.values()) {
    for (const child of childIds(component))
      if (!components.has(child)) problems.push(`${component.id} refers to child "${child}", which was never sent.`);
    for (const dataset of boundDatasets(component))
      if (!datasets.has(dataset)) problems.push(`${component.id} binds to /datasets/${dataset}, but no query produced that dataset.`);
  }
  return problems;
}

function childIds(component: Component): string[] {
  const { child, children, tabs } = component;
  const ids: string[] = [];
  if (typeof child === "string") ids.push(child);
  if (Array.isArray(children)) ids.push(...children.filter((id): id is string => typeof id === "string"));
  else if (isRecord(children) && typeof children.componentId === "string") ids.push(children.componentId);
  if (Array.isArray(tabs)) for (const tab of tabs) if (isRecord(tab) && typeof tab.child === "string") ids.push(tab.child);
  return ids;
}

function boundDatasets(component: Component): string[] {
  const paths = JSON.stringify(component).matchAll(/"@path"\s*:\s*"\/datasets\/([^/"]+)/g);
  return [...paths].map((match) => match[1]!);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
