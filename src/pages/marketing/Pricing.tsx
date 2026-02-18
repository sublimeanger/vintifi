import { useState } from "react";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import MarketingLayout from "@/components/MarketingLayout";
import { Check, ArrowRight, Shield, Zap } from "lucide-react";
import { STRIPE_TIERS, CREDIT_PACKS, TierKey } from "@/lib/constants";

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
};

const comparisonFeatures = [
  { name: "Credits / month", free: "5", pro: "50", business: "200", scale: "Unlimited" },
  { name: "AI Price Check", free: "✓", pro: "✓", business: "✓", scale: "✓" },
  { name: "Import from Vinted URL", free: "✓", pro: "✓", business: "✓", scale: "✓" },
  { name: "Vintography Photo Studio", free: "✓ (credits)", pro: "✓", business: "✓", scale: "✓" },
  { name: "AI Model & Mannequin shots", free: "—", pro: "✓", business: "✓", scale: "✓" },
  { name: "AI Listing Optimiser", free: "—", pro: "✓", business: "✓ + Bulk", scale: "✓ Unlimited" },
  { name: "Listing Health Score", free: "—", pro: "✓", business: "✓", scale: "✓" },
  { name: "Hashtag Generator", free: "✓ (credits)", pro: "✓", business: "✓", scale: "✓" },
  { name: "Trend Radar", free: "Top 5", pro: "Full", business: "Full", scale: "Full" },
  { name: "Seasonal Calendar + Niche Finder", free: "—", pro: "✓", business: "✓", scale: "✓" },
  { name: "Arbitrage Scanner", free: "—", pro: "—", business: "✓", scale: "✓" },
  { name: "Clearance Radar", free: "—", pro: "—", business: "✓", scale: "✓" },
  { name: "Items Tracked", free: "20", pro: "Unlimited", business: "Unlimited", scale: "Unlimited" },
  { name: "Competitor Tracking", free: "—", pro: "3", business: "15", scale: "50" },
  { name: "Multi-language Listings", free: "—", pro: "—", business: "5 languages", scale: "All" },
  { name: "P&L Tracking", free: "✓", pro: "✓", business: "✓ + CSV", scale: "✓ + CSV" },
  { name: "Relist Scheduler", free: "—", pro: "✓", business: "✓", scale: "✓" },
  { name: "Dead Stock Alerts", free: "—", pro: "✓", business: "✓", scale: "✓" },
  { name: "Charity Sourcing Briefing", free: "—", pro: "✓", business: "✓", scale: "✓" },
  { name: "Support", free: "Community", pro: "Email", business: "Priority", scale: "Priority (fast)" },
  { name: "API Access", free: "—", pro: "—", business: "—", scale: "✓" },
];

const faqs = [
  {
    q: "What's a credit?",
    a: "One credit = one action. A Price Check costs 1 credit. An AI Listing Optimisation costs 1 credit. A Vintography photo edit (background removal, AI Model, Mannequin, or Flat-Lay) costs 1 credit. Credits reset monthly on your billing date.",
  },
  {
    q: "What can I do with Vintography Photo Studio?",
    a: "Three modes: AI Model (place your garment on a photorealistic male or female model — Editorial, Natural Photo, or Street Style), Mannequin (Headless, Ghost, Dress Form, or Half-Body), and Flat-Lay Pro (5 styling presets). All include 16 background scene options. Available to all tiers — AI Model and Mannequin modes unlock on Pro and above.",
  },
  {
    q: "Can I really start for free?",
    a: "Absolutely. Our Free plan gives you 5 credits per month for price checks and photo edits — no credit card required. It's enough to see the value before committing.",
  },
  {
    q: "What happens when I run out of credits?",
    a: "You can purchase additional credit packs starting from £2.99 for 10 credits, or upgrade to a higher plan for more monthly credits. Your data and listings are never lost.",
  },
  {
    q: "Can I switch plans at any time?",
    a: "Yes! Upgrade or downgrade instantly. When upgrading, you get immediate access to new features. When downgrading, your current billing period remains active until renewal.",
  },
  {
    q: "Is there a money-back guarantee?",
    a: "Yes — we offer a 14-day money-back guarantee on all paid plans. If you're not seeing value, contact us for a full refund, no questions asked.",
  },
  {
    q: "How accurate are the price recommendations?",
    a: "Our AI analyses comparable sold and active listings in real-time. Confidence scores are provided with every recommendation — typically 80-95% accuracy based on data density.",
  },
  {
    q: "Do you support multiple Vinted markets?",
    a: "Yes! Vintifi works across 18 Vinted markets including UK, France, Germany, Netherlands, Spain, Italy, and more. Multi-language listing generation is available on Business and Scale plans.",
  },
  {
    q: "Is my data secure?",
    a: "All data is encrypted at rest and in transit. We use enterprise-grade infrastructure with EU data residency. We never share your selling data with third parties.",
  },
  {
    q: "Can I cancel at any time?",
    a: "Yes, cancel anytime from your Settings page. You'll retain access to paid features until the end of your current billing period.",
  },
];

