import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Search, Tag, TrendingUp, Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const tabs = [
  { icon: LayoutDashboard, label: "Home", path: "/dashboard" },
  { icon: Search, label: "Price", path: "/price-check" },
  { icon: Tag, label: "Listings", path: "/listings" },
  { icon: TrendingUp, label: "Trends", path: "/trends" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

export function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/90 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-14">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors min-w-0 active:scale-95",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="bottom-nav-indicator"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              <tab.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
