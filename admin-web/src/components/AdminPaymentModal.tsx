import { FormEvent, useEffect, useState } from "react";
import { useCreatePayment } from "../hooks/useAdminPayroll";
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
  adminId: string;
  balance: number;
  defaultComment?: string;
  onClose: () => void;
};

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function AdminPaymentModal({
  open,
  adminId,
  balance,
  defaultComment,
  onClose,
}: Props) {
  const mut = useCreatePayment(adminId);

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"cash" | "transfer">("transfer");
  const [paidAt, setPaidAt] = useState(todayIso());
  const [comment, setComment] = useState("");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const suggested = balance > 0 ? String(balance) : "";
    setAmount(suggested);
    setMethod("transfer");
    setPaidAt(todayIso());
    setComment(defaultComment ?? "");
    setErr(null);
  }, [open, balance, defaultComment]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    const a = Number(amount.replace(",", "."));
    if (!Number.isFinite(a) || a <= 0) return setErr("Сумма — положительное число");

    mut.mutate(
      {
        amount: a,
        method,
        paidAt,
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
          <DialogTitle>Выплата админу</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <Label htmlFor="pay-amount">Сумма, ₽ *</Label>
            <Input
              id="pay-amount"
              type="number"
              min={0}
              step={100}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus
            />
            <p className="text-xs text-gray-400 mt-1">
              К выплате по балансу: {balance.toLocaleString("ru-RU")} ₽
            </p>
          </div>

          <div>
            <Label htmlFor="pay-method">Метод *</Label>
            <Select
              id="pay-method"
              value={method}
              onChange={(e) => setMethod(e.target.value as "cash" | "transfer")}
            >
              <option value="transfer">Перевод</option>
              <option value="cash">Наличные</option>
            </Select>
          </div>

          <div>
            <Label htmlFor="pay-date">Дата *</Label>
            <Input
              id="pay-date"
              type="date"
              value={paidAt}
              onChange={(e) => setPaidAt(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="pay-comment">Комментарий</Label>
            <Textarea
              id="pay-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="min-h-[60px]"
              placeholder="Например: аванс за первую половину месяца"
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
              {mut.isPending ? "Сохраняю…" : "Выплатить"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
