import { useQuery } from "@tanstack/react-query";
import { fetchCharacters, fetchCharacterById } from "../api/characters";

export function useCharacters(params?: { activeOnly?: boolean; search?: string }) {
  return useQuery({
    queryKey: ["characters", params],
    queryFn: () => fetchCharacters(params),
    staleTime: 60_000,
  });
}

export function useCharacter(id: string | undefined) {
  return useQuery({
    queryKey: ["character", id],
    queryFn: () => fetchCharacterById(id!),
    enabled: !!id,
    staleTime: 60_000,
  });
}
