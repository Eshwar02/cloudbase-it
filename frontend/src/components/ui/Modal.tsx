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
            className="glass rounded-xl2 p-6 w-full max-w-md"
            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }} transition={{ type: "spring", duration: 0.3 }}
            onClick={(e) => e.stopPropagation()}
          >
            {title && <h2 className="mb-4 text-lg font-semibold text-slate-800">{title}</h2>}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
