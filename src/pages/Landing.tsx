import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Zap, TrendingUp, BarChart3, Shield, ArrowRight, Sparkles } from "lucide-react";
import { STRIPE_TIERS, TierKey } from "@/lib/constants";
import MarketingLayout from "@/components/MarketingLayout";

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

const trustedBrands = ["Nike", "Zara", "Carhartt WIP", "Levi's", "Adidas", "H&M", "Dr. Martens", "Ralph Lauren"];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <MarketingLayout>
      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Animated gradient mesh */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-[-10%] left-[10%] w-[500px] h-[500px] rounded-full bg-primary/8 blur-[120px] float-animation" />
          <div className="absolute bottom-[-10%] right-[10%] w-[400px] h-[400px] rounded-full bg-accent/8 blur-[100px] float-animation-delay" />
          <div className="absolute top-[30%] right-[30%] w-[300px] h-[300px] rounded-full bg-success/5 blur-[80px] float-animation" />
        </div>

        <div className="container mx-auto px-4 pt-16 sm:pt-24 pb-16">
          <motion.div
            className="max-w-3xl mx-auto text-center"
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.12 } } }}
          >
            <motion.h1
              variants={fadeUp}
              custom={1}
              className="font-display text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6"
            >
              Stop guessing.
              <br />
              <span className="text-gradient">Start selling smarter.</span>
            </motion.h1>
            <motion.p variants={fadeUp} custom={2} className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 sm:mb-10 px-2">
              Vintifi analyses the Vinted marketplace in real-time and tells you the optimal price for any item — backed by AI and market data.
            </motion.p>
            <motion.div variants={fadeUp} custom={3} className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4 sm:px-0">
              <Button size="lg" onClick={() => navigate("/auth?mode=signup")} className="text-base font-semibold px-8 h-12 w-full sm:w-auto shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-shadow">
                Start Free — No Card Required
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/how-it-works")} className="text-base h-12 w-full sm:w-auto">
                See How It Works
              </Button>
            </motion.div>
          </motion.div>

          {/* Mock UI Preview */}
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="mt-16 sm:mt-20 max-w-4xl mx-auto"
          >
            <div className="gradient-border p-[1.5px] rounded-2xl">
              <div className="rounded-2xl bg-card p-4 sm:p-6 shadow-2xl shadow-primary/5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-destructive/60" />
                  <div className="w-3 h-3 rounded-full bg-accent/60" />
                  <div className="w-3 h-3 rounded-full bg-success/60" />
                  <span className="ml-3 text-xs text-muted-foreground font-mono hidden sm:inline">vintifi.com/dashboard</span>
                </div>
                <div className="rounded-xl bg-muted/50 p-4 sm:p-8 text-center">
                  <p className="text-sm text-muted-foreground mb-2">Paste a Vinted URL to get started</p>
                  <div className="max-w-lg mx-auto flex gap-2">
                    <div className="flex-1 h-10 rounded-lg bg-background border border-border flex items-center px-3">
                      <span className="text-muted-foreground text-sm truncate">https://www.vinted.co.uk/items/...</span>
                    </div>
                    <div className="h-10 px-4 sm:px-6 rounded-lg bg-primary text-primary-foreground flex items-center text-sm font-semibold shrink-0">
                      Analyse
                    </div>
                  </div>
                  <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-4">
                    <div className="rounded-lg bg-card p-3 sm:p-4 border border-border">
                      <p className="text-lg sm:text-2xl font-display font-bold text-foreground">£24.50</p>
                      <p className="text-[10px] sm:text-xs text-success font-medium">Recommended Price</p>
                    </div>
                    <div className="rounded-lg bg-card p-3 sm:p-4 border border-border">
                      <p className="text-lg sm:text-2xl font-display font-bold text-foreground">87%</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Confidence</p>
                    </div>
                    <div className="rounded-lg bg-card p-3 sm:p-4 border border-border">
                      <p className="text-lg sm:text-2xl font-display font-bold text-foreground">12</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Comparables</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Trusted brands */}
      <section className="py-10 border-t border-border/50">
        <div className="container mx-auto px-4">
          <p className="text-xs uppercase tracking-widest text-muted-foreground text-center mb-5 font-medium">
            Trusted by sellers of top brands
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            {trustedBrands.map((brand) => (
              <span key={brand} className="text-sm font-semibold text-muted-foreground/60">{brand}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 sm:py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold mb-4">Everything you need to sell smarter</h2>
            <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
              Vintifi combines web scraping, AI analysis, and market intelligence into one seamless tool.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-5xl mx-auto">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                <Card className="p-5 sm:p-6 h-full hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300 border-border/50 group">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
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
      <section className="py-20 sm:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold mb-4">Simple, transparent pricing</h2>
            <p className="text-muted-foreground text-base sm:text-lg">Start free. Upgrade when you're ready.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 max-w-6xl mx-auto">
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
                  <Card className={`p-5 sm:p-6 h-full relative flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${isPopular ? "border-primary shadow-lg shadow-primary/10 ring-1 ring-primary animate-glow-pulse" : "border-border/50 hover:shadow-primary/5"}`}>
                    {isPopular && (
                      <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                        Most Popular
                      </Badge>
                    )}
                    <div className="mb-6">
                      <h3 className="font-display font-bold text-lg">{tier.name}</h3>
                      <div className="mt-3">
                        <span className="font-display text-3xl sm:text-4xl font-extrabold">
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
      <section className="relative py-20 sm:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-secondary via-secondary to-secondary">
          <div className="absolute top-0 left-1/4 w-[400px] h-[400px] rounded-full bg-primary/10 blur-[100px]" />
          <div className="absolute bottom-0 right-1/4 w-[300px] h-[300px] rounded-full bg-accent/10 blur-[80px]" />
        </div>
        <div className="container mx-auto px-4 text-center relative z-10">
          <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold mb-4 text-secondary-foreground">Ready to sell smarter?</h2>
          <p className="text-secondary-foreground/70 text-base sm:text-lg mb-8 max-w-xl mx-auto">
            Join thousands of Vinted sellers who use Vintifi to price their items perfectly.
          </p>
          <Button size="lg" onClick={() => navigate("/auth?mode=signup")} className="text-base font-semibold px-8 h-12 shadow-lg shadow-primary/25 w-full sm:w-auto">
            Get Started Free
            <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </div>
      </section>
    </MarketingLayout>
  );
}
