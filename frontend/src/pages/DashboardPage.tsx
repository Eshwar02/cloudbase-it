import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Topbar } from "../components/layout/Topbar";
import { Breadcrumb } from "../components/layout/Breadcrumb";
import { FileGrid } from "../components/files/FileGrid";
import { Button } from "../components/ui/Button";
import { Spinner } from "../components/ui/Spinner";
import { useDrive } from "../hooks/useDrive";
import { useFolder } from "../hooks/useFolder";
import { createFolder, deleteFolder } from "../api/folders";
import { deleteFile, getDownloadUrl } from "../api/files";
import { useToast } from "../components/ui/Toast";

export default function DashboardPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { notify } = useToast();
  const drive = useDrive();
  const folder = useFolder(id ?? "");

  const isRoot = !id;
  const listing = isRoot ? drive.data : folder.listing.data;
  const loading = isRoot ? drive.isLoading : folder.listing.isLoading;

  const folders = isRoot ? drive.data?.folders ?? [] : folder.listing.data?.folders ?? [];
  const files = isRoot ? drive.data?.files ?? [] : folder.listing.data?.files ?? [];

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: isRoot ? ["drive"] : ["folder", id] });
  };

  async function onNewFolder() {
    const name = prompt("Folder name");
    if (!name) return;
    await createFolder(name, id ?? null);
    invalidate();
    notify("Folder created", "success");
  }

  async function onDownload(f: { id: string }) {
    const url = await getDownloadUrl(f.id);
    window.open(url, "_blank");
  }

  async function onDeleteFile(f: { id: string }) {
    await deleteFile(f.id); invalidate(); notify("Moved to trash", "info");
  }
  async function onDeleteFolder(f: { id: string }) {
    await deleteFolder(f.id); invalidate(); notify("Folder trashed", "info");
  }

  return (
    <div>
      <Topbar />
      <div className="flex items-center justify-between px-6 py-4">
        <Breadcrumb entries={isRoot ? [] : folder.breadcrumb.data ?? []}
          onNavigate={(fid) => nav(fid ? `/folder/${fid}` : "/")} />
        <Button intent="primary" onClick={onNewFolder}>New folder</Button>
      </div>
      {loading ? (
        <div className="flex justify-center p-10"><Spinner /></div>
      ) : (
        <FileGrid
          folders={folders} files={files}
          onOpenFolder={(fid) => nav(`/folder/${fid}`)}
          onDownload={onDownload}
          onRenameFile={() => {}} onRenameFolder={() => {}} onMove={() => {}}
          onDeleteFile={onDeleteFile} onDeleteFolder={onDeleteFolder}
        />
      )}
    </div>
  );
}
