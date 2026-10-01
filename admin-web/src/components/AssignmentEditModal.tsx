import { FormEvent, useEffect, useState } from "react";
import { useUpdateAssignment, useRemoveAssignment } from "../hooks/useOrders";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

type Props = {
  orderId: string;
  animatorId: string;
  animatorName: string;
  initialPayout: number;
  payoutSource: "rate_matrix" | "manual";
  open: boolean;
  onClose: () => void;
};

export function AssignmentEditModal({
  orderId,
  animatorId,
  animatorName,
  initialPayout,
  payoutSource,
  open,
  onClose,
}: Props) {
  const updateMut = useUpdateAssignment(orderId);
  const removeMut = useRemoveAssignment(orderId);
  const [payout, setPayout] = useState(String(initialPayout));
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setPayout(String(initialPayout));
      setErr(null);
    }
  }, [open, initialPayout]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    const n = Number(payout.replace(",", "."));
    if (!Number.isFinite(n) || n < 0) return setErr("Выплата должна быть неотрицательным числом");
    updateMut.mutate(
      { animatorId, payout: n },
      {
        onSuccess: () => onClose(),
        onError: (e: any) =>
          setErr(e?.response?.data?.error ?? "Не удалось сохранить"),
      },
    );
  };

  const handleRemove = () => {
    if (!window.confirm(`Снять аниматора ${animatorName} с заказа?`)) return;
    removeMut.mutate(animatorId, {
      onSuccess: () => onClose(),
      onError: (e: any) =>
        setErr(e?.response?.data?.error ?? "Не удалось снять"),
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Выплата аниматору</DialogTitle>
          <DialogDescription>{animatorName}</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <Label htmlFor="assign-payout">Выплата, ₽</Label>
            <Input
              id="assign-payout"
              type="number"
              min={0}
              step={100}
              value={payout}
              onChange={(e) => setPayout(e.target.value)}
              autoFocus
            />
            <p className="text-xs text-gray-500 mt-1">
              {payoutSource === "rate_matrix"
                ? "Выплата подтянута из матрицы ставок. Изменение вручную зафиксирует как «вручную»."
                : "Выплата задана вручную."}
            </p>
          </div>

          {err ? (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {err}
            </div>
          ) : null}

          <DialogFooter className="!justify-between">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleRemove}
              disabled={updateMut.isPending || removeMut.isPending}
            >
              Снять аниматора
            </Button>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={updateMut.isPending || removeMut.isPending}
              >
                Отмена
              </Button>
              <Button type="submit" disabled={updateMut.isPending || removeMut.isPending}>
                {updateMut.isPending ? "Сохраняю…" : "Сохранить"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
