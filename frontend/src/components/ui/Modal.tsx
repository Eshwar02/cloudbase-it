import { AnimatePresence, motion } from "framer-motion";
import { useEffect, type ReactNode } from "react";

interface Props { open: boolean; onClose: () => void; title?: string; children: ReactNode; }

export function Modal({ open, onClose, title, children }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog" aria-modal="true" aria-label={title}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-[0_11px_15px_-7px_rgba(0,0,0,.2)] dark:bg-[#2d2e30]"
            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }} transition={{ type: "spring", duration: 0.3 }}
            onClick={(e) => e.stopPropagation()}
          >
            {title && <h2 className="mb-4 text-xl font-normal text-g-text dark:text-gray-100">{title}</h2>}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
