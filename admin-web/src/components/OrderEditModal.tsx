import { FormEvent, useEffect, useState } from "react";
import type { Order, TransportPolicy } from "../api/types";
import { useUpdateOrder } from "../hooks/useOrders";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select } from "./ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { TRANSPORT_POLICY_LABELS } from "../lib/labels";

type Props = {
  order: Order;
  open: boolean;
  onClose: () => void;
};

function isoToDateInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function OrderEditModal({ order, open, onClose }: Props) {
  const mutation = useUpdateOrder(order.id);

  const [title, setTitle] = useState(order.title);
  const [description, setDescription] = useState(order.description ?? "");
  const [eventDate, setEventDate] = useState(isoToDateInput(order.eventDate));
  const [startTime, setStartTime] = useState(order.startTime);
  const [endTime, setEndTime] = useState(order.endTime);
  const [address, setAddress] = useState(order.address ?? "");
  const [comment, setComment] = useState(order.comment ?? "");
  const [discountPercent, setDiscountPercent] = useState(String(Number(order.discountPercent) || 0));
  const [transportPolicy, setTransportPolicy] = useState<TransportPolicy>(order.transportPolicy);
  const [error, setError] = useState<string | null>(null);

  // Сброс при открытии — на случай повторного открытия с новыми данными
  useEffect(() => {
    if (open) {
      setTitle(order.title);
      setDescription(order.description ?? "");
      setEventDate(isoToDateInput(order.eventDate));
      setStartTime(order.startTime);
      setEndTime(order.endTime);
      setAddress(order.address ?? "");
      setComment(order.comment ?? "");
      setDiscountPercent(String(Number(order.discountPercent) || 0));
      setTransportPolicy(order.transportPolicy);
      setError(null);
    }
  }, [open, order]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) return setError("Название не может быть пустым");
    if (!eventDate) return setError("Укажите дату события");
    if (!/^\d{2}:\d{2}$/.test(startTime)) return setError("Время начала — формат HH:MM");
    if (!/^\d{2}:\d{2}$/.test(endTime)) return setError("Время конца — формат HH:MM");
    const dp = Number(discountPercent);
    if (!Number.isFinite(dp) || dp < 0 || dp > 100) return setError("Скидка должна быть 0–100%");

    mutation.mutate(
      {
        title: title.trim(),
        description: description.trim() || null,
        eventDate,
        startTime,
        endTime,
        address: address.trim() || null,
        comment: comment.trim() || null,
        discountPercent: dp,
        transportPolicy,
      },
      {
        onSuccess: () => onClose(),
        onError: (e: any) =>
          setError(e?.response?.data?.error ?? "Не удалось сохранить"),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Редактировать заказ</DialogTitle>
          <DialogDescription>
            Изменения сохранятся в истории заказа.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <Label htmlFor="edit-title">Название *</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <Label htmlFor="edit-desc">Описание</Label>
            <Textarea
              id="edit-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Детали, пожелания, особенности"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label htmlFor="edit-date">Дата *</Label>
              <Input
                id="edit-date"
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="edit-start">Начало *</Label>
              <Input
                id="edit-start"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="edit-end">Конец *</Label>
              <Input
                id="edit-end"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="edit-address">Адрес</Label>
            <Input
              id="edit-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="edit-discount">Скидка, %</Label>
              <Input
                id="edit-discount"
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={discountPercent}
                onChange={(e) => setDiscountPercent(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="edit-transport">Политика транспорта</Label>
              <Select
                id="edit-transport"
                value={transportPolicy}
                onChange={(e) => setTransportPolicy(e.target.value as TransportPolicy)}
              >
                {(Object.keys(TRANSPORT_POLICY_LABELS) as TransportPolicy[]).map((k) => (
                  <option key={k} value={k}>
                    {TRANSPORT_POLICY_LABELS[k]}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="edit-comment">Комментарий</Label>
            <Textarea
              id="edit-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Внутренняя заметка"
              className="min-h-[60px]"
            />
          </div>

          {error ? (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={mutation.isPending}
            >
              Отмена
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Сохраняю…" : "Сохранить"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
