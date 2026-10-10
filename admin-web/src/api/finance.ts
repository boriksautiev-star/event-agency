import { api } from "./client";

// ===== Период =====
export type Period = { from: string; to: string };

// ===== Обзор =====
export type FinanceSummary = {
  period: Period;
  revenue: number;
  income: {
    total: number;
    prepayments: number;
    finals: number;
    refunds: number;
    byMethod: { transfer: number; cash: number };
  };
  cashProfit: number;
  paidPayouts: number;
  expectedIncome: number;
  payouts: number;
  transportAgency: number;
  transportClient: number;
  otherExpenses: number;
  profit: number;
  ordersCount: number;
  animatorsCount: number;
  workHours: number;
};

export async function fetchSummary(period: Period): Promise<FinanceSummary> {
  const q = new URLSearchParams({ from: period.from, to: period.to });
  const { data } = await api.get<FinanceSummary>(`/finance/summary?${q.toString()}`);
  return data;
}

// ===== Выплаты =====
export type PayoutItem = {
  id: string;
  animatorId: string;
  animator: { id: string; firstName: string; lastName: string; phone: string };
  orderId: string;
  order: {
    id: string;
    title: string;
    eventDate: string;
    startTime: string;
    endTime: string;
    status: string;
  };
  payout: number;
  transportCost: number;
  transportClientAmount: number;
  payoutPaidAt: string | null;
  payoutPaidBy: string | null;
  payoutMethod: "cash" | "transfer" | null;
  status: string;
};

export type PayoutsQuery = {
  paid?: "true" | "false" | "all";
  from?: string;
  to?: string;
  animatorId?: string;
};

export async function fetchPayouts(query: PayoutsQuery = {}): Promise<{
  items: PayoutItem[];
  total: number;
}> {
  const q = new URLSearchParams();
  q.set("paid", query.paid ?? "false");
  if (query.from) q.set("from", query.from);
  if (query.to) q.set("to", query.to);
  if (query.animatorId) q.set("animatorId", query.animatorId);
  const { data } = await api.get<{ items: PayoutItem[]; total: number }>(
    `/finance/payouts?${q.toString()}`,
  );
  return data;
}

export async function markPayoutPaid(id: string, method: "cash" | "transfer"): Promise<void> {
  await api.post(`/finance/payouts/${id}/paid`, { method });
}

export async function unmarkPayoutPaid(id: string): Promise<void> {
  await api.delete(`/finance/payouts/${id}/paid`);
}

// ===== Категории расходов =====
export type ExpenseCategory = {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  _count?: { expenses: number };
};

export async function fetchExpenseCategories(): Promise<ExpenseCategory[]> {
  const { data } = await api.get<
    ExpenseCategory[] | { items: ExpenseCategory[] }
  >("/finance/expense-categories");
  return Array.isArray(data) ? data : data.items ?? [];
}

export type CategoryInput = {
  name: string;
  sortOrder?: number;
  isActive?: boolean;
};

export async function createExpenseCategory(input: CategoryInput): Promise<ExpenseCategory> {
  const { data } = await api.post<ExpenseCategory>("/finance/expense-categories", input);
  return data;
}

export async function updateExpenseCategory(
  id: string,
  input: Partial<CategoryInput>,
): Promise<ExpenseCategory> {
  const { data } = await api.patch<ExpenseCategory>(`/finance/expense-categories/${id}`, input);
  return data;
}

export async function deleteExpenseCategory(id: string): Promise<void> {
  await api.delete(`/finance/expense-categories/${id}`);
}

// ===== Расходы =====
export type ExpenseItem = {
  id: string;
  categoryId: string;
  category: { id: string; name: string };
  orderId: string | null;
  order: { id: string; title: string; eventDate: string } | null;
  amount: number;
  expenseDate: string;
  comment: string | null;
  createdAt: string;
};

export type ExpensesQuery = {
  from?: string;
  to?: string;
  categoryId?: string;
  orderId?: string;
  limit?: number;
  offset?: number;
};

export async function fetchExpenses(query: ExpensesQuery = {}): Promise<{
  items: ExpenseItem[];
  total: number;
  sum: number;
  limit: number;
  offset: number;
}> {
  const q = new URLSearchParams();
  if (query.from) q.set("from", query.from);
  if (query.to) q.set("to", query.to);
  if (query.categoryId) q.set("categoryId", query.categoryId);
  if (query.orderId) q.set("orderId", query.orderId);
  if (query.limit) q.set("limit", String(query.limit));
  if (query.offset !== undefined) q.set("offset", String(query.offset));
  const suffix = q.toString() ? `?${q.toString()}` : "";
  const { data } = await api.get<{
    items: ExpenseItem[];
    total: number;
    sum: number;
    limit: number;
    offset: number;
  }>(`/finance/expenses${suffix}`);
  return data;
}

export type ExpenseInput = {
  categoryId: string;
  orderId?: string | null;
  amount: number;
  expenseDate: string;
  comment?: string | null;
};

export async function createExpense(input: ExpenseInput): Promise<ExpenseItem> {
  const { data } = await api.post<ExpenseItem>("/finance/expenses", input);
  return data;
}

export async function updateExpense(id: string, input: Partial<ExpenseInput>): Promise<ExpenseItem> {
  const { data } = await api.patch<ExpenseItem>(`/finance/expenses/${id}`, input);
  return data;
}

export async function deleteExpense(id: string): Promise<void> {
  await api.delete(`/finance/expenses/${id}`);
}

// ===== Поступления =====
export type PaymentItem = {
  id: string;
  orderId: string;
  order: {
    id: string;
    title: string;
    eventDate: string;
    status: string;
    client: { id: string; name: string; phone: string };
  };
  type: "prepayment" | "final" | "refund";
  amount: number;
  method: "transfer" | "cash";
  paidAt: string;
  comment: string | null;
  createdBy: string | null;
  createdAt: string;
};

export type PaymentsQuery = {
  from?: string;
  to?: string;
  type?: "prepayment" | "final" | "refund";
  method?: "transfer" | "cash";
  orderId?: string;
  limit?: number;
  offset?: number;
};

export async function fetchPayments(query: PaymentsQuery = {}): Promise<{
  items: PaymentItem[];
  total: number;
  sum: number;
  limit: number;
  offset: number;
}> {
  const q = new URLSearchParams();
  if (query.from) q.set("from", query.from);
  if (query.to) q.set("to", query.to);
  if (query.type) q.set("type", query.type);
  if (query.method) q.set("method", query.method);
  if (query.orderId) q.set("orderId", query.orderId);
  if (query.limit) q.set("limit", String(query.limit));
  if (query.offset !== undefined) q.set("offset", String(query.offset));
  const suffix = q.toString() ? `?${q.toString()}` : "";
  const { data } = await api.get<{
    items: PaymentItem[];
    total: number;
    sum: number;
    limit: number;
    offset: number;
  }>(`/finance/payments${suffix}`);
  return data;
}

// ===== Экспорт Excel (blob) =====
export async function downloadExport(
  kind: "orders" | "payouts" | "expenses",
  from: string,
  to: string,
): Promise<{ blob: Blob; filename: string }> {
  const q = new URLSearchParams({ from, to });
  const res = await api.get(`/finance/export/${kind}?${q.toString()}`, {
    responseType: "blob",
  });
  const filename = `${kind}_${from}_${to}.xlsx`;
  return { blob: res.data as Blob, filename };
}
