import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Mail, ArrowRight, Zap, TrendingUp, Shield, Sparkles } from "lucide-react";

const testimonialQuotes = [
  { quote: "Vintifi paid for itself in the first week. My pricing accuracy went from guesswork to 87%.", name: "Sarah K.", role: "Full-Time Reseller" },
  { quote: "I save 4+ hours a week on research alone. The AI listings practically write themselves.", name: "Marcus T.", role: "Side Hustler" },
];

export default function Auth() {
  const [searchParams] = useSearchParams();
  const defaultMode = searchParams.get("mode") === "signup" ? "signup" : "signin";

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) {
      localStorage.setItem("vintifi_referral_code", ref.toUpperCase());
    }
  }, [searchParams]);

  const [mode, setMode] = useState<"signin" | "signup">(defaultMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      if (profile && !profile.onboarding_completed) {
        navigate("/onboarding");
      } else {
        navigate("/dashboard");
      }
    }
  }, [user, profile, navigate]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        });
        if (error) throw error;
        toast.success("Check your email to confirm your account!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      toast.error(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async () => {
    if (!email) { toast.error("Enter your email first"); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) throw error;
      setMagicLinkSent(true);
      toast.success("Magic link sent! Check your email.");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (magicLinkSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-primary" />
          </div>
          <h2 className="font-display text-2xl font-bold mb-2">Check your email</h2>
          <p className="text-muted-foreground mb-6">We sent a magic link to <strong>{email}</strong></p>
          <Button variant="ghost" onClick={() => setMagicLinkSent(false)}>Go back</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background relative overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-accent/5 blur-[100px]" />
      </div>

      {/* Left brand panel — desktop only */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] bg-secondary text-secondary-foreground p-12 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-primary/10 blur-[100px]" />
        </div>
        <div className="relative z-10">
          <h1 className="font-display text-3xl font-extrabold mb-2">
            <span className="text-gradient">Vintifi</span>
          </h1>
          <p className="text-secondary-foreground/60 text-sm">Professional Vinted listings start here.</p>
        </div>

        <div className="relative z-10 space-y-6">
          <div className="space-y-4">
            {[
              { icon: Zap, text: "AI photo studio — transform any photo" },
              { icon: TrendingUp, text: "Smart listings — AI-written titles & descriptions" },
              { icon: Shield, text: "Market pricing — know what to charge" },
              { icon: Sparkles, text: "Your first item is completely free" },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <item.icon className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm text-secondary-foreground/80">{item.text}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-secondary-foreground/10 pt-6">
            <p className="text-sm text-secondary-foreground/60 italic mb-3">
              "{testimonialQuotes[0].quote}"
            </p>
            <p className="text-xs text-secondary-foreground/40">
              — {testimonialQuotes[0].name}, {testimonialQuotes[0].role}
            </p>
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-xs text-secondary-foreground/30">© {new Date().getFullYear()} Vintifi</p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <Card className="w-full max-w-md p-5 sm:p-8 shadow-xl border-border/50">
          <div className="text-center mb-5 sm:mb-8">
            <h1 className="font-display text-xl sm:text-2xl font-extrabold tracking-tight lg:hidden">
              <span className="text-gradient">Vintifi</span>
            </h1>
            <h2 className="font-display text-lg sm:text-2xl font-bold mt-1.5 lg:mt-0">
              {mode === "signup" ? "Create your account" : "Welcome back"}
            </h2>
            <p className="text-muted-foreground text-xs sm:text-sm mt-1">
              {mode === "signup" ? "Start selling smarter in under 90 seconds" : "Sign in to your dashboard"}
            </p>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-3 sm:space-y-4">
            {mode === "signup" && (
              <div>
                <Label htmlFor="name" className="text-xs sm:text-sm">Full Name</Label>
                <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" required className="h-11 text-base sm:text-sm" />
              </div>
            )}
            <div>
              <Label htmlFor="email" className="text-xs sm:text-sm">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required className="h-11 text-base sm:text-sm" />
            </div>
            <div>
              <Label htmlFor="password" className="text-xs sm:text-sm">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" minLength={6} required className="h-11 text-base sm:text-sm" />
              {mode === "signin" && (
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors mt-1.5 ml-auto block"
                  onClick={async () => {
                    if (!email.trim()) { toast.error("Enter your email address first"); return; }
                    try {
                      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
                        redirectTo: `${window.location.origin}/auth`,
                      });
                      if (error) throw error;
                      toast.success("Password reset link sent! Check your email.");
                    } catch {
                      toast.error("Failed to send reset link. Try again.");
                    }
                  }}
                >
                  Forgot password?
                </button>
              )}
            </div>
            <Button type="submit" className="w-full font-semibold h-12 sm:h-11 shadow-lg shadow-primary/20 active:scale-95 transition-transform" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "signup" ? "Create Account" : "Sign In"}
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </form>

          <div className="mt-3 sm:mt-4 space-y-2.5 sm:space-y-3">
            <Button variant="outline" className="w-full h-12 sm:h-11 active:scale-95 transition-transform" onClick={handleMagicLink} disabled={loading}>
              <Mail className="mr-2 h-4 w-4" />
              Sign in with Magic Link
            </Button>
          </div>

          <div className="mt-5 sm:mt-6 text-center">
            <button
              className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors py-2 active:scale-95"
              onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
            >
              {mode === "signup" ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
