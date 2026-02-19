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
import BeforeAfterSlider from "@/components/marketing/BeforeAfterSlider";
import { Check, ArrowRight, Shield, Zap, Star, Sparkles, Camera } from "lucide-react";
import { STRIPE_TIERS, CREDIT_PACKS, TierKey } from "@/lib/constants";

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
};

const trustBadges = [
  { icon: "🔒", title: "14-day money-back", sub: "No questions asked" },
  { icon: "⚡", title: "Cancel anytime", sub: "No lock-in, ever" },
  { icon: "🇪🇺", title: "EU data residency", sub: "GDPR compliant" },
  { icon: "✨", title: "7-day free trial", sub: "On all paid plans" },
];

const personas = [
  {
    tier: "Free",
    emoji: "👋",
    headline: "Testing the waters",
    desc: "Your first complete sell is on us — photos, listing, and pricing. 3 credits a month after that. No card required.",
  },
  {
    tier: "Pro",
    emoji: "💪",
    headline: "Side hustlers",
    desc: "Selling up to 200 items and want professional-looking listings without the effort. Pro pays for itself the first time you avoid underpricing.",
    highlight: true,
  },
  {
    tier: "Business",
    emoji: "🚀",
    headline: "Full-time resellers",
    desc: "Up to 1,000 items tracked, AI Model Shots for standout listings, and multi-language support to sell across 18 Vinted markets.",
  },
];

const comparisonFeatures = [
  { name: "Credits / month", free: "3", pro: "50", business: "200" },
  { name: "Photo Studio (bg removal, enhance)", free: "✓", pro: "✓", business: "✓" },
  { name: "Photo Studio (flat-lay, mannequin)", free: "—", pro: "✓", business: "✓" },
  { name: "AI Model Shots", free: "—", pro: "—", business: "✓" },
  { name: "AI Price Check", free: "First item", pro: "✓", business: "✓" },
  { name: "AI Listing Optimiser", free: "First item", pro: "✓", business: "✓" },
  { name: "Trend Radar", free: "Top 3", pro: "Full", business: "Full" },
  { name: "Niche Finder", free: "—", pro: "✓", business: "✓" },
  { name: "Multi-language listings", free: "—", pro: "—", business: "✓ (FR, DE, NL, ES)" },
  { name: "Bulk Listing Optimiser", free: "—", pro: "—", business: "✓" },
  { name: "Import from Vinted URL", free: "✓", pro: "✓", business: "✓" },
  { name: "Items tracked", free: "10", pro: "200", business: "1,000" },
  { name: "Support", free: "Community", pro: "Email", business: "Priority" },
];

