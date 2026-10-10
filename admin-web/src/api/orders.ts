import { api } from "./client";
import type { ListResponse, Order, OrderStatus, PaymentMethod } from "./types";

export type OrdersQuery = {
  statusIn?: string;
  search?: string;
  dateFrom?: string;
  createdFrom?: string;
  createdTo?: string;
  dateTo?: string;
  hasAnimators?: "true" | "false";
  hasUnassignedSlots?: "true" | "false";
  prepaymentPaid?: "true" | "false";
  limit?: number;
  offset?: number;
};

export async function fetchOrders(query: OrdersQuery): Promise<ListResponse<Order>> {
  const params = new URLSearchParams();
  if (query.statusIn) params.set("statusIn", query.statusIn);
  if (query.search) params.set("search", query.search);
  if (query.dateFrom) params.set("dateFrom", query.dateFrom);
  if (query.createdFrom) params.set("createdFrom", query.createdFrom);
  if (query.createdTo) params.set("createdTo", query.createdTo);
  if (query.dateTo) params.set("dateTo", query.dateTo);
  if (query.hasAnimators) params.set("hasAnimators", query.hasAnimators);
  if (query.hasUnassignedSlots) params.set("hasUnassignedSlots", query.hasUnassignedSlots);
  if (query.prepaymentPaid) params.set("prepaymentPaid", query.prepaymentPaid);
  if (query.limit !== undefined) params.set("limit", String(query.limit));
  if (query.offset !== undefined) params.set("offset", String(query.offset));
  const { data } = await api.get<ListResponse<Order>>(`/orders?${params.toString()}`);
  return data;
}

export async function fetchOrderById(id: string): Promise<Order> {
  const { data } = await api.get<{ order: Order }>(`/orders/${id}`);
  return data.order;
}

export async function updateOrderStatus(
  id: string,
  status: OrderStatus,
  comment?: string,
): Promise<Order> {
  const body: Record<string, unknown> = { status };
  if (comment) body.comment = comment;
  const { data } = await api.patch<{ order: Order }>(`/orders/${id}/status`, body);
  return data.order;
}

export async function markPrepayment(id: string, paid: boolean): Promise<Order> {
  const { data } = await api.patch<{ order: Order }>(`/orders/${id}`, {
    prepaymentPaid: paid,
  });
  return data.order;
}

export async function markFinalPayment(
  id: string,
  method: PaymentMethod,
): Promise<Order> {
  const { data } = await api.post<{ order: Order }>(`/orders/${id}/final-payment`, {
    method,
  });
  return data.order;
}

export async function unmarkFinalPayment(id: string): Promise<Order> {
  const { data } = await api.delete<{ order: Order }>(`/orders/${id}/final-payment`);
  return data.order;
}

export async function handoverFinalPayment(id: string): Promise<Order> {
  const { data } = await api.post<{ order: Order }>(`/orders/${id}/final-payment/handover`, {});
  return data.order;
}

export type OrderUpdatePatch = {
  title?: string;
  description?: string | null;
  eventDate?: string;
  startTime?: string;
  endTime?: string;
  address?: string | null;
  comment?: string | null;
  discountPercent?: number;
  transportPolicy?: "agency_pays" | "client_one_way" | "client_both_ways";
};

export async function updateOrder(
  id: string,
  patch: OrderUpdatePatch,
): Promise<Order> {
  const { data } = await api.patch<{ order: Order }>(`/orders/${id}`, patch);
  return data.order;
}

export async function assignAnimator(
  orderId: string,
  data: { animatorId: string; slotId: string; payout?: number },
): Promise<Order> {
  const { data: res } = await api.post<{ order?: Order } | Order>(
    `/orders/${orderId}/animators`,
    data,
  );
  // Ответ может быть как { order }, так и голым объектом — нормализуем
  return ((res as any).order ?? res) as Order;
}

export async function updateAssignment(
  orderId: string,
  animatorId: string,
  patch: { payout?: number; status?: string; comment?: string },
): Promise<void> {
  await api.patch(`/orders/${orderId}/animators/${animatorId}`, patch);
}

export async function removeAssignment(
  orderId: string,
  animatorId: string,
): Promise<void> {
  await api.delete(`/orders/${orderId}/animators/${animatorId}`);
}

export type SlotInput = {
  characterId: string;
  rateDurationMinutes: number;
  clientPrice: number;
  isCustomPrice: boolean;
  sortOrder: number;
};

export async function addSlot(orderId: string, data: SlotInput): Promise<Order> {
  const { data: res } = await api.post<{ order?: Order; slot?: any } | Order>(
    `/orders/${orderId}/slots`,
    data,
  );
  return ((res as any).order ?? res) as Order;
}

export async function updateSlot(
  orderId: string,
  slotId: string,
  data: Partial<SlotInput>,
): Promise<void> {
  await api.patch(`/orders/${orderId}/slots/${slotId}`, data);
}

export async function deleteSlot(orderId: string, slotId: string): Promise<void> {
  await api.delete(`/orders/${orderId}/slots/${slotId}`);
}

export type CreateOrderPayload = {
  clientId: string;
  title: string;
  description?: string | null;
  eventDate: string;
  startTime: string;
  endTime: string;
  address?: string | null;
  comment?: string | null;
  discountPercent: number;
  transportPolicy: "agency_pays" | "client_one_way" | "client_both_ways";
  prepaymentAmount?: number;
  prepaymentPaid?: boolean;
  finalPaymentMethod?: "cash" | "transfer" | null;
  adminId?: string | null;
  slots: SlotInput[];
};

export async function createOrder(payload: CreateOrderPayload): Promise<Order> {
  const { data } = await api.post<{ order?: Order } | Order>("/orders", payload);
  return ((data as any).order ?? data) as Order;
}
