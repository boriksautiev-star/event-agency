import { api } from "./client";
import type { ListResponse, Order } from "./types";

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
