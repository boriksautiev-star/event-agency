export type Role = "director" | "admin" | "animator";

export type User = {
  id: string;
  role: Role;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  status: "active" | "blocked" | "invited";
};

export type LoginResponse = {
  user: User;
  accessToken: string;
  refreshToken: string;
};

export type OrderStatus = "new" | "confirmed" | "in_progress" | "completed" | "cancelled";
export type AssignmentStatus = "invited" | "accepted" | "declined" | "removed" | "completed";
export type TransportPolicy = "agency_pays" | "client_one_way" | "client_both_ways";
export type PaymentMethod = "transfer" | "cash";
export type PayoutSource = "rate_matrix" | "manual";

export type OrderChange = {
  id: string;
  orderId: string;
  changedBy: string;
  changedAt: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  summary: string | null;
  user?: { id: string; firstName: string; lastName: string; role: Role };
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
  character?: { id: string; name: string; rateGroupId: string; rateGroup?: { id: string; name: string } };
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
  acceptedAt?: string | null;
  acceptedBy?: string | null;
  transportPolicy: TransportPolicy;
  comment: string | null;
  client?: { id: string; name: string; phone: string };
  changes?: OrderChange[];
  slots?: OrderSlot[];
  animators?: Array<{
    id: string;
    animatorId: string;
    slotId: string | null;
    payout: string | number;
    payoutPaidAt: string | null;
    payoutMethod: PaymentMethod | null;
    status: AssignmentStatus;
    transportCost: string | number;
  transportLockedAt?: string | null;
    transportPaidBy: TransportPolicy;
    transportClientAmount: string | number;
    payoutSource: PayoutSource;
    animator: { id: string; firstName: string; lastName: string; phone: string };
    slot?: OrderSlot | null;
  }>;
};

export type AnimatorAvailabilityOrder = {
  orderId: string;
  title: string;
  clientName: string | null;
  address: string | null;
  startTime: string;
  endTime: string;
  orderStatus: OrderStatus;
  assignmentStatus: AssignmentStatus;
  slots: { characterName: string; durationMin: number }[];
};

export type AnimatorAvailability = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  orders: AnimatorAvailabilityOrder[];
};

export type ListResponse<T> = {
  items: T[];
  total: number;
  limit: number;
  offset: number;
};

// === Ставки / персонажи / группы ===

export type RateGroup = {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  _count?: { characters: number; rates: number };
};

export type CharacterPriceOption = {
  id: string;
  characterId: string;
  durationMin: number;
  price: string | number;
  isActive: boolean;
};

export type Character = {
  id: string;
  name: string;
  rateGroupId: string;
  notes: string | null;
  isActive: boolean;
  rateGroup?: { id: string; name: string };
  priceOptions?: CharacterPriceOption[];
};

export type RateCell = {
  rateGroupId: string;
  durationMin: number;
  amount: number;
};

export type RateMatrix = {
  animatorId: string;
  cells: RateCell[];
};

export type RateLookupResult = {
  characterId: string;
  rateGroupId: string;
  durationMin: number;
  amount: number | null;
  found: boolean;
};