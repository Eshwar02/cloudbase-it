import type { ReactNode } from "react";

/** Flat Material surface card (Google Drive style). */
export function GlassCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-g-border bg-white shadow-[0_1px_3px_1px_rgba(60,64,67,.15)] ${className}`}>
      {children}
    </div>
  );
}
