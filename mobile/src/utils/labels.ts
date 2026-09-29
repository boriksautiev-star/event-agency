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
  animator_added: "Аниматор назначен",
  animator_removed: "Аниматор снят",
};