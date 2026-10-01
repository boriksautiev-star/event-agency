import type { PaymentMethod, TransportPolicy } from "../api/types";

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  transfer: "Перевод",
  cash: "Наличные",
};

export const TRANSPORT_POLICY_LABELS: Record<TransportPolicy, string> = {
  agency_pays: "Оплачивает агентство",
  client_one_way: "Клиент — одна сторона",
  client_both_ways: "Клиент — обе стороны",
};

export const ASSIGNMENT_BADGE: Record<string, "default" | "primary" | "success" | "warning" | "danger"> = {
  invited: "warning",
  accepted: "primary",
  completed: "success",
  declined: "danger",
  removed: "default",
};
