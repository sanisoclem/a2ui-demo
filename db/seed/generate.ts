import { addDays, daysBetween, eachDay, FIRST_DAY, isWithin, LAST_DAY, localMonth, type Day } from "./calendar.ts";
import {
  adEconomics,
  channelWeights,
  expectedOrders,
  isCheckoutOutage,
  promotion,
  SOCIAL_PUSH,
  SOURCE_CONVERSION,
  trafficSourceWeights,
  type OrderChannel,
  type Promotion,
} from "./demand.ts";
import { Random, type Weighted } from "./random.ts";
import {
  CATEGORIES,
  COUNTRIES,
  DEVICES,
  LAUNCH_HIT,
  LOYALTY_TIERS,
  MARKETING_CHANNELS,
  ORDER_HOUR_WEIGHTS,
  PRODUCT_LINES,
  STAR_PRODUCT,
  STAR_PRODUCT_STOCKOUT,
  TRAFFIC_SOURCES,
  type CategorySpec,
  type CountrySpec,
  type Device,
  type ItemSpec,
  type MarketingChannel,
  type TrafficSource,
} from "./world.ts";

export type Product = {
  productId: number;
  sku: string;
  name: string;
  category: CategorySpec;
  subcategory: string;
  price: number;
  cost: number;
  launchDate: string;
  popularity: number;
};

export type Customer = {
  customerId: number;
  signupDate: string;
  country: CountrySpec;
  city: string;
  acquisitionChannel: string;
  loyaltyTier: string;
};

export type OrderStatus = "Completed" | "Returned" | "Cancelled";

export type Order = {
  orderId: number;
  customerId: number;
  orderDate: string;
  orderHour: number;
  channel: OrderChannel;
  device: Device;
  status: OrderStatus;
  promoCode: string | null;
  shippingFee: number;
  isFirstOrder: boolean;
};

export type OrderItem = {
  orderId: number;
  lineNo: number;
  product: Product;
  quantity: number;
  unitPrice: number;
  discountPct: number;
  netAmount: number;
  costAmount: number;
};

export type MarketingDay = {
  date: string;
  channel: MarketingChannel;
  spend: number;
  impressions: number;
  clicks: number;
  attributedOrders: number;
  attributedRevenue: number;
};

export type TrafficDay = {
  date: string;
  source: TrafficSource;
  device: Device;
  sessions: number;
  productViews: number;
  addToCarts: number;
  checkouts: number;
  orders: number;
};

export type Warehouse = {
  products: Product[];
  customers: Customer[];
  orders: Order[];
  orderItems: OrderItem[];
  marketing: MarketingDay[];
  traffic: TrafficDay[];
};

type SalesLedger = {
  customers: Customer[];
  regulars: Map<string, Customer[]>;
  orders: Order[];
  orderItems: OrderItem[];
};

export function generateWarehouse(seed: number): Warehouse {
  const random = new Random(seed);
  const days = eachDay(FIRST_DAY, LAST_DAY);
  const products = createProducts(random);
  const sales = createSales(random, days, products);
  return {
    products,
    customers: sales.customers,
    orders: sales.orders,
    orderItems: sales.orderItems,
    marketing: createMarketing(random, days),
    traffic: createTraffic(random, days, sales.orders),
  };
}

function createProducts(random: Random): Product[] {
  const products: Product[] = [];
  for (const category of CATEGORIES)
    for (const subcategory of category.subcategories)
      for (const item of subcategory.items)
        for (const line of productLinesFor(random, item))
          products.push(createProduct(random, products.length + 1, `${line} ${item.suffix}`, item, category, subcategory.name));
  return products;
}

function productLinesFor(random: Random, item: ItemSpec): string[] {
  const lines = [...(item.lines ?? [])];
  const wanted = Math.max(lines.length, random.chance(0.45) ? 2 : 1);
  while (lines.length < wanted) {
    const line = random.pick(PRODUCT_LINES);
    if (!lines.includes(line)) lines.push(line);
  }
  return lines;
}

