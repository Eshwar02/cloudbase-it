import { useQuery } from "@tanstack/react-query";
import { getDrive } from "../api/drive";

export function useDrive() {
  return useQuery({ queryKey: ["drive"], queryFn: getDrive });
}
