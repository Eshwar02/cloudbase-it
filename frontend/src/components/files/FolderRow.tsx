import { motion } from "framer-motion";
import type { Folder } from "../../types";

export function FolderRow({ folder, onOpen, onRename, onDelete, onShare, onToggleStar, starred }: {
  folder: Folder; onOpen: (id: string) => void;
  onRename: (f: Folder) => void; onDelete: (f: Folder) => void;
  onShare?: (f: Folder) => void; onToggleStar?: (f: Folder) => void; starred?: boolean;
}) {
  return (
    <motion.div layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className="glass flex items-center gap-3 rounded-xl2 p-4">
      <button className="flex-1 text-left font-medium text-slate-700" onClick={() => onOpen(folder.id)}>
        📁 {folder.name}
      </button>
      {onToggleStar && (
        <button aria-label={`${starred ? "Unstar" : "Star"} ${folder.name}`}
          onClick={() => onToggleStar(folder)} className="text-amber-400">{starred ? "★" : "☆"}</button>
      )}
      {onShare && (
        <button aria-label={`Share ${folder.name}`} onClick={() => onShare(folder)} className="text-brand-blue">🔗</button>
      )}
      <button aria-label={`Rename ${folder.name}`} onClick={() => onRename(folder)} className="text-brand-blue">✎</button>
      <button aria-label={`Delete ${folder.name}`} onClick={() => onDelete(folder)} className="text-red-500">🗑</button>
    </motion.div>
  );
}
