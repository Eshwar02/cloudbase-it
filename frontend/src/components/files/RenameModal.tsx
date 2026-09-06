import { useState, useEffect } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";

export function RenameModal({ open, initialName, onSubmit, onClose }: {
  open: boolean; initialName: string; onSubmit: (name: string) => void; onClose: () => void;
}) {
  const [name, setName] = useState(initialName);
  useEffect(() => { setName(initialName); }, [initialName]);
  return (
    <Modal open={open} onClose={onClose} title="Rename">
      <input aria-label="New name" value={name} onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onSubmit(name)}
        className="mb-5 w-full rounded-lg border border-g-borderStrong bg-white px-4 py-2.5 text-g-text outline-none transition-colors focus:border-g-blue focus:ring-1 focus:ring-g-blue dark:border-white/20 dark:bg-white/5 dark:text-gray-100" />
      <div className="flex justify-end gap-2">
        <Button intent="ghost" onClick={onClose}>Cancel</Button>
        <Button intent="primary" onClick={() => onSubmit(name)}>Save</Button>
      </div>
    </Modal>
  );
}
