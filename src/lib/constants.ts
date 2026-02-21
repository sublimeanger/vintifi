export const STRIPE_TIERS = {
  free: {
    name: "Free",
    price: 0,
    price_id: null,
    annual_price_id: null,
    annual_price: 0,
    product_id: null,
    credits: 5,
    perCredit: null,
    features: [
      "5 credits/month",
      "Remove Background",
      "1 Price Check/month",
      "Trend Radar preview",
      "10 items tracked",
    ],
  },
  starter: {
    name: "Starter",
    price: 5.99,
    price_id: "price_1T35Nn4qASjubvn3szXizDX8",
    annual_price_id: "price_1T35Nt4qASjubvn3GN49e5do",
    annual_price: 59.88,
    product_id: "prod_U17dtQeaUwTEqe",
    credits: 50,
    perCredit: "0.12",
    features: [
      "50 credits/month",
      "Full Photo Studio — all 4 tools",
      "AI Price Check",
      "AI Listing Optimiser",
      "Full Trend Radar",
      "100 items tracked",
    ],
  },
  pro: {
    name: "Pro",
    price: 14.99,
    price_id: "price_1T35No4qASjubvn3tSeOwtFU",
    annual_price_id: "price_1T35Nu4qASjubvn351n7vmIY",
    annual_price: 149.88,
    product_id: "prod_U17d1a1Mz5jOD5",
    credits: 200,
    perCredit: "0.075",
    features: [
      "200 credits/month",
      "Everything in Starter",
      "Multi-language listings (5 languages)",
      "Bulk photo processing (10 at once)",
      "Trend Radar + Niche Finder",
      "500 items tracked",
      "Email support",
    ],
  },
  business: {
    name: "Business",
    price: 29.99,
    price_id: "price_1T35Np4qASjubvn3n3Hl8Vzx",
    annual_price_id: "price_1T35Nv4qASjubvn3htdohtrC",
    annual_price: 299.88,
    product_id: "prod_U17dfL48mNFNYE",
    credits: 600,
    perCredit: "0.05",
    features: [
      "600 credits/month",
      "Everything in Pro",
      "Bulk processing (50 at once)",
      "All languages",
      "Competitor tracking (20 sellers)",
      "Bulk Listing Optimiser",
      "Unlimited items tracked",
      "Priority support",
    ],
  },
} as const;

export type TierKey = keyof typeof STRIPE_TIERS;

export const CREDIT_PACKS = [
  {
    credits: 10,
    price: 1.99,
    price_id: "price_1T35Nz4qASjubvn3FWNBYCnr",
    product_id: "prod_U17dctlnov5iL9",
    label: "10 Credits",
    popular: false,
  },
  {
    credits: 30,
    price: 4.49,
    price_id: "price_1T35O04qASjubvn3hkqBPs7K",
    product_id: "prod_U17dG1NzLTVbLm",
    label: "30 Credits",
    popular: false,
  },
  {
    credits: 75,
    price: 8.99,
    price_id: "price_1T35O14qASjubvn3O2GRfJ3w",
    product_id: "prod_U17dxqkW4oYQy3",
    label: "75 Credits",
    popular: true,
  },
  {
    credits: 150,
    price: 14.99,
    price_id: "price_1T35O14qASjubvn3DtNtdE0t",
    product_id: "prod_U17d1jumXGXX1J",
    label: "150 Credits",
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

export const PHOTO_OPERATIONS = {
  remove_bg:      { label: "Remove Background", credits: 1, api: "photoroom",      tier: "free" as TierKey,    icon: "Eraser",    description: "Clean cutout with white or transparent background", comingSoon: false },
  sell_ready:     { label: "Sell-Ready",         credits: 2, api: "photoroom",      tier: "free" as TierKey,    icon: "Sparkles",  description: "White background + studio shadow + pro lighting — all in one", comingSoon: true },
  studio_shadow:  { label: "Studio Shadow",      credits: 2, api: "photoroom_plus", tier: "starter" as TierKey, icon: "Sun",       description: "White background with realistic drop shadow", comingSoon: true },
  ai_background:  { label: "AI Background",      credits: 2, api: "photoroom_plus", tier: "starter" as TierKey, icon: "Image",     description: "Place garment in a styled scene", comingSoon: true },
  put_on_model:   { label: "Put on Model",       credits: 3, api: "fashn",          tier: "starter" as TierKey, icon: "User",      description: "Transform flat-lay into on-model photo", comingSoon: false },
  virtual_tryon:  { label: "Virtual Try-On",     credits: 3, api: "fashn",          tier: "starter" as TierKey, icon: "Camera",    description: "See how it looks on you", comingSoon: false },
  swap_model:     { label: "Swap Model",         credits: 3, api: "fashn",          tier: "starter" as TierKey, icon: "RefreshCw", description: "Change model demographics or pose", comingSoon: false },
} as const;

export type PhotoOperation = keyof typeof PHOTO_OPERATIONS;

export const TIER_ORDER: Record<TierKey, number> = { free: 0, starter: 1, pro: 2, business: 3 };

export function isAtLeastTier(userTier: TierKey, requiredTier: TierKey): boolean {
  return TIER_ORDER[userTier] >= TIER_ORDER[requiredTier];
}
