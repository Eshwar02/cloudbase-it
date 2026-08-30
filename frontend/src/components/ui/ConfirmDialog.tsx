import { Button } from "./Button";
import { Modal } from "./Modal";

interface Props {
  open: boolean; title: string; message: string; confirmLabel?: string;
  onConfirm: () => void; onClose: () => void;
}

export function ConfirmDialog({ open, title, message, confirmLabel = "Confirm", onConfirm, onClose }: Props) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="mb-6 text-slate-600">{message}</p>
      <div className="flex justify-end gap-3">
        <Button intent="ghost" onClick={onClose}>Cancel</Button>
        <Button intent="warning" onClick={onConfirm}>{confirmLabel}</Button>
      </div>
    </Modal>
  );
}
