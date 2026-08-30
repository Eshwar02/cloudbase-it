import type { ReactNode } from "react";
import { useAuth } from "../../hooks/useAuth";

export function Topbar({ children }: { children?: ReactNode }) {
  const { user } = useAuth();
  return (
    <header className="glass m-3 mb-0 flex items-center gap-4 rounded-xl2 px-5 py-3">
      <div className="flex-1">{children}</div>
      <span className="text-sm text-slate-600">{user?.display_name}</span>
    </header>
  );
}
