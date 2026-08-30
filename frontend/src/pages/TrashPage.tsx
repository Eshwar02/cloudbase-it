import { useState } from "react";
import { Topbar } from "../components/layout/Topbar";
import { Button } from "../components/ui/Button";
import { Spinner } from "../components/ui/Spinner";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { useTrash } from "../hooks/useTrash";
import type { TrashItem } from "../types";

export default function TrashPage() {
  const { items, restore, purge } = useTrash();
  const [confirm, setConfirm] = useState<TrashItem | null>(null);

  return (
    <div>
      <Topbar />
      <h1 className="px-6 py-4 text-xl font-semibold text-slate-700">Trash</h1>
      {items.isLoading ? (
        <div className="flex justify-center p-10"><Spinner /></div>
      ) : (items.data ?? []).length === 0 ? (
        <p className="p-8 text-center text-slate-400">Trash is empty.</p>
      ) : (
        <ul className="space-y-3 p-4">
          {(items.data ?? []).map((i) => (
            <li key={`${i.item_type}-${i.id}`} className="glass flex items-center gap-3 rounded-xl2 p-4">
              <span className="flex-1 text-slate-700">{i.item_type === "folder" ? "📁" : "📄"} {i.name}</span>
              <Button intent="success" onClick={() => restore.mutate(i)}>Restore</Button>
              <Button intent="warning" onClick={() => setConfirm(i)}>Delete forever</Button>
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog open={!!confirm} title="Delete forever?"
        message="This permanently removes the item and cannot be undone."
        confirmLabel="Delete forever"
        onConfirm={() => { if (confirm) purge.mutate(confirm); setConfirm(null); }}
        onClose={() => setConfirm(null)} />
    </div>
  );
}