export default function Pricing() {
  const navigate = useNavigate();
  const [annual, setAnnual] = useState(false);

  usePageMeta("Pricing — Vintifi", "Simple, transparent pricing. Start free, upgrade when you're ready. Plans from £9.99/month. 14-day money-back guarantee.");

  const tiers = Object.entries(STRIPE_TIERS) as [TierKey, (typeof STRIPE_TIERS)[TierKey]][];

  return (
    <MarketingLayout>
      {/* Hero */}
      <section className="relative py-12 sm:py-24 md:py-32 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/3 w-[500px] h-[500px] rounded-full bg-primary/6 blur-[120px] float-animation" />
          <div className="absolute bottom-0 right-1/3 w-[400px] h-[400px] rounded-full bg-accent/6 blur-[100px] float-animation-delay" />
        </div>
        <div className="container mx-auto px-4 text-center">
          <motion.div initial="hidden" animate="visible" variants={stagger}>
            <motion.h1 variants={fadeUp} className="font-display text-2xl sm:text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.08] mb-4 sm:mb-6">
              Simple pricing,
              <br />
              <span className="text-gradient">serious results</span>
            </motion.h1>
            <motion.p variants={fadeUp} className="text-sm sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-6 sm:mb-10">
              Start free — no card required. Upgrade when you're ready. Every paid plan includes a 7-day free trial.
            </motion.p>
            <motion.div variants={fadeUp} className="flex items-center justify-center gap-3 min-h-[44px]">
              <span className={`text-sm font-medium ${!annual ? "text-foreground" : "text-muted-foreground"}`}>Monthly</span>
              <Switch checked={annual} onCheckedChange={setAnnual} />
              <span className={`text-sm font-medium ${annual ? "text-foreground" : "text-muted-foreground"}`}>Annual</span>
              {annual && (
                <Badge className="bg-success text-success-foreground ml-1">Save 20%</Badge>
              )}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Pricing cards */}
      <section className="pb-10 sm:pb-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 max-w-6xl mx-auto">
            {tiers.map(([key, tier], i) => {
              const isPopular = key === "pro";
              const price = annual && tier.price > 0 && 'annual_price' in tier
                ? ((tier as any).annual_price / 12).toFixed(2)
                : tier.price;
              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className={isPopular ? "sm:scale-[1.02]" : ""}
                >
                  <Card className={`p-4 sm:p-6 h-full relative flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-xl active:scale-[0.98] ${
                    isPopular
                      ? "border-primary shadow-xl shadow-primary/15 ring-1 ring-primary animate-glow-pulse"
                      : "border-border/50 hover:shadow-lg hover:shadow-primary/5"
                  }`}>
                    {isPopular && (
                      <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground whitespace-nowrap">
                        Most Popular
                      </Badge>
                    )}
                    <div className="mb-4 sm:mb-6">
                      <h3 className="font-display font-bold text-base sm:text-lg">{tier.name}</h3>
                      <div className="mt-2 sm:mt-3">
                        <span className="font-display text-3xl sm:text-4xl font-extrabold">
                          {tier.price === 0 ? "Free" : `£${price}`}
                        </span>
                        {tier.price > 0 && <span className="text-muted-foreground text-xs sm:text-sm">/month</span>}
                      </div>
                      {annual && tier.price > 0 && (
                        <p className="text-xs text-muted-foreground mt-1 line-through">£{tier.price}/mo</p>
                      )}
                      {tier.price > 0 && (
                        <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">7-day free trial included</p>
                      )}
                    </div>
                    <ul className="space-y-1.5 sm:space-y-2.5 mb-5 sm:mb-8 flex-1">
                      {tier.features.map((f) => (
                        <li key={f} className="flex items-start gap-1.5 sm:gap-2 text-xs sm:text-sm">
                          <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-success mt-0.5 shrink-0" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      variant={isPopular ? "default" : "outline"}
                      className={`w-full font-semibold h-11 sm:h-10 active:scale-95 transition-transform ${isPopular ? "shadow-lg shadow-primary/25" : ""}`}
                      onClick={() => navigate("/auth?mode=signup")}
                    >
                      {tier.price === 0 ? "Get Started Free" : "Start Free Trial"}
                    </Button>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Credit Packs */}
      <section className="py-10 sm:py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-6 sm:mb-10">
            <h2 className="font-display text-lg sm:text-2xl md:text-3xl font-extrabold mb-2">Need a top-up?</h2>
            <p className="text-muted-foreground text-sm sm:text-base">One-time credit packs — no subscription required.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 max-w-3xl mx-auto">
            {CREDIT_PACKS.map((pack, i) => (
              <motion.div
                key={pack.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                <Card className={`p-4 sm:p-5 text-center relative transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${pack.popular ? "border-primary ring-1 ring-primary shadow-lg shadow-primary/10" : "border-border/50"}`}>
                  {pack.popular && (
                    <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px]">Best Value</Badge>
                  )}
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <Zap className="w-5 h-5 text-primary" />
                  </div>
                  <p className="font-display text-2xl sm:text-3xl font-extrabold text-foreground">{pack.credits}</p>
                  <p className="text-xs text-muted-foreground mb-1">credits</p>
                  <p className="font-display text-lg font-bold text-primary mb-3">£{pack.price}</p>
                  <p className="text-[10px] text-muted-foreground mb-3">£{(pack.price / pack.credits).toFixed(2)} per credit</p>
                  <Button
                    variant={pack.popular ? "default" : "outline"}
                    size="sm"
                    className="w-full font-semibold active:scale-95 transition-transform"
                    onClick={() => navigate("/auth?mode=signup")}
                  >
                    Buy Pack
                  </Button>
                </Card>
              </motion.div>
            ))}
          </div>
          <p className="text-center text-xs text-muted-foreground mt-4">Credit packs available after sign-up · Never expire</p>
        </div>
      </section>

      {/* Comparison table */}
      <section className="py-10 sm:py-20">
        <div className="container mx-auto px-4">
          <motion.h2
            className="font-display text-xl sm:text-3xl md:text-4xl font-extrabold text-center mb-6 sm:mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            Full Feature Comparison
          </motion.h2>

          {/* Desktop table */}
          <div className="hidden lg:block max-w-5xl mx-auto">
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="grid grid-cols-5 bg-muted/50 border-b border-border sticky top-0 z-10">
                <div className="p-4 font-semibold text-sm">Feature</div>
                {tiers.map(([key, tier]) => (
                  <div key={key} className={`p-4 text-center font-semibold text-sm ${key === "pro" ? "bg-primary/5 text-primary" : ""}`}>
                    {tier.name}
                  </div>
                ))}
              </div>
              {comparisonFeatures.map((feature, i) => (
                <div
                  key={feature.name}
                  className={`grid grid-cols-5 border-b border-border last:border-0 ${i % 2 === 0 ? "" : "bg-muted/20"}`}
                >
                  <div className="p-4 text-sm text-foreground">{feature.name}</div>
                  <div className="p-4 text-center text-sm text-muted-foreground">{feature.free}</div>
                  <div className={`p-4 text-center text-sm bg-primary/5 ${feature.pro === "—" ? "text-muted-foreground" : "text-foreground font-medium"}`}>{feature.pro}</div>
                  <div className={`p-4 text-center text-sm ${feature.business === "—" ? "text-muted-foreground" : "text-foreground font-medium"}`}>{feature.business}</div>
                  <div className={`p-4 text-center text-sm ${feature.scale === "—" ? "text-muted-foreground" : "text-foreground font-medium"}`}>{feature.scale}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile stacked cards */}
          <div className="lg:hidden space-y-3 max-w-md mx-auto">
            {tiers.map(([key, tier]) => (
              <Card key={key} className={`p-3.5 ${key === "pro" ? "border-primary ring-1 ring-primary" : ""}`}>
                <h3 className="font-display font-bold text-base mb-2">{tier.name}</h3>
                <ul className="space-y-1.5">
                  {comparisonFeatures.map((f) => {
                    const val = f[key as keyof typeof f];
                    return (
                      <li key={f.name} className="flex items-center justify-between text-xs min-h-[32px]">
                        <span className="text-muted-foreground">{f.name}</span>
                        <span className={`text-right ${val === "—" ? "text-muted-foreground" : "text-foreground font-medium"}`}>{val}</span>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-10 sm:py-20 bg-muted/30">
        <div className="container mx-auto px-4 max-w-3xl">
          <motion.h2
            className="font-display text-xl sm:text-3xl md:text-4xl font-extrabold text-center mb-6 sm:mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            Frequently Asked Questions
          </motion.h2>
          <Accordion type="single" collapsible className="space-y-2 sm:space-y-3">
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04 }}
              >
                <AccordionItem value={`faq-${i}`} className="border border-border rounded-xl px-3.5 sm:px-5 data-[state=open]:bg-muted/30 data-[state=open]:border-l-4 data-[state=open]:border-l-primary transition-all">
                  <AccordionTrigger className="text-left font-semibold text-xs sm:text-sm md:text-base hover:no-underline min-h-[44px]">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-xs sm:text-sm text-muted-foreground leading-relaxed pb-3 sm:pb-4">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              </motion.div>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="relative py-12 sm:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-secondary via-secondary to-secondary">
          <div className="absolute top-0 left-1/4 w-[400px] h-[400px] rounded-full bg-primary/10 blur-[100px]" />
          <div className="absolute bottom-0 right-1/4 w-[300px] h-[300px] rounded-full bg-accent/10 blur-[80px]" />
        </div>
        <div className="container mx-auto px-4 text-center relative z-10">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
          >
            <motion.div variants={fadeUp} className="flex items-center justify-center gap-2 mb-4 sm:mb-6">
              <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-success" />
              <span className="text-xs sm:text-sm font-medium text-secondary-foreground">14-day money-back guarantee on all paid plans</span>
            </motion.div>
            <motion.h2 variants={fadeUp} className="font-display text-xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4 text-secondary-foreground">
              Start selling smarter today
            </motion.h2>
            <motion.p variants={fadeUp} className="text-secondary-foreground/70 text-sm sm:text-lg mb-6 sm:mb-8 max-w-xl mx-auto">
              5 free credits. No card required. See results in 90 seconds.
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
