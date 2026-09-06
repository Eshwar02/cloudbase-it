import { motion } from "framer-motion";
import type { FileItem } from "../../types";
import { Icon } from "../ui/Icon";
import { Menu, type MenuItem } from "../ui/Menu";
import { fileIcon, formatSize } from "./fileIcon";
import { useSettings } from "../../hooks/useSettings";

export interface FileActions {
  onDownload: (f: FileItem) => void;
  onRename: (f: FileItem) => void;
  onMove: (f: FileItem) => void;
  onDelete: (f: FileItem) => void;
  onShare?: (f: FileItem) => void;
  onToggleStar?: (f: FileItem) => void;
}

export function fileMenuItems(file: FileItem, a: FileActions, starred?: boolean): MenuItem[] {
  return [
    { label: "Download", icon: "download", onClick: () => a.onDownload(file) },
    ...(a.onShare ? [{ label: "Share", icon: "person_add", onClick: () => a.onShare!(file) }] : []),
    ...(a.onToggleStar
      ? [{ label: starred ? "Remove from starred" : "Add to starred", icon: "star", onClick: () => a.onToggleStar!(file) }]
      : []),
    { label: "Rename", icon: "edit", onClick: () => a.onRename(file) },
    { label: "Move", icon: "drive_file_move", onClick: () => a.onMove(file) },
    { label: "Move to trash", icon: "delete", onClick: () => a.onDelete(file), danger: true },
  ];
}

export function FileTable({
  files,
  actions,
  ownerName,
  location,
  starredIds,
}: {
  files: FileItem[];
  actions: FileActions;
  ownerName: string;
  location: string;
  starredIds?: Set<string>;
}) {
  const initial = (ownerName || "?").trim().charAt(0).toUpperCase();
  const { settings } = useSettings();
  const pad = settings.density === "compact" ? "py-1.5" : "py-2.5";
  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b border-g-border text-left text-[13px] text-g-muted dark:border-white/10 dark:text-gray-400">
          <th className="py-2 pl-4 pr-3 font-medium">Name</th>
          <th className="hidden py-2 pr-3 font-medium md:table-cell">Owner</th>
          <th className="hidden py-2 pr-3 font-medium sm:table-cell">Location</th>
          <th className="hidden py-2 pr-3 font-medium lg:table-cell">File size</th>
          <th className="w-12 py-2 pr-2" />
        </tr>
      </thead>
      <tbody>
        {files.map((f) => {
          const { icon, color } = fileIcon(f.name, f.mime_type);
          const starred = starredIds?.has(f.id);
          return (
            <motion.tr
              key={f.id}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="group border-b border-g-border/60 hover:bg-g-hover dark:border-white/5 dark:hover:bg-white/5"
            >
              <td className={`${pad} pl-4 pr-3`}>
                <div className="flex items-center gap-3">
                  <Icon name={icon} size={20} className={color} fill />
                  <span className="truncate font-medium text-g-text dark:text-gray-100" title={f.name}>
                    {f.name}
                  </span>
                  {starred && <Icon name="star" size={14} fill className="text-g-muted" />}
                </div>
              </td>
              <td className={`hidden ${pad} pr-3 md:table-cell`}>
                <div className="flex items-center gap-2 text-g-muted dark:text-gray-400">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-g-blue text-[11px] font-medium text-white">
                    {initial}
                  </span>
                  me
                </div>
              </td>
              <td className={`hidden ${pad} pr-3 sm:table-cell`}>
                <span className="inline-flex items-center gap-1.5 text-g-muted dark:text-gray-400">
                  <Icon name="folder" size={16} fill /> {location}
                </span>
              </td>
              <td className={`hidden ${pad} pr-3 text-g-muted dark:text-gray-400 lg:table-cell`}>{formatSize(f.size_bytes)}</td>
              <td className={`${pad} pr-2`}>
                <div className="flex justify-end">
                  <Menu items={fileMenuItems(f, actions, starred)} label={`Actions for ${f.name}`} />
                </div>
              </td>
            </motion.tr>
          );
        })}
      </tbody>
    </table>
  );
}
