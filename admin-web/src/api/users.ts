import { api } from "./client";

export type UserRole = "director" | "admin" | "animator";
export type UserStatus = "active" | "blocked" | "invited";

export type UserLite = {
  id: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  status: UserStatus;
};

export type ListUsersParams = {
  role?: UserRole;
  status?: UserStatus;
  search?: string;
  limit?: number;
  offset?: number;
};

export async function fetchUsers(params?: ListUsersParams): Promise<{
  items: UserLite[];
  total: number;
}> {
  const q = new URLSearchParams();
  if (params?.role) q.set("role", params.role);
  if (params?.status) q.set("status", params.status);
  if (params?.search) q.set("search", params.search);
  if (params?.limit) q.set("limit", String(params.limit));
  if (params?.offset) q.set("offset", String(params.offset));
  const suffix = q.toString() ? `?${q.toString()}` : "";
  const { data } = await api.get<{ items: UserLite[]; total: number } | UserLite[]>(
    `/users${suffix}`,
  );
  if (Array.isArray(data)) return { items: data, total: data.length };
  return { items: data.items, total: data.total ?? data.items.length };
}

export async function fetchAnimators(): Promise<UserLite[]> {
  const { items } = await fetchUsers({ role: "animator", limit: 200 });
  return items;
}

export type CreateUserInput = {
  role: UserRole;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string | null;
  password: string;
};

export type UpdateUserInput = {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string | null;
  status?: UserStatus;
};

export async function createUser(input: CreateUserInput): Promise<UserLite> {
  const { data } = await api.post<any>("/users", input);
  return (data.user ?? data) as UserLite;
}

export async function updateUser(id: string, input: UpdateUserInput): Promise<UserLite> {
  const { data } = await api.patch<any>(`/users/${id}`, input);
  return (data.user ?? data) as UserLite;
}

export async function updateUserPassword(id: string, password: string): Promise<void> {
  await api.patch(`/users/${id}/password`, { password });
}

export async function deleteUser(id: string): Promise<void> {
  await api.delete(`/users/${id}`);
}
