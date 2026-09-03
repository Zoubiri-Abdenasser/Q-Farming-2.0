import { trpc } from "../providers/trpc";

export function useAuth() {
  const utils = trpc.useUtils();
  const meQuery = trpc.auth.me.useQuery();

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: () => utils.auth.me.invalidate(),
  });

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: () => utils.auth.me.invalidate(),
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => utils.auth.me.invalidate(),
  });

  return {
    user: meQuery.data?.user ?? null,
    isLoading: meQuery.isLoading,
    isAuthenticated: !!meQuery.data?.user,
    login: loginMutation.mutateAsync,
    register: registerMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    loginError: loginMutation.error,
    registerError: registerMutation.error,
  };
}