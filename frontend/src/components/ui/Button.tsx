import { motion } from "framer-motion";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Spinner } from "./Spinner";

type Intent = "primary" | "secondary" | "success" | "warning" | "ghost" | "new";

const INTENTS: Record<Intent, string> = {
  primary: "rounded-full bg-g-blue px-6 py-2.5 text-white shadow-sm hover:bg-g-blueHover",
  secondary: "rounded-full bg-g-blue px-6 py-2.5 text-white shadow-sm hover:bg-g-blueHover",
  success: "rounded-full bg-brand-green px-6 py-2.5 text-white shadow-sm hover:brightness-95",
  warning: "rounded-full bg-brand-yellow px-6 py-2.5 text-black shadow-sm hover:brightness-95",
  ghost: "rounded-full px-4 py-2 text-g-muted hover:bg-g-hover",
  // Drive's "New" button: white, softly shadowed, larger radius
  new: "rounded-2xl bg-white px-5 py-3.5 text-g-text shadow-[0_1px_3px_1px_rgba(60,64,67,.15)] hover:shadow-[0_1px_3px_1px_rgba(60,64,67,.25)] hover:bg-g-hover",
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  intent?: Intent;
  isLoading?: boolean;
  children: ReactNode;
}

export function Button({ intent = "primary", isLoading, children, className = "", disabled, ...rest }: Props) {
  return (
    <motion.button
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      className={`font-medium transition-colors disabled:opacity-50 ${INTENTS[intent]} ${className}`}
      disabled={disabled || isLoading}
      {...(rest as any)}
    >
      <span className="inline-flex items-center justify-center gap-2">{isLoading && <Spinner />}{children}</span>
    </motion.button>
  );
}
