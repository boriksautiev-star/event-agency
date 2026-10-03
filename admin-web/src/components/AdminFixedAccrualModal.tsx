import { FormEvent, useEffect, useState } from "react";
import { useCreateFixedAccrual } from "../hooks/useAdminPayroll";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
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
  adminId: string;
  defaultAmount: number | null;
  onClose: () => void;
};

function firstDayOfMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function lastDayOfMonth(): string {
  const d = new Date();
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, "0")}-${String(last.getDate()).padStart(2, "0")}`;
}

export function AdminFixedAccrualModal({
  open,
  adminId,
  defaultAmount,
  onClose,
}: Props) {
  const mut = useCreateFixedAccrual(adminId);

  const [amount, setAmount] = useState("");
  const [periodFrom, setPeriodFrom] = useState(firstDayOfMonth());
  const [periodTo, setPeriodTo] = useState(lastDayOfMonth());
  const [comment, setComment] = useState("");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setAmount(defaultAmount != null ? String(defaultAmount) : "");
    setPeriodFrom(firstDayOfMonth());
    setPeriodTo(lastDayOfMonth());
    setComment("");
    setErr(null);
  }, [open, defaultAmount]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    const a = Number(amount.replace(",", "."));
    if (!Number.isFinite(a) || a <= 0) return setErr("Сумма — положительное число");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(periodFrom)) return setErr("Укажите начало периода");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(periodTo)) return setErr("Укажите конец периода");
    if (periodTo < periodFrom) return setErr("Конец периода раньше начала");

    mut.mutate(
      {
        amount: a,
        periodFrom,
        periodTo,
        comment: comment.trim() || null,
      },
      {
        onSuccess: () => onClose(),
        onError: (e: any) =>
          setErr(e?.response?.data?.error ?? "Не удалось сохранить"),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Начислить фикс за период</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <Label htmlFor="fx-amount">Сумма, ₽ *</Label>
            <Input
              id="fx-amount"
              type="number"
              min={0}
              step={1000}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="fx-from">С *</Label>
              <Input
                id="fx-from"
                type="date"
                value={periodFrom}
                onChange={(e) => setPeriodFrom(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="fx-to">По *</Label>
              <Input
                id="fx-to"
                type="date"
                value={periodTo}
                onChange={(e) => setPeriodTo(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="fx-comment">Комментарий</Label>
            <Textarea
              id="fx-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="min-h-[60px]"
              placeholder="Например: зарплата за октябрь 2026"
            />
          </div>

          {err ? (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {err}
            </div>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={mut.isPending}>
              Отмена
            </Button>
            <Button type="submit" disabled={mut.isPending}>
              {mut.isPending ? "Сохраняю…" : "Начислить"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
