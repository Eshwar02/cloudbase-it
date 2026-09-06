import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "../ui/Icon";
import { useAuth } from "../../hooks/useAuth";
import { HelpPanel } from "../help/HelpPanel";

export function Topbar({ children }: { children?: ReactNode }) {
  const { user, logoutMut } = useAuth();
  const nav = useNavigate();
  const [helpOpen, setHelpOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const initial = (user?.display_name || user?.email || "?").trim().charAt(0).toUpperCase();

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  return (
    <header className="flex items-center gap-4 px-6 py-3">
      <div className="flex-1">
        {children ?? (
          <button
            type="button"
            onClick={() => nav("/search")}
            className="flex w-full max-w-2xl items-center gap-3 rounded-full bg-g-hover px-4 py-2.5 text-left text-g-muted transition-colors hover:bg-g-border/60 focus:bg-white focus:shadow-[0_1px_3px_1px_rgba(60,64,67,.15)] dark:bg-white/10 dark:text-gray-300 dark:hover:bg-white/15"
          >
            <Icon name="search" size={22} className="text-g-muted" />
            <span className="text-[15px]">Search in Cloudbase</span>
          </button>
        )}
      </div>
      <div className="flex items-center gap-1">
        <button aria-label="Help" onClick={() => setHelpOpen(true)}
          className="grid h-10 w-10 place-items-center rounded-full text-g-muted hover:bg-g-hover dark:hover:bg-white/10">
          <Icon name="help" size={22} />
        </button>
        <button aria-label="Settings" onClick={() => nav("/settings")}
          className="grid h-10 w-10 place-items-center rounded-full text-g-muted hover:bg-g-hover dark:hover:bg-white/10">
          <Icon name="settings" size={22} />
        </button>
        <div className="relative ml-1" ref={menuRef}>
          <button
            aria-label="Account menu"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
            title={user?.display_name ?? undefined}
            className="grid h-8 w-8 place-items-center rounded-full bg-g-blue text-sm font-medium text-white"
          >
            {initial}
          </button>
          <AnimatePresence>
            {menuOpen && (
              <motion.div
                role="menu"
                initial={{ opacity: 0, scale: 0.96, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -4 }}
                transition={{ duration: 0.12 }}
                className="absolute right-0 z-40 mt-2 min-w-[220px] overflow-hidden rounded-xl border border-g-border bg-white py-2 shadow-[0_2px_6px_2px_rgba(60,64,67,.15)] dark:border-white/10 dark:bg-[#2d2e30]"
              >
                <div className="flex items-center gap-3 px-4 py-2">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-g-blue text-sm font-medium text-white">{initial}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-g-text dark:text-gray-100">{user?.display_name}</span>
                    <span className="block truncate text-xs text-g-muted dark:text-gray-400">{user?.email}</span>
                  </span>
                </div>
                <div className="my-1 h-px bg-g-border dark:bg-white/10" />
                {[
                  { label: "Profile", icon: "person", onClick: () => nav("/profile") },
                  { label: "Settings", icon: "settings", onClick: () => nav("/settings") },
                ].map((it) => (
                  <button key={it.label} role="menuitem"
                    onClick={() => { setMenuOpen(false); it.onClick(); }}
                    className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-g-text hover:bg-g-hover dark:text-gray-100 dark:hover:bg-white/10">
                    <Icon name={it.icon} size={18} className="text-g-muted" /> {it.label}
                  </button>
                ))}
                <div className="my-1 h-px bg-g-border dark:bg-white/10" />
                <button role="menuitem"
                  onClick={() => { setMenuOpen(false); logoutMut.mutate(); }}
                  className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-g-text hover:bg-g-hover dark:text-gray-100 dark:hover:bg-white/10">
                  <Icon name="logout" size={18} className="text-g-muted" /> Log out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <HelpPanel open={helpOpen} onClose={() => setHelpOpen(false)} />
    </header>
  );
}
