import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getTrash, purgeItem, restoreItem } from "../api/trash";
import type { TrashItem } from "../types";

export function useTrash() {
  const qc = useQueryClient();
  const items = useQuery({ queryKey: ["trash"], queryFn: getTrash });
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["trash"] });
    qc.invalidateQueries({ queryKey: ["drive"] });
  };
  const restore = useMutation({
    mutationFn: (i: TrashItem) => restoreItem(i.item_type, i.id), onSuccess: invalidate,
  });
  const purge = useMutation({
    mutationFn: (i: TrashItem) => purgeItem(i.item_type, i.id), onSuccess: invalidate,
  });
  return { items, restore, purge };
}
