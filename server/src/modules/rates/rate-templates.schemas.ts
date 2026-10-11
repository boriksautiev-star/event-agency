import { z } from "zod";

export const CreateTemplateSchema = z.object({
  name: z.string().min(2).max(100),
  notes: z.string().max(500).nullable().optional(),
  copyFromTemplateId: z.string().uuid().nullable().optional(),
});

export const UpdateTemplateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  notes: z.string().max(500).nullable().optional(),
  isActive: z.boolean().optional(),
});

export const TemplateCellSchema = z.object({
  rateGroupId: z.string().uuid(),
  durationMin: z.number().int().min(1).max(24 * 60),
  amount: z.number().min(0).nullable(),
});

export const SaveTemplateRatesSchema = z.object({
  cells: z.array(TemplateCellSchema).min(1).max(1000),
});

export const AssignTemplateSchema = z.object({
  animatorId: z.string().uuid(),
  templateId: z.string().uuid().nullable(),
});

export const OverrideCellSchema = z.object({
  characterId: z.string().uuid(),
  durationMin: z.number().int().min(1).max(24 * 60),
  amount: z.number().min(0),
});

export const SaveOverridesSchema = z.object({
  animatorId: z.string().uuid(),
  cells: z.array(OverrideCellSchema).min(0).max(2000),
});

export type CreateTemplateInput = z.infer<typeof CreateTemplateSchema>;
export type UpdateTemplateInput = z.infer<typeof UpdateTemplateSchema>;
export type SaveTemplateRatesInput = z.infer<typeof SaveTemplateRatesSchema>;
export type AssignTemplateInput = z.infer<typeof AssignTemplateSchema>;
export type SaveOverridesInput = z.infer<typeof SaveOverridesSchema>;
