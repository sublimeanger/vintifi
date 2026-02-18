import { useState, useEffect } from "react";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, ArrowRight, Zap, TrendingUp, Sparkles, Camera, ChevronLeft, ChevronRight } from "lucide-react";
import { STRIPE_TIERS } from "@/lib/constants";
import MarketingLayout from "@/components/MarketingLayout";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
};

// Rotating hero feature showcase
const heroFeatures = [
  {
    id: "price",
    label: "Price Intelligence",
    icon: Zap,
    color: "text-primary",
    bg: "bg-primary/10",
    content: (
      <div className="space-y-3">
        <div className="flex gap-2 items-center mb-2">
          <div className="flex-1 h-9 rounded-lg bg-muted border border-border flex items-center px-3">
            <span className="text-muted-foreground text-xs truncate">https://www.vinted.co.uk/items/4832...</span>
          </div>
          <div className="h-9 px-4 rounded-lg bg-primary text-primary-foreground flex items-center text-xs font-semibold shrink-0">Analyse</div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-card p-3 border border-border text-center">
            <p className="text-xl font-display font-bold text-foreground">£24.50</p>
            <p className="text-[10px] text-success font-medium mt-0.5">Recommended</p>
          </div>
          <div className="rounded-lg bg-card p-3 border border-border text-center">
            <p className="text-xl font-display font-bold text-foreground">87%</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Confidence</p>
          </div>
          <div className="rounded-lg bg-card p-3 border border-border text-center">
            <p className="text-xl font-display font-bold text-foreground">4.2d</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Avg. sell time</p>
          </div>
        </div>
        <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground leading-relaxed">
          "Based on 12 comparables, £24.50 optimises sell speed. Brand premium justified."
        </div>
      </div>
    ),
  },
  {
    id: "optimise",
    label: "AI Listing Optimiser",
    icon: Sparkles,
    color: "text-accent",
    bg: "bg-accent/10",
    content: (
      <div className="space-y-3">
        <div className="flex items-center gap-3 mb-1">
          <div className="relative w-14 h-14 shrink-0">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="42" fill="none" strokeWidth="9" className="stroke-muted" />
              <circle cx="50" cy="50" r="42" fill="none" strokeWidth="9" stroke="hsl(var(--success))" strokeDasharray="264" strokeDashoffset="40" strokeLinecap="round" />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center font-display font-bold text-sm text-foreground">85</span>
          </div>
          <div className="space-y-1 text-xs flex-1">
            <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-success shrink-0" /><span>Title Keywords: Excellent</span></div>
            <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-success shrink-0" /><span>Description: Strong</span></div>
            <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" /><span>Add 2 more hashtags</span></div>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider font-medium">AI-Generated Title</p>
          <p className="text-xs font-medium text-foreground">"Nike Air Max 90 Triple White OG — UK 10 — Excellent Condition"</p>
        </div>
        <div className="flex gap-1.5">
          {["#nike", "#airmax", "#trainers", "#uk10"].map(t => (
            <span key={t} className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">{t}</span>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: "photo",
    label: "Vintography Photo Studio",
    icon: Camera,
    color: "text-success",
    bg: "bg-success/10",
    content: (
      <div className="space-y-3">
        <div className="flex gap-1.5 mb-2">
          {["AI Model", "Flat-Lay", "Mannequin"].map((tab, i) => (
            <div key={tab} className={`flex-1 text-center py-1.5 rounded-md text-[10px] font-medium transition-colors ${i === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{tab}</div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-muted/50 border border-border p-2 text-center">
            <div className="w-full h-20 rounded bg-muted flex items-center justify-center mb-1.5">
              <span className="text-[10px] text-muted-foreground">Your photo</span>
            </div>
            <p className="text-[10px] text-muted-foreground">Original</p>
          </div>
          <div className="rounded-lg bg-success/5 border border-success/30 p-2 text-center">
            <div className="w-full h-20 rounded bg-gradient-to-br from-success/10 to-primary/10 flex items-center justify-center mb-1.5">
              <span className="text-[10px] text-success font-medium">✓ AI Enhanced</span>
            </div>
            <p className="text-[10px] text-success font-medium">Studio quality</p>
          </div>
        </div>
        <div className="text-[10px] text-muted-foreground text-center">AI Model · Natural Photo style · Custom background</div>
      </div>
    ),
  },
];

const pillars = [
  {
    icon: Zap,
    title: "Price Intelligence",
    desc: "AI-powered pricing backed by real market data. Know exactly what your item is worth — in seconds.",
    badge: "Core",
    badgeColor: "bg-primary/10 text-primary border-primary/20",
  },
  {
    icon: Sparkles,
    title: "AI Listing Optimiser",
    desc: "Generate SEO-optimised titles, descriptions, and hashtags. Get a Health Score out of 100 for every listing.",
    badge: "AI",
    badgeColor: "bg-accent/10 text-accent border-accent/20",
  },
  {
    icon: Camera,
    title: "Vintography Photo Studio",
    desc: "AI Model shots, Mannequin Ghost shots, and Flat-Lay Pro. Professional product photography without a studio.",
    badge: "New",
    badgeColor: "bg-success/10 text-success border-success/20",
  },
  {
    icon: TrendingUp,
    title: "Trend Radar",
    desc: "Spot rising brands before they peak. Seasonal calendar, Niche Finder, and sourcing briefings included.",
    badge: "Intel",
    badgeColor: "bg-primary/10 text-primary border-primary/20",
  },
];

const howSteps = [
  { num: "01", label: "Add your item", desc: "Paste a Vinted URL to import, or add photos manually." },
  { num: "02", label: "AI prices it", desc: "Market data from real comparables, confidence-scored." },
  { num: "03", label: "Optimise & shoot", desc: "AI listing + studio-quality photos ready to post." },
];

export default function Landing() {
  const navigate = useNavigate();
  const [activeFeature, setActiveFeature] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);

  usePageMeta(
    "Vintifi — AI-Powered Vinted Selling Intelligence",
    "The smartest way to sell on Vinted. AI pricing, stunning photos, and market intelligence — all in one place. Start free in 30 seconds."
  );

  useEffect(() => {
    if (!autoPlay) return;
    const t = setInterval(() => setActiveFeature((p) => (p + 1) % heroFeatures.length), 4000);
    return () => clearInterval(t);
  }, [autoPlay]);

  const setFeature = (i: number) => {
    setActiveFeature(i);
    setAutoPlay(false);
  };

  return (
    <MarketingLayout>
      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-[-10%] left-[10%] w-[500px] h-[500px] rounded-full bg-primary/8 blur-[120px] float-animation" />
          <div className="absolute bottom-[-10%] right-[10%] w-[400px] h-[400px] rounded-full bg-accent/8 blur-[100px] float-animation-delay" />
          <div className="absolute top-[30%] right-[30%] w-[300px] h-[300px] rounded-full bg-success/5 blur-[80px] float-animation" />
        </div>

        <div className="container mx-auto px-4 pt-10 sm:pt-20 pb-8 sm:pb-12">
          <motion.div
            className="max-w-3xl mx-auto text-center"
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.12 } } }}
          >
            <motion.div variants={fadeUp} custom={0} className="mb-4 sm:mb-5">
              <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5 text-xs font-medium px-3 py-1">
                <Sparkles className="w-3 h-3 mr-1.5" /> AI Model & Mannequin shots — now live
              </Badge>
            </motion.div>
            <motion.h1
              variants={fadeUp}
              custom={1}
              className="font-display text-3xl sm:text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.05] mb-4 sm:mb-6"
            >
              The smartest way
              <br />
              <span className="text-gradient">to sell on Vinted.</span>
            </motion.h1>
            <motion.p variants={fadeUp} custom={2} className="text-sm sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-6 sm:mb-8 px-2">
              AI pricing, stunning photos, and market intelligence — all in one place. Start free in 30 seconds.
            </motion.p>
            <motion.div variants={fadeUp} custom={3} className="flex flex-col sm:flex-row gap-2.5 sm:gap-4 justify-center px-2 sm:px-0 mb-6 sm:mb-8">
              <Button
                size="lg"
                onClick={() => navigate("/auth?mode=signup")}
                className="text-sm sm:text-base font-semibold px-8 h-12 w-full sm:w-auto shadow-xl shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all active:scale-95"
              >
                Start Free — No Card Required
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/how-it-works")} className="text-sm sm:text-base h-12 w-full sm:w-auto active:scale-95 transition-transform">
                See How It Works
              </Button>
            </motion.div>
            {/* Social proof */}
            <motion.div variants={fadeUp} custom={4} className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <span>🇬🇧</span><span>🇫🇷</span><span>🇩🇪</span><span>🇳🇱</span><span>🇪🇸</span><span>🇮🇹</span>
              <span className="ml-1">Across 18 Vinted markets</span>
            </motion.div>
          </motion.div>

          {/* Rotating feature showcase */}
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="mt-10 sm:mt-16 max-w-2xl mx-auto"
          >
            {/* Tab strip */}
            <div className="flex gap-2 mb-4 justify-center flex-wrap">
              {heroFeatures.map((f, i) => {
                const Icon = f.icon;
                return (
                  <button
                    key={f.id}
                    onClick={() => setFeature(i)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                      activeFeature === i
                        ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20"
                        : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    {f.label}
                  </button>
                );
              })}
            </div>

            {/* Feature card */}
            <div className="gradient-border p-[1.5px] rounded-2xl">
              <div className="rounded-2xl bg-card p-4 sm:p-6 shadow-2xl shadow-primary/5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2.5 h-2.5 rounded-full bg-destructive/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-accent/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-success/60" />
                  <span className="ml-2 text-xs text-muted-foreground font-mono hidden sm:inline">
                    vintifi.com — {heroFeatures[activeFeature].label}
                  </span>
                  <div className="ml-auto flex gap-1">
                    <button onClick={() => setFeature((activeFeature - 1 + heroFeatures.length) % heroFeatures.length)} className="p-1 rounded hover:bg-muted transition-colors">
                      <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                    <button onClick={() => setFeature((activeFeature + 1) % heroFeatures.length)} className="p-1 rounded hover:bg-muted transition-colors">
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  </div>
                </div>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeFeature}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25 }}
                  >
                    {heroFeatures[activeFeature].content}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── 4 Pillars ── */}
      <section className="py-12 sm:py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8 sm:mb-14">
            <h2 className="font-display text-xl sm:text-3xl md:text-5xl font-bold mb-3 sm:mb-4 leading-tight">
              Four AI pillars. One platform.
            </h2>
            <p className="text-muted-foreground text-sm sm:text-lg max-w-2xl mx-auto">
              Everything a serious Vinted seller needs — from pricing intelligence to studio-quality photos.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5 max-w-4xl mx-auto">
            {pillars.map((p, i) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                whileHover={{ y: -5, scale: 1.01 }}
              >
                <Card className="p-4 sm:p-7 h-full hover:shadow-xl hover:shadow-primary/8 transition-all duration-300 border-border/50 group">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                      <p.icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 sm:mb-2 flex-wrap">
                        <h3 className="font-display font-bold text-sm sm:text-lg">{p.title}</h3>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${p.badgeColor}`}>{p.badge}</span>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
          <div className="text-center mt-6 sm:mt-10">
            <Button variant="outline" onClick={() => navigate("/features")} className="h-11 font-medium active:scale-95 transition-transform">
              Explore all features <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* ── How it works strip ── */}
      <section className="py-12 sm:py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="font-display text-xl sm:text-3xl md:text-4xl font-bold mb-2 sm:mb-3">How it works</h2>
            <p className="text-muted-foreground text-sm sm:text-base">From item to optimised listing in minutes.</p>
          </div>
          <div className="relative max-w-3xl mx-auto">
            <div className="hidden sm:block absolute top-8 left-[16.5%] right-[16.5%] h-px bg-border" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-4">
              {howSteps.map((step, i) => (
                <motion.div
                  key={step.num}
                  className="text-center relative"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center mx-auto mb-3 sm:mb-4 relative z-10 bg-background">
                    <span className="font-display text-2xl font-extrabold text-primary">{step.num}</span>
                  </div>
                  <h3 className="font-display font-bold text-sm sm:text-base mb-1">{step.label}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">{step.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
          <div className="text-center mt-8">
            <Button variant="ghost" size="sm" onClick={() => navigate("/how-it-works")} className="text-muted-foreground hover:text-foreground text-xs">
              Full walkthrough <ArrowRight className="ml-1 w-3 h-3" />
            </Button>
          </div>
        </div>
      </section>

      {/* ── Photo Studio showcase ── */}
      <section className="py-12 sm:py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-col lg:flex-row gap-8 sm:gap-12 lg:gap-16 items-center">
              <div className="flex-1 text-center lg:text-left">
                <Badge variant="outline" className="mb-3 sm:mb-4 border-success/30 text-success bg-success/5 text-xs">
                  <Camera className="w-3 h-3 mr-1.5" /> New: AI Photo Studio
                </Badge>
                <h2 className="font-display text-xl sm:text-3xl md:text-5xl font-extrabold tracking-tight leading-tight mb-3 sm:mb-5">
                  Professional photos.
                  <br />
                  <span className="text-gradient">Zero studio.</span>
                </h2>
                <p className="text-muted-foreground text-sm sm:text-base leading-relaxed mb-4 sm:mb-6 max-w-lg">
                  Vintography transforms your phone snaps into stunning product photography. AI Model shots with photorealistic models, Mannequin Ghost effects, Flat-Lay Pro styling — pick your look and go.
                </p>
                <div className="space-y-2 mb-6 sm:mb-8 text-left max-w-xs mx-auto lg:mx-0">
                  {["AI Model — male & female, 3 shot styles", "Mannequin — headless, ghost, dress form", "Flat-Lay Pro — 5 styling presets", "Custom backgrounds — 16 lifestyle scenes"].map((item) => (
                    <div key={item} className="flex items-center gap-2 text-xs sm:text-sm">
                      <Check className="w-4 h-4 text-success shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
                <Button onClick={() => navigate("/auth?mode=signup")} className="h-11 font-semibold shadow-xl shadow-primary/20 active:scale-95 transition-transform w-full sm:w-auto">
                  Try Photo Studio Free <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
              <div className="flex-1 w-full max-w-md">
                <div className="gradient-border p-[1.5px] rounded-2xl">
                  <div className="rounded-2xl bg-card p-4 sm:p-5 shadow-xl">
                    <div className="flex gap-1.5 mb-4">
                      {["AI Model", "Flat-Lay", "Mannequin"].map((tab, i) => (
                        <div key={tab} className={`flex-1 text-center py-1.5 rounded-lg text-xs font-medium ${i === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{tab}</div>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="rounded-xl bg-muted/50 border border-border p-3 text-center">
                        <div className="w-full aspect-[3/4] rounded-lg bg-muted flex items-center justify-center mb-2">
                          <span className="text-xs text-muted-foreground">Original</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">Phone snap</p>
                      </div>
                      <div className="rounded-xl bg-success/5 border border-success/30 p-3 text-center">
                        <div className="w-full aspect-[3/4] rounded-lg bg-gradient-to-br from-success/10 to-primary/10 flex items-center justify-center mb-2">
                          <div className="text-center">
                            <span className="text-lg">✨</span>
                            <p className="text-[10px] text-success font-medium mt-0.5">Enhanced</p>
                          </div>
                        </div>
                        <p className="text-[10px] text-success font-medium">Studio quality</p>
                      </div>
                    </div>
                    <div className="rounded-lg bg-muted/40 p-2.5 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Shot style:</span>
                      <span className="font-medium text-foreground">Natural Photo · Female model</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Simplified Pricing ── */}
      <section className="py-12 sm:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="font-display text-xl sm:text-3xl md:text-4xl font-bold mb-2 sm:mb-3">Start free. Scale when ready.</h2>
            <p className="text-muted-foreground text-sm sm:text-base">5 free credits every month. No card required.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto mb-6 sm:mb-8">
            {/* Free */}
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <Card className="p-5 sm:p-6 h-full flex flex-col border-border/50 hover:shadow-lg transition-all duration-300">
                <div className="mb-4">
                  <h3 className="font-display font-bold text-base sm:text-lg">Free</h3>
                  <div className="mt-2">
                    <span className="font-display text-3xl sm:text-4xl font-extrabold">Free</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">5 credits/month · no card needed</p>
                </div>
                <ul className="space-y-2 mb-5 flex-1">
                  {["AI Price Check", "Photo Studio (bg removal)", "Trend Radar (top 5)", "Up to 20 items tracked", "P&L tracking"].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs sm:text-sm">
                      <Check className="w-3.5 h-3.5 text-success shrink-0" /><span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button variant="outline" className="w-full font-semibold h-10 active:scale-95 transition-transform" onClick={() => navigate("/auth?mode=signup")}>
                  Get Started
                </Button>
              </Card>
            </motion.div>
            {/* Pro */}
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}>
              <Card className="p-5 sm:p-6 h-full relative flex flex-col border-primary shadow-lg shadow-primary/10 ring-1 ring-primary animate-glow-pulse">
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs">Most Popular</Badge>
                <div className="mb-4">
                  <h3 className="font-display font-bold text-base sm:text-lg">Pro</h3>
                  <div className="mt-2">
                    <span className="font-display text-3xl sm:text-4xl font-extrabold">£9.99</span>
                    <span className="text-muted-foreground text-xs sm:text-sm">/month</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">50 credits/month · 7-day free trial</p>
                </div>
                <ul className="space-y-2 mb-5 flex-1">
                  {["Everything in Free", "Full AI Listing Optimiser + Hashtags", "AI Model & Mannequin shots", "Full Trend Radar + Niche Finder", "Competitor tracking (3 sellers)", "Unlimited items tracked"].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs sm:text-sm">
                      <Check className="w-3.5 h-3.5 text-success shrink-0" /><span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button className="w-full font-semibold h-10 shadow-lg shadow-primary/25 active:scale-95 transition-transform" onClick={() => navigate("/auth?mode=signup")}>
                  Start Free Trial
                </Button>
              </Card>
            </motion.div>
          </div>
          <div className="text-center">
            <Button variant="ghost" size="sm" onClick={() => navigate("/pricing")} className="text-muted-foreground hover:text-foreground">
              See all plans including Business & Scale <ArrowRight className="ml-1 w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative py-12 sm:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-secondary via-secondary to-secondary">
          <div className="absolute top-0 left-1/4 w-[400px] h-[400px] rounded-full bg-primary/10 blur-[100px]" />
          <div className="absolute bottom-0 right-1/4 w-[300px] h-[300px] rounded-full bg-accent/10 blur-[80px]" />
        </div>
        <div className="container mx-auto px-4 text-center relative z-10">
          <h2 className="font-display text-xl sm:text-3xl md:text-4xl font-bold mb-2 sm:mb-4 text-secondary-foreground">
            Ready to sell smarter?
          </h2>
          <p className="text-secondary-foreground/70 text-sm sm:text-lg mb-4 sm:mb-6 max-w-xl mx-auto">
            5 free credits. No card. See results in 90 seconds.
          </p>
          <Button
            size="lg"
            onClick={() => navigate("/auth?mode=signup")}
            className="text-sm sm:text-base font-semibold px-8 h-12 shadow-xl shadow-primary/20 w-full sm:w-auto active:scale-95 transition-transform"
          >
            Get Started Free <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </div>
      </section>
    </MarketingLayout>
  );
}
