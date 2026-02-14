export const STRIPE_TIERS = {
  free: {
    name: "Free",
    price: 0,
    price_id: null,
    product_id: null,
    credits: 5,
    features: [
      "5 price checks/month",
      "Basic market data",
      "1 active listing tracked",
    ],
  },
  pro: {
    name: "Pro",
    price: 14.99,
    price_id: "price_1T0oLn4qASjubvn31XA0DUoy",
    product_id: "prod_TyltIvYWdZReZo",
    credits: 25,
    features: [
      "25 price checks/month",
      "AI listing optimisation",
      "Basic trend data",
      "50 active listings tracked",
      "Email support",
    ],
  },
  business: {
    name: "Business",
    price: 34.99,
    price_id: "price_1T0oLo4qASjubvn3p0Zo36i8",
    product_id: "prod_TyltCrUUsbuddE",
    credits: 100,
    features: [
      "100 price checks/month",
      "Bulk operations",
      "Advanced analytics",
      "Unlimited listings tracked",
      "Priority support",
      "Export reports",
    ],
  },
  scale: {
    name: "Scale",
    price: 74.99,
    price_id: "price_1T0oLq4qASjubvn3Wf0QP5W1",
    product_id: "prod_TyltldO5OcP5cE",
    credits: 999,
    features: [
      "Unlimited price checks",
      "API access",
      "White-label reports",
      "Dedicated support",
      "Custom integrations",
      "Team accounts",
    ],
  },
} as const;

export type TierKey = keyof typeof STRIPE_TIERS;

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

// Default Lobstr.io Squid IDs for Vinted scraping.
// Replace these with your actual Squid IDs from your Lobstr.io account.
// Each Squid should be configured to scrape a specific Vinted category/market.
export const DEFAULT_LOBSTR_SQUID_IDS = [
  "vinted-uk-womenswear",
  "vinted-uk-menswear",
  "vinted-uk-streetwear",
  "vinted-uk-vintage",
  "vinted-uk-designer",
  "vinted-uk-shoes",
  "vinted-uk-accessories",
  "vinted-uk-kids",
] as const;

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
