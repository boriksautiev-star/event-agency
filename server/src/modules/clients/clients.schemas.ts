import { z } from "zod";

export const CreateClientSchema = z.object({
  name: z.string().min(2).max(200),
  phone: z.string().min(5).max(32),
  email: z.string().email().optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const UpdateClientSchema = CreateClientSchema.partial();

export const ListClientsQuerySchema = z.object({
  search: z.string().max(200).optional(),
  limit: z.coerce.number().min(1).max(200).default(50),
  offset: z.coerce.number().min(0).default(0),
});

export type CreateClientInput = z.infer<typeof CreateClientSchema>;
export type UpdateClientInput = z.infer<typeof UpdateClientSchema>;
export type ListClientsQuery = z.infer<typeof ListClientsQuerySchema>;
