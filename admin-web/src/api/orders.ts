import { api } from "./client";
import type { ListResponse, Order, OrderStatus, PaymentMethod } from "./types";

export type OrdersQuery = {
  statusIn?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
};

export async function fetchOrders(query: OrdersQuery): Promise<ListResponse<Order>> {
  const params = new URLSearchParams();
  if (query.statusIn) params.set("statusIn", query.statusIn);
  if (query.search) params.set("search", query.search);
  if (query.dateFrom) params.set("dateFrom", query.dateFrom);
  if (query.dateTo) params.set("dateTo", query.dateTo);
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
