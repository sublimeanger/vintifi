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
    { label: "Rising", value: risingCount.toString(), icon: TrendingUp, color: "text-success" },
    { label: "Peaking", value: peakingCount.toString(), icon: Flame, color: "text-accent" },
    { label: "Declining", value: decliningCount.toString(), icon: TrendingDown, color: "text-destructive" },
    { label: "Avg Opportunity", value: `${avgOpportunity}`, icon: Target, color: getOpportunityColor(avgOpportunity) },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {stats.map((s, i) => (
        <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
              <span className="text-xs text-muted-foreground font-medium">{s.label}</span>
            </div>
            <p className="font-display text-xl font-bold">{s.value}</p>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
