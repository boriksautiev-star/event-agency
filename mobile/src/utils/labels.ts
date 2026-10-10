import type { AssignmentStatus, OrderStatus, TransportPolicy } from "../api/types";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  new: "Новый",
  confirmed: "Подтверждён",
  in_progress: "В работе",
  completed: "Выполнен",
  cancelled: "Отменён",
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  new: "#f59e0b",
  confirmed: "#667eea",
  in_progress: "#3b82f6",
  completed: "#10b981",
  cancelled: "#dc2626",
};

export const ASSIGNMENT_STATUS_LABELS: Record<AssignmentStatus, string> = {
  invited: "Приглашение",
  accepted: "Принял",
  declined: "Отказался",
  removed: "Снят",
  completed: "Отработано",
};

export const ASSIGNMENT_STATUS_COLORS: Record<AssignmentStatus, string> = {
  invited: "#f59e0b",
  accepted: "#667eea",
  declined: "#dc2626",
  removed: "#6b7280",
  completed: "#10b981",
};

export const EVENT_ROLE_LABELS: Record<string, string> = {
  animator: "Аниматор",
  host: "Ведущий",
  photographer: "Фотограф",
  dj: "Диджей",
  other: "Другое",
};

export const TRANSPORT_POLICY_LABELS: Record<TransportPolicy, string> = {
  agency_pays: "Оплачивает агентство",
  client_one_way: "Клиент — одна сторона",
  client_both_ways: "Клиент — обе стороны",
};

export const CHANGE_FIELD_LABELS: Record<string, string> = {
  // Логирование выплат
  payoutPaid: "Выплата",
  payoutUnpaid: "Отмена выплаты",
  payout: "Выплата аниматору",
  payoutSource: "Источник выплаты",
  payoutMethod: "Способ выплаты",
  created: "Заказ создан",
  status: "Статус",
  services: "Состав услуг",
  title: "Название",
  description: "Описание",
  eventDate: "Дата",
  startTime: "Время начала",
  endTime: "Время конца",
  address: "Адрес",
  comment: "Комментарий",
  adminId: "Администратор",
  discountPercent: "Скидка %",
  prepaymentAmount: "Предоплата",
  prepaymentPaid: "Предоплата получена",
  transportPolicy: "Транспорт",
  transportCost: "Транспорт",
  transportPaidBy: "Кто платит за транспорт",
  transportClientAmount: "Транспорт от клиента",
  animator_added: "Аниматор назначен",
  animator_removed: "Аниматор снят",
  animator_invited: "Аниматор приглашён",
  slot_added: "Слот добавлен",
  slot_edited: "Слот изменён",
  slot_removed: "Слот удалён",
  finalPaymentReceived: "Финальная оплата получена",
  finalPaymentHanded: "Финальная оплата сдана",
  finalPaymentMethod: "Способ финальной оплаты",
  handover_approved: "Передача заказа",
  handover_rejected: "Передача отклонена",
  handover_cancelled: "Передача отозвана",
  releaseReason: "Причина снятия",
  releaseComment: "Комментарий к снятию",
  assignmentStatus: "Статус назначения",
};

export const RELEASE_REASON_LABELS: Record<string, string> = {
  declined: "Отказался",
  handed_over: "Передал другому",
  removed_rotation: "Снят (ротация)",
  removed_quality: "Снят (качество)",
  order_cancelled: "Заказ отменён",
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "Наличные",
  transfer: "Перевод",
};

export const PAYOUT_SOURCE_LABELS: Record<string, string> = {
  rate_matrix: "По матрице",
  manual: "Вручную",
};

// Универсальный перевод значения для истории изменений.
// Сначала смотрим по полю, потом по известным enum-значениям.
export function translateChangeValue(
  field: string,
  raw: string | null | undefined,
): string {
  if (raw === null || raw === undefined || raw === "") return "—";

  // Значения по конкретному полю
  if (field === "status") {
    return ORDER_STATUS_LABELS[raw as OrderStatus] ?? raw;
  }
  if (field === "transportPolicy") {
    return TRANSPORT_POLICY_LABELS[raw as TransportPolicy] ?? raw;
  }
  if (field === "releaseReason") {
    return RELEASE_REASON_LABELS[raw] ?? raw;
  }
  if (field === "payoutSource") {
    return PAYOUT_SOURCE_LABELS[raw] ?? raw;
  }
  if (field === "payoutMethod" || field === "finalPaymentMethod") {
    return PAYMENT_METHOD_LABELS[raw] ?? raw;
  }
  if (field === "assignmentStatus") {
    return ASSIGNMENT_STATUS_LABELS[raw as AssignmentStatus] ?? raw;
  }
  if (field === "prepaymentPaid") {
    return raw === "true" || raw === "Да" ? "Да" : "Нет";
  }

  // Fallback по известным enum-значениям (assignment-статусы)
  if (raw in ASSIGNMENT_STATUS_LABELS) {
    return ASSIGNMENT_STATUS_LABELS[raw as AssignmentStatus];
  }
  return raw;
}