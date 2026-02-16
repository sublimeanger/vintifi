import { usePageMeta } from "@/hooks/usePageMeta";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import MarketingLayout from "@/components/MarketingLayout";
import {
  Zap, TrendingUp, Search, BarChart3, Package,
  ArrowRight, Sparkles, ArrowDown, Camera, Globe,
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.15 } },
};

const features = [
  {
    icon: Zap,
    badge: "Core Feature",
    title: "Price Intelligence Engine",
    headline: "Know exactly what your item is worth — in seconds",
    desc1: "Paste any Vinted listing URL and get an AI-powered pricing report in seconds. We analyse comparable sold and active listings across the marketplace, factoring in brand desirability, condition, seasonal demand, and market saturation.",
    desc2: "Get a recommended sell price with confidence scoring, price distribution charts, average days-to-sell data, and plain-English AI insights explaining the market dynamics behind every recommendation.",
    stat: "Saves hours",
    statLabel: "of manual price research per week",
    mockTitle: "Price Intelligence Report",
    mockContent: (
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="rounded-lg bg-card p-2.5 sm:p-3 border border-border">
          <p className="text-lg sm:text-xl font-display font-bold text-foreground">£24.50</p>
          <p className="text-[10px] sm:text-xs text-success font-medium">Recommended</p>
        </div>
        <div className="rounded-lg bg-card p-2.5 sm:p-3 border border-border">
          <p className="text-lg sm:text-xl font-display font-bold text-foreground">87%</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground">Confidence</p>
        </div>
        <div className="rounded-lg bg-card p-2.5 sm:p-3 border border-border">
          <p className="text-lg sm:text-xl font-display font-bold text-foreground">4.2d</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground">Avg. Sell Time</p>
        </div>
      </div>
    ),
  },
  {
    icon: Sparkles,
    badge: "AI-Powered",
    title: "AI Listing Optimiser",
    headline: "Listings that sell themselves — written by AI",
    desc1: "Upload your photos and provide minimal details. Our AI analyses images to identify items, detect brand markers, assess condition, and generate complete, SEO-optimised listings engineered for Vinted's search algorithm.",
    desc2: "Every listing gets a Health Score out of 100 measuring title keywords, description quality, photo count, price competitiveness, and category accuracy. Items scoring below 60 get flagged with specific improvements.",
    stat: "Minutes",
    statLabel: "not hours — to create perfect listings",
    mockTitle: "Listing Health Score",
    mockContent: (
      <div className="flex items-center gap-4 sm:gap-6">
        <div className="relative w-16 h-16 sm:w-20 sm:h-20 shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r="42" fill="none" strokeWidth="8" className="stroke-muted" />
            <circle cx="50" cy="50" r="42" fill="none" strokeWidth="8" className="stroke-success" strokeDasharray="264" strokeDashoffset="40" strokeLinecap="round" />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center font-display font-bold text-base sm:text-lg text-foreground">85</span>
        </div>
        <div className="space-y-1.5 text-sm">
          <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-success" /> Title Keywords: Excellent</div>
          <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-success" /> Description: Strong</div>
          <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-accent" /> Photos: Add 1 more</div>
        </div>
      </div>
    ),
  },
  {
    icon: Camera,
    badge: "Photo Studio",
    title: "Vintography",
    headline: "Professional product photos — powered by AI",
    desc1: "Transform your listing photos with AI-powered enhancements. Remove cluttered backgrounds, generate clean flat-lay mockups, and batch-process multiple images in one go.",
    desc2: "Choose from studio backgrounds, lifestyle scenes, or transparent cuts. Every edit is saved to your gallery and can be applied directly to your listings with one click.",
    stat: "Pro photos",
    statLabel: "without a studio — just your phone camera",
    mockTitle: "Photo Studio",
    mockContent: (
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-card p-3 border border-border text-center">
          <div className="w-full h-16 rounded bg-muted/50 flex items-center justify-center mb-2">
            <span className="text-xs text-muted-foreground">Original</span>
          </div>
          <p className="text-[10px] text-muted-foreground">Messy background</p>
        </div>
        <div className="rounded-lg bg-card p-3 border border-success/30 text-center">
          <div className="w-full h-16 rounded bg-success/5 flex items-center justify-center mb-2">
            <span className="text-xs text-success font-medium">Enhanced ✓</span>
          </div>
          <p className="text-[10px] text-success">Clean studio look</p>
        </div>
      </div>
    ),
  },
  {
    icon: TrendingUp,
    badge: "Market Intel",
    title: "Trend Radar",
    headline: "Catch trends before they peak — not after",
    desc1: "Our intelligence engine analyses search volumes, listing activity, and price movements across Vinted categories. The Trend Radar identifies brands, styles, and categories experiencing abnormal demand growth before they hit mainstream awareness.",
    desc2: "Get trend cards showing percentage increases, estimated remaining trend lifespan, sourcing suggestions, and current price trajectories. The Seasonal Demand Calendar shows exactly when to list specific categories for maximum impact.",
    stat: "Early signals",
    statLabel: "spot demand before competitors do",
    mockTitle: "Trending Now",
    mockContent: (
      <div className="space-y-2 sm:space-y-2.5">
        {[
          { name: "Carhartt WIP", change: "+340%", dir: "🔥" },
          { name: "Vintage Levi's 501", change: "+180%", dir: "📈" },
          { name: "Nike ACG", change: "+95%", dir: "📈" },
        ].map((t) => (
          <div key={t.name} className="flex items-center justify-between rounded-lg bg-card p-2 sm:p-2.5 border border-border">
            <span className="text-xs sm:text-sm font-medium text-foreground">{t.dir} {t.name}</span>
            <span className="text-xs font-bold text-success">{t.change}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: Search,
    badge: "Profit Finder",
    title: "Arbitrage Scanner",
    headline: "Buy low elsewhere, sell high on Vinted",
    desc1: "Our cross-platform scanner identifies items listed significantly below their Vinted market value on eBay and other platforms. Every opportunity includes estimated profit after fees, shipping, and time costs.",
    desc2: "The Retail Clearance Radar monitors major outlet sites and cross-references sale prices against Vinted resale values. When margins exceed your threshold, you get sourcing alerts with everything you need to act fast.",
    stat: "Cross-platform",
    statLabel: "profit opportunities found automatically",
    mockTitle: "Opportunity Found",
    mockContent: (
      <div className="rounded-lg bg-card p-3 sm:p-4 border border-border">
        <p className="text-xs sm:text-sm font-medium text-foreground mb-2">Nike Air Max 90 — eBay</p>
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Buy Price</p>
            <p className="text-base sm:text-lg font-display font-bold text-foreground">£15</p>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
          <div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Vinted Value</p>
            <p className="text-base sm:text-lg font-display font-bold text-success">£45–£55</p>
          </div>
          <div className="rounded-full bg-success/10 px-2 sm:px-3 py-1 shrink-0">
            <p className="text-[10px] sm:text-xs font-bold text-success">+£30</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    icon: Globe,
    badge: "Multi-Platform",
    title: "eBay Cross-Listing",
    headline: "Sell on eBay too — with one click",
    desc1: "Connect your eBay account and publish your Vinted listings to eBay directly from Vintifi. Our AI adapts your listing details for eBay's format, including category mapping and pricing adjustments.",
    desc2: "Track your cross-listed items in one unified dashboard. See which platform each item is performing best on and manage everything from a single place.",
    stat: "2x reach",
    statLabel: "by listing on multiple platforms simultaneously",
    mockTitle: "Cross-Platform Status",
    mockContent: (
      <div className="space-y-2">
        {[
          { platform: "Vinted", status: "Live", price: "£24.50", color: "bg-success" },
          { platform: "eBay", status: "Published", price: "£26.99", color: "bg-success" },
        ].map((p) => (
          <div key={p.platform} className="flex items-center justify-between rounded-lg bg-card p-2.5 border border-border">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${p.color}`} />
              <span className="text-sm font-medium text-foreground">{p.platform}</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>{p.status}</span>
              <span className="font-medium text-foreground">{p.price}</span>
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: Package,
    badge: "Operations",
    title: "Smart Inventory Manager",
    headline: "Your entire reselling business — one dashboard",
    desc1: "A centralised command centre for all your active listings with real-time status, engagement metrics, and price vs. market comparisons. Colour-coded traffic lights instantly show which items are on track, need attention, or are at risk of going stale.",
    desc2: "Built-in P&L tracking calculates net profit per item and per period. The Dead Stock engine identifies items that haven't sold and suggests price reductions, bundle pairings, or crosslisting actions to free up capital.",
    stat: "Full control",
    statLabel: "over your inventory, profit, and performance",
    mockTitle: "Inventory Overview",
    mockContent: (
      <div className="space-y-2">
        {[
          { item: "Zara Blazer", status: "bg-success", price: "£18", days: "3d" },
          { item: "H&M Dress", status: "bg-accent", price: "£12", days: "14d" },
          { item: "Nike Hoodie", status: "bg-destructive", price: "£22", days: "31d" },
        ].map((i) => (
          <div key={i.item} className="flex items-center justify-between rounded-lg bg-card p-2 sm:p-2.5 border border-border">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${i.status}`} />
              <span className="text-xs sm:text-sm text-foreground">{i.item}</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>{i.price}</span>
              <span>{i.days}</span>
            </div>
          </div>
        ))}
      </div>
    ),
  },
];

export default function Features() {
  const navigate = useNavigate();

  usePageMeta("Features — Vintifi", "Price intelligence, AI listings, photo studio, trend radar, arbitrage scanning, and eBay cross-listing. Everything you need to sell smarter on Vinted.");

  return (
    <MarketingLayout>
      {/* Hero */}
      <section className="relative overflow-hidden py-20 sm:py-24 md:py-36">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-primary/8 blur-[120px] float-animation" />
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full bg-accent/8 blur-[100px] float-animation-delay" />
        </div>
        <div className="container mx-auto px-4 text-center">
          <motion.div initial="hidden" animate="visible" variants={stagger}>
            <motion.h1 variants={fadeUp} className="font-display text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.08] mb-6">
              Your Unfair Advantage
              <br />
              <span className="text-gradient">on Vinted</span>
            </motion.h1>
            <motion.p variants={fadeUp} className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              Seven powerful modules working together to turn you into a data-driven reselling machine. No guesswork. No wasted time. Just results.
            </motion.p>
            <motion.div variants={fadeUp}>
              <Button
                variant="outline"
                size="lg"
                className="h-12 text-base"
                onClick={() => document.getElementById("feature-1")?.scrollIntoView({ behavior: "smooth" })}
              >
                Explore Features <ArrowDown className="ml-2 w-4 h-4" />
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Feature chapters */}
      {features.map((f, idx) => (
        <section
          key={f.title}
          id={`feature-${idx + 1}`}
          className={`py-16 sm:py-20 md:py-28 ${idx % 2 === 0 ? "bg-background" : "bg-muted/30"}`}
        >
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-3 mb-8 sm:mb-12 max-w-5xl mx-auto">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                <span className="font-display text-sm sm:text-base font-extrabold text-primary">{idx + 1}</span>
              </div>
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground font-medium">{f.title}</span>
            </div>

            <div className={`flex flex-col ${idx % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"} items-center gap-8 sm:gap-12 lg:gap-20 max-w-5xl mx-auto`}>
              <motion.div
                className="flex-1 max-w-xl"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-80px" }}
                variants={stagger}
              >
                <motion.div variants={fadeUp}>
                  <Badge variant="outline" className="mb-4">
                    <f.icon className="w-3.5 h-3.5 mr-1.5" /> {f.badge}
                  </Badge>
                </motion.div>
                <motion.h2 variants={fadeUp} className="font-display text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
                  {f.headline}
                </motion.h2>
                <motion.p variants={fadeUp} className="text-muted-foreground leading-relaxed mb-4 text-sm sm:text-base">
                  {f.desc1}
                </motion.p>
                <motion.p variants={fadeUp} className="text-muted-foreground leading-relaxed mb-6 text-sm sm:text-base">
                  {f.desc2}
                </motion.p>
                <motion.div variants={fadeUp} className="flex items-baseline gap-3 rounded-xl bg-primary/5 border-l-4 border-primary p-4">
                  <span className="font-display text-2xl sm:text-3xl font-extrabold text-primary">{f.stat}</span>
                  <span className="text-xs sm:text-sm text-muted-foreground">{f.statLabel}</span>
                </motion.div>
              </motion.div>

              <motion.div
                className="flex-1 w-full max-w-lg"
                initial={{ opacity: 0, x: idx % 2 === 0 ? 60 : -60 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.7 }}
                whileHover={{ y: -4 }}
              >
                <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xl shadow-primary/5 hover:shadow-2xl hover:shadow-primary/10 transition-shadow duration-500">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2.5 h-2.5 rounded-full bg-destructive/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-accent/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-success/60" />
                    <span className="ml-2 text-xs text-muted-foreground font-mono">{f.mockTitle}</span>
                  </div>
                  <div className="rounded-xl bg-muted/40 p-3 sm:p-5">
                    {f.mockContent}
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>
      ))}

      {/* Bottom CTA */}
      <section className="relative py-20 sm:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10" />
        <div className="container mx-auto px-4 text-center relative z-10">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
          >
            <motion.h2 variants={fadeUp} className="font-display text-2xl sm:text-3xl md:text-5xl font-extrabold mb-4">
              Ready to level up?
            </motion.h2>
            <motion.p variants={fadeUp} className="text-muted-foreground text-base sm:text-lg mb-8 max-w-xl mx-auto">
              Start with 5 free credits. No credit card required. See results in under 90 seconds.
            </motion.p>
            <motion.div variants={fadeUp}>
              <Button size="lg" onClick={() => navigate("/auth?mode=signup")} className="text-base font-semibold px-8 h-12 shadow-lg shadow-primary/25 w-full sm:w-auto">
                Get Started Free <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </MarketingLayout>
  );
}
