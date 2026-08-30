import { useState } from "react";
import { completeUpload, initUpload, putToSignedUrl } from "../api/files";

export interface UploadState { name: string; pct: number; status: "uploading" | "done" | "error"; }

export function useUpload(folderId: string | null, onDone?: () => void) {
  const [uploads, setUploads] = useState<Record<string, UploadState>>({});

  async function upload(files: File[]) {
    for (const file of files) {
      const key = `${file.name}-${Date.now()}`;
      setUploads((u) => ({ ...u, [key]: { name: file.name, pct: 0, status: "uploading" } }));
      try {
        const init = await initUpload({
          name: file.name, folder_id: folderId,
          mime_type: file.type || null, size_bytes: file.size,
        });
        await putToSignedUrl(init.upload_url, file, (pct) =>
          setUploads((u) => ({ ...u, [key]: { ...u[key], pct } })));
        await completeUpload(init.file_id);
        setUploads((u) => ({ ...u, [key]: { ...u[key], pct: 100, status: "done" } }));
      } catch {
        setUploads((u) => ({ ...u, [key]: { ...u[key], status: "error" } }));
      }
    }
    onDone?.();
  }

  return { uploads, upload };
}
