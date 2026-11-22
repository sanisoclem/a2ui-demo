DROP VIEW IF EXISTS order_lines;
DROP TABLE IF EXISTS web_traffic;
DROP TABLE IF EXISTS marketing_spend;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS customers;

CREATE TABLE customers (
  customer_id INTEGER PRIMARY KEY,
  signup_date TEXT NOT NULL,
  country TEXT NOT NULL,
  region TEXT NOT NULL,
  city TEXT NOT NULL,
  acquisition_channel TEXT NOT NULL,
  loyalty_tier TEXT NOT NULL
);

CREATE TABLE products (
  product_id INTEGER PRIMARY KEY,
  sku TEXT NOT NULL,
  product_name TEXT NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT NOT NULL,
  list_price REAL NOT NULL,
  unit_cost REAL NOT NULL,
  launch_date TEXT NOT NULL
);

CREATE TABLE orders (
  order_id INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers (customer_id),
  order_date TEXT NOT NULL,
  order_hour INTEGER NOT NULL,
  channel TEXT NOT NULL,
  device TEXT NOT NULL,
  status TEXT NOT NULL,
  promo_code TEXT,
  shipping_fee REAL NOT NULL,
  is_first_order INTEGER NOT NULL
);

CREATE TABLE order_items (
  order_id INTEGER NOT NULL REFERENCES orders (order_id),
  line_no INTEGER NOT NULL,
  product_id INTEGER NOT NULL REFERENCES products (product_id),
  quantity INTEGER NOT NULL,
  unit_price REAL NOT NULL,
  discount_pct REAL NOT NULL,
  net_amount REAL NOT NULL,
  cost_amount REAL NOT NULL,
  PRIMARY KEY (order_id, line_no)
);

CREATE TABLE marketing_spend (
  spend_date TEXT NOT NULL,
  channel TEXT NOT NULL,
  spend REAL NOT NULL,
  impressions INTEGER NOT NULL,
  clicks INTEGER NOT NULL,
  attributed_orders INTEGER NOT NULL,
  attributed_revenue REAL NOT NULL,
  PRIMARY KEY (spend_date, channel)
);

CREATE TABLE web_traffic (
  visit_date TEXT NOT NULL,
  source TEXT NOT NULL,
  device TEXT NOT NULL,
  sessions INTEGER NOT NULL,
  product_views INTEGER NOT NULL,
  add_to_carts INTEGER NOT NULL,
  checkouts INTEGER NOT NULL,
  orders INTEGER NOT NULL,
  PRIMARY KEY (visit_date, source, device)
);

CREATE INDEX orders_by_date ON orders (order_date);
CREATE INDEX orders_by_customer ON orders (customer_id);
CREATE INDEX order_items_by_product ON order_items (product_id);

CREATE VIEW order_lines AS
SELECT
  oi.order_id,
  oi.line_no,
  o.order_date,
  o.order_hour,
  o.channel,
  o.device,
  o.status,
  o.promo_code,
  o.is_first_order,
  o.customer_id,
  c.country,
  c.region,
  c.acquisition_channel,
  c.loyalty_tier,
  oi.product_id,
  p.product_name,
  p.category,
  p.subcategory,
  oi.quantity,
  oi.unit_price,
  oi.discount_pct,
  CASE WHEN o.status = 'Cancelled' THEN 0 ELSE oi.net_amount END AS gross_sales,
  CASE WHEN o.status = 'Completed' THEN oi.net_amount ELSE 0 END AS net_revenue,
  CASE WHEN o.status = 'Completed' THEN oi.net_amount - oi.cost_amount ELSE 0 END AS gross_profit
FROM order_items AS oi
JOIN orders AS o ON o.order_id = oi.order_id
JOIN products AS p ON p.product_id = oi.product_id
JOIN customers AS c ON c.customer_id = o.customer_id;
