/** Maps a file's mime type / extension to a Material Symbol + Drive-ish color. */
export function fileIcon(name: string, mime?: string | null): { icon: string; color: string } {
  const m = (mime ?? "").toLowerCase();
  const ext = name.split(".").pop()?.toLowerCase() ?? "";

  if (m.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp", "svg", "heic"].includes(ext))
    return { icon: "image", color: "text-[#ea4335]" };
  if (m.startsWith("video/") || ["mp4", "mov", "mkv", "avi", "webm"].includes(ext))
    return { icon: "movie", color: "text-[#ea4335]" };
  if (m.startsWith("audio/") || ["mp3", "wav", "flac", "m4a", "ogg"].includes(ext))
    return { icon: "music_note", color: "text-[#e8710a]" };
  if (m === "application/pdf" || ext === "pdf")
    return { icon: "picture_as_pdf", color: "text-[#ea4335]" };
  if (["zip", "7z", "rar", "gz", "tar"].includes(ext) || m.includes("zip") || m.includes("compressed"))
    return { icon: "folder_zip", color: "text-[#5f6368]" };
  if (["csv", "xls", "xlsx"].includes(ext) || m.includes("spreadsheet"))
    return { icon: "table", color: "text-[#188038]" };
  if (["doc", "docx", "txt", "rtf", "md"].includes(ext) || m.startsWith("text/"))
    return { icon: "description", color: "text-[#1a73e8]" };
  if (["json", "js", "ts", "tsx", "py", "html", "css", "xml"].includes(ext))
    return { icon: "code", color: "text-[#1a73e8]" };
  return { icon: "draft", color: "text-[#5f6368]" };
}

/** Human-readable byte size, e.g. 3.4 MB. */
export function formatSize(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
