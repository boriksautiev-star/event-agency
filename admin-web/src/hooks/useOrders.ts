import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchOrders,
  fetchOrderById,
  updateOrderStatus,
  markPrepayment,
  markFinalPayment,
  unmarkFinalPayment,
  handoverFinalPayment,
  OrdersQuery,
} from "../api/orders";
import type { OrderStatus, PaymentMethod } from "../api/types";

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

export function useOrderFinance(orderId: string | undefined) {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["order", orderId] });
    qc.invalidateQueries({ queryKey: ["orders"] });
  };

  const prepayment = useMutation({
    mutationFn: (paid: boolean) => markPrepayment(orderId!, paid),
    onSuccess: invalidate,
  });

  const finalPayment = useMutation({
    mutationFn: (method: PaymentMethod) => markFinalPayment(orderId!, method),
    onSuccess: invalidate,
  });

  const unmark = useMutation({
    mutationFn: () => unmarkFinalPayment(orderId!),
    onSuccess: invalidate,
  });

  const handover = useMutation({
    mutationFn: () => handoverFinalPayment(orderId!),
    onSuccess: invalidate,
  });

  return { prepayment, finalPayment, unmark, handover };
}
