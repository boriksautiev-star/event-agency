import { useEffect, useMemo, useState } from "react";
import { RATE_DURATIONS, formatDuration } from "@event-agency/shared";
import { useRateGroups } from "../../hooks/useRateGroups";
import { useAnimatorsList } from "../../hooks/useAnimatorsList";
import { useSaveMatrix } from "../../hooks/useRates";
import { useQueries } from "@tanstack/react-query";
import { fetchMatrix } from "../../api/rates";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { cn } from "../../lib/utils";

function cellKey(rateGroupId: string, durationMin: number): string {
  return `${rateGroupId}|${durationMin}`;
}

export default function RatesMatrixPage() {
  const { data: groups = [] } = useRateGroups(true);
  const { data: animators = [] } = useAnimatorsList();
  const saveMut = useSaveMatrix();

  // Активные группы, отсортированные
  const activeGroups = useMemo(
    () => groups.filter((g) => g.isActive).sort((a, b) => a.sortOrder - b.sortOrder),
    [groups],
  );

  // Активные аниматоры, отсортированные по фамилии
  const activeAnimators = useMemo(
    () =>
      animators
        .filter((a) => a.status === "active")
        .sort((a, b) => a.lastName.localeCompare(b.lastName)),
    [animators],
  );

  const [currentGroupId, setCurrentGroupId] = useState<string>("");

  // Автовыбор первой группы
  useEffect(() => {
    if (!currentGroupId && activeGroups.length > 0) {
      setCurrentGroupId(activeGroups[0].id);
    }
  }, [activeGroups, currentGroupId]);

  // Загружаем матрицы всех аниматоров параллельно
  const matrixQueries = useQueries({
    queries: activeAnimators.map((a) => ({
      queryKey: ["rate-matrix", a.id],
      queryFn: () => fetchMatrix(a.id),
      staleTime: 30_000,
    })),
  });

  const loading = matrixQueries.some((q) => q.isLoading);

  // initial: что было на сервере (только для текущей группы) — для diff-сохранения
  const initial = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    activeAnimators.forEach((a, idx) => {
      const q = matrixQueries[idx];
      if (!q.data) return;
      const cells: Record<string, number> = {};
      for (const c of q.data.cells) {
        cells[cellKey(c.rateGroupId, c.durationMin)] = c.amount;
      }
      map[a.id] = cells;
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAnimators, matrixQueries.map((q) => q.dataUpdatedAt).join(",")]);

  // draft: строковые значения ячеек для input (все группы)
  const [draft, setDraft] = useState<Record<string, Record<string, string>>>({});

  // Заполняем draft из initial — для всех групп, но отображаем только текущую
  useEffect(() => {
    const d: Record<string, Record<string, string>> = {};
    for (const a of activeAnimators) {
      const cells = initial[a.id] ?? {};
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(cells)) {
        out[k] = String(v);
      }
      d[a.id] = out;
    }
    setDraft(d);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  const setCell = (animatorId: string, key: string, value: string) => {
    setDraft((prev) => ({
      ...prev,
      [animatorId]: { ...(prev[animatorId] ?? {}), [key]: value },
    }));
  };

  // Есть ли изменения в текущей группе?
  const dirtyAnimators = useMemo(() => {
    if (!currentGroupId) return [];
    const result: string[] = [];
    for (const a of activeAnimators) {
      const initCells = initial[a.id] ?? {};
      const draftCells = draft[a.id] ?? {};
      for (const dur of RATE_DURATIONS) {
        const k = cellKey(currentGroupId, dur);
        const before = initCells[k];
        const afterRaw = draftCells[k] ?? "";
        const after = afterRaw === "" ? null : Number(afterRaw);
        if ((before ?? null) !== after) {
          result.push(a.id);
          break;
        }
      }
    }
    return Array.from(new Set(result));
  }, [currentGroupId, activeAnimators, initial, draft]);

  const hasChanges = dirtyAnimators.length > 0;

  const onSave = async () => {
    if (!currentGroupId || !hasChanges) return;

    // Собираем cells для каждого аниматора (только для текущей группы)
    const results: number[] = [];
    for (const animatorId of dirtyAnimators) {
      const draftCells = draft[animatorId] ?? {};
      const cells: { rateGroupId: string; durationMin: number; amount: number | null }[] = [];

      for (const dur of RATE_DURATIONS) {
        const k = cellKey(currentGroupId, dur);
        const raw = draftCells[k] ?? "";
        if (raw === "") {
          // Пусто — если было значение, надо удалить
          const was = initial[animatorId]?.[k];
          if (was !== undefined) {
            cells.push({ rateGroupId: currentGroupId, durationMin: dur, amount: null });
          }
        } else {
          const n = Number(raw.replace(",", "."));
          if (!Number.isFinite(n) || n < 0) {
            alert(`Некорректное значение: ${raw}`);
            return;
          }
          cells.push({ rateGroupId: currentGroupId, durationMin: dur, amount: n });
        }
      }

      if (cells.length === 0) continue;

      try {
        const res = await saveMut.mutateAsync({ animatorId, cells });
        results.push(res.affectedAssignments);
      } catch (e: any) {
        alert(e?.response?.data?.error ?? "Не удалось сохранить матрицу");
        return;
      }
    }

    const total = results.reduce((s, x) => s + x, 0);
    alert(
      `Сохранено.\nОбновлено будущих назначений: ${total}`,
    );
  };

  const onReset = () => {
    if (!hasChanges) return;
    if (!window.confirm("Отменить все изменения в текущей группе?")) return;
    const d: Record<string, Record<string, string>> = { ...draft };
    for (const animatorId of dirtyAnimators) {
      const initCells = initial[animatorId] ?? {};
      const next: Record<string, string> = { ...(d[animatorId] ?? {}) };
      for (const dur of RATE_DURATIONS) {
        const k = cellKey(currentGroupId, dur);
        const before = initCells[k];
        if (before === undefined) {
          delete next[k];
        } else {
          next[k] = String(before);
        }
      }
      d[animatorId] = next;
    }
    setDraft(d);
  };

  if (loading) {
    return <div className="p-10 text-center text-gray-500">Загрузка матрицы…</div>;
  }

  if (activeAnimators.length === 0) {
    return (
      <Card>
        <CardContent className="p-10 text-center text-gray-500">
          Нет активных аниматоров
        </CardContent>
      </Card>
    );
  }

  if (activeGroups.length === 0) {
    return (
      <Card>
        <CardContent className="p-10 text-center text-gray-500">
          Нет активных групп персонажей
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Табы групп */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1 -mb-px flex-wrap">
          {activeGroups.map((g) => {
            const isActive = g.id === currentGroupId;
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => setCurrentGroupId(g.id)}
                className={cn(
                  "px-3 py-2 text-sm font-semibold border-b-2 transition",
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-gray-500 hover:text-gray-800",
                )}
              >
                {g.name}
              </button>
            );
          })}
        </nav>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-2 font-semibold text-gray-600 min-w-[220px] sticky left-0 bg-gray-50 z-10">
                  Аниматор
                </th>
                {RATE_DURATIONS.map((dur) => (
                  <th
                    key={dur}
                    className="px-2 py-2 font-semibold text-gray-600 text-center w-[110px] whitespace-nowrap"
                  >
                    {formatDuration(dur)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {activeAnimators.map((a) => {
                const cells = draft[a.id] ?? {};
                const isDirty = dirtyAnimators.includes(a.id);
                return (
                  <tr key={a.id} className={isDirty ? "bg-amber-50/40" : ""}>
                    <td className="px-4 py-2 sticky left-0 bg-white z-10">
                      <div className="font-medium text-gray-900 whitespace-nowrap">
                        {a.lastName} {a.firstName}
                      </div>
                    </td>
                    {RATE_DURATIONS.map((dur) => {
                      const k = cellKey(currentGroupId, dur);
                      const v = cells[k] ?? "";
                      return (
                        <td key={dur} className="px-2 py-1.5">
                          <Input
                            type="number"
                            min={0}
                            step={100}
                            value={v}
                            onChange={(e) => setCell(a.id, k, e.target.value)}
                            placeholder="—"
                            className="!h-9 !px-2 text-right"
                          />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-xs text-gray-500 max-w-2xl">
          При сохранении будущие назначения с источником выплаты «матрица» будут пересчитаны автоматически. Уже выплаченные и ручные — не трогаются.
        </div>
        <div className="flex items-center gap-2">
          {hasChanges ? (
            <span className="text-xs text-amber-600 font-medium">
              {dirtyAnimators.length} аниматор(ов) с изменениями
            </span>
          ) : null}
          <Button
            variant="outline"
            onClick={onReset}
            disabled={!hasChanges || saveMut.isPending}
          >
            Отменить
          </Button>
          <Button onClick={onSave} disabled={!hasChanges || saveMut.isPending}>
            {saveMut.isPending ? "Сохраняю…" : "Сохранить матрицу"}
          </Button>
        </div>
      </div>
    </div>
  );
}
