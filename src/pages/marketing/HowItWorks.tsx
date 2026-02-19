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
    desc: "Paste any Vinted URL and we import everything: photos, brand, size, condition, price. Your item is ready in seconds — no form-filling, no data entry. Or upload your own photos and let AI do the rest.",
    callout: "Import a full Vinted listing in under 5 seconds",
    badge: null as string | null,
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
        <div className="rounded-lg bg-card border border-border p-3 mb-2">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-success" />
            <span className="text-xs text-foreground font-medium">Nike Air Max 90 — UK10 — Excellent</span>
          </div>
          <div className="flex gap-3 text-[10px] text-muted-foreground">
            <span>Brand: Nike</span><span>Size: UK 10</span><span>Listed: £28</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-px flex-1 bg-border" />
          <span className="text-[10px] text-muted-foreground">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>
        <div className="mt-2 rounded-lg border border-dashed border-border p-3 text-center">
          <p className="text-xs text-muted-foreground">📷 Upload your own photos</p>
        </div>
      </div>
    ),
  },
  {
    num: "02",
    icon: Camera,
    title: "Enhance your photos",
    desc: "This is where buyers decide to click. Upload your phone snap and choose a mode: AI Model places your garment on a photorealistic male or female model (Editorial, Natural Photo, or Street Style). Mannequin gives you a headless ghost effect. Flat-Lay Pro creates clean overhead compositions in 5 styles. One tap — your bedroom floor becomes a studio shot. No kit, no experience, no studio.",
    callout: "Phone snap to studio quality — one tap",
    badge: "Start here",
    mock: (
      <div className="rounded-xl bg-card border border-border p-4 sm:p-5 space-y-3">
        <div className="flex gap-1.5">
          {["AI Model", "Flat-Lay Pro", "Mannequin"].map((tab, i) => (
            <div key={tab} className={`flex-1 text-center py-1.5 rounded-md text-[10px] font-medium ${i === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{tab}</div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-muted/50 border border-border p-2 text-center">
            <div className="w-full h-20 rounded bg-muted flex items-center justify-center mb-1.5 relative overflow-hidden">
              <img src="/test-photos/nike-front.jpeg" alt="Before — phone snap" className="w-full h-full object-cover opacity-80" />
              <div className="absolute bottom-0 left-0 right-0 bg-black/40 py-0.5 text-[9px] text-white text-center">Phone snap</div>
            </div>
            <p className="text-[10px] text-muted-foreground">Amateur photo — buyer scrolls</p>
          </div>
          <div className="rounded-lg bg-success/5 border border-success/30 p-2 text-center relative">
            <div className="w-full h-20 rounded bg-gradient-to-br from-success/10 to-primary/10 flex items-center justify-center mb-1.5 relative overflow-hidden">
              <img src="/test-photos/nike-front.jpeg" alt="After — AI Model" className="w-full h-full object-cover brightness-110 contrast-105 saturate-110" />
              <div className="absolute inset-0 bg-gradient-to-br from-white/25 via-transparent to-primary/10" />
              <div className="absolute top-1 right-1 bg-primary text-primary-foreground text-[8px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                <Sparkles className="w-2 h-2" /> AI
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-black/40 py-0.5 text-[9px] text-success text-center font-medium">✨ AI Model</div>
            </div>
            <p className="text-[10px] text-success font-medium">Studio quality — buyer clicks</p>
          </div>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {["16 backgrounds", "Batch process", "Gallery saved"].map(t => (
            <span key={t} className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{t}</span>
          ))}
        </div>
      </div>
    ),
  },
  {
    num: "03",
    icon: Brain,
    title: "Price it and optimise the listing",
    desc: "Once the photo's done, Vintifi prices your item and writes the listing. Our engine analyses hundreds of comparable sold listings — factoring in brand, condition, size, and seasonal demand — and gives you a confidence-scored recommendation. Then AI generates a keyword-rich title, a compelling description, and a hashtag set tuned for Vinted search. Your listing Health Score tells you exactly how discoverable you are.",
    callout: "Priced in 30 seconds · Health Score 100/100",
    badge: null as string | null,
    mock: (
      <div className="rounded-xl bg-card border border-border p-4 sm:p-5 space-y-3">
        <div className="grid grid-cols-3 gap-2">
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
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12 shrink-0">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="42" fill="none" strokeWidth="9" className="stroke-muted" />
              <circle cx="50" cy="50" r="42" fill="none" strokeWidth="9" stroke="hsl(var(--success))" strokeDasharray="264" strokeDashoffset="26" strokeLinecap="round" />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center font-display font-bold text-xs text-foreground">97</span>
          </div>
          <div className="space-y-1 text-xs flex-1">
            <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-success shrink-0" /> Title Keywords: Excellent</div>
            <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-success shrink-0" /> Description: Strong</div>
            <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-success shrink-0" /> Photos: Studio quality</div>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-muted/30 p-2.5">
          <p className="text-[10px] text-muted-foreground mb-1 font-medium uppercase tracking-wider">AI Title</p>
          <p className="text-xs font-medium text-foreground">"Nike Air Max 90 Triple White OG — UK 10 — Excellent Condition"</p>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {["#nike", "#airmax", "#trainers", "#uk10", "#sneakers"].map(t => (
            <span key={t} className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">{t}</span>
          ))}
        </div>
      </div>
    ),
  },
];

const theNumbers = [
  { value: "1 tap", label: "From phone snap to studio-quality product shot" },
  { value: "< 30 sec", label: "Average time to price an item with Vintifi" },
  { value: "100/100", label: "Maximum achievable Listing Health Score" },
  { value: "18", label: "Vinted markets Vintifi supports" },
];

const beforeAfter = {
  before: [
    { icon: Package, label: "Photos", value: "Amateur phone snap — buyer scrolls past" },
    { icon: Clock, label: "Time per item", value: "45 min/item" },
    { icon: TrendingDown, label: "Pricing accuracy", value: "Gut feel — often 20–30% wrong" },
    { icon: Eye, label: "Market visibility", value: "Zero — you list blind" },
    { icon: Heart, label: "Listing quality", value: "Dependent on writing skill" },
  ],
  after: [
    { icon: Package, label: "Photos", value: "AI Model / Mannequin / Flat-Lay Pro — one tap" },
    { icon: Clock, label: "Time per item", value: "Under 30 seconds — AI-backed" },
    { icon: TrendingUp, label: "Pricing accuracy", value: "Confidence-scored — market-verified" },
    { icon: Eye, label: "Market visibility", value: "Live comparable data across Vinted" },
    { icon: Heart, label: "Listing quality", value: "Health Score 100 — search-engineered" },
  ],
};

export default function HowItWorks() {
  const navigate = useNavigate();

  usePageMeta("How It Works — Vintifi", "Three steps to a perfect Vinted listing. Add your item, enhance your photos with AI, price and optimise. First result in 90 seconds.");

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
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/8 px-4 py-1.5 mb-6">
              <Camera className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-semibold text-primary">Photo Studio is step 2 — not an afterthought</span>
            </motion.div>
            <motion.h1 variants={fadeUp} className="font-display text-2xl sm:text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.08] mb-4 sm:mb-6">
              Three steps.
              <br />
              <span className="text-gradient">One perfect listing.</span>
            </motion.h1>
            <motion.p variants={fadeUp} className="text-sm sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-2">
              Add your item. Enhance your photos with AI. Price and optimise.
            </motion.p>
            <motion.p variants={fadeUp} className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
              The photo is the first thing buyers see. We put it second — right after you add your item — because that's where it belongs.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Steps */}
      <section className="pb-10 sm:pb-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="relative">
            {/* Vertical connector line */}
            <div className="absolute left-8 md:left-10 top-0 bottom-0 w-px bg-border hidden md:block">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="absolute -left-[3px] w-[7px] h-[7px] rounded-full bg-primary animate-pulse"
                  style={{ top: `${(i + 0.5) * 33.33}%`, animationDelay: `${i * 0.35}s` }}
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
                    <div className={`w-12 h-12 md:w-20 md:h-20 rounded-2xl flex items-center justify-center ${step.badge ? "bg-gradient-to-br from-success/30 to-success/10 border border-success/30" : "bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20"}`}>
                      <span className={`font-display text-xl md:text-3xl font-extrabold ${step.badge ? "text-success" : "text-primary"}`}>{step.num}</span>
                    </div>
                  </div>
                  <div className="flex-1 space-y-2.5 sm:space-y-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <step.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${step.badge ? "text-success" : "text-primary"}`} />
                      <h2 className="font-display text-lg sm:text-2xl md:text-3xl font-extrabold">{step.title}</h2>
                      {step.badge && (
                        <span className="text-[10px] sm:text-xs font-bold bg-success/15 text-success border border-success/30 px-2.5 py-0.5 rounded-full">
                          {step.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-muted-foreground leading-relaxed max-w-lg text-xs sm:text-base">{step.desc}</p>
                    <div className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 border ${step.badge ? "bg-success/8 border-success/20" : "bg-primary/8 border-primary/20"}`}>
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${step.badge ? "bg-success" : "bg-primary"}`} />
                      <span className={`text-xs sm:text-sm font-semibold ${step.badge ? "text-success" : "text-primary"}`}>{step.callout}</span>
                    </div>
                    <div className="max-w-md">{step.mock}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* The Numbers */}
      <section className="py-10 sm:py-20 bg-secondary">
        <div className="container mx-auto px-4">
          <motion.h2
            className="font-display text-xl sm:text-3xl md:text-4xl font-extrabold text-center mb-2 sm:mb-3 text-secondary-foreground"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            The Numbers
          </motion.h2>
          <motion.p
            className="text-center text-secondary-foreground/60 text-sm sm:text-base mb-8 sm:mb-12"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            What happens when you stop doing it manually.
          </motion.p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 max-w-4xl mx-auto">
            {theNumbers.map((n, i) => (
              <motion.div
                key={n.value}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center rounded-2xl border border-secondary-foreground/10 bg-secondary-foreground/5 p-4 sm:p-6"
              >
                <p className="font-display text-2xl sm:text-4xl font-extrabold text-primary mb-2 leading-none">{n.value}</p>
                <p className="text-secondary-foreground/70 text-[11px] sm:text-sm leading-tight">{n.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Before / After */}
      <section className="py-10 sm:py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.h2
            className="font-display text-xl sm:text-3xl md:text-4xl font-extrabold text-center mb-3 sm:mb-4"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            The Vintifi Difference
          </motion.h2>
          <motion.p
            className="text-center text-muted-foreground text-sm sm:text-base mb-8 sm:mb-12 max-w-xl mx-auto"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            Every row is a problem Vintifi solves. Side by side.
          </motion.p>
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
                <div className="space-y-3 sm:space-y-4">
                  {beforeAfter.before.map((item) => (
                    <div key={item.label} className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        <item.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-destructive/70 shrink-0" />
                        <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">{item.label}</span>
                      </div>
                      <span className="text-xs sm:text-sm font-medium text-foreground text-right">{item.value}</span>
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
                <div className="space-y-3 sm:space-y-4">
                  {beforeAfter.after.map((item) => (
                    <div key={item.label} className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        <item.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-success/70 shrink-0" />
                        <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">{item.label}</span>
                      </div>
                      <span className="text-xs sm:text-sm font-medium text-foreground text-right">{item.value}</span>
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
              Start free. Studio shots included.
            </motion.h2>
            <motion.p variants={fadeUp} className="text-muted-foreground text-sm sm:text-lg mb-2 max-w-xl mx-auto">
              No card. No setup. Add your item, enhance your photo, price it — done.
            </motion.p>
            <motion.p variants={fadeUp} className="text-muted-foreground/70 text-xs sm:text-sm mb-6 sm:mb-8">
              3 free credits waiting. No card required.
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
