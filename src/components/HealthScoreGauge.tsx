import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";

export type HealthScoreData = {
  overall: number;
  title_score: number;
  description_score: number;
  photo_score: number;
  completeness_score: number;
  title_feedback?: string;
  description_feedback?: string;
  photo_feedback?: string;
  completeness_feedback?: string;
};

interface HealthScoreGaugeProps {
  score: HealthScoreData;
  /** Compact mode shows only the radial gauge without breakdowns */
  compact?: boolean;
  /** Size of the radial gauge */
  size?: "sm" | "md" | "lg";
}

function getScoreColor(score: number): string {
  if (score >= 80) return "text-success";
  if (score >= 60) return "text-accent";
  if (score >= 40) return "text-primary";
  return "text-destructive";
}

function getScoreStroke(score: number): string {
  if (score >= 80) return "hsl(var(--success))";
  if (score >= 60) return "hsl(var(--accent))";
  if (score >= 40) return "hsl(var(--primary))";
  return "hsl(var(--destructive))";
}

function getScoreLabel(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Fair";
  return "Needs Work";
}

function getBarScoreColor(score: number, max: number): string {
  const pct = (score / max) * 100;
  if (pct >= 80) return "text-success";
  if (pct >= 50) return "text-accent";
  return "text-destructive";
}

const SIZES = {
  sm: { svgSize: 80, radius: 32, stroke: 5, fontSize: "text-lg", labelSize: "text-[9px]" },
  md: { svgSize: 120, radius: 48, stroke: 6, fontSize: "text-3xl", labelSize: "text-[10px]" },
  lg: { svgSize: 160, radius: 64, stroke: 8, fontSize: "text-5xl", labelSize: "text-xs" },
};

export function HealthScoreGauge({ score, compact = false, size = "md" }: HealthScoreGaugeProps) {
  const { svgSize, radius, stroke, fontSize, labelSize } = SIZES[size];
  const circumference = 2 * Math.PI * radius;
  const progress = (score.overall / 100) * circumference;
  const dashOffset = circumference - progress;
  const center = svgSize / 2;

  return (
    <div className={compact ? "flex items-center gap-3" : ""}>
      {/* Radial Gauge */}
      <div className="relative flex items-center justify-center" style={{ width: svgSize, height: svgSize }}>
        <svg width={svgSize} height={svgSize} className="-rotate-90">
          {/* Background circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={stroke}
          />
          {/* Progress arc */}
          <motion.circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={getScoreStroke(score.overall)}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: dashOffset }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className={`font-display font-extrabold ${fontSize} ${getScoreColor(score.overall)}`}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            {score.overall}
          </motion.span>
          {size !== "sm" && (
            <span className={`${labelSize} text-muted-foreground font-medium`}>
              {getScoreLabel(score.overall)}
            </span>
          )}
        </div>
      </div>

      {/* Compact label */}
      {compact && (
        <div>
          <p className={`font-display font-bold text-sm ${getScoreColor(score.overall)}`}>
            {getScoreLabel(score.overall)}
          </p>
          <p className="text-[10px] text-muted-foreground">out of 100</p>
        </div>
      )}

      {/* Breakdown bars */}
      {!compact && (
        <div className="space-y-3 mt-4">
          {[
            { label: "Title Keywords", score: score.title_score, max: 25, feedback: score.title_feedback, icon: "📝" },
            { label: "Description Quality", score: score.description_score, max: 25, feedback: score.description_feedback, icon: "📄" },
            { label: "Photo Quality", score: score.photo_score, max: 25, feedback: score.photo_feedback, icon: "📸" },
            { label: "Price Competitiveness", score: score.completeness_score, max: 25, feedback: score.completeness_feedback, icon: "💰" },
          ].map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + i * 0.1 }}
            >
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="font-medium flex items-center gap-1.5">
                  <span className="text-xs">{item.icon}</span>
                  {item.label}
                </span>
                <span className={`font-bold ${getBarScoreColor(item.score, item.max)}`}>
                  {item.score}/{item.max}
                </span>
              </div>
              <Progress value={(item.score / item.max) * 100} className="h-2" />
              {item.feedback && (
                <p className="text-[11px] text-muted-foreground mt-0.5">{item.feedback}</p>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Mini inline gauge for use in listing cards / tables */
export function HealthScoreMini({ score }: { score: number | null }) {
  if (score === null) return <span className="text-xs text-muted-foreground">—</span>;

  const size = 36;
  const radius = 14;
  const strokeW = 3;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (score / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth={strokeW} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getScoreStroke(score)}
          strokeWidth={strokeW}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <span className={`absolute text-[10px] font-bold ${getScoreColor(score)}`}>{score}</span>
    </div>
  );
}
