import { z } from "zod";

export const PeriodQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const PayoutsQuerySchema = z.object({
  paid: z.enum(["true", "false", "all"]).default("false"),
  from: z.string().optional(),
  to: z.string().optional(),
  animatorId: z.string().uuid().optional(),
});

export const MarkPaidSchema = z.object({
  method: z.enum(["cash", "transfer"]),
});

export const ExpenseCategorySchema = z.object({
  name: z.string().min(1).max(100),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

export const UpdateExpenseCategorySchema = ExpenseCategorySchema.partial();

export const CreateExpenseSchema = z.object({
  categoryId: z.string().uuid(),
  orderId: z.string().uuid().optional().nullable(),
  amount: z.number().min(0),
  expenseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  comment: z.string().max(1000).optional().nullable(),
});

export const UpdateExpenseSchema = CreateExpenseSchema.partial();

export const ListExpensesQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  orderId: z.string().uuid().optional(),
  limit: z.coerce.number().min(1).max(500).default(100),
  offset: z.coerce.number().min(0).default(0),
});


export const PaymentsQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  type: z.enum(["prepayment", "final", "refund"]).optional(),
  method: z.enum(["transfer", "cash"]).optional(),
  orderId: z.string().uuid().optional(),
  limit: z.coerce.number().min(1).max(500).default(100),
  offset: z.coerce.number().min(0).default(0),
});

export type PaymentsQuery = z.infer<typeof PaymentsQuerySchema>;

export type PeriodQuery = z.infer<typeof PeriodQuerySchema>;
export type PayoutsQuery = z.infer<typeof PayoutsQuerySchema>;
export type MarkPaidInput = z.infer<typeof MarkPaidSchema>;
export type ExpenseCategoryInput = z.infer<typeof ExpenseCategorySchema>;
export type UpdateExpenseCategoryInput = z.infer<typeof UpdateExpenseCategorySchema>;
export type CreateExpenseInput = z.infer<typeof CreateExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof UpdateExpenseSchema>;
export type ListExpensesQuery = z.infer<typeof ListExpensesQuerySchema>;