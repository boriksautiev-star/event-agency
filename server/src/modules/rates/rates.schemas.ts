import { z } from "zod";

export const RateLookupQuerySchema = z.object({
  animatorId: z.string().uuid(),
  characterId: z.string().uuid(),
  durationMin: z.coerce.number().int().min(1).max(24 * 60),
});

export const MatrixQuerySchema = z.object({
  animatorId: z.string().uuid(),
});

export const MatrixCellSchema = z.object({
  rateGroupId: z.string().uuid(),
  durationMin: z.number().int().min(1).max(24 * 60),
  amount: z.number().min(0).nullable(),
});

export const SaveMatrixSchema = z.object({
  animatorId: z.string().uuid(),
  cells: z.array(MatrixCellSchema).min(1).max(500),
});

export type RateLookupQuery = z.infer<typeof RateLookupQuerySchema>;
export type MatrixQuery = z.infer<typeof MatrixQuerySchema>;
export type MatrixCellInput = z.infer<typeof MatrixCellSchema>;
export type SaveMatrixInput = z.infer<typeof SaveMatrixSchema>;