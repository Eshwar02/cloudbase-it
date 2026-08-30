import { useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";

export function RenameModal({ open, initialName, onSubmit, onClose }: {
  open: boolean; initialName: string; onSubmit: (name: string) => void; onClose: () => void;
}) {
  const [name, setName] = useState(initialName);
  return (
    <Modal open={open} onClose={onClose} title="Rename">
      <input aria-label="New name" value={name} onChange={(e) => setName(e.target.value)}
        className="mb-4 w-full rounded-full border border-white/50 bg-white/70 px-4 py-2.5 outline-none focus:ring-2 focus:ring-brand-violet" />
      <div className="flex justify-end gap-3">
        <Button intent="ghost" onClick={onClose}>Cancel</Button>
        <Button intent="primary" onClick={() => onSubmit(name)}>Save</Button>
      </div>
    </Modal>
  );
}
