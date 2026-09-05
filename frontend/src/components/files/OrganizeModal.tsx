import { useEffect, useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Spinner } from "../ui/Spinner";
import { useToast } from "../ui/Toast";
import { proposeOrganize, applyOrganize } from "../../api/ai";
import type { OrganizeProposal } from "../../types";

function detailOf(e: unknown): string | undefined {
  return (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
}

export function OrganizeModal({
  open, folderId, onClose, onApplied,
}: {
  open: boolean;
  folderId: string | null;
  onClose: () => void;
  onApplied: () => void;
}) {
  const { notify } = useToast();
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [proposal, setProposal] = useState<OrganizeProposal | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !folderId) return;
    setProposal(null);
    setError(null);
    setSelected(new Set());
    setLoading(true);
    proposeOrganize(folderId)
      .then((p) => {
        setProposal(p);
        setSelected(new Set(p.groups.map((_, i) => i)));
      })
      .catch((e) =>
        setError(detailOf(e) === "ai_unavailable"
          ? "AI is not configured yet. Add a Mistral API key to enable this."
          : "Couldn't get suggestions. Try again."))
      .finally(() => setLoading(false));
  }, [open, folderId]);

  function toggle(i: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  async function apply() {
    if (!proposal || !folderId) return;
    const groups = proposal.groups.filter((_, i) => selected.has(i));
    if (groups.length === 0) return;
    setApplying(true);
    try {
      const res = await applyOrganize(folderId, { groups });
      notify(
        `Organized ${res.moved} item(s) into ${res.created_folders.length} folder(s)`,
        "success");
      onApplied();
      onClose();
    } catch (e) {
      notify(detailOf(e) ?? "Failed to organize", "error");
    } finally {
      setApplying(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="✨ AI organize">
      {loading && <div className="flex justify-center p-6"><Spinner /></div>}
      {error && <p className="p-4 text-center text-slate-500">{error}</p>}
      {proposal && !loading && (
        <>
          {proposal.groups.length === 0 ? (
            <p className="p-4 text-center text-slate-500">
              Nothing to reorganize here.
            </p>
          ) : (
            <ul className="space-y-2">
              {proposal.groups.map((g, i) => (
                <li key={i} className="glass flex items-center gap-3 rounded-xl2 p-3">
                  <input type="checkbox" aria-label={g.name}
                    checked={selected.has(i)} onChange={() => toggle(i)} />
                  <span className="font-medium text-slate-700">📁 {g.name}</span>
                  <span className="ml-auto text-sm text-slate-400">
                    {g.file_ids.length + g.folder_ids.length} item(s)
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <Button intent="ghost" onClick={onClose}>Cancel</Button>
            <Button intent="primary" onClick={apply} isLoading={applying}
              disabled={selected.size === 0}>Apply</Button>
          </div>
        </>
      )}
    </Modal>
  );
}
