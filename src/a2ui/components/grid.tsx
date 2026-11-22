import { createComponentImplementation } from "@a2ui/react";
import type { CSSProperties } from "react";
import { GridApi } from "../../../catalog/analytics.ts";

export const Grid = createComponentImplementation(GridApi, ({ props, buildChild }) => (
  <div className="grid" style={{ "--grid-columns": props.columns ?? 2 } as CSSProperties}>
    {props.children.map((child) =>
      typeof child === "string" ? (
        <div className="grid-cell" key={child}>
          {buildChild(child)}
        </div>
      ) : (
        <div className="grid-cell" key={`${child.id}@${child.basePath}`}>
          {buildChild(child.id, child.basePath)}
        </div>
      ),
    )}
  </div>
));
