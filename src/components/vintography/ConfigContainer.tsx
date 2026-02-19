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
 * On desktop: renders a plain scrollable div; footer is rendered inline below.
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

  // Desktop: inline scrollable section + sticky footer at bottom of left panel
  return (
    <div className="space-y-3">
      <div className="space-y-3">{children}</div>
      <div className="sticky bottom-4">{footer}</div>
    </div>
  );
}
