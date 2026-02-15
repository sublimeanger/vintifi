import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

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
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <header className="border-b border-border glass sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(backTo)} className="shrink-0 h-10 w-10">
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
      </header>

      <motion.div
        className={`container mx-auto px-4 py-6 ${maxWidth}`}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {children}
      </motion.div>
    </div>
  );
}
