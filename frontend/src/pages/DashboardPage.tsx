import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Topbar } from "../components/layout/Topbar";
import { Breadcrumb } from "../components/layout/Breadcrumb";
import { FileGrid } from "../components/files/FileGrid";
import { Button } from "../components/ui/Button";
import { Icon } from "../components/ui/Icon";
import { Spinner } from "../components/ui/Spinner";
import { useDrive } from "../hooks/useDrive";
import { useFolder } from "../hooks/useFolder";
import { useAuth } from "../hooks/useAuth";
import { useUpload } from "../hooks/useUpload";
import { useDriveActions } from "../hooks/useDriveActions";
import { createFolder, deleteFolder, updateFolder } from "../api/folders";
import { deleteFile, getDownloadUrl, updateFile } from "../api/files";
import { useToast } from "../components/ui/Toast";
import { UploadDropzone } from "../components/files/UploadDropzone";
import { RenameModal } from "../components/files/RenameModal";
import { MoveModal } from "../components/files/MoveModal";
import { ShareModal, type ShareTarget } from "../components/files/ShareModal";
import { OrganizeModal } from "../components/files/OrganizeModal";
import { useStarred } from "../hooks/useStarred";

export default function DashboardPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { notify } = useToast();
  const { user } = useAuth();
  const driveActions = useDriveActions();
  const drive = useDrive();
  const folder = useFolder(id ?? "");
  const starred = useStarred();
  const starredIds = new Set((starred.items.data ?? []).map((i) => i.id));
  const [renameTarget, setRenameTarget] = useState<{ kind: "file" | "folder"; id: string; name: string } | null>(null);
  const [moveTarget, setMoveTarget] = useState<{ id: string } | null>(null);
  const [shareTarget, setShareTarget] = useState<ShareTarget | null>(null);
  const [organizeOpen, setOrganizeOpen] = useState(false);
  const [view, setView] = useState<"list" | "grid">("list");

  const isRoot = !id;
  const loading = isRoot ? drive.isLoading : folder.listing.isLoading;

  const folders = isRoot ? drive.data?.folders ?? [] : folder.listing.data?.folders ?? [];
  const files = isRoot ? drive.data?.files ?? [] : folder.listing.data?.files ?? [];
  const crumbs = folder.breadcrumb.data ?? [];
  const locationLabel = isRoot ? "My Drive" : crumbs[crumbs.length - 1]?.name ?? "My Drive";
  const uploader = useUpload(id ?? null, () => invalidate());

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: isRoot ? ["drive"] : ["folder", id] });
    if (!isRoot && id) qc.invalidateQueries({ queryKey: ["breadcrumb", id] });
  };

  const notifyError = (e: unknown) => {
    const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
    notify(detail ?? "Something went wrong", "error");
  };

  async function onNewFolder() {
    const name = prompt("Folder name");
    if (!name) return;
    try {
      await createFolder(name, id ?? null);
      invalidate();
      notify("Folder created", "success");
    } catch (e) {
      notifyError(e);
    }
  }

  // Bridge the sidebar's global "New" button to this folder's context.
  useEffect(() => {
    driveActions.register({ newFolder: onNewFolder, uploadFiles: (files) => uploader.upload(files) });
    return () => driveActions.unregister();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function onDownload(f: { id: string }) {
    try {
      const url = await getDownloadUrl(f.id);
      window.open(url, "_blank");
    } catch (e) {
      notifyError(e);
    }
  }

  async function onDeleteFile(f: { id: string }) {
    try {
      await deleteFile(f.id); invalidate(); notify("Moved to trash", "info");
    } catch (e) {
      notifyError(e);
    }
  }
  async function onDeleteFolder(f: { id: string }) {
    try {
      await deleteFolder(f.id); invalidate(); notify("Folder trashed", "info");
    } catch (e) {
      notifyError(e);
    }
  }

  return (
    <div>
      <Topbar />
      <div className="flex items-center justify-between px-6 pb-2 pt-2">
        <Breadcrumb entries={isRoot ? [] : folder.breadcrumb.data ?? []}
          onNavigate={(fid) => nav(fid ? `/folder/${fid}` : "/")} />
        <div className="flex items-center gap-1">
          {!isRoot && (
            <Button intent="ghost" onClick={() => setOrganizeOpen(true)}>
              <Icon name="auto_awesome" size={18} className="text-g-blue" /> Organize
            </Button>
          )}
          <div className="ml-1 flex items-center rounded-full border border-g-border p-0.5">
            <button
              aria-label="List view"
              aria-pressed={view === "list"}
              onClick={() => setView("list")}
              className={`grid h-8 w-8 place-items-center rounded-full ${view === "list" ? "bg-g-selected text-g-selectedText" : "text-g-muted hover:bg-g-hover"}`}
            >
              <Icon name="format_list_bulleted" size={20} />
            </button>
            <button
              aria-label="Grid view"
              aria-pressed={view === "grid"}
              onClick={() => setView("grid")}
              className={`grid h-8 w-8 place-items-center rounded-full ${view === "grid" ? "bg-g-selected text-g-selectedText" : "text-g-muted hover:bg-g-hover"}`}
            >
              <Icon name="grid_view" size={20} />
            </button>
          </div>
        </div>
      </div>
      <div className="pb-3">
        <UploadDropzone folderId={id ?? null} onUploaded={invalidate} controls={uploader} />
      </div>
      {loading ? (
        <div className="flex justify-center p-10"><Spinner /></div>
      ) : (
        <FileGrid
          folders={folders} files={files}
          view={view}
          ownerName={user?.display_name ?? "me"}
          location={locationLabel}
          onOpenFolder={(fid) => nav(`/folder/${fid}`)}
          onDownload={onDownload}
          onRenameFile={(f) => setRenameTarget({ kind: "file", id: f.id, name: f.name })}
          onRenameFolder={(f) => setRenameTarget({ kind: "folder", id: f.id, name: f.name })}
          onMove={(f) => setMoveTarget({ id: f.id })}
          onDeleteFile={onDeleteFile} onDeleteFolder={onDeleteFolder}
          onShareFile={(f) => setShareTarget({ kind: "file", id: f.id, name: f.name })}
          onShareFolder={(f) => setShareTarget({ kind: "folder", id: f.id, name: f.name })}
          onToggleStarFile={(f) => starred.toggle({ file_id: f.id }, starredIds.has(f.id))}
          onToggleStarFolder={(f) => starred.toggle({ folder_id: f.id }, starredIds.has(f.id))}
          starredIds={starredIds}
        />
      )}
      <RenameModal open={!!renameTarget} initialName={renameTarget?.name ?? ""}
        onClose={() => setRenameTarget(null)}
        onSubmit={async (name) => {
          if (!renameTarget) return;
          try {
            if (renameTarget.kind === "file") await updateFile(renameTarget.id, { name });
            else await updateFolder(renameTarget.id, { name });
            setRenameTarget(null); invalidate(); notify("Renamed", "success");
          } catch (e) {
            notifyError(e);
          }
        }} />
      <MoveModal open={!!moveTarget} folders={folders}
        onClose={() => setMoveTarget(null)}
        onSubmit={async (folderId) => {
          if (!moveTarget) return;
          try {
            await updateFile(moveTarget.id, { folder_id: folderId });
            setMoveTarget(null); invalidate(); notify("Moved", "success");
          } catch (e) {
            notifyError(e);
          }
        }} />
      <ShareModal target={shareTarget} onClose={() => setShareTarget(null)} />
      <OrganizeModal open={organizeOpen} folderId={id ?? null}
        onClose={() => setOrganizeOpen(false)} onApplied={invalidate} />
    </div>
  );
}
