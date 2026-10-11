import { api } from "./client";
import type { ListResponse, Order } from "./types";

export async function fetchOrdersCount(params: {
  dateFrom?: string;
  dateTo?: string;
  hasUnassignedSlots?: "true" | "false";
  prepaymentPaid?: "true" | "false";
}): Promise<number> {
  const q = new URLSearchParams();
  if (params.dateFrom) q.set("dateFrom", params.dateFrom);
  if (params.dateTo) q.set("dateTo", params.dateTo);
  if (params.hasUnassignedSlots) q.set("hasUnassignedSlots", params.hasUnassignedSlots);
  if (params.prepaymentPaid) q.set("prepaymentPaid", params.prepaymentPaid);
  q.set("limit", "1");
  const { data } = await api.get<ListResponse<Order>>(`/api/orders?${q.toString()}`);
  return data.total ?? data.items?.length ?? 0;
}

export async function fetchOrdersList(params: {
  dateFrom?: string;
  dateTo?: string;
  hasUnassignedSlots?: "true" | "false";
  prepaymentPaid?: "true" | "false";
  limit?: number;
}): Promise<Order[]> {
  const q = new URLSearchParams();
  if (params.dateFrom) q.set("dateFrom", params.dateFrom);
  if (params.dateTo) q.set("dateTo", params.dateTo);
  if (params.hasUnassignedSlots) q.set("hasUnassignedSlots", params.hasUnassignedSlots);
  if (params.prepaymentPaid) q.set("prepaymentPaid", params.prepaymentPaid);
  if (params.limit) q.set("limit", String(params.limit));
  const { data } = await api.get<ListResponse<Order>>(`/api/orders?${q.toString()}`);
  return data.items ?? [];
}

export type AvailabilityItem = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  orders?: { orderId: string; orderStatus: string }[];
};

export async function fetchAvailability(date: string): Promise<AvailabilityItem[]> {
  const { data } = await api.get<any>(
    `/api/animators/availability?date=${encodeURIComponent(date)}`,
  );
  return Array.isArray(data) ? data : data.items ?? [];
}

export type FinanceSummary = {
  cashProfit: number;
  income: { total: number };
  paidPayouts: number;
  otherExpenses: number;
};

export async function fetchFinanceSummary(
  from: string,
  to: string,
): Promise<FinanceSummary> {
  const { data } = await api.get<FinanceSummary>(
    `/api/finance/summary?from=${from}&to=${to}`,
  );
  return data;
}
