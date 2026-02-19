import { ReactNode } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer: ReactNode;
  defaultHeightVh?: number;
};

export function ConfigDrawer({ open, onClose, title, children, footer, defaultHeightVh = 45 }: Props) {
  return (
    <Drawer open={open} onOpenChange={(o) => { if (!o) onClose(); }} modal={true}>
      {open && (
        <DrawerContent
          className="focus:outline-none"
          style={{ maxHeight: `${Math.min(defaultHeightVh + 10, 85)}vh` }}
        >
          <DrawerHeader className="pb-2">
            <DrawerTitle className="text-sm">{title}</DrawerTitle>
          </DrawerHeader>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-4 pb-2 space-y-3">
            {children}
          </div>

          {/* Pinned footer */}
          <DrawerFooter className="pt-2 pb-4">
            {footer}
          </DrawerFooter>
        </DrawerContent>
      )}
    </Drawer>
  );
}
