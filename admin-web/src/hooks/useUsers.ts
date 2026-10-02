import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchUsers,
  createUser,
  updateUser,
  updateUserPassword,
  deleteUser,
  ListUsersParams,
  CreateUserInput,
  UpdateUserInput,
} from "../api/users";

export function useUsers(params?: ListUsersParams) {
  return useQuery({
    queryKey: ["users", params],
    queryFn: () => fetchUsers(params),
    staleTime: 30_000,
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateUserInput) => createUser(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; input: UpdateUserInput }) =>
      updateUser(vars.id, vars.input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useUpdateUserPassword() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; password: string }) =>
      updateUserPassword(vars.id, vars.password),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}
