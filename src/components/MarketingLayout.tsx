import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowUp, LayoutDashboard, Menu, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

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
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
      setShowBackToTop(window.scrollY > 600);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? "glass shadow-sm" : "bg-transparent border-transparent"}`}>
        <nav className="container mx-auto flex items-center justify-between py-4 px-4">
          <Link to="/" className="font-display text-2xl font-extrabold tracking-tight">
            <span className="text-gradient">Vintifi</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`text-sm font-medium transition-colors relative ${
                  pathname === link.to
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {link.label}
                {pathname === link.to && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute -bottom-1 left-0 right-0 h-0.5 bg-primary rounded-full"
                  />
                )}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <Button size="sm" onClick={() => navigate("/dashboard")} className="font-semibold">
                <LayoutDashboard className="w-4 h-4 mr-1.5" /> Dashboard
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate("/auth")} className="hidden sm:inline-flex">
                  Sign in
                </Button>
                <Button size="sm" onClick={() => navigate("/auth?mode=signup")} className="font-semibold">
                  Get Started Free
                </Button>
              </>
            )}
            {/* Mobile hamburger */}
            <Button variant="ghost" size="icon" className="md:hidden h-9 w-9" onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </nav>

        {/* Mobile menu */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden overflow-hidden border-t border-border bg-card"
            >
              <div className="container mx-auto px-4 py-4 space-y-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`block px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      pathname === link.to
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
                {!user && (
                  <div className="pt-2 border-t border-border mt-2">
                    <Button variant="ghost" size="sm" onClick={() => navigate("/auth")} className="w-full justify-start">
                      Sign in
                    </Button>
                  </div>
                )}
                {user && (
                  <div className="pt-2 border-t border-border mt-2">
                    <Button size="sm" onClick={() => navigate("/dashboard")} className="w-full justify-start font-semibold">
                      <LayoutDashboard className="w-4 h-4 mr-1.5" /> Go to Dashboard
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
                    <Link to={l.to} className="text-sm text-secondary-foreground/70 hover:text-secondary-foreground transition-colors hover:translate-x-0.5 inline-block">
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
                    <Link to={l.to} className="text-sm text-secondary-foreground/70 hover:text-secondary-foreground transition-colors hover:translate-x-0.5 inline-block">
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
              {user ? (
                <Button size="sm" onClick={() => navigate("/dashboard")} className="font-semibold">
                  Go to Dashboard <ArrowRight className="ml-1.5 w-3.5 h-3.5" />
                </Button>
              ) : (
                <Button size="sm" onClick={() => navigate("/auth?mode=signup")} className="font-semibold">
                  Start Free <ArrowRight className="ml-1.5 w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>

          <div className="border-t border-secondary-foreground/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-secondary-foreground/40">© {new Date().getFullYear()} Vintifi. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <span className="text-xs text-secondary-foreground/40 hover:text-secondary-foreground/60 transition-colors cursor-pointer">Privacy Policy</span>
              <span className="text-xs text-secondary-foreground/40 hover:text-secondary-foreground/60 transition-colors cursor-pointer">Terms of Service</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Back to top */}
      <AnimatePresence>
        {showBackToTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="fixed bottom-6 right-6 z-50 w-10 h-10 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 flex items-center justify-center hover:scale-110 transition-transform"
          >
            <ArrowUp className="w-4 h-4" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
