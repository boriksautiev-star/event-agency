import { FormEvent, useEffect, useMemo, useState } from "react";
import type { OrderSlot } from "../api/types";
import { useCharacters, useCharacter } from "../hooks/useCharacters";
import { useAddSlot, useUpdateSlot } from "../hooks/useOrders";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select } from "./ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

type Mode = { kind: "add" } | { kind: "edit"; slot: OrderSlot };

type Props = {
  orderId: string;
  mode: Mode;
  maxSortOrder: number;
  open: boolean;
  onClose: () => void;
};

export function SlotEditModal({ orderId, mode, maxSortOrder, open, onClose }: Props) {
  const isEdit = mode.kind === "edit";
  const { data: characters = [] } = useCharacters({ activeOnly: true });

  const [characterId, setCharacterId] = useState("");
  const [durationMin, setDurationMin] = useState<number | null>(null);
  const [price, setPrice] = useState("");
  const [err, setErr] = useState<string | null>(null);

  // Загружаем выбранного персонажа — из него берём priceOptions
  const { data: characterDetail } = useCharacter(characterId || undefined);

  const addMut = useAddSlot(orderId);
  const updateMut = useUpdateSlot(orderId);

  // Сброс при открытии
  useEffect(() => {
    if (!open) return;
    if (isEdit) {
      const s = mode.slot;
      setCharacterId(s.characterId);
      setDurationMin(s.rateDurationMinutes);
      setPrice(String(Number(s.clientPrice) || 0));
    } else {
      setCharacterId("");
      setDurationMin(null);
      setPrice("");
    }
    setErr(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const priceOptions = useMemo(() => {
    const opts = (characterDetail?.priceOptions ?? []).filter((p) => p.isActive);
    opts.sort((a, b) => a.durationMin - b.durationMin);
    return opts;
  }, [characterDetail]);

  // При выборе длительности — авто-заполнить цену
  useEffect(() => {
    if (durationMin == null) return;
    const opt = priceOptions.find((p) => p.durationMin === durationMin);
    if (opt) setPrice(String(Number(opt.price)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [durationMin, priceOptions.length]);

  const basePrice = useMemo(() => {
    if (durationMin == null) return null;
    const opt = priceOptions.find((p) => p.durationMin === durationMin);
    return opt ? Number(opt.price) : null;
  }, [durationMin, priceOptions]);

  const priceNum = Number(price.replace(",", "."));
  const isCustom = basePrice != null && Number.isFinite(priceNum) && priceNum !== basePrice;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setErr(null);

    if (!characterId) return setErr("Выберите персонажа");
    if (durationMin == null) return setErr("Выберите длительность");
    if (!Number.isFinite(priceNum) || priceNum < 0) return setErr("Цена должна быть неотрицательным числом");

    const payload = {
      characterId,
      rateDurationMinutes: durationMin,
      clientPrice: priceNum,
      isCustomPrice: isCustom,
      sortOrder: isEdit ? mode.slot.sortOrder : maxSortOrder + 1,
    };

    if (isEdit) {
      updateMut.mutate(
        { slotId: mode.slot.id, data: payload },
        {
          onSuccess: () => onClose(),
          onError: (e: any) =>
            setErr(e?.response?.data?.error ?? "Не удалось сохранить"),
        },
      );
    } else {
      addMut.mutate(payload, {
        onSuccess: () => onClose(),
        onError: (e: any) =>
          setErr(e?.response?.data?.error ?? "Не удалось добавить"),
      });
    }
  };

  const isPending = addMut.isPending || updateMut.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Изменить слот" : "Добавить слот"}
          </DialogTitle>
          <DialogDescription>
            Персонаж и длительность определяют цену для клиента.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <Label htmlFor="slot-char">Персонаж *</Label>
            <Select
              id="slot-char"
              value={characterId}
              onChange={(e) => {
                setCharacterId(e.target.value);
                setDurationMin(null);
                setPrice("");
              }}
            >
              <option value="">— Выберите —</option>
              {characters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.rateGroup ? ` (${c.rateGroup.name})` : ""}
                </option>
              ))}
            </Select>
          </div>

          {characterId ? (
            <div>
              <Label htmlFor="slot-dur">Длительность *</Label>
              <Select
                id="slot-dur"
                value={durationMin == null ? "" : String(durationMin)}
                onChange={(e) => setDurationMin(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">— Выберите —</option>
                {priceOptions.map((p) => (
                  <option key={p.id} value={String(p.durationMin)}>
                    {p.durationMin} мин · {Number(p.price).toLocaleString("ru-RU")} ₽
                  </option>
                ))}
              </Select>
              {priceOptions.length === 0 ? (
                <p className="text-xs text-amber-600 mt-1">
                  У персонажа нет цен в справочнике — введите цену вручную.
                </p>
              ) : null}
            </div>
          ) : null}

          {durationMin != null ? (
            <div>
              <Label htmlFor="slot-price">Цена для клиента, ₽ *</Label>
              <Input
                id="slot-price"
                type="number"
                min={0}
                step={100}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
              {basePrice != null ? (
                <p className="text-xs text-gray-500 mt-1">
                  {isCustom
                    ? `Цена изменена вручную (базовая: ${basePrice.toLocaleString("ru-RU")} ₽).`
                    : `Цена из справочника.`}
                </p>
              ) : null}
            </div>
          ) : null}

          {err ? (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {err}
            </div>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Отмена
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Сохраняю…" : isEdit ? "Сохранить" : "Добавить"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
