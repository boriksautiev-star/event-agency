import { z } from "zod";

export const CharacterPriceInputSchema = z.object({
  durationMin: z.number().int().min(1).max(24 * 60),
  price: z.number().min(0),
});

export const CreateCharacterSchema = z.object({
  name: z.string().min(1).max(200),
  rateGroupId: z.string().uuid(),
  notes: z.string().max(2000).optional().nullable(),
  isActive: z.boolean().default(true),
  prices: z.array(CharacterPriceInputSchema).default([]),
});

export const UpdateCharacterSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  rateGroupId: z.string().uuid().optional(),
  notes: z.string().max(2000).optional().nullable(),
  isActive: z.boolean().optional(),
});

export const ReplacePricesSchema = z.object({
  prices: z.array(CharacterPriceInputSchema),
});

export type CharacterPriceInput = z.infer<typeof CharacterPriceInputSchema>;
export type CreateCharacterInput = z.infer<typeof CreateCharacterSchema>;
export type UpdateCharacterInput = z.infer<typeof UpdateCharacterSchema>;
export type ReplacePricesInput = z.infer<typeof ReplacePricesSchema>;