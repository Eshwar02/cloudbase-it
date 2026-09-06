import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateSettings } from "../api/account";
import { useAuth } from "./useAuth";
import type { User, UserSettings } from "../types";

export type ResolvedSettings = Required<Omit<UserSettings, "notifications">> & {
  notifications: boolean;
};

const DEFAULTS: ResolvedSettings = {
  appearance: "system",
  density: "comfortable",
  default_view: "list",
  confirm_permanent_delete: true,
  notifications: true,
};

interface Ctx {
  settings: ResolvedSettings;
  update: (patch: UserSettings) => void;
  saving: boolean;
}

const SettingsCtx = createContext<Ctx | null>(null);

function applyAppearance(appearance: ResolvedSettings["appearance"]) {
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  const dark = appearance === "dark" || (appearance === "system" && prefersDark);
  document.documentElement.classList.toggle("dark", dark);
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const settings: ResolvedSettings = { ...DEFAULTS, ...(user?.settings ?? {}) };

  const mutation = useMutation({
    mutationFn: updateSettings,
    onMutate: (patch: UserSettings) => {
      // Optimistically merge into the cached user so the UI updates instantly.
      qc.setQueryData<User | null>(["me"], (prev) =>
        prev ? { ...prev, settings: { ...(prev.settings ?? {}), ...patch } } : prev);
    },
    onSuccess: (updated) => qc.setQueryData(["me"], updated),
  });

  // Apply appearance whenever it changes, and react to OS theme in system mode.
  useEffect(() => {
    applyAppearance(settings.appearance);
    if (settings.appearance !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyAppearance("system");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [settings.appearance]);

  // Density is exposed to the document for any CSS hooks.
  useEffect(() => {
    document.documentElement.dataset.density = settings.density;
  }, [settings.density]);

  return (
    <SettingsCtx.Provider value={{ settings, update: mutation.mutate, saving: mutation.isPending }}>
      {children}
    </SettingsCtx.Provider>
  );
}

const FALLBACK: Ctx = { settings: DEFAULTS, update: () => {}, saving: false };

/** Returns the active settings, or read-only defaults outside a provider. */
export function useSettings(): Ctx {
  return useContext(SettingsCtx) ?? FALLBACK;
}
