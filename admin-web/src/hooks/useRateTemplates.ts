import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  assignTemplate,
  createTemplate,
  deleteTemplate,
  fetchOverrides,
  fetchTemplateById,
  fetchTemplates,
  OverrideCell,
  saveOverrides,
  saveTemplateRates,
  SaveTemplateCell,
  updateTemplate,
} from "../api/rate-templates";

export function useRateTemplates() {
  return useQuery({
    queryKey: ["rate-templates"],
    queryFn: fetchTemplates,
    staleTime: 30_000,
  });
}

export function useRateTemplate(id: string | undefined) {
  return useQuery({
    queryKey: ["rate-templates", id],
    queryFn: () => fetchTemplateById(id!),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useCreateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; notes?: string | null; copyFromTemplateId?: string | null }) =>
      createTemplate(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rate-templates"] });
    },
  });
}

export function useUpdateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; patch: { name?: string; notes?: string | null; isActive?: boolean } }) =>
      updateTemplate(args.id, args.patch),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["rate-templates"] });
      qc.invalidateQueries({ queryKey: ["rate-templates", vars.id] });
    },
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTemplate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rate-templates"] });
    },
  });
}

export function useSaveTemplateRates() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; cells: SaveTemplateCell[] }) =>
      saveTemplateRates(args.id, args.cells),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["rate-templates"] });
      qc.invalidateQueries({ queryKey: ["rate-templates", vars.id] });
    },
  });
}

export function useAssignTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { animatorId: string; templateId: string | null }) =>
      assignTemplate(args.animatorId, args.templateId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rate-templates"] });
      qc.invalidateQueries({ queryKey: ["overrides"] });
    },
  });
}

export function useOverrides(animatorId: string | undefined) {
  return useQuery({
    queryKey: ["overrides", animatorId],
    queryFn: () => fetchOverrides(animatorId!),
    enabled: !!animatorId,
    staleTime: 30_000,
  });
}

export function useSaveOverrides() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { animatorId: string; cells: OverrideCell[] }) =>
      saveOverrides(args.animatorId, args.cells),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["overrides", vars.animatorId] });
    },
  });
}
