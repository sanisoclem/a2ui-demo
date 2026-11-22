import type { ReactCatalogComponent } from "@a2ui/react";
import { basicCatalog, type FunctionImplementation } from "@a2ui/web_core/v1_0";
import { deriveAnalyticsCatalog } from "../../catalog/catalog.ts";
import { BarChartView } from "./components/bar-chart.tsx";
import { DataTable } from "./components/data-table.tsx";
import { Grid } from "./components/grid.tsx";
import { Heatmap } from "./components/heatmap.tsx";
import { KpiCard } from "./components/kpi-card.tsx";
import { LineChartView } from "./components/line-chart.tsx";
import { ScatterChartView } from "./components/scatter-chart.tsx";
import { SegmentedBar } from "./components/segmented-bar.tsx";

export const analyticsCatalog = deriveAnalyticsCatalog<ReactCatalogComponent, FunctionImplementation>(basicCatalog, [
  Grid,
  KpiCard,
  LineChartView,
  BarChartView,
  SegmentedBar,
  ScatterChartView,
  Heatmap,
  DataTable,
]);
