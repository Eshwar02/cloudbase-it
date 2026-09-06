import { useDropzone } from "react-dropzone";
import { useUpload, type UploadState } from "../../hooks/useUpload";
import { Icon } from "../ui/Icon";

export function UploadDropzone({
  folderId,
  onUploaded,
  controls,
}: {
  folderId: string | null;
  onUploaded: () => void;
  controls?: { uploads: Record<string, UploadState>; upload: (files: File[]) => void };
}) {
  const own = useUpload(folderId, onUploaded);
  const { uploads, upload } = controls ?? own;
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop: (files) => upload(files) });
  const list = Object.entries(uploads);

  return (
    <div className="px-6">
      <div
        {...getRootProps()}
        className={`flex cursor-pointer items-center justify-center gap-3 rounded-xl border border-dashed p-4 text-sm transition-colors ${
          isDragActive ? "border-g-blue bg-g-blue/5 text-g-blue" : "border-g-border text-g-muted hover:bg-g-hover"
        }`}
      >
        <input {...getInputProps()} aria-label="Upload files" />
        <Icon name="cloud_upload" size={22} />
        <span>Drag &amp; drop files here, or click to upload</span>
      </div>
      {list.length > 0 && (
        <ul className="mt-3 space-y-2">
          {list.map(([k, u]) => (
            <li key={k} className="flex items-center gap-3 rounded-lg border border-g-border px-4 py-2 text-sm">
              <Icon
                name={u.status === "done" ? "check_circle" : u.status === "error" ? "error" : "progress_activity"}
                size={18}
                className={u.status === "done" ? "text-[#188038]" : u.status === "error" ? "text-red-600" : "text-g-blue"}
              />
              <span className="flex-1 truncate text-g-text">{u.name}</span>
              <span className="text-g-muted">
                {u.status === "done" ? "Done" : u.status === "error" ? "Failed" : `${u.pct}%`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
