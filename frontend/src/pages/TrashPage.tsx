import { useState } from "react";
import { Topbar } from "../components/layout/Topbar";
import { Button } from "../components/ui/Button";
import { Icon } from "../components/ui/Icon";
import { Spinner } from "../components/ui/Spinner";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { fileIcon } from "../components/files/fileIcon";
import { useTrash } from "../hooks/useTrash";
import { useToast } from "../components/ui/Toast";
import { useSettings } from "../hooks/useSettings";
import { deleteFile } from "../api/files";
import { deleteFolder } from "../api/folders";
import { useQueryClient } from "@tanstack/react-query";
import type { TrashItem } from "../types";

export default function TrashPage() {
  const { items, restore, purge } = useTrash();
  const { notify } = useToast();
  const { settings } = useSettings();
  const qc = useQueryClient();
  const [confirm, setConfirm] = useState<TrashItem | null>(null);

  function onDeleteForever(i: TrashItem) {
    if (settings.confirm_permanent_delete) setConfirm(i);
    else purge.mutate(i);
  }

  function onRestore(i: TrashItem) {
    restore.mutate(i);
    notify(`“${i.name}” restored`, "success", {
      actionLabel: "Undo",
      onAction: async () => {
        try {
          if (i.item_type === "file") await deleteFile(i.id);
          else await deleteFolder(i.id);
        } finally {
          qc.invalidateQueries({ queryKey: ["trash"] });
          qc.invalidateQueries({ queryKey: ["drive"] });
        }
      },
    });
  }

  return (
    <div>
      <Topbar />
      <h1 className="px-6 pb-3 pt-2 text-[22px] text-g-text dark:text-gray-100">Trash</h1>
      {items.isLoading ? (
        <div className="flex justify-center p-10"><Spinner /></div>
      ) : (items.data ?? []).length === 0 ? (
        <p className="p-12 text-center text-g-muted">Trash is empty.</p>
      ) : (
        <ul className="space-y-2 px-4 pb-8">
          {(items.data ?? []).map((i) => {
            const ic = i.item_type === "folder" ? { icon: "folder", color: "text-g-muted" } : fileIcon(i.name);
            return (
              <li key={`${i.item_type}-${i.id}`} className="flex items-center gap-3 rounded-lg border border-g-border px-4 py-2.5 hover:bg-g-hover dark:border-white/10 dark:hover:bg-white/5">
                <Icon name={ic.icon} size={20} className={ic.color} fill />
                <span className="flex-1 truncate text-sm text-g-text dark:text-gray-100">{i.name}</span>
                <Button intent="ghost" onClick={() => onRestore(i)}>
                  <Icon name="restore_from_trash" size={18} /> Restore
                </Button>
                <Button intent="ghost" className="text-red-600" onClick={() => onDeleteForever(i)}>
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
