import type { ReactNode } from "react";
import { Toaster } from "@/app/components/ui/sonner";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <Toaster position="top-right" richColors />
    </>
  );
}
