import { useRef, useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "../ui/Icon";
import { useAuth } from "../../hooks/useAuth";
import { useDriveActions } from "../../hooks/useDriveActions";

const NAV = [
  { to: "/", label: "My Drive", icon: "home_storage", end: true },
  { to: "/shared", label: "Shared", icon: "group", end: false },
  { to: "/starred", label: "Starred", icon: "star", end: false },
  { to: "/search", label: "Search", icon: "search", end: false },
  { to: "/trash", label: "Trash", icon: "delete", end: false },
];

export function Sidebar() {
  const { user, logoutMut } = useAuth();
  const actions = useDriveActions();
  const fileInput = useRef<HTMLInputElement>(null);
  const [newOpen, setNewOpen] = useState(false);
  const newRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!newOpen) return;
    const onDown = (e: MouseEvent) => {
      if (newRef.current && !newRef.current.contains(e.target as Node)) setNewOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [newOpen]);

  const used = user?.storage_used_bytes ?? 0;
  const quota = user?.storage_quota_bytes ?? 0;
  const pct = quota > 0 ? Math.min(100, Math.round((used / quota) * 100)) : 0;
  const gb = (n: number) => `${(n / 1024 ** 3).toFixed(2)} GB`;

  return (
    <aside className="flex w-64 flex-col gap-1 bg-g-rail px-3 py-4 dark:bg-[#1f1f1f]">
      <div className="mb-3 flex items-center gap-2 px-2">
        <Icon name="cloud" size={26} className="text-g-blue" fill />
        <span className="font-display text-[22px] font-medium text-g-text dark:text-gray-100">Cloudbase</span>
      </div>

      {/* New button + menu */}
      <div className="relative mb-3 px-1" ref={newRef}>
        <button
          onClick={() => setNewOpen((o) => !o)}
          aria-haspopup="menu"
          aria-expanded={newOpen}
          className="flex items-center gap-3 rounded-2xl bg-white py-3.5 pl-4 pr-6 font-medium text-g-text shadow-[0_1px_3px_1px_rgba(60,64,67,.15)] transition-shadow hover:bg-g-hover hover:shadow-[0_1px_3px_1px_rgba(60,64,67,.25)] dark:bg-[#2d2e30] dark:text-gray-100 dark:hover:bg-[#37383b]"
        >
          <Icon name="add" size={22} className="text-g-blue" />
          New
        </button>
        <input
          ref={fileInput}
          type="file"
          multiple
          className="hidden"
          aria-label="Upload files"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            if (files.length) actions.uploadFiles(files);
            e.target.value = "";
          }}
        />
        <AnimatePresence>
          {newOpen && (
            <motion.div
              role="menu"
              initial={{ opacity: 0, scale: 0.96, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -4 }}
              transition={{ duration: 0.12 }}
              className="absolute left-1 z-30 mt-1 min-w-[200px] overflow-hidden rounded-xl border border-g-border bg-white py-1 shadow-[0_2px_6px_2px_rgba(60,64,67,.15)] dark:border-white/10 dark:bg-[#2d2e30]"
            >
              <button
                role="menuitem"
                onClick={() => {
                  setNewOpen(false);
                  actions.newFolder();
                }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-g-text hover:bg-g-hover dark:text-gray-100 dark:hover:bg-white/10"
              >
                <Icon name="create_new_folder" size={18} className="text-g-muted" /> New folder
              </button>
              <button
                role="menuitem"
                onClick={() => {
                  setNewOpen(false);
                  fileInput.current?.click();
                }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-g-text hover:bg-g-hover dark:text-gray-100 dark:hover:bg-white/10"
              >
                <Icon name="upload_file" size={18} className="text-g-muted" /> Upload files
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            className={({ isActive }) =>
              `flex items-center gap-4 rounded-full py-2 pl-4 pr-5 text-sm font-medium transition-colors ${
                isActive ? "bg-g-selected text-g-selectedText dark:bg-[#004a77] dark:text-[#c2e7ff]" : "text-g-muted hover:bg-g-hover dark:text-gray-300 dark:hover:bg-white/10"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon name={n.icon} size={20} fill={isActive} />
                {n.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Storage + logout */}
      <div className="mt-auto px-3 pt-4">
        <div className="mb-1 flex items-center gap-2 text-g-muted dark:text-gray-400">
          <Icon name="cloud" size={18} />
          <span className="text-xs">Storage</span>
        </div>
        <div className="mb-1 h-1 w-full overflow-hidden rounded-full bg-g-border dark:bg-white/10">
          <div className="h-full rounded-full bg-g-blue" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs text-g-muted dark:text-gray-400">
          {gb(used)} of {gb(quota)} used
        </p>
        <button
          onClick={() => logoutMut.mutate()}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-g-border py-2 text-sm font-medium text-g-muted transition-colors hover:bg-g-hover dark:border-white/15 dark:text-gray-300 dark:hover:bg-white/10"
        >
          <Icon name="logout" size={18} /> Log out
        </button>
      </div>
    </aside>
  );
}
