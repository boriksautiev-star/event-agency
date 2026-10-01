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
