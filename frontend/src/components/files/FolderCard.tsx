import { motion } from "framer-motion";
import type { Folder } from "../../types";
import { Icon } from "../ui/Icon";
import { Menu, type MenuItem } from "../ui/Menu";

export function FolderCard({
  folder,
  onOpen,
  onRename,
  onDelete,
  onShare,
  onToggleStar,
  starred,
}: {
  folder: Folder;
  onOpen: (id: string) => void;
  onRename: (f: Folder) => void;
  onDelete: (f: Folder) => void;
  onShare?: (f: Folder) => void;
  onToggleStar?: (f: Folder) => void;
  starred?: boolean;
}) {
  const items: MenuItem[] = [
    { label: "Open", icon: "open_in_new", onClick: () => onOpen(folder.id) },
    ...(onShare ? [{ label: "Share", icon: "person_add", onClick: () => onShare(folder) }] : []),
    ...(onToggleStar
      ? [{ label: starred ? "Remove from starred" : "Add to starred", icon: "star", onClick: () => onToggleStar(folder) }]
      : []),
    { label: "Rename", icon: "edit", onClick: () => onRename(folder) },
    { label: "Move to trash", icon: "delete", onClick: () => onDelete(folder), danger: true },
  ];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      onDoubleClick={() => onOpen(folder.id)}
      className="group flex items-center gap-3 rounded-lg bg-g-hover px-4 py-3 transition-colors hover:bg-g-border/50"
    >
      <Icon name="folder" size={22} fill className="text-g-muted" />
      <button
        onClick={() => onOpen(folder.id)}
        className="flex-1 truncate text-left text-sm font-medium text-g-text"
        title={folder.name}
      >
        {folder.name}
      </button>
      {starred && <Icon name="star" size={16} fill className="text-g-muted" />}
      <Menu items={items} label={`Actions for ${folder.name}`} />
    </motion.div>
  );
}
