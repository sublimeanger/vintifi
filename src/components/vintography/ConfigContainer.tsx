import { ReactNode } from "react";
import { ConfigDrawer } from "./ConfigDrawer";
import { useIsMobile } from "@/hooks/use-mobile";

type Props = {
  open: boolean;
  onClose: () => void;
  drawerTitle: string;
  drawerHeightVh?: number;
  children: ReactNode;
  footer: ReactNode;
};

/**
 * On mobile: renders a ConfigDrawer bottom sheet with footer pinned.
 * On desktop: renders a scroll-constrained panel with pinned footer.
 */
export function ConfigContainer({
  open,
  onClose,
  drawerTitle,
  drawerHeightVh = 55,
  children,
  footer,
}: Props) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <ConfigDrawer
        open={open}
        onClose={onClose}
        title={drawerTitle}
        footer={footer}
        defaultHeightVh={drawerHeightVh}
      >
        {children}
      </ConfigDrawer>
    );
  }

  // Desktop: scrollable config area with pinned Generate button
  return (
    <div className="flex flex-col rounded-xl border border-border bg-card overflow-hidden" style={{ maxHeight: "calc(100vh - 280px)" }}>
      {/* Scrollable config content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {children}
      </div>

      {/* Pinned footer — always visible */}
      <div className="flex-shrink-0 px-4 py-3 border-t border-border bg-card">
        {footer}
      </div>
    </div>
  );
}