const faqs = [
  {
    q: "How quickly will I see results?",
    a: "Most sellers get their first AI price recommendation within 90 seconds of signing up. Sign up, paste a Vinted URL, and you'll have a confidence-scored price report before you've finished your tea.",
  },
  {
    q: "What if I only sell a few items a month?",
    a: "Free plan gives you 3 credits — that's one Photo Studio edit, one price check, and one listing optimisation. Enough to try a complete sell. No card required.",
  },
  {
    q: "Does it work on all Vinted categories?",
    a: "Yes — Vintifi works across womenswear, menswear, shoes, accessories, kids, vintage, and designer categories across all 18 Vinted markets including the UK, France, Germany, Netherlands, Spain, and more.",
  },
  {
    q: "What's a credit?",
    a: "One credit = one action. A Price Check costs 1 credit. An AI Listing Optimisation costs 1 credit. A Vintography photo edit (background removal, AI Model, Mannequin, or Flat-Lay) costs 1 credit. Credits reset monthly on your billing date.",
  },
  {
    q: "What can I do with Vintography Photo Studio?",
    a: "Three modes: AI Model (place your garment on a photorealistic male or female model — Editorial, Natural Photo, or Street Style), Mannequin (Headless, Ghost, Dress Form, or Half-Body), and Flat-Lay Pro (5 styling presets). All include 16 background scene options.",
  },
  {
    q: "Can I really start for free?",
    a: "Absolutely. Our Free plan gives you 3 credits per month — no credit card required. That's one Photo Studio edit, one price check, and one listing optimisation. Enough to see the value before committing.",
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

  usePageMeta("Pricing — Vintifi", "Start free with 3 credits. Studio photos without a studio. AI pricing in 30 seconds. Pro from £9.99/month. 14-day money-back guarantee.");

  const PUBLIC_TIERS: TierKey[] = ["free", "pro", "business"];
  const tiers = (Object.entries(STRIPE_TIERS) as [TierKey, (typeof STRIPE_TIERS)[TierKey]][]).filter(
    ([key]) => PUBLIC_TIERS.includes(key)
  );

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
              The plan pays for itself
              <br />
              <span className="text-gradient">on day one.</span>
            </motion.h1>
            <motion.p variants={fadeUp} className="text-sm sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-2">
              Studio photos without a studio. AI pricing without the research. Start free — your first complete sell is on us.
            </motion.p>
            <motion.p variants={fadeUp} className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto mb-8 sm:mb-12">
              Start free — no card required. Every paid plan includes a 7-day free trial.
            </motion.p>

            {/* Photo Studio Before/After Visual */}
            <motion.div
              variants={fadeUp}
              className="max-w-sm mx-auto mb-8 sm:mb-12"
            >
              <BeforeAfterSlider
                beforeSrc="/marketing/denim-dress-before.png"
                afterSrc="/marketing/denim-dress-after.png"
                beforeLabel="Phone snap"
                afterLabel="Studio shot"
                badge="AI Model + Deep Steam"
                aspectRatio="4/5"
              />
              <p className="text-[11px] sm:text-xs text-muted-foreground text-center mt-3">
                Included in every plan. Your first 3 credits are free — no card required.
              </p>
            </motion.div>

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

      {/* Trust badges */}
      <section className="pb-6 sm:pb-10">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 max-w-4xl mx-auto">
            {trustBadges.map((b, i) => (
              <motion.div
                key={b.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="flex flex-col items-center text-center p-3 sm:p-4 rounded-xl border border-border bg-card"
              >
                <span className="text-2xl mb-1.5">{b.icon}</span>
                <p className="font-semibold text-xs sm:text-sm text-foreground">{b.title}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">{b.sub}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Results banner */}
      <section className="pb-6 sm:pb-10">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto rounded-2xl bg-primary/10 border border-primary/20 p-4 sm:p-6 text-center"
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <Star className="w-4 h-4 text-primary fill-primary" />
              <Star className="w-4 h-4 text-primary fill-primary" />
              <Star className="w-4 h-4 text-primary fill-primary" />
              <Star className="w-4 h-4 text-primary fill-primary" />
              <Star className="w-4 h-4 text-primary fill-primary" />
            </div>
            <p className="font-display text-base sm:text-xl font-extrabold text-foreground mb-1">
              Phone snap to studio shot in one tap. AI pricing in 30 seconds. Your first 3 credits are free.
            </p>
            <p className="text-muted-foreground text-xs sm:text-sm">The plan pays for itself the first time you avoid underpricing an item.</p>
          </motion.div>
        </div>
      </section>

      {/* Pricing cards */}
      <section className="pb-10 sm:pb-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-5 max-w-5xl mx-auto">
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
                        <p className="text-[10px] sm:text-xs text-success font-medium mt-1">7-day free trial included</p>
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

      {/* Who is this for? */}
      <section className="py-10 sm:py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.h2
            className="font-display text-xl sm:text-3xl md:text-4xl font-extrabold text-center mb-3 sm:mb-4"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            Which plan is right for you?
          </motion.h2>
          <motion.p
            className="text-center text-muted-foreground text-sm sm:text-base mb-8 sm:mb-12 max-w-xl mx-auto"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            Different sellers, different needs. Here's where most people land.
          </motion.p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 max-w-4xl mx-auto">
            {personas.map((p, i) => (
              <motion.div
                key={p.tier}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                <Card className={`p-4 sm:p-5 h-full transition-all duration-300 ${p.highlight ? "border-primary ring-1 ring-primary shadow-xl shadow-primary/10" : "border-border/50"}`}>
                  <div className="text-2xl mb-2">{p.emoji}</div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{p.tier}</span>
                  </div>
                  <h3 className="font-display font-bold text-sm sm:text-base mb-2">{p.headline}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Credit Packs */}
      <section className="py-10 sm:py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-6 sm:mb-10">
            <h2 className="font-display text-lg sm:text-2xl md:text-3xl font-extrabold mb-2">Need a top-up?</h2>
            <p className="text-muted-foreground text-sm sm:text-base">One-time credit packs — no subscription required. Never expire.</p>
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
        </div>
      </section>

      {/* Comparison table */}
      <section className="py-10 sm:py-20 bg-muted/30">
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
          <div className="hidden lg:block max-w-4xl mx-auto">
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="grid grid-cols-4 bg-muted/50 border-b border-border sticky top-0 z-10">
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
                  className={`grid grid-cols-4 border-b border-border last:border-0 ${i % 2 === 0 ? "" : "bg-muted/20"}`}
                >
                  <div className="p-4 text-sm text-foreground">{feature.name}</div>
                  <div className="p-4 text-center text-sm text-muted-foreground">{feature.free}</div>
                  <div className={`p-4 text-center text-sm bg-primary/5 ${feature.pro === "—" ? "text-muted-foreground" : "text-foreground font-medium"}`}>{feature.pro}</div>
                  <div className={`p-4 text-center text-sm ${feature.business === "—" ? "text-muted-foreground" : "text-foreground font-medium"}`}>{feature.business}</div>
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
      <section className="py-10 sm:py-20">
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
            <motion.h2 variants={fadeUp} className="font-display text-xl sm:text-3xl md:text-4xl font-bold mb-2 sm:mb-3 text-secondary-foreground">
              Start free today. See results tonight.
            </motion.h2>
            <motion.p variants={fadeUp} className="text-secondary-foreground/70 text-sm sm:text-base mb-2 max-w-xl mx-auto">
              Your first 3 credits are waiting — no card needed.
            </motion.p>
            <motion.p variants={fadeUp} className="text-secondary-foreground/50 text-xs sm:text-sm mb-6 sm:mb-8">
              One studio shot. One price check. One optimised listing. A complete first sell — on us.
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button size="lg" onClick={() => navigate("/auth?mode=signup")} className="text-sm sm:text-base font-semibold px-8 h-12 shadow-xl shadow-primary/20 w-full sm:w-auto active:scale-95 transition-transform">
                Get Started Free <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/pricing")} className="text-sm sm:text-base h-12 w-full sm:w-auto active:scale-95 transition-transform border-secondary-foreground/20 text-secondary-foreground hover:bg-secondary-foreground/10">
                Compare all plans
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </MarketingLayout>
  );
}
