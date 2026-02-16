export const STRIPE_TIERS = {
  free: {
    name: "Free",
    price: 0,
    price_id: null,
    product_id: null,
    credits: 5,
    features: [
      "5 credits/month",
      "Basic trend overview (top 5)",
      "Up to 20 items tracked",
      "P&L tracking",
      "Import from Vinted URL",
    ],
  },
  pro: {
    name: "Pro",
    price: 9.99,
    price_id: "price_1T1SOA4qASjubvn3DXGtMsyF",
    annual_price_id: "price_1T1SOH4qASjubvn3I76sFq9b",
    annual_price: 95.88,
    product_id: "prod_TzRG6VOJz5FeDO",
    credits: 50,
    features: [
      "50 credits/month",
      "AI listing optimisation",
      "Full Trend Radar + Seasonal Calendar",
      "Niche Finder",
      "Competitor tracking (3)",
      "Portfolio health & dead stock alerts",
      "AI relist suggestions",
      "Charity sourcing briefing",
      "Unlimited items tracked",
      "Email support",
    ],
  },
  business: {
    name: "Business",
    price: 24.99,
    price_id: "price_1T1SOC4qASjubvn3xBRS3sn6",
    annual_price_id: "price_1T1SOI4qASjubvn3H7EMTApk",
    annual_price: 239.88,
    product_id: "prod_TzRGZwyHsR06JS",
    credits: 200,
    features: [
      "200 credits/month",
      "Everything in Pro",
      "Arbitrage Scanner (cross-platform)",
      "Clearance Radar",
      "Multi-language listings (5 languages)",
      "Bulk listing optimisation",
      "eBay cross-listing",
      "Competitor tracking (15)",
      "Export reports to CSV",
      "Priority support",
    ],
  },
  scale: {
    name: "Scale",
    price: 49.99,
    price_id: "price_1T1SOD4qASjubvn3WJBZIrvc",
    annual_price_id: "price_1T1SOJ4qASjubvn3G45U5qiV",
    annual_price: 479.88,
    product_id: "prod_TzRGaCd7E9PYRx",
    credits: -1,
    features: [
      "Unlimited credits",
      "Everything in Business",
      "All languages supported",
      "Competitor tracking (50)",
      "Priority support with fast response",
    ],
  },
} as const;

export type TierKey = keyof typeof STRIPE_TIERS;

export const CREDIT_PACKS = [
  {
    credits: 10,
    price: 2.99,
    price_id: "price_1T0t9m4qASjubvn3EZeqG8Sh",
    product_id: "prod_TyqrAktXCAAqXl",
    label: "10 Credits",
    popular: false,
  },
  {
    credits: 25,
    price: 5.99,
    price_id: "price_1T0t9n4qASjubvn3Akt5hBIZ",
    product_id: "prod_Tyqr7S9IGVN5Aa",
    label: "25 Credits",
    popular: true,
  },
  {
    credits: 50,
    price: 9.99,
    price_id: "price_1T0t9o4qASjubvn3Betm5xoU",
    product_id: "prod_TyqrLZZTTXPoMt",
    label: "50 Credits",
    popular: false,
  },
] as const;

export const SELLING_CATEGORIES = [
  "Womenswear",
  "Menswear",
  "Vintage",
  "Streetwear",
  "Designer",
  "Kids",
  "Shoes",
  "Accessories",
] as const;

export const LISTING_COUNTS = ["1-10", "10-50", "50-200", "200+"] as const;

export const PRIMARY_GOALS = [
  { value: "sell_faster", label: "Sell faster" },
  { value: "better_prices", label: "Get better prices" },
  { value: "find_stock", label: "Find stock to resell" },
  { value: "save_time", label: "Save time" },
] as const;


export const FEATURE_FLAGS = {} as const;

export const TIMEZONES = [
  { value: "Europe/London", label: "🇬🇧 London (GMT/BST)" },
  { value: "Europe/Paris", label: "🇫🇷 Paris (CET/CEST)" },
  { value: "Europe/Berlin", label: "🇩🇪 Berlin (CET/CEST)" },
  { value: "Europe/Amsterdam", label: "🇳🇱 Amsterdam (CET/CEST)" },
  { value: "Europe/Madrid", label: "🇪🇸 Madrid (CET/CEST)" },
  { value: "Europe/Rome", label: "🇮🇹 Rome (CET/CEST)" },
  { value: "Europe/Warsaw", label: "🇵🇱 Warsaw (CET/CEST)" },
  { value: "Europe/Stockholm", label: "🇸🇪 Stockholm (CET/CEST)" },
  { value: "Europe/Lisbon", label: "🇵🇹 Lisbon (WET/WEST)" },
  { value: "Europe/Brussels", label: "🇧🇪 Brussels (CET/CEST)" },
  { value: "Europe/Vienna", label: "🇦🇹 Vienna (CET/CEST)" },
  { value: "Europe/Prague", label: "🇨🇿 Prague (CET/CEST)" },
] as const;
