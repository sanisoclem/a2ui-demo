import { readFileSync, writeFileSync } from "node:fs";
import { generateWarehouse, type Warehouse } from "./seed/generate.ts";
import { insertStatements, type TableRows } from "./seed/sql.ts";

const SEED = 20261122;

function warehouseTables(warehouse: Warehouse): TableRows[] {
  return [
    {
      table: "customers",
      columns: ["customer_id", "signup_date", "country", "region", "city", "acquisition_channel", "loyalty_tier"],
      rows: warehouse.customers.map((c) => [c.customerId, c.signupDate, c.country.name, c.country.region, c.city, c.acquisitionChannel, c.loyaltyTier]),
    },
    {
      table: "products",
      columns: ["product_id", "sku", "product_name", "category", "subcategory", "list_price", "unit_cost", "launch_date"],
      rows: warehouse.products.map((p) => [p.productId, p.sku, p.name, p.category.name, p.subcategory, p.price, p.cost, p.launchDate]),
    },
    {
      table: "orders",
      columns: ["order_id", "customer_id", "order_date", "order_hour", "channel", "device", "status", "promo_code", "shipping_fee", "is_first_order"],
      rows: warehouse.orders.map((o) => [
        o.orderId, o.customerId, o.orderDate, o.orderHour, o.channel, o.device, o.status, o.promoCode, o.shippingFee, o.isFirstOrder ? 1 : 0,
      ]),
    },
    {
      table: "order_items",
      columns: ["order_id", "line_no", "product_id", "quantity", "unit_price", "discount_pct", "net_amount", "cost_amount"],
      rows: warehouse.orderItems.map((i) => [i.orderId, i.lineNo, i.product.productId, i.quantity, i.unitPrice, i.discountPct, i.netAmount, i.costAmount]),
    },
    {
      table: "marketing_spend",
      columns: ["spend_date", "channel", "spend", "impressions", "clicks", "attributed_orders", "attributed_revenue"],
      rows: warehouse.marketing.map((m) => [m.date, m.channel, m.spend, m.impressions, m.clicks, m.attributedOrders, m.attributedRevenue]),
    },
    {
      table: "web_traffic",
      columns: ["visit_date", "source", "device", "sessions", "product_views", "add_to_carts", "checkouts", "orders"],
      rows: warehouse.traffic.map((t) => [t.date, t.source, t.device, t.sessions, t.productViews, t.addToCarts, t.checkouts, t.orders]),
    },
  ];
}

const schema = readFileSync(new URL("./schema.sql", import.meta.url), "utf8");
const tables = warehouseTables(generateWarehouse(SEED));
const inserts = tables.flatMap(insertStatements);
writeFileSync(new URL("./seed.sql", import.meta.url), `${schema}\n${inserts.join("\n")}\n`);
console.log(tables.map(({ table, rows }) => `${table}: ${rows.length}`).join("\n"));
