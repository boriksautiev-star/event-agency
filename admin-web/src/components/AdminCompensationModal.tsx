import { FormEvent, useEffect, useState } from "react";
import type { Compensation, CompensationType } from "../api/adminPayroll";
import { useSetCompensation } from "../hooks/useAdminPayroll";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select } from "./ui/select";
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
  current: Compensation | null;
  onClose: () => void;
};

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function AdminCompensationModal({ open, adminId, current, onClose }: Props) {
  const mut = useSetCompensation(adminId);

  const [type, setType] = useState<CompensationType>("percent");
  const [percentValue, setPercentValue] = useState("10");
  const [fixedAmount, setFixedAmount] = useState("50000");
  const [effectiveFrom, setEffectiveFrom] = useState(todayIso());
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setType(current?.type ?? "percent");
    setPercentValue(String(current?.percentValue ?? 10));
    setFixedAmount(String(current?.fixedAmount ?? 50000));
    setEffectiveFrom(todayIso());
    setErr(null);
  }, [open, current]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setErr(null);

    let payload: any = { type, effectiveFrom };
    if (type === "percent") {
      const p = Number(percentValue);
      if (!Number.isInteger(p) || p < 0 || p > 100) {
        return setErr("Процент — целое число от 0 до 100");
      }
      payload.percentValue = p;
      payload.fixedAmount = null;
    } else {
      const a = Number(fixedAmount.replace(",", "."));
      if (!Number.isFinite(a) || a <= 0) {
        return setErr("Сумма — положительное число");
      }
      payload.fixedAmount = a;
      payload.percentValue = null;
    }

    mut.mutate(payload, {
      onSuccess: () => onClose(),
      onError: (e: any) =>
        setErr(e?.response?.data?.error ?? "Не удалось сохранить"),
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Изменить ставку</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <Label htmlFor="cmp-type">Тип оплаты *</Label>
            <Select
              id="cmp-type"
              value={type}
              onChange={(e) => setType(e.target.value as CompensationType)}
            >
              <option value="percent">Процент от заказов</option>
              <option value="fixed">Фиксированная сумма в месяц</option>
            </Select>
          </div>

          {type === "percent" ? (
            <div>
              <Label htmlFor="cmp-percent">Процент, % *</Label>
              <Input
                id="cmp-percent"
                type="number"
                min={0}
                max={100}
                step={1}
                value={percentValue}
                onChange={(e) => setPercentValue(e.target.value)}
              />
              <p className="text-xs text-gray-400 mt-1">
                Считается от суммы, которую заплатил клиент (clientPrice).
              </p>
            </div>
          ) : (
            <div>
              <Label htmlFor="cmp-fixed">Сумма в месяц, ₽ *</Label>
              <Input
                id="cmp-fixed"
                type="number"
                min={0}
                step={1000}
                value={fixedAmount}
                onChange={(e) => setFixedAmount(e.target.value)}
              />
              <p className="text-xs text-gray-400 mt-1">
                Фикс начисляется вручную кнопкой «Начислить за период».
              </p>
            </div>
          )}

          <div>
            <Label htmlFor="cmp-from">Действует с *</Label>
            <Input
              id="cmp-from"
              type="date"
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
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
              {mut.isPending ? "Сохраняю…" : "Сохранить"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
