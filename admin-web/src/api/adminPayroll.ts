import { api } from "./client";

export type CompensationType = "percent" | "fixed";

export type Compensation = {
  id: string;
  type: CompensationType;
  percentValue: number | null;
  fixedAmount: number | null;
  effectiveFrom: string;
};

export type AdminListItem = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  status: "active" | "blocked" | "invited";
  compensation: Compensation | null;
  accruedTotal: number;
  paidTotal: number;
  balance: number;
};

export type AdminDetail = {
  admin: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    email: string | null;
    status: "active" | "blocked" | "invited";
  };
  compensations: Compensation[];
  current: Compensation | null;
  accruedTotal: number;
  paidTotal: number;
  balance: number;
};

export type AccrualItem = {
  id: string;
  adminId: string;
  orderId: string | null;
  order: { id: string; title: string; eventDate: string } | null;
  type: CompensationType;
  baseAmount: number;
  percentValue: number | null;
  amount: number;
  periodFrom: string | null;
  periodTo: string | null;
  status: "active" | "cancelled";
  comment: string | null;
  createdAt: string;
};

export type PaymentItem = {
  id: string;
  adminId: string;
  amount: number;
  method: "cash" | "transfer";
  paidAt: string;
  comment: string | null;
  expenseId: string | null;
  createdAt: string;
};

export async function fetchAdmins(): Promise<{ items: AdminListItem[]; total: number }> {
  const { data } = await api.get<{ items: AdminListItem[]; total: number }>(
    "/admin-payroll/admins",
  );
  return data;
}

export async function fetchAdmin(id: string): Promise<AdminDetail> {
  const { data } = await api.get<AdminDetail>(`/admin-payroll/admins/${id}`);
  return data;
}

export type SetCompensationInput = {
  type: CompensationType;
  percentValue?: number | null;
  fixedAmount?: number | null;
  effectiveFrom: string;
};

export async function setCompensation(
  id: string,
  input: SetCompensationInput,
): Promise<Compensation> {
  const { data } = await api.post<Compensation>(
    `/admin-payroll/admins/${id}/compensation`,
    input,
  );
  return data;
}

export async function fetchAccruals(
  id: string,
  params?: { from?: string; to?: string; status?: "active" | "cancelled" | "all" },
): Promise<{ items: AccrualItem[]; total: number; sum: number }> {
  const q = new URLSearchParams();
  if (params?.from) q.set("from", params.from);
  if (params?.to) q.set("to", params.to);
  if (params?.status) q.set("status", params.status);
  const suffix = q.toString() ? `?${q.toString()}` : "";
  const { data } = await api.get<{ items: AccrualItem[]; total: number; sum: number }>(
    `/admin-payroll/admins/${id}/accruals${suffix}`,
  );
  return data;
}

export type FixedAccrualInput = {
  amount: number;
  periodFrom: string;
  periodTo: string;
  comment?: string | null;
};

export async function createFixedAccrual(
  id: string,
  input: FixedAccrualInput,
): Promise<AccrualItem> {
  const { data } = await api.post<AccrualItem>(
    `/admin-payroll/admins/${id}/fixed-accruals`,
    input,
  );
  return data;
}

export async function cancelAccrual(accrualId: string): Promise<void> {
  await api.delete(`/admin-payroll/accruals/${accrualId}`);
}

export async function fetchPayments(
  id: string,
  params?: { from?: string; to?: string },
): Promise<{ items: PaymentItem[]; total: number; sum: number }> {
  const q = new URLSearchParams();
  if (params?.from) q.set("from", params.from);
  if (params?.to) q.set("to", params.to);
  const suffix = q.toString() ? `?${q.toString()}` : "";
  const { data } = await api.get<{ items: PaymentItem[]; total: number; sum: number }>(
    `/admin-payroll/admins/${id}/payments${suffix}`,
  );
  return data;
}

export type CreatePaymentInput = {
  amount: number;
  method: "cash" | "transfer";
  paidAt: string;
  comment?: string | null;
};

