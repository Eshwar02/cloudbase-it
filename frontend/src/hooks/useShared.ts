import { useQuery } from "@tanstack/react-query";
import { getSharedWithMe } from "../api/sharing";

export function useShared() {
  return useQuery({ queryKey: ["shared-with-me"], queryFn: getSharedWithMe });
}
