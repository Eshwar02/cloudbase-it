import { api } from "../lib/axios";
import type { SearchResult } from "../types";

export const search = (q: string, type: "all" | "file" | "folder" = "all") =>
  api.get<SearchResult[]>("/search", { params: { q, type } }).then((r) => r.data);

export const semanticSearch = (q: string) =>
  api.get<SearchResult[]>("/search/semantic", { params: { q } }).then((r) => r.data);
