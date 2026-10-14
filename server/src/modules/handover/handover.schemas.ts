import { z } from "zod";

export const CreateHandoverSchema = z.object({
  toAnimatorId: z.string().uuid(),
  comment: z.string().max(500).optional().nullable(),
});
export type CreateHandoverInput = z.infer<typeof CreateHandoverSchema>;

export const RejectHandoverSchema = z.object({
  rejectComment: z.string().max(500).optional().nullable(),
});
export type RejectHandoverInput = z.infer<typeof RejectHandoverSchema>;

export const HandoverListQuerySchema = z.object({
  status: z.enum([
    "pending_receiver",
    "pending_approval",
    "approved",
    "rejected_by_receiver",
    "rejected_by_admin",
    "cancelled",
    "all",
  ]).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});
export type HandoverListQuery = z.infer<typeof HandoverListQuerySchema>;

export const HandoverHistoryQuerySchema = z.object({
  statusGroup: z
    .enum(["pending", "approved", "rejected", "cancelled", "all"])
    .optional()
    .default("all"),
  animatorId: z.string().uuid().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});
export type HandoverHistoryQuery = z.infer<typeof HandoverHistoryQuerySchema>;
