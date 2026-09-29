import { z } from "zod";
import { ROLES } from "@event-agency/shared";

// Пустая строка → null
const emptyToNull = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? null : v;

export const CreateUserSchema = z.object({
  role: z.enum([ROLES.DIRECTOR, ROLES.ADMIN, ROLES.ANIMATOR]),
  firstName: z.string().min(2).max(100),
  lastName: z.string().min(2).max(100),
  phone: z.string().min(5).max(32),
  email: z.preprocess(emptyToNull, z.string().email().nullable().optional()),
  password: z.string().min(6).max(128),
});

export const UpdateUserSchema = z.object({
  firstName: z.string().min(2).max(100).optional(),
  lastName: z.string().min(2).max(100).optional(),
  phone: z.string().min(5).max(32).optional(),
  email: z.preprocess(emptyToNull, z.string().email().nullable().optional()),
  status: z.enum(["active", "blocked", "invited"]).optional(),
});

export const UpdatePasswordSchema = z.object({
  password: z.string().min(6).max(128),
});

export const UpdatePushTokenSchema = z.object({
  expoPushToken: z.string().max(200).nullable(),
});

export const ListUsersQuerySchema = z.object({
  role: z.string().optional(),
  status: z.string().optional(),
  search: z.string().max(200).optional(),
  limit: z.coerce.number().min(1).max(200).default(100),
  offset: z.coerce.number().min(0).default(0),
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
export type UpdatePasswordInput = z.infer<typeof UpdatePasswordSchema>;
export type UpdatePushTokenInput = z.infer<typeof UpdatePushTokenSchema>;
export type ListUsersQuery = z.infer<typeof ListUsersQuerySchema>;