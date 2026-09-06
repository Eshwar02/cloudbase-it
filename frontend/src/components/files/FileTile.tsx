import { motion } from "framer-motion";
import type { FileItem } from "../../types";
import { Icon } from "../ui/Icon";
import { Menu } from "../ui/Menu";
import { fileIcon } from "./fileIcon";
import { fileMenuItems, type FileActions } from "./FileTable";

export function FileTile({
  file,
  actions,
  starred,
}: {
  file: FileItem;
  actions: FileActions;
  starred?: boolean;
}) {
  const { icon, color } = fileIcon(file.name, file.mime_type);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      onDoubleClick={() => actions.onDownload(file)}
      className="group overflow-hidden rounded-xl border border-g-border bg-white transition-shadow hover:shadow-[0_1px_3px_1px_rgba(60,64,67,.15)] dark:border-white/10 dark:bg-[#1f1f1f]"
    >
      <div className="flex items-center gap-2 px-3 py-2.5">
        <Icon name={icon} size={20} className={color} fill />
        <span className="flex-1 truncate text-sm font-medium text-g-text dark:text-gray-100" title={file.name}>
          {file.name}
        </span>
        {starred && <Icon name="star" size={14} fill className="text-g-muted" />}
        <Menu items={fileMenuItems(file, actions, starred)} label={`Actions for ${file.name}`} />
      </div>
      <div className="grid h-32 place-items-center bg-g-hover dark:bg-white/[.06]">
        <Icon name={icon} size={56} className={color} fill />
      </div>
    </motion.div>
  );
}