function createProduct(
  random: Random,
  productId: number,
  name: string,
  item: ItemSpec,
  category: CategorySpec,
  subcategory: string,
): Product {
  const price = roundPrice(random.between(item.price[0], item.price[1]));
  const margin = category.margin + random.between(-0.05, 0.05);
  return {
    productId,
    sku: `LO-${category.name.slice(0, 3).toUpperCase()}-${String(productId).padStart(4, "0")}`,
    name,
    category,
    subcategory,
    price,
    cost: roundCents(price * (1 - margin)),
    launchDate: launchDate(random, name),
    popularity: popularity(random, name),
  };
}

function launchDate(random: Random, name: string): string {
  if (name === LAUNCH_HIT.name) return LAUNCH_HIT.launch;
  return random.chance(0.12) ? addDays("2024-03-01", random.integer(0, 800)) : addDays("2019-01-01", random.integer(0, 1700));
}

function popularity(random: Random, name: string): number {
  if (name === STAR_PRODUCT) return 6;
  if (name === LAUNCH_HIT.name) return 4;
  return Math.exp(random.normal(0, 0.7));
}

function createSales(random: Random, days: Day[], products: Product[]): SalesLedger {
  const ledger: SalesLedger = { customers: [], regulars: new Map(), orders: [], orderItems: [] };
  for (const day of days) {
    const ordersToday = random.count(expectedOrders(day));
    for (let n = 0; n < ordersToday; n++) placeOrder(random, day, products, ledger);
  }
  return ledger;
}

function placeOrder(random: Random, day: Day, products: Product[], ledger: SalesLedger): void {
  const channel = random.weighted(channelWeights(day));
  if (channel === "Web" && isCheckoutOutage(day) && random.chance(0.8)) return;
  const country = pickCountry(random, day);
  const { customer, isFirstOrder } = findCustomer(random, day, country, channel, ledger);
  const orderId = 100_001 + ledger.orders.length;
  const promo = orderPromotion(random, day, isFirstOrder);
  const items = pickItems(random, day, country, products, orderId, promo);
  ledger.orderItems.push(...items);
  ledger.orders.push({
    orderId,
    customerId: customer.customerId,
    orderDate: day.iso,
    orderHour: random.weighted(ORDER_HOUR_WEIGHTS),
    channel,
    device: pickDevice(random, channel),
    status: pickStatus(random, items, channel),
    promoCode: promo?.code ?? null,
    shippingFee: shippingFee(items, country),
    isFirstOrder,
  });
}

function pickCountry(random: Random, day: Day): CountrySpec {
  const open = COUNTRIES.filter((country) => !country.launch || country.launch <= day.iso);
  return random.weighted(open.map((country) => [country, country.weight * launchRamp(country.launch, day, 180)] as const));
}

function launchRamp(launch: string | undefined, day: Day, rampDays: number): number {
  if (!launch) return 1;
  return 0.1 + 0.9 * Math.min(1, daysBetween(launch, day.iso) / rampDays);
}

function findCustomer(
  random: Random,
  day: Day,
  country: CountrySpec,
  channel: OrderChannel,
  ledger: SalesLedger,
): { customer: Customer; isFirstOrder: boolean } {
  const regular = random.chance(0.18 + 0.27 * day.progress) ? pickRegular(random, country, ledger) : undefined;
  if (regular) return { customer: regular, isFirstOrder: false };
  return { customer: registerCustomer(random, day, country, channel, ledger), isFirstOrder: true };
}

function pickRegular(random: Random, country: CountrySpec, ledger: SalesLedger): Customer | undefined {
  const tier = random.weighted([["Bronze", 45], ["Silver", 32], ["Gold", 23]]);
  const pool = ledger.regulars.get(`${country.name}/${tier}`);
  return pool && pool.length > 0 ? random.pick(pool) : undefined;
}

