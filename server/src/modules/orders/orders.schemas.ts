import { z } from "zod";
import { ORDER_STATUS, ASSIGNMENT_STATUS } from "@event-agency/shared";

export const OrderSlotItemSchema = z.object({
  characterId: z.string().uuid(),
  rateDurationMinutes: z.number().int().min(1).max(24 * 60),
  clientPrice: z.number().min(0),
  isCustomPrice: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
});

export const TransportPolicyEnum = z.enum([
  "agency_pays",
  "client_one_way",
  "client_both_ways",
]);

export const PaymentMethodEnum = z.enum(["transfer", "cash"]);

export const CreateOrderSchema = z.object({
  clientId: z.string().uuid(),
  title: z.string().min(2).max(200),
  description: z.string().max(2000).optional().nullable(),
  eventDate: z.string().min(10),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  address: z.string().max(500).optional().nullable(),
  lat: z.number().optional().nullable(),
  lng: z.number().optional().nullable(),
  comment: z.string().max(2000).optional().nullable(),

  slots: z.array(OrderSlotItemSchema).default([]),
  discountPercent: z.number().min(0).max(100).default(0),
  transportPolicy: TransportPolicyEnum.default("client_one_way"),
  prepaymentAmount: z.number().min(0).default(0),
  prepaymentPaid: z.boolean().default(false),
  finalPaymentMethod: PaymentMethodEnum.optional().nullable(),

  adminId: z.string().uuid().optional().nullable(),
});

export const UpdateOrderSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  eventDate: z.string().min(10).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  address: z.string().max(500).optional().nullable(),
  lat: z.number().optional().nullable(),
  lng: z.number().optional().nullable(),
  comment: z.string().max(2000).optional().nullable(),
  adminId: z.string().uuid().optional().nullable(),
  discountPercent: z.number().min(0).max(100).optional(),
  transportPolicy: TransportPolicyEnum.optional(),
  prepaymentAmount: z.number().min(0).optional(),
  prepaymentPaid: z.boolean().optional(),
  finalPaymentMethod: PaymentMethodEnum.optional().nullable(),
});

export const UpdateOrderStatusSchema = z.object({
  status: z.enum([
    ORDER_STATUS.NEW,
    ORDER_STATUS.CONFIRMED,
    ORDER_STATUS.IN_PROGRESS,
    ORDER_STATUS.COMPLETED,
    ORDER_STATUS.CANCELLED,
  ]),
  comment: z.string().max(500).optional().nullable(),
});

export const ListOrdersQuerySchema = z.object({
  status: z.string().optional(),
  statusIn: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  createdFrom: z.string().optional(),
  createdTo: z.string().optional(),
  clientId: z.string().uuid().optional(),
  animatorId: z.string().uuid().optional(),
  search: z.string().max(200).optional(),

  rateGroupId: z.string().uuid().optional(),
  characterId: z.string().uuid().optional(),

  priceFrom: z.coerce.number().min(0).optional(),
  priceTo: z.coerce.number().min(0).optional(),

  hasAnimators: z.enum(["true", "false"]).optional(),
  hasUnassignedSlots: z.enum(["true", "false"]).optional(),
  prepaymentPaid: z.enum(["true", "false"]).optional(),

  limit: z.coerce.number().min(1).max(200).default(50),
  offset: z.coerce.number().min(0).default(0),
});

export const AssignAnimatorSchema = z.object({
  animatorId: z.string().uuid(),
  slotId: z.string().uuid(),
  payout: z.number().min(0).optional(),
});

export const ReleaseReasonEnum = z.enum([
  "declined",
  "handed_over",
  "removed_rotation",
  "removed_quality",
  "order_cancelled",
]);

export const UpdateAssignmentSchema = z.object({
  status: z.enum([
    ASSIGNMENT_STATUS.ACCEPTED,
    ASSIGNMENT_STATUS.DECLINED,
    ASSIGNMENT_STATUS.COMPLETED,
    ASSIGNMENT_STATUS.REMOVED,
  ]).optional(),
  comment: z.string().max(500).optional().nullable(),
  payout: z.number().min(0).optional(),
  slotId: z.string().uuid().optional(),
  releaseReason: ReleaseReasonEnum.optional(),
  releaseComment: z.string().max(500).optional().nullable(),
});

export const RemoveAssignmentSchema = z.object({
  releaseReason: z.enum([
    "removed_rotation",
    "removed_quality",
    "order_cancelled",
  ]),
  releaseComment: z.string().max(500).optional().nullable(),
});

export type RemoveAssignmentInput = z.infer<typeof RemoveAssignmentSchema>;

export const CreateSlotSchema = OrderSlotItemSchema;
export const UpdateSlotSchema = z.object({
  characterId: z.string().uuid().optional(),
  rateDurationMinutes: z.number().int().min(1).max(24 * 60).optional(),
  clientPrice: z.number().min(0).optional(),
  isCustomPrice: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export const UpdateTransportSchema = z.object({
  transportCost: z.number().min(0),
  transportPaidBy: TransportPolicyEnum.optional(),
  transportClientAmount: z.number().min(0).optional(),
});

export const MarkFinalPaymentSchema = z.object({
  method: PaymentMethodEnum,
});

export type OrderSlotItemInput = z.infer<typeof OrderSlotItemSchema>;
export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;
export type UpdateOrderInput = z.infer<typeof UpdateOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof UpdateOrderStatusSchema>;
export type ListOrdersQuery = z.infer<typeof ListOrdersQuerySchema>;
export type AssignAnimatorInput = z.infer<typeof AssignAnimatorSchema>;
export type UpdateAssignmentInput = z.infer<typeof UpdateAssignmentSchema>;
export type CreateSlotInput = z.infer<typeof CreateSlotSchema>;
export type UpdateSlotInput = z.infer<typeof UpdateSlotSchema>;
export type UpdateTransportInput = z.infer<typeof UpdateTransportSchema>;
export type MarkFinalPaymentInput = z.infer<typeof MarkFinalPaymentSchema>;