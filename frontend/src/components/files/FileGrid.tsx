import type { FileItem, Folder } from "../../types";
import { Icon } from "../ui/Icon";
import { FolderCard } from "./FolderCard";
import { FileTable, type FileActions } from "./FileTable";
import { FileTile } from "./FileTile";

interface Props {
  folders: Folder[];
  files: FileItem[];
  view?: "list" | "grid";
  ownerName?: string;
  location?: string;
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
  const view = p.view ?? "list";
  const ownerName = p.ownerName ?? "me";
  const location = p.location ?? "My Drive";

  if (p.folders.length === 0 && p.files.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 p-16 text-center text-g-muted">
        <Icon name="folder_open" size={48} className="text-g-borderStrong" />
        <p>This folder is empty.</p>
      </div>
    );
  }

  const fileActions: FileActions = {
    onDownload: p.onDownload,
    onRename: p.onRenameFile,
    onMove: p.onMove,
    onDelete: p.onDeleteFile,
    onShare: p.onShareFile,
    onToggleStar: p.onToggleStarFile,
  };

  return (
    <div className="space-y-6 px-4 pb-8">
      {p.folders.length > 0 && (
        <section>
          <h2 className="mb-2 px-1 text-sm font-medium text-g-text">Folders</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {p.folders.map((f) => (
              <FolderCard
                key={f.id}
                folder={f}
                onOpen={p.onOpenFolder}
                onRename={p.onRenameFolder}
                onDelete={p.onDeleteFolder}
                onShare={p.onShareFolder}
                onToggleStar={p.onToggleStarFolder}
                starred={p.starredIds?.has(f.id)}
              />
            ))}
          </div>
        </section>
      )}

      {p.files.length > 0 && (
        <section>
          <h2 className="mb-2 px-1 text-sm font-medium text-g-text">Files</h2>
          {view === "list" ? (
            <FileTable
              files={p.files}
              actions={fileActions}
              ownerName={ownerName}
              location={location}
              starredIds={p.starredIds}
            />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
              {p.files.map((f) => (
                <FileTile key={f.id} file={f} actions={fileActions} starred={p.starredIds?.has(f.id)} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
