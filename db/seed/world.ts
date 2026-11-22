import type { Weighted } from "./random.ts";

export type MonthlyFactors = readonly number[];

const SUMMER: MonthlyFactors = [0.5, 0.55, 0.75, 1.0, 1.3, 1.6, 1.65, 1.4, 1.0, 0.7, 0.55, 0.7];
const WINTER: MonthlyFactors = [1.4, 1.1, 0.9, 0.7, 0.55, 0.5, 0.5, 0.6, 0.9, 1.3, 1.6, 1.8];
const SHOULDER: MonthlyFactors = [0.8, 0.8, 1.1, 1.25, 1.2, 1.0, 0.95, 1.0, 1.2, 1.15, 0.9, 0.9];
const GIFTING: MonthlyFactors = [0.8, 0.75, 0.85, 0.9, 1.0, 1.05, 1.05, 0.95, 0.9, 1.0, 1.4, 1.9];

export type ItemSpec = { suffix: string; price: readonly [number, number]; lines?: readonly string[] };

export type SubcategorySpec = { name: string; items: readonly ItemSpec[] };

export type CategorySpec = {
  name: string;
  weight: number;
  season: MonthlyFactors;
  returnRate: number;
  margin: number;
  subcategories: readonly SubcategorySpec[];
};

export const PRODUCT_LINES = [
  "Ridgeline", "Summit", "Cascade", "Granite", "Tundra", "Sierra", "Basecamp", "Northstar", "Canyon",
  "Ember", "Glacier", "Juniper", "Kestrel", "Meridian", "Pinnacle", "Switchback", "Timberline", "Lumen",
];

export const CATEGORIES: readonly CategorySpec[] = [
  {
    name: "Tents", weight: 0.1, season: SUMMER, returnRate: 0.04, margin: 0.47,
    subcategories: [
      { name: "Backpacking tents", items: [
        { suffix: "1P Tent", price: [249, 429] },
        { suffix: "2P Tent", price: [329, 499], lines: ["Ridgeline"] },
        { suffix: "3P Tent", price: [399, 579] },
      ] },
      { name: "Family tents", items: [{ suffix: "4P Tent", price: [449, 649] }, { suffix: "6P Tent", price: [549, 799] }] },
      { name: "Shelters", items: [{ suffix: "Ultralight Tarp", price: [89, 169] }, { suffix: "Mesh Shelter", price: [129, 219] }] },
    ],
  },
  {
    name: "Sleeping", weight: 0.11, season: SUMMER, returnRate: 0.04, margin: 0.52,
    subcategories: [
      { name: "Sleeping bags", items: [
        { suffix: "0°F Down Bag", price: [349, 499] },
        { suffix: "20°F Down Bag", price: [249, 379] },
        { suffix: "35°F Synthetic Bag", price: [119, 179] },
      ] },
      { name: "Sleeping pads", items: [
        { suffix: "Air Pad", price: [129, 219] },
        { suffix: "Foam Pad", price: [45, 69] },
        { suffix: "Self-Inflating Pad", price: [89, 149] },
      ] },
      { name: "Camp pillows", items: [{ suffix: "Inflatable Pillow", price: [29, 49] }] },
    ],
  },
  {
    name: "Backpacks", weight: 0.13, season: SHOULDER, returnRate: 0.05, margin: 0.55,
    subcategories: [
      { name: "Daypacks", items: [
        { suffix: "18L Daypack", price: [69, 99] },
        { suffix: "24L Daypack", price: [89, 129] },
        { suffix: "30L Daypack", price: [109, 159] },
      ] },
      { name: "Trekking packs", items: [
        { suffix: "45L Pack", price: [189, 249] },
        { suffix: "55L Pack", price: [229, 299] },
        { suffix: "65L Pack", price: [269, 349] },
      ] },
      { name: "Travel packs", items: [{ suffix: "40L Travel Pack", price: [149, 229] }] },
    ],
  },
  {
    name: "Apparel", weight: 0.24, season: WINTER, returnRate: 0.1, margin: 0.58,
    subcategories: [
      { name: "Jackets", items: [
        { suffix: "Down Jacket", price: [249, 399] },
        { suffix: "Insulated Jacket", price: [179, 279] },
        { suffix: "Shell Jacket", price: [229, 349] },
      ] },
      { name: "Fleece", items: [{ suffix: "Grid Fleece", price: [79, 119] }, { suffix: "Hooded Fleece", price: [99, 139] }] },
      { name: "Base layers", items: [
        { suffix: "Merino Crew", price: [79, 109] },
        { suffix: "Merino Hoodie", price: [119, 149] },
        { suffix: "Synthetic Tee", price: [39, 55] },
      ] },
      { name: "Rainwear", items: [{ suffix: "Packable Rain Jacket", price: [119, 169] }, { suffix: "3L Rain Jacket", price: [229, 299] }] },
      { name: "Hats & gloves", items: [{ suffix: "Merino Beanie", price: [29, 45] }, { suffix: "Liner Gloves", price: [25, 39] }] },
    ],
  },
  {
    name: "Footwear", weight: 0.16, season: SHOULDER, returnRate: 0.13, margin: 0.47,
    subcategories: [
      { name: "Hiking boots", items: [{ suffix: "Mid GTX Boot", price: [179, 239] }, { suffix: "Leather Boot", price: [199, 259] }] },
      { name: "Trail runners", items: [
        { suffix: "Trail Runner", price: [129, 159] },
        { suffix: "Trail Runner GTX", price: [149, 179], lines: ["Kestrel"] },
      ] },
      { name: "Sandals & camp shoes", items: [{ suffix: "Sandal", price: [59, 99] }, { suffix: "Camp Slide", price: [45, 69] }] },
    ],
  },
  {
    name: "Climbing", weight: 0.06, season: SHOULDER, returnRate: 0.03, margin: 0.5,
    subcategories: [
      { name: "Harnesses", items: [{ suffix: "Harness", price: [59, 129] }] },
      { name: "Ropes", items: [{ suffix: "9.5mm Rope", price: [219, 289] }, { suffix: "9.8mm Rope", price: [189, 249] }] },
      { name: "Helmets", items: [{ suffix: "Helmet", price: [69, 129] }] },
      { name: "Hardware", items: [{ suffix: "Carabiner Set", price: [39, 69] }, { suffix: "Belay Kit", price: [59, 89] }] },
    ],
  },
  {
    name: "Cooking", weight: 0.07, season: SUMMER, returnRate: 0.03, margin: 0.5,
    subcategories: [
      { name: "Stoves", items: [{ suffix: "Canister Stove", price: [59, 99] }, { suffix: "Liquid Fuel Stove", price: [129, 169] }] },
      { name: "Cookware", items: [{ suffix: "Titanium Pot", price: [39, 69] }, { suffix: "Cook Set", price: [59, 89] }] },
      { name: "Water treatment", items: [{ suffix: "Water Filter", price: [39, 99] }, { suffix: "Purifier Bottle", price: [45, 79] }] },
    ],
  },
  {
    name: "Accessories", weight: 0.13, season: GIFTING, returnRate: 0.03, margin: 0.6,
    subcategories: [
      { name: "Headlamps", items: [{ suffix: "400 Headlamp", price: [29, 49] }, { suffix: "900 Headlamp", price: [59, 89] }] },
      { name: "Trekking poles", items: [{ suffix: "Carbon Trekking Poles", price: [129, 169] }, { suffix: "Alloy Trekking Poles", price: [79, 109] }] },
      { name: "Bottles & mugs", items: [{ suffix: "Insulated Bottle", price: [29, 45] }, { suffix: "Camp Mug", price: [19, 29] }] },
    ],
  },
];

