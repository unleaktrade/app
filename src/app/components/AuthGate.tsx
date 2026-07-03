import { motion } from "motion/react";
import { Button } from "@/app/components/ui/button";
import { useAuth } from "@/app/providers/AuthProvider";
import logo from "figma:asset/6d73120824de2c8c6632c71cddef1ae782b1c254.png";

type AuthGateVariant = "restoring" | "signing";

const COPY: Record<AuthGateVariant, { title: string; hint: string }> = {
  restoring: {
    title: "Reconnecting your wallet…",
    hint: "Restoring your session from this tab.",
  },
  signing: {
    title: "Approve the sign-in request in your wallet",
    hint: "Check your wallet extension popup — we ask for a signature to verify ownership. No transaction, no fees.",
  },
};

/**
 * Full-screen interstitial shown while the wallet auth gate is in flight
 * (eager reconnect on refresh, or the signMessage prompt after connecting).
 * Replaces the blank screen both gates used to render — never flashes the
 * connect screen mid-restore (#27 guarantee).
 */
export function AuthGate({ variant }: { variant: AuthGateVariant }) {
  const { signOut } = useAuth();
  const { title, hint } = COPY[variant];

  return (
    <div className="min-h-screen bg-surface-page text-white dark flex flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="relative flex items-center justify-center">
        <motion.span
          className="absolute h-24 w-24 rounded-full border-2 border-transparent border-t-cyan-400/80 border-r-purple-500/60"
          animate={{ rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
        />
        <img src={logo} alt="UnleakTrade" className="h-12 w-12" />
      </div>

      <div className="space-y-2">
        <div className="text-lg font-semibold">{title}</div>
        <p className="mx-auto max-w-sm text-sm text-white/50">{hint}</p>
      </div>

      {variant === "signing" && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void signOut()}
          className="text-white/50 hover:bg-white/5 hover:text-white"
        >
          Cancel
        </Button>
      )}
    </div>
  );
}