export async function createPayment(
  id: string,
  input: CreatePaymentInput,
): Promise<PaymentItem> {
  const { data } = await api.post<PaymentItem>(
    `/admin-payroll/admins/${id}/payments`,
    input,
  );
  return data;
}

export async function removePayment(paymentId: string): Promise<void> {
  await api.delete(`/admin-payroll/payments/${paymentId}`);
}

export type MeSummaryOrder = {
  id: string;
  title: string;
  eventDate: string;
  status: string;
  clientPrice: number;
  adminPercent: number | null;
  adminAmount: number | null;
  willAccrue: boolean;
};

export type MeSummary = {
  admin: { id: string; firstName: string; lastName: string };
  period: { from: string; to: string };
  compensation:
    | {
        type: CompensationType;
        percentValue: number | null;
        fixedAmount: number | null;
      }
    | null;
  orders: MeSummaryOrder[];
  accruedPeriod: number;
  paidPeriod: number;
  accruedTotal: number;
  paidTotal: number;
  balance: number;
};

export async function fetchMeSummary(params: {
  from?: string;
  to?: string;
}): Promise<MeSummary> {
  const q = new URLSearchParams();
  if (params.from) q.set("from", params.from);
  if (params.to) q.set("to", params.to);
  const suffix = q.toString() ? `?${q.toString()}` : "";
  const { data } = await api.get<MeSummary>(
    `/admin-payroll/me/summary${suffix}`,
  );
  return data;
}

export type LedgerRow = {
  id: string;
  kind: "accrual" | "payment";
  date: string;
  amount: number;
  status?: "active" | "cancelled";
  method?: "cash" | "transfer";
  comment?: string | null;
  orderId?: string | null;
  orderTitle?: string | null;
  type?: CompensationType;
  percentValue?: number | null;
  baseAmount?: number;
};

export type MeLedger = {
  items: LedgerRow[];
  accruedTotal: number;
  paidTotal: number;
  balance: number;
};

export async function fetchMeLedger(params: {
  from?: string;
  to?: string;
}): Promise<MeLedger> {
  const q = new URLSearchParams();
  if (params.from) q.set("from", params.from);
  if (params.to) q.set("to", params.to);
  const suffix = q.toString() ? `?${q.toString()}` : "";
  const { data } = await api.get<MeLedger>(
    `/admin-payroll/me/ledger${suffix}`,
  );
  return data;
}

// ===== Отчёт по аниматору (для директора) =====

export type AnimatorReportItem = {
  orderId: string;
  title: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  address: string | null;
  clientName: string | null;
  clientPhone: string | null;
  orderStatus: string;
  assignmentStatus: string;
  payout: number;
  payoutPaidAt: string | null;
  payoutMethod: string | null;
  slots: { characterName: string; durationMin: number }[];
};

export type AnimatorRelease = {
  assignmentId: string;
  orderId: string;
  orderTitle: string;
  eventDate: string;
  status: "declined" | "removed";
  releaseReason: string | null;
  releaseComment: string | null;
  releasedAt: string;
  payout: number;
};

export type AnimatorReport = {
  period: { from: string; to: string };
  scope: string;
  summary: {
    ordersCount: number;
    hours: number;
    payoutTotal: number;
    payoutPaid: number;
    payoutPaidCash: number;
    payoutPaidTransfer: number;
    payoutRemaining: number;
    acceptedCount: number;
    declinedCount: number;
    removedCount: number;
    offersCount: number;
    acceptRate: number;
    lostPayout: number;
    byReason: Record<string, number>;
  };
  releases: AnimatorRelease[];
  items: AnimatorReportItem[];
};

export async function fetchAnimatorReport(
  id: string,
  params: { from: string; to: string; scope?: "all" | "past" | "future" },
): Promise<AnimatorReport> {
  const q = new URLSearchParams();
  q.set("from", params.from);
  q.set("to", params.to);
  if (params.scope) q.set("scope", params.scope);
  const { data } = await api.get<AnimatorReport>(
    `/animators/${id}/report?${q.toString()}`,
  );
  return data;
}
