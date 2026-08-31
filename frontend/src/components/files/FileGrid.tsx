import type { FileItem, Folder } from "../../types";
import { FolderRow } from "./FolderRow";
import { FileRow } from "./FileRow";

interface Props {
  folders: Folder[]; files: FileItem[];
  onOpenFolder: (id: string) => void;
  onDownload: (f: FileItem) => void;
  onRenameFile: (f: FileItem) => void;
  onRenameFolder: (f: Folder) => void;
  onMove: (f: FileItem) => void;
  onDeleteFile: (f: FileItem) => void;
  onDeleteFolder: (f: Folder) => void;
  onShareFile?: (f: FileItem) => void;
  onShareFolder?: (f: Folder) => void;
  onToggleStarFile?: (f: FileItem) => void;
  onToggleStarFolder?: (f: Folder) => void;
  starredIds?: Set<string>;
}

export function FileGrid(p: Props) {
  if (p.folders.length === 0 && p.files.length === 0) {
    return <p className="p-8 text-center text-slate-400">This folder is empty.</p>;
  }
  return (
    <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
      {p.folders.map((f) => (
        <FolderRow key={f.id} folder={f} onOpen={p.onOpenFolder}
          onRename={p.onRenameFolder} onDelete={p.onDeleteFolder}
          onShare={p.onShareFolder} onToggleStar={p.onToggleStarFolder}
          starred={p.starredIds?.has(f.id)} />
      ))}
      {p.files.map((f) => (
        <FileRow key={f.id} file={f} onDownload={p.onDownload} onRename={p.onRenameFile}
          onMove={p.onMove} onDelete={p.onDeleteFile}
          onShare={p.onShareFile} onToggleStar={p.onToggleStarFile}
          starred={p.starredIds?.has(f.id)} />
      ))}
    </div>
  );
}
