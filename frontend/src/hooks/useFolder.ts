import { useQuery } from "@tanstack/react-query";
import { getBreadcrumb, getFolder } from "../api/folders";

export function useFolder(id: string) {
  const enabled = id !== "";
  const listing = useQuery({ queryKey: ["folder", id], queryFn: () => getFolder(id), enabled });
  const breadcrumb = useQuery({ queryKey: ["breadcrumb", id], queryFn: () => getBreadcrumb(id), enabled });
  return { listing, breadcrumb };
}
