import { useState } from "react";
import { Topbar } from "../components/layout/Topbar";
import { Button } from "../components/ui/Button";
import { Icon } from "../components/ui/Icon";
import { Spinner } from "../components/ui/Spinner";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { fileIcon } from "../components/files/fileIcon";
import { useTrash } from "../hooks/useTrash";
import type { TrashItem } from "../types";

export default function TrashPage() {
  const { items, restore, purge } = useTrash();
  const [confirm, setConfirm] = useState<TrashItem | null>(null);

  return (
    <div>
      <Topbar />
      <h1 className="px-6 pb-3 pt-2 text-[22px] text-g-text">Trash</h1>
      {items.isLoading ? (
        <div className="flex justify-center p-10"><Spinner /></div>
      ) : (items.data ?? []).length === 0 ? (
        <p className="p-12 text-center text-g-muted">Trash is empty.</p>
      ) : (
        <ul className="space-y-2 px-4 pb-8">
          {(items.data ?? []).map((i) => {
            const ic = i.item_type === "folder" ? { icon: "folder", color: "text-g-muted" } : fileIcon(i.name);
            return (
              <li key={`${i.item_type}-${i.id}`} className="flex items-center gap-3 rounded-lg border border-g-border px-4 py-2.5 hover:bg-g-hover">
                <Icon name={ic.icon} size={20} className={ic.color} fill />
                <span className="flex-1 truncate text-sm text-g-text">{i.name}</span>
                <Button intent="ghost" onClick={() => restore.mutate(i)}>
                  <Icon name="restore_from_trash" size={18} /> Restore
                </Button>
                <Button intent="ghost" className="text-red-600" onClick={() => setConfirm(i)}>
                  <Icon name="delete_forever" size={18} /> Delete forever
                </Button>
              </li>
            );
          })}
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
