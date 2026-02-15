import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Sparkles, Globe, Check } from "lucide-react";
import { SELLING_CATEGORIES, LISTING_COUNTS, PRIMARY_GOALS, TIMEZONES } from "@/lib/constants";

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [categories, setCategories] = useState<string[]>([]);
  const [listingCount, setListingCount] = useState("");
  const [goal, setGoal] = useState("");
  const [loading, setLoading] = useState(false);
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const detectedTz = useMemo(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return TIMEZONES.some((t) => t.value === tz) ? tz : "Europe/London";
  }, []);

  const [timezone, setTimezone] = useState(detectedTz);

  const toggleCategory = (c: string) =>
    setCategories((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));

  const canProceed = () => {
    if (step === 0) return categories.length > 0;
    if (step === 1) return !!listingCount;
    if (step === 2) return !!goal;
    if (step === 3) return !!timezone;
    return false;
  };

  const handleFinish = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          selling_categories: categories,
          active_listing_count: listingCount,
          primary_goal: goal,
          timezone: timezone,
          onboarding_completed: true,
        } as any)
        .eq("user_id", user.id);
      if (error) throw error;
      await refreshProfile();

      const refCode = localStorage.getItem("vintifi_referral_code");
      if (refCode) {
        try {
          const { data, error: refErr } = await supabase.functions.invoke("redeem-referral", {
            body: { referral_code: refCode },
          });
          if (!refErr && data?.success) {
            toast.success("Referral applied! You earned 5 bonus credits 🎉");
          }
        } catch {}
        localStorage.removeItem("vintifi_referral_code");
      }

      navigate("/dashboard");
      toast.success("Welcome to Vintifi! 🚀");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    {
      title: "What do you sell?",
      subtitle: "Select all categories that apply",
      content: (
        <div className="flex flex-wrap gap-2">
          {SELLING_CATEGORIES.map((c) => {
            const selected = categories.includes(c);
            return (
              <Badge
                key={c}
                variant={selected ? "default" : "outline"}
                className={`cursor-pointer px-3.5 py-2.5 sm:px-4 sm:py-2 text-xs sm:text-sm transition-all active:scale-95 select-none ${
                  selected ? "ring-1 ring-primary/30 shadow-sm" : "hover:border-primary/40"
                }`}
                onClick={() => toggleCategory(c)}
              >
                {selected && <Check className="w-3 h-3 mr-1 shrink-0" />}
                {c}
              </Badge>
            );
          })}
        </div>
      ),
    },
    {
      title: "How many active listings?",
      subtitle: "This helps us tailor your experience",
      content: (
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          {LISTING_COUNTS.map((c) => {
            const selected = listingCount === c;
            return (
              <Card
                key={c}
                className={`p-4 sm:p-5 cursor-pointer text-center transition-all active:scale-[0.97] select-none ${
                  selected ? "border-primary ring-1 ring-primary bg-primary/5 shadow-sm" : "hover:border-primary/30"
                }`}
                onClick={() => setListingCount(c)}
              >
                <span className="font-display font-bold text-base sm:text-lg">{c}</span>
              </Card>
            );
          })}
        </div>
      ),
    },
    {
      title: "What's your main goal?",
      subtitle: "We'll prioritise features that matter most",
      content: (
        <div className="space-y-2 sm:space-y-3">
          {PRIMARY_GOALS.map((g) => {
            const selected = goal === g.value;
            return (
              <Card
                key={g.value}
                className={`p-3.5 sm:p-4 cursor-pointer transition-all active:scale-[0.98] select-none ${
                  selected ? "border-primary ring-1 ring-primary bg-primary/5 shadow-sm" : "hover:border-primary/30"
                }`}
                onClick={() => setGoal(g.value)}
              >
                <div className="flex items-center gap-2">
                  {selected && <Check className="w-4 h-4 text-primary shrink-0" />}
                  <span className="font-medium text-sm sm:text-base">{g.label}</span>
                </div>
              </Card>
            );
          })}
        </div>
      ),
    },
    {
      title: "What's your timezone?",
      subtitle: "We'll schedule alerts in your local time",
      content: (
        <div className="space-y-1.5 max-h-56 sm:max-h-64 overflow-y-auto pr-1 -mr-1 scrollbar-hide">
          {TIMEZONES.map((tz) => {
            const selected = timezone === tz.value;
            return (
              <Card
                key={tz.value}
                className={`p-3 cursor-pointer transition-all active:scale-[0.98] select-none ${
                  selected ? "border-primary ring-1 ring-primary bg-primary/5" : "hover:border-primary/30"
                }`}
                onClick={() => setTimezone(tz.value)}
              >
                <div className="flex items-center gap-2">
                  <Globe className={`w-3.5 h-3.5 shrink-0 ${selected ? "text-primary" : "text-muted-foreground"}`} />
                  <span className="font-medium text-xs sm:text-sm">{tz.label}</span>
                  {selected && <Check className="w-3.5 h-3.5 text-primary ml-auto shrink-0" />}
                </div>
              </Card>
            );
          })}
        </div>
      ),
    },
  ];

  const totalSteps = steps.length;

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background px-4 py-6">
      <Card className="w-full max-w-lg p-5 sm:p-8">
        {/* Progress */}
        <div className="flex gap-1.5 sm:gap-2 mb-6 sm:mb-8">
          {steps.map((_, i) => (
            <motion.div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${i <= step ? "bg-primary" : "bg-muted"}`}
              initial={false}
              animate={{ scaleX: i <= step ? 1 : 0.95 }}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <div className="mb-1.5 sm:mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              <span className="text-[10px] sm:text-sm text-muted-foreground font-semibold uppercase tracking-wider">Step {step + 1} of {totalSteps}</span>
            </div>
            <h2 className="font-display text-xl sm:text-2xl font-bold mb-0.5 sm:mb-1">{steps[step].title}</h2>
            <p className="text-muted-foreground text-xs sm:text-sm mb-5 sm:mb-6">{steps[step].subtitle}</p>
            {steps[step].content}
          </motion.div>
        </AnimatePresence>

        <div className="flex justify-between mt-6 sm:mt-8 gap-3">
          <Button variant="ghost" onClick={() => setStep((s) => s - 1)} disabled={step === 0} className="h-11 sm:h-10 active:scale-95 transition-transform">
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
          </Button>
          {step < totalSteps - 1 ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={!canProceed()} className="h-11 sm:h-10 px-5 sm:px-4 active:scale-95 transition-transform">
              Next <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleFinish} disabled={!canProceed() || loading} className="h-11 sm:h-10 px-5 sm:px-4 active:scale-95 transition-transform">
              {loading ? "Setting up..." : "Let's Go! 🚀"}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
