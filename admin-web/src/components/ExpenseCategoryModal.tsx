import { FormEvent, useEffect, useState } from "react";
import type { ExpenseCategory } from "../api/finance";
import {
  useCreateCategory,
  useUpdateCategory,
} from "../hooks/useFinance";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

type Props = {
  open: boolean;
  category: ExpenseCategory | null;
  onClose: () => void;
};

export function ExpenseCategoryModal({ open, category, onClose }: Props) {
  const isEdit = !!category;
  const createMut = useCreateCategory();
  const updateMut = useUpdateCategory();

  const [name, setName] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [isActive, setIsActive] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(category?.name ?? "");
    setSortOrder(String(category?.sortOrder ?? 0));
    setIsActive(category?.isActive ?? true);
    setErr(null);
  }, [open, category]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (name.trim().length < 1) return setErr("Укажите название");
    const so = Number(sortOrder);
    if (!Number.isFinite(so)) return setErr("Порядок — целое число");

    const input = {
      name: name.trim(),
      sortOrder: Math.trunc(so),
      isActive,
    };

    if (isEdit) {
      updateMut.mutate(
        { id: category!.id, input },
        {
          onSuccess: () => onClose(),
          onError: (e: any) =>
            setErr(e?.response?.data?.error ?? "Не удалось сохранить"),
        },
      );
    } else {
      createMut.mutate(input, {
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
            {isEdit ? "Изменить категорию" : "Новая категория"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <Label htmlFor="cat-name">Название *</Label>
            <Input
              id="cat-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="cat-sort">Порядок сортировки</Label>
            <Input
              id="cat-sort"
              type="number"
              step={1}
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 accent-primary"
            />
            <span className="text-sm text-gray-700">Активна</span>
          </label>

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
