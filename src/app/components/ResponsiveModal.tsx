import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/app/components/ui/drawer";
import { cn } from "@/app/components/ui/utils";
import { useMediaQuery } from "@/app/hooks/useMediaQuery";

interface ResponsiveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  /** Rendered visibly under the title. When absent, an sr-only fallback keeps
   * the Radix a11y description satisfied. */
  description?: ReactNode;
  children: ReactNode;
  /** Extra classes on the desktop Dialog content (e.g. max-w-3xl). */
  contentClassName?: string;
}

/**
 * One modal shell for every viewport: a centred Radix Dialog on ≥ md, a vaul
 * bottom sheet below. Renders a single tree (conditional on the media query),
 * never both, so children mount exactly once.
 */
export function ResponsiveModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  contentClassName,
}: ResponsiveModalProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className={cn(
            // Glassy modal surface — explicit utilities (not `glass-panel`) so
            // tailwind-merge can drop DialogContent's default bg-background.
            "max-h-[90vh] overflow-y-auto border-white/10 bg-surface-raised/85 backdrop-blur-xl shadow-2xl text-white",
            contentClassName,
          )}
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description !== undefined ? (
              <DialogDescription className="text-sm text-white/60">{description}</DialogDescription>
            ) : (
              <DialogDescription className="sr-only">{title}</DialogDescription>
            )}
          </DialogHeader>
          {children}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{title}</DrawerTitle>
          {description !== undefined ? (
            <DrawerDescription>{description}</DrawerDescription>
          ) : (
            <DrawerDescription className="sr-only">{title}</DrawerDescription>
          )}
        </DrawerHeader>
        <div className="max-h-[92vh] overflow-y-auto px-4 pb-8">{children}</div>
      </DrawerContent>
    </Drawer>
  );
}
