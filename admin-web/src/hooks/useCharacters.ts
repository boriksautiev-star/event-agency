import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchCharacters,
  fetchCharacterById,
  createCharacter,
  updateCharacter,
  replaceCharacterPrices,
  deleteCharacter,
  CharacterInput,
  CharacterPriceInput,
} from "../api/characters";

export type CharactersParams = {
  activeOnly?: boolean;
  includeInactive?: boolean;
  rateGroupId?: string;
  search?: string;
};

export function useCharacters(params?: CharactersParams) {
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

export function useCreateCharacter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CharacterInput & { prices: CharacterPriceInput[] }) =>
      createCharacter(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["characters"] });
      qc.invalidateQueries({ queryKey: ["rate-groups"] });
    },
  });
}

export function useUpdateCharacter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; input: Partial<CharacterInput> }) =>
      updateCharacter(vars.id, vars.input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["characters"] });
      qc.invalidateQueries({ queryKey: ["character"] });
      qc.invalidateQueries({ queryKey: ["rate-groups"] });
    },
  });
}

export function useReplaceCharacterPrices() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; prices: CharacterPriceInput[] }) =>
      replaceCharacterPrices(vars.id, vars.prices),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["characters"] });
      qc.invalidateQueries({ queryKey: ["character"] });
    },
  });
}

export function useDeleteCharacter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCharacter(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["characters"] });
      qc.invalidateQueries({ queryKey: ["rate-groups"] });
    },
  });
}
