export type OrderStatus = "new" | "confirmed" | "in_progress" | "completed" | "cancelled";
export type PaymentMethod = "transfer" | "cash";
export type TransportPolicy = "agency_pays" | "client_one_way" | "client_both_ways";

export type OrderClient = {
  id: string;
  name: string;
  phone: string;
};

export type CharacterLite = {
  id: string;
  name: string;
  rateGroupId: string;
};

export type OrderSlot = {
  id: string;
  orderId: string;
  characterId: string;
  rateDurationMinutes: number;
  clientPrice: string | number;
  isCustomPrice: boolean;
  characterNameSnapshot: string;
  sortOrder: number;
  character?: CharacterLite;
};

export type OrderAnimator = {
  id: string;
  animatorId: string;
  slotId: string | null;
  payout: string | number;
  payoutPaidAt: string | null;
  payoutMethod: PaymentMethod | null;
  status: "invited" | "accepted" | "declined" | "removed" | "completed";
  transportCost: string | number;
  transportPaidBy: TransportPolicy;
  payoutSource: "rate_matrix" | "manual";
  animator: { id: string; firstName: string; lastName: string; phone: string };
};

export type Order = {
  id: string;
  clientId: string;
  title: string;
  description: string | null;
  eventDate: string;
  startTime: string;
  endTime: string;
  address: string | null;
  status: OrderStatus;
  subtotal: string | number;
  discountPercent: string | number;
  discountAmount: string | number;
  clientPrice: string | number;
  prepaymentAmount: string | number;
  prepaymentPaidAt: string | null;
  finalPaymentMethod: PaymentMethod | null;
  finalPaymentAmount: string | number;
  finalPaymentReceivedAt: string | null;
  finalPaymentReceivedBy: string | null;
  finalPaymentHandedAt: string | null;
  finalPaymentHandedBy: string | null;
  transportPolicy: TransportPolicy;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
  client?: OrderClient;
  slots?: OrderSlot[];
  animators?: OrderAnimator[];
  acceptedAt?: string | null;
  acceptedBy?: string | null;
};

export type ListResponse<T> = {
  items: T[];
  total: number;
  limit: number;
  offset: number;
};

export type AnimatorAvailabilityOrder = {
  orderId: string;
  title: string;
  clientName: string | null;
  address: string | null;
  startTime: string;
  endTime: string;
  orderStatus: OrderStatus;
  assignmentStatus: "invited" | "accepted" | "declined" | "removed" | "completed";
  slots: { characterName: string; durationMin: number }[];
};

export type AnimatorAvailability = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  orders: AnimatorAvailabilityOrder[];
};
