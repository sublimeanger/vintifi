import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Sparkles, Globe } from "lucide-react";
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

      // Redeem referral code if present
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
          {SELLING_CATEGORIES.map((c) => (
            <Badge
              key={c}
              variant={categories.includes(c) ? "default" : "outline"}
              className="cursor-pointer px-4 py-2 text-sm transition-all hover:scale-105"
              onClick={() => toggleCategory(c)}
            >
              {c}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      title: "How many active listings?",
      subtitle: "This helps us tailor your experience",
      content: (
        <div className="grid grid-cols-2 gap-3">
          {LISTING_COUNTS.map((c) => (
            <Card
              key={c}
              className={`p-4 cursor-pointer text-center transition-all hover:scale-105 ${listingCount === c ? "border-primary ring-1 ring-primary bg-primary/5" : ""}`}
              onClick={() => setListingCount(c)}
            >
              <span className="font-display font-bold text-lg">{c}</span>
            </Card>
          ))}
        </div>
      ),
    },
    {
      title: "What's your main goal?",
      subtitle: "We'll prioritise features that matter most",
      content: (
        <div className="space-y-3">
          {PRIMARY_GOALS.map((g) => (
            <Card
              key={g.value}
              className={`p-4 cursor-pointer transition-all hover:scale-[1.02] ${goal === g.value ? "border-primary ring-1 ring-primary bg-primary/5" : ""}`}
              onClick={() => setGoal(g.value)}
            >
              <span className="font-medium">{g.label}</span>
            </Card>
          ))}
        </div>
      ),
    },
    {
      title: "What's your timezone?",
      subtitle: "We'll schedule alerts and recommendations in your local time",
      content: (
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {TIMEZONES.map((tz) => (
            <Card
              key={tz.value}
              className={`p-3 cursor-pointer transition-all hover:scale-[1.02] ${timezone === tz.value ? "border-primary ring-1 ring-primary bg-primary/5" : ""}`}
              onClick={() => setTimezone(tz.value)}
            >
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium text-sm">{tz.label}</span>
              </div>
            </Card>
          ))}
        </div>
      ),
    },
  ];

  const totalSteps = steps.length;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-lg p-8">
        {/* Progress */}
        <div className="flex gap-2 mb-8">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-muted"}`}
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
            <div className="mb-2 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="text-sm text-muted-foreground font-medium">Step {step + 1} of {totalSteps}</span>
            </div>
            <h2 className="font-display text-2xl font-bold mb-1">{steps[step].title}</h2>
            <p className="text-muted-foreground text-sm mb-6">{steps[step].subtitle}</p>
            {steps[step].content}
          </motion.div>
        </AnimatePresence>

        <div className="flex justify-between mt-8">
          <Button variant="ghost" onClick={() => setStep((s) => s - 1)} disabled={step === 0}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          {step < totalSteps - 1 ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={!canProceed()}>
              Next <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleFinish} disabled={!canProceed() || loading}>
              {loading ? "Setting up..." : "Let's Go! 🚀"}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
