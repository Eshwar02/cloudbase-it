import { useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import type { Folder } from "../../types";

export function MoveModal({ open, folders, onSubmit, onClose }: {
  open: boolean; folders: Folder[]; onSubmit: (folderId: string) => void; onClose: () => void;
}) {
  const [target, setTarget] = useState("");
  return (
    <Modal open={open} onClose={onClose} title="Move to folder">
      <select aria-label="Destination folder" value={target} onChange={(e) => setTarget(e.target.value)}
        className="mb-4 w-full rounded-xl2 border border-white/50 bg-white/70 px-4 py-2.5">
        <option value="">Select a folder…</option>
        {folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
      </select>
      <div className="flex justify-end gap-3">
        <Button intent="ghost" onClick={onClose}>Cancel</Button>
        <Button intent="secondary" disabled={!target} onClick={() => onSubmit(target)}>Move</Button>
      </div>
    </Modal>
  );
}
