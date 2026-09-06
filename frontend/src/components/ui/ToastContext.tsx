import { AnimatePresence, motion } from "framer-motion";
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { Icon } from "./Icon";

type Tone = "info" | "success" | "error";

export interface ToastOptions {
  /** Label for an action button (e.g. "Undo"). */
  actionLabel?: string;
  /** Handler invoked when the action button is pressed. */
  onAction?: () => void;
  /** Auto-dismiss delay in ms. Defaults to 3500, or 7000 when an action exists. */
  duration?: number;
}

interface ToastState extends ToastOptions {
  id: number;
  message: string;
  tone: Tone;
}

interface Ctx {
  notify: (message: string, tone?: Tone, opts?: ToastOptions) => void;
}

const ToastCtx = createContext<Ctx | null>(null);

const TONE_ICON: Record<Tone, string> = {
  info: "info",
  success: "check_circle",
  error: "error",
};
const TONE_COLOR: Record<Tone, string> = {
  info: "text-g-blue",
  success: "text-[#81c995]",
  error: "text-[#f28b82]",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastState[]>([]);
  const timers = useRef<Record<number, number>>({});

  const dismiss = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
    window.clearTimeout(timers.current[id]);
    delete timers.current[id];
  }, []);

  const notify = useCallback((message: string, tone: Tone = "info", opts: ToastOptions = {}) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, tone, ...opts }]);
    const duration = opts.duration ?? (opts.actionLabel ? 7000 : 3500);
    timers.current[id] = window.setTimeout(() => dismiss(id), duration);
  }, [dismiss]);

  return (
    <ToastCtx.Provider value={{ notify }}>
      {children}
      <div className="fixed bottom-4 left-1/2 z-[60] flex -translate-x-1/2 flex-col items-center gap-2">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              role="alert"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex items-center gap-3 rounded-lg bg-[#2d2e30] py-2.5 pl-4 pr-2.5 text-sm text-white shadow-[0_3px_5px_-1px_rgba(0,0,0,.3)]"
            >
              <Icon name={TONE_ICON[t.tone]} size={18} className={TONE_COLOR[t.tone]} />
              <span className="max-w-[60vw] truncate">{t.message}</span>
              {t.actionLabel && t.onAction && (
                <button
                  onClick={() => {
                    t.onAction?.();
                    dismiss(t.id);
                  }}
                  className="ml-1 rounded px-2 py-1 text-sm font-medium text-[#8ab4f8] hover:bg-white/10"
                >
                  {t.actionLabel}
                </button>
              )}
              <button
                aria-label="Dismiss notification"
                onClick={() => dismiss(t.id)}
                className="grid h-7 w-7 place-items-center rounded-full text-white/70 hover:bg-white/10"
              >
                <Icon name="close" size={16} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast(): Ctx {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
