import { usePageMeta } from "@/hooks/usePageMeta";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import MarketingLayout from "@/components/MarketingLayout";
import {
  Zap, TrendingUp, Search, BarChart3, Package,
  ArrowRight, Sparkles, ArrowDown, Camera, Link2,
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.15 } },
};

// Photo stats lead — scroll-stopping photography is the hook
const outcomeStats = [
  { value: "6 tools", label: "BG Removal, Shadow, Model, Try-On, AI BG, Swap" },
  { value: "1-tap", label: "Phone snap to studio shot" },
  { value: "16", label: "Background scenes available" },
  { value: "40×", label: "Faster than manual research" },
  { value: "100/100", label: "Max listing Health Score" },
  { value: "£0", label: "Extra fees on top of Vinted" },
];

// Photo Studio leads — it's what buyers see first
const features = [
  {
    icon: Camera,
    badge: "Photo Studio",
    id: "photo-studio",
    title: "Photo Studio",
    headline: "Your phone snap. Studio quality. One tap.",
    desc1: "Buyers scroll through hundreds of listings in minutes. The photo is the first thing they see — and the only thing that makes them click. Photo Studio takes your phone snap and produces the kind of shot you'd expect from a professional product photographer.",
    desc2: "Six tools built for Vinted sellers. Remove Background gives you a clean cutout on white. Studio Shadow adds a professional drop shadow. AI Background places your garment in styled scenes. Put on Model transforms flat-lays into on-model shots. Virtual Try-On lets buyers see it on themselves. Swap Model changes demographics and pose.",
    callout: "You don't need a studio or any experience. You need Vintifi and five seconds. Upload a photo — your bedroom floor becomes a professional product shot.",
    stat: "1 tap",
    statLabel: "from phone snap to studio-quality product shot",
    mockTitle: "Photo Studio",
    mockContent: (
      <div className="space-y-3">
        <div className="flex gap-1.5">
          {["Remove BG", "Put on Model", "AI Background"].map((tab, i) => (
            <div key={tab} className={`flex-1 text-center py-1.5 rounded-md text-[10px] font-medium transition-colors ${i === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{tab}</div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-1.5 text-center">
          {["Editorial", "Natural Photo", "Street Style"].map((style, i) => (
            <div key={style} className={`rounded-lg p-2 border text-[10px] font-medium cursor-pointer transition-colors ${i === 1 ? "border-primary bg-primary/5 text-primary" : "border-border bg-card text-muted-foreground"}`}>
              {style}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-muted/50 border border-border p-2 text-center">
            <div className="w-full h-14 rounded bg-muted flex items-center justify-center mb-1">
              <span className="text-[10px] text-muted-foreground">📱 Phone snap</span>
            </div>
            <p className="text-[10px] text-muted-foreground">Before</p>
          </div>
          <div className="rounded-lg bg-success/5 border border-success/30 p-2 text-center">
            <div className="w-full h-14 rounded bg-gradient-to-br from-success/10 to-primary/10 flex items-center justify-center mb-1">
              <span className="text-[10px] text-success font-medium">✨ Studio quality</span>
            </div>
            <p className="text-[10px] text-success font-medium">After — 1 tap</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    icon: Sparkles,
    badge: "AI-Powered",
    id: "listing-optimiser",
    title: "AI Listing Optimiser",
    headline: "Once buyers click, the listing closes the sale.",
    desc1: "The photo gets the click. The listing closes the sale. Vintifi's AI generates a complete, search-optimised listing for Vinted — keyword-rich title, compelling description, and a hashtag set ready to copy-paste directly into your listing.",
    desc2: "Every listing gets a Health Score out of 100 measuring title keywords, description quality, photo count, price competitiveness, and category accuracy. Items scoring below 60 get flagged with specific, actionable improvements.",
    callout: "Vinted's search algorithm reads your listing title first. An AI-optimised title means more buyers find your item before they ever see a competitor's.",
    stat: "100/100",
    statLabel: "maximum achievable Listing Health Score",
    mockTitle: "Listing Health Score",
    mockContent: (
      <div className="space-y-3">
        <div className="flex items-center gap-4 sm:gap-5">
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 shrink-0">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="42" fill="none" strokeWidth="8" className="stroke-muted" />
              <circle cx="50" cy="50" r="42" fill="none" strokeWidth="8" stroke="hsl(var(--success))" strokeDasharray="264" strokeDashoffset="40" strokeLinecap="round" />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center font-display font-bold text-base sm:text-lg text-foreground">85</span>
          </div>
          <div className="space-y-1.5 text-xs flex-1">
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-success shrink-0" /> Title Keywords: Excellent</div>
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-success shrink-0" /> Description: Strong</div>
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-accent shrink-0" /> Add 2 more hashtags</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {["#nike", "#airmax", "#trainers", "#uk10", "#sneakers"].map(t => (
            <span key={t} className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">{t}</span>
          ))}
        </div>
      </div>
    ),
  },
  {
    icon: Zap,
    badge: "Price Intelligence",
    id: "price-intelligence",
    title: "Price Intelligence Engine",
    headline: "Priced wrong, it sits. Priced right, it sells.",
    desc1: "Paste any Vinted listing URL and get an AI pricing report in seconds — comparable sold items, brand desirability, condition, seasonal demand, and market saturation all factored in. Not a guess. A confidence-scored recommendation with a plain-English explanation of why.",
    desc2: "Get a recommended sell price with confidence scoring, price distribution data, average days-to-sell, and plain-English AI insights explaining the market dynamics behind every recommendation.",
    callout: "Most Vinted sellers underprice by instinct, or overprice and watch the listing sit for weeks. Vintifi tells you the exact number — and why.",
    stat: "40×",
    statLabel: "faster than manual price research across Vinted",
    mockTitle: "Price Intelligence Report",
    mockContent: (
      <div className="space-y-3">
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
        <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground leading-relaxed">
          "Based on 12 comparable sold items, £24.50 optimises for sell speed. Brand premium and condition justify pricing above the £22 market median."
        </div>
      </div>
    ),
  },
  {
    icon: Link2,
    badge: "Import",
    id: "import-vinted",
    title: "Import from Vinted",
    headline: "Add any item in seconds — just paste a URL",
    desc1: "Paste any Vinted listing URL and Vintifi imports the full item details: photos, title, brand, size, condition, and current price. No manual data entry. The item is ready to price-check and optimise immediately.",
    desc2: "Alternatively, upload your own photos and fill in minimal details. Our AI analyses images to auto-detect brand markers and suggest categories. The workflow adapts to however you prefer to work.",
    callout: "No form-filling. No data entry. Paste the URL — your item is ready in seconds.",
    stat: "Seconds",
    statLabel: "to import a full item with all details",
    mockTitle: "Import Listing",
    mockContent: (
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="flex-1 h-9 rounded-lg bg-card border border-border flex items-center px-3">
            <span className="text-muted-foreground text-xs truncate">https://www.vinted.co.uk/items/4832...</span>
          </div>
          <div className="h-9 px-3 sm:px-4 rounded-lg bg-primary text-primary-foreground flex items-center text-xs font-semibold shrink-0">Import</div>
        </div>
        <div className="rounded-lg bg-card border border-border p-3 space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-success" />
            <span className="text-xs text-foreground font-medium">Nike Air Max 90 — UK10 — Excellent</span>
          </div>
          <div className="flex gap-3 text-[10px] text-muted-foreground">
            <span>Brand: Nike</span>
            <span>Size: UK 10</span>
            <span>Listed: £28</span>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex-1 h-8 rounded-md bg-muted/50 border border-dashed border-border flex items-center justify-center text-[10px] text-muted-foreground">
            📷 Or upload photos
          </div>
        </div>
      </div>
    ),
  },
  {
    icon: TrendingUp,
    badge: "Market Intel",
    id: "trend-radar",
    title: "Trend Radar",
    headline: "Catch trends before they peak — not after",
    desc1: "Our intelligence engine analyses search volumes, listing activity, and price movements across Vinted categories. The Trend Radar identifies brands, styles, and categories experiencing abnormal demand growth before they hit mainstream awareness.",
    desc2: "Get trend cards showing percentage increases, estimated remaining trend lifespan, sourcing suggestions, and current price trajectories. The Seasonal Demand Calendar shows exactly when to list specific categories for maximum impact. The Charity Sourcing Briefing tells you exactly what to look for on your next shop run.",
    callout: "By the time you notice a brand trending on social media, the Vinted market has already priced in the demand. Trend Radar gives you a head start.",
    stat: "2–4 weeks",
    statLabel: "ahead of competitors — spot demand before it peaks",
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
        <div className="rounded-lg bg-muted/40 p-2.5 text-xs text-muted-foreground">
          ⏱ Updated daily · Based on real Vinted search volumes
        </div>
      </div>
    ),
  },
  {
    icon: Search,
    badge: "Profit Finder",
    id: "arbitrage",
    title: "Arbitrage Scanner",
    headline: "Buy low elsewhere, sell high on Vinted",
    desc1: "Our cross-platform scanner identifies items listed significantly below their Vinted market value on eBay and other platforms. Every opportunity includes estimated profit after fees, shipping, and time costs. Available on Business plans.",
    desc2: "The Retail Clearance Radar monitors major outlet sites and cross-references sale prices against Vinted resale values. When margins exceed your threshold, you get sourcing alerts with everything you need to act fast.",
    callout: "A single profitable arbitrage find can pay for months of Vintifi. The scanner runs automatically — you just act on the alerts.",
    stat: "Cross-platform",
    statLabel: "profit opportunities found automatically, 24/7",
    mockTitle: "Opportunity Found",
    mockContent: (
      <div className="space-y-2.5">
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
              <p className="text-[10px] sm:text-xs font-bold text-success">+£30 profit</p>
            </div>
          </div>
        </div>
        <div className="text-[10px] text-muted-foreground text-center">Business plan · Runs automatically</div>
      </div>
    ),
  },
  {
    icon: Package,
    badge: "Operations",
    id: "inventory",
    title: "Smart Inventory Manager",
    headline: "Your entire reselling business — one dashboard",
    desc1: "A centralised command centre for all your active listings with real-time status, engagement metrics, and price vs. market comparisons. Colour-coded traffic lights instantly show which items are on track, need attention, or are going stale.",
    desc2: "Built-in P&L tracking calculates net profit per item and per period. The Dead Stock engine identifies items that haven't sold and suggests price reductions, bundle pairings, or crosslisting actions to free up capital.",
    callout: "Know exactly which listings are performing, which are stale, and which need attention. No spreadsheet. No guessing. Full control.",
    stat: "Full control",
    statLabel: "over your inventory, profit, and performance",
    mockTitle: "Inventory Overview",
    mockContent: (
      <div className="space-y-2">
        {[
          { item: "Zara Blazer", status: "bg-success", price: "£18", days: "3d", label: "On track" },
          { item: "H&M Dress", status: "bg-accent", price: "£12", days: "14d", label: "Review price" },
          { item: "Nike Hoodie", status: "bg-destructive", price: "£22", days: "31d", label: "Dead stock" },
        ].map((i) => (
          <div key={i.item} className="flex items-center justify-between rounded-lg bg-card p-2 sm:p-2.5 border border-border">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${i.status}`} />
              <span className="text-xs sm:text-sm text-foreground">{i.item}</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 text-xs text-muted-foreground">
              <span>{i.price}</span>
              <span>{i.days}</span>
              <span className={`text-[10px] font-medium ${i.status.replace("bg-", "text-")}`}>{i.label}</span>
            </div>
          </div>
        ))}
      </div>
    ),
  },
];

