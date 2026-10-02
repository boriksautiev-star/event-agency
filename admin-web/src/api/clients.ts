import { api } from "./client";
import type { Client, ListResponse } from "./types";

export async function fetchClients(params?: { search?: string }): Promise<Client[]> {
  const q = new URLSearchParams();
  if (params?.search) q.set("search", params.search);
  // limit не ставим — сервер вернёт дефолтные 50, для нашего объёма хватает
  const { data } = await api.get<ListResponse<Client>>(`/clients?${q.toString()}`);
  return data.items;
}

export type ClientCreateInput = {
  name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
};

export async function createClient(data: ClientCreateInput): Promise<Client> {
  const { data: res } = await api.post<{ client?: Client } | Client>("/clients", data);
  return ((res as any).client ?? res) as Client;
}

export async function fetchClientById(id: string): Promise<Client> {
  const { data } = await api.get<any>(`/clients/${id}`);
  return (data.client ?? data) as Client;
}

export type ClientUpdateInput = Partial<ClientCreateInput>;

export async function updateClient(
  id: string,
  input: ClientUpdateInput,
): Promise<Client> {
  const { data } = await api.patch<any>(`/clients/${id}`, input);
  return (data.client ?? data) as Client;
}

export async function deleteClient(id: string): Promise<void> {
  await api.delete(`/clients/${id}`);
}
