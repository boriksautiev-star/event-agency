export const TRANSACTION_TYPE = {
  CLIENT_PAYMENT: "client_payment",
  ANIMATOR_PAYOUT: "animator_payout",
  EXPENSE: "expense",
  ADJUSTMENT: "adjustment",
} as const;

export type TransactionType =
  (typeof TRANSACTION_TYPE)[keyof typeof TRANSACTION_TYPE];

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  client_payment: "Оплата клиента",
  animator_payout: "Выплата аниматору",
  expense: "Расход",
  adjustment: "Корректировка",
};
