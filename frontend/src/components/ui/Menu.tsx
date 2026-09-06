import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "./Icon";

export interface MenuItem {
  label: string;
  icon: string;
  onClick: () => void;
  danger?: boolean;
}

/**
 * Google Drive–style kebab (⋮) dropdown menu.
 * Renders a circular icon-button trigger and a click-away popover of actions.
 */
export function Menu({
  items,
  label = "More actions",
  trigger,
  align = "right",
}: {
  items: MenuItem[];
  label?: string;
  trigger?: ReactNode;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className="grid h-9 w-9 place-items-center rounded-full text-g-muted transition-colors hover:bg-g-hover dark:text-gray-300 dark:hover:bg-white/10"
      >
        {trigger ?? <Icon name="more_vert" size={20} />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -4 }}
            transition={{ duration: 0.12 }}
            className={`absolute z-30 mt-1 min-w-[192px] overflow-hidden rounded-xl border border-g-border bg-white py-1 shadow-[0_2px_6px_2px_rgba(60,64,67,.15)] dark:border-white/10 dark:bg-[#2d2e30] ${
              align === "right" ? "right-0" : "left-0"
            }`}
          >
            {items.map((it) => (
              <button
                key={it.label}
                role="menuitem"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                  it.onClick();
                }}
                className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm hover:bg-g-hover dark:hover:bg-white/10 ${
                  it.danger ? "text-red-600" : "text-g-text dark:text-gray-100"
                }`}
              >
                <Icon name={it.icon} size={18} className={it.danger ? "text-red-600" : "text-g-muted"} />
                {it.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