export default function Features() {
  const navigate = useNavigate();

  usePageMeta(
    "Features — Vintifi",
    "AI photo studio turns phone snaps into studio shots in one tap. AI pricing in 30 seconds. Listing optimiser, trend radar, and more. Built exclusively for Vinted sellers."
  );

  return (
    <MarketingLayout>
      {/* Hero */}
      <section className="relative overflow-hidden py-12 sm:py-24 md:py-36">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-primary/8 blur-[120px] float-animation" />
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full bg-accent/8 blur-[100px] float-animation-delay" />
        </div>
        <div className="container mx-auto px-4 text-center">
          <motion.div initial="hidden" animate="visible" variants={stagger}>
            <motion.h1 variants={fadeUp} className="font-display text-2xl sm:text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.08] mb-4 sm:mb-6">
              Professional photos. AI pricing.
              <br />
              <span className="text-gradient">Your phone is all you need.</span>
            </motion.h1>
            <motion.p variants={fadeUp} className="text-sm sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-6 sm:mb-8">
              Photo Studio turns your phone snap into a studio shot in one tap. AI pricing and listing optimisation do the rest. Everything in one place, built exclusively for Vinted.
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                size="lg"
                className="h-12 text-sm sm:text-base font-semibold px-8 active:scale-95 transition-transform shadow-xl shadow-primary/20 w-full sm:w-auto"
                onClick={() => navigate("/auth?mode=signup")}
              >
                Start Free — No Card Required <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-12 text-sm sm:text-base active:scale-95 transition-transform w-full sm:w-auto"
                onClick={() => document.getElementById("feature-1")?.scrollIntoView({ behavior: "smooth" })}
              >
                Explore Features <ArrowDown className="ml-2 w-4 h-4" />
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* 6-stat outcome bar */}
      <section className="py-6 sm:py-10 bg-muted/40 border-y border-border">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-4 max-w-5xl mx-auto">
            {outcomeStats.map((s, i) => (
              <motion.div
                key={s.value}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className="text-center p-2.5 sm:p-4"
              >
                <p className="font-display text-lg sm:text-2xl lg:text-3xl font-extrabold text-primary leading-none mb-1">{s.value}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature chapters */}
      {features.map((f, idx) => (
        <section
          key={f.title}
          id={`feature-${idx + 1}`}
          className={`py-10 sm:py-20 md:py-28 ${idx % 2 === 0 ? "bg-background" : "bg-muted/30"}`}
        >
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-2.5 sm:gap-3 mb-5 sm:mb-12 max-w-5xl mx-auto">
              <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                <span className="font-display text-xs sm:text-base font-extrabold text-primary">{idx + 1}</span>
              </div>
              <div className="h-px flex-1 bg-border" />
              <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">{f.title}</span>
            </div>

            <div className={`flex flex-col ${idx % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"} items-center gap-6 sm:gap-12 lg:gap-20 max-w-5xl mx-auto`}>
              <motion.div
                className="flex-1 max-w-xl"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-80px" }}
                variants={stagger}
              >
                <motion.div variants={fadeUp}>
                  <Badge variant="outline" className="mb-3 sm:mb-4 text-[10px] sm:text-xs">
                    <f.icon className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1 sm:mr-1.5" /> {f.badge}
                  </Badge>
                </motion.div>
                <motion.h2 variants={fadeUp} className="font-display text-xl sm:text-3xl md:text-4xl font-extrabold tracking-tight mb-3 sm:mb-4">
                  {f.headline}
                </motion.h2>
                <motion.p variants={fadeUp} className="text-muted-foreground leading-relaxed mb-3 sm:mb-4 text-xs sm:text-base">
                  {f.desc1}
                </motion.p>
                <motion.p variants={fadeUp} className="text-muted-foreground leading-relaxed mb-4 sm:mb-5 text-xs sm:text-base">
                  {f.desc2}
                </motion.p>
                {/* "What this means for you" callout */}
                <motion.div variants={fadeUp} className="rounded-xl bg-primary/5 border-l-4 border-primary p-3 sm:p-4 mb-4 sm:mb-5">
                  <p className="text-[10px] sm:text-xs font-semibold text-primary uppercase tracking-wider mb-1">What this means for you</p>
                  <p className="text-xs sm:text-sm text-foreground leading-relaxed">{f.callout}</p>
                </motion.div>
                <motion.div variants={fadeUp} className="flex items-baseline gap-2.5 sm:gap-3 rounded-xl bg-muted/60 border border-border px-3 sm:px-4 py-2.5 sm:py-3">
                  <span className="font-display text-xl sm:text-3xl font-extrabold text-primary">{f.stat}</span>
                  <span className="text-[10px] sm:text-sm text-muted-foreground">{f.statLabel}</span>
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
      <section className="relative py-12 sm:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10" />
        <div className="container mx-auto px-4 text-center relative z-10">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
          >
            <motion.h2 variants={fadeUp} className="font-display text-xl sm:text-3xl md:text-5xl font-extrabold mb-3 sm:mb-4">
              Start with the photo. Everything else follows.
            </motion.h2>
            <motion.p variants={fadeUp} className="text-muted-foreground text-sm sm:text-lg mb-2 max-w-xl mx-auto">
              3 free credits — try Photo Studio, price an item, optimise a listing. No card.
            </motion.p>
            <motion.p variants={fadeUp} className="text-muted-foreground/70 text-xs sm:text-sm mb-6 sm:mb-8 max-w-md mx-auto">
              A complete first sell, on us. See your results in 90 seconds.
            </motion.p>
            <motion.div variants={fadeUp}>
              <Button size="lg" onClick={() => navigate("/auth?mode=signup")} className="text-sm sm:text-base font-semibold px-8 h-12 shadow-xl shadow-primary/20 w-full sm:w-auto active:scale-95 transition-transform">
                Get Started Free <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </MarketingLayout>
  );
}
