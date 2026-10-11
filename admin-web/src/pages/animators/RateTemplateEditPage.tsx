import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { RATE_DURATIONS, formatDuration } from "@event-agency/shared";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { useRateGroups } from "../../hooks/useRateGroups";
import {
  useRateTemplate,
  useSaveTemplateRates,
} from "../../hooks/useRateTemplates";
import type { SaveTemplateCell } from "../../api/rate-templates";

function cellKey(rateGroupId: string, durationMin: number): string {
  return `${rateGroupId}|${durationMin}`;
}

export default function RateTemplateEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: groups = [] } = useRateGroups(true);
  const { data: tpl, isLoading, isError, error } = useRateTemplate(id);
  const saveMut = useSaveTemplateRates();

  const activeGroups = useMemo(
    () => groups.filter((g) => g.isActive).sort((a, b) => a.sortOrder - b.sortOrder),
    [groups],
  );

  // initial: server state
  const initial = useMemo(() => {
    const map: Record<string, number> = {};
    if (!tpl) return map;
    for (const c of tpl.cells) {
      map[cellKey(c.rateGroupId, c.durationMin)] = c.amount;
    }
    return map;
  }, [tpl]);

  // draft: строковые значения
  const [draft, setDraft] = useState<Record<string, string>>({});

  useEffect(() => {
    const d: Record<string, string> = {};
    for (const [k, v] of Object.entries(initial)) {
      d[k] = String(v);
    }
    setDraft(d);
  }, [initial]);

  const setCell = (k: string, v: string) => {
    setDraft((prev) => ({ ...prev, [k]: v }));
  };

  const hasChanges = useMemo(() => {
    for (const g of activeGroups) {
      for (const dur of RATE_DURATIONS) {
        const k = cellKey(g.id, dur);
        const before = initial[k];
        const afterRaw = draft[k] ?? "";
        const after = afterRaw === "" ? undefined : Number(afterRaw.replace(",", "."));
        if ((before ?? undefined) !== (after ?? undefined)) return true;
      }
    }
    return false;
  }, [activeGroups, initial, draft]);

  const onSave = async () => {
    if (!id || !hasChanges) return;

    const cells: SaveTemplateCell[] = [];
    for (const g of activeGroups) {
      for (const dur of RATE_DURATIONS) {
        const k = cellKey(g.id, dur);
        const before = initial[k];
        const raw = draft[k] ?? "";

        if (raw === "") {
          if (before !== undefined) {
            cells.push({ rateGroupId: g.id, durationMin: dur, amount: null });
          }
        } else {
          const n = Number(raw.replace(",", "."));
          if (!Number.isFinite(n) || n < 0) {
            alert(`Некорректное значение: ${raw}`);
            return;
          }
          cells.push({ rateGroupId: g.id, durationMin: dur, amount: n });
        }
      }
    }

    if (cells.length === 0) return;

    try {
      const res = await saveMut.mutateAsync({ id, cells });
      alert(`Сохранено.\nОбновлено будущих назначений: ${res.affectedAssignments}`);
    } catch (e: any) {
      alert(e?.response?.data?.error ?? "Не удалось сохранить");
    }
  };

  const onReset = () => {
    if (!hasChanges) return;
    if (!window.confirm("Отменить все изменения?")) return;
    const d: Record<string, string> = {};
    for (const [k, v] of Object.entries(initial)) {
      d[k] = String(v);
    }
    setDraft(d);
  };

  if (isLoading) {
    return <Card><div className="p-10 text-center text-gray-500">Загрузка…</div></Card>;
  }
  if (isError || !tpl) {
    return (
      <Card>
        <div className="p-10 text-center text-red-600">
          Ошибка: {(error as any)?.response?.data?.error ?? "Шаблон не найден"}
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="outline" size="sm" onClick={() => navigate("/animators/templates")}>
          <ArrowLeft size={14} />
        </Button>
        <div>
          <h2 className="text-lg font-bold text-gray-900">{tpl.name}</h2>
          {tpl.notes ? <div className="text-xs text-gray-500">{tpl.notes}</div> : null}
        </div>
        <Badge variant={tpl.isActive ? "success" : "default"}>
          {tpl.isActive ? "Активен" : "Архив"}
        </Badge>
        <div className="ml-auto flex items-center gap-2">
          <Link
            to={`/animators/templates/${tpl.id}`}
            className="text-xs text-primary hover:underline"
            onClick={(e) => e.preventDefault()}
          >
            Аниматоров: {tpl.animators.length}
          </Link>
        </div>
      </div>

      {activeGroups.length === 0 ? (
        <Card>
          <div className="p-10 text-center text-gray-500">
            Нет активных групп персонажей
          </div>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-2 font-semibold text-gray-600 min-w-[220px] sticky left-0 bg-gray-50 z-10">
                    Группа
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
                {activeGroups.map((g) => (
                  <tr key={g.id}>
                    <td className="px-4 py-2 sticky left-0 bg-white z-10">
                      <div className="font-medium text-gray-900 whitespace-nowrap">
                        {g.name}
                      </div>
                    </td>
                    {RATE_DURATIONS.map((dur) => {
                      const k = cellKey(g.id, dur);
                      const v = draft[k] ?? "";
                      return (
                        <td key={dur} className="px-2 py-1.5">
                          <Input
                            type="number"
                            min={0}
                            step={100}
                            value={v}
                            onChange={(e) => setCell(k, e.target.value)}
                            placeholder="—"
                            className="!h-9 !px-2 text-right"
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-xs text-gray-500 max-w-2xl">
          При сохранении будущие назначения всех аниматоров на этом шаблоне будут пересчитаны. Уже выплаченные и ручные — не трогаются.
        </div>
        <div className="flex items-center gap-2">
          {hasChanges ? (
            <span className="text-xs text-amber-600 font-medium">Есть изменения</span>
          ) : null}
          <Button variant="outline" onClick={onReset} disabled={!hasChanges || saveMut.isPending}>
            Отменить
          </Button>
          <Button onClick={onSave} disabled={!hasChanges || saveMut.isPending}>
            {saveMut.isPending ? "Сохраняю…" : "Сохранить"}
          </Button>
        </div>
      </div>
    </div>
  );
}
