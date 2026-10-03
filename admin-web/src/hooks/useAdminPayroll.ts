import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchAdmins,
  fetchAdmin,
  setCompensation,
  fetchAccruals,
  createFixedAccrual,
  cancelAccrual,
  fetchPayments,
  createPayment,
  removePayment,
  SetCompensationInput,
  FixedAccrualInput,
  CreatePaymentInput,
  fetchMeSummary,
  fetchMeLedger,
} from "../api/adminPayroll";

export function useAdmins() {
  return useQuery({
    queryKey: ["admin-payroll", "admins"],
    queryFn: fetchAdmins,
    staleTime: 30_000,
  });
}

export function useAdmin(id: string | undefined) {
  return useQuery({
    queryKey: ["admin-payroll", "admins", id],
    queryFn: () => fetchAdmin(id!),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useAccruals(
  id: string | undefined,
  params?: { from?: string; to?: string; status?: "active" | "cancelled" | "all" },
) {
  return useQuery({
    queryKey: ["admin-payroll", "accruals", id, params],
    queryFn: () => fetchAccruals(id!, params),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function usePayments(
  id: string | undefined,
  params?: { from?: string; to?: string },
) {
  return useQuery({
    queryKey: ["admin-payroll", "payments", id, params],
    queryFn: () => fetchPayments(id!, params),
    enabled: !!id,
    staleTime: 30_000,
  });
}

function invalidate(qc: any, id: string) {
  qc.invalidateQueries({ queryKey: ["admin-payroll", "admins"] });
  qc.invalidateQueries({ queryKey: ["admin-payroll", "admins", id] });
  qc.invalidateQueries({ queryKey: ["admin-payroll", "accruals", id] });
  qc.invalidateQueries({ queryKey: ["admin-payroll", "payments", id] });
}

export function useSetCompensation(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SetCompensationInput) => setCompensation(id, input),
    onSuccess: () => invalidate(qc, id),
  });
}

export function useCreateFixedAccrual(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: FixedAccrualInput) => createFixedAccrual(id, input),
    onSuccess: () => invalidate(qc, id),
  });
}

export function useCancelAccrual(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (accrualId: string) => cancelAccrual(accrualId),
    onSuccess: () => invalidate(qc, id),
  });
}

export function useCreatePayment(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePaymentInput) => createPayment(id, input),
    onSuccess: () => invalidate(qc, id),
  });
}

export function useRemovePayment(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (paymentId: string) => removePayment(paymentId),
    onSuccess: () => invalidate(qc, id),
  });
}

export function useMeSummary(params: { from?: string; to?: string }) {
  return useQuery({
    queryKey: ["admin-payroll", "me-summary", params],
    queryFn: () => fetchMeSummary(params),
    staleTime: 30_000,
  });
}

export function useMeLedger(params: { from?: string; to?: string }) {
  return useQuery({
    queryKey: ["admin-payroll", "me-ledger", params],
    queryFn: () => fetchMeLedger(params),
    staleTime: 30_000,
  });
}
