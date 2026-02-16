import { Progress } from "@/components/ui/progress";
import { Sparkles } from "lucide-react";

type Props = {
  used: number;
  limit: number;
  unlimited?: boolean;
};

export function CreditBar({ used, limit, unlimited }: Props) {
  if (unlimited) {
    return (
      <div className="flex items-center gap-3 px-1">
        <Sparkles className="w-4 h-4 shrink-0 text-primary" />
        <span className="text-xs font-semibold text-muted-foreground">Unlimited edits</span>
      </div>
    );
  }

  const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const isLow = limit - used <= 2;
  const isEmpty = used >= limit;

  return (
    <div className="flex items-center gap-3 px-1">
      <Sparkles className={`w-4 h-4 shrink-0 ${isEmpty ? "text-destructive" : isLow ? "text-accent" : "text-primary"}`} />
      <Progress
        value={pct}
        className={`h-2 flex-1 ${isEmpty ? "[&>div]:bg-destructive" : isLow ? "[&>div]:bg-accent" : ""}`}
      />
      <span className={`text-xs font-semibold tabular-nums shrink-0 ${isEmpty ? "text-destructive" : isLow ? "text-accent" : "text-muted-foreground"}`}>
        {used}/{limit} edits
      </span>
    </div>
  );
}
