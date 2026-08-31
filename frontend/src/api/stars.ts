import { api } from "../lib/axios";
import type { StarredItem } from "../types";

type Target = { file_id: string } | { folder_id: string };

export const getStarred = () =>
  api.get<StarredItem[]>("/stars").then((r) => r.data);

export const addStar = (target: Target) =>
  api.post("/stars", target).then((r) => r.data);

export const removeStar = (target: Target) =>
  api.delete("/stars", { params: target }).then((r) => r.data);
