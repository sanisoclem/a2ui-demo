import { createComponentImplementation } from "@a2ui/react";
import { DataTableApi } from "../../../catalog/analytics.ts";
import { TableView } from "../chart-frame.tsx";
import { columnsOf, rowsOf } from "../format.ts";

export const DataTable = createComponentImplementation(DataTableApi, ({ props }) => {
  const rows = rowsOf(props.data);
  const columns = props.columns ?? columnsOf(rows).map((field) => ({ field }));
  return (
    <figure className="chart">
      {props.title && (
        <figcaption className="chart-head">
          <span className="chart-title">{props.title}</span>
        </figcaption>
      )}
      <TableView rows={rows} columns={columns} pageSize={props.pageSize ?? 10} />
    </figure>
  );
});
