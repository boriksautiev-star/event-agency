import { useQuery } from "@tanstack/react-query";
import { fetchOrders, fetchOrderById, OrdersQuery } from "../api/orders";

export function useOrders(query: OrdersQuery) {
  return useQuery({
    queryKey: ["orders", query],
    queryFn: () => fetchOrders(query),
    placeholderData: (prev) => prev,
  });
}

export function useOrder(id: string | undefined) {
  return useQuery({
    queryKey: ["order", id],
    queryFn: () => fetchOrderById(id!),
    enabled: !!id,
  });
}
