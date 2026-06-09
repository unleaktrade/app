import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import type { PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { captureError } from "@/app/telemetry";
import { STORAGE_PREFIX, shouldAttemptRestore } from "@/app/providers/authSession";

type AuthErrorReason = "locked" | "rejected" | "unsupported" | "unknown";

export type AuthState =
  | { status: "disconnected" }
  // Eager reconnect in flight on a refresh — hold the UI (no connect-screen flash)
  // until it resolves to authenticated or disconnected.
  | { status: "restoring" }
  | { status: "pending"; publicKey: PublicKey; challenge: string }
  | { status: "authenticated"; publicKey: PublicKey; challenge: string; signature: Uint8Array }
  | { status: "error"; reason: AuthErrorReason };

export interface AuthContextValue {
  authenticated: boolean;
  state: AuthState;
  retry: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const ERROR_COPY: Record<AuthErrorReason, string> = {
  locked: "Please unlock your wallet and try again.",
  rejected: "Sign-in rejected.",
  unsupported: "This wallet doesn't support sign-in. Try Phantom, Solflare, or Backpack.",
  unknown: "Sign-in failed. Please try again.",
};

function storageKey(pubkey: PublicKey): string {
  return STORAGE_PREFIX + pubkey.toBase58();
}

function readCachedSignature(
  pubkey: PublicKey,
): { challenge: string; signature: Uint8Array } | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(storageKey(pubkey));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { challenge: string; signature: string };
    if (!parsed.challenge || !parsed.signature) return null;
    return { challenge: parsed.challenge, signature: bs58.decode(parsed.signature) };
  } catch {
    return null;
  }
}

function writeCachedSignature(pubkey: PublicKey, challenge: string, signature: Uint8Array): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(
    storageKey(pubkey),
    JSON.stringify({ challenge, signature: bs58.encode(signature) }),
  );
}

function clearCachedSignature(pubkey: PublicKey | null): void {
  if (typeof window === "undefined") return;
  if (pubkey) {
    window.sessionStorage.removeItem(storageKey(pubkey));
    return;
  }
  // remove all unleak.auth.* keys (cluster switch / blanket sign-out)
  const toRemove: string[] = [];
  for (let i = 0; i < window.sessionStorage.length; i += 1) {
    const key = window.sessionStorage.key(i);
    if (key?.startsWith(STORAGE_PREFIX)) toRemove.push(key);
  }
  toRemove.forEach((key) => window.sessionStorage.removeItem(key));
}

function classifyError(err: unknown): AuthErrorReason {
  if (!err) return "unknown";
  const name = err instanceof Error ? err.name : "";
  const message = err instanceof Error ? err.message : String(err);
  const lower = message.toLowerCase();
  if (lower.includes("not supported") || name === "WalletNotReadyError") return "unsupported";
  if (lower.includes("locked") || name === "WalletNotConnectedError") return "locked";
  if (
    lower.includes("user rejected") ||
    lower.includes("user denied") ||
    lower.includes("cancelled") ||
    lower.includes("canceled") ||
    name === "WalletSignMessageError"
  ) {
    return "rejected";
  }
  return "unknown";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { publicKey, connected, connecting, signMessage, disconnect } = useWallet();
  const [state, setState] = useState<AuthState>(() =>
    shouldAttemptRestore() ? { status: "restoring" } : { status: "disconnected" },
  );
  const [retryToken, setRetryToken] = useState(0);
  const lastPendingKey = useRef<string | null>(null);
  const sawConnectingRef = useRef(false);

  const retry = useCallback(() => {
    setRetryToken((n) => n + 1);
  }, []);

  const signOut = useCallback(async () => {
    clearCachedSignature(null);
    try {
      await disconnect();
    } catch (err) {
      captureError(err);
    }
    setState({ status: "disconnected" });
  }, [disconnect]);

  useEffect(() => {
    let cancelled = false;

    if (!connected || !publicKey) {
      lastPendingKey.current = null;
      // Don't clobber an in-flight eager reconnect; the connecting-resolution
      // effect below decides when to give up and fall to disconnected.
      setState((prev) => (prev.status === "restoring" ? prev : { status: "disconnected" }));
      return;
    }

    const pubkeyStr = publicKey.toBase58();
    const challengeNonceKey = `${pubkeyStr}:${retryToken}`;
    if (lastPendingKey.current === challengeNonceKey) {
      return;
    }
    lastPendingKey.current = challengeNonceKey;

    const cached = readCachedSignature(publicKey);
    if (cached) {
      setState({
        status: "authenticated",
        publicKey,
        challenge: cached.challenge,
        signature: cached.signature,
      });
      return;
    }

    if (!signMessage) {
      setState({ status: "error", reason: "unsupported" });
      toast.error(ERROR_COPY.unsupported);
      void disconnect().catch((err) => captureError(err));
      return;
    }

    const challenge = `UnleakTrade sign-in nonce=${uuidv4()} ts=${Date.now()}`;
    setState({ status: "pending", publicKey, challenge });

    (async () => {
      try {
        const signature = await signMessage(new TextEncoder().encode(challenge));
        if (cancelled) return;
        writeCachedSignature(publicKey, challenge, signature);
        setState({ status: "authenticated", publicKey, challenge, signature });
      } catch (err) {
        if (cancelled) return;
        const reason = classifyError(err);
        captureError(err, { reason });
        toast.error(ERROR_COPY[reason]);
        clearCachedSignature(publicKey);
        try {
          await disconnect();
        } catch (discErr) {
          captureError(discErr);
        }
        setState({ status: "error", reason });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [connected, publicKey, signMessage, disconnect, retryToken]);

  // Resolve the restore window. Once SWA has actually attempted an eager
  // reconnect (connecting went true) and settled without connecting, stop
  // holding the UI. A successful reconnect flips `connected` true and is handled
  // by the effect above, so we only act on the failed/declined case here.
  useEffect(() => {
    if (connecting) {
      sawConnectingRef.current = true;
      return;
    }
    if (sawConnectingRef.current && !connected) {
      sawConnectingRef.current = false;
      setState((prev) => (prev.status === "restoring" ? { status: "disconnected" } : prev));
    }
  }, [connecting, connected]);

  // Backstop: if the adapter never even attempts (extension removed, nothing
  // remembered), don't hang on a blank screen — give up after a short grace.
  useEffect(() => {
    if (state.status !== "restoring") return;
    const timer = window.setTimeout(() => {
      setState((prev) => (prev.status === "restoring" ? { status: "disconnected" } : prev));
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [state.status]);

  const value = useMemo<AuthContextValue>(
    () => ({
      authenticated: state.status === "authenticated",
      state,
      retry,
      signOut,
    }),
    [state, retry, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
