import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Topbar } from "../components/layout/Topbar";
import { Button } from "../components/ui/Button";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../components/ui/Toast";
import { changePassword, updateProfile } from "../api/account";
import type { User } from "../types";

const inputCls =
  "w-full rounded-lg border border-g-borderStrong bg-white px-4 py-2.5 text-g-text outline-none transition-colors focus:border-g-blue focus:ring-1 focus:ring-g-blue dark:border-white/20 dark:bg-white/5 dark:text-gray-100";
const cardCls =
  "rounded-2xl border border-g-border bg-white p-6 dark:border-white/10 dark:bg-[#1f1f1f]";

function errDetail(e: unknown, fallback: string): string {
  const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
  if (detail === "current_password_incorrect") return "Current password is incorrect.";
  return typeof detail === "string" ? detail : fallback;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { notify } = useToast();
  const [name, setName] = useState(user?.display_name ?? "");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");

  const initial = (user?.display_name || user?.email || "?").trim().charAt(0).toUpperCase();

  const nameMut = useMutation({
    mutationFn: () => updateProfile(name.trim()),
    onSuccess: (updated: User) => {
      qc.setQueryData(["me"], updated);
      notify("Profile updated", "success");
    },
    onError: (e) => notify(errDetail(e, "Could not update profile"), "error"),
  });

  const pwMut = useMutation({
    mutationFn: () => changePassword(current, next),
    onSuccess: () => {
      setCurrent(""); setNext(""); setConfirm("");
      notify("Password changed", "success");
    },
    onError: (e) => notify(errDetail(e, "Could not change password"), "error"),
  });

  const pwValid = current && next.length >= 8 && next === confirm;

  return (
    <div>
      <Topbar />
      <h1 className="px-6 pb-4 pt-2 text-[22px] text-g-text dark:text-gray-100">Profile</h1>
      <div className="mx-auto max-w-2xl space-y-6 px-6 pb-12">
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-g-blue text-2xl font-medium text-white">
            {initial}
          </div>
          <div>
            <p className="text-lg font-medium text-g-text dark:text-gray-100">{user?.display_name}</p>
            <p className="text-sm text-g-muted dark:text-gray-400">{user?.email}</p>
          </div>
        </div>

        <form
          className={cardCls}
          onSubmit={(e) => { e.preventDefault(); nameMut.mutate(); }}
        >
          <h2 className="mb-4 text-base font-medium text-g-text dark:text-gray-100">Display name</h2>
          <input aria-label="Display name" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
          <div className="mt-4 flex justify-end">
            <Button type="submit" intent="primary" isLoading={nameMut.isPending}
              disabled={!name.trim() || name.trim() === user?.display_name}>
              Save
            </Button>
          </div>
        </form>

        <form
          className={cardCls}
          onSubmit={(e) => { e.preventDefault(); if (pwValid) pwMut.mutate(); }}
        >
          <h2 className="mb-4 text-base font-medium text-g-text dark:text-gray-100">Change password</h2>
          <div className="space-y-3">
            <input aria-label="Current password" type="password" placeholder="Current password"
              value={current} onChange={(e) => setCurrent(e.target.value)} className={inputCls} />
            <input aria-label="New password" type="password" placeholder="New password (min 8 chars)"
              value={next} onChange={(e) => setNext(e.target.value)} className={inputCls} />
            <input aria-label="Confirm new password" type="password" placeholder="Confirm new password"
              value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputCls} />
            {next && confirm && next !== confirm && (
              <p className="text-sm text-red-600">Passwords don’t match.</p>
            )}
          </div>
          <div className="mt-4 flex justify-end">
            <Button type="submit" intent="primary" isLoading={pwMut.isPending} disabled={!pwValid}>
              Update password
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
