import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchClients, createClient, ClientCreateInput } from "../api/clients";

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
