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
