import { useEffect, useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { useToast } from "../ui/Toast";
import {
  createPublicLink, createShare, listShares, revokeShare,
} from "../../api/sharing";
import type { LinkShare, ShareGrant } from "../../types";

export interface ShareTarget { kind: "file" | "folder"; id: string; name: string; }

function toParam(t: ShareTarget): { file_id: string } | { folder_id: string } {
  return t.kind === "file" ? { file_id: t.id } : { folder_id: t.id };
}

export function ShareModal({ target, onClose }: {
  target: ShareTarget | null; onClose: () => void;
}) {
  const { notify } = useToast();
  const [grants, setGrants] = useState<ShareGrant[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"viewer" | "editor">("viewer");
  const [password, setPassword] = useState("");
  const [expiresHours, setExpiresHours] = useState("");
  const [link, setLink] = useState<LinkShare | null>(null);

  const notifyError = (e: unknown) => {
    const detail = (e as { response?: { data?: { detail?: string } } })
      ?.response?.data?.detail;
    notify(typeof detail === "string" ? detail : "Something went wrong", "error");
  };

  useEffect(() => {
    if (!target) return;
    setEmail(""); setRole("viewer"); setPassword(""); setExpiresHours("");
    setLink(null);
    listShares(toParam(target)).then(setGrants).catch(() => setGrants([]));
  }, [target]);

  if (!target) return null;

  async function onAdd() {
    if (!email.trim()) return;
    try {
      await createShare(toParam(target!), email.trim(), role);
      setEmail("");
      setGrants(await listShares(toParam(target!)));
      notify("Shared", "success");
    } catch (e) { notifyError(e); }
  }

  async function onRevoke(id: string) {
    try {
      await revokeShare(id);
      setGrants((g) => g.filter((x) => x.id !== id));
    } catch (e) { notifyError(e); }
  }

  async function onCreateLink() {
    try {
      const l = await createPublicLink(toParam(target!), {
        role: "viewer",
        password: password.trim() || undefined,
        expires_in_hours: expiresHours ? Number(expiresHours) : undefined,
      });
      setLink(l);
      notify("Public link created", "success");
    } catch (e) { notifyError(e); }
  }

  const publicUrl = link
    ? `${window.location.origin}/public/${link.token}` : "";

  return (
    <Modal open={!!target} onClose={onClose} title={`Share "${target.name}"`}>
      <div className="space-y-5">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">
            Invite by email
          </label>
          <div className="flex gap-2">
            <input aria-label="Grantee email" type="email" value={email}
              onChange={(e) => setEmail(e.target.value)} placeholder="person@example.com"
              className="flex-1 rounded-full border border-white/50 bg-white/70 px-4 py-2 outline-none focus:ring-2 focus:ring-brand-violet" />
            <select aria-label="Role" value={role}
              onChange={(e) => setRole(e.target.value as "viewer" | "editor")}
              className="rounded-full border border-white/50 bg-white/70 px-3 py-2">
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
            </select>
            <Button intent="primary" onClick={onAdd}>Add</Button>
          </div>
        </div>

        {grants.length > 0 && (
          <ul className="space-y-1">
            {grants.map((g) => (
              <li key={g.id} className="flex items-center justify-between rounded-lg bg-white/50 px-3 py-1.5 text-sm">
                <span className="truncate">{g.grantee_email} · {g.role}</span>
                <button aria-label={`Revoke ${g.grantee_email}`}
                  onClick={() => onRevoke(g.id)} className="text-red-500">Remove</button>
              </li>
            ))}
          </ul>
        )}

        <div className="border-t border-white/40 pt-4">
          <label className="mb-1 block text-sm font-medium text-slate-600">
            Public link
          </label>
          <div className="flex gap-2">
            <input aria-label="Link password" value={password}
              onChange={(e) => setPassword(e.target.value)} placeholder="Password (optional)"
              className="flex-1 rounded-full border border-white/50 bg-white/70 px-4 py-2 outline-none" />
            <input aria-label="Link expiry hours" type="number" min="1" value={expiresHours}
              onChange={(e) => setExpiresHours(e.target.value)} placeholder="Expiry (hrs)"
              className="w-28 rounded-full border border-white/50 bg-white/70 px-4 py-2 outline-none" />
            <Button intent="secondary" onClick={onCreateLink}>Create</Button>
          </div>
          {link && (
            <div className="mt-3 flex items-center gap-2">
              <input readOnly aria-label="Public link URL" value={publicUrl}
                className="flex-1 rounded-full border border-white/50 bg-white/70 px-4 py-2 text-sm" />
              <Button intent="ghost" onClick={() => {
                navigator.clipboard?.writeText(publicUrl);
                notify("Link copied", "info");
              }}>Copy</Button>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button intent="ghost" onClick={onClose}>Done</Button>
        </div>
      </div>
    </Modal>
  );
}
