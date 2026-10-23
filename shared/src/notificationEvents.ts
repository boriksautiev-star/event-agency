export const NOTIFICATION_EVENTS = {
  ORDER_COMPLETED_BY_ANIMATOR: "order_completed_by_animator",
  ASSIGNMENT_RESPONSE: "assignment_response",
  HANDOVER_PENDING_APPROVAL: "handover_pending_approval",
} as const;

export type NotificationEvent = typeof NOTIFICATION_EVENTS[keyof typeof NOTIFICATION_EVENTS];

export const NOTIFICATION_EVENT_LABELS: Record<NotificationEvent, string> = {
  order_completed_by_animator: "Аниматор завершил работу (нужно закрыть заказ)",
  assignment_response: "Аниматор ответил на назначение (принял/отклонил)",
  handover_pending_approval: "Передача заказа ждёт вашего подтверждения",
};
