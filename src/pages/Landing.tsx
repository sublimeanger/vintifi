import { useState, useEffect } from "react";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, ArrowRight, Zap, TrendingUp, Sparkles, Camera, ChevronLeft, ChevronRight } from "lucide-react";
import { STRIPE_TIERS, type TierKey } from "@/lib/constants";
import BeforeAfterSlider from "@/components/marketing/BeforeAfterSlider";

const PUBLIC_TIERS: TierKey[] = ["free", "pro", "business"];
import MarketingLayout from "@/components/MarketingLayout";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
};

// Rotating hero feature showcase — Photo Studio leads
const heroFeatures = [
  {
    id: "photo",
    label: "Vintography Photo Studio",
    icon: Camera,
    color: "text-success",
    bg: "bg-success/10",
    content: (
      <div className="space-y-3">
        <div className="flex gap-1.5 mb-2">
          {["AI Model", "Mannequin", "Flat-Lay"].map((tab, i) => (
            <div key={tab} className={`flex-1 text-center py-1.5 rounded-md text-[10px] font-medium transition-colors ${i === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{tab}</div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-1.5 text-center mb-1">
          {["Editorial", "Natural Photo", "Street Style"].map((style, i) => (
            <div key={style} className={`rounded-lg p-1.5 border text-[10px] font-medium ${i === 1 ? "border-primary bg-primary/5 text-primary" : "border-border bg-card text-muted-foreground"}`}>
              {style}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-muted/50 border border-border p-2 text-center">
            <div className="w-full h-20 rounded bg-muted flex items-center justify-center mb-1.5">
              <span className="text-[10px] text-muted-foreground">📱 Phone snap</span>
            </div>
            <p className="text-[10px] text-muted-foreground">Before</p>
          </div>
          <div className="rounded-lg bg-success/5 border border-success/30 p-2 text-center">
            <div className="w-full h-20 rounded bg-gradient-to-br from-success/10 to-primary/10 flex items-center justify-center mb-1.5">
              <div className="text-center">
                <span className="text-base">✨</span>
                <p className="text-[10px] text-success font-medium mt-0.5">Studio quality</p>
              </div>
            </div>
            <p className="text-[10px] text-success font-medium">After — 1 tap</p>
          </div>
        </div>
        <div className="text-[10px] text-muted-foreground text-center">16 background scenes · Batch processing · Gallery included</div>
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
];

// Photo Studio leads the pillars
const pillars = [
  {
    icon: Camera,
    title: "Vintography Photo Studio",
    desc: "Your phone snap is already good enough — Vintifi turns it into a studio shot. AI Model puts your clothes on a photorealistic model. Mannequin and Flat-Lay give you clean product shots. Buyers click on professional photos. It's as simple as that.",
    outcome: "AI Model · Mannequin · Flat-Lay Pro",
    badge: "Start here",
    badgeColor: "bg-success/10 text-success border-success/20",
  },
  {
    icon: Sparkles,
    title: "AI Listing Optimiser",
    desc: "AI-written titles and descriptions that rank in Vinted's search algorithm. A Health Score of 100 means maximum visibility — buyers find your item, full stop.",
    outcome: "Health Score up to 100/100",
    badge: "AI",
    badgeColor: "bg-accent/10 text-accent border-accent/20",
  },
  {
    icon: Zap,
    title: "Price Intelligence",
    desc: "Know your item's exact worth in seconds. No more underpricing. No more overpriced listings sitting for weeks while buyers scroll past.",
    outcome: "Price checked in < 30 seconds",
    badge: "Built in",
    badgeColor: "bg-primary/10 text-primary border-primary/20",
  },
  {
    icon: TrendingUp,
    title: "Trend Radar",
    desc: "Spot rising brands before everyone else. The Vinted market prices in demand faster than you'll notice on social media — Trend Radar gives you the head start.",
    outcome: "2–4 weeks ahead of the market",
    badge: "Intel",
    badgeColor: "bg-primary/10 text-primary border-primary/20",
  },
];

const howSteps = [
  { num: "01", label: "Add your item", desc: "Paste a Vinted URL or upload photos. Brand, size, condition — all set in seconds. No form-filling." },
  { num: "02", label: "Enhance your photos", desc: "One tap. AI Model, Mannequin, or Flat-Lay. Your phone snap becomes a studio shot." },
  { num: "03", label: "Price & optimise", desc: "AI prices it to sell fast. AI-written title and description. Ready to post." },
];

const impactStats = [
  { value: "3 modes", label: "AI Model, Mannequin, Flat-Lay" },
  { value: "1-tap", label: "Phone snap to studio shot" },
  { value: "18", label: "Vinted markets supported" },
  { value: "40×", label: "Faster than manual research" },
];

const resultsItems = [
  { icon: "📸", claim: "The photo is the first thing buyers see — and the only thing that makes them click", sub: "Buyers decide in under two seconds. Studio-quality images are the single highest-impact upgrade a seller can make." },
  { icon: "✨", claim: "One tap from phone snap to studio shot — no setup, no equipment, no experience", sub: "AI Model, Mannequin, or Flat-Lay. Your bedroom floor becomes a professional product shot." },
  { icon: "⚡", claim: "Price any item in under 30 seconds — AI analyses hundreds of comparables", sub: "Not the first page you happen to browse. Hundreds of real sold listings, confidence-scored." },
  { icon: "🎯", claim: "Stop leaving money on the table — AI pricing means you're never 20% under market", sub: "AI pricing means you're never 20% under market. Never overpriced collecting dust either." },
];

export default function Landing() {
  const navigate = useNavigate();
  const [activeFeature, setActiveFeature] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);

  usePageMeta(
    "Vintifi — Turn Phone Photos into Sales on Vinted",
    "Point your phone. Tap once. AI turns your photo into a studio shot. AI pricing in 30 seconds. 3 free credits — no card needed."
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

  const tiers = (Object.entries(STRIPE_TIERS) as [TierKey, (typeof STRIPE_TIERS)[TierKey]][]).filter(([key]) => PUBLIC_TIERS.includes(key));

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
              <Badge variant="outline" className="border-success/30 text-success bg-success/5 text-xs font-medium px-3 py-1">
                <Camera className="w-3 h-3 mr-1.5" /> Vintography Photo Studio — AI Model, Mannequin & Flat-Lay
              </Badge>
            </motion.div>
            <motion.h1
              variants={fadeUp}
              custom={1}
              className="font-display text-3xl sm:text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.05] mb-4 sm:mb-6"
            >
              Turn phone photos
              <br />
              <span className="text-gradient">into sales.</span>
            </motion.h1>
            <motion.p variants={fadeUp} custom={2} className="text-sm sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-2 sm:mb-3 px-2">
              Point your phone. Tap once. Your bedroom floor becomes a professional studio shot that stops scrollers cold.
            </motion.p>
            <motion.p variants={fadeUp} custom={2} className="text-sm sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-6 sm:mb-8 px-2">
              AI pricing and listing optimisation built in — so the right buyer finds your item at exactly the right price. <strong className="text-foreground">All free to start.</strong>
            </motion.p>
            <motion.div variants={fadeUp} custom={3} className="flex flex-col sm:flex-row gap-2.5 sm:gap-4 justify-center px-2 sm:px-0 mb-8 sm:mb-10">
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

            {/* Impact stats strip */}
            <motion.div
              variants={fadeUp}
              custom={4}
              className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 max-w-2xl mx-auto mb-4"
            >
              {impactStats.map((s) => (
                <div key={s.value} className="rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm p-3 text-center shadow-sm">
                  <p className="font-display text-2xl sm:text-3xl font-extrabold text-primary leading-none mb-1">{s.value}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">{s.label}</p>
                </div>
              ))}
            </motion.div>

            {/* Market strip */}
            <motion.div variants={fadeUp} custom={5} className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <span>🇬🇧</span><span>🇫🇷</span><span>🇩🇪</span><span>🇳🇱</span><span>🇪🇸</span><span>🇮🇹</span>
              <span className="ml-1">Across 18 Vinted markets</span>
            </motion.div>
          </motion.div>

          {/* Photo Studio before/after hero */}
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="mt-10 sm:mt-16 max-w-lg mx-auto"
          >
            <BeforeAfterSlider
              beforeSrc="/marketing/denim-dress-before.png"
              afterSrc="/marketing/denim-dress-after.png"
              beforeLabel="Phone snap"
              afterLabel="Studio shot"
              badge="AI Model + Deep Steam"
              aspectRatio="4/5"
            />
            {/* Mode badges */}
            <div className="flex items-center justify-center gap-2 mt-4">
              {["Clean BG", "AI Model", "Flat-Lay"].map((mode) => (
                <span key={mode} className="text-[10px] sm:text-xs font-medium px-2.5 py-1 rounded-full border border-border text-muted-foreground">
                  {mode}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Results Strip ── */}
      <section className="py-10 sm:py-16 bg-secondary">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center text-xs sm:text-sm font-semibold text-secondary-foreground/60 uppercase tracking-widest mb-6 sm:mb-8"
            >
              What Vintifi sellers say happens
            </motion.p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {resultsItems.map((r, i) => (
                <motion.div
                  key={r.claim}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="flex gap-3 sm:gap-4 p-3.5 sm:p-5 rounded-xl bg-secondary-foreground/5 border border-secondary-foreground/10"
                >
                  <span className="text-2xl shrink-0">{r.icon}</span>
                  <div>
                    <p className="font-semibold text-secondary-foreground text-sm sm:text-base mb-0.5">{r.claim}</p>
                    <p className="text-secondary-foreground/60 text-xs sm:text-sm leading-relaxed">{r.sub}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 4 Pillars ── */}
      <section className="py-12 sm:py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8 sm:mb-14">
            <h2 className="font-display text-xl sm:text-3xl md:text-5xl font-bold mb-3 sm:mb-4 leading-tight">
              Four tools. Zero guesswork.
            </h2>
            <p className="text-muted-foreground text-sm sm:text-lg max-w-2xl mx-auto">
              Start with the photo — that's what buyers see first. Everything else follows from there.
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
                <Card className={`p-4 sm:p-7 h-full hover:shadow-xl hover:shadow-primary/8 transition-all duration-300 group ${i === 0 ? "border-success/40 shadow-lg shadow-success/5 ring-1 ring-success/20" : "border-border/50"}`}>
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${i === 0 ? "bg-success/15 group-hover:bg-success/25" : "bg-primary/10 group-hover:bg-primary/20"}`}>
                      <p.icon className={`w-5 h-5 sm:w-6 sm:h-6 ${i === 0 ? "text-success" : "text-primary"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 sm:mb-2 flex-wrap">
                        <h3 className="font-display font-bold text-sm sm:text-lg">{p.title}</h3>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${p.badgeColor}`}>{p.badge}</span>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-3">{p.desc}</p>
                      <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-semibold text-primary">
                        <Check className="w-3 h-3 shrink-0" />
                        <span>{p.outcome}</span>
                      </div>
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
            <h2 className="font-display text-xl sm:text-3xl md:text-4xl font-bold mb-2 sm:mb-3">Three steps to a perfect listing</h2>
            <p className="text-muted-foreground text-sm sm:text-base">Photo first. Then price it. Then post it. Done — in minutes, not hours.</p>
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
                  <Camera className="w-3 h-3 mr-1.5" /> Vintography Photo Studio
                </Badge>
                <h2 className="font-display text-xl sm:text-3xl md:text-5xl font-extrabold tracking-tight leading-tight mb-3 sm:mb-5">
                  Turn any phone snap
                  <br />
                  <span className="text-gradient">into a studio shot.</span>
                </h2>
                <p className="text-muted-foreground text-sm sm:text-base leading-relaxed mb-4 sm:mb-6 max-w-lg">
                  Buyers decide in under 2 seconds. A professional photo is the difference between a click and a scroll-past. Vintography does it in one tap — no studio, no kit, no experience.
                </p>
                <div className="space-y-2 mb-6 sm:mb-8 text-left max-w-xs mx-auto lg:mx-0">
                  {[
                    "AI Model — male & female · Editorial, Natural Photo, Street Style",
                    "Mannequin Ghost — headless, dress form, half-body shots",
                    "Flat-Lay Pro — clean overhead · 5 styling presets",
                    "16 background scenes · Batch processing · Gallery included",
                  ].map((item) => (
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
              <BeforeAfterSlider
                  beforeSrc="/marketing/nike-sweatshirt-before.jpeg"
                  afterSrc="/marketing/nike-sweatshirt-after.png"
                  beforeLabel="Phone snap"
                  afterLabel="Studio shot"
                  badge="Lifestyle Shot + Enhance"
                  aspectRatio="4/5"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing (3 tiers) ── */}
      <section className="py-12 sm:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="font-display text-xl sm:text-3xl md:text-4xl font-bold mb-2 sm:mb-3">Start free. Studio shots included.</h2>
            <p className="text-muted-foreground text-sm sm:text-base">3 free credits — enough to try Photo Studio, price an item, and optimise a listing.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 max-w-5xl mx-auto mb-6 sm:mb-8">
            {tiers.map(([key, tier], i) => {
              const isPopular = key === "pro";
              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                >
                  <Card className={`p-4 h-full relative flex flex-col transition-all duration-300 hover:-translate-y-1 ${
                    isPopular
                      ? "border-primary shadow-xl shadow-primary/15 ring-1 ring-primary"
                      : "border-border/50 hover:shadow-lg"
                  }`}>
                    {isPopular && (
                      <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground whitespace-nowrap text-[10px]">
                        Most Popular
                      </Badge>
                    )}
                    <div className="mb-3">
                      <h3 className="font-display font-bold text-sm">{tier.name}</h3>
                      <div className="mt-1.5">
                        <span className="font-display text-2xl font-extrabold">
                          {tier.price === 0 ? "Free" : `£${tier.price}`}
                        </span>
                        {tier.price > 0 && <span className="text-muted-foreground text-xs">/mo</span>}
                      </div>
                      {'credits' in tier && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {`${tier.credits.toLocaleString()} credits/month`}
                        </p>
                      )}
                    </div>
                    <ul className="space-y-1.5 mb-4 flex-1">
                      {tier.features.slice(0, 4).map((f) => (
                        <li key={f} className="flex items-start gap-1.5 text-xs">
                          <Check className="w-3 h-3 text-success mt-0.5 shrink-0" />
                          <span className="text-muted-foreground">{f}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      variant={isPopular ? "default" : "outline"}
                      size="sm"
                      className="w-full font-semibold active:scale-95 transition-transform text-xs h-9"
                      onClick={() => navigate("/auth?mode=signup")}
                    >
                      {tier.price === 0 ? "Get Started Free" : "Start Free Trial"}
                    </Button>
                  </Card>
                </motion.div>
              );
            })}
          </div>
          <div className="text-center">
            <Button variant="ghost" size="sm" onClick={() => navigate("/pricing")} className="text-muted-foreground hover:text-foreground">
              Full plan comparison <ArrowRight className="ml-1 w-3.5 h-3.5" />
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
          <h2 className="font-display text-xl sm:text-3xl md:text-5xl font-bold mb-3 sm:mb-4 text-secondary-foreground">
            Your next listing deserves better photos.
          </h2>
          <p className="text-secondary-foreground/80 text-sm sm:text-lg mb-2 max-w-lg mx-auto">
            Professional studio shots from your phone — in seconds.
          </p>
          <p className="text-secondary-foreground/60 text-xs sm:text-base mb-6 sm:mb-8 max-w-sm mx-auto">
            Start free. No card. No catch.
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
