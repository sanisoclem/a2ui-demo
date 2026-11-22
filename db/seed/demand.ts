import { addDays, blackFriday, daysBetween, FIRST_DAY, isWithin, type Day } from "./calendar.ts";
import type { Weighted } from "./random.ts";
import { MONTH_FACTORS, WEEKDAY_FACTORS, type MarketingChannel, type TrafficSource } from "./world.ts";

export type Promotion = { code: string; discount: number; demand: number };

export type OrderChannel = "Web" | "Mobile app" | "Marketplace";

const CHECKOUT_OUTAGE = { first: "2026-08-18", last: "2026-08-19" };
const MARKETPLACE_LAUNCH = "2025-03-01";
export const SOCIAL_PUSH = "2026-01-01";

const BASE_DAILY_ORDERS = 17;

function growth(day: Day): number {
  const years = daysBetween(FIRST_DAY, day.iso) / 365;
  return years <= 2 ? 1.25 ** years : 1.25 ** 2 * 1.14 ** (years - 2);
}

export function expectedOrders(day: Day): number {
  const seasonal = MONTH_FACTORS[day.month - 1]! * WEEKDAY_FACTORS[day.weekday]!;
  return BASE_DAILY_ORDERS * growth(day) * seasonal * holidayFactor(day) * (promotion(day)?.demand ?? 1);
}

export function promotion(day: Day): Promotion | undefined {
  const year = String(day.year).slice(2);
  const friday = blackFriday(day.year);
  if (day.iso === friday) return { code: `BLACKFRIDAY${year}`, discount: 0.25, demand: 3.2 };
  if (isWithin(day.iso, addDays(friday, 1), addDays(friday, 2))) return { code: `BLACKFRIDAY${year}`, discount: 0.25, demand: 2.0 };
  if (day.iso === addDays(friday, 3)) return { code: `CYBERMONDAY${year}`, discount: 0.2, demand: 2.6 };
  if (day.month === 7 && day.dayOfMonth >= 14 && day.dayOfMonth <= 16) return { code: `SUMMER${year}`, discount: 0.15, demand: 1.8 };
  return undefined;
}

function holidayFactor(day: Day): number {
  if (day.month === 12 && day.dayOfMonth <= 20) return 1.15;
  if (day.month === 12 && day.dayOfMonth >= 24 && day.dayOfMonth <= 26) return 0.6;
  if (day.month === 1 && day.dayOfMonth === 1) return 0.7;
  return 1;
}

export function isCheckoutOutage(day: Day): boolean {
  return isWithin(day.iso, CHECKOUT_OUTAGE.first, CHECKOUT_OUTAGE.last);
}

export function channelWeights(day: Day): Weighted<OrderChannel> {
  const marketplaceMonths = Math.max(0, daysBetween(MARKETPLACE_LAUNCH, day.iso) / 30);
  const marketplace = day.iso >= MARKETPLACE_LAUNCH ? 0.04 + 0.06 * Math.min(1, marketplaceMonths / 12) : 0;
  return [
    ["Web", 0.75 - 0.23 * day.progress],
    ["Mobile app", 0.25 + 0.13 * day.progress],
    ["Marketplace", marketplace],
  ];
}

export type AdEconomics = { spend: number; roas: number; costPerClick: number; clickRate: number };

const BASE_AD_SPEND: Record<MarketingChannel, number> = {
  "Paid search": 320,
  "Paid social": 140,
  Affiliate: 60,
  Email: 15,
  Display: 90,
};

export function adEconomics(channel: MarketingChannel, day: Day): AdEconomics {
  const seasonal = MONTH_FACTORS[day.month - 1]! * (promotion(day) ? 1.6 : 1);
  const spend = BASE_AD_SPEND[channel] * growth(day) * seasonal;
  switch (channel) {
    case "Paid search":
      return { spend, roas: 4.4, costPerClick: 1.35, clickRate: 0.045 };
    case "Paid social": {
      const pushed = day.iso >= SOCIAL_PUSH;
      return { spend: spend * (pushed ? 3 : 1), roas: pushed ? 1.5 : day.year === 2025 ? 2.4 : 2.8, costPerClick: 0.85, clickRate: 0.011 };
    }
    case "Affiliate":
      return { spend, roas: 6.2, costPerClick: 0.6, clickRate: 0.02 };
    case "Email":
      return { spend, roas: 26, costPerClick: 0.05, clickRate: 0.03 };
    case "Display":
      return { spend: spend * (day.year === 2026 ? 0.5 : 1), roas: 1.2, costPerClick: 0.45, clickRate: 0.0025 };
  }
}

export function trafficSourceWeights(day: Day): Weighted<TrafficSource> {
  const socialShare = day.iso >= SOCIAL_PUSH ? 0.2 : 0.12;
  return [
    ["Organic search", 0.3],
    ["Paid search", 0.22],
    ["Paid social", socialShare],
    ["Email", 0.08],
    ["Direct", 0.18],
    ["Referral", 0.07],
  ];
}

export const SOURCE_CONVERSION: Record<TrafficSource, number> = {
  "Organic search": 1,
  "Paid search": 1.2,
  "Paid social": 0.55,
  Email: 1.8,
  Direct: 1.4,
  Referral: 1.1,
};
