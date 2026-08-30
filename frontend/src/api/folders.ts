import { api } from "../lib/axios";
import type { BreadcrumbEntry, Folder, FolderListing } from "../types";

export const createFolder = (name: string, parent_id: string | null) =>
  api.post<Folder>("/folders", { name, parent_id }).then((r) => r.data);

export const getFolder = (id: string) =>
  api.get<FolderListing>(`/folders/${id}`).then((r) => r.data);

export const getBreadcrumb = (id: string) =>
  api.get<BreadcrumbEntry[]>(`/folders/${id}/breadcrumb`).then((r) => r.data);

export const updateFolder = (id: string, body: { name?: string; parent_id?: string }) =>
  api.patch<Folder>(`/folders/${id}`, body).then((r) => r.data);

export const deleteFolder = (id: string) =>
  api.delete(`/folders/${id}`).then((r) => r.data);
