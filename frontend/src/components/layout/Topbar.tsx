import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "../ui/Icon";
import { useAuth } from "../../hooks/useAuth";

export function Topbar({ children }: { children?: ReactNode }) {
  const { user } = useAuth();
  const nav = useNavigate();
  const initial = (user?.display_name || user?.email || "?").trim().charAt(0).toUpperCase();

  return (
    <header className="flex items-center gap-4 px-6 py-3">
      <div className="flex-1">
        {children ?? (
          <button
            type="button"
            onClick={() => nav("/search")}
            className="flex w-full max-w-2xl items-center gap-3 rounded-full bg-g-hover px-4 py-2.5 text-left text-g-muted transition-colors hover:bg-g-border/60 focus:bg-white focus:shadow-[0_1px_3px_1px_rgba(60,64,67,.15)]"
          >
            <Icon name="search" size={22} className="text-g-muted" />
            <span className="text-[15px]">Search in Cloudbase</span>
          </button>
        )}
      </div>
      <div className="flex items-center gap-1">
        <button aria-label="Help" className="grid h-10 w-10 place-items-center rounded-full text-g-muted hover:bg-g-hover">
          <Icon name="help" size={22} />
        </button>
        <button aria-label="Settings" className="grid h-10 w-10 place-items-center rounded-full text-g-muted hover:bg-g-hover">
          <Icon name="settings" size={22} />
        </button>
        <div
          title={user?.display_name ?? undefined}
          className="ml-1 grid h-8 w-8 place-items-center rounded-full bg-g-blue text-sm font-medium text-white"
        >
          {initial}
        </div>
      </div>
    </header>
  );
}
