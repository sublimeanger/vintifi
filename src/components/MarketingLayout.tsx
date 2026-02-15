import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";

const navLinks = [
  { to: "/", label: "Home" },
  { to: "/features", label: "Features" },
  { to: "/pricing", label: "Pricing" },
  { to: "/how-it-works", label: "How It Works" },
  { to: "/about", label: "About" },
];

const footerProduct = [
  { to: "/features", label: "Features" },
  { to: "/pricing", label: "Pricing" },
  { to: "/how-it-works", label: "How It Works" },
];

const footerCompany = [
  { to: "/about", label: "About" },
];

const stats = [
  { value: "10,000+", label: "Active Sellers" },
  { value: "500K+", label: "Price Checks" },
  { value: "18", label: "Countries" },
];

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 glass">
        <nav className="container mx-auto flex items-center justify-between py-4 px-4">
          <Link to="/" className="font-display text-2xl font-extrabold tracking-tight">
            <span className="text-gradient">Vintifi</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`text-sm font-medium transition-colors ${
                  pathname === link.to
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
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

      {/* Content */}
      <main className="flex-1">{children}</main>

      {/* Social proof bar */}
      <section className="border-t border-border bg-muted/30 py-10">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-16">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <p className="font-display text-3xl font-extrabold text-foreground">{s.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-16 bg-secondary text-secondary-foreground">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <p className="font-display text-2xl font-extrabold mb-3">
                <span className="text-gradient">Vintifi</span>
              </p>
              <p className="text-secondary-foreground/70 text-sm leading-relaxed">
                AI-powered intelligence for Vinted sellers. Price smarter. Sell faster.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="font-semibold text-sm uppercase tracking-wider mb-4 text-secondary-foreground/50">Product</h4>
              <ul className="space-y-2.5">
                {footerProduct.map((l) => (
                  <li key={l.to}>
                    <Link to={l.to} className="text-sm text-secondary-foreground/70 hover:text-secondary-foreground transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="font-semibold text-sm uppercase tracking-wider mb-4 text-secondary-foreground/50">Company</h4>
              <ul className="space-y-2.5">
                {footerCompany.map((l) => (
                  <li key={l.to}>
                    <Link to={l.to} className="text-sm text-secondary-foreground/70 hover:text-secondary-foreground transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA */}
            <div>
              <h4 className="font-semibold text-sm uppercase tracking-wider mb-4 text-secondary-foreground/50">Get Started</h4>
              <p className="text-sm text-secondary-foreground/70 mb-4">Join thousands of sellers already using Vintifi.</p>
              <Button size="sm" onClick={() => navigate("/auth?mode=signup")} className="font-semibold">
                Start Free <ArrowRight className="ml-1.5 w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          <div className="border-t border-secondary-foreground/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-secondary-foreground/40">© {new Date().getFullYear()} Vintifi. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <span className="text-xs text-secondary-foreground/40">Privacy Policy</span>
              <span className="text-xs text-secondary-foreground/40">Terms of Service</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
