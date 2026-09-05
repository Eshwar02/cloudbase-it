import { useQuery } from "@tanstack/react-query";
import { search, semanticSearch } from "../api/search";

export function useSearch(
  q: string,
  type: "all" | "file" | "folder" = "all",
  semantic = false,
) {
  return useQuery({
    queryKey: ["search", q, type, semantic],
    queryFn: () => (semantic ? semanticSearch(q) : search(q, type)),
    enabled: q.trim().length > 0,
  });
}
