import type { ReactNode } from "react";
import { ChevronUp } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/app/components/ui/drawer";
import { cn } from "@/app/components/ui/utils";

interface RFQActionSheetProps {
  /** The CTA buttons legal for the connected wallet × current state. */
  children: ReactNode;
  title?: string;
  /** Layout for the inline (≥ md) rendering of the CTAs. */
  className?: string;
}

/**
 * Responsive home for the RFQ detail CTAs: inline on md and up; below md a
 * fixed bottom bar whose trigger opens a vaul bottom sheet with the same
 * actions, thumb-reachable.
 */
export function RFQActionSheet({ children, title = "Actions", className }: RFQActionSheetProps) {
  return (
    <>
      {/* Inline CTAs on tablet/desktop */}
      <div className={cn("hidden md:flex md:gap-3", className)}>{children}</div>

      {/* Bottom action bar + sheet on mobile */}
      <div className="md:hidden">
        <Drawer>
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-surface-page/90 p-3 backdrop-blur-xl">
            <DrawerTrigger asChild>
              <Button className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-600 hover:to-blue-600">
                <ChevronUp className="mr-2 h-4 w-4" />
                {title}
              </Button>
            </DrawerTrigger>
          </div>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>{title}</DrawerTitle>
            </DrawerHeader>
            <div className="flex flex-col gap-3 px-4 pb-8">{children}</div>
          </DrawerContent>
        </Drawer>
      </div>
    </>
  );
}
