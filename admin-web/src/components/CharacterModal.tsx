import { FormEvent, useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import type { Character } from "../api/types";
import { useRateGroups } from "../hooks/useRateGroups";
import {
  useCreateCharacter,
  useUpdateCharacter,
  useReplaceCharacterPrices,
} from "../hooks/useCharacters";
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
  character: Character | null;
  onClose: () => void;
};

type PriceRow = {
  key: string;
  durationMin: string;
  price: string;
};

function genKey(): string {
  return Math.random().toString(36).slice(2, 10);
}

const QUICK_DURATIONS = [30, 40, 45, 60, 90, 120, 180];

export function CharacterModal({ open, character, onClose }: Props) {
  const isEdit = !!character;
  const { data: groups = [] } = useRateGroups(true);

  const createMut = useCreateCharacter();
  const updateMut = useUpdateCharacter();
  const pricesMut = useReplaceCharacterPrices();

  const [name, setName] = useState("");
  const [rateGroupId, setRateGroupId] = useState("");
  const [notes, setNotes] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [priceRows, setPriceRows] = useState<PriceRow[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(character?.name ?? "");
    setRateGroupId(character?.rateGroupId ?? "");
    setNotes(character?.notes ?? "");
    setIsActive(character?.isActive ?? true);

    const rows: PriceRow[] = (character?.priceOptions ?? [])
      .filter((p) => p.isActive)
      .sort((a, b) => a.durationMin - b.durationMin)
      .map((p) => ({
        key: genKey(),
        durationMin: String(p.durationMin),
        price: String(Number(p.price)),
      }));
    setPriceRows(rows);
    setErr(null);
  }, [open, character]);

  const activeGroups = useMemo(
    () => groups.filter((g) => g.isActive).sort((a, b) => a.sortOrder - b.sortOrder),
    [groups],
  );

  const addRow = (dur?: number) => {
    setPriceRows((prev) => [
      ...prev,
      {
        key: genKey(),
        durationMin: dur !== undefined ? String(dur) : "",
        price: "",
      },
    ]);
  };

  const removeRow = (key: string) => {
    setPriceRows((prev) => prev.filter((r) => r.key !== key));
  };

  const updateRow = (
    key: string,
    field: "durationMin" | "price",
    value: string,
  ) => {
    setPriceRows((prev) =>
      prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)),
    );
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setErr(null);

    if (!name.trim()) return setErr("Укажите название");
    if (!rateGroupId) return setErr("Выберите группу");

    // Собираем прайсы
    const priceList: { durationMin: number; price: number }[] = [];
    const seen = new Set<number>();

    for (const r of priceRows) {
      const dStr = r.durationMin.trim();
      const pStr = r.price.trim();
      // Пустая строка — пропускаем
      if (dStr === "" && pStr === "") continue;
      // Заполнена частично
      if (dStr === "" || pStr === "") {
        return setErr("Заполните и минуты, и цену — или удалите строку");
      }
      const d = Number(dStr);
      if (!Number.isInteger(d) || d < 1 || d > 1440) {
        return setErr("Длительность должна быть целым числом 1–1440 мин");
      }
      if (seen.has(d)) {
        return setErr(`Длительность ${d} мин указана дважды`);
      }
      const p = Number(pStr.replace(",", "."));
      if (!Number.isFinite(p) || p < 0) {
        return setErr(`Цена для ${d} мин — неотрицательное число`);
      }
      seen.add(d);
      priceList.push({ durationMin: d, price: p });
    }

    // Сортируем по длительности
    priceList.sort((a, b) => a.durationMin - b.durationMin);

    if (isEdit) {
      updateMut.mutate(
        {
          id: character!.id,
          input: {
            name: name.trim(),
            rateGroupId,
            notes: notes.trim() || null,
            isActive,
          },
        },
        {
          onSuccess: () => {
            pricesMut.mutate(
              { id: character!.id, prices: priceList },
              {
                onSuccess: () => onClose(),
                onError: (e: any) =>
                  setErr(e?.response?.data?.error ?? "Не удалось сохранить цены"),
              },
            );
          },
          onError: (e: any) =>
            setErr(e?.response?.data?.error ?? "Не удалось сохранить"),
        },
      );
    } else {
      createMut.mutate(
        {
          name: name.trim(),
          rateGroupId,
          notes: notes.trim() || null,
          isActive,
          prices: priceList,
        },
        {
          onSuccess: () => onClose(),
          onError: (e: any) =>
            setErr(e?.response?.data?.error ?? "Не удалось создать"),
        },
      );
    }
  };

  const isPending =
    createMut.isPending || updateMut.isPending || pricesMut.isPending;

  // Список уже занятых длительностей — для отключения быстрых кнопок
  const usedDurations = new Set(
    priceRows
      .map((r) => Number(r.durationMin))
      .filter((n) => Number.isInteger(n) && n > 0),
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Изменить персонажа" : "Новый персонаж"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <Label htmlFor="ch-name">Название *</Label>
            <Input
              id="ch-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              placeholder="Пират Джек"
            />
          </div>

          <div>
            <Label htmlFor="ch-group">Группа *</Label>
            <Select
              id="ch-group"
              value={rateGroupId}
              onChange={(e) => setRateGroupId(e.target.value)}
            >
              <option value="">— Выберите —</option>
              {activeGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="ch-notes">Заметки</Label>
            <Textarea
              id="ch-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[50px]"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 accent-primary"
            />
            <span className="text-sm text-gray-700">Активен</span>
          </label>

          {/* ============ Цены для клиента ============ */}
          <div className="border-t border-gray-100 pt-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-gray-500 uppercase tracking-wide">
                Цены для клиента
              </div>
              <div className="text-xs text-gray-400">
                {priceRows.length} строк
              </div>
            </div>

            {priceRows.length === 0 ? (
              <div className="text-sm text-gray-400 py-2">
                Нет цен — добавьте строки ниже
              </div>
            ) : (
              <div className="space-y-2">
                {priceRows.map((r) => (
                  <div key={r.key} className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      max={1440}
                      step={1}
                      value={r.durationMin}
                      onChange={(e) => updateRow(r.key, "durationMin", e.target.value)}
                      placeholder="мин"
                      className="!w-[90px] shrink-0"
                    />
                    <span className="text-xs text-gray-400 w-[28px] shrink-0">мин</span>
                    <Input
                      type="number"
                      min={0}
                      step={100}
                      value={r.price}
                      onChange={(e) => updateRow(r.key, "price", e.target.value)}
                      placeholder="цена"
                    />
                    <span className="text-xs text-gray-400 w-[16px] shrink-0">₽</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="!px-2 text-red-600 hover:text-red-700 shrink-0"
                      onClick={() => removeRow(r.key)}
                      title="Удалить строку"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addRow()}
              >
                + Добавить строку
              </Button>
              <span className="text-xs text-gray-500 ml-1">Быстро:</span>
              {QUICK_DURATIONS.map((d) => {
                const disabled = usedDurations.has(d);
                return (
                  <button
                    key={d}
                    type="button"
                    disabled={disabled}
                    onClick={() => addRow(d)}
                    className={
                      disabled
                        ? "text-xs text-gray-300 cursor-not-allowed"
                        : "text-xs text-primary hover:underline font-semibold"
                    }
                  >
                    {d}
                  </button>
                );
              })}
            </div>
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
