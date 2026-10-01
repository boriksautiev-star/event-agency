import { useState } from "react";
import type { AnimatorAvailability, OrderSlot } from "../api/types";
import { useAvailability } from "../hooks/useAnimators";
import { useAssignAnimator } from "../hooks/useOrders";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

type Props = {
  orderId: string;
  date: string;
  startTime: string;
  endTime: string;
  slot: OrderSlot | null;
  open: boolean;
  onClose: () => void;
};

function overlaps(s1: string, e1: string, s2: string, e2: string) {
  return s1 < e2 && s2 < e1;
}

export function AnimatorPickerModal({ orderId, date, startTime, endTime, slot, open, onClose }: Props) {
  const { data: items = [], isLoading, isError, error } = useAvailability(open ? date : undefined);
  const assign = useAssignAnimator(orderId);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  if (!slot) return null;

  const handlePick = async (a: AnimatorAvailability) => {
    setErrMsg(null);
    setBusyId(a.id);
    try {
      await assign.mutateAsync({ animatorId: a.id, slotId: slot.id });
      onClose();
    } catch (e: any) {
      const code = e?.response?.data?.code;
      const msg = e?.response?.data?.error ?? "Не удалось назначить";
      setErrMsg(code === "RATE_NOT_FOUND" ? "Ставка в матрице не найдена. Заполните выплату вручную." : msg);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Назначить аниматора</DialogTitle>
          <DialogDescription>
            {slot.character?.name ?? slot.characterNameSnapshot} · {slot.rateDurationMinutes} мин · {date} {startTime}–{endTime}
          </DialogDescription>
        </DialogHeader>

        {errMsg ? (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
            {errMsg}
          </div>
        ) : null}

        {isLoading ? (
          <div className="py-10 text-center text-gray-500">Загрузка…</div>
        ) : isError ? (
          <div className="py-10 text-center text-red-600">
            {(error as any)?.response?.data?.error ?? "Не удалось загрузить"}
          </div>
        ) : items.length === 0 ? (
          <div className="py-10 text-center text-gray-500">Нет активных аниматоров</div>
        ) : (
          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            {items.map((a) => {
              const busyOrders = a.orders.filter((o) =>
                overlaps(startTime, endTime, o.startTime, o.endTime),
              );
              const isBusy = busyOrders.length > 0;
              const isPending = busyId === a.id;
              return (
                <div
                  key={a.id}
                  className={[
                    "border rounded-lg p-3 transition",
                    isBusy ? "border-red-200 bg-red-50/40" : "border-gray-200 hover:bg-gray-50",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-gray-900">
                        {a.firstName} {a.lastName}
                      </div>
                      <div className="text-xs text-gray-500">{a.phone}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={isBusy ? "danger" : "success"}>
                        {isBusy ? "Занят" : "Свободен"}
                      </Badge>
                      <Button
                        size="sm"
                        disabled={isPending}
                        onClick={() => handlePick(a)}
                      >
                        {isPending ? "…" : "Назначить"}
                      </Button>
                    </div>
                  </div>
                  {a.orders.length > 0 ? (
                    <div className="mt-2 pt-2 border-t border-gray-100 space-y-1">
                      {a.orders.map((o) => {
                        const conflict = overlaps(startTime, endTime, o.startTime, o.endTime);
                        return (
                          <div
                            key={o.orderId}
                            className={[
                              "flex items-start gap-2 text-xs",
                              conflict ? "text-red-700" : "text-gray-500",
                            ].join(" ")}
                          >
                            <span className="font-mono shrink-0">
                              {o.startTime}–{o.endTime}
                            </span>
                            <span className="truncate">
                              {o.title}
                              {o.slots.length > 0 ? (
                                <span className="text-gray-400">
                                  {" · "}
                                  {o.slots.map((s) => s.characterName).join(", ")}
                                </span>
                              ) : null}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
