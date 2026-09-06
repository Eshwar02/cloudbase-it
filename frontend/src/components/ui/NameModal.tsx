import { useEffect, useRef, useState } from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";

/** Generic single-field name dialog (used for New folder, etc.). */
export function NameModal({
  open,
  title,
  label = "Name",
  confirmLabel = "Create",
  initialValue = "",
  onSubmit,
  onClose,
}: {
  open: boolean;
  title: string;
  label?: string;
  confirmLabel?: string;
  initialValue?: string;
  onSubmit: (value: string) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setValue(initialValue);
      // Autofocus once the dialog mounts.
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open, initialValue]);

  const submit = () => {
    const v = value.trim();
    if (v) onSubmit(v);
  };

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <input
        ref={inputRef}
        aria-label={label}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder={label}
        className="mb-5 w-full rounded-lg border border-g-borderStrong bg-white px-4 py-2.5 text-g-text outline-none transition-colors focus:border-g-blue focus:ring-1 focus:ring-g-blue dark:border-white/20 dark:bg-white/5 dark:text-gray-100"
      />
      <div className="flex justify-end gap-2">
        <Button intent="ghost" onClick={onClose}>Cancel</Button>
        <Button intent="primary" onClick={submit} disabled={!value.trim()}>{confirmLabel}</Button>
      </div>
    </Modal>
  );
}
