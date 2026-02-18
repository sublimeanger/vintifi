import { useEffect, useRef } from "react";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useNavigate } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import MarketingLayout from "@/components/MarketingLayout";
import {
  ArrowRight, ArrowDown, TrendingDown, DollarSign, Clock,
  Database, Sparkles, Heart, Zap, Globe,
  BarChart3,
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};
const stagger = { visible: { transition: { staggerChildren: 0.15 } } };

function AnimatedCounter({ end, suffix = "", prefix = "" }: { end: number; suffix?: string; prefix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView || !ref.current) return;
    const duration = 1800;
    const startTime = performance.now();
    const animate = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(eased * end);
      if (ref.current) ref.current.textContent = `${prefix}${current.toLocaleString()}${suffix}`;
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [inView, end, suffix, prefix]);

  return <span ref={ref}>{prefix}0{suffix}</span>;
}

const painPoints = [
  { icon: TrendingDown, stat: 73, suffix: "%", title: "Sellers underprice their items", desc: "Without market data, most sellers leave money on the table with every listing." },
  { icon: Clock, stat: 45, suffix: " min", title: "Spent researching per item", desc: "Manual price research across multiple platforms is a massive time sink that doesn't scale." },
  { icon: DollarSign, stat: 2400, prefix: "£", suffix: "", title: "Lost annually per seller", desc: "The combined cost of underpricing, stale inventory, and missed trends adds up fast." },
];

const solutionSteps = [
  { icon: Globe, label: "Market Data", desc: "We scrape thousands of listings across Vinted and competing platforms." },
  { icon: Sparkles, label: "AI Analysis", desc: "Our AI processes pricing patterns, trend signals, and demand indicators." },
  { icon: BarChart3, label: "Actionable Insights", desc: "You get clear, plain-English recommendations you can act on immediately." },
];

const values = [
  { icon: Database, title: "Data-Driven", desc: "Every recommendation is backed by real market data, not gut feeling. We analyse thousands of comparable listings to give you pricing confidence." },
  { icon: Heart, title: "Seller-First", desc: "Built by resellers who understand the hustle. Every feature exists because it solves a real problem we experienced ourselves." },
  { icon: Zap, title: "Beautifully Simple", desc: "Sophisticated intelligence shouldn't require a PhD. Our interface is as simple as a calculator while hiding powerful AI underneath." },
];

const stats = [
  { end: 18, suffix: "", label: "Vinted Markets Supported" },
  { end: 4, suffix: "", label: "Core AI Pillars" },
  { end: 8, suffix: "s", label: "Average Analysis Time" },
  { end: 15, suffix: "+", label: "Tools & Features" },
];

