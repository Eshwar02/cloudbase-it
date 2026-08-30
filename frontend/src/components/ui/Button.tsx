import { motion } from "framer-motion";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Spinner } from "./Spinner";

type Intent = "primary" | "secondary" | "success" | "warning" | "ghost";

const INTENTS: Record<Intent, string> = {
  primary: "bg-brand-blue text-white",
  secondary: "bg-brand-violet text-white",
  success: "bg-brand-green text-white",
  warning: "bg-brand-yellow text-black",
  ghost: "glass text-slate-700",
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  intent?: Intent;
  isLoading?: boolean;
  children: ReactNode;
}

export function Button({ intent = "primary", isLoading, children, className = "", disabled, ...rest }: Props) {
  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      className={`rounded-full px-5 py-2.5 font-medium shadow-sm transition-colors disabled:opacity-50 ${INTENTS[intent]} ${className}`}
      disabled={disabled || isLoading}
      {...(rest as any)}
    >
      <span className="inline-flex items-center gap-2">{isLoading && <Spinner />}{children}</span>
    </motion.button>
  );
}