function registerCustomer(random: Random, day: Day, country: CountrySpec, channel: OrderChannel, ledger: SalesLedger): Customer {
  const customer: Customer = {
    customerId: 1001 + ledger.customers.length,
    signupDate: day.iso,
    country,
    city: random.pick(country.cities),
    acquisitionChannel: acquisitionChannel(random, day, channel),
    loyaltyTier: random.weighted(LOYALTY_TIERS),
  };
  ledger.customers.push(customer);
  const key = `${country.name}/${customer.loyaltyTier}`;
  ledger.regulars.set(key, [...(ledger.regulars.get(key) ?? []), customer]);
  return customer;
}

function acquisitionChannel(random: Random, day: Day, channel: OrderChannel): string {
  if (channel === "Marketplace") return "Marketplace";
  return random.weighted([
    ["Organic search", 28],
    ["Paid search", 24],
    ["Paid social", day.iso >= SOCIAL_PUSH ? 22 : 11],
    ["Affiliate", 8],
    ["Referral", 9],
    ["Direct", 15],
  ]);
}

function orderPromotion(random: Random, day: Day, isFirstOrder: boolean): Promotion | undefined {
  const campaign = promotion(day);
  if (campaign) return campaign;
  if (isFirstOrder && random.chance(0.15)) return { code: "WELCOME10", discount: 0.1, demand: 1 };
  return undefined;
}

function pickItems(
  random: Random,
  day: Day,
  country: CountrySpec,
  products: Product[],
  orderId: number,
  promo: Promotion | undefined,
): OrderItem[] {
  const available = products.filter((product) => isAvailable(product, day));
  const month = localMonth(day.month, country.southernHemisphere);
  const lineCount = random.weighted([[1, 55], [2, 28], [3, 12], [4, 5]]);
  return Array.from({ length: lineCount }, (_, index) =>
    createOrderItem(random, day, orderId, index + 1, pickProduct(random, available, month, day), promo),
  );
}

function isAvailable(product: Product, day: Day): boolean {
  const soldOut = product.name === STAR_PRODUCT && isWithin(day.iso, STAR_PRODUCT_STOCKOUT.first, STAR_PRODUCT_STOCKOUT.last);
  return product.launchDate <= day.iso && !soldOut;
}

function pickProduct(random: Random, available: Product[], month: number, day: Day): Product {
  const category = random.weighted(CATEGORIES.map((spec) => [spec, spec.weight * spec.season[month - 1]!] as const));
  const candidates = available.filter((product) => product.category === category);
  return random.weighted(candidates.map((product) => [product, product.popularity * launchRamp(product.launchDate, day, 60)] as const));
}

function createOrderItem(
  random: Random,
  day: Day,
  orderId: number,
  lineNo: number,
  product: Product,
  promo: Promotion | undefined,
): OrderItem {
  const quantities: Weighted<number> = product.category.name === "Accessories" ? [[1, 70], [2, 22], [3, 8]] : [[1, 88], [2, 10], [3, 2]];
  const quantity = random.weighted(quantities);
  const unitPrice = priceOn(product, day);
  const discountPct = promo?.discount ?? 0;
  return {
    orderId,
    lineNo,
    product,
    quantity,
    unitPrice,
    discountPct,
    netAmount: roundCents(quantity * unitPrice * (1 - discountPct)),
    costAmount: roundCents(quantity * product.cost),
  };
}

function priceOn(product: Product, day: Day): number {
  const increase = (day.year >= 2025 ? 1.04 : 1) * (day.year >= 2026 ? 1.03 : 1);
  return increase === 1 ? product.price : roundPrice(product.price * increase);
}

