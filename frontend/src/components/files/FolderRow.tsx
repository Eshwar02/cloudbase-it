import { motion } from "framer-motion";
import type { Folder } from "../../types";

export function FolderRow({ folder, onOpen, onRename, onDelete }: {
  folder: Folder; onOpen: (id: string) => void;
  onRename: (f: Folder) => void; onDelete: (f: Folder) => void;
}) {
  return (
    <motion.div layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className="glass flex items-center gap-3 rounded-xl2 p-4">
      <button className="flex-1 text-left font-medium text-slate-700" onClick={() => onOpen(folder.id)}>
        📁 {folder.name}
      </button>
      <button aria-label={`Rename ${folder.name}`} onClick={() => onRename(folder)} className="text-brand-blue">✎</button>
      <button aria-label={`Delete ${folder.name}`} onClick={() => onDelete(folder)} className="text-red-500">🗑</button>
    </motion.div>
  );
}
