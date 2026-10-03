import { FormEvent, useEffect, useMemo, useState } from "react";
import type { ExpenseItem } from "../api/finance";
import {
  useExpenseCategories,
  useCreateExpense,
  useUpdateExpense,
} from "../hooks/useFinance";
import { useOrders } from "../hooks/useOrders";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select } from "./ui/select";
import { Textarea } from "./ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

type Props = {
  open: boolean;
  expense: ExpenseItem | null;
  onClose: () => void;
};

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function ExpenseModal({ open, expense, onClose }: Props) {
  const isEdit = !!expense;
  const { data: categories = [] } = useExpenseCategories();
  const { data: ordersData } = useOrders({ limit: 200 });
  const orders = ordersData?.items ?? [];

  const createMut = useCreateExpense();
  const updateMut = useUpdateExpense();

  const [categoryId, setCategoryId] = useState("");
  const [orderId, setOrderId] = useState("");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(todayIso());
  const [comment, setComment] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const activeCategories = useMemo(
    () => categories.filter((c) => c.isActive).sort((a, b) => a.sortOrder - b.sortOrder),
    [categories],
  );

  const sortedOrders = useMemo(
    () => [...orders].sort((a, b) => +new Date(b.eventDate) - +new Date(a.eventDate)),
    [orders],
  );

  useEffect(() => {
    if (!open) return;
    setCategoryId(expense?.categoryId ?? "");
    setOrderId(expense?.orderId ?? "");
    setAmount(expense ? String(expense.amount) : "");
    setExpenseDate(
      expense ? expense.expenseDate.slice(0, 10) : todayIso(),
    );
    setComment(expense?.comment ?? "");
    setErr(null);
  }, [open, expense]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setErr(null);

    if (!categoryId) return setErr("Выберите категорию");
    const amt = Number(amount.replace(",", "."));
    if (!Number.isFinite(amt) || amt < 0) return setErr("Сумма — неотрицательное число");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(expenseDate)) return setErr("Укажите корректную дату");

    const payload = {
      categoryId,
      orderId: orderId || null,
      amount: amt,
      expenseDate,
      comment: comment.trim() || null,
    };

    if (isEdit) {
      updateMut.mutate(
        { id: expense!.id, input: payload },
        {
          onSuccess: () => onClose(),
          onError: (e: any) =>
            setErr(e?.response?.data?.error ?? "Не удалось сохранить"),
        },
      );
    } else {
      createMut.mutate(payload, {
        onSuccess: () => onClose(),
        onError: (e: any) =>
          setErr(e?.response?.data?.error ?? "Не удалось создать"),
      });
    }
  };

  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Изменить расход" : "Новый расход"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <Label htmlFor="ex-cat">Категория *</Label>
            <Select
              id="ex-cat"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">— Выберите —</option>
              {activeCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="ex-amount">Сумма, ₽ *</Label>
            <Input
              id="ex-amount"
              type="number"
              min={0}
              step={100}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <Label htmlFor="ex-date">Дата *</Label>
            <Input
              id="ex-date"
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="ex-order">Связать с заказом</Label>
            <Select
              id="ex-order"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
            >
              <option value="">— Не связано —</option>
              {sortedOrders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.title} · {o.eventDate.slice(0, 10)}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="ex-comment">Комментарий</Label>
            <Textarea
              id="ex-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="min-h-[60px]"
            />
          </div>

          {err ? (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {err}
            </div>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isPending}
            >
              Отмена
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Сохраняю…" : isEdit ? "Сохранить" : "Создать"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
