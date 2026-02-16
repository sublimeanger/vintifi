import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { AppShellV2 } from "@/components/AppShellV2";

interface PageShellProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  backTo?: string;
  actions?: ReactNode;
  children: ReactNode;
  maxWidth?: string;
}

export function PageShell({
  title,
  subtitle,
  icon,
  backTo = "/dashboard",
  actions,
  children,
  maxWidth = "max-w-5xl",
}: PageShellProps) {
  const navigate = useNavigate();

  return (
    <AppShellV2 maxWidth={maxWidth}>
      {/* Page header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(backTo)} className="shrink-0 h-10 w-10 -ml-2">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="font-display font-bold text-base sm:text-lg flex items-center gap-2 truncate">
            {icon}
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {children}
      </motion.div>
    </AppShellV2>
  );
}
