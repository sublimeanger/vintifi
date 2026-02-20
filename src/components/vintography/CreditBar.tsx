import { Progress } from "@/components/ui/progress";
import { Sparkles } from "lucide-react";

type Props = {
  used: number;
  limit: number;
  unlimited?: boolean;
  loading?: boolean;
};

export function CreditBar({ used, limit, unlimited, loading }: Props) {
  if (loading) {
    return (
      <div className="flex items-center gap-3 px-1 lg:px-2">
        <Sparkles className="w-4 h-4 lg:w-5 lg:h-5 shrink-0 text-muted-foreground animate-pulse" />
        <div className="h-2 flex-1 bg-muted rounded-full" />
        <div className="h-3 w-20 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (unlimited) {
    return (
      <div className="flex items-center gap-3 px-1 lg:px-2">
        <Sparkles className="w-4 h-4 lg:w-5 lg:h-5 shrink-0 text-primary" />
        <span className="text-xs lg:text-sm font-semibold text-muted-foreground">Unlimited edits</span>
      </div>
    );
  }

  const remaining = Math.max(0, limit - used);
  const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const isLow = remaining <= 2;
  const isEmpty = remaining <= 0;

  return (
    <div className="flex items-center gap-3 px-1 lg:px-2">
      <Sparkles className={`w-4 h-4 lg:w-5 lg:h-5 shrink-0 ${isEmpty ? "text-destructive" : isLow ? "text-accent" : "text-primary"}`} />
      <Progress
        value={pct}
        className={`h-2 flex-1 ${isEmpty ? "[&>div]:bg-destructive" : isLow ? "[&>div]:bg-accent" : ""}`}
      />
      <span className={`text-xs lg:text-sm font-semibold tabular-nums shrink-0 ${isEmpty ? "text-destructive" : isLow ? "text-accent" : "text-muted-foreground"}`}>
        {isEmpty ? "No credits left" : `${remaining} of ${limit} credits left`}
      </span>
    </div>
  );
}
