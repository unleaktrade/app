import type { ReactNode } from "react";

export function HorizontalStrip({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin">{children}</div>
  );
}
