import { useQuery } from "@tanstack/react-query";
import { fetchOrders, OrdersQuery } from "../api/orders";

export function useOrders(query: OrdersQuery) {
  return useQuery({
    queryKey: ["orders", query],
    queryFn: () => fetchOrders(query),
    placeholderData: (prev) => prev,
  });
}
