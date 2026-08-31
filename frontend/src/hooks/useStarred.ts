import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addStar, getStarred, removeStar } from "../api/stars";

type Target = { file_id: string } | { folder_id: string };

export function useStarred() {
  const qc = useQueryClient();
  const items = useQuery({ queryKey: ["starred"], queryFn: getStarred });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["starred"] });
  const star = useMutation({ mutationFn: addStar, onSuccess: invalidate });
  const unstar = useMutation({ mutationFn: removeStar, onSuccess: invalidate });
  const toggle = (target: Target, isStarred: boolean) =>
    isStarred ? unstar.mutate(target) : star.mutate(target);
  return { items, star, unstar, toggle };
}
