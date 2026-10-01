import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchOrders,
  fetchOrderById,
  updateOrderStatus,
  updateOrder,
  assignAnimator,
  updateAssignment,
  removeAssignment,
  OrderUpdatePatch,
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

export function useUpdateOrder(orderId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: OrderUpdatePatch) => updateOrder(orderId!, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["order", orderId] });
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

export function useAssignAnimator(orderId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { animatorId: string; slotId: string; payout?: number }) =>
      assignAnimator(orderId!, vars),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["order", orderId] });
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

export function useUpdateAssignment(orderId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      animatorId: string;
      payout?: number;
      status?: string;
      comment?: string;
    }) => updateAssignment(orderId!, vars.animatorId, vars),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["order", orderId] });
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

export function useRemoveAssignment(orderId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (animatorId: string) => removeAssignment(orderId!, animatorId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["order", orderId] });
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}
