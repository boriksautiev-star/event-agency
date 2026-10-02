import { api } from "./client";

export type AnimatorLite = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  status: "active" | "blocked" | "invited";
};

export async function fetchAnimators(): Promise<AnimatorLite[]> {
  const { data } = await api.get<{ items: AnimatorLite[] } | AnimatorLite[]>(
    "/users?role=animator",
  );
  return Array.isArray(data) ? data : data.items;
}
