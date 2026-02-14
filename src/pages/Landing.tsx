import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Zap, TrendingUp, BarChart3, Shield, ArrowRight, Sparkles } from "lucide-react";
import { STRIPE_TIERS, TierKey } from "@/lib/constants";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
};

const features = [
  { icon: Zap, title: "Instant Price Intelligence", desc: "Paste a Vinted URL and get AI-powered pricing in under 8 seconds." },
  { icon: TrendingUp, title: "Market Trend Analysis", desc: "See real-time price distributions and comparable sold items." },
  { icon: BarChart3, title: "Confidence Scoring", desc: "Know exactly how reliable each price recommendation is." },
  { icon: Shield, title: "Data-Driven Decisions", desc: "Stop guessing — every price backed by market evidence." },
  { icon: Sparkles, title: "AI Insights", desc: "Plain-English explanations of why items are priced the way they are." },
  { icon: ArrowRight, title: "One-Click Apply", desc: "Apply recommended prices directly to your listings." },
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-50 glass">
        <nav className="container mx-auto flex items-center justify-between py-4 px-4">
          <Link to="/" className="font-display text-2xl font-extrabold tracking-tight">
            <span className="text-gradient">Raqkt</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>
              Sign in
            </Button>
            <Button size="sm" onClick={() => navigate("/auth?mode=signup")} className="font-semibold">
              Get Started Free
            </Button>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 pt-20 pb-32">
        <motion.div
          className="max-w-3xl mx-auto text-center"
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.12 } } }}
        >
          <motion.div variants={fadeUp} custom={0}>
            <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-sm font-medium">
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              AI-Powered Vinted Intelligence
            </Badge>
          </motion.div>
          <motion.h1
            variants={fadeUp}
            custom={1}
            className="font-display text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6"
          >
            Stop guessing.
            <br />
            <span className="text-gradient">Start selling smarter.</span>
          </motion.h1>
          <motion.p variants={fadeUp} custom={2} className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Raqkt analyses the Vinted marketplace in real-time and tells you the optimal price for any item — backed by AI and market data.
          </motion.p>
          <motion.div variants={fadeUp} custom={3} className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={() => navigate("/auth?mode=signup")} className="text-base font-semibold px-8 h-12">
              Start Free — No Card Required
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })} className="text-base h-12">
              See How It Works
            </Button>
          </motion.div>
        </motion.div>

        {/* Mock UI Preview */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="mt-20 max-w-4xl mx-auto"
        >
          <div className="rounded-2xl border border-border bg-card p-6 shadow-2xl shadow-primary/5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-destructive/60" />
              <div className="w-3 h-3 rounded-full bg-accent/60" />
              <div className="w-3 h-3 rounded-full bg-success/60" />
              <span className="ml-3 text-xs text-muted-foreground font-mono">raqkt.com/dashboard</span>
            </div>
            <div className="rounded-xl bg-muted/50 p-8 text-center">
              <p className="text-sm text-muted-foreground mb-2">Paste a Vinted URL to get started</p>
              <div className="max-w-lg mx-auto flex gap-2">
                <div className="flex-1 h-10 rounded-lg bg-background border border-border flex items-center px-3">
                  <span className="text-muted-foreground text-sm">https://www.vinted.co.uk/items/...</span>
                </div>
                <div className="h-10 px-6 rounded-lg bg-primary text-primary-foreground flex items-center text-sm font-semibold">
                  Analyse
                </div>
              </div>
              <div className="mt-6 grid grid-cols-3 gap-4">
                <div className="rounded-lg bg-card p-4 border border-border">
                  <p className="text-2xl font-display font-bold text-foreground">£24.50</p>
                  <p className="text-xs text-success font-medium">Recommended Price</p>
                </div>
                <div className="rounded-lg bg-card p-4 border border-border">
                  <p className="text-2xl font-display font-bold text-foreground">87%</p>
                  <p className="text-xs text-muted-foreground font-medium">Confidence</p>
                </div>
                <div className="rounded-lg bg-card p-4 border border-border">
                  <p className="text-2xl font-display font-bold text-foreground">12</p>
                  <p className="text-xs text-muted-foreground font-medium">Comparables Found</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">Everything you need to sell smarter</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Raqkt combines web scraping, AI analysis, and market intelligence into one seamless tool.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                <Card className="p-6 h-full hover:shadow-lg hover:shadow-primary/5 transition-shadow border-border/50">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <f.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-display font-bold text-lg mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">Simple, transparent pricing</h2>
            <p className="text-muted-foreground text-lg">Start free. Upgrade when you're ready.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {(Object.entries(STRIPE_TIERS) as [TierKey, typeof STRIPE_TIERS[TierKey]][]).map(([key, tier], i) => {
              const isPopular = key === "pro";
              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Card className={`p-6 h-full relative flex flex-col ${isPopular ? "border-primary shadow-lg shadow-primary/10 ring-1 ring-primary" : "border-border/50"}`}>
                    {isPopular && (
                      <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                        Most Popular
                      </Badge>
                    )}
                    <div className="mb-6">
                      <h3 className="font-display font-bold text-lg">{tier.name}</h3>
                      <div className="mt-3">
                        <span className="font-display text-4xl font-extrabold">
                          {tier.price === 0 ? "Free" : `£${tier.price}`}
                        </span>
                        {tier.price > 0 && <span className="text-muted-foreground text-sm">/month</span>}
                      </div>
                    </div>
                    <ul className="space-y-3 mb-8 flex-1">
                      {tier.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-sm">
                          <Check className="w-4 h-4 text-success mt-0.5 shrink-0" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      variant={isPopular ? "default" : "outline"}
                      className="w-full font-semibold"
                      onClick={() => navigate("/auth?mode=signup")}
                    >
                      {tier.price === 0 ? "Get Started" : "Start Free Trial"}
                    </Button>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-secondary text-secondary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">Ready to sell smarter?</h2>
          <p className="text-secondary-foreground/70 text-lg mb-8 max-w-xl mx-auto">
            Join thousands of Vinted sellers who use Raqkt to price their items perfectly.
          </p>
          <Button size="lg" onClick={() => navigate("/auth?mode=signup")} className="text-base font-semibold px-8 h-12">
            Get Started Free
            <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="font-display font-bold text-lg">
            <span className="text-gradient">Raqkt</span>
          </p>
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} Raqkt. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
