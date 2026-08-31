import { motion } from "framer-motion";
import type { FileItem } from "../../types";

export function FileRow({ file, onDownload, onRename, onMove, onDelete, onShare, onToggleStar, starred }: {
  file: FileItem; onDownload: (f: FileItem) => void; onRename: (f: FileItem) => void;
  onMove: (f: FileItem) => void; onDelete: (f: FileItem) => void;
  onShare?: (f: FileItem) => void; onToggleStar?: (f: FileItem) => void; starred?: boolean;
}) {
  return (
    <motion.div layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className="glass flex items-center gap-3 rounded-xl2 p-4">
      <span className="flex-1 truncate font-medium text-slate-700">📄 {file.name}</span>
      {onToggleStar && (
        <button aria-label={`${starred ? "Unstar" : "Star"} ${file.name}`}
          onClick={() => onToggleStar(file)} className="text-amber-400">{starred ? "★" : "☆"}</button>
      )}
      <button aria-label={`Download ${file.name}`} onClick={() => onDownload(file)} className="text-brand-green">⬇</button>
      {onShare && (
        <button aria-label={`Share ${file.name}`} onClick={() => onShare(file)} className="text-brand-blue">🔗</button>
      )}
      <button aria-label={`Rename ${file.name}`} onClick={() => onRename(file)} className="text-brand-blue">✎</button>
      <button aria-label={`Move ${file.name}`} onClick={() => onMove(file)} className="text-brand-violet">➜</button>
      <button aria-label={`Delete ${file.name}`} onClick={() => onDelete(file)} className="text-red-500">🗑</button>
    </motion.div>
  );
}
