import axios from "axios";
import { api } from "../lib/axios";
import type { FileItem, InitUploadResponse } from "../types";

export const initUpload = (body: { name: string; folder_id: string | null; mime_type: string | null; size_bytes: number }) =>
  api.post<InitUploadResponse>("/files/init-upload", body).then((r) => r.data);

export const putToSignedUrl = (
  url: string, file: File, onProgress?: (pct: number) => void,
) =>
  axios.put(url, file, {
    headers: { "Content-Type": file.type || "application/octet-stream" },
    onUploadProgress: (e) => {
      if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
    },
  });

export const completeUpload = (file_id: string) =>
  api.post<FileItem>("/files/complete-upload", { file_id }).then((r) => r.data);

export const getFile = (id: string) =>
  api.get<FileItem>(`/files/${id}`).then((r) => r.data);

export const getDownloadUrl = (id: string) =>
  api.get<{ download_url: string }>(`/files/${id}/download`).then((r) => r.data.download_url);

export const updateFile = (id: string, body: { name?: string; folder_id?: string }) =>
  api.patch<FileItem>(`/files/${id}`, body).then((r) => r.data);

export const deleteFile = (id: string) =>
  api.delete(`/files/${id}`).then((r) => r.data);
