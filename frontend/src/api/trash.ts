import { api } from "../lib/axios";
import type { TrashItem } from "../types";

export const getTrash = () => api.get<TrashItem[]>("/trash").then((r) => r.data);

export const restoreItem = (item_type: "file" | "folder", id: string) =>
  api.post(`/trash/${item_type}/${id}/restore`).then((r) => r.data);

export const purgeItem = (item_type: "file" | "folder", id: string) =>
  api.delete(`/trash/${item_type}/${id}`).then((r) => r.data);