function pickDevice(random: Random, channel: OrderChannel): Device {
  switch (channel) {
    case "Web":
      return random.weighted([["Desktop", 60], ["Mobile", 32], ["Tablet", 8]]);
    case "Mobile app":
      return random.weighted([["Mobile", 92], ["Tablet", 8]]);
    case "Marketplace":
      return random.weighted([["Desktop", 50], ["Mobile", 50]]);
  }
}

function pickStatus(random: Random, items: OrderItem[], channel: OrderChannel): OrderStatus {
  if (random.chance(0.025)) return "Cancelled";
  const returnRate = Math.max(...items.map((item) => item.product.category.returnRate)) + (channel === "Marketplace" ? 0.03 : 0);
  return random.chance(returnRate) ? "Returned" : "Completed";
}

function shippingFee(items: OrderItem[], country: CountrySpec): number {
  const subtotal = items.reduce((sum, item) => sum + item.netAmount, 0);
  if (subtotal >= 99) return 0;
  return country.international ? 14.95 : 7.95;
}

function createMarketing(random: Random, days: Day[]): MarketingDay[] {
  return days.flatMap((day) => MARKETING_CHANNELS.map((channel) => marketingDay(random, day, channel)));
}

function marketingDay(random: Random, day: Day, channel: MarketingChannel): MarketingDay {
  const economics = adEconomics(channel, day);
  const spend = roundCents(economics.spend * random.between(0.85, 1.15));
  const clicks = Math.round(spend / (economics.costPerClick * random.between(0.9, 1.1)));
  const attributedRevenue = roundCents(spend * economics.roas * random.between(0.8, 1.2));
  return {
    date: day.iso,
    channel,
    spend,
    impressions: Math.round(clicks / (economics.clickRate * random.between(0.9, 1.1))),
    clicks,
    attributedOrders: Math.round(attributedRevenue / random.between(150, 180)),
    attributedRevenue,
  };
}

const DEVICE_CONVERSION: Record<Device, number> = { Desktop: 0.034, Mobile: 0.019, Tablet: 0.024 };

function createTraffic(random: Random, days: Day[], orders: Order[]): TrafficDay[] {
  const onlineOrders = countOnlineOrders(orders);
  return days.flatMap((day) =>
    DEVICES.flatMap((device) => {
      const deviceOrders = onlineOrders.get(`${day.iso}/${device}`) ?? 0;
      return TRAFFIC_SOURCES.map((source) => trafficDay(random, day, device, source, deviceOrders));
    }),
  );
}

function countOnlineOrders(orders: Order[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const order of orders) {
    if (order.channel === "Marketplace" || order.status === "Cancelled") continue;
    const key = `${order.orderDate}/${order.device}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function trafficDay(random: Random, day: Day, device: Device, source: TrafficSource, deviceOrders: number): TrafficDay {
  const orders = Math.round(deviceOrders * orderShare(day, source) * random.between(0.85, 1.15));
  const usualOrders = isCheckoutOutage(day) ? orders / 0.45 : orders;
  const sessions = Math.round(usualOrders / (DEVICE_CONVERSION[device] * SOURCE_CONVERSION[source]));
  const addToCarts = Math.round(sessions * random.between(0.09, 0.12));
  const checkouts = Math.max(Math.round(addToCarts * random.between(0.48, 0.56)), orders);
  return {
    date: day.iso,
    source,
    device,
    sessions,
    productViews: Math.round(sessions * random.between(0.55, 0.65)),
    addToCarts,
    checkouts,
    orders,
  };
}

function orderShare(day: Day, source: TrafficSource): number {
  const weights = trafficSourceWeights(day).map(([name, weight]) => [name, weight * SOURCE_CONVERSION[name]] as const);
  const total = weights.reduce((sum, [, weight]) => sum + weight, 0);
  return (weights.find(([name]) => name === source)?.[1] ?? 0) / total;
}

function roundPrice(value: number): number {
  return Math.max(9, Math.round(value / 10) * 10 - 1);
}

function roundCents(value: number): number {
  return Math.round(value * 100) / 100;
}
