import { useDropzone } from "react-dropzone";
import { useUpload } from "../../hooks/useUpload";

export function UploadDropzone({ folderId, onUploaded }: { folderId: string | null; onUploaded: () => void }) {
  const { uploads, upload } = useUpload(folderId, onUploaded);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop: (files) => upload(files) });
  const list = Object.entries(uploads);

  return (
    <div className="px-6">
      <div {...getRootProps()}
        className={`glass cursor-pointer rounded-xl2 border-2 border-dashed p-6 text-center transition-colors ${isDragActive ? "border-brand-blue bg-brand-blue/10" : "border-white/50"}`}>
        <input {...getInputProps()} aria-label="Upload files" />
        <p className="text-slate-500">Drag & drop files here, or click to select</p>
      </div>
      {list.length > 0 && (
        <ul className="mt-3 space-y-2">
          {list.map(([k, u]) => (
            <li key={k} className="glass rounded-full px-4 py-2 text-sm">
              <span className={u.status === "done" ? "text-brand-green" : u.status === "error" ? "text-red-500" : "text-slate-600"}>
                {u.name} — {u.status === "done" ? "done" : u.status === "error" ? "failed" : `${u.pct}%`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
