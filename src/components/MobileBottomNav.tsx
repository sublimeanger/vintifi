import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Package, Search, Sparkles, ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const tabs = [
  { icon: LayoutDashboard, label: "Home", path: "/dashboard" },
  { icon: Package, label: "Items", path: "/listings" },
  { icon: Search, label: "Price", path: "/price-check" },
  { icon: Sparkles, label: "Optimise", path: "/optimize" },
  { icon: ImageIcon, label: "Photos", path: "/vintography" },
];

export function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-16">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-all min-w-0 active:scale-95",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="bottom-nav-pill"
                  className="absolute inset-x-2 inset-y-1.5 bg-primary/10 rounded-xl"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              <tab.icon className="w-[22px] h-[22px] relative z-10" />
              <span className={cn(
                "text-[10px] font-medium relative z-10",
                isActive && "font-semibold"
              )}>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
