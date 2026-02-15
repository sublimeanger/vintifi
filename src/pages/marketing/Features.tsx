import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import MarketingLayout from "@/components/MarketingLayout";
import {
  Zap, TrendingUp, Search, BarChart3, Package,
  ArrowRight, Sparkles, Target, Globe, LineChart,
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
    desc1: "Paste any Vinted listing URL and get an AI-powered pricing report in under 8 seconds. We analyse comparable sold and active listings across the marketplace, factoring in brand desirability, condition, seasonal demand, and market saturation.",
    desc2: "Get a recommended sell price with confidence scoring, price distribution charts, average days-to-sell data, and plain-English AI insights explaining the market dynamics behind every recommendation.",
    stat: "32%",
    statLabel: "average revenue increase for sellers using Price Check",
    mockTitle: "Price Intelligence Report",
    mockContent: (
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-card p-3 border border-border">
          <p className="text-xl font-display font-bold text-foreground">£24.50</p>
          <p className="text-xs text-success font-medium">Recommended</p>
        </div>
        <div className="rounded-lg bg-card p-3 border border-border">
          <p className="text-xl font-display font-bold text-foreground">87%</p>
          <p className="text-xs text-muted-foreground">Confidence</p>
        </div>
        <div className="rounded-lg bg-card p-3 border border-border">
          <p className="text-xl font-display font-bold text-foreground">4.2d</p>
          <p className="text-xs text-muted-foreground">Avg. Sell Time</p>
        </div>
      </div>
    ),
  },
  {
    icon: Sparkles,
    badge: "AI-Powered",
    title: "AI Listing Optimiser",
    headline: "Listings that sell themselves — written by AI",
    desc1: "Upload your photos and provide minimal details. Our AI analyses images via GPT-4o vision to identify items, detect brand markers, assess condition, and generate complete, SEO-optimised listings engineered for Vinted's search algorithm.",
    desc2: "Every listing gets a Health Score out of 100 measuring title keywords, description quality, photo count, price competitiveness, and category accuracy. Items scoring below 60 get flagged with specific improvements.",
    stat: "3x",
    statLabel: "faster listing creation with AI optimisation",
    mockTitle: "Listing Health Score",
    mockContent: (
      <div className="flex items-center gap-6">
        <div className="relative w-20 h-20">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r="42" fill="none" strokeWidth="8" className="stroke-muted" />
            <circle cx="50" cy="50" r="42" fill="none" strokeWidth="8" className="stroke-success" strokeDasharray="264" strokeDashoffset="40" strokeLinecap="round" />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center font-display font-bold text-lg text-foreground">85</span>
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
    icon: TrendingUp,
    badge: "Market Intel",
    title: "Trend Radar",
    headline: "Catch trends before they peak — not after",
    desc1: "Our intelligence engine analyses search volumes, listing activity, and price movements across Vinted categories daily. The Trend Radar identifies brands, styles, and categories experiencing abnormal demand growth before they hit mainstream awareness.",
    desc2: "Get trend cards showing percentage increases, estimated remaining trend lifespan, sourcing suggestions, and current price trajectories. The Seasonal Demand Calendar shows exactly when to list specific categories for maximum impact.",
    stat: "5 days",
    statLabel: "earlier trend detection than manual research",
    mockTitle: "Trending Now",
    mockContent: (
      <div className="space-y-2.5">
        {[
          { name: "Carhartt WIP", change: "+340%", dir: "🔥" },
          { name: "Vintage Levi's 501", change: "+180%", dir: "📈" },
          { name: "Nike ACG", change: "+95%", dir: "📈" },
        ].map((t) => (
          <div key={t.name} className="flex items-center justify-between rounded-lg bg-card p-2.5 border border-border">
            <span className="text-sm font-medium text-foreground">{t.dir} {t.name}</span>
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
    desc1: "Our cross-platform scanner identifies items listed significantly below their Vinted market value on eBay, Depop, Facebook Marketplace, and retail clearance pages. Every opportunity includes estimated profit after fees, shipping, and time costs.",
    desc2: "The Retail Clearance Radar monitors major outlet sites and cross-references sale prices against Vinted resale values. When margins exceed your threshold, you get instant sourcing alerts with everything you need to act fast.",
    stat: "£340",
    statLabel: "average monthly arbitrage profit per active user",
    mockTitle: "Opportunity Found",
    mockContent: (
      <div className="rounded-lg bg-card p-4 border border-border">
        <p className="text-sm font-medium text-foreground mb-2">Nike Air Max 90 — eBay</p>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Buy Price</p>
            <p className="text-lg font-display font-bold text-foreground">£15</p>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Vinted Value</p>
            <p className="text-lg font-display font-bold text-success">£45–£55</p>
          </div>
          <div className="rounded-full bg-success/10 px-3 py-1">
            <p className="text-xs font-bold text-success">+£30</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    icon: Package,
    badge: "Operations",
    title: "Smart Inventory Manager",
    headline: "Your entire reselling business — one dashboard",
    desc1: "A centralised command centre for all your active listings with real-time status, engagement metrics, and price vs. market comparisons. Colour-coded traffic lights instantly show which items are on track, need attention, or are at risk of going stale.",
    desc2: "Built-in P&L tracking calculates net profit per item and per period. The Dead Stock Liquidation Engine identifies items that haven't sold and suggests price reductions, bundle pairings, or crosslisting actions to free up capital.",
    stat: "4.5 hrs",
    statLabel: "saved per week on inventory management",
    mockTitle: "Inventory Overview",
    mockContent: (
      <div className="space-y-2">
        {[
          { item: "Zara Blazer", status: "bg-success", price: "£18", days: "3d" },
          { item: "H&M Dress", status: "bg-accent", price: "£12", days: "14d" },
          { item: "Nike Hoodie", status: "bg-destructive", price: "£22", days: "31d" },
        ].map((i) => (
          <div key={i.item} className="flex items-center justify-between rounded-lg bg-card p-2.5 border border-border">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${i.status}`} />
              <span className="text-sm text-foreground">{i.item}</span>
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

  useEffect(() => {
    document.title = "Vintifi Features — AI-Powered Vinted Selling Intelligence";
  }, []);

  return (
    <MarketingLayout>
      {/* Hero */}
      <section className="relative overflow-hidden py-24 md:py-36">
        {/* Gradient mesh background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-primary/8 blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full bg-accent/8 blur-[100px]" />
        </div>
        <div className="container mx-auto px-4 text-center">
          <motion.div initial="hidden" animate="visible" variants={stagger}>
            <motion.h1 variants={fadeUp} className="font-display text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.08] mb-6">
              Your Unfair Advantage
              <br />
              <span className="text-gradient">on Vinted</span>
            </motion.h1>
            <motion.p variants={fadeUp} className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Five powerful modules working together to turn you into a data-driven reselling machine. No guesswork. No wasted time. Just results.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Feature chapters */}
      {features.map((f, idx) => (
        <section
          key={f.title}
          className={`py-20 md:py-28 ${idx % 2 === 0 ? "bg-background" : "bg-muted/30"}`}
        >
          <div className="container mx-auto px-4">
            <div className={`flex flex-col ${idx % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"} items-center gap-12 lg:gap-20`}>
              {/* Text */}
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
                <motion.h2 variants={fadeUp} className="font-display text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
                  {f.headline}
                </motion.h2>
                <motion.p variants={fadeUp} className="text-muted-foreground leading-relaxed mb-4">
                  {f.desc1}
                </motion.p>
                <motion.p variants={fadeUp} className="text-muted-foreground leading-relaxed mb-6">
                  {f.desc2}
                </motion.p>
                <motion.div variants={fadeUp} className="flex items-baseline gap-3 rounded-xl bg-primary/5 border border-primary/10 p-4">
                  <span className="font-display text-3xl font-extrabold text-primary">{f.stat}</span>
                  <span className="text-sm text-muted-foreground">{f.statLabel}</span>
                </motion.div>
              </motion.div>

              {/* Mock UI */}
              <motion.div
                className="flex-1 w-full max-w-lg"
                initial={{ opacity: 0, x: idx % 2 === 0 ? 60 : -60 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.7 }}
              >
                <div className="rounded-2xl border border-border bg-card p-5 shadow-xl shadow-primary/5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2.5 h-2.5 rounded-full bg-destructive/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-accent/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-success/60" />
                    <span className="ml-2 text-xs text-muted-foreground font-mono">{f.mockTitle}</span>
                  </div>
                  <div className="rounded-xl bg-muted/40 p-5">
                    {f.mockContent}
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>
      ))}

      {/* Bottom CTA */}
      <section className="py-24 bg-gradient-to-br from-primary/10 via-background to-accent/10">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
          >
            <motion.h2 variants={fadeUp} className="font-display text-3xl md:text-5xl font-extrabold mb-4">
              Ready to level up?
            </motion.h2>
            <motion.p variants={fadeUp} className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
              Start with 5 free price checks. No credit card required. See results in under 90 seconds.
            </motion.p>
            <motion.div variants={fadeUp}>
              <Button size="lg" onClick={() => navigate("/auth?mode=signup")} className="text-base font-semibold px-8 h-12">
                Get Started Free <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </MarketingLayout>
  );
}
