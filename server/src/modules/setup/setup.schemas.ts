import { z } from "zod";

export const SetupSchema = z.object({
  agencyName: z.string().min(2).max(200),
  timezone: z.string().min(2).max(64).default("Europe/Moscow"),
  currency: z.string().length(3).default("RUB"),

  firstName: z.string().min(2).max(100),
  lastName: z.string().min(2).max(100),
  phone: z.string().min(5).max(32),
  email: z.string().email().optional(),
  password: z.string().min(8).max(128),
});

export type SetupInput = z.infer<typeof SetupSchema>;