export const STAR_PRODUCT = "Ridgeline 2P Tent";
export const STAR_PRODUCT_STOCKOUT = { first: "2026-06-08", last: "2026-07-06" };
export const LAUNCH_HIT = { name: "Kestrel Trail Runner GTX", launch: "2025-09-01" };

export type CountrySpec = {
  name: string;
  region: string;
  weight: number;
  cities: readonly string[];
  southernHemisphere: boolean;
  international: boolean;
  launch?: string;
};

export const COUNTRIES: readonly CountrySpec[] = [
  { name: "United States", region: "North America", weight: 52, southernHemisphere: false, international: false,
    cities: ["Denver", "Seattle", "Portland", "Salt Lake City", "Austin", "Minneapolis", "Boston", "New York", "San Francisco", "Asheville"] },
  { name: "Canada", region: "North America", weight: 10, southernHemisphere: false, international: true,
    cities: ["Vancouver", "Calgary", "Toronto", "Montreal"] },
  { name: "United Kingdom", region: "Europe", weight: 8, southernHemisphere: false, international: true,
    cities: ["London", "Manchester", "Edinburgh", "Bristol"] },
  { name: "Germany", region: "Europe", weight: 9, southernHemisphere: false, international: true, launch: "2025-04-01",
    cities: ["Munich", "Berlin", "Hamburg", "Freiburg"] },
  { name: "France", region: "Europe", weight: 4, southernHemisphere: false, international: true,
    cities: ["Paris", "Lyon", "Grenoble"] },
  { name: "Netherlands", region: "Europe", weight: 2, southernHemisphere: false, international: true,
    cities: ["Amsterdam", "Utrecht"] },
  { name: "Australia", region: "Asia Pacific", weight: 10, southernHemisphere: true, international: true,
    cities: ["Sydney", "Melbourne", "Brisbane", "Hobart"] },
  { name: "New Zealand", region: "Asia Pacific", weight: 3, southernHemisphere: true, international: true,
    cities: ["Auckland", "Wellington", "Queenstown"] },
  { name: "Japan", region: "Asia Pacific", weight: 3, southernHemisphere: false, international: true,
    cities: ["Tokyo", "Osaka", "Sapporo"] },
];

export const LOYALTY_TIERS: Weighted<string> = [["Bronze", 70], ["Silver", 22], ["Gold", 8]];

export const ORDER_HOUR_WEIGHTS: Weighted<number> = [
  0.6, 0.35, 0.2, 0.15, 0.15, 0.25, 0.5, 0.9, 1.2, 1.3, 1.35, 1.45,
  1.6, 1.5, 1.4, 1.35, 1.4, 1.5, 1.7, 2.0, 2.2, 2.0, 1.5, 1.0,
].map((weight, hour) => [hour, weight] as const);

export const WEEKDAY_FACTORS = [1.12, 1.1, 1.0, 0.98, 0.97, 0.92, 0.95];

export const MONTH_FACTORS: MonthlyFactors = [0.85, 0.75, 0.9, 1.0, 1.15, 1.25, 1.2, 1.05, 0.9, 0.95, 1.3, 1.45];

export const MARKETING_CHANNELS = ["Paid search", "Paid social", "Affiliate", "Email", "Display"] as const;
export type MarketingChannel = (typeof MARKETING_CHANNELS)[number];

export const TRAFFIC_SOURCES = ["Organic search", "Paid search", "Paid social", "Email", "Direct", "Referral"] as const;
export type TrafficSource = (typeof TRAFFIC_SOURCES)[number];

export const DEVICES = ["Desktop", "Mobile", "Tablet"] as const;
export type Device = (typeof DEVICES)[number];
