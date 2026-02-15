import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Flame, Target } from "lucide-react";

function getOpportunityColor(score: number) {
  if (score >= 80) return "text-success";
  if (score >= 60) return "text-accent";
  if (score >= 40) return "text-orange-500";
  return "text-destructive";
}

type Props = {
  risingCount: number;
  peakingCount: number;
  decliningCount: number;
  avgOpportunity: number;
};

export default function TrendStats({ risingCount, peakingCount, decliningCount, avgOpportunity }: Props) {
  const stats = [
    { label: "Rising", value: risingCount.toString(), icon: TrendingUp, color: "text-success", tint: "border-success/10 bg-success/[0.03]" },
    { label: "Peaking", value: peakingCount.toString(), icon: Flame, color: "text-accent", tint: "border-accent/10 bg-accent/[0.03]" },
    { label: "Declining", value: decliningCount.toString(), icon: TrendingDown, color: "text-destructive", tint: "border-destructive/10 bg-destructive/[0.03]" },
    { label: "Avg Score", value: `${avgOpportunity}`, icon: Target, color: getOpportunityColor(avgOpportunity), tint: "border-primary/10 bg-primary/[0.03]" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-5 sm:mb-6">
      {stats.map((s, i) => (
        <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
          <Card className={`p-3 sm:p-4 ${s.tint}`}>
            <div className="flex items-center gap-1.5 mb-1">
              <s.icon className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${s.color}`} />
              <span className="text-[10px] sm:text-xs text-muted-foreground font-semibold uppercase tracking-wider">{s.label}</span>
            </div>
            <p className={`font-display text-xl sm:text-2xl font-bold ${s.color}`}>{s.value}</p>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
