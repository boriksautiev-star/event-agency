import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchOrders, fetchOrderById, updateOrderStatus, OrdersQuery } from "../api/orders";
import type { OrderStatus } from "../api/types";

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

export function useUpdateOrderStatus(orderId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { status: OrderStatus; comment?: string }) =>
      updateOrderStatus(orderId!, vars.status, vars.comment),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["order", orderId] });
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}
