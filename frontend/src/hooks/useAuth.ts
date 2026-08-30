import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as authApi from "../api/auth";

export function useAuth() {
  const qc = useQueryClient();
  const me = useQuery({ queryKey: ["me"], queryFn: authApi.getMe });

  const loginMut = useMutation({
    mutationFn: (v: { email: string; password: string }) => authApi.login(v.email, v.password),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["me"] }),
  });

  const registerMut = useMutation({
    mutationFn: (v: { email: string; password: string; display_name: string }) =>
      authApi.register(v.email, v.password, v.display_name),
  });

  const logoutMut = useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => qc.setQueryData(["me"], null),
  });

  return {
    user: me.data ?? null,
    isLoading: me.isLoading,
    isError: me.isError,
    refetchMe: me.refetch,
    loginMut, registerMut, logoutMut,
  };
}
