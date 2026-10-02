import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchClients,
  fetchClientById,
  createClient,
  updateClient,
  deleteClient,
  ClientCreateInput,
  ClientUpdateInput,
} from "../api/clients";

export function useClients(params?: { search?: string }) {
  return useQuery({
    queryKey: ["clients", params],
    queryFn: () => fetchClients(params),
    staleTime: 60_000,
  });
}

export function useCreateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ClientCreateInput) => createClient(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}

export function useClient(id: string | undefined) {
  return useQuery({
    queryKey: ["client", id],
    queryFn: () => fetchClientById(id!),
    enabled: !!id,
  });
}

export function useUpdateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; input: ClientUpdateInput }) =>
      updateClient(vars.id, vars.input),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["client", vars.id] });
    },
  });
}

export function useDeleteClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteClient(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
  });
}
