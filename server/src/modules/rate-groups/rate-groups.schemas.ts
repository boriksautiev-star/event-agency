import { z } from "zod";

export const CreateRateGroupSchema = z.object({
  name: z.string().min(1).max(100),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

export const UpdateRateGroupSchema = CreateRateGroupSchema.partial();

export type CreateRateGroupInput = z.infer<typeof CreateRateGroupSchema>;
export type UpdateRateGroupInput = z.infer<typeof UpdateRateGroupSchema>;