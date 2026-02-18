import { usePageMeta } from "@/hooks/usePageMeta";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import MarketingLayout from "@/components/MarketingLayout";
import {
  ArrowRight, Link2, Brain, Sparkles, Camera,
  TrendingDown, TrendingUp, Clock, Heart, Eye, Package,
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};
const stagger = { visible: { transition: { staggerChildren: 0.15 } } };

const steps = [
  {
    num: "01",
    icon: Link2,
    title: "Add your item",
    desc: "Paste a Vinted URL to import automatically — brand, size, condition, and photos pulled in seconds. Or add manually by uploading your own photos.",
    mock: (
      <div className="rounded-xl bg-card border border-border p-4 sm:p-5">
        <p className="text-xs text-muted-foreground mb-2 font-medium">Import from Vinted URL</p>
        <div className="flex gap-2 mb-3">
          <div className="flex-1 h-10 rounded-lg bg-muted border border-border flex items-center px-3">
            <span className="text-muted-foreground text-sm truncate">https://www.vinted.co.uk/items/4832...</span>
          </div>
          <div className="h-10 px-4 sm:px-5 rounded-lg bg-primary text-primary-foreground flex items-center text-sm font-semibold shrink-0">
            Import
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-px flex-1 bg-border" />
          <span className="text-[10px] text-muted-foreground">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>
        <div className="mt-3 rounded-lg border border-dashed border-border p-3 text-center">
          <p className="text-xs text-muted-foreground">📷 Upload your own photos</p>
        </div>
      </div>
    ),
  },
  {
    num: "02",
    icon: Brain,
    title: "AI prices it perfectly",
    desc: "Our engine analyses hundreds of comparable sold and active listings, factoring in brand, condition, season, and competition. Confidence-scored recommendation in seconds.",
    mock: (
      <div className="rounded-xl bg-card border border-border p-4 sm:p-5 space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="w-2 h-2 rounded-full bg-success animate-pulse" /> Analysing market data...
        </div>
        {["Scraping comparable listings", "Analysing price distributions", "Generating AI insights"].map((t) => (
          <div key={t} className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-full bg-success/10 flex items-center justify-center shrink-0">
              <div className="w-2 h-2 rounded-full bg-success" />
            </div>
            <span className="text-sm text-foreground">{t}</span>
          </div>
        ))}
        <div className="grid grid-cols-3 gap-2 mt-2">
          <div className="rounded-lg bg-muted/50 p-2.5 text-center">
            <p className="text-base font-display font-bold text-foreground">£24.50</p>
            <p className="text-[10px] text-success font-medium">Best Price</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-2.5 text-center">
            <p className="text-base font-display font-bold text-foreground">87%</p>
            <p className="text-[10px] text-muted-foreground">Confidence</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-2.5 text-center">
            <p className="text-base font-display font-bold text-foreground">4.2d</p>
            <p className="text-[10px] text-muted-foreground">Avg. sell</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    num: "03",
    icon: Sparkles,
    title: "Optimise the listing",
    desc: "AI-generated title, description, and hashtags — written to rank in Vinted search. A Listing Health Score of 100 tells you exactly what to improve.",
    mock: (
      <div className="rounded-xl bg-card border border-border p-4 sm:p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="relative w-14 h-14 shrink-0">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="42" fill="none" strokeWidth="9" className="stroke-muted" />
              <circle cx="50" cy="50" r="42" fill="none" strokeWidth="9" stroke="hsl(var(--success))" strokeDasharray="264" strokeDashoffset="40" strokeLinecap="round" />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center font-display font-bold text-sm text-foreground">85</span>
          </div>
          <div className="space-y-1 text-xs flex-1">
            <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-success shrink-0" /> Title Keywords: Excellent</div>
            <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-success shrink-0" /> Description: Strong</div>
            <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" /> Add 2 more hashtags</div>
          </div>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {["#nike", "#airmax", "#trainers", "#uk10", "#sneakers"].map(t => (
            <span key={t} className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">{t}</span>
          ))}
        </div>
      </div>
    ),
  },
  {
    num: "04",
    icon: Camera,
    title: "Create studio-quality photos",
    desc: "Vintography transforms your phone photos into professional product shots. Choose AI Model (male/female), Mannequin Ghost, or Flat-Lay Pro — no studio, no equipment.",
    mock: (
      <div className="rounded-xl bg-card border border-border p-4 sm:p-5 space-y-3">
        <div className="flex gap-1.5">
          {["AI Model", "Flat-Lay", "Mannequin"].map((tab, i) => (
            <div key={tab} className={`flex-1 text-center py-1.5 rounded-md text-[10px] font-medium ${i === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{tab}</div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-muted/50 border border-border p-2 text-center">
            <div className="w-full h-16 rounded bg-muted flex items-center justify-center mb-1.5">
              <span className="text-[10px] text-muted-foreground">Original</span>
            </div>
            <p className="text-[10px] text-muted-foreground">Phone snap</p>
          </div>
          <div className="rounded-lg bg-success/5 border border-success/30 p-2 text-center">
            <div className="w-full h-16 rounded bg-gradient-to-br from-success/10 to-primary/10 flex items-center justify-center mb-1.5">
              <span className="text-[10px] text-success font-medium">✨ Enhanced</span>
            </div>
            <p className="text-[10px] text-success font-medium">Studio quality</p>
          </div>
        </div>
      </div>
    ),
  },
];

const beforeAfter = {
  before: [
    { icon: Clock, label: "Time pricing", value: "45 min/item" },
    { icon: TrendingDown, label: "Pricing accuracy", value: "Guesswork" },
    { icon: Eye, label: "Market visibility", value: "None" },
    { icon: Heart, label: "Listing quality", value: "Hit or miss" },
    { icon: Package, label: "Photos", value: "Phone snap" },
  ],
  after: [
    { icon: Clock, label: "Time pricing", value: "Seconds" },
    { icon: TrendingUp, label: "Pricing accuracy", value: "Data-backed" },
    { icon: Eye, label: "Market visibility", value: "Full data" },
    { icon: Heart, label: "Listing quality", value: "AI-optimised" },
    { icon: Package, label: "Photos", value: "Studio-quality" },
  ],
};

export default function HowItWorks() {
  const navigate = useNavigate();

  usePageMeta("How It Works — Vintifi", "Add item, AI prices it, optimise the listing, create studio photos. Four steps to a perfectly optimised Vinted listing.");

  return (
    <MarketingLayout>
      {/* Hero */}
      <section className="py-12 sm:py-24 md:py-36 relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 right-1/4 w-[500px] h-[500px] rounded-full bg-primary/6 blur-[120px] float-animation" />
          <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] rounded-full bg-accent/6 blur-[100px] float-animation-delay" />
        </div>
        <div className="container mx-auto px-4 text-center">
          <motion.div initial="hidden" animate="visible" variants={stagger}>
            <motion.h1 variants={fadeUp} className="font-display text-2xl sm:text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.08] mb-4 sm:mb-6">
              From item to sale
              <br />
              <span className="text-gradient">in 4 steps</span>
            </motion.h1>
            <motion.p variants={fadeUp} className="text-sm sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Add it. Price it. Optimise it. Photograph it. Vintifi handles all four — in minutes.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Steps */}
      <section className="pb-10 sm:pb-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="relative">
            <div className="absolute left-8 md:left-10 top-0 bottom-0 w-px bg-border hidden md:block">
              {[1, 2, 3, 4].map((_, i) => (
                <div
                  key={i}
                  className="absolute -left-[3px] w-[7px] h-[7px] rounded-full bg-primary animate-pulse"
                  style={{ top: `${(i + 0.5) * 25}%`, animationDelay: `${i * 0.35}s` }}
                />
              ))}
            </div>

            <div className="space-y-8 sm:space-y-16">
              {steps.map((step, i) => (
                <motion.div
                  key={step.num}
                  className="flex flex-col md:flex-row gap-4 sm:gap-8 relative"
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ delay: i * 0.12, duration: 0.6 }}
                >
                  <div className="shrink-0 relative z-10">
                    <div className="w-12 h-12 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center">
                      <span className="font-display text-xl md:text-3xl font-extrabold text-primary">{step.num}</span>
                    </div>
                  </div>
                  <div className="flex-1 space-y-2.5 sm:space-y-4">
                    <div className="flex items-center gap-2">
                      <step.icon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                      <h2 className="font-display text-lg sm:text-2xl md:text-3xl font-extrabold">{step.title}</h2>
                    </div>
                    <p className="text-muted-foreground leading-relaxed max-w-lg text-xs sm:text-base">{step.desc}</p>
                    <div className="max-w-md">{step.mock}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Before / After */}
      <section className="py-10 sm:py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.h2
            className="font-display text-xl sm:text-3xl md:text-4xl font-extrabold text-center mb-6 sm:mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            The Vintifi Difference
          </motion.h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6 max-w-4xl mx-auto relative">
            <div className="hidden md:flex absolute left-1/2 top-0 bottom-0 -translate-x-1/2 items-center z-10">
              <div className="w-10 h-10 rounded-full bg-card border-2 border-primary shadow-lg flex items-center justify-center">
                <ArrowRight className="w-4 h-4 text-primary" />
              </div>
            </div>
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <Card className="p-3.5 sm:p-6 border-destructive/30 bg-destructive/5">
                <h3 className="font-display font-bold text-sm sm:text-lg mb-3 sm:mb-5 text-destructive">Without Vintifi</h3>
                <div className="space-y-2.5 sm:space-y-4">
                  {beforeAfter.before.map((item) => (
                    <div key={item.label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <item.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-destructive/70" />
                        <span className="text-xs sm:text-sm text-muted-foreground">{item.label}</span>
                      </div>
                      <span className="text-xs sm:text-sm font-medium text-foreground">{item.value}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>

            <div className="flex sm:hidden items-center justify-center -my-0.5">
              <div className="w-7 h-7 rounded-full bg-card border-2 border-primary shadow-lg flex items-center justify-center">
                <ArrowRight className="w-3 h-3 text-primary rotate-90" />
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <Card className="p-3.5 sm:p-6 border-success/30 bg-success/5">
                <h3 className="font-display font-bold text-sm sm:text-lg mb-3 sm:mb-5 text-success">With Vintifi</h3>
                <div className="space-y-2.5 sm:space-y-4">
                  {beforeAfter.after.map((item) => (
                    <div key={item.label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <item.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-success/70" />
                        <span className="text-xs sm:text-sm text-muted-foreground">{item.label}</span>
                      </div>
                      <span className="text-xs sm:text-sm font-medium text-foreground">{item.value}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-12 sm:py-24">
        <div className="container mx-auto px-4 text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.h2 variants={fadeUp} className="font-display text-xl sm:text-3xl md:text-5xl font-extrabold mb-3 sm:mb-4">
              Ready to try it yourself?
            </motion.h2>
            <motion.p variants={fadeUp} className="text-muted-foreground text-sm sm:text-lg mb-6 sm:mb-8 max-w-xl mx-auto">
              Your first 5 credits are free. See results in under 90 seconds.
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
