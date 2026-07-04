import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { AnimatePresence, motion } from "motion/react";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/app/components/ui/drawer";
import { InboxIllustration } from "@/app/components/illustrations";
import { useMediaQuery } from "@/app/hooks/useMediaQuery";
import { useNotifications } from "@/app/hooks/useNotifications";
import { getStatusConfig } from "@/app/lib/rfq-visuals";
import { timeAgo, type AppNotification } from "@/app/lib/notifications";
import { cn } from "@/app/components/ui/utils";

/**
 * Navbar bell + inbox (issue #16 notification center). Desktop: a glass
 * popover panel (focus-managed, Escape / click-outside to dismiss — no new
 * Radix dep). Mobile: the vaul bottom sheet. Copy is role-neutral.
 */
export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const { items, unread, markAllRead } = useNotifications();

  const bell = (
    <Button
      variant="ghost"
      size="sm"
      aria-label={unread > 0 ? `Notifications (${unread} unread)` : "Notifications"}
      onClick={() => setOpen((o) => !o)}
      className="relative text-white/60 hover:text-white hover:bg-white/10"
    >
      <Bell className="h-4 w-4" />
      {unread > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-state-open px-1 text-[9px] font-bold text-black">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Button>
  );

  if (isDesktop) {
    return (
      <div className="relative">
        {bell}
        <AnimatePresence>
          {open && (
            <DesktopPanel
              items={items}
              onClose={() => setOpen(false)}
              onMarkAllRead={markAllRead}
            />
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <>
      {bell}
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Notifications</DrawerTitle>
            <DrawerDescription className="sr-only">
              State changes on RFQs you're involved in
            </DrawerDescription>
          </DrawerHeader>
          <div className="max-h-[70vh] overflow-y-auto px-4 pb-8">
            <NotificationList
              items={items}
              onMarkAllRead={markAllRead}
              onNavigated={() => setOpen(false)}
            />
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}

function DesktopPanel({
  items,
  onClose,
  onMarkAllRead,
}: {
  items: AppNotification[];
  onClose: () => void;
  onMarkAllRead: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    function onPointerDown(e: PointerEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("keydown", onKey);
    // Defer so the opening click doesn't immediately dismiss.
    const t = setTimeout(() => document.addEventListener("pointerdown", onPointerDown), 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [onClose]);

  return (
    <motion.div
      ref={panelRef}
      role="dialog"
      aria-label="Notifications"
      initial={{ opacity: 0, y: -6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.98 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="glass-panel absolute right-0 top-full z-50 mt-2 w-96 max-w-[90vw] rounded-xl p-3"
    >
      <NotificationList items={items} onMarkAllRead={onMarkAllRead} onNavigated={onClose} />
    </motion.div>
  );
}

function NotificationList({
  items,
  onMarkAllRead,
  onNavigated,
}: {
  items: AppNotification[];
  onMarkAllRead: () => void;
  onNavigated: () => void;
}) {
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-1 py-6 text-center">
        <InboxIllustration width={72} height={72} />
        <p className="text-sm text-white/50">Nothing yet</p>
        <p className="max-w-60 text-xs text-white/30">
          You'll see state changes here for RFQs you posted, quoted, or receive rewards on.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-white/40">
          Notifications
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onMarkAllRead}
          className="h-7 px-2 text-xs text-white/50 hover:text-white hover:bg-white/10"
        >
          <CheckCheck className="mr-1 h-3.5 w-3.5" />
          Mark all read
        </Button>
      </div>
      <ul className="max-h-96 space-y-1 overflow-y-auto">
        {items.map((n) => {
          const status = getStatusConfig(n.to);
          return (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => {
                  navigate(`/dashboard/rfq/${n.rfq}`);
                  onNavigated();
                }}
                className={cn(
                  "flex w-full items-start gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-white/5",
                  !n.read && "bg-white/[0.04]",
                )}
              >
                <span
                  className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", status.bgColor)}
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-white/90">
                    {n.pair} moved <span className="text-white/50">{n.from}</span> →{" "}
                    <span className={status.color}>{n.to}</span>
                  </span>
                  <span className="block text-xs text-white/40">{timeAgo(n.at)}</span>
                </span>
                {!n.read && (
                  <span
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-state-open"
                    aria-hidden
                  />
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
