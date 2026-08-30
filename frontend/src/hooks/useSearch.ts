import { useQuery } from "@tanstack/react-query";
import { search } from "../api/search";

export function useSearch(q: string, type: "all" | "file" | "folder" = "all") {
  return useQuery({
    queryKey: ["search", q, type],
    queryFn: () => search(q, type),
    enabled: q.trim().length > 0,
  });
}