export default function About() {
  const navigate = useNavigate();

  usePageMeta("About — Vintifi", "Built for Vinted sellers who want to stop guessing and start earning more. Learn about the team behind Vintifi.");

  return (
    <MarketingLayout>
      {/* Hero */}
      <section className="py-12 sm:py-24 md:py-36 relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/4 left-0 w-[500px] h-[500px] rounded-full bg-primary/6 blur-[120px] float-animation" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-accent/6 blur-[100px] float-animation-delay" />
        </div>
        <div className="container mx-auto px-4 text-center">
          <motion.div initial="hidden" animate="visible" variants={stagger}>
            <motion.h1 variants={fadeUp} className="font-display text-2xl sm:text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.08] mb-4 sm:mb-6">
              Built by sellers,
              <br />
              <span className="text-gradient">for sellers</span>
            </motion.h1>
            <motion.p variants={fadeUp} className="text-sm sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              We believe every Vinted seller deserves the same data intelligence that powers enterprise e-commerce.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Mission */}
      <section className="py-8 sm:py-16 bg-muted/30">
        <div className="container mx-auto px-4 max-w-3xl">
          <motion.blockquote
            className="text-center relative"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <div className="absolute -top-4 left-0 sm:left-8 text-5xl sm:text-8xl font-serif text-primary/10 leading-none select-none">"</div>
            <div className="absolute -bottom-4 right-0 sm:right-8 text-5xl sm:text-8xl font-serif text-primary/10 leading-none select-none rotate-180">"</div>
            <div className="border-l-4 border-r-4 border-primary/20 px-4 sm:px-12 py-3 sm:py-4">
              <p className="font-display text-base sm:text-2xl md:text-3xl font-bold leading-relaxed text-foreground">
                Our mission is to <span className="text-gradient">democratise reselling intelligence</span> — giving every seller, from side-hustlers to full-time entrepreneurs, the tools to price perfectly, source smartly, and sell with confidence.
              </p>
            </div>
          </motion.blockquote>
        </div>
      </section>

      {/* The Problem */}
      <section className="py-10 sm:py-20">
        <div className="container mx-auto px-4">
          <motion.h2
            className="font-display text-xl sm:text-3xl md:text-4xl font-extrabold text-center mb-3 sm:mb-4"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            The Problem
          </motion.h2>
          <motion.p
            className="text-center text-muted-foreground text-sm sm:text-lg mb-6 sm:mb-12 max-w-xl mx-auto"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            Vinted has 100M+ users, yet most sellers operate completely blind.
          </motion.p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6 max-w-4xl mx-auto">
            {painPoints.map((p, i) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="p-3.5 sm:p-6 h-full text-center border-destructive/20 hover:shadow-lg transition-shadow">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-destructive/10 flex items-center justify-center mx-auto mb-2.5 sm:mb-4">
                    <p.icon className="w-5 h-5 sm:w-6 sm:h-6 text-destructive" />
                  </div>
                  <p className="font-display text-2xl sm:text-3xl font-extrabold text-destructive mb-1.5 sm:mb-2">
                    <AnimatedCounter end={p.stat} prefix={p.prefix || ""} suffix={p.suffix} />
                  </p>
                  <h3 className="font-semibold text-sm sm:text-base text-foreground mb-1 sm:mb-2">{p.title}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">{p.desc}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* The Solution */}
      <section className="py-10 sm:py-20 bg-muted/30">
        <div className="container mx-auto px-4 max-w-4xl">
          <motion.h2
            className="font-display text-xl sm:text-3xl md:text-4xl font-extrabold text-center mb-6 sm:mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            The Solution
          </motion.h2>
          <div className="flex flex-col md:flex-row items-stretch gap-3 sm:gap-4">
            {solutionSteps.map((step, i) => (
              <div key={step.label} className="flex-1 flex flex-col items-center">
                <motion.div
                  className="w-full"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15 }}
                >
                  <Card className="p-3.5 sm:p-6 text-center h-full hover:shadow-lg transition-shadow group">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-2.5 sm:mb-4 group-hover:bg-primary/20 group-hover:shadow-lg group-hover:shadow-primary/10 transition-all">
                      <step.icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                    </div>
                    <h3 className="font-display font-bold text-sm sm:text-lg mb-1.5 sm:mb-2">{step.label}</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">{step.desc}</p>
                  </Card>
                </motion.div>
                {i < solutionSteps.length - 1 && (
                  <>
                    <div className="hidden md:flex items-center justify-center py-0 -my-3 z-10">
                      <div className="w-8 h-8 rounded-full bg-card border-2 border-primary/30 flex items-center justify-center shadow">
                        <ArrowRight className="w-3.5 h-3.5 text-primary" />
                      </div>
                    </div>
                    <div className="flex md:hidden items-center justify-center -my-0.5 z-10">
                      <div className="w-7 h-7 rounded-full bg-card border-2 border-primary/30 flex items-center justify-center shadow">
                        <ArrowDown className="w-3 h-3 text-primary" />
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-10 sm:py-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8 max-w-4xl mx-auto">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <p className="font-display text-2xl sm:text-4xl md:text-5xl font-extrabold text-foreground">
                  <AnimatedCounter end={s.end} suffix={s.suffix} />
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-2">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-10 sm:py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.h2
            className="font-display text-xl sm:text-3xl md:text-4xl font-extrabold text-center mb-6 sm:mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            Our Values
          </motion.h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6 max-w-4xl mx-auto">
            {values.map((v, i) => (
              <motion.div
                key={v.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="p-3.5 sm:p-6 h-full text-center group hover:shadow-lg transition-shadow">
                  <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3 sm:mb-5 group-hover:bg-primary/20 group-hover:shadow-lg group-hover:shadow-primary/10 transition-all">
                    <v.icon className="w-5 h-5 sm:w-7 sm:h-7 text-primary" />
                  </div>
                  <h3 className="font-display font-bold text-base sm:text-xl mb-1.5 sm:mb-3">{v.title}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{v.desc}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-12 sm:py-24">
        <div className="container mx-auto px-4 text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.h2 variants={fadeUp} className="font-display text-xl sm:text-3xl md:text-5xl font-extrabold mb-3 sm:mb-4">
              Join the movement
            </motion.h2>
            <motion.p variants={fadeUp} className="text-muted-foreground text-sm sm:text-lg mb-6 sm:mb-8 max-w-xl mx-auto">
              Vinted sellers are using Vintifi to transform their reselling business. Start free today.
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
