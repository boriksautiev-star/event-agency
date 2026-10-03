import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchSummary,
  fetchPayouts,
  markPayoutPaid,
  unmarkPayoutPaid,
  fetchExpenseCategories,
  createExpenseCategory,
  updateExpenseCategory,
  deleteExpenseCategory,
  fetchExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  fetchPayments,
  Period,
  PayoutsQuery,
  CategoryInput,
  ExpensesQuery,
  ExpenseInput,
  PaymentsQuery,
} from "../api/finance";

// ===== Обзор =====
export function useFinanceSummary(period: Period | undefined) {
  return useQuery({
    queryKey: ["finance-summary", period],
    queryFn: () => fetchSummary(period!),
    enabled: !!period,
    staleTime: 30_000,
  });
}

// ===== Выплаты =====
export function usePayouts(query: PayoutsQuery) {
  return useQuery({
    queryKey: ["finance-payouts", query],
    queryFn: () => fetchPayouts(query),
    staleTime: 30_000,
  });
}

export function useMarkPayoutPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; method: "cash" | "transfer" }) =>
      markPayoutPaid(vars.id, vars.method),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["finance-payouts"] }),
  });
}

export function useUnmarkPayoutPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unmarkPayoutPaid(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["finance-payouts"] }),
  });
}

// ===== Категории =====
export function useExpenseCategories() {
  return useQuery({
    queryKey: ["expense-categories"],
    queryFn: () => fetchExpenseCategories(),
    staleTime: 60_000,
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CategoryInput) => createExpenseCategory(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["expense-categories"] }),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; input: Partial<CategoryInput> }) =>
      updateExpenseCategory(vars.id, vars.input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["expense-categories"] }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteExpenseCategory(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["expense-categories"] }),
  });
}

// ===== Расходы =====
export function useExpenses(query: ExpensesQuery) {
  return useQuery({
    queryKey: ["finance-expenses", query],
    queryFn: () => fetchExpenses(query),
    staleTime: 30_000,
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ExpenseInput) => createExpense(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["finance-expenses"] }),
  });
}

export function useUpdateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; input: Partial<ExpenseInput> }) =>
      updateExpense(vars.id, vars.input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["finance-expenses"] }),
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteExpense(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["finance-expenses"] }),
  });
}

// ===== Поступления =====
export function usePayments(query: PaymentsQuery) {
  return useQuery({
    queryKey: ["finance-payments", query],
    queryFn: () => fetchPayments(query),
    staleTime: 30_000,
  });
}
