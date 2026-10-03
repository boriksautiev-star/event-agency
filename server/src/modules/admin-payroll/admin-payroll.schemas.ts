import { z } from "zod";

export const SetCompensationSchema = z.object({
  type: z.enum(["percent", "fixed"]),
  percentValue: z.number().int().min(0).max(100).nullable().optional(),
  fixedAmount: z.number().min(0).nullable().optional(),
  effectiveFrom: z.string().min(1),
});
export type SetCompensationInput = z.infer<typeof SetCompensationSchema>;

export const AccrualQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  status: z.enum(["active", "cancelled", "all"]).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});
export type AccrualQuery = z.infer<typeof AccrualQuerySchema>;

export const PaymentQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});
export type PaymentQuery = z.infer<typeof PaymentQuerySchema>;

export const CreatePaymentSchema = z.object({
  amount: z.number().positive(),
  method: z.enum(["cash", "transfer"]),
  paidAt: z.string().min(1),
  comment: z.string().nullable().optional(),
});
export type CreatePaymentInput = z.infer<typeof CreatePaymentSchema>;

export const FixedAccrualSchema = z.object({
  amount: z.number().positive(),
  periodFrom: z.string().min(1),
  periodTo: z.string().min(1),
  comment: z.string().nullable().optional(),
});
export type FixedAccrualInput = z.infer<typeof FixedAccrualSchema>;
