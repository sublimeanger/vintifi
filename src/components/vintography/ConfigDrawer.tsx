import { useRef, ReactNode } from "react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer: ReactNode;
  defaultHeightVh?: number; // e.g. 50
};

export function ConfigDrawer({ open, onClose, title, children, footer, defaultHeightVh = 45 }: Props) {
  const dragControls = useDragControls();
  const constraintsRef = useRef<HTMLDivElement>(null);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop — semi-transparent, tap to dismiss */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-[2px]"
          />

          {/* Drawer */}
          <motion.div
            key="drawer"
            ref={constraintsRef}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 400, damping: 40 }}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 80) onClose();
            }}
            className="fixed left-0 right-0 bottom-0 z-50 flex flex-col rounded-t-2xl bg-card border-t border-border shadow-2xl"
            style={{ maxHeight: `${defaultHeightVh}vh` }}
          >
            {/* Drag handle */}
            <div
              onPointerDown={(e) => dragControls.start(e)}
              className="flex-shrink-0 flex flex-col items-center pt-3 pb-2 cursor-grab active:cursor-grabbing"
            >
              <div className="w-10 h-1 rounded-full bg-border" />
              {title && (
                <p className="text-xs font-semibold text-muted-foreground mt-2">{title}</p>
              )}
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-4 pb-2 space-y-3">
              {children}
            </div>

            {/* Pinned footer — always visible */}
            <div className="flex-shrink-0 px-4 py-3 border-t border-border bg-card">
              {footer}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
