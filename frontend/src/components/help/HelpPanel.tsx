import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "../ui/Icon";
import { HelpChatbot } from "./HelpChatbot";

const RESOURCES = [
  "Recover a deleted file in Cloudbase",
  "Delete files in Cloudbase",
  "Manage your storage in Cloudbase",
  "Share files and folders",
  "Star important files",
  "Search your Drive (including AI search)",
  "Change appearance and settings",
  "Update your profile or password",
];

export function HelpPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [chat, setChat] = useState<{ seed?: string } | null>(null);

  const filtered = RESOURCES.filter((r) => r.toLowerCase().includes(query.toLowerCase()));

  const close = () => {
    setChat(null);
    setQuery("");
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={close}
          />
          <motion.aside
            role="dialog" aria-label="Help"
            initial={{ x: 380, opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 380, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 260 }}
            className="fixed right-3 top-3 bottom-3 z-50 flex w-[380px] max-w-[92vw] flex-col overflow-hidden rounded-2xl border border-g-border bg-white shadow-[0_8px_24px_rgba(0,0,0,.18)] dark:border-white/10 dark:bg-[#1f1f1f]"
          >
            {chat ? (
              <HelpChatbot seed={chat.seed} onBack={() => setChat(null)} />
            ) : (
              <>
                <div className="flex items-center justify-between border-b border-g-border px-4 py-3 dark:border-white/10">
                  <h2 className="text-lg font-medium text-g-text dark:text-gray-100">Help</h2>
                  <button aria-label="Close help" onClick={close}
                    className="grid h-9 w-9 place-items-center rounded-full text-g-muted hover:bg-g-hover dark:hover:bg-white/10">
                    <Icon name="close" size={20} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                  <p className="mb-2 text-sm font-medium text-g-text dark:text-gray-100">Popular help resources</p>
                  <ul className="mb-4">
                    {filtered.map((r) => (
                      <li key={r}>
                        <button
                          onClick={() => setChat({ seed: r })}
                          className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left text-sm text-g-text hover:bg-g-hover dark:text-gray-200 dark:hover:bg-white/10"
                        >
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-g-hover dark:bg-white/10">
                            <Icon name="description" size={18} className="text-g-blue" />
                          </span>
                          {r}
                        </button>
                      </li>
                    ))}
                    {filtered.length === 0 && (
                      <li className="px-2 py-3 text-sm text-g-muted dark:text-gray-400">No matching topics.</li>
                    )}
                  </ul>

                  <div className="mb-6 flex items-center gap-3 rounded-full bg-g-hover px-4 py-2.5 dark:bg-white/10">
                    <Icon name="search" size={20} className="text-g-muted" />
                    <input
                      aria-label="Search Help"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search Help"
                      className="w-full bg-transparent text-sm text-g-text outline-none placeholder:text-g-muted dark:text-gray-100"
                    />
                  </div>

                  <p className="mb-2 text-sm font-medium text-g-text dark:text-gray-100">Need more help?</p>
                  <button
                    onClick={() => setChat({})}
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left hover:bg-g-hover dark:hover:bg-white/10"
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-g-hover dark:bg-white/10">
                      <Icon name="forum" size={18} className="text-g-blue" />
                    </span>
                    <span>
                      <span className="block text-sm text-g-text dark:text-gray-100">Ask the assistant</span>
                      <span className="block text-xs text-g-muted dark:text-gray-400">Get instant answers from the help bot</span>
                    </span>
                  </button>
                </div>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
